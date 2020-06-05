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
        /** DRCP init is in-progress, local package.json is replaced by dr.package.json */
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
            }
            if (pk.devDependencies) {
                delete pk.devDependencies['dr-comp-package'];
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
            try {
                if (!useYarn) {
                    yield processUtils.exe('npm', 'dedupe', { cwd: this.rootPath }).promise;
                }
            }
            catch (err) {
                console.log('Sorry, npm dedupe failed');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDhEQUFnRDtBQUNoRCwyQkFBaUM7QUFDakMsTUFBTSxPQUFPLEdBQUcsYUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVqRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7QUFNL0I7Ozs7RUFJRTtBQUNGLE1BQU0sT0FBTztJQVdYLFlBQW1CLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFUbkMsWUFBTyxHQUF1QixJQUFJLENBQUM7UUFDbkMsb0JBQWUsR0FBa0IsSUFBSSxDQUFDO1FBQ3RDLGtGQUFrRjtRQUNsRix1QkFBa0IsR0FBRyxLQUFLLENBQUM7UUFFM0IseUJBQW9CLEdBQW1CLElBQUksQ0FBQztRQUM1QyxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBSWQsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN0RyxDQUFDO0lBRUQ7OztTQUdFO0lBQ0YsWUFBWSxDQUFDLGlCQUF1QjtRQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRywrQ0FBK0MsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RFLElBQUksaUJBQWlCLEVBQUU7WUFDckIsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztT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SUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQVJELGtDQVFDO0FBRUQsU0FBUyxXQUFXLENBQUMsR0FBZ0I7SUFDbkMsNEJBQTRCO0lBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLEdBQUcsQ0FBQyxHQUFRLEVBQUUsSUFBWTtJQUNqQyxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDekQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBwcm9jZXNzVXRpbHMgZnJvbSAnLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7RU9MLCBwbGF0Zm9ybX0gZnJvbSAnb3MnO1xuY29uc3QgaXNXaW4zMiA9IHBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5jb25zdCBsb2dOYW1lID0gJ1tJbnN0YWxsZXJdICc7XG5cbmludGVyZmFjZSBQYWNrYWdlSnNvbiB7XG4gIGRlcGVuZGVuY2llczoge1trOiBzdHJpbmddOiBzdHJpbmd9O1xuICBkZXZEZXBlbmRlbmNpZXM6IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbn1cbi8qKlxuICogVGhpcyBjbGFzcyBoZWxwcyB0byBpbnN0YWxsIGRlcGVuZGVuY2llcyBmb3IgY29tbWFuZCBcImluaXRcIixcbiAqIGl0IGlzIGluIGNoYXJnZSBvZiBtYW5pcHVsYXRpbmcgPGRyY3Atd29ya3NwYWNlPi9kci5wYWNrYWdlLmpzb25cbiAqIGFuZCBydW4gXCJ5YXJuIGluc3RhbGxcIiwgdG8gcHJvdGVjdCB0aGUgb3JpZ2luYWwgcGFja2FnZS5qc29uIGZpbGVcbiovXG5jbGFzcyBHdWFyZGVyIHtcbiAgc3RhdGljIGluc3RhbmNlczoge1trOiBzdHJpbmddOiBHdWFyZGVyfSA9IHt9O1xuICBjaGFuZ2VzOiBQYWNrYWdlSnNvbiB8IG51bGwgPSBudWxsO1xuICBpbnN0YWxsQ2hlY2tzdW06IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAvKiogRFJDUCBpbml0IGlzIGluLXByb2dyZXNzLCBsb2NhbCBwYWNrYWdlLmpzb24gaXMgcmVwbGFjZWQgYnkgZHIucGFja2FnZS5qc29uICovXG4gIGlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICBpc05vZGVNb2R1bGVzQ2hhbmdlZDogYm9vbGVhbiB8IG51bGwgPSBudWxsO1xuICBvZmZsaW5lID0gZmFsc2U7XG4gIHByb3RlY3RlZCBsYXN0SW5zdGFsbGVkOiBzdHJpbmdbXTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcm9vdFBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuaXNEcmNwU3ltbGluayA9IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBCYWNrdXAgcGFja2FnZS5qc29uXG5cdCAqIEBwYXJhbSB7Kn0gYmFja3VwRmlsZUNvbnRlbnRcblx0ICovXG4gIGJlZm9yZUNoYW5nZShiYWNrdXBGaWxlQ29udGVudD86IGFueSkge1xuICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnQmFja3VwIHBhY2thZ2UuanNvbiB0byBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgYmFja3VwRmlsZSA9IFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICAgIGlmIChiYWNrdXBGaWxlQ29udGVudCkge1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhiYWNrdXBGaWxlLCBiYWNrdXBGaWxlQ29udGVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgYnVmKTtcbiAgICB9XG4gIH1cblxuICAvKipcblx0ICogR2V0IGxhc3QgY2hhbmdlZCBwYWNrYWdlLmpzb24ganNvbiBmcm9tIGRyLnBhY2thZ2UuanNvbiBvciBtZW1vcnlcblx0ICogQHJldHVybnMge0pTT059IGEgY2xvbmVkIHBhY2thZ2UuanNvblxuXHQgKi9cbiAgZ2V0Q2hhbmdlcygpIHtcbiAgICBpZiAodGhpcy5jaGFuZ2VzKSB7XG4gICAgICByZXR1cm4gY2xvbmVQa0pzb24odGhpcy5jaGFuZ2VzKTtcbiAgICB9XG4gICAgY29uc3QgbGFzdENoYW5nZWQgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2Rpc3QnLCAnZHIucGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMobGFzdENoYW5nZWQpKSB7XG4gICAgICBjb25zdCBjaGFuZ2VkSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxhc3RDaGFuZ2VkLCAndXRmOCcpKTtcbiAgICAgIHRoaXMuY2hhbmdlcyA9IGNoYW5nZWRKc29uO1xuICAgICAgcmV0dXJuIGNsb25lUGtKc29uKGNoYW5nZWRKc29uKTtcbiAgICB9XG4gICAgcmV0dXJuIHtkZXBlbmRlbmNpZXM6IHt9LCBkZXZEZXBlbmRlbmNpZXM6IHt9fTtcbiAgfVxuXG4gIGdldEpzb25GaWxlKCkge1xuICAgIGlmICh0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSB8fCAhZnMuZXhpc3RzU3luYyh0aGlzLnJvb3RQYXRoICsgJy9kaXN0L2RyLnBhY2thZ2UuanNvbicpKVxuICAgICAgcmV0dXJuIHRoaXMucm9vdFBhdGggKyAnL3BhY2thZ2UuanNvbic7XG4gICAgcmV0dXJuIFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoICsgJy9kaXN0L2RyLnBhY2thZ2UuanNvbicpO1xuICB9XG5cbiAgLyoqXG5cdCAqIE1hcmsgY2hhbmdlcyB3aXRob3V0IHdyaXRpbmcgZHIucGFja2FnZS5qc29uXG5cdCAqIHJldHVybiBhIGNvbXBsZXRlIGxpc3Qgb2YgdGhpcyB0aW1lIG1hcmtlZCBkZXBlbmRlbmNpZXMgdG9nZXRoZXIgd2l0aCBsYXN0IHRpbWUgbWFya2VkXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBwayBwYWNrYWdlLmpzb25cblx0ICogQHJldHVybiBjaGFuZ2VkIGxpc3QgW3N0cmluZywgc3RyaW5nXVtdXG5cdCAqL1xuICBtYXJrQ2hhbmdlcyhwazogUGFja2FnZUpzb24pIHtcbiAgICBjb25zdCBjaGFuZ2VMaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IFtdO1xuICAgIGlmICh0aGlzLmlzRHJjcFN5bWxpbmspIHtcbiAgICAgIGlmIChway5kZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgZGVsZXRlIHBrLmRlcGVuZGVuY2llc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICB9XG4gICAgICBpZiAocGsuZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGRlbGV0ZSBway5kZXZEZXBlbmRlbmNpZXNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjbGVhbiBkdXBsaWNhdGVzIGluIGRldkRlcGVuZGVuY2llc1xuICAgIGlmIChway5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGZvciAoY29uc3QgZGVwIGluIHBrLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBpZiAoaGFzKHBrLmRldkRlcGVuZGVuY2llcywgZGVwKSAmJiBoYXMocGsuZGVwZW5kZW5jaWVzLCBkZXApKVxuICAgICAgICAgIGRlbGV0ZSBway5kZXZEZXBlbmRlbmNpZXNbZGVwXTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgbGFzdERlcHMgPSB0aGlzLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXM7XG4gICAgY29uc3QgbGFzdERldkRlcHMgPSB0aGlzLmdldENoYW5nZXMoKS5kZXZEZXBlbmRlbmNpZXM7XG4gICAgZm9yQ2hhbmdlcyhsYXN0RGVwcywgcGsuZGVwZW5kZW5jaWVzKTtcbiAgICBmb3JDaGFuZ2VzKGxhc3REZXZEZXBzLCBway5kZXZEZXBlbmRlbmNpZXMpO1xuXG4gICAgZnVuY3Rpb24gZm9yQ2hhbmdlcyhsYXN0RGVwOiB7W2s6IHN0cmluZ106IHN0cmluZ30sIG5ld0RlcDoge1trOiBzdHJpbmddOiBzdHJpbmd9KSB7XG4gICAgICBpZiAobmV3RGVwICE9IG51bGwpIHtcbiAgICAgICAgZm9yIChjb25zdCBkZXAgaW4gbmV3RGVwKSB7XG4gICAgICAgICAgaWYgKCFoYXMobmV3RGVwLCBkZXApKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgY29uc3QgdmVyID0gbmV3RGVwW2RlcF07XG4gICAgICAgICAgaWYgKGxhc3REZXBbZGVwXSAhPT0gdmVyKSB7XG4gICAgICAgICAgICBjaGFuZ2VMaXN0LnB1c2goW2RlcCwgdmVyXSk7IC8vIG5ldyBvciBjaGFuZ2VkIGRlcGVuZGVuY3lcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIGxhc3REZXBbZGVwXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgcmVzdExhc3REZXAgPSBPYmplY3Qua2V5cyhsYXN0RGVwKS5tYXA8W3N0cmluZywgc3RyaW5nXT4ocm93ID0+IHtcbiAgICAgICAgcmV0dXJuIFtyb3csIGxhc3REZXBbcm93XV07XG4gICAgICB9KTtcbiAgICAgIC8vIENvbXBsZXRlIGRlcGVuZGVuY2llcyA9IG5ldy9jaGFuZ2VkICsgcmVzdFxuICAgICAgY2hhbmdlTGlzdC5wdXNoKC4uLnJlc3RMYXN0RGVwKTtcbiAgICB9XG4gICAgLy8gcGsuZGVwZW5kZW5jaWVzID0gb3JpZ2luYWxEZXBzO1xuICAgIHRoaXMuY2hhbmdlcyA9IHBrO1xuICAgIHJldHVybiBjaGFuZ2VMaXN0O1xuICB9XG5cbiAgaXNNb2R1bGVzQ2hhbmdlZCgpIHtcbiAgICBpZiAodGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCAhPSBudWxsKVxuICAgICAgcmV0dXJuIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICBpZiAodGhpcy5pbnN0YWxsQ2hlY2tzdW0gPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBsYXN0Q291bnRGaWxlID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLmludGVncml0eS50eHQnKTtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKG1vZHVsZURpcikgfHwgIWZzLmV4aXN0c1N5bmMobGFzdENvdW50RmlsZSkpIHtcbiAgICAgICAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaGVja3N1bURhdGEgPSBmcy5yZWFkRmlsZVN5bmMobGFzdENvdW50RmlsZSwgJ3V0ZjgnKS5zcGxpdChFT0wpO1xuICAgICAgICB0aGlzLmluc3RhbGxDaGVja3N1bSA9IHBhcnNlSW50KGNoZWNrc3VtRGF0YVswXSwgMTApO1xuICAgICAgICB0aGlzLmxhc3RJbnN0YWxsZWQgPSBjaGVja3N1bURhdGEuc2xpY2UoMSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZyhsb2dOYW1lLCBlcnIpO1xuICAgICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgaW5zdGFsbGVkID0gdGhpcy5fY291bnRQYWNrYWdlcygpO1xuICAgIGNvbnN0IGN1cnJDaGVja3N1bSA9IGluc3RhbGxlZC5qb2luKEVPTCkubGVuZ3RoO1xuICAgIGlmIChjdXJyQ2hlY2tzdW0gIT09IHRoaXMuaW5zdGFsbENoZWNrc3VtKSB7XG4gICAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgYEluc3RhbGxhdGlvbiBpbnRlZ3JpdHkgY2hlY2tzdW0gaGFzIGNoYW5nZWQgZnJvbSAke3RoaXMuaW5zdGFsbENoZWNrc3VtfSB0byAke2N1cnJDaGVja3N1bX1gKTtcbiAgICAgIGNvbnN0IGluc3RhbGxlZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGluc3RhbGxlZCkge1xuICAgICAgICBpbnN0YWxsZWRTZXQuYWRkKG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubGFzdEluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5sYXN0SW5zdGFsbGVkKSB7XG4gICAgICAgICAgaWYgKCFpbnN0YWxsZWRTZXQuaGFzKG5hbWUpKVxuICAgICAgICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArICdNaXNzaW5nICcgKyBuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IGZhbHNlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFzeW5jIGluc3RhbGxBc3luYyhkb05vdE1hcmtJbnN0YWxsTnVtID0gZmFsc2UsIHVzZVlhcm4gPSBmYWxzZSwgb25seVByb2QgPSBmYWxzZSwgaXNPZmZsaW5lID0gZmFsc2UpIHtcbiAgICB0aGlzLm9mZmxpbmUgPSBpc09mZmxpbmU7XG4gICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRDaGFuZ2VzKCksIG51bGwsICcgICcpKTtcbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IHRydWU7XG4gICAgY29uc3QgZHJjcExvY2F0aW9uID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJyk7XG4gICAgY29uc3QgcmVhbERyY3BQYXRoID0gZnMucmVhbHBhdGhTeW5jKGRyY3BMb2NhdGlvbik7XG4gICAgLy8gdmFyIHlhcm5Bcmd2ID0gWydpbnN0YWxsJywgJy0tbm9uLWludGVyYWN0aXZlJywgJy0tY2hlY2stZmlsZXMnXTtcbiAgICBjb25zdCBucG1Bcmd2ID0gWydpbnN0YWxsJ107XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEcmNwU3ltbGluayAmJiBmcy5leGlzdHNTeW5jKGRyY3BMb2NhdGlvbikpIHtcbiAgICAgIGZzLnVubGlua1N5bmMoZHJjcExvY2F0aW9uKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVjcmVhdGVTeW1saW5rKCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpKSkge1xuICAgICAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKCdub2RlX21vZHVsZXMnLCByZWFsRHJjcFBhdGgpLCBkcmNwTG9jYXRpb24sIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ1dyaXRlIHN5bWxpbmsgZHItY29tcC1wYWNrYWdlJyk7XG4gICAgICB9XG4gICAgICBpZiAoIWRvTm90TWFya0luc3RhbGxOdW0pXG4gICAgICAgIHNlbGYubWFya0luc3RhbGxOdW0oKTtcbiAgICB9XG4gICAgbGV0IHJlczogc3RyaW5nO1xuICAgIHRyeSB7XG4gICAgICByZXMgPSBhd2FpdCBwcm9jZXNzVXRpbHMuZXhlKFxuICAgICAgICB1c2VZYXJuID8gJ3lhcm4nIDogJ25wbScsIC4uLm5wbUFyZ3YsIHtjd2Q6IHRoaXMucm9vdFBhdGgsXG4gICAgICAgICAgZW52OiBPYmplY3QuYXNzaWduKHt9LCBwcm9jZXNzLmVudiwge05PREVfRU5WOiBvbmx5UHJvZCA/ICdwcm9kdWN0aW9uJzogJ2RldmVsb3BtZW50J30pfVxuICAgICAgICAgICkucHJvbWlzZTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTb3JyeSwgeWFybi9ucG0gaW5zdGFsbCBmYWlsZWQnKTtcbiAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdXNlWWFybikge1xuICAgICAgICBhd2FpdCBwcm9jZXNzVXRpbHMuZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogdGhpcy5yb290UGF0aH0pLnByb21pc2U7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZygnU29ycnksIG5wbSBkZWR1cGUgZmFpbGVkJyk7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzRHJjcFN5bWxpbmspIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiByZXNvbHZlKHJlcyksIDUwMCkpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVjcmVhdGVTeW1saW5rKCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVjcmVhdGVTeW1saW5rKCk7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiByZXM7XG4gIH1cblxuICBtYXJrSW5zdGFsbE51bSgpIHtcbiAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gbnVsbDtcbiAgICBjb25zdCBpbnN0YWxsZWQgPSB0aGlzLmxhc3RJbnN0YWxsZWQgPSB0aGlzLl9jb3VudFBhY2thZ2VzKCk7XG4gICAgdmFyIGRhdGEgPSBpbnN0YWxsZWQuam9pbihFT0wpO1xuICAgIHRoaXMuaW5zdGFsbENoZWNrc3VtID0gZGF0YS5sZW5ndGg7XG4gICAgZGF0YSA9IHRoaXMuaW5zdGFsbENoZWNrc3VtICsgRU9MICsgZGF0YTtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ051bWJlciBvZiBwYWNrYWdlczogJyArIGluc3RhbGxlZC5sZW5ndGgpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ2Rpc3QnKSkpXG4gICAgICBmcy5ta2RpclN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JykpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLmludGVncml0eS50eHQnKSwgZGF0YSwgJ3V0ZjgnKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBOb3QgaW5jbHVkaW5nIHN5bWxpbmsgY29tcG9uZW50c1xuXHQgKi9cbiAgX2NvdW50UGFja2FnZXMoKSB7XG4gICAgLy8gY29uc29sZS5sb2cobG9nTmFtZSArICdDb3VudGluZyBpbnN0YWxsZWQgbW9kdWxlcy4uLicpO1xuICAgIC8vIHZhciBjb3VudCA9IDA7XG4gICAgY29uc3QgcGFja2FnZU5hbWVzID0gW107XG4gICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICBmb3IgKGNvbnN0IGZuYW1lIG9mIGZzLnJlYWRkaXJTeW5jKG1vZHVsZURpcikpIHtcbiAgICAgIGlmIChmbmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgY29uc3Qgc2NvcGVEaXIgPSBQYXRoLnJlc29sdmUobW9kdWxlRGlyLCBmbmFtZSk7XG4gICAgICAgIGZvciAoY29uc3Qgc3ViZm5hbWUgb2YgZnMucmVhZGRpclN5bmMoc2NvcGVEaXIpKSB7XG4gICAgICAgICAgaWYgKHN1YmZuYW1lLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShzY29wZURpciwgc3ViZm5hbWUsICdwYWNrYWdlLmpzb24nKSkgJiZcbiAgICAgICAgICAgICFmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHNjb3BlRGlyLCBzdWJmbmFtZSkpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIC8vIGNvdW50Kys7XG4gICAgICAgICAgICBwYWNrYWdlTmFtZXMucHVzaChmbmFtZSArICcvJyArIHN1YmZuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmbmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKG1vZHVsZURpciwgZm5hbWUsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgcGFja2FnZU5hbWVzLnB1c2goZm5hbWUpO1xuICAgICAgICAvLyBjb3VudCsrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFja2FnZU5hbWVzO1xuICB9XG5cbiAgLyoqXG5cdCAqIE1hcmsgY2hhbmdlcyBhbmQgd3JpdGluZyBkci5wYWNrYWdlLmpzb24sIGFuZCByZXN0b3JlIHBhY2thZ2UuanNvbiBhbmQgY3JlYXRlIGRyLnlhcm4ubG9ja1xuXHQgKiBAcGFyYW0geyp9IGRlcGVuZGVuY2llc1xuXHQgKi9cbiAgYWZ0ZXJDaGFuZ2UoKSB7XG4gICAgaWYgKHRoaXMuY2hhbmdlcykge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QnKSlcbiAgICAgICAgZnMubWtkaXJTeW5jKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QnKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLnBhY2thZ2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh0aGlzLmNoYW5nZXMsIG51bGwsICcgICcpKTtcbiAgICB9XG4gICAgLy8gZnMucmVuYW1lU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLnBhY2thZ2UuanNvbicpKTtcbiAgICBmcy5yZW5hbWVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICBpZiAoIXRoaXMub2ZmbGluZSAmJiBmcy5leGlzdHNTeW5jKHRoaXMucm9vdFBhdGggKyAnL3lhcm4ubG9jaycpKSB7XG4gICAgICBmcy5jcmVhdGVSZWFkU3RyZWFtKHRoaXMucm9vdFBhdGggKyAnL3lhcm4ubG9jaycpXG4gICAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHRoaXMucm9vdFBhdGggKyAnL2RyLm9mZmxpbmUteWFybi5sb2NrJykpO1xuICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArICdXcml0ZSBkci5vZmZsaW5lLXlhcm4ubG9jaycpO1xuICAgIH1cbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuY2hhbmdlcyA9IG51bGw7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdTYXZlIHRvIGRpc3QvZHIucGFja2FnZS5qc29uLCByZXN0b3JlIHBhY2thZ2UuanNvbiBmcm9tIGRyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgfVxuXG4gIGFmdGVyQ2hhbmdlRmFpbCgpIHtcbiAgICBjb25zdCBwa2ZpbGUgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrZmlsZSkpXG4gICAgICBmcy5yZW5hbWVTeW5jKHBrZmlsZSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5mYWlsLnBhY2thZ2UuanNvbicpKTtcbiAgICBmcy5yZW5hbWVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuY2hhbmdlcyA9IG51bGw7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdSZXN0b3JlIHBhY2thZ2UuanNvbiBmcm9tIGRyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5zdGFuY2Uocm9vdFBhdGg6IHN0cmluZykge1xuICByb290UGF0aCA9IFBhdGgucmVzb2x2ZShyb290UGF0aCk7XG4gIHZhciBnID0gR3VhcmRlci5pbnN0YW5jZXNbcm9vdFBhdGhdO1xuICBpZiAoZylcbiAgICByZXR1cm4gZztcbiAgZyA9IG5ldyBHdWFyZGVyKHJvb3RQYXRoKTtcbiAgR3VhcmRlci5pbnN0YW5jZXNbcm9vdFBhdGhdID0gZztcbiAgcmV0dXJuIGc7XG59XG5cbmZ1bmN0aW9uIGNsb25lUGtKc29uKG9iajogUGFja2FnZUpzb24pOiBQYWNrYWdlSnNvbiB7XG4gIC8vIG1pbWljIGxvZGFzaCBkZWVwbHkgY2xvbmVcbiAgY29uc3QgY2xvbmVkID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqKTtcbiAgY2xvbmVkLmRlcGVuZGVuY2llcyA9IE9iamVjdC5hc3NpZ24oe30sIG9iai5kZXBlbmRlbmNpZXMpO1xuICBjbG9uZWQuZGV2RGVwZW5kZW5jaWVzID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqLmRldkRlcGVuZGVuY2llcyk7XG4gIHJldHVybiBjbG9uZWQ7XG59XG5cbmZ1bmN0aW9uIGhhcyhvYmo6IGFueSwgcHJvcDogc3RyaW5nKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==