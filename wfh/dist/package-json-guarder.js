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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDhEQUFnRDtBQUNoRCwyQkFBaUM7QUFDakMsTUFBTSxPQUFPLEdBQUcsYUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVqRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7QUFNL0I7Ozs7RUFJRTtBQUNGLE1BQU0sT0FBTztJQVVYLFlBQW1CLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFSbkMsWUFBTyxHQUF1QixJQUFJLENBQUM7UUFDbkMsb0JBQWUsR0FBa0IsSUFBSSxDQUFDO1FBQ3RDLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUUzQix5QkFBb0IsR0FBbUIsSUFBSSxDQUFDO1FBQzVDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFJZCxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3RHLENBQUM7SUFFRDs7O1NBR0U7SUFDRixZQUFZLENBQUMsaUJBQXVCO1FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLCtDQUErQyxDQUFDLENBQUM7UUFDdkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDdEUsSUFBSSxpQkFBaUIsRUFBRTtZQUNyQixFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2pEO2FBQU07WUFD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USxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQVJELGtDQVFDO0FBRUQsU0FBUyxXQUFXLENBQUMsR0FBZ0I7SUFDbkMsNEJBQTRCO0lBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLEdBQUcsQ0FBQyxHQUFRLEVBQUUsSUFBWTtJQUNqQyxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDekQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBwcm9jZXNzVXRpbHMgZnJvbSAnLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7RU9MLCBwbGF0Zm9ybX0gZnJvbSAnb3MnO1xuY29uc3QgaXNXaW4zMiA9IHBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuXG5jb25zdCBsb2dOYW1lID0gJ1tJbnN0YWxsZXJdICc7XG5cbmludGVyZmFjZSBQYWNrYWdlSnNvbiB7XG4gIGRlcGVuZGVuY2llczoge1trOiBzdHJpbmddOiBzdHJpbmd9O1xuICBkZXZEZXBlbmRlbmNpZXM6IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbn1cbi8qKlxuICogVGhpcyBjbGFzcyBoZWxwcyB0byBpbnN0YWxsIGRlcGVuZGVuY2llcyBmb3IgY29tbWFuZCBcImluaXRcIixcbiAqIGl0IGlzIGluIGNoYXJnZSBvZiBtYW5pcHVsYXRpbmcgPGRyY3Atd29ya3NwYWNlPi9kci5wYWNrYWdlLmpzb25cbiAqIGFuZCBydW4gXCJ5YXJuIGluc3RhbGxcIiwgdG8gcHJvdGVjdCB0aGUgb3JpZ2luYWwgcGFja2FnZS5qc29uIGZpbGVcbiovXG5jbGFzcyBHdWFyZGVyIHtcbiAgc3RhdGljIGluc3RhbmNlczoge1trOiBzdHJpbmddOiBHdWFyZGVyfSA9IHt9O1xuICBjaGFuZ2VzOiBQYWNrYWdlSnNvbiB8IG51bGwgPSBudWxsO1xuICBpbnN0YWxsQ2hlY2tzdW06IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBpc1BhY2thZ2VKc29uRGlydHkgPSBmYWxzZTtcbiAgaXNEcmNwU3ltbGluazogYm9vbGVhbjtcbiAgaXNOb2RlTW9kdWxlc0NoYW5nZWQ6IGJvb2xlYW4gfCBudWxsID0gbnVsbDtcbiAgb2ZmbGluZSA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgbGFzdEluc3RhbGxlZDogc3RyaW5nW107XG5cbiAgY29uc3RydWN0b3IocHVibGljIHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgICB0aGlzLmlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJykpLmlzU3ltYm9saWNMaW5rKCk7XG4gIH1cblxuICAvKipcblx0ICogQmFja3VwIHBhY2thZ2UuanNvblxuXHQgKiBAcGFyYW0geyp9IGJhY2t1cEZpbGVDb250ZW50XG5cdCAqL1xuICBiZWZvcmVDaGFuZ2UoYmFja3VwRmlsZUNvbnRlbnQ/OiBhbnkpIHtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ0JhY2t1cCBwYWNrYWdlLmpzb24gdG8gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IGJhY2t1cEZpbGUgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmJhY2t1cC5wYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoYmFja3VwRmlsZUNvbnRlbnQpIHtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgYmFja3VwRmlsZUNvbnRlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBidWYgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGJ1Zik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG5cdCAqIEdldCBsYXN0IGNoYW5nZWQgcGFja2FnZS5qc29uIGpzb24gZnJvbSBkci5wYWNrYWdlLmpzb24gb3IgbWVtb3J5XG5cdCAqIEByZXR1cm5zIHtKU09OfSBhIGNsb25lZCBwYWNrYWdlLmpzb25cblx0ICovXG4gIGdldENoYW5nZXMoKSB7XG4gICAgaWYgKHRoaXMuY2hhbmdlcykge1xuICAgICAgcmV0dXJuIGNsb25lUGtKc29uKHRoaXMuY2hhbmdlcyk7XG4gICAgfVxuICAgIGNvbnN0IGxhc3RDaGFuZ2VkID0gUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkaXN0JywgJ2RyLnBhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGxhc3RDaGFuZ2VkKSkge1xuICAgICAgY29uc3QgY2hhbmdlZEpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsYXN0Q2hhbmdlZCwgJ3V0ZjgnKSk7XG4gICAgICB0aGlzLmNoYW5nZXMgPSBjaGFuZ2VkSnNvbjtcbiAgICAgIHJldHVybiBjbG9uZVBrSnNvbihjaGFuZ2VkSnNvbik7XG4gICAgfVxuICAgIHJldHVybiB7ZGVwZW5kZW5jaWVzOiB7fSwgZGV2RGVwZW5kZW5jaWVzOiB7fX07XG4gIH1cblxuICBnZXRKc29uRmlsZSgpIHtcbiAgICBpZiAodGhpcy5pc1BhY2thZ2VKc29uRGlydHkgfHwgIWZzLmV4aXN0c1N5bmModGhpcy5yb290UGF0aCArICcvZGlzdC9kci5wYWNrYWdlLmpzb24nKSlcbiAgICAgIHJldHVybiB0aGlzLnJvb3RQYXRoICsgJy9wYWNrYWdlLmpzb24nO1xuICAgIHJldHVybiBQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCArICcvZGlzdC9kci5wYWNrYWdlLmpzb24nKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBNYXJrIGNoYW5nZXMgd2l0aG91dCB3cml0aW5nIGRyLnBhY2thZ2UuanNvblxuXHQgKiByZXR1cm4gYSBjb21wbGV0ZSBsaXN0IG9mIHRoaXMgdGltZSBtYXJrZWQgZGVwZW5kZW5jaWVzIHRvZ2V0aGVyIHdpdGggbGFzdCB0aW1lIG1hcmtlZFxuXHQgKiBAcGFyYW0ge29iamVjdH0gcGsgcGFja2FnZS5qc29uXG5cdCAqIEByZXR1cm4gY2hhbmdlZCBsaXN0IFtzdHJpbmcsIHN0cmluZ11bXVxuXHQgKi9cbiAgbWFya0NoYW5nZXMocGs6IFBhY2thZ2VKc29uKSB7XG4gICAgY29uc3QgY2hhbmdlTGlzdDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBbXTtcbiAgICBpZiAodGhpcy5pc0RyY3BTeW1saW5rKSB7XG4gICAgICBpZiAocGsuZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGRlbGV0ZSBway5kZXBlbmRlbmNpZXNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgICBkZWxldGUgcGsuZGVwZW5kZW5jaWVzWydAZHIvaW50ZXJuYWwtcmVjaXBlJ107XG4gICAgICB9XG4gICAgICBpZiAocGsuZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGRlbGV0ZSBway5kZXZEZXBlbmRlbmNpZXNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgICBkZWxldGUgcGsuZGV2RGVwZW5kZW5jaWVzWydAZHIvaW50ZXJuYWwtcmVjaXBlJ107XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNsZWFuIGR1cGxpY2F0ZXMgaW4gZGV2RGVwZW5kZW5jaWVzXG4gICAgaWYgKHBrLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgZm9yIChjb25zdCBkZXAgaW4gcGsuZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGlmIChoYXMocGsuZGV2RGVwZW5kZW5jaWVzLCBkZXApICYmIGhhcyhway5kZXBlbmRlbmNpZXMsIGRlcCkpXG4gICAgICAgICAgZGVsZXRlIHBrLmRldkRlcGVuZGVuY2llc1tkZXBdO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBsYXN0RGVwcyA9IHRoaXMuZ2V0Q2hhbmdlcygpLmRlcGVuZGVuY2llcztcbiAgICBjb25zdCBsYXN0RGV2RGVwcyA9IHRoaXMuZ2V0Q2hhbmdlcygpLmRldkRlcGVuZGVuY2llcztcbiAgICBmb3JDaGFuZ2VzKGxhc3REZXBzLCBway5kZXBlbmRlbmNpZXMpO1xuICAgIGZvckNoYW5nZXMobGFzdERldkRlcHMsIHBrLmRldkRlcGVuZGVuY2llcyk7XG5cbiAgICBmdW5jdGlvbiBmb3JDaGFuZ2VzKGxhc3REZXA6IHtbazogc3RyaW5nXTogc3RyaW5nfSwgbmV3RGVwOiB7W2s6IHN0cmluZ106IHN0cmluZ30pIHtcbiAgICAgIGlmIChuZXdEZXAgIT0gbnVsbCkge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcCBpbiBuZXdEZXApIHtcbiAgICAgICAgICBpZiAoIWhhcyhuZXdEZXAsIGRlcCkpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCB2ZXIgPSBuZXdEZXBbZGVwXTtcbiAgICAgICAgICBpZiAobGFzdERlcFtkZXBdICE9PSB2ZXIpIHtcbiAgICAgICAgICAgIGNoYW5nZUxpc3QucHVzaChbZGVwLCB2ZXJdKTsgLy8gbmV3IG9yIGNoYW5nZWQgZGVwZW5kZW5jeVxuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgbGFzdERlcFtkZXBdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCByZXN0TGFzdERlcCA9IE9iamVjdC5rZXlzKGxhc3REZXApLm1hcDxbc3RyaW5nLCBzdHJpbmddPihyb3cgPT4ge1xuICAgICAgICByZXR1cm4gW3JvdywgbGFzdERlcFtyb3ddXTtcbiAgICAgIH0pO1xuICAgICAgLy8gQ29tcGxldGUgZGVwZW5kZW5jaWVzID0gbmV3L2NoYW5nZWQgKyByZXN0XG4gICAgICBjaGFuZ2VMaXN0LnB1c2goLi4ucmVzdExhc3REZXApO1xuICAgIH1cbiAgICAvLyBway5kZXBlbmRlbmNpZXMgPSBvcmlnaW5hbERlcHM7XG4gICAgdGhpcy5jaGFuZ2VzID0gcGs7XG4gICAgcmV0dXJuIGNoYW5nZUxpc3Q7XG4gIH1cblxuICBpc01vZHVsZXNDaGFuZ2VkKCkge1xuICAgIGlmICh0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkICE9IG51bGwpXG4gICAgICByZXR1cm4gdGhpcy5pc05vZGVNb2R1bGVzQ2hhbmdlZDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbW9kdWxlRGlyID0gUGF0aC5yZXNvbHZlKHRoaXMucm9vdFBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICAgIGlmICh0aGlzLmluc3RhbGxDaGVja3N1bSA9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGxhc3RDb3VudEZpbGUgPSBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2Rpc3QnLCAnZHIuaW50ZWdyaXR5LnR4dCcpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobW9kdWxlRGlyKSB8fCAhZnMuZXhpc3RzU3luYyhsYXN0Q291bnRGaWxlKSkge1xuICAgICAgICAgIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNoZWNrc3VtRGF0YSA9IGZzLnJlYWRGaWxlU3luYyhsYXN0Q291bnRGaWxlLCAndXRmOCcpLnNwbGl0KEVPTCk7XG4gICAgICAgIHRoaXMuaW5zdGFsbENoZWNrc3VtID0gcGFyc2VJbnQoY2hlY2tzdW1EYXRhWzBdLCAxMCk7XG4gICAgICAgIHRoaXMubGFzdEluc3RhbGxlZCA9IGNoZWNrc3VtRGF0YS5zbGljZSgxKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGxvZ05hbWUsIGVycik7XG4gICAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBpbnN0YWxsZWQgPSB0aGlzLl9jb3VudFBhY2thZ2VzKCk7XG4gICAgY29uc3QgY3VyckNoZWNrc3VtID0gaW5zdGFsbGVkLmpvaW4oRU9MKS5sZW5ndGg7XG4gICAgaWYgKGN1cnJDaGVja3N1bSAhPT0gdGhpcy5pbnN0YWxsQ2hlY2tzdW0pIHtcbiAgICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyBgSW5zdGFsbGF0aW9uIGludGVncml0eSBjaGVja3N1bSBoYXMgY2hhbmdlZCBmcm9tICR7dGhpcy5pbnN0YWxsQ2hlY2tzdW19IHRvICR7Y3VyckNoZWNrc3VtfWApO1xuICAgICAgY29uc3QgaW5zdGFsbGVkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgaW5zdGFsbGVkKSB7XG4gICAgICAgIGluc3RhbGxlZFNldC5hZGQobmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5sYXN0SW5zdGFsbGVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiB0aGlzLmxhc3RJbnN0YWxsZWQpIHtcbiAgICAgICAgICBpZiAoIWluc3RhbGxlZFNldC5oYXMobmFtZSkpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ01pc3NpbmcgJyArIG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aGlzLmlzTm9kZU1vZHVsZXNDaGFuZ2VkID0gZmFsc2U7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYXN5bmMgaW5zdGFsbEFzeW5jKGRvTm90TWFya0luc3RhbGxOdW0gPSBmYWxzZSwgdXNlWWFybiA9IGZhbHNlLCBvbmx5UHJvZCA9IGZhbHNlLCBpc09mZmxpbmUgPSBmYWxzZSkge1xuICAgIHRoaXMub2ZmbGluZSA9IGlzT2ZmbGluZTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJyksXG4gICAgICBKU09OLnN0cmluZ2lmeSh0aGlzLmdldENoYW5nZXMoKSwgbnVsbCwgJyAgJykpO1xuICAgIHRoaXMuaXNQYWNrYWdlSnNvbkRpcnR5ID0gdHJ1ZTtcbiAgICBjb25zdCBkcmNwTG9jYXRpb24gPSBQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcycsICdkci1jb21wLXBhY2thZ2UnKTtcbiAgICBjb25zdCByZWFsRHJjcFBhdGggPSBmcy5yZWFscGF0aFN5bmMoZHJjcExvY2F0aW9uKTtcbiAgICAvLyB2YXIgeWFybkFyZ3YgPSBbJ2luc3RhbGwnLCAnLS1ub24taW50ZXJhY3RpdmUnLCAnLS1jaGVjay1maWxlcyddO1xuICAgIGNvbnN0IG5wbUFyZ3YgPSBbJ2luc3RhbGwnXTtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5pc0RyY3BTeW1saW5rICYmIGZzLmV4aXN0c1N5bmMoZHJjcExvY2F0aW9uKSkge1xuICAgICAgZnMudW5saW5rU3luYyhkcmNwTG9jYXRpb24pO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZWNyZWF0ZVN5bWxpbmsoKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCAnZHItY29tcC1wYWNrYWdlJykpKSB7XG4gICAgICAgIGZzLnN5bWxpbmtTeW5jKFBhdGgucmVsYXRpdmUoJ25vZGVfbW9kdWxlcycsIHJlYWxEcmNwUGF0aCksIGRyY3BMb2NhdGlvbiwgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnV3JpdGUgc3ltbGluayBkci1jb21wLXBhY2thZ2UnKTtcbiAgICAgIH1cbiAgICAgIGlmICghZG9Ob3RNYXJrSW5zdGFsbE51bSlcbiAgICAgICAgc2VsZi5tYXJrSW5zdGFsbE51bSgpO1xuICAgIH1cbiAgICBsZXQgcmVzOiBzdHJpbmc7XG4gICAgdHJ5IHtcbiAgICAgIHJlcyA9IGF3YWl0IHByb2Nlc3NVdGlscy5leGUoXG4gICAgICAgIHVzZVlhcm4gPyAneWFybicgOiAnbnBtJywgLi4ubnBtQXJndiwge2N3ZDogdGhpcy5yb290UGF0aCxcbiAgICAgICAgICBlbnY6IE9iamVjdC5hc3NpZ24oe30sIHByb2Nlc3MuZW52LCB7Tk9ERV9FTlY6IG9ubHlQcm9kID8gJ3Byb2R1Y3Rpb24nOiAnZGV2ZWxvcG1lbnQnfSl9XG4gICAgICAgICAgKS5wcm9taXNlO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5sb2coJ1NvcnJ5LCB5YXJuL25wbSBpbnN0YWxsIGZhaWxlZCcpO1xuICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNEcmNwU3ltbGluaykge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUocmVzKSwgNTAwKSk7XG4gICAgICB0cnkge1xuICAgICAgICByZWNyZWF0ZVN5bWxpbmsoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZWNyZWF0ZVN5bWxpbmsoKTtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH0gZWxzZVxuICAgICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIG1hcmtJbnN0YWxsTnVtKCkge1xuICAgIHRoaXMuaXNOb2RlTW9kdWxlc0NoYW5nZWQgPSBudWxsO1xuICAgIGNvbnN0IGluc3RhbGxlZCA9IHRoaXMubGFzdEluc3RhbGxlZCA9IHRoaXMuX2NvdW50UGFja2FnZXMoKTtcbiAgICB2YXIgZGF0YSA9IGluc3RhbGxlZC5qb2luKEVPTCk7XG4gICAgdGhpcy5pbnN0YWxsQ2hlY2tzdW0gPSBkYXRhLmxlbmd0aDtcbiAgICBkYXRhID0gdGhpcy5pbnN0YWxsQ2hlY2tzdW0gKyBFT0wgKyBkYXRhO1xuICAgIGNvbnNvbGUubG9nKGxvZ05hbWUgKyAnTnVtYmVyIG9mIHBhY2thZ2VzOiAnICsgaW5zdGFsbGVkLmxlbmd0aCk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZSh0aGlzLnJvb3RQYXRoLCAnZGlzdCcpKSlcbiAgICAgIGZzLm1rZGlyU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ2Rpc3QnKSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ2Rpc3QnLCAnZHIuaW50ZWdyaXR5LnR4dCcpLCBkYXRhLCAndXRmOCcpO1xuICB9XG5cbiAgLyoqXG5cdCAqIE5vdCBpbmNsdWRpbmcgc3ltbGluayBjb21wb25lbnRzXG5cdCAqL1xuICBfY291bnRQYWNrYWdlcygpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ0NvdW50aW5nIGluc3RhbGxlZCBtb2R1bGVzLi4uJyk7XG4gICAgLy8gdmFyIGNvdW50ID0gMDtcbiAgICBjb25zdCBwYWNrYWdlTmFtZXMgPSBbXTtcbiAgICBjb25zdCBtb2R1bGVEaXIgPSBQYXRoLnJlc29sdmUodGhpcy5yb290UGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuICAgIGZvciAoY29uc3QgZm5hbWUgb2YgZnMucmVhZGRpclN5bmMobW9kdWxlRGlyKSkge1xuICAgICAgaWYgKGZuYW1lLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgICBjb25zdCBzY29wZURpciA9IFBhdGgucmVzb2x2ZShtb2R1bGVEaXIsIGZuYW1lKTtcbiAgICAgICAgZm9yIChjb25zdCBzdWJmbmFtZSBvZiBmcy5yZWFkZGlyU3luYyhzY29wZURpcikpIHtcbiAgICAgICAgICBpZiAoc3ViZm5hbWUuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHNjb3BlRGlyLCBzdWJmbmFtZSwgJ3BhY2thZ2UuanNvbicpKSAmJlxuICAgICAgICAgICAgIWZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUoc2NvcGVEaXIsIHN1YmZuYW1lKSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgLy8gY291bnQrKztcbiAgICAgICAgICAgIHBhY2thZ2VOYW1lcy5wdXNoKGZuYW1lICsgJy8nICsgc3ViZm5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZuYW1lLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUobW9kdWxlRGlyLCBmbmFtZSwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICBwYWNrYWdlTmFtZXMucHVzaChmbmFtZSk7XG4gICAgICAgIC8vIGNvdW50Kys7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYWNrYWdlTmFtZXM7XG4gIH1cblxuICAvKipcblx0ICogTWFyayBjaGFuZ2VzIGFuZCB3cml0aW5nIGRyLnBhY2thZ2UuanNvbiwgYW5kIHJlc3RvcmUgcGFja2FnZS5qc29uIGFuZCBjcmVhdGUgZHIueWFybi5sb2NrXG5cdCAqIEBwYXJhbSB7Kn0gZGVwZW5kZW5jaWVzXG5cdCAqL1xuICBhZnRlckNoYW5nZSgpIHtcbiAgICBpZiAodGhpcy5jaGFuZ2VzKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmModGhpcy5yb290UGF0aCArICcvZGlzdCcpKVxuICAgICAgICBmcy5ta2RpclN5bmModGhpcy5yb290UGF0aCArICcvZGlzdCcpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2Rpc3QnLCAnZHIucGFja2FnZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHRoaXMuY2hhbmdlcywgbnVsbCwgJyAgJykpO1xuICAgIH1cbiAgICAvLyBmcy5yZW5hbWVTeW5jKFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJyksIFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAnZHIucGFja2FnZS5qc29uJykpO1xuICAgIGZzLnJlbmFtZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5iYWNrdXAucGFja2FnZS5qc29uJyksIFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJykpO1xuICAgIGlmICghdGhpcy5vZmZsaW5lICYmIGZzLmV4aXN0c1N5bmModGhpcy5yb290UGF0aCArICcveWFybi5sb2NrJykpIHtcbiAgICAgIGZzLmNyZWF0ZVJlYWRTdHJlYW0odGhpcy5yb290UGF0aCArICcveWFybi5sb2NrJylcbiAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0odGhpcy5yb290UGF0aCArICcvZHIub2ZmbGluZS15YXJuLmxvY2snKSk7XG4gICAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ1dyaXRlIGRyLm9mZmxpbmUteWFybi5sb2NrJyk7XG4gICAgfVxuICAgIHRoaXMuaXNQYWNrYWdlSnNvbkRpcnR5ID0gZmFsc2U7XG4gICAgdGhpcy5jaGFuZ2VzID0gbnVsbDtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ1NhdmUgdG8gZGlzdC9kci5wYWNrYWdlLmpzb24sIHJlc3RvcmUgcGFja2FnZS5qc29uIGZyb20gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICB9XG5cbiAgYWZ0ZXJDaGFuZ2VGYWlsKCkge1xuICAgIGNvbnN0IHBrZmlsZSA9IFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGtmaWxlKSlcbiAgICAgIGZzLnJlbmFtZVN5bmMocGtmaWxlLCBQYXRoLmpvaW4odGhpcy5yb290UGF0aCwgJ2RyLmZhaWwucGFja2FnZS5qc29uJykpO1xuICAgIGZzLnJlbmFtZVN5bmMoUGF0aC5qb2luKHRoaXMucm9vdFBhdGgsICdkci5iYWNrdXAucGFja2FnZS5qc29uJyksIFBhdGguam9pbih0aGlzLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJykpO1xuICAgIHRoaXMuaXNQYWNrYWdlSnNvbkRpcnR5ID0gZmFsc2U7XG4gICAgdGhpcy5jaGFuZ2VzID0gbnVsbDtcbiAgICBjb25zb2xlLmxvZyhsb2dOYW1lICsgJ1Jlc3RvcmUgcGFja2FnZS5qc29uIGZyb20gZHIuYmFja3VwLnBhY2thZ2UuanNvbicpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbnN0YW5jZShyb290UGF0aDogc3RyaW5nKSB7XG4gIHJvb3RQYXRoID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoKTtcbiAgdmFyIGcgPSBHdWFyZGVyLmluc3RhbmNlc1tyb290UGF0aF07XG4gIGlmIChnKVxuICAgIHJldHVybiBnO1xuICBnID0gbmV3IEd1YXJkZXIocm9vdFBhdGgpO1xuICBHdWFyZGVyLmluc3RhbmNlc1tyb290UGF0aF0gPSBnO1xuICByZXR1cm4gZztcbn1cblxuZnVuY3Rpb24gY2xvbmVQa0pzb24ob2JqOiBQYWNrYWdlSnNvbik6IFBhY2thZ2VKc29uIHtcbiAgLy8gbWltaWMgbG9kYXNoIGRlZXBseSBjbG9uZVxuICBjb25zdCBjbG9uZWQgPSBPYmplY3QuYXNzaWduKHt9LCBvYmopO1xuICBjbG9uZWQuZGVwZW5kZW5jaWVzID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqLmRlcGVuZGVuY2llcyk7XG4gIGNsb25lZC5kZXZEZXBlbmRlbmNpZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvYmouZGV2RGVwZW5kZW5jaWVzKTtcbiAgcmV0dXJuIGNsb25lZDtcbn1cblxuZnVuY3Rpb24gaGFzKG9iajogYW55LCBwcm9wOiBzdHJpbmcpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIl19