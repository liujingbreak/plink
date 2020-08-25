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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallManager = exports.listCompDependency = void 0;
/* tslint:disable max-line-length */
const fs = __importStar(require("fs"));
const fs_extra_1 = require("fs-extra");
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const config_1 = __importDefault(require("./config"));
const chalk = require('chalk');
const semver = require('semver');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
const package_json_guarder_1 = require("./package-json-guarder");
const recipeManager = __importStar(require("./recipe-manager"));
function listCompDependency(pkJsonFiles, workspace, workspaceDeps) {
    // log.info('scan components from:\n', pkJsonFiles.join('\n'));
    const installer = new InstallManager(workspaceDeps, workspace);
    if (pkJsonFiles.length === 0)
        return {};
    if (typeof pkJsonFiles[0] === 'string')
        installer.scanSrcDeps(pkJsonFiles);
    else
        installer.scanFor(pkJsonFiles);
    // installer.scanInstalledPeerDeps();
    return installer.hoistDeps();
}
exports.listCompDependency = listCompDependency;
const versionReg = /^(\D*)(\d.*?)(?:\.tgz)?$/;
class InstallManager {
    constructor(workspaceDeps, workspaceName) {
        if (!(this instanceof InstallManager)) {
            return new InstallManager(workspaceDeps, workspaceName);
        }
        this.srcDeps = {}; // src packages needed dependencies and all packages needed peer dependencies
        // this.peerDeps = {}; // all packages needed peer dependencies
        for (const [name, version] of Object.entries(workspaceDeps)) {
            this._trackDependency(this.srcDeps, name, version, workspaceName);
        }
    }
    scanFor(pkJsons) {
        const self = this;
        this.componentMap = {};
        for (const json of pkJsons) {
            this.componentMap[json.name] = { ver: json.version, toInstall: false };
            const deps = json.dependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    // log.debug('scanSrcDepsAsync() dep ' + name);
                    self._trackDependency(this.srcDeps, name, version, json.name);
                }
            }
            if (json.devDependencies) {
                log.warn(`$${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
                    'you should move them to "dependencies" or "peerDependencies"');
                // for (const name of Object.keys(json.devDependencies)) {
                //   const version = json.devDependencies[name];
                //   self._trackDependency(this.srcDeps, name, version, json.name);
                // }
            }
            if (json.peerDependencies) {
                for (const name of Object.keys(json.peerDependencies)) {
                    const version = json.peerDependencies[name];
                    self._trackDependency(this.srcDeps, name, version, json.name);
                }
            }
        }
    }
    scanSrcDeps(jsonFiles) {
        return this.scanFor(jsonFiles.map(packageJson => JSON.parse(fs.readFileSync(packageJson, 'utf8'))));
    }
    // scanInstalledPeerDeps() {
    //   // TODO: Here I want to determine expected component version to install with, but so far the version number of each component that I get is currently installed
    //   // one which might be incorrect or outdated, in case like developer did not run "yarn install" before "drcp init".
    //   // One problem is: 
    //   // Without running "yarn install" to download "recipe" package, I can't know exact up to date version number of those components
    //   // which belong to a certain "recipe" pacakge.
    //   // So firstly, always "yarn install" before "drcp init"
    //   // Another problem is:
    //   // These old component versions are tracked in dist/dr.package.json waiting for being compared with newly changed version list.
    //   // But ...
    //   packageUtils.findAllPackages((name, entryPath: string, parsedName, json, packagePath) => {
    //     if (_.has(this.componentMap, name))
    //       return; // Skip it, since most likely there is a duplicate "installed" dependency in package.json against an symbolic linked component
    //     this.componentMap[name] = {ver: json.version, toInstall: true};
    //     _.each(json.peerDependencies, (version, name) => {
    //       this._trackDependency(this.srcDeps, name, version, json.name);
    //     });
    //   }, 'installed');
    // }
    hoistDeps() {
        const hoistDeps = {};
        const depNames = Object.keys(this.srcDeps);
        if (depNames.length === 0)
            return {};
        depNames.sort();
        const nameWidth = _.maxBy(depNames, name => name.length).length;
        let printOut = _.pad(' Hoisted Dependencies', 60, '-') + '\n';
        printOut += _.padStart('Dependency ', nameWidth + 13) + '| Dependent\n';
        printOut += _.repeat('-', nameWidth + 13) + '|' + _.repeat('-', 10) + '\n';
        let countDep = 0;
        for (const name of depNames) {
            const versionList = this.srcDeps[name];
            const firstVersion = this.sortByVersion(versionList, name)[0];
            // tslint:disable-next-line: prefer-const
            let markNew = '  ';
            const hasDiffVersion = this._containsDiffVersion(versionList);
            const printName = (hasDiffVersion ? chalk.red : chalk.cyan)(_.padStart(markNew + name, nameWidth, ' '));
            printOut += `${printName} ${versionList.length > 1 ? '─┬─' : '───'}${_.padEnd(' ' + firstVersion.ver + ' ', 9, ' ')} ${firstVersion.by}\n`;
            var i = versionList.length - 1;
            for (const rest of versionList.slice(1)) {
                printOut += `${_.repeat(' ', nameWidth)} ${i === 1 ? ' └─' : ' ├─'}${_.padEnd(' ' + rest.ver + ' ', 9, ' ')} ${rest.by}\n`;
                i--;
            }
            countDep++;
            hoistDeps[name] = firstVersion.ver;
        }
        printOut += _.pad(` total ${chalk.green(countDep)} `, 60, '-');
        log.info(printOut);
        return hoistDeps;
    }
    /**
       * @return true if there are newly found dependencies added to package.json
       */
    printComponentDep(write) {
        const self = this;
        const rootPath = config_1.default().rootPath;
        const packageJsonGuarder = package_json_guarder_1.getInstance(rootPath);
        let mainPkjson;
        let mainDeps;
        let mainDevDeps;
        if (!packageJsonGuarder.isPackageJsonDirty) {
            const mainPkFile = Path.resolve(rootPath, 'package.json');
            log.info('Checking', mainPkFile);
            mainPkjson = JSON.parse(fs.readFileSync(mainPkFile, 'utf8'));
            mainDeps = mainPkjson.dependencies;
            mainDevDeps = mainPkjson.devDependencies;
            if (mainDeps == null)
                mainDeps = mainPkjson.dependencies = {};
            if (mainDevDeps == null)
                mainDevDeps = mainPkjson.devDependencies = {};
            // if (process.env.NODE_ENV !== 'production')
            //   _.assign(mainDeps, mainPkjson.devDependencies);
            _.each(packageJsonGuarder.getChanges().dependencies, (ver, name) => {
                // If there is a same dependency in original package.json, we use the version of that one, cuz' that might be manually set
                if (!_.has(mainDeps, name))
                    mainDeps[name] = ver;
            });
        }
        else {
            mainPkjson = packageJsonGuarder.getChanges();
            mainDeps = mainPkjson.dependencies || {};
            mainDevDeps = mainPkjson.devDependencies || {};
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
        fs_extra_1.mkdirpSync(config_1.default().destDir);
        if (write) {
            // _.assign(mainPkjson.dependencies, newDepJson);
            const deleted = [];
            for (const depList of [mainDeps, mainDevDeps]) {
                for (const name of Object.keys(depList)) {
                    if (_.get(this.componentMap, [name, 'toInstall']) === false) {
                        delete mainDeps[name];
                        deleted.push(name);
                    }
                }
            }
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
    _trackDependency(trackTo, name, version, byWhom) {
        if (!_.has(trackTo, name)) {
            trackTo[name] = [];
        }
        const m = versionReg.exec(version);
        trackTo[name].push({
            ver: version === '*' ? '' : version,
            verNum: m ? m[2] : undefined,
            pre: m ? m[1] : '',
            by: byWhom
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
        if (verInfoList == null || verInfoList.length === 1)
            return verInfoList;
        try {
            verInfoList.sort((info1, info2) => {
                if (info1.verNum != null && info2.verNum != null) {
                    try {
                        const res = semver.rcompare(info1.verNum, info2.verNum);
                        if (res === 0)
                            return info1.pre === '' && info2.pre !== '' ? -1 :
                                (info1.pre !== '' && info2.pre === '' ? 1 : 0);
                        else
                            return res;
                    }
                    catch (e) {
                        log.warn(info1, info2);
                    }
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
exports.InstallManager = InstallManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLHVDQUF5QjtBQUN6Qix1Q0FBb0M7QUFDcEMsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QixzREFBOEI7QUFDOUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBRW5GLGlFQUE0RTtBQUM1RSxnRUFBa0Q7QUFTbEQsU0FBZ0Isa0JBQWtCLENBQ2hDLFdBQTJDLEVBQzNDLFNBQWlCLEVBQ2pCLGFBQXVDO0lBRXZDLCtEQUErRDtJQUMvRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDL0QsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUM7UUFBRSxPQUFPLEVBQUUsQ0FBQztJQUN4QyxJQUFJLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVE7UUFDcEMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUF1QixDQUFDLENBQUM7O1FBRS9DLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBa0MsQ0FBQyxDQUFDO0lBQ3hELHFDQUFxQztJQUNyQyxPQUFPLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUMvQixDQUFDO0FBZEQsZ0RBY0M7QUFTRCxNQUFNLFVBQVUsR0FBRywwQkFBMEIsQ0FBQztBQUU5QyxNQUFhLGNBQWM7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RyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN4RyxRQUFRLElBQUksR0FBRyxTQUFTLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUM7WUFDM0ksSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDL0IsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN2QyxRQUFRLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDO2dCQUMzSCxDQUFDLEVBQUUsQ0FBQzthQUNMO1lBQ0QsUUFBUSxFQUFFLENBQUM7WUFFWCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQztTQUNwQztRQUNELFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUs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LENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7OzRCQUVqRCxPQUFPLEdBQUcsQ0FBQztxQkFDZDtvQkFBQyxPQUFPLENBQUMsRUFBRTt3QkFDVixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztxQkFDeEI7aUJBQ0Y7cUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ3JELE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ1AsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ25ELE9BQU8sQ0FBQyxDQUFDO3FCQUNOLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztvQkFDNUIsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDUCxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7b0JBQzVCLE9BQU8sQ0FBQyxDQUFDOztvQkFFVCxPQUFPLENBQUMsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsQ0FBQztTQUNUO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBOVJELHdDQThSQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5cbmltcG9ydCB7Z2V0SW5zdGFuY2UgYXMgZ2V0UGFja2FnZUpzb25HdWFyZGVyfSBmcm9tICcuL3BhY2thZ2UtanNvbi1ndWFyZGVyJztcbmltcG9ydCAqIGFzIHJlY2lwZU1hbmFnZXIgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogc3RyaW5nW10gfCBQYWNrYWdlSnNvbkludGVyZltdLFxuICB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgd29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9XG4pOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfSB7XG4gIC8vIGxvZy5pbmZvKCdzY2FuIGNvbXBvbmVudHMgZnJvbTpcXG4nLCBwa0pzb25GaWxlcy5qb2luKCdcXG4nKSk7XG4gIGNvbnN0IGluc3RhbGxlciA9IG5ldyBJbnN0YWxsTWFuYWdlcih3b3Jrc3BhY2VEZXBzLCB3b3Jrc3BhY2UpO1xuICBpZiAocGtKc29uRmlsZXMubGVuZ3RoID09PSAwKSByZXR1cm4ge307XG4gIGlmICh0eXBlb2YgcGtKc29uRmlsZXNbMF0gPT09ICdzdHJpbmcnKVxuICAgIGluc3RhbGxlci5zY2FuU3JjRGVwcyhwa0pzb25GaWxlcyBhcyBzdHJpbmdbXSk7XG4gIGVsc2VcbiAgICBpbnN0YWxsZXIuc2NhbkZvcihwa0pzb25GaWxlcyBhcyBQYWNrYWdlSnNvbkludGVyZltdKTtcbiAgLy8gaW5zdGFsbGVyLnNjYW5JbnN0YWxsZWRQZWVyRGVwcygpO1xuICByZXR1cm4gaW5zdGFsbGVyLmhvaXN0RGVwcygpO1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xufVxuXG5jb25zdCB2ZXJzaW9uUmVnID0gL14oXFxEKikoXFxkLio/KSg/OlxcLnRneik/JC87XG5cbmV4cG9ydCBjbGFzcyBJbnN0YWxsTWFuYWdlciB7XG5cbiAgc3JjRGVwczoge1twTmFtZTogc3RyaW5nXTogRGVwSW5mb1tdfTtcbiAgY29tcG9uZW50TWFwOiB7W3BOYW1lOiBzdHJpbmddOiB7dmVyOiBzdHJpbmcsIHRvSW5zdGFsbDogYm9vbGVhbn19O1xuXG4gIGNvbnN0cnVjdG9yKHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSwgd29ya3NwYWNlTmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEluc3RhbGxNYW5hZ2VyKSkge1xuICAgICAgcmV0dXJuIG5ldyBJbnN0YWxsTWFuYWdlcih3b3Jrc3BhY2VEZXBzLCB3b3Jrc3BhY2VOYW1lKTtcbiAgICB9XG4gICAgdGhpcy5zcmNEZXBzID0ge307IC8vIHNyYyBwYWNrYWdlcyBuZWVkZWQgZGVwZW5kZW5jaWVzIGFuZCBhbGwgcGFja2FnZXMgbmVlZGVkIHBlZXIgZGVwZW5kZW5jaWVzXG4gICAgLy8gdGhpcy5wZWVyRGVwcyA9IHt9OyAvLyBhbGwgcGFja2FnZXMgbmVlZGVkIHBlZXIgZGVwZW5kZW5jaWVzXG5cbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh3b3Jrc3BhY2VEZXBzKSkge1xuICAgICAgdGhpcy5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwgd29ya3NwYWNlTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgc2NhbkZvcihwa0pzb25zOiBQYWNrYWdlSnNvbkludGVyZltdKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jb21wb25lbnRNYXAgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGpzb24gb2YgcGtKc29ucykge1xuICAgICAgdGhpcy5jb21wb25lbnRNYXBbanNvbi5uYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiBmYWxzZX07XG4gICAgICBjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuICAgICAgICAgIHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBsb2cud2FybihgJCR7anNvbi5uYW1lfSBjb250YWlucyBcImRldkRlcGVuZW5kaWVzXCIsIGlmIHRoZXkgYXJlIG5lY2Vzc2FyeSBmb3IgY29tcGlsaW5nIHRoaXMgY29tcG9uZW50YCArXG4gICAgICAgICAgJ3lvdSBzaG91bGQgbW92ZSB0aGVtIHRvIFwiZGVwZW5kZW5jaWVzXCIgb3IgXCJwZWVyRGVwZW5kZW5jaWVzXCInKTtcbiAgICAgICAgLy8gZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24uZGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAvLyAgIGNvbnN0IHZlcnNpb24gPSBqc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgLy8gICBzZWxmLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICBzZWxmLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2NhblNyY0RlcHMoanNvbkZpbGVzOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiB0aGlzLnNjYW5Gb3IoanNvbkZpbGVzLm1hcChwYWNrYWdlSnNvbiA9PiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwgJ3V0ZjgnKSkpKTtcbiAgfVxuXG4gIC8vIHNjYW5JbnN0YWxsZWRQZWVyRGVwcygpIHtcbiAgLy8gICAvLyBUT0RPOiBIZXJlIEkgd2FudCB0byBkZXRlcm1pbmUgZXhwZWN0ZWQgY29tcG9uZW50IHZlcnNpb24gdG8gaW5zdGFsbCB3aXRoLCBidXQgc28gZmFyIHRoZSB2ZXJzaW9uIG51bWJlciBvZiBlYWNoIGNvbXBvbmVudCB0aGF0IEkgZ2V0IGlzIGN1cnJlbnRseSBpbnN0YWxsZWRcbiAgLy8gICAvLyBvbmUgd2hpY2ggbWlnaHQgYmUgaW5jb3JyZWN0IG9yIG91dGRhdGVkLCBpbiBjYXNlIGxpa2UgZGV2ZWxvcGVyIGRpZCBub3QgcnVuIFwieWFybiBpbnN0YWxsXCIgYmVmb3JlIFwiZHJjcCBpbml0XCIuXG4gIC8vICAgLy8gT25lIHByb2JsZW0gaXM6IFxuICAvLyAgIC8vIFdpdGhvdXQgcnVubmluZyBcInlhcm4gaW5zdGFsbFwiIHRvIGRvd25sb2FkIFwicmVjaXBlXCIgcGFja2FnZSwgSSBjYW4ndCBrbm93IGV4YWN0IHVwIHRvIGRhdGUgdmVyc2lvbiBudW1iZXIgb2YgdGhvc2UgY29tcG9uZW50c1xuICAvLyAgIC8vIHdoaWNoIGJlbG9uZyB0byBhIGNlcnRhaW4gXCJyZWNpcGVcIiBwYWNha2dlLlxuICAvLyAgIC8vIFNvIGZpcnN0bHksIGFsd2F5cyBcInlhcm4gaW5zdGFsbFwiIGJlZm9yZSBcImRyY3AgaW5pdFwiXG5cbiAgLy8gICAvLyBBbm90aGVyIHByb2JsZW0gaXM6XG4gIC8vICAgLy8gVGhlc2Ugb2xkIGNvbXBvbmVudCB2ZXJzaW9ucyBhcmUgdHJhY2tlZCBpbiBkaXN0L2RyLnBhY2thZ2UuanNvbiB3YWl0aW5nIGZvciBiZWluZyBjb21wYXJlZCB3aXRoIG5ld2x5IGNoYW5nZWQgdmVyc2lvbiBsaXN0LlxuICAvLyAgIC8vIEJ1dCAuLi5cbiAgLy8gICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKChuYW1lLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZSwganNvbiwgcGFja2FnZVBhdGgpID0+IHtcbiAgLy8gICAgIGlmIChfLmhhcyh0aGlzLmNvbXBvbmVudE1hcCwgbmFtZSkpXG4gIC8vICAgICAgIHJldHVybjsgLy8gU2tpcCBpdCwgc2luY2UgbW9zdCBsaWtlbHkgdGhlcmUgaXMgYSBkdXBsaWNhdGUgXCJpbnN0YWxsZWRcIiBkZXBlbmRlbmN5IGluIHBhY2thZ2UuanNvbiBhZ2FpbnN0IGFuIHN5bWJvbGljIGxpbmtlZCBjb21wb25lbnRcbiAgLy8gICAgIHRoaXMuY29tcG9uZW50TWFwW25hbWVdID0ge3ZlcjoganNvbi52ZXJzaW9uLCB0b0luc3RhbGw6IHRydWV9O1xuICAvLyAgICAgXy5lYWNoKGpzb24ucGVlckRlcGVuZGVuY2llcywgKHZlcnNpb24sIG5hbWUpID0+IHtcbiAgLy8gICAgICAgdGhpcy5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgLy8gICAgIH0pO1xuICAvLyAgIH0sICdpbnN0YWxsZWQnKTtcbiAgLy8gfVxuXG4gIGhvaXN0RGVwcygpIHtcbiAgICBjb25zdCBob2lzdERlcHM6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgICBjb25zdCBkZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuc3JjRGVwcyk7XG4gICAgaWYgKGRlcE5hbWVzLmxlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybiB7fTtcbiAgICBkZXBOYW1lcy5zb3J0KCk7XG4gICAgY29uc3QgbmFtZVdpZHRoID0gXy5tYXhCeShkZXBOYW1lcywgbmFtZSA9PiBuYW1lLmxlbmd0aCkhLmxlbmd0aDtcbiAgICBsZXQgcHJpbnRPdXQgPSBfLnBhZCgnIEhvaXN0ZWQgRGVwZW5kZW5jaWVzJywgNjAsICctJykgKyAnXFxuJztcbiAgICBwcmludE91dCArPSBfLnBhZFN0YXJ0KCdEZXBlbmRlbmN5ICcsIG5hbWVXaWR0aCArIDEzKSArICd8IERlcGVuZGVudFxcbic7XG4gICAgcHJpbnRPdXQgKz0gXy5yZXBlYXQoJy0nLCBuYW1lV2lkdGggKyAxMykgKyAnfCcgKyBfLnJlcGVhdCgnLScsIDEwKSArICdcXG4nO1xuICAgIGxldCBjb3VudERlcCA9IDA7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGRlcE5hbWVzKSB7XG4gICAgICBjb25zdCB2ZXJzaW9uTGlzdCA9IHRoaXMuc3JjRGVwc1tuYW1lXTtcbiAgICAgIGNvbnN0IGZpcnN0VmVyc2lvbiA9IHRoaXMuc29ydEJ5VmVyc2lvbih2ZXJzaW9uTGlzdCwgbmFtZSlbMF07XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IHByZWZlci1jb25zdFxuICAgICAgbGV0IG1hcmtOZXcgPSAnICAnO1xuXG4gICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IHRoaXMuX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuICAgICAgY29uc3QgcHJpbnROYW1lID0gKGhhc0RpZmZWZXJzaW9uID8gY2hhbGsucmVkIDogY2hhbGsuY3lhbikoXy5wYWRTdGFydChtYXJrTmV3ICsgbmFtZSwgbmFtZVdpZHRoLCAnICcpKTtcbiAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKCcgJyArIGZpcnN0VmVyc2lvbi52ZXIgKyAnICcsIDksICcgJyl9ICR7Zmlyc3RWZXJzaW9uLmJ5fVxcbmA7XG4gICAgICB2YXIgaSA9IHZlcnNpb25MaXN0Lmxlbmd0aCAtIDE7XG4gICAgICBmb3IgKGNvbnN0IHJlc3Qgb2YgdmVyc2lvbkxpc3Quc2xpY2UoMSkpIHtcbiAgICAgICAgcHJpbnRPdXQgKz0gYCR7Xy5yZXBlYXQoJyAnLCBuYW1lV2lkdGgpfSAke2kgPT09IDEgPyAnIOKUlOKUgCcgOiAnIOKUnOKUgCd9JHtfLnBhZEVuZCgnICcgKyByZXN0LnZlciArICcgJywgOSwgJyAnKX0gJHtyZXN0LmJ5fVxcbmA7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICAgIGNvdW50RGVwKys7XG5cbiAgICAgIGhvaXN0RGVwc1tuYW1lXSA9IGZpcnN0VmVyc2lvbi52ZXI7XG4gICAgfVxuICAgIHByaW50T3V0ICs9IF8ucGFkKGAgdG90YWwgJHtjaGFsay5ncmVlbihjb3VudERlcCl9IGAsIDYwLCAnLScpO1xuICAgIGxvZy5pbmZvKHByaW50T3V0KTtcblxuICAgIHJldHVybiBob2lzdERlcHM7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiB0cnVlIGlmIHRoZXJlIGFyZSBuZXdseSBmb3VuZCBkZXBlbmRlbmNpZXMgYWRkZWQgdG8gcGFja2FnZS5qc29uXG5cdCAqL1xuICBwcmludENvbXBvbmVudERlcCh3cml0ZTogYm9vbGVhbikge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IHJvb3RQYXRoID0gY29uZmlnKCkucm9vdFBhdGg7XG4gICAgY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0UGFja2FnZUpzb25HdWFyZGVyKHJvb3RQYXRoKTtcbiAgICBsZXQgbWFpblBranNvbjoge2RlcGVuZGVuY2llczogYW55LCBkZXZEZXBlbmRlbmNpZXM6IGFueX07XG4gICAgbGV0IG1haW5EZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gICAgbGV0IG1haW5EZXZEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG5cbiAgICBpZiAoIXBhY2thZ2VKc29uR3VhcmRlci5pc1BhY2thZ2VKc29uRGlydHkpIHtcbiAgICAgIGNvbnN0IG1haW5Qa0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGxvZy5pbmZvKCdDaGVja2luZycsIG1haW5Qa0ZpbGUpO1xuICAgICAgbWFpblBranNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1haW5Qa0ZpbGUsICd1dGY4JykpO1xuICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIG1haW5EZXZEZXBzID0gbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXM7XG4gICAgICBpZiAobWFpbkRlcHMgPT0gbnVsbClcbiAgICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgaWYgKG1haW5EZXZEZXBzID09IG51bGwpXG4gICAgICAgIG1haW5EZXZEZXBzID0gbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcblxuICAgICAgLy8gaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpXG4gICAgICAvLyAgIF8uYXNzaWduKG1haW5EZXBzLCBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyk7XG4gICAgICBfLmVhY2gocGFja2FnZUpzb25HdWFyZGVyLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXMsICh2ZXIsIG5hbWUpID0+IHtcbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBzYW1lIGRlcGVuZGVuY3kgaW4gb3JpZ2luYWwgcGFja2FnZS5qc29uLCB3ZSB1c2UgdGhlIHZlcnNpb24gb2YgdGhhdCBvbmUsIGN1eicgdGhhdCBtaWdodCBiZSBtYW51YWxseSBzZXRcbiAgICAgICAgaWYgKCFfLmhhcyhtYWluRGVwcywgbmFtZSkpXG4gICAgICAgICAgbWFpbkRlcHNbbmFtZV0gPSB2ZXI7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWFpblBranNvbiA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCk7XG4gICAgICBtYWluRGVwcyA9IG1haW5Qa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9O1xuICAgICAgbWFpbkRldkRlcHMgPSBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuc3JjRGVwcyk7XG4gICAgZGVwTmFtZXMuc29ydCgpO1xuICAgIC8vIHZhciBwZWVyRGVwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLnBlZXJEZXBzKTtcbiAgICBpZiAoZGVwTmFtZXMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IG5hbWVXaWR0aCA9IF8ubWF4QnkoZGVwTmFtZXMsIG5hbWUgPT4gbmFtZS5sZW5ndGgpIS5sZW5ndGg7XG5cbiAgICAvLyBsb2cud2FybihPYmplY3Qua2V5cyh0aGlzLmNvbXBvbmVudE1hcCkpO1xuXG4gICAgaWYgKGRlcE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBwcmludE91dCA9IF8ucGFkKCcgQXNzb2NpYXRlZCBDb21wb25lbnRzIERlcGVuZGVuY2llcyAmICcgKyBjaGFsay5jeWFuKCdDb21wb25lbnRzIFBlZXIgRGVwZW5kZW5jaWVzJyksIDYwLCAnLScpICsgJ1xcbic7XG4gICAgICBwcmludE91dCArPSBfLnBhZFN0YXJ0KCdEZXBlbmRlbmN5ICcsIG5hbWVXaWR0aCArIDEzKSArICd8IERlcGVuZGVudFxcbic7XG4gICAgICBwcmludE91dCArPSBfLnJlcGVhdCgnLScsIG5hbWVXaWR0aCArIDEzKSArICd8JyArIF8ucmVwZWF0KCctJywgMTApICsgJ1xcbic7XG4gICAgICBsZXQgY291bnREZXAgPSAwO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGRlcE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IHZlcnNpb25MaXN0ID0gdGhpcy5zcmNEZXBzW25hbWVdO1xuICAgICAgICBjb25zdCBmaXJzdFZlcnNpb24gPSBzZWxmLnNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIG5hbWUpWzBdO1xuICAgICAgICBsZXQgbWFya05ldyA9ICcgICc7XG4gICAgICAgIGlmIChuYW1lICE9PSAnQGRyL2ludGVybmFsLXJlY2lwZScgJiYgKCFfLmhhcyh0aGlzLmNvbXBvbmVudE1hcCwgbmFtZSkpICYmXG4gICAgICAgICAgKG1haW5EZXBzW25hbWVdICE9PSBmaXJzdFZlcnNpb24udmVyKSkge1xuICAgICAgICAgIG1haW5EZXBzW25hbWVdID0gZmlyc3RWZXJzaW9uLnZlcjtcbiAgICAgICAgICBtYXJrTmV3ID0gJysgJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gc2VsZi5fY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG4gICAgICAgIGNvbnN0IHByaW50TmFtZSA9IChoYXNEaWZmVmVyc2lvbiA/IGNoYWxrLnJlZCA6IGNoYWxrLmN5YW4pKF8ucGFkU3RhcnQobWFya05ldyArIG5hbWUsIG5hbWVXaWR0aCwgJyAnKSk7XG4gICAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKGZpcnN0VmVyc2lvbi52ZXIsIDksICfilIAnKX0gJHtmaXJzdFZlcnNpb24uYnl9XFxuYDtcbiAgICAgICAgdmFyIGkgPSB2ZXJzaW9uTGlzdC5sZW5ndGggLSAxO1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3Qgb2YgdmVyc2lvbkxpc3Quc2xpY2UoMSkpIHtcbiAgICAgICAgICBwcmludE91dCArPSBgJHtfLnJlcGVhdCgnICcsIG5hbWVXaWR0aCl9ICR7aSA9PT0gMSA/ICcg4pSU4pSAJyA6ICcg4pSc4pSAJ30ke18ucGFkRW5kKHJlc3QudmVyLCA5LCAn4pSAJyl9ICR7cmVzdC5ieX1cXG5gO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgICBjb3VudERlcCsrO1xuICAgICAgfVxuICAgICAgcHJpbnRPdXQgKz0gXy5wYWQoYCB0b3RhbCAke2NoYWxrLmdyZWVuKGNvdW50RGVwKX0gYCwgNjAsICctJyk7XG4gICAgICBsb2cuaW5mbyhwcmludE91dCk7XG4gICAgfVxuICAgIG1rZGlycFN5bmMoY29uZmlnKCkuZGVzdERpcik7XG4gICAgaWYgKHdyaXRlKSB7XG4gICAgICAvLyBfLmFzc2lnbihtYWluUGtqc29uLmRlcGVuZGVuY2llcywgbmV3RGVwSnNvbik7XG4gICAgICBjb25zdCBkZWxldGVkOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICBmb3IgKGNvbnN0IGRlcExpc3Qgb2YgW21haW5EZXBzLCBtYWluRGV2RGVwc10pIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcExpc3QpKSB7XG4gICAgICAgICAgaWYgKF8uZ2V0KHRoaXMuY29tcG9uZW50TWFwLCBbbmFtZSwgJ3RvSW5zdGFsbCddKSBhcyBhbnkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkZWxldGUgbWFpbkRlcHNbbmFtZV07XG4gICAgICAgICAgICBkZWxldGVkLnB1c2gobmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhjaGFsay5ibHVlKCdzb3VyY2UgbGlua2VkIGRlcGVuZGVuY3k6ICcgKyBkZWxldGVkLmpvaW4oJywgJykpKTtcbiAgICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYygoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLCByZWNpcGVOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKHJlY2lwZU5hbWUgJiYgXy5oYXMobWFpbkRlcHMsIHJlY2lwZU5hbWUpKSB7XG4gICAgICAgICAgZGVsZXRlIG1haW5EZXBzW3JlY2lwZU5hbWVdO1xuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmJsdWUoJ1JlbW92ZSByZWNpcGUgZGVwZW5kZW5jeTogJyArIHJlY2lwZU5hbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBjaGFuZ2VMaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IHBhY2thZ2VKc29uR3VhcmRlci5tYXJrQ2hhbmdlcyhtYWluUGtqc29uKTtcbiAgICAgIGNvbnN0IG5lZWRJbnN0YWxsID0gXy5zaXplKGNoYW5nZUxpc3QpID4gMDtcbiAgICAgIGlmIChuZWVkSW5zdGFsbCkge1xuICAgICAgICBjb25zdCBjaGFuZ2VkID0gW107XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgY2hhbmdlTGlzdCkge1xuICAgICAgICAgIGlmIChyb3dbMV0gPT0gbnVsbClcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChyb3dbMF0pO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNoYW5nZWQucHVzaChyb3dbMF0gKyAnQCcgKyByb3dbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oJ0NoYW5nZWQgZGVwZW5kZW5jaWVzOicsIGNoYW5nZWQuam9pbignLCAnKSk7XG4gICAgICAgIGlmIChyZW1vdmVkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuYmx1ZSgnUmVtb3ZlZCBkZXBlbmRlbmNpZXM6JyksIHJlbW92ZWQuam9pbignLCAnKSk7XG4gICAgICB9XG4gICAgICAvLyBmcy53cml0ZUZpbGVTeW5jKG1haW5Qa0ZpbGUsIEpTT04uc3RyaW5naWZ5KG1haW5Qa2pzb24sIG51bGwsICcgICcpKTtcbiAgICAgIC8vIGxvZy5pbmZvKCclcyBpcyB3cml0dGVuLicsIG1haW5Qa0ZpbGUpO1xuICAgICAgcmV0dXJuIG5lZWRJbnN0YWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrRGVwZW5kZW5jeSh0cmFja1RvOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119LCBuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAoIV8uaGFzKHRyYWNrVG8sIG5hbWUpKSB7XG4gICAgICB0cmFja1RvW25hbWVdID0gW107XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdHJhY2tUb1tuYW1lXS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY29udGFpbnNEaWZmVmVyc2lvbihzb3J0ZWRWZXJzaW9uczogRGVwSW5mb1tdKSB7XG4gICAgLy8gdmFyIHNlbGYgPSB0aGlzO1xuICAgIGZvciAobGV0IGkgPSAwLCBsID0gc29ydGVkVmVyc2lvbnMubGVuZ3RoIC0gMTsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgYSA9IHNvcnRlZFZlcnNpb25zW2ldLnZlcjtcbiAgICAgIGNvbnN0IGIgPSBzb3J0ZWRWZXJzaW9uc1tpICsgMV0udmVyO1xuXG4gICAgICBpZiAoYiA9PT0gJyonIHx8IGIgPT09ICcnKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGlmIChhICE9PSBiKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8qKlxuXHQgKiBTb3J0IGJ5IGRlc2NlbmRpbmdcblx0ICogQHBhcmFtIHZlckluZm9MaXN0IHt2ZXI6IHN0cmluZywgYnk6IHN0cmluZywgbmFtZTogc3RyaW5nfVxuXHQgKi9cbiAgcHJvdGVjdGVkIHNvcnRCeVZlcnNpb24odmVySW5mb0xpc3Q6IERlcEluZm9bXSwgbmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKHZlckluZm9MaXN0ID09IG51bGwgfHwgdmVySW5mb0xpc3QubGVuZ3RoID09PSAxKVxuICAgICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICAgIHRyeSB7XG4gICAgICB2ZXJJbmZvTGlzdC5zb3J0KChpbmZvMSwgaW5mbzIpID0+IHtcbiAgICAgICAgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSAhPSBudWxsKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgICBpZiAocmVzID09PSAwKVxuICAgICAgICAgICAgICByZXR1cm4gaW5mbzEucHJlID09PSAnJyAmJiBpbmZvMi5wcmUgIT09ICcnID8gLTEgOlxuICAgICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbG9nLndhcm4oaW5mbzEsIGluZm8yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICBlbHNlIGlmIChpbmZvMi52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMS52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzEudmVyID4gaW5mbzIudmVyKVxuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzEudmVyIDwgaW5mbzIudmVyKVxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cuZXJyb3IoYEludmFsaWQgc2VtdmVyIGZvcm1hdCBmb3IgJHtuYW1lIHx8ICcnfTogYCArIEpTT04uc3RyaW5naWZ5KHZlckluZm9MaXN0LCBudWxsLCAnICAnKSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICByZXR1cm4gdmVySW5mb0xpc3Q7XG4gIH1cbn1cbiJdfQ==