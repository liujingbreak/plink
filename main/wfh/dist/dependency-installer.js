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
// const packageUtils = require('../lib/packageMgr/packageUtils');
// import * as packageUtils from './package-utils';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLHVDQUF5QjtBQUN6Qix1Q0FBb0M7QUFDcEMsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QixzREFBOEI7QUFDOUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25GLGtFQUFrRTtBQUNsRSxtREFBbUQ7QUFDbkQsaUVBQTRFO0FBQzVFLGdFQUFrRDtBQVNsRCxTQUFnQixrQkFBa0IsQ0FDaEMsV0FBMkMsRUFDM0MsU0FBaUIsRUFDakIsYUFBdUM7SUFFdkMsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMvRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ3hDLElBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtRQUNwQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQXVCLENBQUMsQ0FBQzs7UUFFL0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFrQyxDQUFDLENBQUM7SUFDeEQscUNBQXFDO0lBQ3JDLE9BQU8sU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQy9CLENBQUM7QUFkRCxnREFjQztBQVNELE1BQU0sVUFBVSxHQUFHLDBC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Q0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDaEQsQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7NEJBRWpELE9BQU8sR0FBRyxDQUFDO3FCQUNkO29CQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO3FCQUN4QjtpQkFDRjtxQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSTtvQkFDckQsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDUCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSTtvQkFDbkQsT0FBTyxDQUFDLENBQUM7cUJBQ04sSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHO29CQUM1QixPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNQLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztvQkFDNUIsT0FBTyxDQUFDLENBQUM7O29CQUVULE9BQU8sQ0FBQyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsSUFBSSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2pHLE1BQU0sQ0FBQyxDQUFDO1NBQ1Q7UUFDRCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUE1UkQsd0NBNFJDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd3ZmguJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpKTtcbi8vIGNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuLy8gaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQge2dldEluc3RhbmNlIGFzIGdldFBhY2thZ2VKc29uR3VhcmRlcn0gZnJvbSAnLi9wYWNrYWdlLWpzb24tZ3VhcmRlcic7XG5pbXBvcnQgKiBhcyByZWNpcGVNYW5hZ2VyIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uSW50ZXJmIHtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldkRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIHBlZXJEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBkZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RDb21wRGVwZW5kZW5jeShcbiAgcGtKc29uRmlsZXM6IHN0cmluZ1tdIHwgUGFja2FnZUpzb25JbnRlcmZbXSxcbiAgd29ya3NwYWNlOiBzdHJpbmcsXG4gIHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVxuKToge1tkZXA6IHN0cmluZ106IHN0cmluZ30ge1xuICAvLyBsb2cuaW5mbygnc2NhbiBjb21wb25lbnRzIGZyb206XFxuJywgcGtKc29uRmlsZXMuam9pbignXFxuJykpO1xuICBjb25zdCBpbnN0YWxsZXIgPSBuZXcgSW5zdGFsbE1hbmFnZXIod29ya3NwYWNlRGVwcywgd29ya3NwYWNlKTtcbiAgaWYgKHBrSnNvbkZpbGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHt9O1xuICBpZiAodHlwZW9mIHBrSnNvbkZpbGVzWzBdID09PSAnc3RyaW5nJylcbiAgICBpbnN0YWxsZXIuc2NhblNyY0RlcHMocGtKc29uRmlsZXMgYXMgc3RyaW5nW10pO1xuICBlbHNlXG4gICAgaW5zdGFsbGVyLnNjYW5Gb3IocGtKc29uRmlsZXMgYXMgUGFja2FnZUpzb25JbnRlcmZbXSk7XG4gIC8vIGluc3RhbGxlci5zY2FuSW5zdGFsbGVkUGVlckRlcHMoKTtcbiAgcmV0dXJuIGluc3RhbGxlci5ob2lzdERlcHMoKTtcbn1cblxuaW50ZXJmYWNlIERlcEluZm8ge1xuICB2ZXI6IHN0cmluZztcbiAgdmVyTnVtPzogc3RyaW5nO1xuICBwcmU6IHN0cmluZztcbiAgYnk6IHN0cmluZztcbn1cblxuY29uc3QgdmVyc2lvblJlZyA9IC9eKFxcRCopKFxcZC4qPykoPzpcXC50Z3opPyQvO1xuXG5leHBvcnQgY2xhc3MgSW5zdGFsbE1hbmFnZXIge1xuXG4gIHNyY0RlcHM6IHtbcE5hbWU6IHN0cmluZ106IERlcEluZm9bXX07XG4gIGNvbXBvbmVudE1hcDoge1twTmFtZTogc3RyaW5nXToge3Zlcjogc3RyaW5nLCB0b0luc3RhbGw6IGJvb2xlYW59fTtcblxuICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sIHdvcmtzcGFjZU5hbWU6IHN0cmluZykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBJbnN0YWxsTWFuYWdlcikpIHtcbiAgICAgIHJldHVybiBuZXcgSW5zdGFsbE1hbmFnZXIod29ya3NwYWNlRGVwcywgd29ya3NwYWNlTmFtZSk7XG4gICAgfVxuICAgIHRoaXMuc3JjRGVwcyA9IHt9OyAvLyBzcmMgcGFja2FnZXMgbmVlZGVkIGRlcGVuZGVuY2llcyBhbmQgYWxsIHBhY2thZ2VzIG5lZWRlZCBwZWVyIGRlcGVuZGVuY2llc1xuICAgIC8vIHRoaXMucGVlckRlcHMgPSB7fTsgLy8gYWxsIHBhY2thZ2VzIG5lZWRlZCBwZWVyIGRlcGVuZGVuY2llc1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMod29ya3NwYWNlRGVwcykpIHtcbiAgICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIHdvcmtzcGFjZU5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHNjYW5Gb3IocGtKc29uczogUGFja2FnZUpzb25JbnRlcmZbXSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY29tcG9uZW50TWFwID0ge307XG4gICAgZm9yIChjb25zdCBqc29uIG9mIHBrSnNvbnMpIHtcbiAgICAgIHRoaXMuY29tcG9uZW50TWFwW2pzb24ubmFtZV0gPSB7dmVyOiBqc29uLnZlcnNpb24sIHRvSW5zdGFsbDogZmFsc2V9O1xuICAgICAgY29uc3QgZGVwcyA9IGpzb24uZGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKGRlcHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdzY2FuU3JjRGVwc0FzeW5jKCkgZGVwICcgKyBuYW1lKTtcbiAgICAgICAgICBzZWxmLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgbG9nLndhcm4oYCQke2pzb24ubmFtZX0gY29udGFpbnMgXCJkZXZEZXBlbmVuZGllc1wiLCBpZiB0aGV5IGFyZSBuZWNlc3NhcnkgZm9yIGNvbXBpbGluZyB0aGlzIGNvbXBvbmVudGAgK1xuICAgICAgICAgICd5b3Ugc2hvdWxkIG1vdmUgdGhlbSB0byBcImRlcGVuZGVuY2llc1wiIG9yIFwicGVlckRlcGVuZGVuY2llc1wiJyk7XG4gICAgICAgIC8vIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLmRldkRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgLy8gICBjb25zdCB2ZXJzaW9uID0ganNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgIC8vICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24ucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNjYW5TcmNEZXBzKGpzb25GaWxlczogc3RyaW5nW10pIHtcbiAgICByZXR1cm4gdGhpcy5zY2FuRm9yKGpzb25GaWxlcy5tYXAocGFja2FnZUpzb24gPT4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb24sICd1dGY4JykpKSk7XG4gIH1cblxuICAvLyBzY2FuSW5zdGFsbGVkUGVlckRlcHMoKSB7XG4gIC8vICAgLy8gVE9ETzogSGVyZSBJIHdhbnQgdG8gZGV0ZXJtaW5lIGV4cGVjdGVkIGNvbXBvbmVudCB2ZXJzaW9uIHRvIGluc3RhbGwgd2l0aCwgYnV0IHNvIGZhciB0aGUgdmVyc2lvbiBudW1iZXIgb2YgZWFjaCBjb21wb25lbnQgdGhhdCBJIGdldCBpcyBjdXJyZW50bHkgaW5zdGFsbGVkXG4gIC8vICAgLy8gb25lIHdoaWNoIG1pZ2h0IGJlIGluY29ycmVjdCBvciBvdXRkYXRlZCwgaW4gY2FzZSBsaWtlIGRldmVsb3BlciBkaWQgbm90IHJ1biBcInlhcm4gaW5zdGFsbFwiIGJlZm9yZSBcImRyY3AgaW5pdFwiLlxuICAvLyAgIC8vIE9uZSBwcm9ibGVtIGlzOiBcbiAgLy8gICAvLyBXaXRob3V0IHJ1bm5pbmcgXCJ5YXJuIGluc3RhbGxcIiB0byBkb3dubG9hZCBcInJlY2lwZVwiIHBhY2thZ2UsIEkgY2FuJ3Qga25vdyBleGFjdCB1cCB0byBkYXRlIHZlcnNpb24gbnVtYmVyIG9mIHRob3NlIGNvbXBvbmVudHNcbiAgLy8gICAvLyB3aGljaCBiZWxvbmcgdG8gYSBjZXJ0YWluIFwicmVjaXBlXCIgcGFjYWtnZS5cbiAgLy8gICAvLyBTbyBmaXJzdGx5LCBhbHdheXMgXCJ5YXJuIGluc3RhbGxcIiBiZWZvcmUgXCJkcmNwIGluaXRcIlxuXG4gIC8vICAgLy8gQW5vdGhlciBwcm9ibGVtIGlzOlxuICAvLyAgIC8vIFRoZXNlIG9sZCBjb21wb25lbnQgdmVyc2lvbnMgYXJlIHRyYWNrZWQgaW4gZGlzdC9kci5wYWNrYWdlLmpzb24gd2FpdGluZyBmb3IgYmVpbmcgY29tcGFyZWQgd2l0aCBuZXdseSBjaGFuZ2VkIHZlcnNpb24gbGlzdC5cbiAgLy8gICAvLyBCdXQgLi4uXG4gIC8vICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygobmFtZSwgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWUsIGpzb24sIHBhY2thZ2VQYXRoKSA9PiB7XG4gIC8vICAgICBpZiAoXy5oYXModGhpcy5jb21wb25lbnRNYXAsIG5hbWUpKVxuICAvLyAgICAgICByZXR1cm47IC8vIFNraXAgaXQsIHNpbmNlIG1vc3QgbGlrZWx5IHRoZXJlIGlzIGEgZHVwbGljYXRlIFwiaW5zdGFsbGVkXCIgZGVwZW5kZW5jeSBpbiBwYWNrYWdlLmpzb24gYWdhaW5zdCBhbiBzeW1ib2xpYyBsaW5rZWQgY29tcG9uZW50XG4gIC8vICAgICB0aGlzLmNvbXBvbmVudE1hcFtuYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiB0cnVlfTtcbiAgLy8gICAgIF8uZWFjaChqc29uLnBlZXJEZXBlbmRlbmNpZXMsICh2ZXJzaW9uLCBuYW1lKSA9PiB7XG4gIC8vICAgICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gIC8vICAgICB9KTtcbiAgLy8gICB9LCAnaW5zdGFsbGVkJyk7XG4gIC8vIH1cblxuICBob2lzdERlcHMoKSB7XG4gICAgY29uc3QgaG9pc3REZXBzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIGNvbnN0IGRlcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5zcmNEZXBzKTtcbiAgICBpZiAoZGVwTmFtZXMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuIHt9O1xuICAgIGRlcE5hbWVzLnNvcnQoKTtcbiAgICBjb25zdCBuYW1lV2lkdGggPSBfLm1heEJ5KGRlcE5hbWVzLCBuYW1lID0+IG5hbWUubGVuZ3RoKSEubGVuZ3RoO1xuICAgIGxldCBwcmludE91dCA9IF8ucGFkKCcgSG9pc3RlZCBEZXBlbmRlbmNpZXMnLCA2MCwgJy0nKSArICdcXG4nO1xuICAgIHByaW50T3V0ICs9IF8ucGFkU3RhcnQoJ0RlcGVuZGVuY3kgJywgbmFtZVdpZHRoICsgMTMpICsgJ3wgRGVwZW5kZW50XFxuJztcbiAgICBwcmludE91dCArPSBfLnJlcGVhdCgnLScsIG5hbWVXaWR0aCArIDEzKSArICd8JyArIF8ucmVwZWF0KCctJywgMTApICsgJ1xcbic7XG4gICAgbGV0IGNvdW50RGVwID0gMDtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZGVwTmFtZXMpIHtcbiAgICAgIGNvbnN0IHZlcnNpb25MaXN0ID0gdGhpcy5zcmNEZXBzW25hbWVdO1xuICAgICAgY29uc3QgZmlyc3RWZXJzaW9uID0gdGhpcy5zb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBuYW1lKVswXTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogcHJlZmVyLWNvbnN0XG4gICAgICBsZXQgbWFya05ldyA9ICcgICc7XG5cbiAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gdGhpcy5fY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG4gICAgICBjb25zdCBwcmludE5hbWUgPSAoaGFzRGlmZlZlcnNpb24gPyBjaGFsay5yZWQgOiBjaGFsay5jeWFuKShfLnBhZFN0YXJ0KG1hcmtOZXcgKyBuYW1lLCBuYW1lV2lkdGgsICcgJykpO1xuICAgICAgcHJpbnRPdXQgKz0gYCR7cHJpbnROYW1lfSAke3ZlcnNpb25MaXN0Lmxlbmd0aCA+IDEgPyAn4pSA4pSs4pSAJyA6ICfilIDilIDilIAnfSR7Xy5wYWRFbmQoJyAnICsgZmlyc3RWZXJzaW9uLnZlciArICcgJywgOSwgJyAnKX0gJHtmaXJzdFZlcnNpb24uYnl9XFxuYDtcbiAgICAgIHZhciBpID0gdmVyc2lvbkxpc3QubGVuZ3RoIC0gMTtcbiAgICAgIGZvciAoY29uc3QgcmVzdCBvZiB2ZXJzaW9uTGlzdC5zbGljZSgxKSkge1xuICAgICAgICBwcmludE91dCArPSBgJHtfLnJlcGVhdCgnICcsIG5hbWVXaWR0aCl9ICR7aSA9PT0gMSA/ICcg4pSU4pSAJyA6ICcg4pSc4pSAJ30ke18ucGFkRW5kKCcgJyArIHJlc3QudmVyICsgJyAnLCA5LCAnICcpfSAke3Jlc3QuYnl9XFxuYDtcbiAgICAgICAgaS0tO1xuICAgICAgfVxuICAgICAgY291bnREZXArKztcblxuICAgICAgaG9pc3REZXBzW25hbWVdID0gZmlyc3RWZXJzaW9uLnZlcjtcbiAgICB9XG4gICAgcHJpbnRPdXQgKz0gXy5wYWQoYCB0b3RhbCAke2NoYWxrLmdyZWVuKGNvdW50RGVwKX0gYCwgNjAsICctJyk7XG4gICAgbG9nLmluZm8ocHJpbnRPdXQpO1xuICAgIHJldHVybiBob2lzdERlcHM7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiB0cnVlIGlmIHRoZXJlIGFyZSBuZXdseSBmb3VuZCBkZXBlbmRlbmNpZXMgYWRkZWQgdG8gcGFja2FnZS5qc29uXG5cdCAqL1xuICBwcmludENvbXBvbmVudERlcCh3cml0ZTogYm9vbGVhbikge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IHJvb3RQYXRoID0gY29uZmlnKCkucm9vdFBhdGg7XG4gICAgY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0UGFja2FnZUpzb25HdWFyZGVyKHJvb3RQYXRoKTtcbiAgICBsZXQgbWFpblBranNvbjoge2RlcGVuZGVuY2llczogYW55LCBkZXZEZXBlbmRlbmNpZXM6IGFueX07XG4gICAgbGV0IG1haW5EZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gICAgbGV0IG1haW5EZXZEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG5cbiAgICBpZiAoIXBhY2thZ2VKc29uR3VhcmRlci5pc1BhY2thZ2VKc29uRGlydHkpIHtcbiAgICAgIGNvbnN0IG1haW5Qa0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGxvZy5pbmZvKCdDaGVja2luZycsIG1haW5Qa0ZpbGUpO1xuICAgICAgbWFpblBranNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1haW5Qa0ZpbGUsICd1dGY4JykpO1xuICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIG1haW5EZXZEZXBzID0gbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXM7XG4gICAgICBpZiAobWFpbkRlcHMgPT0gbnVsbClcbiAgICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgaWYgKG1haW5EZXZEZXBzID09IG51bGwpXG4gICAgICAgIG1haW5EZXZEZXBzID0gbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcblxuICAgICAgLy8gaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpXG4gICAgICAvLyAgIF8uYXNzaWduKG1haW5EZXBzLCBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyk7XG4gICAgICBfLmVhY2gocGFja2FnZUpzb25HdWFyZGVyLmdldENoYW5nZXMoKS5kZXBlbmRlbmNpZXMsICh2ZXIsIG5hbWUpID0+IHtcbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBzYW1lIGRlcGVuZGVuY3kgaW4gb3JpZ2luYWwgcGFja2FnZS5qc29uLCB3ZSB1c2UgdGhlIHZlcnNpb24gb2YgdGhhdCBvbmUsIGN1eicgdGhhdCBtaWdodCBiZSBtYW51YWxseSBzZXRcbiAgICAgICAgaWYgKCFfLmhhcyhtYWluRGVwcywgbmFtZSkpXG4gICAgICAgICAgbWFpbkRlcHNbbmFtZV0gPSB2ZXI7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWFpblBranNvbiA9IHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCk7XG4gICAgICBtYWluRGVwcyA9IG1haW5Qa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9O1xuICAgICAgbWFpbkRldkRlcHMgPSBtYWluUGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuc3JjRGVwcyk7XG4gICAgZGVwTmFtZXMuc29ydCgpO1xuICAgIC8vIHZhciBwZWVyRGVwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLnBlZXJEZXBzKTtcbiAgICBpZiAoZGVwTmFtZXMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IG5hbWVXaWR0aCA9IF8ubWF4QnkoZGVwTmFtZXMsIG5hbWUgPT4gbmFtZS5sZW5ndGgpIS5sZW5ndGg7XG5cbiAgICAvLyBsb2cud2FybihPYmplY3Qua2V5cyh0aGlzLmNvbXBvbmVudE1hcCkpO1xuXG4gICAgaWYgKGRlcE5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBwcmludE91dCA9IF8ucGFkKCcgQXNzb2NpYXRlZCBDb21wb25lbnRzIERlcGVuZGVuY2llcyAmICcgKyBjaGFsay5jeWFuKCdDb21wb25lbnRzIFBlZXIgRGVwZW5kZW5jaWVzJyksIDYwLCAnLScpICsgJ1xcbic7XG4gICAgICBwcmludE91dCArPSBfLnBhZFN0YXJ0KCdEZXBlbmRlbmN5ICcsIG5hbWVXaWR0aCArIDEzKSArICd8IERlcGVuZGVudFxcbic7XG4gICAgICBwcmludE91dCArPSBfLnJlcGVhdCgnLScsIG5hbWVXaWR0aCArIDEzKSArICd8JyArIF8ucmVwZWF0KCctJywgMTApICsgJ1xcbic7XG4gICAgICBsZXQgY291bnREZXAgPSAwO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGRlcE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IHZlcnNpb25MaXN0ID0gdGhpcy5zcmNEZXBzW25hbWVdO1xuICAgICAgICBjb25zdCBmaXJzdFZlcnNpb24gPSBzZWxmLnNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIG5hbWUpWzBdO1xuICAgICAgICBsZXQgbWFya05ldyA9ICcgICc7XG4gICAgICAgIGlmIChuYW1lICE9PSAnQGRyL2ludGVybmFsLXJlY2lwZScgJiYgKCFfLmhhcyh0aGlzLmNvbXBvbmVudE1hcCwgbmFtZSkpICYmXG4gICAgICAgICAgKG1haW5EZXBzW25hbWVdICE9PSBmaXJzdFZlcnNpb24udmVyKSkge1xuICAgICAgICAgIG1haW5EZXBzW25hbWVdID0gZmlyc3RWZXJzaW9uLnZlcjtcbiAgICAgICAgICBtYXJrTmV3ID0gJysgJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gc2VsZi5fY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG4gICAgICAgIGNvbnN0IHByaW50TmFtZSA9IChoYXNEaWZmVmVyc2lvbiA/IGNoYWxrLnJlZCA6IGNoYWxrLmN5YW4pKF8ucGFkU3RhcnQobWFya05ldyArIG5hbWUsIG5hbWVXaWR0aCwgJyAnKSk7XG4gICAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKGZpcnN0VmVyc2lvbi52ZXIsIDksICfilIAnKX0gJHtmaXJzdFZlcnNpb24uYnl9XFxuYDtcbiAgICAgICAgdmFyIGkgPSB2ZXJzaW9uTGlzdC5sZW5ndGggLSAxO1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3Qgb2YgdmVyc2lvbkxpc3Quc2xpY2UoMSkpIHtcbiAgICAgICAgICBwcmludE91dCArPSBgJHtfLnJlcGVhdCgnICcsIG5hbWVXaWR0aCl9ICR7aSA9PT0gMSA/ICcg4pSU4pSAJyA6ICcg4pSc4pSAJ30ke18ucGFkRW5kKHJlc3QudmVyLCA5LCAn4pSAJyl9ICR7cmVzdC5ieX1cXG5gO1xuICAgICAgICAgIGktLTtcbiAgICAgICAgfVxuICAgICAgICBjb3VudERlcCsrO1xuICAgICAgfVxuICAgICAgcHJpbnRPdXQgKz0gXy5wYWQoYCB0b3RhbCAke2NoYWxrLmdyZWVuKGNvdW50RGVwKX0gYCwgNjAsICctJyk7XG4gICAgICBsb2cuaW5mbyhwcmludE91dCk7XG4gICAgfVxuICAgIG1rZGlycFN5bmMoY29uZmlnKCkuZGVzdERpcik7XG4gICAgaWYgKHdyaXRlKSB7XG4gICAgICAvLyBfLmFzc2lnbihtYWluUGtqc29uLmRlcGVuZGVuY2llcywgbmV3RGVwSnNvbik7XG4gICAgICBjb25zdCBkZWxldGVkOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICBmb3IgKGNvbnN0IGRlcExpc3Qgb2YgW21haW5EZXBzLCBtYWluRGV2RGVwc10pIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcExpc3QpKSB7XG4gICAgICAgICAgaWYgKF8uZ2V0KHRoaXMuY29tcG9uZW50TWFwLCBbbmFtZSwgJ3RvSW5zdGFsbCddKSBhcyBhbnkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBkZWxldGUgbWFpbkRlcHNbbmFtZV07XG4gICAgICAgICAgICBkZWxldGVkLnB1c2gobmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsb2cuaW5mbyhjaGFsay5ibHVlKCdzb3VyY2UgbGlua2VkIGRlcGVuZGVuY3k6ICcgKyBkZWxldGVkLmpvaW4oJywgJykpKTtcbiAgICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYygoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLCByZWNpcGVOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKHJlY2lwZU5hbWUgJiYgXy5oYXMobWFpbkRlcHMsIHJlY2lwZU5hbWUpKSB7XG4gICAgICAgICAgZGVsZXRlIG1haW5EZXBzW3JlY2lwZU5hbWVdO1xuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmJsdWUoJ1JlbW92ZSByZWNpcGUgZGVwZW5kZW5jeTogJyArIHJlY2lwZU5hbWUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBjaGFuZ2VMaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmddPiA9IHBhY2thZ2VKc29uR3VhcmRlci5tYXJrQ2hhbmdlcyhtYWluUGtqc29uKTtcbiAgICAgIGNvbnN0IG5lZWRJbnN0YWxsID0gXy5zaXplKGNoYW5nZUxpc3QpID4gMDtcbiAgICAgIGlmIChuZWVkSW5zdGFsbCkge1xuICAgICAgICBjb25zdCBjaGFuZ2VkID0gW107XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgY2hhbmdlTGlzdCkge1xuICAgICAgICAgIGlmIChyb3dbMV0gPT0gbnVsbClcbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChyb3dbMF0pO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNoYW5nZWQucHVzaChyb3dbMF0gKyAnQCcgKyByb3dbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjaGFuZ2VkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oJ0NoYW5nZWQgZGVwZW5kZW5jaWVzOicsIGNoYW5nZWQuam9pbignLCAnKSk7XG4gICAgICAgIGlmIChyZW1vdmVkLmxlbmd0aCA+IDApXG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuYmx1ZSgnUmVtb3ZlZCBkZXBlbmRlbmNpZXM6JyksIHJlbW92ZWQuam9pbignLCAnKSk7XG4gICAgICB9XG4gICAgICAvLyBmcy53cml0ZUZpbGVTeW5jKG1haW5Qa0ZpbGUsIEpTT04uc3RyaW5naWZ5KG1haW5Qa2pzb24sIG51bGwsICcgICcpKTtcbiAgICAgIC8vIGxvZy5pbmZvKCclcyBpcyB3cml0dGVuLicsIG1haW5Qa0ZpbGUpO1xuICAgICAgcmV0dXJuIG5lZWRJbnN0YWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrRGVwZW5kZW5jeSh0cmFja1RvOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119LCBuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAoIV8uaGFzKHRyYWNrVG8sIG5hbWUpKSB7XG4gICAgICB0cmFja1RvW25hbWVdID0gW107XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdHJhY2tUb1tuYW1lXS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY29udGFpbnNEaWZmVmVyc2lvbihzb3J0ZWRWZXJzaW9uczogRGVwSW5mb1tdKSB7XG4gICAgLy8gdmFyIHNlbGYgPSB0aGlzO1xuICAgIGZvciAobGV0IGkgPSAwLCBsID0gc29ydGVkVmVyc2lvbnMubGVuZ3RoIC0gMTsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgYSA9IHNvcnRlZFZlcnNpb25zW2ldLnZlcjtcbiAgICAgIGNvbnN0IGIgPSBzb3J0ZWRWZXJzaW9uc1tpICsgMV0udmVyO1xuXG4gICAgICBpZiAoYiA9PT0gJyonIHx8IGIgPT09ICcnKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGlmIChhICE9PSBiKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8qKlxuXHQgKiBTb3J0IGJ5IGRlc2NlbmRpbmdcblx0ICogQHBhcmFtIHZlckluZm9MaXN0IHt2ZXI6IHN0cmluZywgYnk6IHN0cmluZywgbmFtZTogc3RyaW5nfVxuXHQgKi9cbiAgcHJvdGVjdGVkIHNvcnRCeVZlcnNpb24odmVySW5mb0xpc3Q6IERlcEluZm9bXSwgbmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKHZlckluZm9MaXN0ID09IG51bGwgfHwgdmVySW5mb0xpc3QubGVuZ3RoID09PSAxKVxuICAgICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICAgIHRyeSB7XG4gICAgICB2ZXJJbmZvTGlzdC5zb3J0KChpbmZvMSwgaW5mbzIpID0+IHtcbiAgICAgICAgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSAhPSBudWxsKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgICBpZiAocmVzID09PSAwKVxuICAgICAgICAgICAgICByZXR1cm4gaW5mbzEucHJlID09PSAnJyAmJiBpbmZvMi5wcmUgIT09ICcnID8gLTEgOlxuICAgICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbG9nLndhcm4oaW5mbzEsIGluZm8yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICBlbHNlIGlmIChpbmZvMi52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMS52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzEudmVyID4gaW5mbzIudmVyKVxuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzEudmVyIDwgaW5mbzIudmVyKVxuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cuZXJyb3IoYEludmFsaWQgc2VtdmVyIGZvcm1hdCBmb3IgJHtuYW1lIHx8ICcnfTogYCArIEpTT04uc3RyaW5naWZ5KHZlckluZm9MaXN0LCBudWxsLCAnICAnKSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgICByZXR1cm4gdmVySW5mb0xpc3Q7XG4gIH1cbn1cbiJdfQ==