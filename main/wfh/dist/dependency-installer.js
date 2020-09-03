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
        const hoistDeps = {};
        const depNames = Array.from(this.srcDeps.keys());
        if (this.srcDeps.size === 0)
            return {};
        depNames.sort();
        const nameWidth = _.maxBy(depNames, name => name.length).length;
        let printOut = '';
        printOut += _.padStart('Dependency ', nameWidth + 13) + '| Dependent\n';
        printOut += _.repeat('-', nameWidth + 13) + '|' + _.repeat('-', 10) + '\n';
        let countDep = 0;
        for (const name of depNames) {
            const versionList = this.srcDeps.get(name);
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
        this.verbosMessage = printOut;
        return hoistDeps;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1pbnN0YWxsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kZXBlbmRlbmN5LWluc3RhbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLHVDQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QixpQ0FBaUM7QUFDakMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBU25GLFNBQWdCLGtCQUFrQixDQUNoQyxXQUEyQyxFQUMzQyxTQUFpQixFQUNqQixhQUF1QztJQUV2QywrREFBK0Q7SUFDL0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQy9ELElBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtRQUNwQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQXVCLENBQUMsQ0FBQzs7UUFFL0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFrQyxDQUFDLENBQUM7SUFDeEQscUNBQXFDO0lBQ3JDLE9BQU8sRUFBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFDLENBQUM7QUFDOUUsQ0FBQztBQWJELGdEQWFDO0FBU0QsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUM7QUFFOUMsTUFBYSxjQUFjO0lBSXpCLHNFQUFzRTtJQUV0RSxZ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T0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDUCxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7b0JBQzVCLE9BQU8sQ0FBQyxDQUFDOztvQkFFVCxPQUFPLENBQUMsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRyxNQUFNLENBQUMsQ0FBQztTQUNUO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBNUtELHdDQTRLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogc3RyaW5nW10gfCBQYWNrYWdlSnNvbkludGVyZltdLFxuICB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgd29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9XG4pOiB7aG9pc3RlZDoge1tkZXA6IHN0cmluZ106IHN0cmluZ307IG1zZzogKCkgPT4gc3RyaW5nfSB7XG4gIC8vIGxvZy5pbmZvKCdzY2FuIGNvbXBvbmVudHMgZnJvbTpcXG4nLCBwa0pzb25GaWxlcy5qb2luKCdcXG4nKSk7XG4gIGNvbnN0IGluc3RhbGxlciA9IG5ldyBJbnN0YWxsTWFuYWdlcih3b3Jrc3BhY2VEZXBzLCB3b3Jrc3BhY2UpO1xuICBpZiAodHlwZW9mIHBrSnNvbkZpbGVzWzBdID09PSAnc3RyaW5nJylcbiAgICBpbnN0YWxsZXIuc2NhblNyY0RlcHMocGtKc29uRmlsZXMgYXMgc3RyaW5nW10pO1xuICBlbHNlXG4gICAgaW5zdGFsbGVyLnNjYW5Gb3IocGtKc29uRmlsZXMgYXMgUGFja2FnZUpzb25JbnRlcmZbXSk7XG4gIC8vIGluc3RhbGxlci5zY2FuSW5zdGFsbGVkUGVlckRlcHMoKTtcbiAgcmV0dXJuIHtob2lzdGVkOiBpbnN0YWxsZXIuaG9pc3REZXBzKCksIG1zZzogKCkgPT4gaW5zdGFsbGVyLnZlcmJvc01lc3NhZ2V9O1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xufVxuXG5jb25zdCB2ZXJzaW9uUmVnID0gL14oXFxEKikoXFxkLio/KSg/OlxcLnRneik/JC87XG5cbmV4cG9ydCBjbGFzcyBJbnN0YWxsTWFuYWdlciB7XG5cbiAgdmVyYm9zTWVzc2FnZTogc3RyaW5nO1xuICBwcml2YXRlIHNyY0RlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT47XG4gIC8vIGNvbXBvbmVudE1hcDoge1twTmFtZTogc3RyaW5nXToge3Zlcjogc3RyaW5nLCB0b0luc3RhbGw6IGJvb2xlYW59fTtcblxuICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sIHdvcmtzcGFjZU5hbWU6IHN0cmluZykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBJbnN0YWxsTWFuYWdlcikpIHtcbiAgICAgIHJldHVybiBuZXcgSW5zdGFsbE1hbmFnZXIod29ya3NwYWNlRGVwcywgd29ya3NwYWNlTmFtZSk7XG4gICAgfVxuICAgIHRoaXMuc3JjRGVwcyA9IG5ldyBNYXAoKTsgLy8gc3JjIHBhY2thZ2VzIG5lZWRlZCBkZXBlbmRlbmNpZXMgYW5kIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcbiAgICAvLyB0aGlzLnBlZXJEZXBzID0ge307IC8vIGFsbCBwYWNrYWdlcyBuZWVkZWQgcGVlciBkZXBlbmRlbmNpZXNcblxuICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHdvcmtzcGFjZURlcHMpKSB7XG4gICAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwgd29ya3NwYWNlTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgc2NhbkZvcihwa0pzb25zOiBQYWNrYWdlSnNvbkludGVyZltdKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgLy8gdGhpcy5jb21wb25lbnRNYXAgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGpzb24gb2YgcGtKc29ucykge1xuICAgICAgLy8gdGhpcy5jb21wb25lbnRNYXBbanNvbi5uYW1lXSA9IHt2ZXI6IGpzb24udmVyc2lvbiwgdG9JbnN0YWxsOiBmYWxzZX07XG4gICAgICBjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuICAgICAgICAgIHNlbGYuX3RyYWNrRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgbG9nLndhcm4oYCQke2pzb24ubmFtZX0gY29udGFpbnMgXCJkZXZEZXBlbmVuZGllc1wiLCBpZiB0aGV5IGFyZSBuZWNlc3NhcnkgZm9yIGNvbXBpbGluZyB0aGlzIGNvbXBvbmVudGAgK1xuICAgICAgICAgICd5b3Ugc2hvdWxkIG1vdmUgdGhlbSB0byBcImRlcGVuZGVuY2llc1wiIG9yIFwicGVlckRlcGVuZGVuY2llc1wiJyk7XG4gICAgICAgIC8vIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLmRldkRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgLy8gICBjb25zdCB2ZXJzaW9uID0ganNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgIC8vICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24ucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgc2VsZi5fdHJhY2tEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzY2FuU3JjRGVwcyhqc29uRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NhbkZvcihqc29uRmlsZXMubWFwKHBhY2thZ2VKc29uID0+IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCAndXRmOCcpKSkpO1xuICB9XG5cbiAgLy8gc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCkge1xuICAvLyAgIC8vIFRPRE86IEhlcmUgSSB3YW50IHRvIGRldGVybWluZSBleHBlY3RlZCBjb21wb25lbnQgdmVyc2lvbiB0byBpbnN0YWxsIHdpdGgsIGJ1dCBzbyBmYXIgdGhlIHZlcnNpb24gbnVtYmVyIG9mIGVhY2ggY29tcG9uZW50IHRoYXQgSSBnZXQgaXMgY3VycmVudGx5IGluc3RhbGxlZFxuICAvLyAgIC8vIG9uZSB3aGljaCBtaWdodCBiZSBpbmNvcnJlY3Qgb3Igb3V0ZGF0ZWQsIGluIGNhc2UgbGlrZSBkZXZlbG9wZXIgZGlkIG5vdCBydW4gXCJ5YXJuIGluc3RhbGxcIiBiZWZvcmUgXCJkcmNwIGluaXRcIi5cbiAgLy8gICAvLyBPbmUgcHJvYmxlbSBpczogXG4gIC8vICAgLy8gV2l0aG91dCBydW5uaW5nIFwieWFybiBpbnN0YWxsXCIgdG8gZG93bmxvYWQgXCJyZWNpcGVcIiBwYWNrYWdlLCBJIGNhbid0IGtub3cgZXhhY3QgdXAgdG8gZGF0ZSB2ZXJzaW9uIG51bWJlciBvZiB0aG9zZSBjb21wb25lbnRzXG4gIC8vICAgLy8gd2hpY2ggYmVsb25nIHRvIGEgY2VydGFpbiBcInJlY2lwZVwiIHBhY2FrZ2UuXG4gIC8vICAgLy8gU28gZmlyc3RseSwgYWx3YXlzIFwieWFybiBpbnN0YWxsXCIgYmVmb3JlIFwiZHJjcCBpbml0XCJcblxuICAvLyAgIC8vIEFub3RoZXIgcHJvYmxlbSBpczpcbiAgLy8gICAvLyBUaGVzZSBvbGQgY29tcG9uZW50IHZlcnNpb25zIGFyZSB0cmFja2VkIGluIGRpc3QvZHIucGFja2FnZS5qc29uIHdhaXRpbmcgZm9yIGJlaW5nIGNvbXBhcmVkIHdpdGggbmV3bHkgY2hhbmdlZCB2ZXJzaW9uIGxpc3QuXG4gIC8vICAgLy8gQnV0IC4uLlxuICAvLyAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoKG5hbWUsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lLCBqc29uLCBwYWNrYWdlUGF0aCkgPT4ge1xuICAvLyAgICAgaWYgKF8uaGFzKHRoaXMuY29tcG9uZW50TWFwLCBuYW1lKSlcbiAgLy8gICAgICAgcmV0dXJuOyAvLyBTa2lwIGl0LCBzaW5jZSBtb3N0IGxpa2VseSB0aGVyZSBpcyBhIGR1cGxpY2F0ZSBcImluc3RhbGxlZFwiIGRlcGVuZGVuY3kgaW4gcGFja2FnZS5qc29uIGFnYWluc3QgYW4gc3ltYm9saWMgbGlua2VkIGNvbXBvbmVudFxuICAvLyAgICAgdGhpcy5jb21wb25lbnRNYXBbbmFtZV0gPSB7dmVyOiBqc29uLnZlcnNpb24sIHRvSW5zdGFsbDogdHJ1ZX07XG4gIC8vICAgICBfLmVhY2goanNvbi5wZWVyRGVwZW5kZW5jaWVzLCAodmVyc2lvbiwgbmFtZSkgPT4ge1xuICAvLyAgICAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAvLyAgICAgfSk7XG4gIC8vICAgfSwgJ2luc3RhbGxlZCcpO1xuICAvLyB9XG5cbiAgaG9pc3REZXBzKCkge1xuICAgIGNvbnN0IGhvaXN0RGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICAgIGNvbnN0IGRlcE5hbWVzID0gQXJyYXkuZnJvbSh0aGlzLnNyY0RlcHMua2V5cygpKTtcbiAgICBpZiAodGhpcy5zcmNEZXBzLnNpemUgPT09IDApXG4gICAgICByZXR1cm4ge307XG4gICAgZGVwTmFtZXMuc29ydCgpO1xuICAgIGNvbnN0IG5hbWVXaWR0aCA9IF8ubWF4QnkoZGVwTmFtZXMsIG5hbWUgPT4gbmFtZS5sZW5ndGgpIS5sZW5ndGg7XG4gICAgbGV0IHByaW50T3V0ID0gJyc7XG4gICAgcHJpbnRPdXQgKz0gXy5wYWRTdGFydCgnRGVwZW5kZW5jeSAnLCBuYW1lV2lkdGggKyAxMykgKyAnfCBEZXBlbmRlbnRcXG4nO1xuICAgIHByaW50T3V0ICs9IF8ucmVwZWF0KCctJywgbmFtZVdpZHRoICsgMTMpICsgJ3wnICsgXy5yZXBlYXQoJy0nLCAxMCkgKyAnXFxuJztcbiAgICBsZXQgY291bnREZXAgPSAwO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBkZXBOYW1lcykge1xuICAgICAgY29uc3QgdmVyc2lvbkxpc3QgPSB0aGlzLnNyY0RlcHMuZ2V0KG5hbWUpITtcbiAgICAgIGNvbnN0IGZpcnN0VmVyc2lvbiA9IHRoaXMuc29ydEJ5VmVyc2lvbih2ZXJzaW9uTGlzdCwgbmFtZSlbMF07XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IHByZWZlci1jb25zdFxuICAgICAgbGV0IG1hcmtOZXcgPSAnICAnO1xuXG4gICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IHRoaXMuX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuICAgICAgY29uc3QgcHJpbnROYW1lID0gKGhhc0RpZmZWZXJzaW9uID8gY2hhbGsucmVkIDogY2hhbGsuY3lhbikoXy5wYWRTdGFydChtYXJrTmV3ICsgbmFtZSwgbmFtZVdpZHRoLCAnICcpKTtcbiAgICAgIHByaW50T3V0ICs9IGAke3ByaW50TmFtZX0gJHt2ZXJzaW9uTGlzdC5sZW5ndGggPiAxID8gJ+KUgOKUrOKUgCcgOiAn4pSA4pSA4pSAJ30ke18ucGFkRW5kKCcgJyArIGZpcnN0VmVyc2lvbi52ZXIgKyAnICcsIDksICcgJyl9ICR7Zmlyc3RWZXJzaW9uLmJ5fVxcbmA7XG4gICAgICB2YXIgaSA9IHZlcnNpb25MaXN0Lmxlbmd0aCAtIDE7XG4gICAgICBmb3IgKGNvbnN0IHJlc3Qgb2YgdmVyc2lvbkxpc3Quc2xpY2UoMSkpIHtcbiAgICAgICAgcHJpbnRPdXQgKz0gYCR7Xy5yZXBlYXQoJyAnLCBuYW1lV2lkdGgpfSAke2kgPT09IDEgPyAnIOKUlOKUgCcgOiAnIOKUnOKUgCd9JHtfLnBhZEVuZCgnICcgKyByZXN0LnZlciArICcgJywgOSwgJyAnKX0gJHtyZXN0LmJ5fVxcbmA7XG4gICAgICAgIGktLTtcbiAgICAgIH1cbiAgICAgIGNvdW50RGVwKys7XG5cbiAgICAgIGhvaXN0RGVwc1tuYW1lXSA9IGZpcnN0VmVyc2lvbi52ZXI7XG4gICAgfVxuICAgIHByaW50T3V0ICs9IF8ucGFkKGAgdG90YWwgJHtjaGFsay5ncmVlbihjb3VudERlcCl9IGAsIDYwLCAnLScpO1xuICAgIHRoaXMudmVyYm9zTWVzc2FnZSA9IHByaW50T3V0O1xuXG4gICAgcmV0dXJuIGhvaXN0RGVwcztcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICghdGhpcy5zcmNEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5zcmNEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5zcmNEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICAgIC8vIHZhciBzZWxmID0gdGhpcztcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNvbnN0IGEgPSBzb3J0ZWRWZXJzaW9uc1tpXS52ZXI7XG4gICAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgICAgY29udGludWU7XG4gICAgICBpZiAoYSAhPT0gYilcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvKipcblx0ICogU29ydCBieSBkZXNjZW5kaW5nXG5cdCAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cblx0ICovXG4gIHByb3RlY3RlZCBzb3J0QnlWZXJzaW9uKHZlckluZm9MaXN0OiBEZXBJbmZvW10sIG5hbWU6IHN0cmluZykge1xuICAgIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgICB0cnkge1xuICAgICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgICAgcmV0dXJuIGluZm8xLnByZSA9PT0gJycgJiYgaW5mbzIucHJlICE9PSAnJyA/IC0xIDpcbiAgICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKGluZm8xLCBpbmZvMik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgZWxzZSBpZiAoaW5mbzIudmVyTnVtICE9IG51bGwgJiYgaW5mbzEudmVyTnVtID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICB9XG59XG4iXX0=