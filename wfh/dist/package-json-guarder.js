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
            // if (onlyProd) {
            // 	npmArgv.push(useYarn ? '--production' : '--only=prod');
            // }
            // if (isOffline) {
            // 	console.log(logName + 'offline mode is on');
            // 	yarnArgv.push('--offline');
            // } else {
            // 	// console.log(logName + '--prefer-offline mode is on');
            // 	// yarnArgv.push('--prefer-offline');
            // }
            // var installProm;
            // if (isOffline && fs.existsSync(this.rootPath + '/dr.offline-yarn.lock')) {
            // 	console.log(logName + 'Read existing dr.offline-yarn.lock');
            // 	installProm = new Promise((resolve, rej) => {
            // 		var to = fs.createWriteStream(this.rootPath + '/yarn.lock');
            // 		var from = fs.createReadStream(this.rootPath + '/dr.offline-yarn.lock');
            // 		to.on('finish', resolve)
            // 		.on('error', err => {
            // 			console.log(err);
            // 			to.end();
            // 			rej(err);
            // 		});
            // 		from.pipe(to);
            // 	});
            // } else {
            // installProm = Promise.resolve();
            // }
            const self = this;
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
        console.log(logName + 'Counting installed modules...');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLDhEQUFnRDtBQUNoRCwyQkFBaUM7QUFDakMsTUFBTSxPQUFPLEdBQUcsYUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUVqRCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7QUFNL0I7Ozs7RUFJRTtBQUNGLE1BQU0sT0FBTztJQVVaLFlBQW1CLFFBQWdCO1FBQWhCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFSbkMsWUFBTyxHQUFnQixJQUFJLENBQUM7UUFDNUIsb0JBQWUsR0FBa0IsSUFBSSxDQUFDO1FBQ3RDLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUUzQix5QkFBb0IsR0FBbUIsSUFBSSxDQUFDO1FBQzVDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFJZixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JHLENBQUM7SUFFRDs7O09BR0c7SUFDSCxZQUFZLENBQUMsaUJBQXVCO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLCtDQUErQyxDQUFDLENBQUM7UUFDdkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDdEUsSUFBSSxpQkFBaUIsRUFBRTtZQUN0QixFQUFFLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2hEO2FBQU07WUFD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