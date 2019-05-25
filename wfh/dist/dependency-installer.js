"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
const fs = __importStar(require("fs"));
const fs_extra_1 = require("fs-extra");
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const config = require('../lib/config');
const chalk = require('chalk');
const semver = require('semver');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
const packageUtils = require('../lib/packageMgr/packageUtils');
const getPackageJsonGuarder = require('../lib/gulp/packageJsonGuarder');
const recipeManager = __importStar(require("./recipe-manager"));
function listCompDependency(pkJsonFiles, write, isDrcpSymlink) {
    // log.info('scan components from:\n', pkJsonFiles.join('\n'));
    const installer = new InstallManager();
    installer.scanSrcDeps(pkJsonFiles);
    installer.scanInstalledPeerDeps();
    return installer.printComponentDep(write, isDrcpSymlink);
}
exports.listCompDependency = listCompDependency;
class InstallManager {
    constructor() {
        this.versionReg = /^(\D*)(\d.*?)$/;
        if (!(this instanceof InstallManager)) {
            return new InstallManager();
        }
        this.srcDeps = {}; // src packages needed dependencies and all packages needed peer dependencies
        // this.peerDeps = {}; // all packages needed peer dependencies
    }
    scanSrcDeps(jsonFiles) {
        const self = this;
        this.componentMap = {};
        for (const packageJson of jsonFiles) {
            log.debug('scanSrcDepsAsync() ' + Path.relative(config().rootPath, packageJson));
            const json = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
            if (!json.dr)
                continue;
            this.componentMap[json.name] = { ver: json.version, toInstall: false };
            const deps = json.dependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    // log.debug('scanSrcDepsAsync() dep ' + name);
                    self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
                }
            }
            if (json.devDependencies) {
                // log.warn(`$${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
                // 	'you should move them to "dependencies" or "peerDependencies"');
                for (const name of Object.keys(json.devDependencies)) {
                    const version = json.devDependencies[name];
                    self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
                }
            }
            if (json.peerDependencies) {
                for (const name of Object.keys(json.peerDependencies)) {
                    const version = json.peerDependencies[name];
                    self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
                }
            }
        }
    }
    scanInstalledPeerDeps() {
        // TODO: Here I want to determine expected component version to install with, but so far the version number of each component that I get is currently installed
        // one which might be incorrect or outdated, in case like developer did not run "yarn install" before "drcp init".
        // One problem is: 
        // Without running "yarn install" to download "recipe" package, I can't know exact up to date version number of those components
        // which belong to a certain "recipe" pacakge.
        // So firstly, always "yarn install" before "drcp init"
        // Another problem is:
        // These old component versions are tracked in dist/dr.package.json waiting for being compared with newly changed version list.
        // But ...
        packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
            if (_.has(this.componentMap, name))
                return; // Skip it, since most likely there is a duplicate "installed" dependency in package.json against an symbolic linked component
            this.componentMap[name] = { ver: json.version, toInstall: true };
            _.each(json.peerDependencies, (version, name) => {
                this._trackDependency(this.srcDeps, name, version, json.name, Path.join(packagePath, 'package.josn'));
            });
        }, 'installed');
    }
    /**
     * @return true if there are newly found dependencies added to package.json
     */
    printComponentDep(write, isDrcpSymlink) {
        const self = this;
        const rootPath = config().rootPath;
        const packageJsonGuarder = getPackageJsonGuarder(rootPath);
        var mainPkjson, mainDeps;
        if (!packageJsonGuarder.isPackageJsonDirty) {
            const mainPkFile = Path.resolve(rootPath, 'package.json');
            log.info('Checking', mainPkFile);
            mainPkjson = JSON.parse(fs.readFileSync(mainPkFile, 'utf8'));
            mainDeps = mainPkjson.dependencies;
            if (mainDeps == null)
                mainDeps = mainPkjson.dependencies = {};
            if (process.env.NODE_ENV === 'development')
                _.assign(mainDeps, mainPkjson.devDependencies);
            _.each(packageJsonGuarder.getChanges().dependencies, (ver, name) => {
                // If there is a same dependency in original package.json, we use the version of that one, cuz' that might be manually set
                if (!_.has(mainDeps, name))
                    mainDeps[name] = ver;
            });
        }
        else {
            mainPkjson = packageJsonGuarder.getChanges();
            mainDeps = mainPkjson.dependencies;
        }
        const depNames = Object.keys(this.srcDeps);
        depNames.sort();
        // var peerDepNames = Object.keys(this.peerDeps);
        if (depNames.length === 0)
            return;
        const nameWidth = _.maxBy(depNames, name => name.length).length;
        // log.warn(Object.keys(this.componentMap));
        if (depNames.length > 0) {
            let printOut = _.pad(' Associated Components Dependencies & ' + chalk.cyan('Components Peer Dependencies'), 60, '-') + '\n';
            printOut += _.padStart('Dependency ', nameWidth + 13) + '| By\n';
            printOut += _.repeat('-', nameWidth + 13) + '|' + _.repeat('-', 10) + '\n';
            let countDep = 0;
            for (const name of depNames) {
                const versionList = this.srcDeps[name];
                const firstVersion = self.sortByVersion(versionList, name)[0];
                let markNew = '  ';
                if (name !== '@dr/internal-recipe' && (!_.has(this.componentMap, name)) &&
                    (mainDeps[name] !== firstVersion.ver)) {
                    mainDeps[name] = firstVersion.ver;
                    markNew = '+ ';
                }
                const hasDiffVersion = self._containsDiffVersion(versionList);
                const printName = (hasDiffVersion ? chalk.red : chalk.cyan)(_.padStart(markNew + name, nameWidth, ' '));
                printOut += `${printName} ${versionList.length > 1 ? '─┬─' : '───'}${_.padEnd(firstVersion.ver, 9, '─')} ${firstVersion.by}\n`;
                var i = versionList.length - 1;
                for (const rest of versionList.slice(1)) {
                    printOut += `${_.repeat(' ', nameWidth)} ${i === 1 ? ' └─' : ' ├─'}${_.padEnd(rest.ver, 9, '─')} ${rest.by}\n`;
                    i--;
                }
                countDep++;
            }
            printOut += _.pad(` total ${chalk.green(countDep)} `, 60, '-');
            log.info(printOut);
        }
        fs_extra_1.mkdirpSync(config().destDir);
        if (write) {
            // _.assign(mainPkjson.dependencies, newDepJson);
            _.each(mainDeps, (ver, name) => {
                if (_.get(this.componentMap, [name, 'toInstall']) === false) {
                    delete mainDeps[name];
                    log.info(chalk.blue('Remove source linked dependency: ' + name));
                }
            });
            recipeManager.eachRecipeSrc((srcDir, recipeDir, recipeName) => {
                if (recipeName && _.has(mainDeps, recipeName)) {
                    delete mainDeps[recipeName];
                    log.info(chalk.blue('Remove recipe dependency: ' + recipeName));
                }
            });
            const changeList = packageJsonGuarder.markChanges(mainPkjson);
            const needInstall = _.size(changeList) > 0;
            if (needInstall) {
                const changed = [];
                const removed = [];
                for (const row of changeList) {
                    if (row[1] == null)
                        removed.push(row[0]);
                    else
                        changed.push(row[0] + '@' + row[1]);
                }
                if (changed.length > 0)
                    log.info('Changed dependencies:', changed.join(', '));
                if (removed.length > 0)
                    log.info(chalk.blue('Removed dependencies:'), removed.join(', '));
            }
            // fs.writeFileSync(mainPkFile, JSON.stringify(mainPkjson, null, '  '));
            // log.info('%s is written.', mainPkFile);
            return needInstall;
        }
        return false;
    }
    _trackDependency(trackTo, name, version, byWhom, path) {
        if (!_.has(trackTo, name)) {
            trackTo[name] = [];
        }
        const m = this.versionReg.exec(version);
        trackTo[name].push({
            ver: version === '*' ? '' : version,
            verNum: m ? m[2] : null,
            pre: m ? m[1] : '',
            by: byWhom,
            path
        });
    }
    _containsDiffVersion(sortedVersions) {
        // var self = this;
        for (let i = 0, l = sortedVersions.length - 1; i < l; i++) {
            const a = sortedVersions[i].ver;
            const b = sortedVersions[i + 1].ver;
            if (b === '*' || b === '')
                continue;
            if (a !== b)
                return true;
        }
        return false;
    }
    /**
     * Sort by descending
     * @param verInfoList {ver: string, by: string, name: string}
     */
    sortByVersion(verInfoList, name) {
        if (verInfoList == null)
            return verInfoList;
        try {
            verInfoList.sort((info1, info2) => {
                if (info1.verNum != null && info2.verNum != null) {
                    const res = semver.rcompare(info1.verNum, info2.verNum);
                    if (res === 0)
                        return info1.pre === '' && info2.pre !== '' ? -1 :
                            (info1.pre !== '' && info2.pre === '' ? 1 : 0);
                    else
                        return res;
                }
                else if (info1.verNum != null && info2.verNum == null)
                    return -1;
                else if (info2.verNum != null && info1.verNum == null)
                    return 1;
                else if (info1.ver > info2.ver)
                    return -1;
                else if (info1.ver < info2.ver)
                    return 1;
                else
                    return 0;
            });
        }
        catch (e) {
            log.error(`Invalid semver format for ${name || ''}: ` + JSON.stringify(verInfoList, null, '  '));
            throw e;
        }
        return verInfoList;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsdUNBQXlCO0FBQ3pCLHVDQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUN4RSxnRUFBa0Q7QUFFbEQsU0FBZ0Isa0JBQWtCLENBQUMsV0FBcUIsRUFBRSxLQUFjLEVBQUUsYUFBc0I7SUFDL0YsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFDdkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUNsQyxPQUFPLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQU5ELGdEQU1DO0FBVUQsTUFBTSxjQUFjO0lBTW5CO1FBSEEsZUFBVSxHQUFHLGdCQUFnQixDQUFDO1FBSTdCLElBQUksQ0FBQyxDQUFDLElBQUks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