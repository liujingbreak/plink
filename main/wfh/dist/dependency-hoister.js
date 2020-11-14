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
const Path = __importStar(require("path"));
const semver = require('semver');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
function listCompDependency(pkJsonFiles, workspace, workspaceDeps, excludeDep) {
    // log.info('scan components from:\n', pkJsonFiles.join('\n'));
    const installer = new InstallManager(workspaceDeps, workspace, excludeDep);
    if (typeof pkJsonFiles[0] === 'string')
        installer.scanSrcDeps(pkJsonFiles);
    else
        installer.scanFor(pkJsonFiles);
    // installer.scanInstalledPeerDeps();
    const [HoistedDepInfo, HoistedPeerDepInfo] = installer.hoistDeps();
    return {
        hoisted: HoistedDepInfo,
        hoistedPeers: HoistedPeerDepInfo
    };
}
exports.listCompDependency = listCompDependency;
const versionReg = /^(\D*)(\d.*?)(?:\.tgz)?$/;
class InstallManager {
    constructor(workspaceDeps, workspaceName, excludeDeps) {
        this.excludeDeps = excludeDeps;
        /** key is dependency module name */
        this.srcDeps = new Map();
        this.peerDeps = new Map();
        for (const [name, version] of Object.entries(workspaceDeps)) {
            this._trackSrcDependency(name, version, `(${workspaceName})`);
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
                    self._trackSrcDependency(name, version, json.name);
                }
            }
            if (json.devDependencies) {
                log.warn(`${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
                    'you should move them to "dependencies" or "peerDependencies"');
                // for (const name of Object.keys(json.devDependencies)) {
                //   const version = json.devDependencies[name];
                //   self._trackSrcDependency(this.srcDeps, name, version, json.name);
                // }
            }
            if (json.peerDependencies) {
                // TODO: do not track peer dependency to install, but only notify in command line
                for (const name of Object.keys(json.peerDependencies)) {
                    const version = json.peerDependencies[name];
                    self._trackPeerDependency(name, version, json.name);
                }
            }
        }
    }
    scanSrcDeps(jsonFiles) {
        return this.scanFor(jsonFiles.map(packageJson => JSON.parse(fs.readFileSync(packageJson, 'utf8'))));
    }
    hoistDeps() {
        const dependentInfo = collectDependencyInfo(this.srcDeps);
        const peerDependentInfo = collectDependencyInfo(this.peerDeps);
        // merge peer dependent info list into regular dependent info list
        for (const [dep, info] of dependentInfo.entries()) {
            if (peerDependentInfo.has(dep)) {
                const peerInfo = peerDependentInfo.get(dep);
                if (!info.sameVer || !peerInfo.sameVer || info.by[0].ver !== peerInfo.by[0].ver) {
                    info.sameVer = false;
                }
                info.by.push(...peerInfo.by);
                peerDependentInfo.delete(dep);
            }
        }
        return [dependentInfo, peerDependentInfo];
    }
    _trackSrcDependency(name, version, byWhom) {
        if (this.excludeDeps.has(name))
            return;
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
    _trackPeerDependency(name, version, byWhom) {
        if (this.excludeDeps.has(name))
            return;
        if (!this.peerDeps.has(name)) {
            this.peerDeps.set(name, []);
        }
        const m = versionReg.exec(version);
        this.peerDeps.get(name).push({
            ver: version === '*' ? '' : version,
            verNum: m ? m[2] : undefined,
            pre: m ? m[1] : '',
            by: byWhom
        });
    }
}
exports.InstallManager = InstallManager;
function _containsDiffVersion(sortedVersions) {
    if (sortedVersions.length <= 1)
        return false;
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
function sortByVersion(verInfoList, name) {
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
function collectDependencyInfo(trackedRaw) {
    const dependentInfos = new Map();
    for (const [depName, versionList] of trackedRaw.entries()) {
        const versions = sortByVersion(versionList, depName);
        const hasDiffVersion = _containsDiffVersion(versionList);
        const info = {
            sameVer: !hasDiffVersion,
            by: versions.map(item => ({ ver: item.ver, name: item.by }))
        };
        dependentInfos.set(depName, info);
    }
    return dependentInfos;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS1ob2lzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvZGVwZW5kZW5jeS1ob2lzdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxvQ0FBb0M7QUFDcEMsdUNBQXlCO0FBR3pCLDJDQUE2QjtBQUU3QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQVNuRixTQUFnQixrQkFBa0IsQ0FDaEMsV0FBMkMsRUFDM0MsU0FBaUIsRUFDakIsYUFBdUMsRUFDdkMsVUFBMEM7SUFFMUMsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDM0UsSUFBSSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO1FBQ3BDLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBdUIsQ0FBQyxDQUFDOztRQUUvQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQWtDLENBQUMsQ0FBQztJQUN4RCxxQ0FBcUM7SUFDckMsTUFBTSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuRSxPQUFPO1FBQ0wsT0FBTyxFQUFFLGNBQWM7UUFDdkIsWUFBWSxFQUFFLGtCQUFrQjtLQUNqQyxDQUFDO0FBQ0osQ0FBQztBQWxCRCxnREFrQkM7QUFvQkQsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUM7QUFFOUMsTUFBYSxjQUFjO0lBTXpCLFlBQVksYUFBdUMsRUFBRSxhQUFxQixFQUFVLFdBQTJDO1FBQTNDLGdCQUFXLEdB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QUNGLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ25DO0lBQ0QsT0FBTyxjQUFjLENBQUM7QUFDeEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogc3RyaW5nW10gfCBQYWNrYWdlSnNvbkludGVyZltdLFxuICB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgd29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LFxuICBleGNsdWRlRGVwOiBNYXA8c3RyaW5nLCBhbnk+IHwgU2V0PHN0cmluZz5cbikge1xuICAvLyBsb2cuaW5mbygnc2NhbiBjb21wb25lbnRzIGZyb206XFxuJywgcGtKc29uRmlsZXMuam9pbignXFxuJykpO1xuICBjb25zdCBpbnN0YWxsZXIgPSBuZXcgSW5zdGFsbE1hbmFnZXIod29ya3NwYWNlRGVwcywgd29ya3NwYWNlLCBleGNsdWRlRGVwKTtcbiAgaWYgKHR5cGVvZiBwa0pzb25GaWxlc1swXSA9PT0gJ3N0cmluZycpXG4gICAgaW5zdGFsbGVyLnNjYW5TcmNEZXBzKHBrSnNvbkZpbGVzIGFzIHN0cmluZ1tdKTtcbiAgZWxzZVxuICAgIGluc3RhbGxlci5zY2FuRm9yKHBrSnNvbkZpbGVzIGFzIFBhY2thZ2VKc29uSW50ZXJmW10pO1xuICAvLyBpbnN0YWxsZXIuc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCk7XG4gIGNvbnN0IFtIb2lzdGVkRGVwSW5mbywgSG9pc3RlZFBlZXJEZXBJbmZvXSA9IGluc3RhbGxlci5ob2lzdERlcHMoKTtcbiAgcmV0dXJuIHtcbiAgICBob2lzdGVkOiBIb2lzdGVkRGVwSW5mbyxcbiAgICBob2lzdGVkUGVlcnM6IEhvaXN0ZWRQZWVyRGVwSW5mb1xuICB9O1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVudEluZm8ge1xuICAvKiogQWxsIGRlcGVuZGVudHMgb24gc2FtZSB2ZXJzaW9uICovXG4gIHNhbWVWZXI6IGJvb2xlYW47XG4gIGJ5OiBBcnJheTx7XG4gICAgLyoqIGRlcGVuZGVuY3kgdmVyc2lvbiAobm90IGRlcGVuZGVudCdzKSAqL1xuICAgIHZlcjogc3RyaW5nO1xuICAgIC8qKiBkZXBlbmRlbnQgbmFtZSAqL1xuICAgIG5hbWU6IHN0cmluZztcbiAgfT47XG59XG5cbmNvbnN0IHZlcnNpb25SZWcgPSAvXihcXEQqKShcXGQuKj8pKD86XFwudGd6KT8kLztcblxuZXhwb3J0IGNsYXNzIEluc3RhbGxNYW5hZ2VyIHtcbiAgdmVyYm9zTWVzc2FnZTogc3RyaW5nO1xuICAvKioga2V5IGlzIGRlcGVuZGVuY3kgbW9kdWxlIG5hbWUgKi9cbiAgcHJpdmF0ZSBzcmNEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHBlZXJEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuXG4gIGNvbnN0cnVjdG9yKHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSwgd29ya3NwYWNlTmFtZTogc3RyaW5nLCBwcml2YXRlIGV4Y2x1ZGVEZXBzOiBNYXA8c3RyaW5nLCBhbnk+IHwgU2V0PHN0cmluZz4pIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh3b3Jrc3BhY2VEZXBzKSkge1xuICAgICAgdGhpcy5fdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGAoJHt3b3Jrc3BhY2VOYW1lfSlgKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IFBhY2thZ2VKc29uSW50ZXJmW10pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAvLyB0aGlzLmNvbXBvbmVudE1hcCA9IHt9O1xuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICAvLyB0aGlzLmNvbXBvbmVudE1hcFtqc29uLm5hbWVdID0ge3ZlcjoganNvbi52ZXJzaW9uLCB0b0luc3RhbGw6IGZhbHNlfTtcbiAgICAgIGNvbnN0IGRlcHMgPSBqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc2NhblNyY0RlcHNBc3luYygpIGRlcCAnICsgbmFtZSk7XG4gICAgICAgICAgc2VsZi5fdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBsb2cud2FybihgJHtqc29uLm5hbWV9IGNvbnRhaW5zIFwiZGV2RGVwZW5lbmRpZXNcIiwgaWYgdGhleSBhcmUgbmVjZXNzYXJ5IGZvciBjb21waWxpbmcgdGhpcyBjb21wb25lbnRgICtcbiAgICAgICAgICAneW91IHNob3VsZCBtb3ZlIHRoZW0gdG8gXCJkZXBlbmRlbmNpZXNcIiBvciBcInBlZXJEZXBlbmRlbmNpZXNcIicpO1xuICAgICAgICAvLyBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgIC8vICAgY29uc3QgdmVyc2lvbiA9IGpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAvLyAgIHNlbGYuX3RyYWNrU3JjRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLnBlZXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgLy8gVE9ETzogZG8gbm90IHRyYWNrIHBlZXIgZGVwZW5kZW5jeSB0byBpbnN0YWxsLCBidXQgb25seSBub3RpZnkgaW4gY29tbWFuZCBsaW5lXG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICBzZWxmLl90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzY2FuU3JjRGVwcyhqc29uRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NhbkZvcihqc29uRmlsZXMubWFwKHBhY2thZ2VKc29uID0+IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCAndXRmOCcpKSkpO1xuICB9XG5cbiAgaG9pc3REZXBzKCkge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+ID0gY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMuc3JjRGVwcyk7XG4gICAgY29uc3QgcGVlckRlcGVuZGVudEluZm8gPSBjb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5wZWVyRGVwcyk7XG4gICAgLy8gbWVyZ2UgcGVlciBkZXBlbmRlbnQgaW5mbyBsaXN0IGludG8gcmVndWxhciBkZXBlbmRlbnQgaW5mbyBsaXN0XG4gICAgZm9yIChjb25zdCBbZGVwLCBpbmZvXSBvZiBkZXBlbmRlbnRJbmZvLmVudHJpZXMoKSkge1xuICAgICAgaWYgKHBlZXJEZXBlbmRlbnRJbmZvLmhhcyhkZXApKSB7XG4gICAgICAgIGNvbnN0IHBlZXJJbmZvID0gcGVlckRlcGVuZGVudEluZm8uZ2V0KGRlcCkhO1xuICAgICAgICBpZiAoIWluZm8uc2FtZVZlciB8fCAhcGVlckluZm8uc2FtZVZlciB8fCBpbmZvLmJ5WzBdLnZlciAhPT0gcGVlckluZm8uYnlbMF0udmVyKSB7XG4gICAgICAgICAgaW5mby5zYW1lVmVyID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaW5mby5ieS5wdXNoKC4uLnBlZXJJbmZvLmJ5KTtcbiAgICAgICAgcGVlckRlcGVuZGVudEluZm8uZGVsZXRlKGRlcCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFtkZXBlbmRlbnRJbmZvLCBwZWVyRGVwZW5kZW50SW5mb107XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5leGNsdWRlRGVwcy5oYXMobmFtZSkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCF0aGlzLnNyY0RlcHMuaGFzKG5hbWUpKSB7XG4gICAgICB0aGlzLnNyY0RlcHMuc2V0KG5hbWUsIFtdKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICB0aGlzLnNyY0RlcHMuZ2V0KG5hbWUpIS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tQZWVyRGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5leGNsdWRlRGVwcy5oYXMobmFtZSkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCF0aGlzLnBlZXJEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5wZWVyRGVwcy5zZXQobmFtZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRoaXMucGVlckRlcHMuZ2V0KG5hbWUpIS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY29udGFpbnNEaWZmVmVyc2lvbihzb3J0ZWRWZXJzaW9uczogRGVwSW5mb1tdKSB7XG4gIGlmIChzb3J0ZWRWZXJzaW9ucy5sZW5ndGggPD0gMSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gc29ydGVkVmVyc2lvbnMubGVuZ3RoIC0gMTsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGEgPSBzb3J0ZWRWZXJzaW9uc1tpXS52ZXI7XG4gICAgY29uc3QgYiA9IHNvcnRlZFZlcnNpb25zW2kgKyAxXS52ZXI7XG5cbiAgICBpZiAoYiA9PT0gJyonIHx8IGIgPT09ICcnKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGEgIT09IGIpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4vKipcbiAqIFNvcnQgYnkgZGVzY2VuZGluZ1xuICogQHBhcmFtIHZlckluZm9MaXN0IHt2ZXI6IHN0cmluZywgYnk6IHN0cmluZywgbmFtZTogc3RyaW5nfVxuICovXG5mdW5jdGlvbiBzb3J0QnlWZXJzaW9uKHZlckluZm9MaXN0OiBEZXBJbmZvW10sIG5hbWU6IHN0cmluZykge1xuICBpZiAodmVySW5mb0xpc3QgPT0gbnVsbCB8fCB2ZXJJbmZvTGlzdC5sZW5ndGggPT09IDEpXG4gICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICB0cnkge1xuICAgIHZlckluZm9MaXN0LnNvcnQoKGluZm8xLCBpbmZvMikgPT4ge1xuICAgICAgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSAhPSBudWxsKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gc2VtdmVyLnJjb21wYXJlKGluZm8xLnZlck51bSwgaW5mbzIudmVyTnVtKTtcbiAgICAgICAgICBpZiAocmVzID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGluZm8xLnByZSA9PT0gJycgJiYgaW5mbzIucHJlICE9PSAnJyA/IC0xIDpcbiAgICAgICAgICAgICAgKGluZm8xLnByZSAhPT0gJycgJiYgaW5mbzIucHJlID09PSAnJyA/IDEgOiAwKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLndhcm4oaW5mbzEsIGluZm8yKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgZWxzZSBpZiAoaW5mbzIudmVyTnVtICE9IG51bGwgJiYgaW5mbzEudmVyTnVtID09IG51bGwpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgZWxzZSBpZiAoaW5mbzEudmVyID4gaW5mbzIudmVyKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPCBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcihgSW52YWxpZCBzZW12ZXIgZm9ybWF0IGZvciAke25hbWUgfHwgJyd9OiBgICsgSlNPTi5zdHJpbmdpZnkodmVySW5mb0xpc3QsIG51bGwsICcgICcpKTtcbiAgICB0aHJvdyBlO1xuICB9XG4gIHJldHVybiB2ZXJJbmZvTGlzdDtcbn1cblxuZnVuY3Rpb24gY29sbGVjdERlcGVuZGVuY3lJbmZvKHRyYWNrZWRSYXc6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4pIHtcbiAgY29uc3QgZGVwZW5kZW50SW5mb3M6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+ID0gbmV3IE1hcCgpO1xuICBmb3IgKGNvbnN0IFtkZXBOYW1lLCB2ZXJzaW9uTGlzdF0gb2YgdHJhY2tlZFJhdy5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCB2ZXJzaW9ucyA9IHNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIGRlcE5hbWUpO1xuICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuXG4gICAgY29uc3QgaW5mbzogRGVwZW5kZW50SW5mbyA9IHtcbiAgICAgIHNhbWVWZXI6ICFoYXNEaWZmVmVyc2lvbixcbiAgICAgIGJ5OiB2ZXJzaW9ucy5tYXAoaXRlbSA9PiAoe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9KSlcbiAgICB9O1xuICAgIGRlcGVuZGVudEluZm9zLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgfVxuICByZXR1cm4gZGVwZW5kZW50SW5mb3M7XG59XG4iXX0=