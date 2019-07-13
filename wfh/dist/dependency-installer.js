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
            printOut += _.padStart('Dependency ', nameWidth + 13) + '| Dependent\n';
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
            const deleted = [];
            _.each(mainDeps, (_ver, name) => {
                if (_.get(this.componentMap, [name, 'toInstall']) === false) {
                    delete mainDeps[name];
                    deleted.push(name);
                }
            });
            log.info(chalk.blue('source linked dependency: ' + deleted.join(', ')));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsdUNBQXlCO0FBQ3pCLHVDQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDL0QsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUN4RSxnRUFBa0Q7QUFFbEQsU0FBZ0Isa0JBQWtCLENBQUMsV0FBcUIsRUFBRSxLQUFjLEVBQUUsYUFBc0I7SUFDOUYsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFDdkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUNsQyxPQUFPLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQU5ELGdEQU1DO0FBVUQsTUFBTSxjQUFjO0lBTWxCO1FBSEEsZUFBVSxHQUFHLGdCQUFnQixDQUFDO1FBSTVCLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxjQUFjLENBQUMsRUFBRTtZQUNyQyxPQUFPLElBQUksY0FBYyxFQUFFLENBQUM7U0FDN0I7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLDZFQUE2RTtRQUNoRywrREFBK0Q7SUFDakUsQ0FBQztJQUVELFdBQVcsQ0FBQyxTQUFtQjtRQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDdkIsS0FBSyxNQUFNLFdBQVcsSUFBSSxTQUFTLEVBQUU7WUFDbkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ1YsU0FBUztZQUNYLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBQyxDQUFDO1lBQ3JFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDL0IsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzNCLCtDQUErQztvQkFDL0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUM1RTthQUNGO1lBQ0QsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFO2dCQUN4QiwyR0FBMkc7Z0JBQzNHLG9FQUFvRTtnQkFDcEUsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDM0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUM1RTthQUNGO1lBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtvQkFDckQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM1QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7aUJBQzVFO2FBQ0Y7U0FDRjtJQUNILENBQUM7SUFFRCxxQkFBcUI7UUFDbkIsK0pBQStKO1FBQy9KLGtIQUFrSDtRQUNsSCxtQkFBbUI7UUFDbkIsZ0lBQWdJO1FBQ2hJLDhDQUE4QztRQUM5Qyx1REFBdUQ7UUFFdkQsc0JBQXNCO1FBQ3RCLCtIQUErSDtRQUMvSCxVQUFVO1FBQ1YsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQVksRUFBRSxTQUFpQixFQUFFLFVBQWtCLEVBQUUsSUFBUyxFQUFFLFdBQW1CLEVBQUUsRUFBRTtZQUNuSCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUM7Z0JBQ2hDLE9BQU8sQ0FBQyw4SEFBOEg7WUFDeEksSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDOUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDeEcsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVEOztTQUVFO0lBQ0YsaUJBQWlCLENBQUMsS0FBYyxFQUFFLGFBQXNCO1FBQ3RELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixNQUFNLFFBQVEsR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFDbkMsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzRCxJQUFJLFVBQVUsRUFBRSxRQUFrQyxDQUFDO1FBRW5ELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsRUFBRTtZQUMxQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNqQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzdELFFBQVEsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDO1lBQ25DLElBQUksUUFBUSxJQUFJLElBQUk7Z0JBQ2xCLFFBQVEsR0FBRyxVQUFVLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztZQUMxQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLGFBQWE7Z0JBQ3hDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNqRCxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDakUsMEhBQTBIO2dCQUMxSCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDO29CQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQ3pCLENBQUMsQ0FBQyxDQUFDO1NBQ0o7YUFBTTtZQUNMLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM3QyxRQUFRLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQztTQUNwQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoQixpREFBaUQ7UUFDakQsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDdkIsT0FBTztRQUNULE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBRSxDQUFDLE1BQU0sQ0FBQztRQUVqRSw0Q0FBNEM7UUFFNUMsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN2QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQzVILFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDO1lBQ3hFLFFBQVEsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUMzRSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7WUFDakIsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLEVBQUU7Z0JBQzNCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQ25CLElBQUksSUFBSSxLQUFLLHFCQUFxQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3JFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDdkMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUM7b0JBQ2xDLE9BQU8sR0FBRyxJQUFJLENBQUM7aUJBQ2hCO2dCQUVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDOUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hHLFFBQVEsSUFBSSxHQUFHLFNBQVMsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUM7Z0JBQy9ILElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUMvQixLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3ZDLFFBQVEsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDO29CQUMvRyxDQUFDLEVBQUUsQ0FBQztpQkFDTDtnQkFDRCxRQUFRLEVBQUUsQ0FBQzthQUNaO1lBQ0QsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQy9ELEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDcEI7UUFDRCxxQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLElBQUksS0FBSyxFQUFFO1lBQ1QsaURBQWlEO1lBQ2pELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztZQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDOUIsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQVEsS0FBSyxLQUFLLEVBQUU7b0JBQ2xFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNwQjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDRCQUE0QixHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hFLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFjLEVBQUUsU0FBaUIsRUFBRSxVQUFrQixFQUFFLEVBQUU7Z0JBQ3BGLElBQUksVUFBVSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFO29CQUM3QyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDRCQUE0QixHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7aUJBQ2pFO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLFVBQVUsR0FBNEIsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZGLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNDLElBQUksV0FBVyxFQUFFO2dCQUNmLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDbkIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNuQixLQUFLLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRTtvQkFDNUIsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSTt3QkFDaEIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7d0JBRXJCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDdkM7Z0JBQ0QsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7b0JBQ3BCLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN4RCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztvQkFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ3JFO1lBQ0Qsd0VBQXdFO1lBQ3hFLDBDQUEwQztZQUMxQyxPQUFPLFdBQVcsQ0FBQztTQUNwQjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVTLGdCQUFnQixDQUFDLE9BQXFDLEVBQUUsSUFBWSxFQUFFLE9BQWUsRUFBRSxNQUFjLEVBQUUsSUFBWTtRQUMzSCxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNwQjtRQUNELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDakIsR0FBRyxFQUFFLE9BQU8sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTztZQUNuQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDNUIsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2xCLEVBQUUsRUFBRSxNQUFNO1lBQ1YsSUFBSTtTQUNMLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUyxvQkFBb0IsQ0FBQyxjQUF5QjtRQUN0RCxtQkFBbUI7UUFDbkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDekQsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUNoQyxNQUFNLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUVwQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUU7Z0JBQ3ZCLFNBQVM7WUFDWCxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNULE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFDRDs7O1NBR0U7SUFDUSxhQUFhLENBQUMsV0FBc0IsRUFBRSxJQUFZO1FBQzFELElBQUksV0FBVyxJQUFJLElBQUk7WUFDckIsT0FBTyxXQUFXLENBQUM7UUFDckIsSUFBSTtZQUNGLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ2hDLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUU7b0JBQ2hELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3hELElBQUksR0FBRyxLQUFLLENBQUM7d0JBQ1gsT0FBTyxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDaEQsQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7d0JBRWpELE9BQU8sR0FBRyxDQUFDO2lCQUNkO3FCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJO29CQUNyRCxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNQLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJO29CQUNuRCxPQUFPLENBQUMsQ0FBQztxQkFDTixJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7b0JBQzVCLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ1AsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHO29CQUM1QixPQUFPLENBQUMsQ0FBQzs7b0JBRVQsT0FBTyxDQUFDLENBQUM7WUFDYixDQUFDLENBQUMsQ0FBQztTQUNKO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixJQUFJLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDakcsTUFBTSxDQUFDLENBQUM7U0FDVDtRQUNELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vbGliL2NvbmZpZycpO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qgc2VtdmVyID0gcmVxdWlyZSgnc2VtdmVyJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnLi4vbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5jb25zdCBnZXRQYWNrYWdlSnNvbkd1YXJkZXIgPSByZXF1aXJlKCcuLi9saWIvZ3VscC9wYWNrYWdlSnNvbkd1YXJkZXInKTtcbmltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0Q29tcERlcGVuZGVuY3kocGtKc29uRmlsZXM6IHN0cmluZ1tdLCB3cml0ZTogYm9vbGVhbiwgaXNEcmNwU3ltbGluazogYm9vbGVhbikge1xuICAvLyBsb2cuaW5mbygnc2NhbiBjb21wb25lbnRzIGZyb206XFxuJywgcGtKc29uRmlsZXMuam9pbignXFxuJykpO1xuICBjb25zdCBpbnN0YWxsZXIgPSBuZXcgSW5zdGFsbE1hbmFnZXIoKTtcbiAgaW5zdGFsbGVyLnNjYW5TcmNEZXBzKHBrSnNvbkZpbGVzKTtcbiAgaW5zdGFsbGVyLnNjYW5JbnN0YWxsZWRQZWVyRGVwcygpO1xuICByZXR1cm4gaW5zdGFsbGVyLnByaW50Q29tcG9uZW50RGVwKHdyaXRlLCBpc0RyY3BTeW1saW5rKTtcbn1cblxuaW50ZXJmYWNlIERlcEluZm8ge1xuICB2ZXI6IHN0cmluZztcbiAgdmVyTnVtPzogc3RyaW5nO1xuICBwcmU6IHN0cmluZztcbiAgYnk6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xufVxuXG5jbGFzcyBJbnN0YWxsTWFuYWdlciB7XG5cbiAgc3JjRGVwczoge1twTmFtZTogc3RyaW5nXTogRGVwSW5mb1tdfTtcbiAgdmVyc2lvblJlZyA9IC9eKFxcRCopKFxcZC4qPykkLztcbiAgY29tcG9uZW50TWFwOiB7W3BOYW1lOiBzdHJpbmddOiB7dmVyOiBzdHJpbmcsIHRvSW5zdGFsbDogYm9vbGVhbn19O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBJbnN0YWxsTWFuYWdlcikpIHtcbiAgICAgIHJldHVybiBuZXcgSW5zdGFsbE1hbmFnZXIoKTtcbiAgICB9XG4gICAgdGhpcy5zcmNEZXBzID0ge307IC8vIHNyYyBwYWNrYWdlcyBuZWVkZWQgZGVwZW5kZW5jaWVzIGFuZCBhbGwgcGFja2FnZXMgbmVlZGVkIHBlZXIgZGVwZW5kZW5jaWVzXG4gICAgLy8gdGhpcy5wZWVyRGVwcyA9IHt9OyAvLyBhbGwgcGFja2FnZXMgbmVlZGVkIHBlZXIgZGVwZW5kZW5jaWVzXG4gIH1cblxuICBzY2FuU3JjRGVwcyhqc29uRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb21wb25lbnRNYXAgPSB7fTtcbiAgICBmb3IgKGNvbnN0IHBhY2thZ2VKc29uIG9mIGpzb25GaWxlcykge1xuICAgICAgbG9nLmRlYnVnKCdzY2FuU3JjRGVwc0FzeW5jKCkgJyArIFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIHBhY2thZ2VKc29uKSk7XG4gICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb24sICd1dGY4JykpO1xuICAgICAgaWYgKCFqc29uLmRyKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIHRoaXMuY29tcG9uZW50TWFwW2pzb24ubmFtZV0gPSB7dmVyOiBqc29uLnZlcnNpb24sIHRvSW5zdGFsbDogZmFsc2V9O1xuICAgICAgY29uc3QgZGVwcyA9IGpzb24uZGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKGRlcHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdzY2FuU3JjRGVwc0FzeW5jKCkgZGVwICcgKyBuYW1lKTtcbiAgICAgICAgICBzZWxmLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUsIHBhY2thZ2VKc29uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24uZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIC8vIGxvZy53YXJuKGAkJHtqc29uLm5hbWV9IGNvbnRhaW5zIFwiZGV2RGVwZW5lbmRpZXNcIiwgaWYgdGhleSBhcmUgbmVjZXNzYXJ5IGZvciBjb21waWxpbmcgdGhpcyBjb21wb25lbnRgICtcbiAgICAgICAgLy8gXHQneW91IHNob3VsZCBtb3ZlIHRoZW0gdG8gXCJkZXBlbmRlbmNpZXNcIiBvciBcInBlZXJEZXBlbmRlbmNpZXNcIicpO1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAgIHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSwgcGFja2FnZUpzb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICBzZWxmLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUsIHBhY2thZ2VKc29uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNjYW5JbnN0YWxsZWRQZWVyRGVwcygpIHtcbiAgICAvLyBUT0RPOiBIZXJlIEkgd2FudCB0byBkZXRlcm1pbmUgZXhwZWN0ZWQgY29tcG9uZW50IHZlcnNpb24gdG8gaW5zdGFsbCB3aXRoLCBidXQgc28gZmFyIHRoZSB2ZXJzaW9uIG51bWJlciBvZiBlYWNoIGNvbXBvbmVudCB0aGF0IEkgZ2V0IGlzIGN1cnJlbnRseSBpbnN0YWxsZWRcbiAgICAvLyBvbmUgd2hpY2ggbWlnaHQgYmUgaW5jb3JyZWN0IG9yIG91dGRhdGVkLCBpbiBjYXNlIGxpa2UgZGV2ZWxvcGVyIGRpZCBub3QgcnVuIFwieWFybiBpbnN0YWxsXCIgYmVmb3JlIFwiZHJjcCBpbml0XCIuXG4gICAgLy8gT25lIHByb2JsZW0gaXM6IFxuICAgIC8vIFdpdGhvdXQgcnVubmluZyBcInlhcm4gaW5zdGFsbFwiIHRvIGRvd25sb2FkIFwicmVjaXBlXCIgcGFja2FnZSwgSSBjYW4ndCBrbm93IGV4YWN0IHVwIHRvIGRhdGUgdmVyc2lvbiBudW1iZXIgb2YgdGhvc2UgY29tcG9uZW50c1xuICAgIC8vIHdoaWNoIGJlbG9uZyB0byBhIGNlcnRhaW4gXCJyZWNpcGVcIiBwYWNha2dlLlxuICAgIC8vIFNvIGZpcnN0bHksIGFsd2F5cyBcInlhcm4gaW5zdGFsbFwiIGJlZm9yZSBcImRyY3AgaW5pdFwiXG5cbiAgICAvLyBBbm90aGVyIHByb2JsZW0gaXM6XG4gICAgLy8gVGhlc2Ugb2xkIGNvbXBvbmVudCB2ZXJzaW9ucyBhcmUgdHJhY2tlZCBpbiBkaXN0L2RyLnBhY2thZ2UuanNvbiB3YWl0aW5nIGZvciBiZWluZyBjb21wYXJlZCB3aXRoIG5ld2x5IGNoYW5nZWQgdmVyc2lvbiBsaXN0LlxuICAgIC8vIEJ1dCAuLi5cbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKF8uaGFzKHRoaXMuY29tcG9uZW50TWFwLCBuYW1lKSlcbiAgICAgICAgcmV0dXJuOyAvLyBTa2lwIGl0LCBzaW5jZSBtb3N0IGxpa2VseSB0aGVyZSBpcyBhIGR1cGxpY2F0ZSBcImluc3RhbGxlZFwiIGRlcGVuZGVuY3kgaW4gcGFja2FnZS5qc29uIGFnYWluc3QgYW4gc3ltYm9saWMgbGlua2VkIGNvbXBvbmVudFxuICAgICAgdGhpcy5jb21wb25lbnRNYXBbbmFtZV0gPSB7dmVyOiBqc29uLnZlcnNpb24sIHRvSW5zdGFsbDogdHJ1ZX07XG4gICAgICBfLmVhY2goanNvbi5wZWVyRGVwZW5kZW5jaWVzLCAodmVyc2lvbiwgbmFtZSkgPT4ge1xuICAgICAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUsIFBhdGguam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2Uuam9zbicpKTtcbiAgICAgIH0pO1xuICAgIH0sICdpbnN0YWxsZWQnKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBAcmV0dXJuIHRydWUgaWYgdGhlcmUgYXJlIG5ld2x5IGZvdW5kIGRlcGVuZGVuY2llcyBhZGRlZCB0byBwYWNrYWdlLmpzb25cblx0ICovXG4gIHByaW50Q29tcG9uZW50RGVwKHdyaXRlOiBib29sZWFuLCBpc0RyY3BTeW1saW5rOiBib29sZWFuKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3Qgcm9vdFBhdGggPSBjb25maWcoKS5yb290UGF0aDtcbiAgICBjb25zdCBwYWNrYWdlSnNvbkd1YXJkZXIgPSBnZXRQYWNrYWdlSnNvbkd1YXJkZXIocm9vdFBhdGgpO1xuICAgIHZhciBtYWluUGtqc29uLCBtYWluRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuXG4gICAgaWYgKCFwYWNrYWdlSnNvbkd1YXJkZXIuaXNQYWNrYWdlSnNvbkRpcnR5KSB7XG4gICAgICBjb25zdCBtYWluUGtGaWxlID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgICBsb2cuaW5mbygnQ2hlY2tpbmcnLCBtYWluUGtGaWxlKTtcbiAgICAgIG1haW5Qa2pzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtYWluUGtGaWxlLCAndXRmOCcpKTtcbiAgICAgIG1haW5EZXBzID0gbWFpblBranNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAobWFpbkRlcHMgPT0gbnVsbClcbiAgICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKVxuICAgICAgICBfLmFzc2lnbihtYWluRGVwcywgbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXMpO1xuICAgICAgXy5lYWNoKHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCkuZGVwZW5kZW5jaWVzLCAodmVyLCBuYW1lKSA9PiB7XG4gICAgICAgIC8vIElmIHRoZXJlIGlzIGEgc2FtZSBkZXBlbmRlbmN5IGluIG9yaWdpbmFsIHBhY2thZ2UuanNvbiwgd2UgdXNlIHRoZSB2ZXJzaW9uIG9mIHRoYXQgb25lLCBjdXonIHRoYXQgbWlnaHQgYmUgbWFudWFsbHkgc2V0XG4gICAgICAgIGlmICghXy5oYXMobWFpbkRlcHMsIG5hbWUpKVxuICAgICAgICAgIG1haW5EZXBzW25hbWVdID0gdmVyO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1haW5Qa2pzb24gPSBwYWNrYWdlSnNvbkd1YXJkZXIuZ2V0Q2hhbmdlcygpO1xuICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcztcbiAgICB9XG5cbiAgICBjb25zdCBkZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuc3JjRGVwcyk7XG4gICAgZGVwTmFtZXMuc29ydCgpO1xuICAgIC8vIHZhciBwZWVyRGVwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLnBlZXJEZXBzKTtcbiAgICBpZiAoZGVwTmFtZXMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IG5hbWVXaWR0aCA9IF8ubWF4QnkoZGVwTmFtZXMsIG5hbWUgPT4gbmFtZS5sZW5ndGgpIS5sZW5ndGg7XG5cbiAgICAvLyBsb2cud2FybihPYmplY3Qua2V5cyh0aGlzLmNvbXBvbmVudE1hcCkpO1xuXG4gICAgaWYgKGRlcE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBwcmludE91dCA9IF8ucGFkKCcgQXNzb2NpYXRlZCBDb21wb25lbnRzIERlcGVuZGVuY2llcyAmICcgKyBjaGFsay5jeWFuKCdDb21wb25lbnRzIFBlZXIgRGVwZW5kZW5jaWVzJyksIDYwLCAnLScpICsgJ1xcbic7XG4gICAgICBwcmludE91dCArPSBfLnBhZFN0YXJ0KCdEZXBlbmRlbmN5ICcsIG5hbWVXaWR0aCArIDEzKSArICd8IERlcGVuZGVudFxcbic7XG4gICAgICBwcmludE91dCArPSBfLnJlcGVhdCgnLScsIG5hbWVXaWR0aCArIDEzKSArICd8JyArIF8ucmVwZWF0KCctJywgMTApICsgJ1xcbic7XG4gICAgICBsZXQgY291bnREZXAgPSAwO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGRlcE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IHZlcnNpb25MaXN0ID0gdGhpcy5zcmNEZXBzW25hbWVdO1xuICAgICAgICBjb25zdCBmaXJzdFZlcnNpb24gPSBzZWxmLnNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIG5hbWUpWzBdO1xuICAgICAgICBsZXQgbWFya05ldyA9ICcgICc7XG4gICAgICAgIGlmIChuYW1lICE9PSAnQGRyL2ludGVybmFsLXJlY2lwZScgJiYgKCFfLmhhcyh0aGlzLmNvbXBvbmVudE1hcCwgbmFtZSkpICYmXG4gICAgICAgICAgKG1haW5EZXBzW25hbWVdICE9PSBmaXJzdFZlcnNpb24udmVyKSkge1xuICAgICAgICAgIG1haW5EZXBzW25hbWVdID0gZmlyc3RWZXJzaW9uLnZlcjtcbiAgICAgICAgICBtYXJrTmV3ID0gJysgJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gc2VsZi5fY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG4gICAgICAgIGNvbnN0IHByaW50TmFtZSA9IChoYXNEaWZmVmVyc2lvbiA/IGNoYWxrLnJlZCA6IGNoYWxrLmN5YW4pKF8ucGFkU3RhcnQobWFya05ldyArIG5hbWUsIG5hbWVXaWR0aCwgJyAnKSk7XG4gICAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKGZpcnN0VmVyc2lvbi52ZXIsIDksICfilIAnKX0gJHtmaXJzdFZlcnNpb24uYnl9XFxuYDtcbiAgICAgICAgdmFyIGkgPSB2ZXJzaW9uTGlzdC5sZW5ndGggLSAxO1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3Qgb2YgdmVyc2lvbkxpc3Quc2xpY2UoMSkpIHtcbiAgICAgICAgICBwcmludE91dCArPSBgJHtfLnJlcGVhdCgnICcsIG5hbWVXaWR0aCl9ICR7aSA9PT0gMSA/ICcg4pSU4pSAJyA6ICcg4pSc4pSAJ30ke18ucGFkRW5kKHJlc3QudmVyLCA5LCAn4pSAJyl9ICR7cmVzdC5ieX1cXG5gO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgICBjb3VudERlcCsrO1xuICAgICAgfVxuICAgICAgcHJpbnRPdXQgKz0gXy5wYWQoYCB0b3RhbCAke2NoYWxrLmdyZWVuKGNvdW50RGVwKX0gYCwgNjAsICctJyk7XG4gICAgICBsb2cuaW5mbyhwcmludE91dCk7XG4gICAgfVxuICAgIG1rZGlycFN5bmMoY29uZmlnKCkuZGVzdERpcik7XG4gICAgaWYgKHdyaXRlKSB7XG4gICAgICAvLyBfLmFzc2lnbihtYWluUGtqc29uLmRlcGVuZGVuY2llcywgbmV3RGVwSnNvbik7XG4gICAgICBjb25zdCBkZWxldGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgXy5lYWNoKG1haW5EZXBzLCAoX3ZlciwgbmFtZSkgPT4ge1xuICAgICAgICBpZiAoXy5nZXQodGhpcy5jb21wb25lbnRNYXAsIFtuYW1lLCAndG9JbnN0YWxsJ10pIGFzIGFueSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBkZWxldGUgbWFpbkRlcHNbbmFtZV07XG4gICAgICAgICAgZGVsZXRlZC5wdXNoKG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGxvZy5pbmZvKGNoYWxrLmJsdWUoJ3NvdXJjZSBsaW5rZWQgZGVwZW5kZW5jeTogJyArIGRlbGV0ZWQuam9pbignLCAnKSkpO1xuICAgICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKChzcmNEaXI6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcsIHJlY2lwZU5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICBpZiAocmVjaXBlTmFtZSAmJiBfLmhhcyhtYWluRGVwcywgcmVjaXBlTmFtZSkpIHtcbiAgICAgICAgICBkZWxldGUgbWFpbkRlcHNbcmVjaXBlTmFtZV07XG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuYmx1ZSgnUmVtb3ZlIHJlY2lwZSBkZXBlbmRlbmN5OiAnICsgcmVjaXBlTmFtZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGNoYW5nZUxpc3Q6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gcGFja2FnZUpzb25HdWFyZGVyLm1hcmtDaGFuZ2VzKG1haW5Qa2pzb24pO1xuICAgICAgY29uc3QgbmVlZEluc3RhbGwgPSBfLnNpemUoY2hhbmdlTGlzdCkgPiAwO1xuICAgICAgaWYgKG5lZWRJbnN0YWxsKSB7XG4gICAgICAgIGNvbnN0IGNoYW5nZWQgPSBbXTtcbiAgICAgICAgY29uc3QgcmVtb3ZlZCA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHJvdyBvZiBjaGFuZ2VMaXN0KSB7XG4gICAgICAgICAgaWYgKHJvd1sxXSA9PSBudWxsKVxuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKHJvd1swXSk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgY2hhbmdlZC5wdXNoKHJvd1swXSArICdAJyArIHJvd1sxXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoYW5nZWQubGVuZ3RoID4gMClcbiAgICAgICAgICBsb2cuaW5mbygnQ2hhbmdlZCBkZXBlbmRlbmNpZXM6JywgY2hhbmdlZC5qb2luKCcsICcpKTtcbiAgICAgICAgaWYgKHJlbW92ZWQubGVuZ3RoID4gMClcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5ibHVlKCdSZW1vdmVkIGRlcGVuZGVuY2llczonKSwgcmVtb3ZlZC5qb2luKCcsICcpKTtcbiAgICAgIH1cbiAgICAgIC8vIGZzLndyaXRlRmlsZVN5bmMobWFpblBrRmlsZSwgSlNPTi5zdHJpbmdpZnkobWFpblBranNvbiwgbnVsbCwgJyAgJykpO1xuICAgICAgLy8gbG9nLmluZm8oJyVzIGlzIHdyaXR0ZW4uJywgbWFpblBrRmlsZSk7XG4gICAgICByZXR1cm4gbmVlZEluc3RhbGw7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tEZXBlbmRlbmN5KHRyYWNrVG86IHtbcE5hbWU6IHN0cmluZ106IERlcEluZm9bXX0sIG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKCFfLmhhcyh0cmFja1RvLCBuYW1lKSkge1xuICAgICAgdHJhY2tUb1tuYW1lXSA9IFtdO1xuICAgIH1cbiAgICBjb25zdCBtID0gdGhpcy52ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdHJhY2tUb1tuYW1lXS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob20sXG4gICAgICBwYXRoXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICAgIC8vIHZhciBzZWxmID0gdGhpcztcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNvbnN0IGEgPSBzb3J0ZWRWZXJzaW9uc1tpXS52ZXI7XG4gICAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgICAgY29udGludWU7XG4gICAgICBpZiAoYSAhPT0gYilcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvKipcblx0ICogU29ydCBieSBkZXNjZW5kaW5nXG5cdCAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cblx0ICovXG4gIHByb3RlY3RlZCBzb3J0QnlWZXJzaW9uKHZlckluZm9MaXN0OiBEZXBJbmZvW10sIG5hbWU6IHN0cmluZykge1xuICAgIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsKVxuICAgICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICAgIHRyeSB7XG4gICAgICB2ZXJJbmZvTGlzdC5zb3J0KChpbmZvMSwgaW5mbzIpID0+IHtcbiAgICAgICAgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gc2VtdmVyLnJjb21wYXJlKGluZm8xLnZlck51bSwgaW5mbzIudmVyTnVtKTtcbiAgICAgICAgICBpZiAocmVzID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGluZm8xLnByZSA9PT0gJycgJiYgaW5mbzIucHJlICE9PSAnJyA/IC0xIDpcbiAgICAgICAgICAgICAgKGluZm8xLnByZSAhPT0gJycgJiYgaW5mbzIucHJlID09PSAnJyA/IDEgOiAwKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzIudmVyTnVtICE9IG51bGwgJiYgaW5mbzEudmVyTnVtID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICB9XG59XG4iXX0=
