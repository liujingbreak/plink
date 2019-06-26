"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-console
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const processUtils = __importStar(require("./process-utils"));
const os_1 = require("os");
const isWin32 = os_1.platform().indexOf('win32') >= 0;
const logName = '[Installer] ';
/**
 * This class helps to install dependencies for command "init",
 * it is in charge of manipulating <drcp-workspace>/dr.package.json
 * and run "yarn install", to protect the original package.json file
*/
class Guarder {
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.changes = null;
        this.installChecksum = null;
        this.isPackageJsonDirty = false;
        this.isNodeModulesChanged = null;
        this.offline = false;
        this.isDrcpSymlink = fs.lstatSync(Path.resolve('node_modules', 'dr-comp-package')).isSymbolicLink();
    }
    /**
     * Backup package.json
     * @param {*} backupFileContent
     */
    beforeChange(backupFileContent) {
        console.log(logName + 'Backup package.json to dr.backup.package.json');
        const backupFile = Path.join(this.rootPath, 'dr.backup.package.json');
        if (backupFileContent) {
            fs.writeFileSync(backupFile, backupFileContent);
        }
        else {
            const buf = fs.readFileSync(Path.join(this.rootPath, 'package.json'));
            fs.writeFileSync(backupFile, buf);
        }
    }
    /**
     * Get last changed package.json json from dr.package.json or memory
     * @returns {JSON} a cloned package.json
     */
    getChanges() {
        if (this.changes) {
            return clonePkJson(this.changes);
        }
        const lastChanged = Path.join(this.rootPath, 'dist', 'dr.package.json');
        if (fs.existsSync(lastChanged)) {
            const changedJson = JSON.parse(fs.readFileSync(lastChanged, 'utf8'));
            this.changes = changedJson;
            return clonePkJson(changedJson);
        }
        return { dependencies: {}, devDependencies: {} };
    }
    getJsonFile() {
        if (this.isPackageJsonDirty || !fs.existsSync(this.rootPath + '/dist/dr.package.json'))
            return this.rootPath + '/package.json';
        return Path.resolve(this.rootPath + '/dist/dr.package.json');
    }
    /**
     * Mark changes without writing dr.package.json
     * return a complete list of this time marked dependencies together with last time marked
     * @param {object} pk package.json
     * @return changed list [string, string][]
     */
    markChanges(pk) {
        const changeList = [];
        if (this.isDrcpSymlink) {
            if (pk.dependencies) {
                delete pk.dependencies['dr-comp-package'];
                delete pk.dependencies['@dr/internal-recipe'];
            }
            if (pk.devDependencies) {
                delete pk.devDependencies['dr-comp-package'];
                delete pk.devDependencies['@dr/internal-recipe'];
            }
        }
        // clean duplicates in devDependencies
        if (pk.devDependencies) {
            for (const dep in pk.devDependencies) {
                if (has(pk.devDependencies, dep) && has(pk.dependencies, dep))
                    delete pk.devDependencies[dep];
            }
        }
        const lastDeps = this.getChanges().dependencies;
        const lastDevDeps = this.getChanges().devDependencies;
        forChanges(lastDeps, pk.dependencies);
        forChanges(lastDevDeps, pk.devDependencies);
        function forChanges(lastDep, newDep) {
            if (newDep != null) {
                for (const dep in newDep) {
                    if (!has(newDep, dep))
                        continue;
                    const ver = newDep[dep];
                    if (lastDep[dep] !== ver) {
                        changeList.push([dep, ver]); // new or changed dependency
                    }
                    delete lastDep[dep];
                }
            }
            const restLastDep = Object.keys(lastDep).map(row => {
                return [row, lastDep[row]];
            });
            // Complete dependencies = new/changed + rest
            changeList.push(...restLastDep);
        }
        // pk.dependencies = originalDeps;
        this.changes = pk;
        return changeList;
    }
    isModulesChanged() {
        if (this.isNodeModulesChanged != null)
            return this.isNodeModulesChanged;
        try {
            const moduleDir = Path.resolve(this.rootPath, 'node_modules');
            if (this.installChecksum == null) {
                const lastCountFile = Path.join(this.rootPath, 'dist', 'dr.integrity.txt');
                if (!fs.existsSync(moduleDir) || !fs.existsSync(lastCountFile)) {
                    this.isNodeModulesChanged = true;
                    return true;
                }
                const checksumData = fs.readFileSync(lastCountFile, 'utf8').split(os_1.EOL);
                this.installChecksum = parseInt(checksumData[0], 10);
                this.lastInstalled = checksumData.slice(1);
            }
        }
        catch (err) {
            console.log(logName, err);
            this.isNodeModulesChanged = true;
            return true;
        }
        const installed = this._countPackages();
        const currChecksum = installed.join(os_1.EOL).length;
        if (currChecksum !== this.installChecksum) {
            console.log(logName + `Installation integrity checksum has changed from ${this.installChecksum} to ${currChecksum}`);
            const installedSet = new Set();
            for (const name of installed) {
                installedSet.add(name);
            }
            if (this.lastInstalled) {
                for (const name of this.lastInstalled) {
                    if (!installedSet.has(name))
                        console.log(logName + 'Missing ' + name);
                }
            }
            this.isNodeModulesChanged = true;
            return true;
        }
        this.isNodeModulesChanged = false;
        return false;
    }
    installAsync(doNotMarkInstallNum = false, useYarn = false, onlyProd = false, isOffline = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this.offline = isOffline;
            fs.writeFileSync(Path.resolve(this.rootPath, 'package.json'), JSON.stringify(this.getChanges(), null, '  '));
            this.isPackageJsonDirty = true;
            const drcpLocation = Path.resolve('node_modules', 'dr-comp-package');
            const realDrcpPath = fs.realpathSync(drcpLocation);
            // var yarnArgv = ['install', '--non-interactive', '--check-files'];
            const npmArgv = ['install'];
            const self = this;
            if (this.isDrcpSymlink && fs.existsSync(drcpLocation)) {
                fs.unlinkSync(drcpLocation);
            }
            function recreateSymlink() {
                if (!fs.existsSync(Path.resolve('node_modules', 'dr-comp-package'))) {
                    fs.symlinkSync(Path.relative('node_modules', realDrcpPath), drcpLocation, isWin32 ? 'junction' : 'dir');
                    console.log(logName + 'Write symlink dr-comp-package');
                }
                if (!doNotMarkInstallNum)
                    self.markInstallNum();
            }
            let res;
            try {
                res = yield processUtils.exe(useYarn ? 'yarn' : 'npm', ...npmArgv, { cwd: this.rootPath,
                    env: Object.assign({}, process.env, { NODE_ENV: onlyProd ? 'production' : 'development' }) }).promise;
            }
            catch (err) {
                console.log('Sorry, yarn/npm install failed');
                console.log(err);
                throw err;
            }
            if (this.isDrcpSymlink) {
                yield new Promise(resolve => setTimeout(() => resolve(res), 500));
                try {
                    recreateSymlink();
                }
                catch (err) {
                    recreateSymlink();
                    throw err;
                }
            }
            else
                return res;
        });
    }
    markInstallNum() {
        this.isNodeModulesChanged = null;
        const installed = this.lastInstalled = this._countPackages();
        var data = installed.join(os_1.EOL);
        this.installChecksum = data.length;
        data = this.installChecksum + os_1.EOL + data;
        console.log(logName + 'Number of packages: ' + installed.length);
        if (!fs.existsSync(Path.resolve(this.rootPath, 'dist')))
            fs.mkdirSync(Path.resolve(this.rootPath, 'dist'));
        fs.writeFileSync(Path.resolve(this.rootPath, 'dist', 'dr.integrity.txt'), data, 'utf8');
    }
    /**
     * Not including symlink components
     */
    _countPackages() {
        // console.log(logName + 'Counting installed modules...');
        // var count = 0;
        const packageNames = [];
        const moduleDir = Path.resolve(this.rootPath, 'node_modules');
        for (const fname of fs.readdirSync(moduleDir)) {
            if (fname.startsWith('@')) {
                const scopeDir = Path.resolve(moduleDir, fname);
                for (const subfname of fs.readdirSync(scopeDir)) {
                    if (subfname.startsWith('.'))
                        continue;
                    if (fs.existsSync(Path.resolve(scopeDir, subfname, 'package.json')) &&
                        !fs.lstatSync(Path.resolve(scopeDir, subfname)).isSymbolicLink()) {
                        // count++;
                        packageNames.push(fname + '/' + subfname);
                    }
                }
            }
            if (fname.startsWith('.'))
                continue;
            if (fs.existsSync(Path.resolve(moduleDir, fname, 'package.json'))) {
                packageNames.push(fname);
                // count++;
            }
        }
        return packageNames;
    }
    /**
     * Mark changes and writing dr.package.json, and restore package.json and create dr.yarn.lock
     * @param {*} dependencies
     */
    afterChange() {
        if (this.changes) {
            if (!fs.existsSync(this.rootPath + '/dist'))
                fs.mkdirSync(this.rootPath + '/dist');
            fs.writeFileSync(Path.join(this.rootPath, 'dist', 'dr.package.json'), JSON.stringify(this.changes, null, '  '));
        }
        // fs.renameSync(Path.join(this.rootPath, 'package.json'), Path.join(this.rootPath, 'dr.package.json'));
        fs.renameSync(Path.join(this.rootPath, 'dr.backup.package.json'), Path.join(this.rootPath, 'package.json'));
        if (!this.offline && fs.existsSync(this.rootPath + '/yarn.lock')) {
            fs.createReadStream(this.rootPath + '/yarn.lock')
                .pipe(fs.createWriteStream(this.rootPath + '/dr.offline-yarn.lock'));
            console.log(logName + 'Write dr.offline-yarn.lock');
        }
        this.isPackageJsonDirty = false;
        this.changes = null;
        console.log(logName + 'Save to dist/dr.package.json, restore package.json from dr.backup.package.json');
    }
    afterChangeFail() {
        const pkfile = Path.join(this.rootPath, 'package.json');
        if (fs.existsSync(pkfile))
            fs.renameSync(pkfile, Path.join(this.rootPath, 'dr.fail.package.json'));
        fs.renameSync(Path.join(this.rootPath, 'dr.backup.package.json'), Path.join(this.rootPath, 'package.json'));
        this.isPackageJsonDirty = false;
        this.changes = null;
        console.log(logName + 'Restore package.json from dr.backup.package.json');
    }
}
Guarder.instances = {};
function getInstance(rootPath) {
    rootPath = Path.resolve(rootPath);
    var g = Guarder.instances[rootPath];
    if (g)
        return g;
    g = new Guarder(rootPath);
    Guarder.instances[rootPath] = g;
    return g;
}
exports.getInstance = getInstance;
function clonePkJson(obj) {
    // mimic lodash deeply clone
    const cloned = Object.assign({}, obj);
    cloned.dependencies = Object.assign({}, obj.dependencies);
    cloned.devDependencies = Object.assign({}, obj.devDependencies);
    return cloned;
}
function has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDhEQUFnRDtBQUNoRCwyQkFBaUM7QUFDakMsTUFBTSxPQUFPLEdBQUcsYUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVqRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7QUFNL0I7Ozs7RUFJRTtBQUNGLE1BQU0sT0FBTztJQVVaLFlBQW1CLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFSbkMsWUFBTyxHQUF1QixJQUFJLENBQUM7UUFDbkMsb0JBQWUsR0FBa0IsSUFBSSxDQUFDO1FBQ3RDLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUUzQix5QkFBb0IsR0FBbUIsSUFBSSxDQUFDO1FBQzVDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFJZixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JHLENBQUM7SUFFRDs7O09BR0c7SUFDSCxZQUFZLENBQUMsaUJBQXVCO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLCtDQUErQyxDQUFDLENBQUM7UUFDdkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDdEUsSUFBSSxpQkFBaUIsRUFBRTtZQUN0QixFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2hEO2FBQU07WUFD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USxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxDQUFDO0FBQ1YsQ0FBQztBQVJELGtDQVFDO0FBRUQsU0FBUyxXQUFXLENBQUMsR0FBZ0I7SUFDcEMsNEJBQTRCO0lBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVELFNBQVMsR0FBRyxDQUFDLEdBQVEsRUFBRSxJQUFZO0lBQ2xDLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHByb2Nlc3NVdGlscyBmcm9tICcuL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtFT0wsIHBsYXRmb3JtfSBmcm9tICdvcyc7XG5jb25zdCBpc1dpbjMyID0gcGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5cbmNvbnN0IGxvZ05hbWUgPSAnW0luc3RhbGxlcl0gJztcblxuaW50ZXJmYWNlIFBhY2thZ2VKc29uIHtcblx0ZGVwZW5kZW5jaWVzOiB7W2s6IHN0cmluZ106IHN0cmluZ307XG5cdGRldkRlcGVuZGVuY2llczoge1trOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuLyoqXG4gKiBUaGlzIGNsYXNzIGhlbHBzIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzIGZvciBjb21tYW5kIFwiaW5pdFwiLFxuICogaXQgaXMgaW4gY2hhcmdlIG9mIG1hbmlwdWxhdGluZyA8ZHJjcC13b3Jrc3BhY2U+L2RyLnBhY2thZ2UuanNvblxuICogYW5kIHJ1biBcInlhcm4gaW5zdGFsbFwiLCB0byBwcm90ZWN0IHRoZSBvcmlnaW5hbCBwYWNrYWdlLmpzb24gZmlsZVxuKi9cbmNsYXNzIEd1YXJkZXIge1xuXHRzdGF0aWMgaW5zdGFuY2VzOiB7W2s6IHN0cmluZ106IEd1YXJkZXJ9ID0ge307XG5cdGNoYW5nZXM6IFBhY2thZ2VKc29uIHwgbnVsbCA9IG51bGw7XG5cdGluc3RhbGxDaGVja3N1bTogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cdGlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuXHRpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuXHRpc05vZGVNb2R1bGVzQ2hhbmdlZDogYm9vbGVhbiB8IG51bGwgPSBudWxsO1xuXHRvZmZsaW5lID0gZmFsc2U7XG5cdHByb3RlY3RlZCBsYXN0SW5zdGFsbGVkOiBzdHJpbmdbXTtcblxuXHRjb25zdHJ1Y3RvcihwdWJsaWMgcm9vdFBhdGg6IHN0cmluZykge1xuXHRcdHRoaXMuaXNEcmNwU3ltbGluayA9IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBCYWNrdXAgcGFja2FnZS5qc29uXG5cdCAqIEBwYXJhbSB7Kn0gYmFja3VwRmlsZUNvbnRlbnRcblx0ICovXG5cdGJlZm9yZUNoYW5nZShiYWNrdXBGaWxlQ29udGVudD86IGFueSkge1xuXHRcdGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnQmFja3VwIHBhY2thZ2UuanNvbiB0byBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG5cdFx0Y29uc3QgYmFja3VwRmlsZSA9IFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuXHRcdGlmIChiYWNrdXBGaWxlQ29udGVudCkge1xuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhiYWNrdXBGaWxlLCBiYWNrdXBGaWxlQ29udGVudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcblx0XHRcdGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgYnVmKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogR2V0IGxhc3QgY2hhbmdlZCBwYWNrYWdlLmpzb24ganNvbiBmcm9tIGRyLnBhY2thZ2UuanNvbiBvciBtZW1vcnlcblx0ICogQHJldHVybnMge0pTT059IGEgY2xvbmVkIHBhY2thZ2UuanNvblxuXHQgKi9cblx0Z2V0Q2hhbmdlcygpIHtcblx0XHRpZiAodGhpcy5jaGFuZ2VzKSB7XG5cdFx0XHRyZXR1cm4gY2xvbmVQa0pzb24odGhpcy5jaGFuZ2VzKTtcblx0XHR9XG5cdFx0Y29uc3QgbGFzdENoYW5nZWQgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2Rpc3QnLCAnZHIucGFja2FnZS5qc29uJyk7XG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMobGFzdENoYW5nZWQpKSB7XG5cdFx0XHRjb25zdCBjaGFuZ2VkSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxhc3RDaGFuZ2VkLCAndXRmOCcpKTtcblx0XHRcdHRoaXMuY2hhbmdlcyA9IGNoYW5nZWRKc29uO1xuXHRcdFx0cmV0dXJuIGNsb25lUGtKc29uKGNoYW5nZWRKc29uKTtcblx0XHR9XG5cdFx0cmV0dXJuIHtkZXBlbmRlbmNpZXM6IHt9LCBkZXZEZXBlbmRlbmNpZXM6IHt9fTtcblx0fVxuXG5cdGdldEpzb25GaWxlKCkge1xuXHRcdGlmICh0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSB8fCAhZnMuZXhpc3RzU3luYyh0aGlzLnJvb3RQYXRoICsgJy9kaXN0L2RyLnBhY2thZ2UuanNvbicpKVxuXHRcdFx0cmV0dXJuIHRoaXMucm9vdFBhdGggKyAnL3BhY2thZ2UuanNvbic7XG5cdFx0cmV0dXJuIFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoICsgJy9kaXN0L2RyLnBhY2thZ2UuanNvbicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIE1hcmsgY2hhbmdlcyB3aXRob3V0IHdyaXRpbmcgZHIucGFja2FnZS5qc29uXG5cdCAqIHJldHVybiBhIGNvbXBsZXRlIGxpc3Qgb2YgdGhpcyB0aW1lIG1hcmtlZCBkZXBlbmRlbmNpZXMgdG9nZXRoZXIgd2l0aCBsYXN0IHRpbWUgbWFya2VkXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBwayBwYWNrYWdlLmpzb25cblx0ICogQHJldHVybiBjaGFuZ2VkIGxpc3QgW3N0cmluZywgc3RyaW5nXVtdXG5cdCAqL1xuXHRtYXJrQ2hhbmdlcyhwazogUGFja2FnZUpzb24pIHtcblx0XHRjb25zdCBjaGFuZ2VMaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IFtdO1xuXHRcdGlmICh0aGlzLmlzRHJjcFN5bWxpbmspIHtcblx0XHRcdGlmIChway5kZXBlbmRlbmNpZXMpIHtcblx0XHRcdFx0ZGVsZXRlIHBrLmRlcGVuZGVuY2llc1snZHItY29tcC1wYWNrYWdlJ107XG5cdFx0XHRcdGRlbGV0ZSBway5kZXBlbmRlbmNpZXNbJ0Bkci9pbnRlcm5hbC1yZWNpcGUnXTtcblx0XHRcdH1cblx0XHRcdGlmIChway5kZXZEZXBlbmRlbmNpZXMpIHtcblx0XHRcdFx0ZGVsZXRlIHBrLmRldkRlcGVuZGVuY2llc1snZHItY29tcC1wYWNrYWdlJ107XG5cdFx0XHRcdGRlbGV0ZSBway5kZXZEZXBlbmRlbmNpZXNbJ0Bkci9pbnRlcm5hbC1yZWNpcGUnXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gY2xlYW4gZHVwbGljYXRlcyBpbiBkZXZEZXBlbmRlbmNpZXNcblx0XHRpZiAocGsuZGV2RGVwZW5kZW5jaWVzKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGRlcCBpbiBway5kZXZEZXBlbmRlbmNpZXMpIHtcblx0XHRcdFx0aWYgKGhhcyhway5kZXZEZXBlbmRlbmNpZXMsIGRlcCkgJiYgaGFzKHBrLmRlcGVuZGVuY2llcywgZGVwKSlcblx0XHRcdFx0XHRkZWxldGUgcGsuZGV2RGVwZW5kZW5jaWVzW2RlcF07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNvbnN0IGxhc3REZXBzID0gdGhpcy5nZXRDaGFuZ2VzKCkuZGVwZW5kZW5jaWVzO1xuXHRcdGNvbnN0IGxhc3REZXZEZXBzID0gdGhpcy5nZXRDaGFuZ2VzKCkuZGV2RGVwZW5kZW5jaWVzO1xuXHRcdGZvckNoYW5nZXMobGFzdERlcHMsIHBrLmRlcGVuZGVuY2llcyk7XG5cdFx0Zm9yQ2hhbmdlcyhsYXN0RGV2RGVwcywgcGsuZGV2RGVwZW5kZW5jaWVzKTtcblxuXHRcdGZ1bmN0aW9uIGZvckNoYW5nZXMobGFzdERlcDoge1trOiBzdHJpbmddOiBzdHJpbmd9LCBuZXdEZXA6IHtbazogc3RyaW5nXTogc3RyaW5nfSkge1xuXHRcdFx0aWYgKG5ld0RlcCAhPSBudWxsKSB7XG5cdFx0XHRcdGZvciAoY29uc3QgZGVwIGluIG5ld0RlcCkge1xuXHRcdFx0XHRcdGlmICghaGFzKG5ld0RlcCwgZGVwKSlcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdGNvbnN0IHZlciA9IG5ld0RlcFtkZXBdO1xuXHRcdFx0XHRcdGlmIChsYXN0RGVwW2RlcF0gIT09IHZlcikge1xuXHRcdFx0XHRcdFx0Y2hhbmdlTGlzdC5wdXNoKFtkZXAsIHZlcl0pOyAvLyBuZXcgb3IgY2hhbmdlZCBkZXBlbmRlbmN5XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGRlbGV0ZSBsYXN0RGVwW2RlcF07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGNvbnN0IHJlc3RMYXN0RGVwID0gT2JqZWN0LmtleXMobGFzdERlcCkubWFwPFtzdHJpbmcsIHN0cmluZ10+KHJvdyA9PiB7XG5cdFx0XHRcdHJldHVybiBbcm93LCBsYXN0RGVwW3Jvd11dO1xuXHRcdFx0fSk7XG5cdFx0XHQvLyBDb21wbGV0ZSBkZXBlbmRlbmNpZXMgPSBuZXcvY2hhbmdlZCArIHJlc3Rcblx0XHRcdGNoYW5nZUxpc3QucHVzaCguLi5yZXN0TGFzdERlcCk7XG5cdFx0fVxuXHRcdC8vIHBrLmRlcGVuZGVuY2llcyA9IG9yaWdpbmFsRGVwcztcblx0XHR0aGlzLmNoYW5nZXMgPSBwaztcblx0XHRyZXR1cm4gY2hhbmdlTGlzdDtcblx0fVxuXG5cdGlzTW9kdWxlc0NoYW5nZWQoKSB7XG5cdFx0aWYgKHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgIT0gbnVsbClcblx0XHRcdHJldHVybiB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkO1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuXHRcdFx0aWYgKHRoaXMuaW5zdGFsbENoZWNrc3VtID09IG51bGwpIHtcblx0XHRcdFx0Y29uc3QgbGFzdENvdW50RmlsZSA9IFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZGlzdCcsICdkci5pbnRlZ3JpdHkudHh0Jyk7XG5cdFx0XHRcdGlmICghZnMuZXhpc3RzU3luYyhtb2R1bGVEaXIpIHx8ICFmcy5leGlzdHNTeW5jKGxhc3RDb3VudEZpbGUpKSB7XG5cdFx0XHRcdFx0dGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgY2hlY2tzdW1EYXRhID0gZnMucmVhZEZpbGVTeW5jKGxhc3RDb3VudEZpbGUsICd1dGY4Jykuc3BsaXQoRU9MKTtcblx0XHRcdFx0dGhpcy5pbnN0YWxsQ2hlY2tzdW0gPSBwYXJzZUludChjaGVja3N1bURhdGFbMF0sIDEwKTtcblx0XHRcdFx0dGhpcy5sYXN0SW5zdGFsbGVkID0gY2hlY2tzdW1EYXRhLnNsaWNlKDEpO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y29uc29sZS5sb2cobG9nTmFtZSwgZXJyKTtcblx0XHRcdHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdGNvbnN0IGluc3RhbGxlZCA9IHRoaXMuX2NvdW50UGFja2FnZXMoKTtcblx0XHRjb25zdCBjdXJyQ2hlY2tzdW0gPSBpbnN0YWxsZWQuam9pbihFT0wpLmxlbmd0aDtcblx0XHRpZiAoY3VyckNoZWNrc3VtICE9PSB0aGlzLmluc3RhbGxDaGVja3N1bSkge1xuXHRcdFx0Y29uc29sZS5sb2cobG9nTmFtZSArIGBJbnN0YWxsYXRpb24gaW50ZWdyaXR5IGNoZWNrc3VtIGhhcyBjaGFuZ2VkIGZyb20gJHt0aGlzLmluc3RhbGxDaGVja3N1bX0gdG8gJHtjdXJyQ2hlY2tzdW19YCk7XG5cdFx0XHRjb25zdCBpbnN0YWxsZWRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0XHRcdGZvciAoY29uc3QgbmFtZSBvZiBpbnN0YWxsZWQpIHtcblx0XHRcdFx0aW5zdGFsbGVkU2V0LmFkZChuYW1lKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLmxhc3RJbnN0YWxsZWQpIHtcblx0XHRcdFx0Zm9yIChjb25zdCBuYW1lIG9mIHRoaXMubGFzdEluc3RhbGxlZCkge1xuXHRcdFx0XHRcdGlmICghaW5zdGFsbGVkU2V0LmhhcyhuYW1lKSlcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnTWlzc2luZyAnICsgbmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSBmYWxzZTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRhc3luYyBpbnN0YWxsQXN5bmMoZG9Ob3RNYXJrSW5zdGFsbE51bSA9IGZhbHNlLCB1c2VZYXJuID0gZmFsc2UsIG9ubHlQcm9kID0gZmFsc2UsIGlzT2ZmbGluZSA9IGZhbHNlKSB7XG5cdFx0dGhpcy5vZmZsaW5lID0gaXNPZmZsaW5lO1xuXHRcdGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSxcblx0XHRcdEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0Q2hhbmdlcygpLCBudWxsLCAnICAnKSk7XG5cdFx0dGhpcy5pc1BhY2thZ2VKc29uRGlydHkgPSB0cnVlO1xuXHRcdGNvbnN0IGRyY3BMb2NhdGlvbiA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpO1xuXHRcdGNvbnN0IHJlYWxEcmNwUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhkcmNwTG9jYXRpb24pO1xuXHRcdC8vIHZhciB5YXJuQXJndiA9IFsnaW5zdGFsbCcsICctLW5vbi1pbnRlcmFjdGl2ZScsICctLWNoZWNrLWZpbGVzJ107XG5cdFx0Y29uc3QgbnBtQXJndiA9IFsnaW5zdGFsbCddO1xuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdGlmICh0aGlzLmlzRHJjcFN5bWxpbmsgJiYgZnMuZXhpc3RzU3luYyhkcmNwTG9jYXRpb24pKSB7XG5cdFx0XHRmcy51bmxpbmtTeW5jKGRyY3BMb2NhdGlvbik7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHJlY3JlYXRlU3ltbGluaygpIHtcblx0XHRcdGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSkpIHtcblx0XHRcdFx0ZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZSgnbm9kZV9tb2R1bGVzJywgcmVhbERyY3BQYXRoKSwgZHJjcExvY2F0aW9uLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcblx0XHRcdFx0Y29uc29sZS5sb2cobG9nTmFtZSArICdXcml0ZSBzeW1saW5rIGRyLWNvbXAtcGFja2FnZScpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCFkb05vdE1hcmtJbnN0YWxsTnVtKVxuXHRcdFx0XHRzZWxmLm1hcmtJbnN0YWxsTnVtKCk7XG5cdFx0fVxuXHRcdGxldCByZXM6IHN0cmluZztcblx0XHR0cnkge1xuXHRcdFx0cmVzID0gYXdhaXQgcHJvY2Vzc1V0aWxzLmV4ZShcblx0XHRcdFx0dXNlWWFybiA/ICd5YXJuJyA6ICducG0nLCAuLi5ucG1Bcmd2LCB7Y3dkOiB0aGlzLnJvb3RQYXRoLFxuXHRcdFx0XHRcdGVudjogT2JqZWN0LmFzc2lnbih7fSwgcHJvY2Vzcy5lbnYsIHtOT0RFX0VOVjogb25seVByb2QgPyAncHJvZHVjdGlvbic6ICdkZXZlbG9wbWVudCd9KX1cblx0XHRcdFx0XHQpLnByb21pc2U7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnU29ycnksIHlhcm4vbnBtIGluc3RhbGwgZmFpbGVkJyk7XG5cdFx0XHRjb25zb2xlLmxvZyhlcnIpO1xuXHRcdFx0dGhyb3cgZXJyO1xuXHRcdH1cblx0XHRpZiAodGhpcy5pc0RyY3BTeW1saW5rKSB7XG5cdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZShyZXMpLCA1MDApKTtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJlY3JlYXRlU3ltbGluaygpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdHJlY3JlYXRlU3ltbGluaygpO1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0fSBlbHNlXG5cdFx0XHRyZXR1cm4gcmVzO1xuXHR9XG5cblx0bWFya0luc3RhbGxOdW0oKSB7XG5cdFx0dGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IG51bGw7XG5cdFx0Y29uc3QgaW5zdGFsbGVkID0gdGhpcy5sYXN0SW5zdGFsbGVkID0gdGhpcy5fY291bnRQYWNrYWdlcygpO1xuXHRcdHZhciBkYXRhID0gaW5zdGFsbGVkLmpvaW4oRU9MKTtcblx0XHR0aGlzLmluc3RhbGxDaGVja3N1bSA9IGRhdGEubGVuZ3RoO1xuXHRcdGRhdGEgPSB0aGlzLmluc3RhbGxDaGVja3N1bSArIEVPTCArIGRhdGE7XG5cdFx0Y29uc29sZS5sb2cobG9nTmFtZSArICdOdW1iZXIgb2YgcGFja2FnZXM6ICcgKyBpbnN0YWxsZWQubGVuZ3RoKTtcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JykpKVxuXHRcdFx0ZnMubWtkaXJTeW5jKFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnZGlzdCcpKTtcblx0XHRmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnZGlzdCcsICdkci5pbnRlZ3JpdHkudHh0JyksIGRhdGEsICd1dGY4Jyk7XG5cdH1cblxuXHQvKipcblx0ICogTm90IGluY2x1ZGluZyBzeW1saW5rIGNvbXBvbmVudHNcblx0ICovXG5cdF9jb3VudFBhY2thZ2VzKCkge1xuXHRcdC8vIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnQ291bnRpbmcgaW5zdGFsbGVkIG1vZHVsZXMuLi4nKTtcblx0XHQvLyB2YXIgY291bnQgPSAwO1xuXHRcdGNvbnN0IHBhY2thZ2VOYW1lcyA9IFtdO1xuXHRcdGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG5cdFx0Zm9yIChjb25zdCBmbmFtZSBvZiBmcy5yZWFkZGlyU3luYyhtb2R1bGVEaXIpKSB7XG5cdFx0XHRpZiAoZm5hbWUuc3RhcnRzV2l0aCgnQCcpKSB7XG5cdFx0XHRcdGNvbnN0IHNjb3BlRGlyID0gUGF0aC5yZXNvbHZlKG1vZHVsZURpciwgZm5hbWUpO1xuXHRcdFx0XHRmb3IgKGNvbnN0IHN1YmZuYW1lIG9mIGZzLnJlYWRkaXJTeW5jKHNjb3BlRGlyKSkge1xuXHRcdFx0XHRcdGlmIChzdWJmbmFtZS5zdGFydHNXaXRoKCcuJykpXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRpZiAoZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoc2NvcGVEaXIsIHN1YmZuYW1lLCAncGFja2FnZS5qc29uJykpICYmXG5cdFx0XHRcdFx0XHQhZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZShzY29wZURpciwgc3ViZm5hbWUpKS5pc1N5bWJvbGljTGluaygpKSB7XG5cdFx0XHRcdFx0XHQvLyBjb3VudCsrO1xuXHRcdFx0XHRcdFx0cGFja2FnZU5hbWVzLnB1c2goZm5hbWUgKyAnLycgKyBzdWJmbmFtZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoZm5hbWUuc3RhcnRzV2l0aCgnLicpKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdGlmIChmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShtb2R1bGVEaXIsIGZuYW1lLCAncGFja2FnZS5qc29uJykpKSB7XG5cdFx0XHRcdHBhY2thZ2VOYW1lcy5wdXNoKGZuYW1lKTtcblx0XHRcdFx0Ly8gY291bnQrKztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHBhY2thZ2VOYW1lcztcblx0fVxuXG5cdC8qKlxuXHQgKiBNYXJrIGNoYW5nZXMgYW5kIHdyaXRpbmcgZHIucGFja2FnZS5qc29uLCBhbmQgcmVzdG9yZSBwYWNrYWdlLmpzb24gYW5kIGNyZWF0ZSBkci55YXJuLmxvY2tcblx0ICogQHBhcmFtIHsqfSBkZXBlbmRlbmNpZXNcblx0ICovXG5cdGFmdGVyQ2hhbmdlKCkge1xuXHRcdGlmICh0aGlzLmNoYW5nZXMpIHtcblx0XHRcdGlmICghZnMuZXhpc3RzU3luYyh0aGlzLnJvb3RQYXRoICsgJy9kaXN0JykpXG5cdFx0XHRcdGZzLm1rZGlyU3luYyh0aGlzLnJvb3RQYXRoICsgJy9kaXN0Jyk7XG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZGlzdCcsICdkci5wYWNrYWdlLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkodGhpcy5jaGFuZ2VzLCBudWxsLCAnICAnKSk7XG5cdFx0fVxuXHRcdC8vIGZzLnJlbmFtZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5wYWNrYWdlLmpzb24nKSk7XG5cdFx0ZnMucmVuYW1lU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG5cdFx0aWYgKCF0aGlzLm9mZmxpbmUgJiYgZnMuZXhpc3RzU3luYyh0aGlzLnJvb3RQYXRoICsgJy95YXJuLmxvY2snKSkge1xuXHRcdFx0ZnMuY3JlYXRlUmVhZFN0cmVhbSh0aGlzLnJvb3RQYXRoICsgJy95YXJuLmxvY2snKVxuXHRcdFx0XHQucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbSh0aGlzLnJvb3RQYXRoICsgJy9kci5vZmZsaW5lLXlhcm4ubG9jaycpKTtcblx0XHRcdGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnV3JpdGUgZHIub2ZmbGluZS15YXJuLmxvY2snKTtcblx0XHR9XG5cdFx0dGhpcy5pc1BhY2thZ2VKc29uRGlydHkgPSBmYWxzZTtcblx0XHR0aGlzLmNoYW5nZXMgPSBudWxsO1xuXHRcdGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnU2F2ZSB0byBkaXN0L2RyLnBhY2thZ2UuanNvbiwgcmVzdG9yZSBwYWNrYWdlLmpzb24gZnJvbSBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG5cdH1cblxuXHRhZnRlckNoYW5nZUZhaWwoKSB7XG5cdFx0Y29uc3QgcGtmaWxlID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKTtcblx0XHRpZiAoZnMuZXhpc3RzU3luYyhwa2ZpbGUpKVxuXHRcdFx0ZnMucmVuYW1lU3luYyhwa2ZpbGUsIFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuZmFpbC5wYWNrYWdlLmpzb24nKSk7XG5cdFx0ZnMucmVuYW1lU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG5cdFx0dGhpcy5pc1BhY2thZ2VKc29uRGlydHkgPSBmYWxzZTtcblx0XHR0aGlzLmNoYW5nZXMgPSBudWxsO1xuXHRcdGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnUmVzdG9yZSBwYWNrYWdlLmpzb24gZnJvbSBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEluc3RhbmNlKHJvb3RQYXRoOiBzdHJpbmcpIHtcblx0cm9vdFBhdGggPSBQYXRoLnJlc29sdmUocm9vdFBhdGgpO1xuXHR2YXIgZyA9IEd1YXJkZXIuaW5zdGFuY2VzW3Jvb3RQYXRoXTtcblx0aWYgKGcpXG5cdFx0cmV0dXJuIGc7XG5cdGcgPSBuZXcgR3VhcmRlcihyb290UGF0aCk7XG5cdEd1YXJkZXIuaW5zdGFuY2VzW3Jvb3RQYXRoXSA9IGc7XG5cdHJldHVybiBnO1xufVxuXG5mdW5jdGlvbiBjbG9uZVBrSnNvbihvYmo6IFBhY2thZ2VKc29uKTogUGFja2FnZUpzb24ge1xuXHQvLyBtaW1pYyBsb2Rhc2ggZGVlcGx5IGNsb25lXG5cdGNvbnN0IGNsb25lZCA9IE9iamVjdC5hc3NpZ24oe30sIG9iaik7XG5cdGNsb25lZC5kZXBlbmRlbmNpZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvYmouZGVwZW5kZW5jaWVzKTtcblx0Y2xvbmVkLmRldkRlcGVuZGVuY2llcyA9IE9iamVjdC5hc3NpZ24oe30sIG9iai5kZXZEZXBlbmRlbmNpZXMpO1xuXHRyZXR1cm4gY2xvbmVkO1xufVxuXG5mdW5jdGlvbiBoYXMob2JqOiBhbnksIHByb3A6IHN0cmluZykge1xuXHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iXX0=