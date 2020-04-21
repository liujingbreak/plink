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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDhEQUFnRDtBQUNoRCwyQkFBaUM7QUFDakMsTUFBTSxPQUFPLEdBQUcsYUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVqRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7QUFNL0I7Ozs7RUFJRTtBQUNGLE1BQU0sT0FBTztJQVVYLFlBQW1CLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFSbkMsWUFBTyxHQUF1QixJQUFJLENBQUM7UUFDbkMsb0JBQWUsR0FBa0IsSUFBSSxDQUFDO1FBQ3RDLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUUzQix5QkFBb0IsR0FBbUIsSUFBSSxDQUFDO1FBQzVDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFJZCxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3RHLENBQUM7SUFFRDs7O1NBR0U7SUFDRixZQUFZLENBQUMsaUJBQXVCO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLCtDQUErQyxDQUFDLENBQUM7UUFDdkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDdEUsSUFBSSxpQkFBaUIsRUFBRTtZQUNyQixFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2pEO2FBQU07WUFD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SUFDNUUsQ0FBQzs7QUFqUk0saUJBQVMsR0FBMkIsRUFBRSxDQUFDO0FBb1JoRCxTQUFnQixXQUFXLENBQUMsUUFBZ0I7SUFDMUMsUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQyxJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMxQixPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQyxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFSRCxrQ0FRQztBQUVELFNBQVMsV0FBVyxDQUFDLEdBQWdCO0lBQ25DLDRCQUE0QjtJQUM1QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN0QyxNQUFNLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNoRSxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxHQUFHLENBQUMsR0FBUSxFQUFFLElBQVk7SUFDakMsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3pELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgcHJvY2Vzc1V0aWxzIGZyb20gJy4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge0VPTCwgcGxhdGZvcm19IGZyb20gJ29zJztcbmNvbnN0IGlzV2luMzIgPSBwbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcblxuY29uc3QgbG9nTmFtZSA9ICdbSW5zdGFsbGVyXSAnO1xuXG5pbnRlcmZhY2UgUGFja2FnZUpzb24ge1xuICBkZXBlbmRlbmNpZXM6IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbiAgZGV2RGVwZW5kZW5jaWVzOiB7W2s6IHN0cmluZ106IHN0cmluZ307XG59XG4vKipcbiAqIFRoaXMgY2xhc3MgaGVscHMgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMgZm9yIGNvbW1hbmQgXCJpbml0XCIsXG4gKiBpdCBpcyBpbiBjaGFyZ2Ugb2YgbWFuaXB1bGF0aW5nIDxkcmNwLXdvcmtzcGFjZT4vZHIucGFja2FnZS5qc29uXG4gKiBhbmQgcnVuIFwieWFybiBpbnN0YWxsXCIsIHRvIHByb3RlY3QgdGhlIG9yaWdpbmFsIHBhY2thZ2UuanNvbiBmaWxlXG4qL1xuY2xhc3MgR3VhcmRlciB7XG4gIHN0YXRpYyBpbnN0YW5jZXM6IHtbazogc3RyaW5nXTogR3VhcmRlcn0gPSB7fTtcbiAgY2hhbmdlczogUGFja2FnZUpzb24gfCBudWxsID0gbnVsbDtcbiAgaW5zdGFsbENoZWNrc3VtOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgaXNQYWNrYWdlSnNvbkRpcnR5ID0gZmFsc2U7XG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIGlzTm9kZU1vZHVsZXNDaGFuZ2VkOiBib29sZWFuIHwgbnVsbCA9IG51bGw7XG4gIG9mZmxpbmUgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIGxhc3RJbnN0YWxsZWQ6IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb290UGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5pc0RyY3BTeW1saW5rID0gZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpKS5pc1N5bWJvbGljTGluaygpO1xuICB9XG5cbiAgLyoqXG5cdCAqIEJhY2t1cCBwYWNrYWdlLmpzb25cblx0ICogQHBhcmFtIHsqfSBiYWNrdXBGaWxlQ29udGVudFxuXHQgKi9cbiAgYmVmb3JlQ2hhbmdlKGJhY2t1cEZpbGVDb250ZW50PzogYW55KSB7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdCYWNrdXAgcGFja2FnZS5qc29uIHRvIGRyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGJhY2t1cEZpbGVDb250ZW50KSB7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGJhY2t1cEZpbGVDb250ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYnVmID0gZnMucmVhZEZpbGVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJykpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhiYWNrdXBGaWxlLCBidWYpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuXHQgKiBHZXQgbGFzdCBjaGFuZ2VkIHBhY2thZ2UuanNvbiBqc29uIGZyb20gZHIucGFja2FnZS5qc29uIG9yIG1lbW9yeVxuXHQgKiBAcmV0dXJucyB7SlNPTn0gYSBjbG9uZWQgcGFja2FnZS5qc29uXG5cdCAqL1xuICBnZXRDaGFuZ2VzKCkge1xuICAgIGlmICh0aGlzLmNoYW5nZXMpIHtcbiAgICAgIHJldHVybiBjbG9uZVBrSnNvbih0aGlzLmNoYW5nZXMpO1xuICAgIH1cbiAgICBjb25zdCBsYXN0Q2hhbmdlZCA9IFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZGlzdCcsICdkci5wYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhsYXN0Q2hhbmdlZCkpIHtcbiAgICAgIGNvbnN0IGNoYW5nZWRKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobGFzdENoYW5nZWQsICd1dGY4JykpO1xuICAgICAgdGhpcy5jaGFuZ2VzID0gY2hhbmdlZEpzb247XG4gICAgICByZXR1cm4gY2xvbmVQa0pzb24oY2hhbmdlZEpzb24pO1xuICAgIH1cbiAgICByZXR1cm4ge2RlcGVuZGVuY2llczoge30sIGRldkRlcGVuZGVuY2llczoge319O1xuICB9XG5cbiAgZ2V0SnNvbkZpbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNQYWNrYWdlSnNvbkRpcnR5IHx8ICFmcy5leGlzdHNTeW5jKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QvZHIucGFja2FnZS5qc29uJykpXG4gICAgICByZXR1cm4gdGhpcy5yb290UGF0aCArICcvcGFja2FnZS5qc29uJztcbiAgICByZXR1cm4gUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QvZHIucGFja2FnZS5qc29uJyk7XG4gIH1cblxuICAvKipcblx0ICogTWFyayBjaGFuZ2VzIHdpdGhvdXQgd3JpdGluZyBkci5wYWNrYWdlLmpzb25cblx0ICogcmV0dXJuIGEgY29tcGxldGUgbGlzdCBvZiB0aGlzIHRpbWUgbWFya2VkIGRlcGVuZGVuY2llcyB0b2dldGhlciB3aXRoIGxhc3QgdGltZSBtYXJrZWRcblx0ICogQHBhcmFtIHtvYmplY3R9IHBrIHBhY2thZ2UuanNvblxuXHQgKiBAcmV0dXJuIGNoYW5nZWQgbGlzdCBbc3RyaW5nLCBzdHJpbmddW11cblx0ICovXG4gIG1hcmtDaGFuZ2VzKHBrOiBQYWNrYWdlSnNvbikge1xuICAgIGNvbnN0IGNoYW5nZUxpc3Q6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gW107XG4gICAgaWYgKHRoaXMuaXNEcmNwU3ltbGluaykge1xuICAgICAgaWYgKHBrLmRlcGVuZGVuY2llcykge1xuICAgICAgICBkZWxldGUgcGsuZGVwZW5kZW5jaWVzWydkci1jb21wLXBhY2thZ2UnXTtcbiAgICAgICAgZGVsZXRlIHBrLmRlcGVuZGVuY2llc1snQGRyL2ludGVybmFsLXJlY2lwZSddO1xuICAgICAgfVxuICAgICAgaWYgKHBrLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBkZWxldGUgcGsuZGV2RGVwZW5kZW5jaWVzWydkci1jb21wLXBhY2thZ2UnXTtcbiAgICAgICAgZGVsZXRlIHBrLmRldkRlcGVuZGVuY2llc1snQGRyL2ludGVybmFsLXJlY2lwZSddO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjbGVhbiBkdXBsaWNhdGVzIGluIGRldkRlcGVuZGVuY2llc1xuICAgIGlmIChway5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGZvciAoY29uc3QgZGVwIGluIHBrLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBpZiAoaGFzKHBrLmRldkRlcGVuZGVuY2llcywgZGVwKSAmJiBoYXMocGsuZGVwZW5kZW5jaWVzLCBkZXApKVxuICAgICAgICAgIGRlbGV0ZSBway5kZXZEZXBlbmRlbmNpZXNbZGVwXTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgbGFzdERlcHMgPSB0aGlzLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXM7XG4gICAgY29uc3QgbGFzdERldkRlcHMgPSB0aGlzLmdldENoYW5nZXMoKS5kZXZEZXBlbmRlbmNpZXM7XG4gICAgZm9yQ2hhbmdlcyhsYXN0RGVwcywgcGsuZGVwZW5kZW5jaWVzKTtcbiAgICBmb3JDaGFuZ2VzKGxhc3REZXZEZXBzLCBway5kZXZEZXBlbmRlbmNpZXMpO1xuXG4gICAgZnVuY3Rpb24gZm9yQ2hhbmdlcyhsYXN0RGVwOiB7W2s6IHN0cmluZ106IHN0cmluZ30sIG5ld0RlcDoge1trOiBzdHJpbmddOiBzdHJpbmd9KSB7XG4gICAgICBpZiAobmV3RGVwICE9IG51bGwpIHtcbiAgICAgICAgZm9yIChjb25zdCBkZXAgaW4gbmV3RGVwKSB7XG4gICAgICAgICAgaWYgKCFoYXMobmV3RGVwLCBkZXApKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgY29uc3QgdmVyID0gbmV3RGVwW2RlcF07XG4gICAgICAgICAgaWYgKGxhc3REZXBbZGVwXSAhPT0gdmVyKSB7XG4gICAgICAgICAgICBjaGFuZ2VMaXN0LnB1c2goW2RlcCwgdmVyXSk7IC8vIG5ldyBvciBjaGFuZ2VkIGRlcGVuZGVuY3lcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIGxhc3REZXBbZGVwXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgcmVzdExhc3REZXAgPSBPYmplY3Qua2V5cyhsYXN0RGVwKS5tYXA8W3N0cmluZywgc3RyaW5nXT4ocm93ID0+IHtcbiAgICAgICAgcmV0dXJuIFtyb3csIGxhc3REZXBbcm93XV07XG4gICAgICB9KTtcbiAgICAgIC8vIENvbXBsZXRlIGRlcGVuZGVuY2llcyA9IG5ldy9jaGFuZ2VkICsgcmVzdFxuICAgICAgY2hhbmdlTGlzdC5wdXNoKC4uLnJlc3RMYXN0RGVwKTtcbiAgICB9XG4gICAgLy8gcGsuZGVwZW5kZW5jaWVzID0gb3JpZ2luYWxEZXBzO1xuICAgIHRoaXMuY2hhbmdlcyA9IHBrO1xuICAgIHJldHVybiBjaGFuZ2VMaXN0O1xuICB9XG5cbiAgaXNNb2R1bGVzQ2hhbmdlZCgpIHtcbiAgICBpZiAodGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCAhPSBudWxsKVxuICAgICAgcmV0dXJuIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICBpZiAodGhpcy5pbnN0YWxsQ2hlY2tzdW0gPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBsYXN0Q291bnRGaWxlID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLmludGVncml0eS50eHQnKTtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKG1vZHVsZURpcikgfHwgIWZzLmV4aXN0c1N5bmMobGFzdENvdW50RmlsZSkpIHtcbiAgICAgICAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaGVja3N1bURhdGEgPSBmcy5yZWFkRmlsZVN5bmMobGFzdENvdW50RmlsZSwgJ3V0ZjgnKS5zcGxpdChFT0wpO1xuICAgICAgICB0aGlzLmluc3RhbGxDaGVja3N1bSA9IHBhcnNlSW50KGNoZWNrc3VtRGF0YVswXSwgMTApO1xuICAgICAgICB0aGlzLmxhc3RJbnN0YWxsZWQgPSBjaGVja3N1bURhdGEuc2xpY2UoMSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZyhsb2dOYW1lLCBlcnIpO1xuICAgICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgaW5zdGFsbGVkID0gdGhpcy5fY291bnRQYWNrYWdlcygpO1xuICAgIGNvbnN0IGN1cnJDaGVja3N1bSA9IGluc3RhbGxlZC5qb2luKEVPTCkubGVuZ3RoO1xuICAgIGlmIChjdXJyQ2hlY2tzdW0gIT09IHRoaXMuaW5zdGFsbENoZWNrc3VtKSB7XG4gICAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgYEluc3RhbGxhdGlvbiBpbnRlZ3JpdHkgY2hlY2tzdW0gaGFzIGNoYW5nZWQgZnJvbSAke3RoaXMuaW5zdGFsbENoZWNrc3VtfSB0byAke2N1cnJDaGVja3N1bX1gKTtcbiAgICAgIGNvbnN0IGluc3RhbGxlZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGluc3RhbGxlZCkge1xuICAgICAgICBpbnN0YWxsZWRTZXQuYWRkKG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubGFzdEluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5sYXN0SW5zdGFsbGVkKSB7XG4gICAgICAgICAgaWYgKCFpbnN0YWxsZWRTZXQuaGFzKG5hbWUpKVxuICAgICAgICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArICdNaXNzaW5nICcgKyBuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IGZhbHNlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFzeW5jIGluc3RhbGxBc3luYyhkb05vdE1hcmtJbnN0YWxsTnVtID0gZmFsc2UsIHVzZVlhcm4gPSBmYWxzZSwgb25seVByb2QgPSBmYWxzZSwgaXNPZmZsaW5lID0gZmFsc2UpIHtcbiAgICB0aGlzLm9mZmxpbmUgPSBpc09mZmxpbmU7XG4gICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRDaGFuZ2VzKCksIG51bGwsICcgICcpKTtcbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IHRydWU7XG4gICAgY29uc3QgZHJjcExvY2F0aW9uID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJyk7XG4gICAgY29uc3QgcmVhbERyY3BQYXRoID0gZnMucmVhbHBhdGhTeW5jKGRyY3BMb2NhdGlvbik7XG4gICAgLy8gdmFyIHlhcm5Bcmd2ID0gWydpbnN0YWxsJywgJy0tbm9uLWludGVyYWN0aXZlJywgJy0tY2hlY2stZmlsZXMnXTtcbiAgICBjb25zdCBucG1Bcmd2ID0gWydpbnN0YWxsJ107XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuaXNEcmNwU3ltbGluayAmJiBmcy5leGlzdHNTeW5jKGRyY3BMb2NhdGlvbikpIHtcbiAgICAgIGZzLnVubGlua1N5bmMoZHJjcExvY2F0aW9uKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVjcmVhdGVTeW1saW5rKCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpKSkge1xuICAgICAgICBmcy5zeW1saW5rU3luYyhQYXRoLnJlbGF0aXZlKCdub2RlX21vZHVsZXMnLCByZWFsRHJjcFBhdGgpLCBkcmNwTG9jYXRpb24sIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ1dyaXRlIHN5bWxpbmsgZHItY29tcC1wYWNrYWdlJyk7XG4gICAgICB9XG4gICAgICBpZiAoIWRvTm90TWFya0luc3RhbGxOdW0pXG4gICAgICAgIHNlbGYubWFya0luc3RhbGxOdW0oKTtcbiAgICB9XG4gICAgbGV0IHJlczogc3RyaW5nO1xuICAgIHRyeSB7XG4gICAgICByZXMgPSBhd2FpdCBwcm9jZXNzVXRpbHMuZXhlKFxuICAgICAgICB1c2VZYXJuID8gJ3lhcm4nIDogJ25wbScsIC4uLm5wbUFyZ3YsIHtjd2Q6IHRoaXMucm9vdFBhdGgsXG4gICAgICAgICAgZW52OiBPYmplY3QuYXNzaWduKHt9LCBwcm9jZXNzLmVudiwge05PREVfRU5WOiBvbmx5UHJvZCA/ICdwcm9kdWN0aW9uJzogJ2RldmVsb3BtZW50J30pfVxuICAgICAgICAgICkucHJvbWlzZTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTb3JyeSwgeWFybi9ucG0gaW5zdGFsbCBmYWlsZWQnKTtcbiAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdXNlWWFybikge1xuICAgICAgICBhd2FpdCBwcm9jZXNzVXRpbHMuZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogdGhpcy5yb290UGF0aH0pLnByb21pc2U7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZygnU29ycnksIG5wbSBkZWR1cGUgZmFpbGVkJyk7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzRHJjcFN5bWxpbmspIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiByZXNvbHZlKHJlcyksIDUwMCkpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVjcmVhdGVTeW1saW5rKCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVjcmVhdGVTeW1saW5rKCk7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiByZXM7XG4gIH1cblxuICBtYXJrSW5zdGFsbE51bSgpIHtcbiAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gbnVsbDtcbiAgICBjb25zdCBpbnN0YWxsZWQgPSB0aGlzLmxhc3RJbnN0YWxsZWQgPSB0aGlzLl9jb3VudFBhY2thZ2VzKCk7XG4gICAgdmFyIGRhdGEgPSBpbnN0YWxsZWQuam9pbihFT0wpO1xuICAgIHRoaXMuaW5zdGFsbENoZWNrc3VtID0gZGF0YS5sZW5ndGg7XG4gICAgZGF0YSA9IHRoaXMuaW5zdGFsbENoZWNrc3VtICsgRU9MICsgZGF0YTtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ051bWJlciBvZiBwYWNrYWdlczogJyArIGluc3RhbGxlZC5sZW5ndGgpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ2Rpc3QnKSkpXG4gICAgICBmcy5ta2RpclN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JykpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLmludGVncml0eS50eHQnKSwgZGF0YSwgJ3V0ZjgnKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBOb3QgaW5jbHVkaW5nIHN5bWxpbmsgY29tcG9uZW50c1xuXHQgKi9cbiAgX2NvdW50UGFja2FnZXMoKSB7XG4gICAgLy8gY29uc29sZS5sb2cobG9nTmFtZSArICdDb3VudGluZyBpbnN0YWxsZWQgbW9kdWxlcy4uLicpO1xuICAgIC8vIHZhciBjb3VudCA9IDA7XG4gICAgY29uc3QgcGFja2FnZU5hbWVzID0gW107XG4gICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICBmb3IgKGNvbnN0IGZuYW1lIG9mIGZzLnJlYWRkaXJTeW5jKG1vZHVsZURpcikpIHtcbiAgICAgIGlmIChmbmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgY29uc3Qgc2NvcGVEaXIgPSBQYXRoLnJlc29sdmUobW9kdWxlRGlyLCBmbmFtZSk7XG4gICAgICAgIGZvciAoY29uc3Qgc3ViZm5hbWUgb2YgZnMucmVhZGRpclN5bmMoc2NvcGVEaXIpKSB7XG4gICAgICAgICAgaWYgKHN1YmZuYW1lLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShzY29wZURpciwgc3ViZm5hbWUsICdwYWNrYWdlLmpzb24nKSkgJiZcbiAgICAgICAgICAgICFmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHNjb3BlRGlyLCBzdWJmbmFtZSkpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIC8vIGNvdW50Kys7XG4gICAgICAgICAgICBwYWNrYWdlTmFtZXMucHVzaChmbmFtZSArICcvJyArIHN1YmZuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmbmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKG1vZHVsZURpciwgZm5hbWUsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgcGFja2FnZU5hbWVzLnB1c2goZm5hbWUpO1xuICAgICAgICAvLyBjb3VudCsrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFja2FnZU5hbWVzO1xuICB9XG5cbiAgLyoqXG5cdCAqIE1hcmsgY2hhbmdlcyBhbmQgd3JpdGluZyBkci5wYWNrYWdlLmpzb24sIGFuZCByZXN0b3JlIHBhY2thZ2UuanNvbiBhbmQgY3JlYXRlIGRyLnlhcm4ubG9ja1xuXHQgKiBAcGFyYW0geyp9IGRlcGVuZGVuY2llc1xuXHQgKi9cbiAgYWZ0ZXJDaGFuZ2UoKSB7XG4gICAgaWYgKHRoaXMuY2hhbmdlcykge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QnKSlcbiAgICAgICAgZnMubWtkaXJTeW5jKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QnKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLnBhY2thZ2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh0aGlzLmNoYW5nZXMsIG51bGwsICcgICcpKTtcbiAgICB9XG4gICAgLy8gZnMucmVuYW1lU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLnBhY2thZ2UuanNvbicpKTtcbiAgICBmcy5yZW5hbWVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICBpZiAoIXRoaXMub2ZmbGluZSAmJiBmcy5leGlzdHNTeW5jKHRoaXMucm9vdFBhdGggKyAnL3lhcm4ubG9jaycpKSB7XG4gICAgICBmcy5jcmVhdGVSZWFkU3RyZWFtKHRoaXMucm9vdFBhdGggKyAnL3lhcm4ubG9jaycpXG4gICAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHRoaXMucm9vdFBhdGggKyAnL2RyLm9mZmxpbmUteWFybi5sb2NrJykpO1xuICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArICdXcml0ZSBkci5vZmZsaW5lLXlhcm4ubG9jaycpO1xuICAgIH1cbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuY2hhbmdlcyA9IG51bGw7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdTYXZlIHRvIGRpc3QvZHIucGFja2FnZS5qc29uLCByZXN0b3JlIHBhY2thZ2UuanNvbiBmcm9tIGRyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgfVxuXG4gIGFmdGVyQ2hhbmdlRmFpbCgpIHtcbiAgICBjb25zdCBwa2ZpbGUgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrZmlsZSkpXG4gICAgICBmcy5yZW5hbWVTeW5jKHBrZmlsZSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5mYWlsLnBhY2thZ2UuanNvbicpKTtcbiAgICBmcy5yZW5hbWVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuY2hhbmdlcyA9IG51bGw7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdSZXN0b3JlIHBhY2thZ2UuanNvbiBmcm9tIGRyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5zdGFuY2Uocm9vdFBhdGg6IHN0cmluZykge1xuICByb290UGF0aCA9IFBhdGgucmVzb2x2ZShyb290UGF0aCk7XG4gIHZhciBnID0gR3VhcmRlci5pbnN0YW5jZXNbcm9vdFBhdGhdO1xuICBpZiAoZylcbiAgICByZXR1cm4gZztcbiAgZyA9IG5ldyBHdWFyZGVyKHJvb3RQYXRoKTtcbiAgR3VhcmRlci5pbnN0YW5jZXNbcm9vdFBhdGhdID0gZztcbiAgcmV0dXJuIGc7XG59XG5cbmZ1bmN0aW9uIGNsb25lUGtKc29uKG9iajogUGFja2FnZUpzb24pOiBQYWNrYWdlSnNvbiB7XG4gIC8vIG1pbWljIGxvZGFzaCBkZWVwbHkgY2xvbmVcbiAgY29uc3QgY2xvbmVkID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqKTtcbiAgY2xvbmVkLmRlcGVuZGVuY2llcyA9IE9iamVjdC5hc3NpZ24oe30sIG9iai5kZXBlbmRlbmNpZXMpO1xuICBjbG9uZWQuZGV2RGVwZW5kZW5jaWVzID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqLmRldkRlcGVuZGVuY2llcyk7XG4gIHJldHVybiBjbG9uZWQ7XG59XG5cbmZ1bmN0aW9uIGhhcyhvYmo6IGFueSwgcHJvcDogc3RyaW5nKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==