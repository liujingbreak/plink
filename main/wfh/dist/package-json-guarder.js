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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
        this.isDrcpSymlink = fs.lstatSync(Path.resolve(rootPath, 'node_modules', '@wfh/plink')).isSymbolicLink();
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
                delete pk.dependencies['@wfh/plink'];
            }
            if (pk.devDependencies) {
                delete pk.devDependencies['@wfh/plink'];
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
            const drcpLocation = Path.resolve('node_modules', '@wfh/plink');
            const realDrcpPath = fs.realpathSync(drcpLocation);
            // var yarnArgv = ['install', '--non-interactive', '--check-files'];
            const npmArgv = ['install'];
            const self = this;
            if (this.isDrcpSymlink && fs.existsSync(drcpLocation)) {
                fs.unlinkSync(drcpLocation);
            }
            function recreateSymlink() {
                if (!fs.existsSync(Path.resolve('node_modules', '@wfh/plink'))) {
                    fs.symlinkSync(Path.relative('node_modules', realDrcpPath), drcpLocation, isWin32 ? 'junction' : 'dir');
                    console.log(logName + 'Write symlink @wfh/plink');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsOERBQWdEO0FBQ2hELDJCQUFpQztBQUNqQyxNQUFNLE9BQU8sR0FBRyxhQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRWpELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQztBQU0vQjs7OztFQUlFO0FBQ0YsTUFBTSxPQUFPO0lBV1gsWUFBbUIsUUFBZ0I7UUFBaEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQVRuQyxZQUFPLEdBQXVCLElBQUksQ0FBQztRQUNuQyxvQkFBZSxHQUFrQixJQUFJLENBQUM7UUFDdEMsa0ZBQWtGO1FBQ2xGLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUUzQix5QkFBb0IsR0FBbUIsSUFBSSxDQUFDO1FBQzVDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFJZCxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDM0csQ0FBQztJQUVEOzs7U0FHRTtJQUNGLFlBQVksQ0FBQyxpQkFBdUI7UUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsK0NBQStDLENBQUMsQ0FBQztRQUN2RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUN0RSxJQUFJLGlCQUFpQixFQUFFO1lBQ3JCLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBVSxF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QzFDLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEMsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDMUIsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEMsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBUkQsa0NBUUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxHQUFnQjtJQUNuQyw0QkFBNEI7SUFDNUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdEMsTUFBTSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDMUQsTUFBTSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDaEUsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsR0FBRyxDQUFDLEdBQVEsRUFBRSxJQUFZO0lBQ2pDLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN6RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHByb2Nlc3NVdGlscyBmcm9tICcuL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtFT0wsIHBsYXRmb3JtfSBmcm9tICdvcyc7XG5jb25zdCBpc1dpbjMyID0gcGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5cbmNvbnN0IGxvZ05hbWUgPSAnW0luc3RhbGxlcl0gJztcblxuaW50ZXJmYWNlIFBhY2thZ2VKc29uIHtcbiAgZGVwZW5kZW5jaWVzOiB7W2s6IHN0cmluZ106IHN0cmluZ307XG4gIGRldkRlcGVuZGVuY2llczoge1trOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuLyoqXG4gKiBUaGlzIGNsYXNzIGhlbHBzIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzIGZvciBjb21tYW5kIFwiaW5pdFwiLFxuICogaXQgaXMgaW4gY2hhcmdlIG9mIG1hbmlwdWxhdGluZyA8ZHJjcC13b3Jrc3BhY2U+L2RyLnBhY2thZ2UuanNvblxuICogYW5kIHJ1biBcInlhcm4gaW5zdGFsbFwiLCB0byBwcm90ZWN0IHRoZSBvcmlnaW5hbCBwYWNrYWdlLmpzb24gZmlsZVxuKi9cbmNsYXNzIEd1YXJkZXIge1xuICBzdGF0aWMgaW5zdGFuY2VzOiB7W2s6IHN0cmluZ106IEd1YXJkZXJ9ID0ge307XG4gIGNoYW5nZXM6IFBhY2thZ2VKc29uIHwgbnVsbCA9IG51bGw7XG4gIGluc3RhbGxDaGVja3N1bTogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIC8qKiBEUkNQIGluaXQgaXMgaW4tcHJvZ3Jlc3MsIGxvY2FsIHBhY2thZ2UuanNvbiBpcyByZXBsYWNlZCBieSBkci5wYWNrYWdlLmpzb24gKi9cbiAgaXNQYWNrYWdlSnNvbkRpcnR5ID0gZmFsc2U7XG4gIGlzRHJjcFN5bWxpbms6IGJvb2xlYW47XG4gIGlzTm9kZU1vZHVsZXNDaGFuZ2VkOiBib29sZWFuIHwgbnVsbCA9IG51bGw7XG4gIG9mZmxpbmUgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIGxhc3RJbnN0YWxsZWQ6IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb290UGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5pc0RyY3BTeW1saW5rID0gZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZShyb290UGF0aCwgJ25vZGVfbW9kdWxlcycsICdAd2ZoL3BsaW5rJykpLmlzU3ltYm9saWNMaW5rKCk7XG4gIH1cblxuICAvKipcblx0ICogQmFja3VwIHBhY2thZ2UuanNvblxuXHQgKiBAcGFyYW0geyp9IGJhY2t1cEZpbGVDb250ZW50XG5cdCAqL1xuICBiZWZvcmVDaGFuZ2UoYmFja3VwRmlsZUNvbnRlbnQ/OiBhbnkpIHtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ0JhY2t1cCBwYWNrYWdlLmpzb24gdG8gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IGJhY2t1cEZpbGUgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoYmFja3VwRmlsZUNvbnRlbnQpIHtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgYmFja3VwRmlsZUNvbnRlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGJ1Zik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG5cdCAqIEdldCBsYXN0IGNoYW5nZWQgcGFja2FnZS5qc29uIGpzb24gZnJvbSBkci5wYWNrYWdlLmpzb24gb3IgbWVtb3J5XG5cdCAqIEByZXR1cm5zIHtKU09OfSBhIGNsb25lZCBwYWNrYWdlLmpzb25cblx0ICovXG4gIGdldENoYW5nZXMoKSB7XG4gICAgaWYgKHRoaXMuY2hhbmdlcykge1xuICAgICAgcmV0dXJuIGNsb25lUGtKc29uKHRoaXMuY2hhbmdlcyk7XG4gICAgfVxuICAgIGNvbnN0IGxhc3RDaGFuZ2VkID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLnBhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGxhc3RDaGFuZ2VkKSkge1xuICAgICAgY29uc3QgY2hhbmdlZEpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsYXN0Q2hhbmdlZCwgJ3V0ZjgnKSk7XG4gICAgICB0aGlzLmNoYW5nZXMgPSBjaGFuZ2VkSnNvbjtcbiAgICAgIHJldHVybiBjbG9uZVBrSnNvbihjaGFuZ2VkSnNvbik7XG4gICAgfVxuICAgIHJldHVybiB7ZGVwZW5kZW5jaWVzOiB7fSwgZGV2RGVwZW5kZW5jaWVzOiB7fX07XG4gIH1cblxuICBnZXRKc29uRmlsZSgpIHtcbiAgICBpZiAodGhpcy5pc1BhY2thZ2VKc29uRGlydHkgfHwgIWZzLmV4aXN0c1N5bmModGhpcy5yb290UGF0aCArICcvZGlzdC9kci5wYWNrYWdlLmpzb24nKSlcbiAgICAgIHJldHVybiB0aGlzLnJvb3RQYXRoICsgJy9wYWNrYWdlLmpzb24nO1xuICAgIHJldHVybiBQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCArICcvZGlzdC9kci5wYWNrYWdlLmpzb24nKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBNYXJrIGNoYW5nZXMgd2l0aG91dCB3cml0aW5nIGRyLnBhY2thZ2UuanNvblxuXHQgKiByZXR1cm4gYSBjb21wbGV0ZSBsaXN0IG9mIHRoaXMgdGltZSBtYXJrZWQgZGVwZW5kZW5jaWVzIHRvZ2V0aGVyIHdpdGggbGFzdCB0aW1lIG1hcmtlZFxuXHQgKiBAcGFyYW0ge29iamVjdH0gcGsgcGFja2FnZS5qc29uXG5cdCAqIEByZXR1cm4gY2hhbmdlZCBsaXN0IFtzdHJpbmcsIHN0cmluZ11bXVxuXHQgKi9cbiAgbWFya0NoYW5nZXMocGs6IFBhY2thZ2VKc29uKSB7XG4gICAgY29uc3QgY2hhbmdlTGlzdDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcbiAgICBpZiAodGhpcy5pc0RyY3BTeW1saW5rKSB7XG4gICAgICBpZiAocGsuZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGRlbGV0ZSBway5kZXBlbmRlbmNpZXNbJ0B3ZmgvcGxpbmsnXTtcbiAgICAgIH1cbiAgICAgIGlmIChway5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgZGVsZXRlIHBrLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjbGVhbiBkdXBsaWNhdGVzIGluIGRldkRlcGVuZGVuY2llc1xuICAgIGlmIChway5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGZvciAoY29uc3QgZGVwIGluIHBrLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBpZiAoaGFzKHBrLmRldkRlcGVuZGVuY2llcywgZGVwKSAmJiBoYXMocGsuZGVwZW5kZW5jaWVzLCBkZXApKVxuICAgICAgICAgIGRlbGV0ZSBway5kZXZEZXBlbmRlbmNpZXNbZGVwXTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgbGFzdERlcHMgPSB0aGlzLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXM7XG4gICAgY29uc3QgbGFzdERldkRlcHMgPSB0aGlzLmdldENoYW5nZXMoKS5kZXZEZXBlbmRlbmNpZXM7XG4gICAgZm9yQ2hhbmdlcyhsYXN0RGVwcywgcGsuZGVwZW5kZW5jaWVzKTtcbiAgICBmb3JDaGFuZ2VzKGxhc3REZXZEZXBzLCBway5kZXZEZXBlbmRlbmNpZXMpO1xuXG4gICAgZnVuY3Rpb24gZm9yQ2hhbmdlcyhsYXN0RGVwOiB7W2s6IHN0cmluZ106IHN0cmluZ30sIG5ld0RlcDoge1trOiBzdHJpbmddOiBzdHJpbmd9KSB7XG4gICAgICBpZiAobmV3RGVwICE9IG51bGwpIHtcbiAgICAgICAgZm9yIChjb25zdCBkZXAgaW4gbmV3RGVwKSB7XG4gICAgICAgICAgaWYgKCFoYXMobmV3RGVwLCBkZXApKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgY29uc3QgdmVyID0gbmV3RGVwW2RlcF07XG4gICAgICAgICAgaWYgKGxhc3REZXBbZGVwXSAhPT0gdmVyKSB7XG4gICAgICAgICAgICBjaGFuZ2VMaXN0LnB1c2goW2RlcCwgdmVyXSk7IC8vIG5ldyBvciBjaGFuZ2VkIGRlcGVuZGVuY3lcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIGxhc3REZXBbZGVwXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgcmVzdExhc3REZXAgPSBPYmplY3Qua2V5cyhsYXN0RGVwKS5tYXA8W3N0cmluZywgc3RyaW5nXT4ocm93ID0+IHtcbiAgICAgICAgcmV0dXJuIFtyb3csIGxhc3REZXBbcm93XV07XG4gICAgICB9KTtcbiAgICAgIC8vIENvbXBsZXRlIGRlcGVuZGVuY2llcyA9IG5ldy9jaGFuZ2VkICsgcmVzdFxuICAgICAgY2hhbmdlTGlzdC5wdXNoKC4uLnJlc3RMYXN0RGVwKTtcbiAgICB9XG4gICAgLy8gcGsuZGVwZW5kZW5jaWVzID0gb3JpZ2luYWxEZXBzO1xuICAgIHRoaXMuY2hhbmdlcyA9IHBrO1xuICAgIHJldHVybiBjaGFuZ2VMaXN0O1xuICB9XG5cbiAgaXNNb2R1bGVzQ2hhbmdlZCgpIHtcbiAgICBpZiAodGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCAhPSBudWxsKVxuICAgICAgcmV0dXJuIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZHVsZURpciA9IFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICBpZiAodGhpcy5pbnN0YWxsQ2hlY2tzdW0gPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBsYXN0Q291bnRGaWxlID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLmludGVncml0eS50eHQnKTtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKG1vZHVsZURpcikgfHwgIWZzLmV4aXN0c1N5bmMobGFzdENvdW50RmlsZSkpIHtcbiAgICAgICAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaGVja3N1bURhdGEgPSBmcy5yZWFkRmlsZVN5bmMobGFzdENvdW50RmlsZSwgJ3V0ZjgnKS5zcGxpdChFT0wpO1xuICAgICAgICB0aGlzLmluc3RhbGxDaGVja3N1bSA9IHBhcnNlSW50KGNoZWNrc3VtRGF0YVswXSwgMTApO1xuICAgICAgICB0aGlzLmxhc3RJbnN0YWxsZWQgPSBjaGVja3N1bURhdGEuc2xpY2UoMSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZyhsb2dOYW1lLCBlcnIpO1xuICAgICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgaW5zdGFsbGVkID0gdGhpcy5fY291bnRQYWNrYWdlcygpO1xuICAgIGNvbnN0IGN1cnJDaGVja3N1bSA9IGluc3RhbGxlZC5qb2luKEVPTCkubGVuZ3RoO1xuICAgIGlmIChjdXJyQ2hlY2tzdW0gIT09IHRoaXMuaW5zdGFsbENoZWNrc3VtKSB7XG4gICAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgYEluc3RhbGxhdGlvbiBpbnRlZ3JpdHkgY2hlY2tzdW0gaGFzIGNoYW5nZWQgZnJvbSAke3RoaXMuaW5zdGFsbENoZWNrc3VtfSB0byAke2N1cnJDaGVja3N1bX1gKTtcbiAgICAgIGNvbnN0IGluc3RhbGxlZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGluc3RhbGxlZCkge1xuICAgICAgICBpbnN0YWxsZWRTZXQuYWRkKG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubGFzdEluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5sYXN0SW5zdGFsbGVkKSB7XG4gICAgICAgICAgaWYgKCFpbnN0YWxsZWRTZXQuaGFzKG5hbWUpKVxuICAgICAgICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArICdNaXNzaW5nICcgKyBuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IHRydWU7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZCA9IGZhbHNlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFzeW5jIGluc3RhbGxBc3luYyhkb05vdE1hcmtJbnN0YWxsTnVtID0gZmFsc2UsIHVzZVlhcm4gPSBmYWxzZSwgb25seVByb2QgPSBmYWxzZSwgaXNPZmZsaW5lID0gZmFsc2UpIHtcbiAgICB0aGlzLm9mZmxpbmUgPSBpc09mZmxpbmU7XG4gICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpLFxuICAgICAgSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRDaGFuZ2VzKCksIG51bGwsICcgICcpKTtcbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IHRydWU7XG4gICAgY29uc3QgZHJjcExvY2F0aW9uID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnQHdmaC9wbGluaycpO1xuICAgIGNvbnN0IHJlYWxEcmNwUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhkcmNwTG9jYXRpb24pO1xuICAgIC8vIHZhciB5YXJuQXJndiA9IFsnaW5zdGFsbCcsICctLW5vbi1pbnRlcmFjdGl2ZScsICctLWNoZWNrLWZpbGVzJ107XG4gICAgY29uc3QgbnBtQXJndiA9IFsnaW5zdGFsbCddO1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLmlzRHJjcFN5bWxpbmsgJiYgZnMuZXhpc3RzU3luYyhkcmNwTG9jYXRpb24pKSB7XG4gICAgICBmcy51bmxpbmtTeW5jKGRyY3BMb2NhdGlvbik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlY3JlYXRlU3ltbGluaygpIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdAd2ZoL3BsaW5rJykpKSB7XG4gICAgICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoJ25vZGVfbW9kdWxlcycsIHJlYWxEcmNwUGF0aCksIGRyY3BMb2NhdGlvbiwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnV3JpdGUgc3ltbGluayBAd2ZoL3BsaW5rJyk7XG4gICAgICB9XG4gICAgICBpZiAoIWRvTm90TWFya0luc3RhbGxOdW0pXG4gICAgICAgIHNlbGYubWFya0luc3RhbGxOdW0oKTtcbiAgICB9XG4gICAgbGV0IHJlczogc3RyaW5nO1xuICAgIHRyeSB7XG4gICAgICByZXMgPSBhd2FpdCBwcm9jZXNzVXRpbHMuZXhlKFxuICAgICAgICB1c2VZYXJuID8gJ3lhcm4nIDogJ25wbScsIC4uLm5wbUFyZ3YsIHtjd2Q6IHRoaXMucm9vdFBhdGgsXG4gICAgICAgICAgZW52OiBPYmplY3QuYXNzaWduKHt9LCBwcm9jZXNzLmVudiwge05PREVfRU5WOiBvbmx5UHJvZCA/ICdwcm9kdWN0aW9uJzogJ2RldmVsb3BtZW50J30pfVxuICAgICAgICAgICkucHJvbWlzZTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdTb3JyeSwgeWFybi9ucG0gaW5zdGFsbCBmYWlsZWQnKTtcbiAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdXNlWWFybikge1xuICAgICAgICBhd2FpdCBwcm9jZXNzVXRpbHMuZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogdGhpcy5yb290UGF0aH0pLnByb21pc2U7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZygnU29ycnksIG5wbSBkZWR1cGUgZmFpbGVkJyk7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzRHJjcFN5bWxpbmspIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiByZXNvbHZlKHJlcyksIDUwMCkpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVjcmVhdGVTeW1saW5rKCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVjcmVhdGVTeW1saW5rKCk7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiByZXM7XG4gIH1cblxuICBtYXJrSW5zdGFsbE51bSgpIHtcbiAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gbnVsbDtcbiAgICBjb25zdCBpbnN0YWxsZWQgPSB0aGlzLmxhc3RJbnN0YWxsZWQgPSB0aGlzLl9jb3VudFBhY2thZ2VzKCk7XG4gICAgdmFyIGRhdGEgPSBpbnN0YWxsZWQuam9pbihFT0wpO1xuICAgIHRoaXMuaW5zdGFsbENoZWNrc3VtID0gZGF0YS5sZW5ndGg7XG4gICAgZGF0YSA9IHRoaXMuaW5zdGFsbENoZWNrc3VtICsgRU9MICsgZGF0YTtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ051bWJlciBvZiBwYWNrYWdlczogJyArIGluc3RhbGxlZC5sZW5ndGgpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ2Rpc3QnKSkpXG4gICAgICBmcy5ta2RpclN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JykpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLmludGVncml0eS50eHQnKSwgZGF0YSwgJ3V0ZjgnKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBOb3QgaW5jbHVkaW5nIHN5bWxpbmsgY29tcG9uZW50c1xuXHQgKi9cbiAgX2NvdW50UGFja2FnZXMoKSB7XG4gICAgLy8gY29uc29sZS5sb2cobG9nTmFtZSArICdDb3VudGluZyBpbnN0YWxsZWQgbW9kdWxlcy4uLicpO1xuICAgIC8vIHZhciBjb3VudCA9IDA7XG4gICAgY29uc3QgcGFja2FnZU5hbWVzID0gW107XG4gICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICBmb3IgKGNvbnN0IGZuYW1lIG9mIGZzLnJlYWRkaXJTeW5jKG1vZHVsZURpcikpIHtcbiAgICAgIGlmIChmbmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgY29uc3Qgc2NvcGVEaXIgPSBQYXRoLnJlc29sdmUobW9kdWxlRGlyLCBmbmFtZSk7XG4gICAgICAgIGZvciAoY29uc3Qgc3ViZm5hbWUgb2YgZnMucmVhZGRpclN5bmMoc2NvcGVEaXIpKSB7XG4gICAgICAgICAgaWYgKHN1YmZuYW1lLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShzY29wZURpciwgc3ViZm5hbWUsICdwYWNrYWdlLmpzb24nKSkgJiZcbiAgICAgICAgICAgICFmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHNjb3BlRGlyLCBzdWJmbmFtZSkpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgIC8vIGNvdW50Kys7XG4gICAgICAgICAgICBwYWNrYWdlTmFtZXMucHVzaChmbmFtZSArICcvJyArIHN1YmZuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmbmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKG1vZHVsZURpciwgZm5hbWUsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgcGFja2FnZU5hbWVzLnB1c2goZm5hbWUpO1xuICAgICAgICAvLyBjb3VudCsrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFja2FnZU5hbWVzO1xuICB9XG5cbiAgLyoqXG5cdCAqIE1hcmsgY2hhbmdlcyBhbmQgd3JpdGluZyBkci5wYWNrYWdlLmpzb24sIGFuZCByZXN0b3JlIHBhY2thZ2UuanNvbiBhbmQgY3JlYXRlIGRyLnlhcm4ubG9ja1xuXHQgKiBAcGFyYW0geyp9IGRlcGVuZGVuY2llc1xuXHQgKi9cbiAgYWZ0ZXJDaGFuZ2UoKSB7XG4gICAgaWYgKHRoaXMuY2hhbmdlcykge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QnKSlcbiAgICAgICAgZnMubWtkaXJTeW5jKHRoaXMucm9vdFBhdGggKyAnL2Rpc3QnKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLnBhY2thZ2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh0aGlzLmNoYW5nZXMsIG51bGwsICcgICcpKTtcbiAgICB9XG4gICAgLy8gZnMucmVuYW1lU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLnBhY2thZ2UuanNvbicpKTtcbiAgICBmcy5yZW5hbWVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICBpZiAoIXRoaXMub2ZmbGluZSAmJiBmcy5leGlzdHNTeW5jKHRoaXMucm9vdFBhdGggKyAnL3lhcm4ubG9jaycpKSB7XG4gICAgICBmcy5jcmVhdGVSZWFkU3RyZWFtKHRoaXMucm9vdFBhdGggKyAnL3lhcm4ubG9jaycpXG4gICAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHRoaXMucm9vdFBhdGggKyAnL2RyLm9mZmxpbmUteWFybi5sb2NrJykpO1xuICAgICAgY29uc29sZS5sb2cobG9nTmFtZSArICdXcml0ZSBkci5vZmZsaW5lLXlhcm4ubG9jaycpO1xuICAgIH1cbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuY2hhbmdlcyA9IG51bGw7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdTYXZlIHRvIGRpc3QvZHIucGFja2FnZS5qc29uLCByZXN0b3JlIHBhY2thZ2UuanNvbiBmcm9tIGRyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgfVxuXG4gIGFmdGVyQ2hhbmdlRmFpbCgpIHtcbiAgICBjb25zdCBwa2ZpbGUgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrZmlsZSkpXG4gICAgICBmcy5yZW5hbWVTeW5jKHBrZmlsZSwgUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5mYWlsLnBhY2thZ2UuanNvbicpKTtcbiAgICBmcy5yZW5hbWVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIuYmFja3VwLnBhY2thZ2UuanNvbicpLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICB0aGlzLmlzUGFja2FnZUpzb25EaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuY2hhbmdlcyA9IG51bGw7XG4gICAgY29uc29sZS5sb2cobG9nTmFtZSArICdSZXN0b3JlIHBhY2thZ2UuanNvbiBmcm9tIGRyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5zdGFuY2Uocm9vdFBhdGg6IHN0cmluZykge1xuICByb290UGF0aCA9IFBhdGgucmVzb2x2ZShyb290UGF0aCk7XG4gIHZhciBnID0gR3VhcmRlci5pbnN0YW5jZXNbcm9vdFBhdGhdO1xuICBpZiAoZylcbiAgICByZXR1cm4gZztcbiAgZyA9IG5ldyBHdWFyZGVyKHJvb3RQYXRoKTtcbiAgR3VhcmRlci5pbnN0YW5jZXNbcm9vdFBhdGhdID0gZztcbiAgcmV0dXJuIGc7XG59XG5cbmZ1bmN0aW9uIGNsb25lUGtKc29uKG9iajogUGFja2FnZUpzb24pOiBQYWNrYWdlSnNvbiB7XG4gIC8vIG1pbWljIGxvZGFzaCBkZWVwbHkgY2xvbmVcbiAgY29uc3QgY2xvbmVkID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqKTtcbiAgY2xvbmVkLmRlcGVuZGVuY2llcyA9IE9iamVjdC5hc3NpZ24oe30sIG9iai5kZXBlbmRlbmNpZXMpO1xuICBjbG9uZWQuZGV2RGVwZW5kZW5jaWVzID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqLmRldkRlcGVuZGVuY2llcyk7XG4gIHJldHVybiBjbG9uZWQ7XG59XG5cbmZ1bmN0aW9uIGhhcyhvYmo6IGFueSwgcHJvcDogc3RyaW5nKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==