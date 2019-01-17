"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const processUtils = tslib_1.__importStar(require("./process-utils"));
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1qc29uLWd1YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLWpzb24tZ3VhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsK0NBQXlCO0FBQ3pCLG1EQUE2QjtBQUM3QixzRUFBZ0Q7QUFDaEQsMkJBQWlDO0FBQ2pDLE1BQU0sT0FBTyxHQUFHLGFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFakQsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDO0FBTS9COzs7O0VBSUU7QUFDRixNQUFNLE9BQU87SUFVWixZQUFtQixRQUFnQjtRQUFoQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBUm5DLFlBQU8sR0FBZ0IsSUFBSSxDQUFDO1FBQzVCLG9CQUFlLEdBQWtCLElBQUksQ0FBQztRQUN0Qyx1QkFBa0IsR0FBRyxLQUFLLENBQUM7UUFFM0IseUJBQW9CLEdBQW1CLElBQUksQ0FBQztRQUM1QyxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBSWYsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNyRyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsWUFBWSxDQUFDLGlCQUF1QjtRQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRywrQ0FBK0MsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RFLElBQUksaUJBQWlCLEVBQUU7WUFDdEIsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztTQUNoRDthQUFNO1lBQ04sTUFBTSxHQUFHLEdB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