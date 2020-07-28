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
const packageUtils = __importStar(require("./package-utils"));
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
    installer.scanInstalledPeerDeps();
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
                this._trackDependency(this.srcDeps, name, version, json.name);
            });
        }, 'installed');
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLHVDQUF5QjtBQUN6Qix1Q0FBb0M7QUFDcEMsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QixzREFBOEI7QUFDOUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25GLGtFQUFrRTtBQUNsRSw4REFBZ0Q7QUFDaEQsaUVBQTRFO0FBQzVFLGdFQUFrRDtBQVNsRCxTQUFnQixrQkFBa0IsQ0FDaEMsV0FBMkMsRUFDM0MsU0FBaUIsRUFDakIsYUFBdUM7SUFFdkMsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMvRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ3hDLElBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtRQUNwQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQXVCLENBQUMsQ0FBQzs7UUFFL0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFrQyxDQUFDLENBQUM7SUFDeEQsU0FBUyxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDbEMsT0FBTyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQWRELGdEQWNDO0FB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T0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDUCxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7b0JBQzVCLE9BQU8sQ0FBQyxDQUFDOztvQkFFVCxPQUFPLENBQUMsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsQ0FBQztTQUNUO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBNVJELHdDQTRSQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG4vLyBjb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IHtnZXRJbnN0YW5jZSBhcyBnZXRQYWNrYWdlSnNvbkd1YXJkZXJ9IGZyb20gJy4vcGFja2FnZS1qc29uLWd1YXJkZXInO1xuaW1wb3J0ICogYXMgcmVjaXBlTWFuYWdlciBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkludGVyZiB7XG4gIHZlcnNpb246IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBkZXZEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBwZWVyRGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgZGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBsaXN0Q29tcERlcGVuZGVuY3koXG4gIHBrSnNvbkZpbGVzOiBzdHJpbmdbXSB8IFBhY2thZ2VKc29uSW50ZXJmW10sXG4gIHdvcmtzcGFjZTogc3RyaW5nLFxuICB3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ31cbik6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgLy8gbG9nLmluZm8oJ3NjYW4gY29tcG9uZW50cyBmcm9tOlxcbicsIHBrSnNvbkZpbGVzLmpvaW4oJ1xcbicpKTtcbiAgY29uc3QgaW5zdGFsbGVyID0gbmV3IEluc3RhbGxNYW5hZ2VyKHdvcmtzcGFjZURlcHMsIHdvcmtzcGFjZSk7XG4gIGlmIChwa0pzb25GaWxlcy5sZW5ndGggPT09IDApIHJldHVybiB7fTtcbiAgaWYgKHR5cGVvZiBwa0pzb25GaWxlc1swXSA9PT0gJ3N0cmluZycpXG4gICAgaW5zdGFsbGVyLnNjYW5TcmNEZXBzKHBrSnNvbkZpbGVzIGFzIHN0cmluZ1tdKTtcbiAgZWxzZVxuICAgIGluc3RhbGxlci5zY2FuRm9yKHBrSnNvbkZpbGVzIGFzIFBhY2thZ2VKc29uSW50ZXJmW10pO1xuICBpbnN0YWxsZXIuc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCk7XG4gIHJldHVybiBpbnN0YWxsZXIuaG9pc3REZXBzKCk7XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG59XG5cbmNvbnN0IHZlcnNpb25SZWcgPSAvXihcXEQqKShcXGQuKj8pKD86XFwudGd6KT8kLztcblxuZXhwb3J0IGNsYXNzIEluc3RhbGxNYW5hZ2VyIHtcblxuICBzcmNEZXBzOiB7W3BOYW1lOiBzdHJpbmddOiBEZXBJbmZvW119O1xuICBjb21wb25lbnRNYXA6IHtbcE5hbWU6IHN0cmluZ106IHt2ZXI6IHN0cmluZywgdG9JbnN0YWxsOiBib29sZWFufX07XG5cbiAgY29uc3RydWN0b3Iod29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LCB3b3Jrc3BhY2VOYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgSW5zdGFsbE1hbmFnZXIpKSB7XG4gICAgICByZXR1cm4gbmV3IEluc3RhbGxNYW5hZ2VyKHdvcmtzcGFjZURlcHMsIHdvcmtzcGFjZU5hbWUpO1xuICAgIH1cbiAgICB0aGlzLnNyY0RlcHMgPSB7fTsgLy8gc3JjIHBhY2thZ2VzIG5lZWRlZCBkZXBlbmRlbmNpZXMgYW5kIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcbiAgICAvLyB0aGlzLnBlZXJEZXBzID0ge307IC8vIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcblxuICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHdvcmtzcGFjZURlcHMpKSB7XG4gICAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCB3b3Jrc3BhY2VOYW1lKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IFBhY2thZ2VKc29uSW50ZXJmW10pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICB0aGlzLmNvbXBvbmVudE1hcCA9IHt9O1xuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICB0aGlzLmNvbXBvbmVudE1hcFtqc29uLm5hbWVdID0ge3ZlcjoganNvbi52ZXJzaW9uLCB0b0luc3RhbGw6IGZhbHNlfTtcbiAgICAgIGNvbnN0IGRlcHMgPSBqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc2NhblNyY0RlcHNBc3luYygpIGRlcCAnICsgbmFtZSk7XG4gICAgICAgICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24uZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGxvZy53YXJuKGAkJHtqc29uLm5hbWV9IGNvbnRhaW5zIFwiZGV2RGVwZW5lbmRpZXNcIiwgaWYgdGhleSBhcmUgbmVjZXNzYXJ5IGZvciBjb21waWxpbmcgdGhpcyBjb21wb25lbnRgICtcbiAgICAgICAgICAneW91IHNob3VsZCBtb3ZlIHRoZW0gdG8gXCJkZXBlbmRlbmNpZXNcIiBvciBcInBlZXJEZXBlbmRlbmNpZXNcIicpO1xuICAgICAgICAvLyBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgIC8vICAgY29uc3QgdmVyc2lvbiA9IGpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAvLyAgIHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLnBlZXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24ucGVlckRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0ganNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAgIHNlbGYuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzY2FuU3JjRGVwcyhqc29uRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NhbkZvcihqc29uRmlsZXMubWFwKHBhY2thZ2VKc29uID0+IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCAndXRmOCcpKSkpO1xuICB9XG5cbiAgc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCkge1xuICAgIC8vIFRPRE86IEhlcmUgSSB3YW50IHRvIGRldGVybWluZSBleHBlY3RlZCBjb21wb25lbnQgdmVyc2lvbiB0byBpbnN0YWxsIHdpdGgsIGJ1dCBzbyBmYXIgdGhlIHZlcnNpb24gbnVtYmVyIG9mIGVhY2ggY29tcG9uZW50IHRoYXQgSSBnZXQgaXMgY3VycmVudGx5IGluc3RhbGxlZFxuICAgIC8vIG9uZSB3aGljaCBtaWdodCBiZSBpbmNvcnJlY3Qgb3Igb3V0ZGF0ZWQsIGluIGNhc2UgbGlrZSBkZXZlbG9wZXIgZGlkIG5vdCBydW4gXCJ5YXJuIGluc3RhbGxcIiBiZWZvcmUgXCJkcmNwIGluaXRcIi5cbiAgICAvLyBPbmUgcHJvYmxlbSBpczogXG4gICAgLy8gV2l0aG91dCBydW5uaW5nIFwieWFybiBpbnN0YWxsXCIgdG8gZG93bmxvYWQgXCJyZWNpcGVcIiBwYWNrYWdlLCBJIGNhbid0IGtub3cgZXhhY3QgdXAgdG8gZGF0ZSB2ZXJzaW9uIG51bWJlciBvZiB0aG9zZSBjb21wb25lbnRzXG4gICAgLy8gd2hpY2ggYmVsb25nIHRvIGEgY2VydGFpbiBcInJlY2lwZVwiIHBhY2FrZ2UuXG4gICAgLy8gU28gZmlyc3RseSwgYWx3YXlzIFwieWFybiBpbnN0YWxsXCIgYmVmb3JlIFwiZHJjcCBpbml0XCJcblxuICAgIC8vIEFub3RoZXIgcHJvYmxlbSBpczpcbiAgICAvLyBUaGVzZSBvbGQgY29tcG9uZW50IHZlcnNpb25zIGFyZSB0cmFja2VkIGluIGRpc3QvZHIucGFja2FnZS5qc29uIHdhaXRpbmcgZm9yIGJlaW5nIGNvbXBhcmVkIHdpdGggbmV3bHkgY2hhbmdlZCB2ZXJzaW9uIGxpc3QuXG4gICAgLy8gQnV0IC4uLlxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoKG5hbWUsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lLCBqc29uLCBwYWNrYWdlUGF0aCkgPT4ge1xuICAgICAgaWYgKF8uaGFzKHRoaXMuY29tcG9uZW50TWFwLCBuYW1lKSlcbiAgICAgICAgcmV0dXJuOyAvLyBTa2lwIGl0LCBzaW5jZSBtb3N0IGxpa2VseSB0aGVyZSBpcyBhIGR1cGxpY2F0ZSBcImluc3RhbGxlZFwiIGRlcGVuZGVuY3kgaW4gcGFja2FnZS5qc29uIGFnYWluc3QgYW4gc3ltYm9saWMgbGlua2VkIGNvbXBvbmVudFxuICAgICAgdGhpcy5jb21wb25lbnRNYXBbbmFtZV0gPSB7dmVyOiBqc29uLnZlcnNpb24sIHRvSW5zdGFsbDogdHJ1ZX07XG4gICAgICBfLmVhY2goanNvbi5wZWVyRGVwZW5kZW5jaWVzLCAodmVyc2lvbiwgbmFtZSkgPT4ge1xuICAgICAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgfSk7XG4gICAgfSwgJ2luc3RhbGxlZCcpO1xuICB9XG5cbiAgaG9pc3REZXBzKCkge1xuICAgIGNvbnN0IGhvaXN0RGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgICBjb25zdCBkZXBOYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuc3JjRGVwcyk7XG4gICAgaWYgKGRlcE5hbWVzLmxlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybiB7fTtcbiAgICBkZXBOYW1lcy5zb3J0KCk7XG4gICAgY29uc3QgbmFtZVdpZHRoID0gXy5tYXhCeShkZXBOYW1lcywgbmFtZSA9PiBuYW1lLmxlbmd0aCkhLmxlbmd0aDtcbiAgICBsZXQgcHJpbnRPdXQgPSBfLnBhZCgnIEhvaXN0ZWQgRGVwZW5kZW5jaWVzJywgNjAsICctJykgKyAnXFxuJztcbiAgICBwcmludE91dCArPSBfLnBhZFN0YXJ0KCdEZXBlbmRlbmN5ICcsIG5hbWVXaWR0aCArIDEzKSArICd8IERlcGVuZGVudFxcbic7XG4gICAgcHJpbnRPdXQgKz0gXy5yZXBlYXQoJy0nLCBuYW1lV2lkdGggKyAxMykgKyAnfCcgKyBfLnJlcGVhdCgnLScsIDEwKSArICdcXG4nO1xuICAgIGxldCBjb3VudERlcCA9IDA7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGRlcE5hbWVzKSB7XG4gICAgICBjb25zdCB2ZXJzaW9uTGlzdCA9IHRoaXMuc3JjRGVwc1tuYW1lXTtcbiAgICAgIGNvbnN0IGZpcnN0VmVyc2lvbiA9IHRoaXMuc29ydEJ5VmVyc2lvbih2ZXJzaW9uTGlzdCwgbmFtZSlbMF07XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IHByZWZlci1jb25zdFxuICAgICAgbGV0IG1hcmtOZXcgPSAnICAnO1xuXG4gICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IHRoaXMuX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuICAgICAgY29uc3QgcHJpbnROYW1lID0gKGhhc0RpZmZWZXJzaW9uID8gY2hhbGsucmVkIDogY2hhbGsuY3lhbikoXy5wYWRTdGFydChtYXJrTmV3ICsgbmFtZSwgbmFtZVdpZHRoLCAnICcpKTtcbiAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKCcgJyArIGZpcnN0VmVyc2lvbi52ZXIgKyAnICcsIDksICcgJyl9ICR7Zmlyc3RWZXJzaW9uLmJ5fVxcbmA7XG4gICAgICB2YXIgaSA9IHZlcnNpb25MaXN0Lmxlbmd0aCAtIDE7XG4gICAgICBmb3IgKGNvbnN0IHJlc3Qgb2YgdmVyc2lvbkxpc3Quc2xpY2UoMSkpIHtcbiAgICAgICAgcHJpbnRPdXQgKz0gYCR7Xy5yZXBlYXQoJyAnLCBuYW1lV2lkdGgpfSAke2kgPT09IDEgPyAnIOKUlOKUgCcgOiAnIOKUnOKUgCd9JHtfLnBhZEVuZCgnICcgKyByZXN0LnZlciArICcgJywgOSwgJyAnKX0gJHtyZXN0LmJ5fVxcbmA7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICAgIGNvdW50RGVwKys7XG5cbiAgICAgIGhvaXN0RGVwc1tuYW1lXSA9IGZpcnN0VmVyc2lvbi52ZXI7XG4gICAgfVxuICAgIHByaW50T3V0ICs9IF8ucGFkKGAgdG90YWwgJHtjaGFsay5ncmVlbihjb3VudERlcCl9IGAsIDYwLCAnLScpO1xuICAgIGxvZy5pbmZvKHByaW50T3V0KTtcbiAgICByZXR1cm4gaG9pc3REZXBzO1xuICB9XG5cbiAgLyoqXG5cdCAqIEByZXR1cm4gdHJ1ZSBpZiB0aGVyZSBhcmUgbmV3bHkgZm91bmQgZGVwZW5kZW5jaWVzIGFkZGVkIHRvIHBhY2thZ2UuanNvblxuXHQgKi9cbiAgcHJpbnRDb21wb25lbnREZXAod3JpdGU6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBjb25zdCByb290UGF0aCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uR3VhcmRlciA9IGdldFBhY2thZ2VKc29uR3VhcmRlcihyb290UGF0aCk7XG4gICAgbGV0IG1haW5Qa2pzb246IHtkZXBlbmRlbmNpZXM6IGFueSwgZGV2RGVwZW5kZW5jaWVzOiBhbnl9O1xuICAgIGxldCBtYWluRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIGxldCBtYWluRGV2RGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuXG4gICAgaWYgKCFwYWNrYWdlSnNvbkd1YXJkZXIuaXNQYWNrYWdlSnNvbkRpcnR5KSB7XG4gICAgICBjb25zdCBtYWluUGtGaWxlID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgICBsb2cuaW5mbygnQ2hlY2tpbmcnLCBtYWluUGtGaWxlKTtcbiAgICAgIG1haW5Qa2pzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtYWluUGtGaWxlLCAndXRmOCcpKTtcbiAgICAgIG1haW5EZXBzID0gbWFpblBranNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBtYWluRGV2RGVwcyA9IG1haW5Qa2pzb24uZGV2RGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKG1haW5EZXBzID09IG51bGwpXG4gICAgICAgIG1haW5EZXBzID0gbWFpblBranNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIGlmIChtYWluRGV2RGVwcyA9PSBudWxsKVxuICAgICAgICBtYWluRGV2RGVwcyA9IG1haW5Qa2pzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG5cbiAgICAgIC8vIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKVxuICAgICAgLy8gICBfLmFzc2lnbihtYWluRGVwcywgbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXMpO1xuICAgICAgXy5lYWNoKHBhY2thZ2VKc29uR3VhcmRlci5nZXRDaGFuZ2VzKCkuZGVwZW5kZW5jaWVzLCAodmVyLCBuYW1lKSA9PiB7XG4gICAgICAgIC8vIElmIHRoZXJlIGlzIGEgc2FtZSBkZXBlbmRlbmN5IGluIG9yaWdpbmFsIHBhY2thZ2UuanNvbiwgd2UgdXNlIHRoZSB2ZXJzaW9uIG9mIHRoYXQgb25lLCBjdXonIHRoYXQgbWlnaHQgYmUgbWFudWFsbHkgc2V0XG4gICAgICAgIGlmICghXy5oYXMobWFpbkRlcHMsIG5hbWUpKVxuICAgICAgICAgIG1haW5EZXBzW25hbWVdID0gdmVyO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG1haW5Qa2pzb24gPSBwYWNrYWdlSnNvbkd1YXJkZXIuZ2V0Q2hhbmdlcygpO1xuICAgICAgbWFpbkRlcHMgPSBtYWluUGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fTtcbiAgICAgIG1haW5EZXZEZXBzID0gbWFpblBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge307XG4gICAgfVxuXG4gICAgY29uc3QgZGVwTmFtZXMgPSBPYmplY3Qua2V5cyh0aGlzLnNyY0RlcHMpO1xuICAgIGRlcE5hbWVzLnNvcnQoKTtcbiAgICAvLyB2YXIgcGVlckRlcE5hbWVzID0gT2JqZWN0LmtleXModGhpcy5wZWVyRGVwcyk7XG4gICAgaWYgKGRlcE5hbWVzLmxlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBuYW1lV2lkdGggPSBfLm1heEJ5KGRlcE5hbWVzLCBuYW1lID0+IG5hbWUubGVuZ3RoKSEubGVuZ3RoO1xuXG4gICAgLy8gbG9nLndhcm4oT2JqZWN0LmtleXModGhpcy5jb21wb25lbnRNYXApKTtcblxuICAgIGlmIChkZXBOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgcHJpbnRPdXQgPSBfLnBhZCgnIEFzc29jaWF0ZWQgQ29tcG9uZW50cyBEZXBlbmRlbmNpZXMgJiAnICsgY2hhbGsuY3lhbignQ29tcG9uZW50cyBQZWVyIERlcGVuZGVuY2llcycpLCA2MCwgJy0nKSArICdcXG4nO1xuICAgICAgcHJpbnRPdXQgKz0gXy5wYWRTdGFydCgnRGVwZW5kZW5jeSAnLCBuYW1lV2lkdGggKyAxMykgKyAnfCBEZXBlbmRlbnRcXG4nO1xuICAgICAgcHJpbnRPdXQgKz0gXy5yZXBlYXQoJy0nLCBuYW1lV2lkdGggKyAxMykgKyAnfCcgKyBfLnJlcGVhdCgnLScsIDEwKSArICdcXG4nO1xuICAgICAgbGV0IGNvdW50RGVwID0gMDtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBkZXBOYW1lcykge1xuICAgICAgICBjb25zdCB2ZXJzaW9uTGlzdCA9IHRoaXMuc3JjRGVwc1tuYW1lXTtcbiAgICAgICAgY29uc3QgZmlyc3RWZXJzaW9uID0gc2VsZi5zb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBuYW1lKVswXTtcbiAgICAgICAgbGV0IG1hcmtOZXcgPSAnICAnO1xuICAgICAgICBpZiAobmFtZSAhPT0gJ0Bkci9pbnRlcm5hbC1yZWNpcGUnICYmICghXy5oYXModGhpcy5jb21wb25lbnRNYXAsIG5hbWUpKSAmJlxuICAgICAgICAgIChtYWluRGVwc1tuYW1lXSAhPT0gZmlyc3RWZXJzaW9uLnZlcikpIHtcbiAgICAgICAgICBtYWluRGVwc1tuYW1lXSA9IGZpcnN0VmVyc2lvbi52ZXI7XG4gICAgICAgICAgbWFya05ldyA9ICcrICc7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IHNlbGYuX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuICAgICAgICBjb25zdCBwcmludE5hbWUgPSAoaGFzRGlmZlZlcnNpb24gPyBjaGFsay5yZWQgOiBjaGFsay5jeWFuKShfLnBhZFN0YXJ0KG1hcmtOZXcgKyBuYW1lLCBuYW1lV2lkdGgsICcgJykpO1xuICAgICAgICBwcmludE91dCArPSBgJHtwcmludE5hbWV9ICR7dmVyc2lvbkxpc3QubGVuZ3RoID4gMSA/ICfilIDilKzilIAnIDogJ+KUgOKUgOKUgCd9JHtfLnBhZEVuZChmaXJzdFZlcnNpb24udmVyLCA5LCAn4pSAJyl9ICR7Zmlyc3RWZXJzaW9uLmJ5fVxcbmA7XG4gICAgICAgIHZhciBpID0gdmVyc2lvbkxpc3QubGVuZ3RoIC0gMTtcbiAgICAgICAgZm9yIChjb25zdCByZXN0IG9mIHZlcnNpb25MaXN0LnNsaWNlKDEpKSB7XG4gICAgICAgICAgcHJpbnRPdXQgKz0gYCR7Xy5yZXBlYXQoJyAnLCBuYW1lV2lkdGgpfSAke2kgPT09IDEgPyAnIOKUlOKUgCcgOiAnIOKUnOKUgCd9JHtfLnBhZEVuZChyZXN0LnZlciwgOSwgJ+KUgCcpfSAke3Jlc3QuYnl9XFxuYDtcbiAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICAgICAgY291bnREZXArKztcbiAgICAgIH1cbiAgICAgIHByaW50T3V0ICs9IF8ucGFkKGAgdG90YWwgJHtjaGFsay5ncmVlbihjb3VudERlcCl9IGAsIDYwLCAnLScpO1xuICAgICAgbG9nLmluZm8ocHJpbnRPdXQpO1xuICAgIH1cbiAgICBta2RpcnBTeW5jKGNvbmZpZygpLmRlc3REaXIpO1xuICAgIGlmICh3cml0ZSkge1xuICAgICAgLy8gXy5hc3NpZ24obWFpblBranNvbi5kZXBlbmRlbmNpZXMsIG5ld0RlcEpzb24pO1xuICAgICAgY29uc3QgZGVsZXRlZDogc3RyaW5nW10gPSBbXTtcblxuICAgICAgZm9yIChjb25zdCBkZXBMaXN0IG9mIFttYWluRGVwcywgbWFpbkRldkRlcHNdKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBMaXN0KSkge1xuICAgICAgICAgIGlmIChfLmdldCh0aGlzLmNvbXBvbmVudE1hcCwgW25hbWUsICd0b0luc3RhbGwnXSkgYXMgYW55ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZGVsZXRlIG1haW5EZXBzW25hbWVdO1xuICAgICAgICAgICAgZGVsZXRlZC5wdXNoKG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbG9nLmluZm8oY2hhbGsuYmx1ZSgnc291cmNlIGxpbmtlZCBkZXBlbmRlbmN5OiAnICsgZGVsZXRlZC5qb2luKCcsICcpKSk7XG4gICAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMoKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZywgcmVjaXBlTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgIGlmIChyZWNpcGVOYW1lICYmIF8uaGFzKG1haW5EZXBzLCByZWNpcGVOYW1lKSkge1xuICAgICAgICAgIGRlbGV0ZSBtYWluRGVwc1tyZWNpcGVOYW1lXTtcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5ibHVlKCdSZW1vdmUgcmVjaXBlIGRlcGVuZGVuY3k6ICcgKyByZWNpcGVOYW1lKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29uc3QgY2hhbmdlTGlzdDogQXJyYXk8W3N0cmluZywgc3RyaW5nXT4gPSBwYWNrYWdlSnNvbkd1YXJkZXIubWFya0NoYW5nZXMobWFpblBranNvbik7XG4gICAgICBjb25zdCBuZWVkSW5zdGFsbCA9IF8uc2l6ZShjaGFuZ2VMaXN0KSA+IDA7XG4gICAgICBpZiAobmVlZEluc3RhbGwpIHtcbiAgICAgICAgY29uc3QgY2hhbmdlZCA9IFtdO1xuICAgICAgICBjb25zdCByZW1vdmVkID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIGNoYW5nZUxpc3QpIHtcbiAgICAgICAgICBpZiAocm93WzFdID09IG51bGwpXG4gICAgICAgICAgICByZW1vdmVkLnB1c2gocm93WzBdKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBjaGFuZ2VkLnB1c2gocm93WzBdICsgJ0AnICsgcm93WzFdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGggPiAwKVxuICAgICAgICAgIGxvZy5pbmZvKCdDaGFuZ2VkIGRlcGVuZGVuY2llczonLCBjaGFuZ2VkLmpvaW4oJywgJykpO1xuICAgICAgICBpZiAocmVtb3ZlZC5sZW5ndGggPiAwKVxuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmJsdWUoJ1JlbW92ZWQgZGVwZW5kZW5jaWVzOicpLCByZW1vdmVkLmpvaW4oJywgJykpO1xuICAgICAgfVxuICAgICAgLy8gZnMud3JpdGVGaWxlU3luYyhtYWluUGtGaWxlLCBKU09OLnN0cmluZ2lmeShtYWluUGtqc29uLCBudWxsLCAnICAnKSk7XG4gICAgICAvLyBsb2cuaW5mbygnJXMgaXMgd3JpdHRlbi4nLCBtYWluUGtGaWxlKTtcbiAgICAgIHJldHVybiBuZWVkSW5zdGFsbDtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja0RlcGVuZGVuY3kodHJhY2tUbzoge1twTmFtZTogc3RyaW5nXTogRGVwSW5mb1tdfSwgbmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKCFfLmhhcyh0cmFja1RvLCBuYW1lKSkge1xuICAgICAgdHJhY2tUb1tuYW1lXSA9IFtdO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRyYWNrVG9bbmFtZV0ucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICAgIC8vIHZhciBzZWxmID0gdGhpcztcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNvbnN0IGEgPSBzb3J0ZWRWZXJzaW9uc1tpXS52ZXI7XG4gICAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgICAgY29udGludWU7XG4gICAgICBpZiAoYSAhPT0gYilcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvKipcblx0ICogU29ydCBieSBkZXNjZW5kaW5nXG5cdCAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cblx0ICovXG4gIHByb3RlY3RlZCBzb3J0QnlWZXJzaW9uKHZlckluZm9MaXN0OiBEZXBJbmZvW10sIG5hbWU6IHN0cmluZykge1xuICAgIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgICB0cnkge1xuICAgICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgICAgcmV0dXJuIGluZm8xLnByZSA9PT0gJycgJiYgaW5mbzIucHJlICE9PSAnJyA/IC0xIDpcbiAgICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKGluZm8xLCBpbmZvMik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzIudmVyTnVtICE9IG51bGwgJiYgaW5mbzEudmVyTnVtID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICB9XG59XG4iXX0=