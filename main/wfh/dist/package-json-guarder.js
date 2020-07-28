"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = void 0;
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
        this.isDrcpSymlink = fs.lstatSync(Path.resolve(rootPath, 'node_modules', 'dr-comp-package')).isSymbolicLink();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsOERBQWdEO0FBQ2hELDJCQUFpQztBQUNqQyxNQUFNLE9BQU8sR0FBRyxhQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRWpELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztBQU0vQjs7OztFQUlFO0FBQ0YsTUFBTSxPQUFPO0lBV1gsWUFBbUIsUUFBZ0I7UUFBaEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQVRuQyxZQUFPLEdBQXVCLElBQUksQ0FBQztRQUNuQyxvQkFBZSxHQUFrQixJQUFJLENBQUM7UUFDdEMsa0ZBQWtGO1FBQ2xGLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUUzQix5QkFBb0IsR0FBbUIsSUFBSSxDQUFDO1FBQzVDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFJZCxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNoSCxDQUFDO0lBRUQ7OztTQUdFO0lBQ0YsWUFBWSxDQUFDLGlCQUF1QjtRQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRywrQ0FBK0MsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RFLElBQUksaUJBQWlCLEVBQUU7WUFDckIsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFV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QyxRQUFnQjtJQUMxQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQVJELGtDQVFDO0FBRUQsU0FBUyxXQUFXLENBQUMsR0FBZ0I7SUFDbkMsNEJBQTRCO0lBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLEdBQUcsQ0FBQyxHQUFRLEVBQUUsSUFBWTtJQUNqQyxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDekQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBwcm9jZXNzVXRpbHMgZnJvbSAnLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7RU9MLCBwbGF0Zm9ybX0gZnJvbSAnb3MnO1xuY29uc3QgaXNXaW4zMiA9IHBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5jb25zdCBsb2dOYW1lID0gJ1tJbnN0YWxsZXJdICc7XG5cbmludGVyZmFjZSBQYWNrYWdlSnNvbiB7XG4gIGRlcGVuZGVuY2llczoge1trOiBzdHJpbmddOiBzdHJpbmd9O1xuICBkZXZEZXBlbmRlbmNpZXM6IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbn1cbi8qKlxuICogVGhpcyBjbGFzcyBoZWxwcyB0byBpbnN0YWxsIGRlcGVuZGVuY2llcyBmb3IgY29tbWFuZCBcImluaXRcIixcbiAqIGl0IGlzIGluIGNoYXJnZSBvZiBtYW5pcHVsYXRpbmcgPGRyY3Atd29ya3NwYWNlPi9kci5wYWNrYWdlLmpzb25cbiAqIGFuZCBydW4gXCJ5YXJuIGluc3RhbGxcIiwgdG8gcHJvdGVjdCB0aGUgb3JpZ2luYWwgcGFja2FnZS5qc29uIGZpbGVcbiovXG5jbGFzcyBHdWFyZGVyIHtcbiAgc3RhdGljIGluc3RhbmNlczoge1trOiBzdHJpbmddOiBHdWFyZGVyfSA9IHt9O1xuICBjaGFuZ2VzOiBQYWNrYWdlSnNvbiB8IG51bGwgPSBudWxsO1xuICBpbnN0YWxsQ2hlY2tzdW06IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAvKiogRFJDUCBpbml0IGlzIGluLXByb2dyZXNzLCBsb2NhbCBwYWNrYWdlLmpzb24gaXMgcmVwbGFjZWQgYnkgZHIucGFja2FnZS5qc29uICovXG4gIGlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICBpc0RyY3BTeW1saW5rOiBib29sZWFuO1xuICBpc05vZGVNb2R1bGVzQ2hhbmdlZDogYm9vbGVhbiB8IG51bGwgPSBudWxsO1xuICBvZmZsaW5lID0gZmFsc2U7XG4gIHByb3RlY3RlZCBsYXN0SW5zdGFsbGVkOiBzdHJpbmdbXTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcm9vdFBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuaXNEcmNwU3ltbGluayA9IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUocm9vdFBhdGgsICdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJykpLmlzU3ltYm9saWNMaW5rKCk7XG4gIH1cblxuICAvKipcblx0ICogQmFja3VwIHBhY2thZ2UuanNvblxuXHQgKiBAcGFyYW0geyp9IGJhY2t1cEZpbGVDb250ZW50XG5cdCAqL1xuICBiZWZvcmVDaGFuZ2UoYmFja3VwRmlsZUNvbnRlbnQ/OiBhbnkpIHtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ0JhY2t1cCBwYWNrYWdlLmpzb24gdG8gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IGJhY2t1cEZpbGUgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoYmFja3VwRmlsZUNvbnRlbnQpIHtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgYmFja3VwRmlsZUNvbnRlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGJ1Zik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG5cdCAqIEdldCBsYXN0IGNoYW5nZWQgcGFja2FnZS5qc29uIGpzb24gZnJvbSBkci5wYWNrYWdlLmpzb24gb3IgbWVtb3J5XG5cdCAqIEByZXR1cm5zIHtKU09OfSBhIGNsb25lZCBwYWNrYWdlLmpzb25cblx0ICovXG4gIGdldENoYW5nZXMoKSB7XG4gICAgaWYgKHRoaXMuY2hhbmdlcykge1xuICAgICAgcmV0dXJuIGNsb25lUGtKc29uKHRoaXMuY2hhbmdlcyk7XG4gICAgfVxuICAgIGNvbnN0IGxhc3RDaGFuZ2VkID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLnBhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGxhc3RDaGFuZ2VkKSkge1xuICAgICAgY29uc3QgY2hhbmdlZEpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsYXN0Q2hhbmdlZCwgJ3V0ZjgnKSk7XG4gICAgICB0aGlzLmNoYW5nZXMgPSBjaGFuZ2VkSnNvbjtcbiAgICAgIHJldHVybiBjbG9uZVBrSnNvbihjaGFuZ2VkSnNvbik7XG4gICAgfVxuICAgIHJldHVybiB7ZGVwZW5kZW5jaWVzOiB7fSwgZGV2RGVwZW5kZW5jaWVzOiB7fX07XG4gIH1cblxuICBnZXRKc29uRmlsZSgpIHtcbiAgICBpZiAodGhpcy5pc1BhY2thZ2VKc29uRGlydHkgfHwgIWZzLmV4aXN0c1N5bmModGhpcy5yb290UGF0aCArICcvZGlzdC9kci5wYWNrYWdlLmpzb24nKSlcbiAgICAgIHJldHVybiB0aGlzLnJvb3RQYXRoICsgJy9wYWNrYWdlLmpzb24nO1xuICAgIHJldHVybiBQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCArICcvZGlzdC9kci5wYWNrYWdlLmpzb24nKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBNYXJrIGNoYW5nZXMgd2l0aG91dCB3cml0aW5nIGRyLnBhY2thZ2UuanNvblxuXHQgKiByZXR1cm4gYSBjb21wbGV0ZSBsaXN0IG9mIHRoaXMgdGltZSBtYXJrZWQgZGVwZW5kZW5jaWVzIHRvZ2V0aGVyIHdpdGggbGFzdCB0aW1lIG1hcmtlZFxuXHQgKiBAcGFyYW0ge29iamVjdH0gcGsgcGFja2FnZS5qc29uXG5cdCAqIEByZXR1cm4gY2hhbmdlZCBsaXN0IFtzdHJpbmcsIHN0cmluZ11bXVxuXHQgKi9cbiAgbWFya0NoYW5nZXMocGs6IFBhY2thZ2VKc29uKSB7XG4gICAgY29uc3QgY2hhbmdlTGlzdDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcbiAgICBpZiAodGhpcy5pc0RyY3BTeW1saW5rKSB7XG4gICAgICBpZiAocGsuZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGRlbGV0ZSBway5kZXBlbmRlbmNpZXNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgfVxuICAgICAgaWYgKHBrLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBkZWxldGUgcGsuZGV2RGVwZW5kZW5jaWVzWydkci1jb21wLXBhY2thZ2UnXTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gY2xlYW4gZHVwbGljYXRlcyBpbiBkZXZEZXBlbmRlbmNpZXNcbiAgICBpZiAocGsuZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcCBpbiBway5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgaWYgKGhhcyhway5kZXZEZXBlbmRlbmNpZXMsIGRlcCkgJiYgaGFzKHBrLmRlcGVuZGVuY2llcywgZGVwKSlcbiAgICAgICAgICBkZWxldGUgcGsuZGV2RGVwZW5kZW5jaWVzW2RlcF07XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGxhc3REZXBzID0gdGhpcy5nZXRDaGFuZ2VzKCkuZGVwZW5kZW5jaWVzO1xuICAgIGNvbnN0IGxhc3REZXZEZXBzID0gdGhpcy5nZXRDaGFuZ2VzKCkuZGV2RGVwZW5kZW5jaWVzO1xuICAgIGZvckNoYW5nZXMobGFzdERlcHMsIHBrLmRlcGVuZGVuY2llcyk7XG4gICAgZm9yQ2hhbmdlcyhsYXN0RGV2RGVwcywgcGsuZGV2RGVwZW5kZW5jaWVzKTtcblxuICAgIGZ1bmN0aW9uIGZvckNoYW5nZXMobGFzdERlcDoge1trOiBzdHJpbmddOiBzdHJpbmd9LCBuZXdEZXA6IHtbazogc3RyaW5nXTogc3RyaW5nfSkge1xuICAgICAgaWYgKG5ld0RlcCAhPSBudWxsKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwIGluIG5ld0RlcCkge1xuICAgICAgICAgIGlmICghaGFzKG5ld0RlcCwgZGVwKSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IHZlciA9IG5ld0RlcFtkZXBdO1xuICAgICAgICAgIGlmIChsYXN0RGVwW2RlcF0gIT09IHZlcikge1xuICAgICAgICAgICAgY2hhbmdlTGlzdC5wdXNoKFtkZXAsIHZlcl0pOyAvLyBuZXcgb3IgY2hhbmdlZCBkZXBlbmRlbmN5XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBsYXN0RGVwW2RlcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc3RMYXN0RGVwID0gT2JqZWN0LmtleXMobGFzdERlcCkubWFwPFtzdHJpbmcsIHN0cmluZ10+KHJvdyA9PiB7XG4gICAgICAgIHJldHVybiBbcm93LCBsYXN0RGVwW3Jvd11dO1xuICAgICAgfSk7XG4gICAgICAvLyBDb21wbGV0ZSBkZXBlbmRlbmNpZXMgPSBuZXcvY2hhbmdlZCArIHJlc3RcbiAgICAgIGNoYW5nZUxpc3QucHVzaCguLi5yZXN0TGFzdERlcCk7XG4gICAgfVxuICAgIC8vIHBrLmRlcGVuZGVuY2llcyA9IG9yaWdpbmFsRGVwcztcbiAgICB0aGlzLmNoYW5nZXMgPSBwaztcbiAgICByZXR1cm4gY2hhbmdlTGlzdDtcbiAgfVxuXG4gIGlzTW9kdWxlc0NoYW5nZWQoKSB7XG4gICAgaWYgKHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgIT0gbnVsbClcbiAgICAgIHJldHVybiB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgaWYgKHRoaXMuaW5zdGFsbENoZWNrc3VtID09IG51bGwpIHtcbiAgICAgICAgY29uc3QgbGFzdENvdW50RmlsZSA9IFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZGlzdCcsICdkci5pbnRlZ3JpdHkudHh0Jyk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhtb2R1bGVEaXIpIHx8ICFmcy5leGlzdHNTeW5jKGxhc3RDb3VudEZpbGUpKSB7XG4gICAgICAgICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hlY2tzdW1EYXRhID0gZnMucmVhZEZpbGVTeW5jKGxhc3RDb3VudEZpbGUsICd1dGY4Jykuc3BsaXQoRU9MKTtcbiAgICAgICAgdGhpcy5pbnN0YWxsQ2hlY2tzdW0gPSBwYXJzZUludChjaGVja3N1bURhdGFbMF0sIDEwKTtcbiAgICAgICAgdGhpcy5sYXN0SW5zdGFsbGVkID0gY2hlY2tzdW1EYXRhLnNsaWNlKDEpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5sb2cobG9nTmFtZSwgZXJyKTtcbiAgICAgIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IGluc3RhbGxlZCA9IHRoaXMuX2NvdW50UGFja2FnZXMoKTtcbiAgICBjb25zdCBjdXJyQ2hlY2tzdW0gPSBpbnN0YWxsZWQuam9pbihFT0wpLmxlbmd0aDtcbiAgICBpZiAoY3VyckNoZWNrc3VtICE9PSB0aGlzLmluc3RhbGxDaGVja3N1bSkge1xuICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArIGBJbnN0YWxsYXRpb24gaW50ZWdyaXR5IGNoZWNrc3VtIGhhcyBjaGFuZ2VkIGZyb20gJHt0aGlzLmluc3RhbGxDaGVja3N1bX0gdG8gJHtjdXJyQ2hlY2tzdW19YCk7XG4gICAgICBjb25zdCBpbnN0YWxsZWRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBpbnN0YWxsZWQpIHtcbiAgICAgICAgaW5zdGFsbGVkU2V0LmFkZChuYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmxhc3RJbnN0YWxsZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMubGFzdEluc3RhbGxlZCkge1xuICAgICAgICAgIGlmICghaW5zdGFsbGVkU2V0LmhhcyhuYW1lKSlcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnTWlzc2luZyAnICsgbmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhc3luYyBpbnN0YWxsQXN5bmMoZG9Ob3RNYXJrSW5zdGFsbE51bSA9IGZhbHNlLCB1c2VZYXJuID0gZmFsc2UsIG9ubHlQcm9kID0gZmFsc2UsIGlzT2ZmbGluZSA9IGZhbHNlKSB7XG4gICAgdGhpcy5vZmZsaW5lID0gaXNPZmZsaW5lO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSxcbiAgICAgIEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0Q2hhbmdlcygpLCBudWxsLCAnICAnKSk7XG4gICAgdGhpcy5pc1BhY2thZ2VKc29uRGlydHkgPSB0cnVlO1xuICAgIGNvbnN0IGRyY3BMb2NhdGlvbiA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpO1xuICAgIGNvbnN0IHJlYWxEcmNwUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhkcmNwTG9jYXRpb24pO1xuICAgIC8vIHZhciB5YXJuQXJndiA9IFsnaW5zdGFsbCcsICctLW5vbi1pbnRlcmFjdGl2ZScsICctLWNoZWNrLWZpbGVzJ107XG4gICAgY29uc3QgbnBtQXJndiA9IFsnaW5zdGFsbCddO1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLmlzRHJjcFN5bWxpbmsgJiYgZnMuZXhpc3RzU3luYyhkcmNwTG9jYXRpb24pKSB7XG4gICAgICBmcy51bmxpbmtTeW5jKGRyY3BMb2NhdGlvbik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlY3JlYXRlU3ltbGluaygpIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKSkpIHtcbiAgICAgICAgZnMuc3ltbGlua1N5bmMoUGF0aC5yZWxhdGl2ZSgnbm9kZV9tb2R1bGVzJywgcmVhbERyY3BQYXRoKSwgZHJjcExvY2F0aW9uLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArICdXcml0ZSBzeW1saW5rIGRyLWNvbXAtcGFja2FnZScpO1xuICAgICAgfVxuICAgICAgaWYgKCFkb05vdE1hcmtJbnN0YWxsTnVtKVxuICAgICAgICBzZWxmLm1hcmtJbnN0YWxsTnVtKCk7XG4gICAgfVxuICAgIGxldCByZXM6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgcmVzID0gYXdhaXQgcHJvY2Vzc1V0aWxzLmV4ZShcbiAgICAgICAgdXNlWWFybiA/ICd5YXJuJyA6ICducG0nLCAuLi5ucG1Bcmd2LCB7Y3dkOiB0aGlzLnJvb3RQYXRoLFxuICAgICAgICAgIGVudjogT2JqZWN0LmFzc2lnbih7fSwgcHJvY2Vzcy5lbnYsIHtOT0RFX0VOVjogb25seVByb2QgPyAncHJvZHVjdGlvbic6ICdkZXZlbG9wbWVudCd9KX1cbiAgICAgICAgICApLnByb21pc2U7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZygnU29ycnksIHlhcm4vbnBtIGluc3RhbGwgZmFpbGVkJyk7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXVzZVlhcm4pIHtcbiAgICAgICAgYXdhaXQgcHJvY2Vzc1V0aWxzLmV4ZSgnbnBtJywgJ2RlZHVwZScsIHtjd2Q6IHRoaXMucm9vdFBhdGh9KS5wcm9taXNlO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5sb2coJ1NvcnJ5LCBucG0gZGVkdXBlIGZhaWxlZCcpO1xuICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0RyY3BTeW1saW5rKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZShyZXMpLCA1MDApKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlY3JlYXRlU3ltbGluaygpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlY3JlYXRlU3ltbGluaygpO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgbWFya0luc3RhbGxOdW0oKSB7XG4gICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IG51bGw7XG4gICAgY29uc3QgaW5zdGFsbGVkID0gdGhpcy5sYXN0SW5zdGFsbGVkID0gdGhpcy5fY291bnRQYWNrYWdlcygpO1xuICAgIHZhciBkYXRhID0gaW5zdGFsbGVkLmpvaW4oRU9MKTtcbiAgICB0aGlzLmluc3RhbGxDaGVja3N1bSA9IGRhdGEubGVuZ3RoO1xuICAgIGRhdGEgPSB0aGlzLmluc3RhbGxDaGVja3N1bSArIEVPTCArIGRhdGE7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdOdW1iZXIgb2YgcGFja2FnZXM6ICcgKyBpbnN0YWxsZWQubGVuZ3RoKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JykpKVxuICAgICAgZnMubWtkaXJTeW5jKFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnZGlzdCcpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnZGlzdCcsICdkci5pbnRlZ3JpdHkudHh0JyksIGRhdGEsICd1dGY4Jyk7XG4gIH1cblxuICAvKipcblx0ICogTm90IGluY2x1ZGluZyBzeW1saW5rIGNvbXBvbmVudHNcblx0ICovXG4gIF9jb3VudFBhY2thZ2VzKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnQ291bnRpbmcgaW5zdGFsbGVkIG1vZHVsZXMuLi4nKTtcbiAgICAvLyB2YXIgY291bnQgPSAwO1xuICAgIGNvbnN0IHBhY2thZ2VOYW1lcyA9IFtdO1xuICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgZm9yIChjb25zdCBmbmFtZSBvZiBmcy5yZWFkZGlyU3luYyhtb2R1bGVEaXIpKSB7XG4gICAgICBpZiAoZm5hbWUuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAgIGNvbnN0IHNjb3BlRGlyID0gUGF0aC5yZXNvbHZlKG1vZHVsZURpciwgZm5hbWUpO1xuICAgICAgICBmb3IgKGNvbnN0IHN1YmZuYW1lIG9mIGZzLnJlYWRkaXJTeW5jKHNjb3BlRGlyKSkge1xuICAgICAgICAgIGlmIChzdWJmbmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoc2NvcGVEaXIsIHN1YmZuYW1lLCAncGFja2FnZS5qc29uJykpICYmXG4gICAgICAgICAgICAhZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZShzY29wZURpciwgc3ViZm5hbWUpKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAvLyBjb3VudCsrO1xuICAgICAgICAgICAgcGFja2FnZU5hbWVzLnB1c2goZm5hbWUgKyAnLycgKyBzdWJmbmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm5hbWUuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShtb2R1bGVEaXIsIGZuYW1lLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgIHBhY2thZ2VOYW1lcy5wdXNoKGZuYW1lKTtcbiAgICAgICAgLy8gY291bnQrKztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhY2thZ2VOYW1lcztcbiAgfVxuXG4gIC8qKlxuXHQgKiBNYXJrIGNoYW5nZXMgYW5kIHdyaXRpbmcgZHIucGFja2FnZS5qc29uLCBhbmQgcmVzdG9yZSBwYWNrYWdlLmpzb24gYW5kIGNyZWF0ZSBkci55YXJuLmxvY2tcblx0ICogQHBhcmFtIHsqfSBkZXBlbmRlbmNpZXNcblx0ICovXG4gIGFmdGVyQ2hhbmdlKCkge1xuICAgIGlmICh0aGlzLmNoYW5nZXMpIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyh0aGlzLnJvb3RQYXRoICsgJy9kaXN0JykpXG4gICAgICAgIGZzLm1rZGlyU3luYyh0aGlzLnJvb3RQYXRoICsgJy9kaXN0Jyk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZGlzdCcsICdkci5wYWNrYWdlLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkodGhpcy5jaGFuZ2VzLCBudWxsLCAnICAnKSk7XG4gICAgfVxuICAgIC8vIGZzLnJlbmFtZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5wYWNrYWdlLmpzb24nKSk7XG4gICAgZnMucmVuYW1lU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgaWYgKCF0aGlzLm9mZmxpbmUgJiYgZnMuZXhpc3RzU3luYyh0aGlzLnJvb3RQYXRoICsgJy95YXJuLmxvY2snKSkge1xuICAgICAgZnMuY3JlYXRlUmVhZFN0cmVhbSh0aGlzLnJvb3RQYXRoICsgJy95YXJuLmxvY2snKVxuICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbSh0aGlzLnJvb3RQYXRoICsgJy9kci5vZmZsaW5lLXlhcm4ubG9jaycpKTtcbiAgICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnV3JpdGUgZHIub2ZmbGluZS15YXJuLmxvY2snKTtcbiAgICB9XG4gICAgdGhpcy5pc1BhY2thZ2VKc29uRGlydHkgPSBmYWxzZTtcbiAgICB0aGlzLmNoYW5nZXMgPSBudWxsO1xuICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnU2F2ZSB0byBkaXN0L2RyLnBhY2thZ2UuanNvbiwgcmVzdG9yZSBwYWNrYWdlLmpzb24gZnJvbSBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG4gIH1cblxuICBhZnRlckNoYW5nZUZhaWwoKSB7XG4gICAgY29uc3QgcGtmaWxlID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwa2ZpbGUpKVxuICAgICAgZnMucmVuYW1lU3luYyhwa2ZpbGUsIFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuZmFpbC5wYWNrYWdlLmpzb24nKSk7XG4gICAgZnMucmVuYW1lU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgdGhpcy5pc1BhY2thZ2VKc29uRGlydHkgPSBmYWxzZTtcbiAgICB0aGlzLmNoYW5nZXMgPSBudWxsO1xuICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnUmVzdG9yZSBwYWNrYWdlLmpzb24gZnJvbSBkci5iYWNrdXAucGFja2FnZS5qc29uJyk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEluc3RhbmNlKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgcm9vdFBhdGggPSBQYXRoLnJlc29sdmUocm9vdFBhdGgpO1xuICB2YXIgZyA9IEd1YXJkZXIuaW5zdGFuY2VzW3Jvb3RQYXRoXTtcbiAgaWYgKGcpXG4gICAgcmV0dXJuIGc7XG4gIGcgPSBuZXcgR3VhcmRlcihyb290UGF0aCk7XG4gIEd1YXJkZXIuaW5zdGFuY2VzW3Jvb3RQYXRoXSA9IGc7XG4gIHJldHVybiBnO1xufVxuXG5mdW5jdGlvbiBjbG9uZVBrSnNvbihvYmo6IFBhY2thZ2VKc29uKTogUGFja2FnZUpzb24ge1xuICAvLyBtaW1pYyBsb2Rhc2ggZGVlcGx5IGNsb25lXG4gIGNvbnN0IGNsb25lZCA9IE9iamVjdC5hc3NpZ24oe30sIG9iaik7XG4gIGNsb25lZC5kZXBlbmRlbmNpZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvYmouZGVwZW5kZW5jaWVzKTtcbiAgY2xvbmVkLmRldkRlcGVuZGVuY2llcyA9IE9iamVjdC5hc3NpZ24oe30sIG9iai5kZXZEZXBlbmRlbmNpZXMpO1xuICByZXR1cm4gY2xvbmVkO1xufVxuXG5mdW5jdGlvbiBoYXMob2JqOiBhbnksIHByb3A6IHN0cmluZykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iXX0=