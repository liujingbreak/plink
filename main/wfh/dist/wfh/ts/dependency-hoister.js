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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallManager = exports.listCompDependency = void 0;
/* tslint:disable max-line-length */
const fs = __importStar(require("fs"));
// import {mkdirpSync} from 'fs-extra';
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
// import config from './config';
const chalk = require('chalk');
const semver = require('semver');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
function listCompDependency(pkJsonFiles, workspace, workspaceDeps) {
    // log.info('scan components from:\n', pkJsonFiles.join('\n'));
    const installer = new InstallManager(workspaceDeps, workspace);
    if (typeof pkJsonFiles[0] === 'string')
        installer.scanSrcDeps(pkJsonFiles);
    else
        installer.scanFor(pkJsonFiles);
    // installer.scanInstalledPeerDeps();
    return { hoisted: installer.hoistDeps(), msg: () => installer.verbosMessage };
}
exports.listCompDependency = listCompDependency;
const versionReg = /^(\D*)(\d.*?)(?:\.tgz)?$/;
class InstallManager {
    // componentMap: {[pName: string]: {ver: string, toInstall: boolean}};
    constructor(workspaceDeps, workspaceName) {
        /** key is dependency module name */
        this.srcDeps = new Map();
        if (!(this instanceof InstallManager)) {
            return new InstallManager(workspaceDeps, workspaceName);
        }
        this.srcDeps = new Map(); // src packages needed dependencies and all packages needed peer dependencies
        // this.peerDeps = {}; // all packages needed peer dependencies
        for (const [name, version] of Object.entries(workspaceDeps)) {
            this._trackDependency(name, version, workspaceName);
        }
    }
    scanFor(pkJsons) {
        const self = this;
        // this.componentMap = {};
        for (const json of pkJsons) {
            // this.componentMap[json.name] = {ver: json.version, toInstall: false};
            const deps = json.dependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    // log.debug('scanSrcDepsAsync() dep ' + name);
                    self._trackDependency(name, version, json.name);
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
                    self._trackDependency(name, version, json.name);
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
        const dependentInfo = new Map();
        // const hoistDeps: {[dep: string]: string} = {};
        const depNames = Array.from(this.srcDeps.keys());
        if (this.srcDeps.size === 0)
            return dependentInfo;
        depNames.sort();
        const nameWidth = _.maxBy(depNames, name => name.length).length;
        const col0Width = nameWidth + 15;
        let printOut = '';
        printOut += _.padStart('Dependency ', col0Width - 1) + '| Dependent\n';
        printOut += _.repeat('-', col0Width) + '|' + _.repeat('-', 10) + '\n';
        let countDep = 0;
        for (const name of depNames) {
            const versionList = this.srcDeps.get(name);
            const firstVersion = this.sortByVersion(versionList, name)[0];
            const hasDiffVersion = this._containsDiffVersion(versionList);
            const dependentInfos = {
                sameVer: !hasDiffVersion,
                by: [{ ver: firstVersion.ver, name: firstVersion.by }]
            };
            const printName = (hasDiffVersion ? chalk.red : chalk.cyan)(_.padStart(name, nameWidth, ' '));
            printOut += `${printName} ${versionList.length > 1 ? '─┬─' : '───'}${_.padEnd(' ' + firstVersion.ver + ' ', 12, ' ')} ${firstVersion.by}\n`;
            var i = versionList.length - 1;
            for (const rest of versionList.slice(1)) {
                dependentInfos.by.push({ ver: rest.ver, name: rest.by });
                printOut += `${_.repeat(' ', nameWidth)} ${i === 1 ? ' └─' : ' ├─'}${_.padEnd(' ' + rest.ver + ' ', 12, ' ')} ${rest.by}\n`;
                i--;
            }
            countDep++;
            // hoistDeps[name] = firstVersion.ver;
            dependentInfo.set(name, dependentInfos);
        }
        printOut += _.pad(` total ${chalk.green(countDep)} `, 60, '-');
        this.verbosMessage = printOut;
        return dependentInfo;
    }
    _trackDependency(name, version, byWhom) {
        if (!this.srcDeps.has(name)) {
            this.srcDeps.set(name, []);
        }
        const m = versionReg.exec(version);
        this.srcDeps.get(name).push({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1ob2lzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdHMvZGVwZW5kZW5jeS1ob2lzdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsdUNBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLGlDQUFpQztBQUNqQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFTbkYsU0FBZ0Isa0JBQWtCLENBQ2hDLFdBQTJDLEVBQzNDLFNBQWlCLEVBQ2pCLGFBQXVDO0lBRXZDLCtEQUErRDtJQUMvRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDL0QsSUFBSSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO1FBQ3BDLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBdUIsQ0FBQyxDQUFDOztRQUUvQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQWtDLENBQUMsQ0FBQztJQUN4RCxxQ0FBcUM7SUFDckMsT0FBTyxFQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUMsQ0FBQztBQUM5RSxDQUFDO0FBYkQsZ0RBYUM7QUFvQkQsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUM7QUFFOUMsTUFBYSxjQUFjO0lBSXpCLHNFQUFzRTtJQUV0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RixNQUFNLFNBQVMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlGLFFBQVEsSUFBSSxHQUFHLFNBQVMsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQztZQUM1SSxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUMvQixLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3ZDLGNBQWMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDO2dCQUN2RCxRQUFRLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDO2dCQUM1SCxDQUFDLEVBQUUsQ0FBQzthQUNMO1lBQ0QsUUFBUSxFQUFFLENBQUM7WUFDWCxzQ0FBc0M7WUFDdEMsYUFBYSxD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Q0FBQztxQkFDZDtvQkFBQyxPQUFPLENBQUMsRUFBRTt3QkFDVixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztxQkFDeEI7aUJBQ0Y7cUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ3JELE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ1AsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUk7b0JBQ25ELE9BQU8sQ0FBQyxDQUFDO3FCQUNOLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztvQkFDNUIsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDUCxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7b0JBQzVCLE9BQU8sQ0FBQyxDQUFDOztvQkFFVCxPQUFPLENBQUMsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsQ0FBQztTQUNUO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBakxELHdDQWlMQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogc3RyaW5nW10gfCBQYWNrYWdlSnNvbkludGVyZltdLFxuICB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgd29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9XG4pIHtcbiAgLy8gbG9nLmluZm8oJ3NjYW4gY29tcG9uZW50cyBmcm9tOlxcbicsIHBrSnNvbkZpbGVzLmpvaW4oJ1xcbicpKTtcbiAgY29uc3QgaW5zdGFsbGVyID0gbmV3IEluc3RhbGxNYW5hZ2VyKHdvcmtzcGFjZURlcHMsIHdvcmtzcGFjZSk7XG4gIGlmICh0eXBlb2YgcGtKc29uRmlsZXNbMF0gPT09ICdzdHJpbmcnKVxuICAgIGluc3RhbGxlci5zY2FuU3JjRGVwcyhwa0pzb25GaWxlcyBhcyBzdHJpbmdbXSk7XG4gIGVsc2VcbiAgICBpbnN0YWxsZXIuc2NhbkZvcihwa0pzb25GaWxlcyBhcyBQYWNrYWdlSnNvbkludGVyZltdKTtcbiAgLy8gaW5zdGFsbGVyLnNjYW5JbnN0YWxsZWRQZWVyRGVwcygpO1xuICByZXR1cm4ge2hvaXN0ZWQ6IGluc3RhbGxlci5ob2lzdERlcHMoKSwgbXNnOiAoKSA9PiBpbnN0YWxsZXIudmVyYm9zTWVzc2FnZX07XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBEZXBlbmRlbnRJbmZvIHtcbiAgLyoqIEFsbCBkZXBlbmRlbnRzIG9uIHNhbWUgdmVyc2lvbiAqL1xuICBzYW1lVmVyOiBib29sZWFuO1xuICBieTogQXJyYXk8e1xuICAgIC8qKiBkZXBlbmRlbmN5IHZlcnNpb24gKG5vdCBkZXBlbmRlbnQncykgKi9cbiAgICB2ZXI6IHN0cmluZztcbiAgICAvKiogZGVwZW5kZW50IG5hbWUgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG4gIH0+O1xufVxuXG5jb25zdCB2ZXJzaW9uUmVnID0gL14oXFxEKikoXFxkLio/KSg/OlxcLnRneik/JC87XG5cbmV4cG9ydCBjbGFzcyBJbnN0YWxsTWFuYWdlciB7XG4gIHZlcmJvc01lc3NhZ2U6IHN0cmluZztcbiAgLyoqIGtleSBpcyBkZXBlbmRlbmN5IG1vZHVsZSBuYW1lICovXG4gIHByaXZhdGUgc3JjRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgLy8gY29tcG9uZW50TWFwOiB7W3BOYW1lOiBzdHJpbmddOiB7dmVyOiBzdHJpbmcsIHRvSW5zdGFsbDogYm9vbGVhbn19O1xuXG4gIGNvbnN0cnVjdG9yKHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSwgd29ya3NwYWNlTmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEluc3RhbGxNYW5hZ2VyKSkge1xuICAgICAgcmV0dXJuIG5ldyBJbnN0YWxsTWFuYWdlcih3b3Jrc3BhY2VEZXBzLCB3b3Jrc3BhY2VOYW1lKTtcbiAgICB9XG4gICAgdGhpcy5zcmNEZXBzID0gbmV3IE1hcCgpOyAvLyBzcmMgcGFja2FnZXMgbmVlZGVkIGRlcGVuZGVuY2llcyBhbmQgYWxsIHBhY2thZ2VzIG5lZWRlZCBwZWVyIGRlcGVuZGVuY2llc1xuICAgIC8vIHRoaXMucGVlckRlcHMgPSB7fTsgLy8gYWxsIHBhY2thZ2VzIG5lZWRlZCBwZWVyIGRlcGVuZGVuY2llc1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMod29ya3NwYWNlRGVwcykpIHtcbiAgICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCB3b3Jrc3BhY2VOYW1lKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IFBhY2thZ2VKc29uSW50ZXJmW10pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAvLyB0aGlzLmNvbXBvbmVudE1hcCA9IHt9O1xuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICAvLyB0aGlzLmNvbXBvbmVudE1hcFtqc29uLm5hbWVdID0ge3ZlcjoganNvbi52ZXJzaW9uLCB0b0luc3RhbGw6IGZhbHNlfTtcbiAgICAgIGNvbnN0IGRlcHMgPSBqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc2NhblNyY0RlcHNBc3luYygpIGRlcCAnICsgbmFtZSk7XG4gICAgICAgICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBsb2cud2FybihgJCR7anNvbi5uYW1lfSBjb250YWlucyBcImRldkRlcGVuZW5kaWVzXCIsIGlmIHRoZXkgYXJlIG5lY2Vzc2FyeSBmb3IgY29tcGlsaW5nIHRoaXMgY29tcG9uZW50YCArXG4gICAgICAgICAgJ3lvdSBzaG91bGQgbW92ZSB0aGVtIHRvIFwiZGVwZW5kZW5jaWVzXCIgb3IgXCJwZWVyRGVwZW5kZW5jaWVzXCInKTtcbiAgICAgICAgLy8gZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24uZGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAvLyAgIGNvbnN0IHZlcnNpb24gPSBqc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgLy8gICBzZWxmLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICBzZWxmLl90cmFja0RlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNjYW5TcmNEZXBzKGpzb25GaWxlczogc3RyaW5nW10pIHtcbiAgICByZXR1cm4gdGhpcy5zY2FuRm9yKGpzb25GaWxlcy5tYXAocGFja2FnZUpzb24gPT4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb24sICd1dGY4JykpKSk7XG4gIH1cblxuICAvLyBzY2FuSW5zdGFsbGVkUGVlckRlcHMoKSB7XG4gIC8vICAgLy8gVE9ETzogSGVyZSBJIHdhbnQgdG8gZGV0ZXJtaW5lIGV4cGVjdGVkIGNvbXBvbmVudCB2ZXJzaW9uIHRvIGluc3RhbGwgd2l0aCwgYnV0IHNvIGZhciB0aGUgdmVyc2lvbiBudW1iZXIgb2YgZWFjaCBjb21wb25lbnQgdGhhdCBJIGdldCBpcyBjdXJyZW50bHkgaW5zdGFsbGVkXG4gIC8vICAgLy8gb25lIHdoaWNoIG1pZ2h0IGJlIGluY29ycmVjdCBvciBvdXRkYXRlZCwgaW4gY2FzZSBsaWtlIGRldmVsb3BlciBkaWQgbm90IHJ1biBcInlhcm4gaW5zdGFsbFwiIGJlZm9yZSBcImRyY3AgaW5pdFwiLlxuICAvLyAgIC8vIE9uZSBwcm9ibGVtIGlzOiBcbiAgLy8gICAvLyBXaXRob3V0IHJ1bm5pbmcgXCJ5YXJuIGluc3RhbGxcIiB0byBkb3dubG9hZCBcInJlY2lwZVwiIHBhY2thZ2UsIEkgY2FuJ3Qga25vdyBleGFjdCB1cCB0byBkYXRlIHZlcnNpb24gbnVtYmVyIG9mIHRob3NlIGNvbXBvbmVudHNcbiAgLy8gICAvLyB3aGljaCBiZWxvbmcgdG8gYSBjZXJ0YWluIFwicmVjaXBlXCIgcGFjYWtnZS5cbiAgLy8gICAvLyBTbyBmaXJzdGx5LCBhbHdheXMgXCJ5YXJuIGluc3RhbGxcIiBiZWZvcmUgXCJkcmNwIGluaXRcIlxuXG4gIC8vICAgLy8gQW5vdGhlciBwcm9ibGVtIGlzOlxuICAvLyAgIC8vIFRoZXNlIG9sZCBjb21wb25lbnQgdmVyc2lvbnMgYXJlIHRyYWNrZWQgaW4gZGlzdC9kci5wYWNrYWdlLmpzb24gd2FpdGluZyBmb3IgYmVpbmcgY29tcGFyZWQgd2l0aCBuZXdseSBjaGFuZ2VkIHZlcnNpb24gbGlzdC5cbiAgLy8gICAvLyBCdXQgLi4uXG4gIC8vICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygobmFtZSwgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWUsIGpzb24sIHBhY2thZ2VQYXRoKSA9PiB7XG4gIC8vICAgICBpZiAoXy5oYXModGhpcy5jb21wb25lbnRNYXAsIG5hbWUpKVxuICAvLyAgICAgICByZXR1cm47IC8vIFNraXAgaXQsIHNpbmNlIG1vc3QgbGlrZWx5IHRoZXJlIGlzIGEgZHVwbGljYXRlIFwiaW5zdGFsbGVkXCIgZGVwZW5kZW5jeSBpbiBwYWNrYWdlLmpzb24gYWdhaW5zdCBhbiBzeW1ib2xpYyBsaW5rZWQgY29tcG9uZW50XG4gIC8vICAgICB0aGlzLmNvbXBvbmVudE1hcFtuYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiB0cnVlfTtcbiAgLy8gICAgIF8uZWFjaChqc29uLnBlZXJEZXBlbmRlbmNpZXMsICh2ZXJzaW9uLCBuYW1lKSA9PiB7XG4gIC8vICAgICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gIC8vICAgICB9KTtcbiAgLy8gICB9LCAnaW5zdGFsbGVkJyk7XG4gIC8vIH1cblxuICBob2lzdERlcHMoKSB7XG4gICAgY29uc3QgZGVwZW5kZW50SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4gPSBuZXcgTWFwKCk7XG4gICAgLy8gY29uc3QgaG9pc3REZXBzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gICAgY29uc3QgZGVwTmFtZXMgPSBBcnJheS5mcm9tKHRoaXMuc3JjRGVwcy5rZXlzKCkpO1xuICAgIGlmICh0aGlzLnNyY0RlcHMuc2l6ZSA9PT0gMClcbiAgICAgIHJldHVybiBkZXBlbmRlbnRJbmZvO1xuICAgIGRlcE5hbWVzLnNvcnQoKTtcbiAgICBjb25zdCBuYW1lV2lkdGggPSBfLm1heEJ5KGRlcE5hbWVzLCBuYW1lID0+IG5hbWUubGVuZ3RoKSEubGVuZ3RoO1xuICAgIGNvbnN0IGNvbDBXaWR0aCA9IG5hbWVXaWR0aCArIDE1O1xuICAgIGxldCBwcmludE91dCA9ICcnO1xuICAgIHByaW50T3V0ICs9IF8ucGFkU3RhcnQoJ0RlcGVuZGVuY3kgJywgY29sMFdpZHRoIC0gMSkgKyAnfCBEZXBlbmRlbnRcXG4nO1xuICAgIHByaW50T3V0ICs9IF8ucmVwZWF0KCctJywgY29sMFdpZHRoKSArICd8JyArIF8ucmVwZWF0KCctJywgMTApICsgJ1xcbic7XG4gICAgbGV0IGNvdW50RGVwID0gMDtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZGVwTmFtZXMpIHtcbiAgICAgIGNvbnN0IHZlcnNpb25MaXN0ID0gdGhpcy5zcmNEZXBzLmdldChuYW1lKSE7XG4gICAgICBjb25zdCBmaXJzdFZlcnNpb24gPSB0aGlzLnNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIG5hbWUpWzBdO1xuICAgICAgY29uc3QgaGFzRGlmZlZlcnNpb24gPSB0aGlzLl9jb250YWluc0RpZmZWZXJzaW9uKHZlcnNpb25MaXN0KTtcbiAgICAgIGNvbnN0IGRlcGVuZGVudEluZm9zOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiAhaGFzRGlmZlZlcnNpb24sXG4gICAgICAgIGJ5OiBbe3ZlcjogZmlyc3RWZXJzaW9uLnZlciwgbmFtZTogZmlyc3RWZXJzaW9uLmJ5fV1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHByaW50TmFtZSA9IChoYXNEaWZmVmVyc2lvbiA/IGNoYWxrLnJlZCA6IGNoYWxrLmN5YW4pKF8ucGFkU3RhcnQobmFtZSwgbmFtZVdpZHRoLCAnICcpKTtcbiAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKCcgJyArIGZpcnN0VmVyc2lvbi52ZXIgKyAnICcsIDEyLCAnICcpfSAke2ZpcnN0VmVyc2lvbi5ieX1cXG5gO1xuICAgICAgdmFyIGkgPSB2ZXJzaW9uTGlzdC5sZW5ndGggLSAxO1xuICAgICAgZm9yIChjb25zdCByZXN0IG9mIHZlcnNpb25MaXN0LnNsaWNlKDEpKSB7XG4gICAgICAgIGRlcGVuZGVudEluZm9zLmJ5LnB1c2goe3ZlcjogcmVzdC52ZXIsIG5hbWU6IHJlc3QuYnl9KTtcbiAgICAgICAgcHJpbnRPdXQgKz0gYCR7Xy5yZXBlYXQoJyAnLCBuYW1lV2lkdGgpfSAke2kgPT09IDEgPyAnIOKUlOKUgCcgOiAnIOKUnOKUgCd9JHtfLnBhZEVuZCgnICcgKyByZXN0LnZlciArICcgJywgMTIsICcgJyl9ICR7cmVzdC5ieX1cXG5gO1xuICAgICAgICBpLS07XG4gICAgICB9XG4gICAgICBjb3VudERlcCsrO1xuICAgICAgLy8gaG9pc3REZXBzW25hbWVdID0gZmlyc3RWZXJzaW9uLnZlcjtcbiAgICAgIGRlcGVuZGVudEluZm8uc2V0KG5hbWUsIGRlcGVuZGVudEluZm9zKTtcbiAgICB9XG4gICAgcHJpbnRPdXQgKz0gXy5wYWQoYCB0b3RhbCAke2NoYWxrLmdyZWVuKGNvdW50RGVwKX0gYCwgNjAsICctJyk7XG4gICAgdGhpcy52ZXJib3NNZXNzYWdlID0gcHJpbnRPdXQ7XG5cbiAgICByZXR1cm4gZGVwZW5kZW50SW5mbztcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICghdGhpcy5zcmNEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5zcmNEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5zcmNEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICAgIC8vIHZhciBzZWxmID0gdGhpcztcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNvbnN0IGEgPSBzb3J0ZWRWZXJzaW9uc1tpXS52ZXI7XG4gICAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgICAgY29udGludWU7XG4gICAgICBpZiAoYSAhPT0gYilcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvKipcblx0ICogU29ydCBieSBkZXNjZW5kaW5nXG5cdCAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cblx0ICovXG4gIHByb3RlY3RlZCBzb3J0QnlWZXJzaW9uKHZlckluZm9MaXN0OiBEZXBJbmZvW10sIG5hbWU6IHN0cmluZykge1xuICAgIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgICB0cnkge1xuICAgICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgICAgcmV0dXJuIGluZm8xLnByZSA9PT0gJycgJiYgaW5mbzIucHJlICE9PSAnJyA/IC0xIDpcbiAgICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKGluZm8xLCBpbmZvMik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzIudmVyTnVtICE9IG51bGwgJiYgaW5mbzEudmVyTnVtID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICB9XG59XG4iXX0=