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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallManager = exports.listCompDependency = void 0;
/* tslint:disable max-line-length */
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const misc_1 = require("./utils/misc");
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
        this.directDeps = new Map();
        this.srcDeps = new Map();
        this.peerDeps = new Map();
        this.directDepsList = new misc_1.SimpleLinkedList();
        for (const [name, version] of Object.entries(workspaceDeps)) {
            if (this.excludeDeps.has(name))
                continue;
            const m = versionReg.exec(version);
            const currNode = this.directDepsList.push([name, {
                    ver: version === '*' ? '' : version,
                    verNum: m ? m[2] : undefined,
                    pre: m ? m[1] : '',
                    by: `(${workspaceName})`
                }]);
            this.directDeps.set(name, currNode);
        }
    }
    scanFor(pkJsons) {
        const self = this;
        for (const json of pkJsons) {
            const deps = json.dependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    // log.debug('scanSrcDepsAsync() dep ' + name);
                    self._trackSrcDependency(name, version, json.name);
                }
            }
            if (json.devDependencies) {
                log.warn(`${json.name} contains "devDepenendies", if they are necessary for compiling this component ` +
                    'you should move them to "dependencies" or "peerDependencies"');
                // for (const name of Object.keys(json.devDependencies)) {
                //   const version = json.devDependencies[name];
                //   self._trackSrcDependency(this.srcDeps, name, version, json.name);
                // }
            }
            if (json.peerDependencies) {
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
        const dependentInfo = this.collectDependencyInfo(this.srcDeps);
        const peerDependentInfo = this.collectDependencyInfo(this.peerDeps, false);
        // merge peer dependent info list into regular dependent info list
        for (const [peerDep, peerInfo] of peerDependentInfo.entries()) {
            if (!peerInfo.missing)
                continue;
            const normInfo = dependentInfo.get(peerDep);
            if (normInfo) {
                peerInfo.duplicatePeer = true;
                peerInfo.missing = false;
                peerInfo.by.unshift(normInfo.by[0]);
            }
        }
        for (const [depName, item] of this.directDepsList.traverse()) {
            const info = {
                sameVer: true,
                direct: true,
                missing: false,
                duplicatePeer: false,
                by: [{ ver: item.ver, name: item.by }]
            };
            dependentInfo.set(depName, info);
        }
        return [dependentInfo, peerDependentInfo];
    }
    collectDependencyInfo(trackedRaw, notPeerDeps = true) {
        const dependentInfos = new Map();
        for (const [depName, versionList] of trackedRaw.entries()) {
            const directVer = this.directDeps.get(depName);
            const versions = sortByVersion(versionList, depName);
            if (directVer) {
                versions.unshift(directVer.value[1]);
                if (notPeerDeps) {
                    this.directDepsList.removeNode(directVer);
                }
            }
            const hasDiffVersion = _containsDiffVersion(versionList);
            const direct = this.directDeps.has(depName);
            const info = {
                sameVer: !hasDiffVersion,
                direct,
                missing: notPeerDeps ? false : !direct,
                duplicatePeer: false,
                by: versions.map(item => ({ ver: item.ver, name: item.by }))
            };
            dependentInfos.set(depName, info);
        }
        return dependentInfos;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyx1Q0FBeUI7QUFHekIsMkNBQTZCO0FBQzdCLHVDQUFvRTtBQUNwRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQVNuRixTQUFnQixrQkFBa0IsQ0FDaEMsV0FBMkMsRUFDM0MsU0FBaUIsRUFDakIsYUFBdUMsRUFDdkMsVUFBMEM7SUFFMUMsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDM0UsSUFBSSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO1FBQ3BDLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBdUIsQ0FBQyxDQUFDOztRQUUvQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQWtDLENBQUMsQ0FBQztJQUN4RCxxQ0FBcUM7SUFDckMsTUFBTSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuRSxPQUFPO1FBQ0wsT0FBTyxFQUFFLGNBQWM7UUFDdkIsWUFBWSxFQUFFLGtCQUFrQjtLQUNqQyxDQUFDO0FBQ0osQ0FBQztBQWxCRCxnREFrQkM7QUFnQ0QsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUM7QUFFOUMsTUFBYSxjQUFjO0lBUXpCLFlBQVksYUFBdUMsRUFBRSxhQUFxQixFQUFV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QUFLLENBQUMsR0FBRztnQkFDNUIsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDUCxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7Z0JBQzVCLE9BQU8sQ0FBQyxDQUFDOztnQkFFVCxPQUFPLENBQUMsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRyxNQUFNLENBQUMsQ0FBQztLQUNUO0lBQ0QsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtTaW1wbGVMaW5rZWRMaXN0LCBTaW1wbGVMaW5rZWRMaXN0Tm9kZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd3ZmguJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkludGVyZiB7XG4gIHZlcnNpb246IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBkZXZEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBwZWVyRGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgZGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBsaXN0Q29tcERlcGVuZGVuY3koXG4gIHBrSnNvbkZpbGVzOiBzdHJpbmdbXSB8IFBhY2thZ2VKc29uSW50ZXJmW10sXG4gIHdvcmtzcGFjZTogc3RyaW5nLFxuICB3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sXG4gIGV4Y2x1ZGVEZXA6IE1hcDxzdHJpbmcsIGFueT4gfCBTZXQ8c3RyaW5nPlxuKSB7XG4gIC8vIGxvZy5pbmZvKCdzY2FuIGNvbXBvbmVudHMgZnJvbTpcXG4nLCBwa0pzb25GaWxlcy5qb2luKCdcXG4nKSk7XG4gIGNvbnN0IGluc3RhbGxlciA9IG5ldyBJbnN0YWxsTWFuYWdlcih3b3Jrc3BhY2VEZXBzLCB3b3Jrc3BhY2UsIGV4Y2x1ZGVEZXApO1xuICBpZiAodHlwZW9mIHBrSnNvbkZpbGVzWzBdID09PSAnc3RyaW5nJylcbiAgICBpbnN0YWxsZXIuc2NhblNyY0RlcHMocGtKc29uRmlsZXMgYXMgc3RyaW5nW10pO1xuICBlbHNlXG4gICAgaW5zdGFsbGVyLnNjYW5Gb3IocGtKc29uRmlsZXMgYXMgUGFja2FnZUpzb25JbnRlcmZbXSk7XG4gIC8vIGluc3RhbGxlci5zY2FuSW5zdGFsbGVkUGVlckRlcHMoKTtcbiAgY29uc3QgW0hvaXN0ZWREZXBJbmZvLCBIb2lzdGVkUGVlckRlcEluZm9dID0gaW5zdGFsbGVyLmhvaXN0RGVwcygpO1xuICByZXR1cm4ge1xuICAgIGhvaXN0ZWQ6IEhvaXN0ZWREZXBJbmZvLFxuICAgIGhvaXN0ZWRQZWVyczogSG9pc3RlZFBlZXJEZXBJbmZvXG4gIH07XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW50SW5mbyB7XG4gIC8qKiBJcyBhbGwgZGVwZW5kZW50cyBvbiBzYW1lIHZlcnNpb24gKi9cbiAgc2FtZVZlcjogYm9vbGVhbjtcbiAgLyoqIElzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygc3BhY2UgcGFja2FnZS5qc29uICovXG4gIGRpcmVjdDogYm9vbGVhbjtcbiAgLyoqIEluIGNhc2UgYSB0cmFuc2l0aXZlIHBlZXIgZGVwZW5kZW5jeSwgaXQgc2hvdWxkIG5vdFxuICAgKiBiZSBpbnN0YWxsZWQgYXV0b21hdGljYWxseSwgdW5sZXNzIGl0IGlzIGFsc28gYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiBjdXJyZW50IHNwYWNlIFxuICAgKi9cbiAgbWlzc2luZzogYm9vbGVhbjtcbiAgLyoqIFNhbWUgdHJhc2l0aXZlIGRlcGVuZGVuY3kgaW4gYm90aCBub3JtYWwgYW5kIHBlZXIgZGVwZW5kZW5jaWVzIGxpc3RcbiAgICogYWN0dWFsIHZlcnNpb24gc2hvdWxkIGJlIHRoZSBvbmUgc2VsZWN0ZWQgZnJvbSBub3JtYWwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5XG4gICAqL1xuICBkdXBsaWNhdGVQZWVyOiBib29sZWFuO1xuICBieTogQXJyYXk8e1xuICAgIC8qKiBkZXBlbmRlbmN5IHZlcnNpb24gKG5vdCBkZXBlbmRlbnQncykgKi9cbiAgICB2ZXI6IHN0cmluZztcbiAgICAvKiogZGVwZW5kZW50IG5hbWUgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG4gIH0+O1xufVxuXG5cblxuY29uc3QgdmVyc2lvblJlZyA9IC9eKFxcRCopKFxcZC4qPykoPzpcXC50Z3opPyQvO1xuXG5leHBvcnQgY2xhc3MgSW5zdGFsbE1hbmFnZXIge1xuICB2ZXJib3NNZXNzYWdlOiBzdHJpbmc7XG4gIC8qKiBrZXkgaXMgZGVwZW5kZW5jeSBtb2R1bGUgbmFtZSAqL1xuICBwcml2YXRlIGRpcmVjdERlcHM6IE1hcDxzdHJpbmcsIFNpbXBsZUxpbmtlZExpc3ROb2RlPFtzdHJpbmcsIERlcEluZm9dPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgc3JjRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBwZWVyRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBkaXJlY3REZXBzTGlzdDogU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4gPSBuZXcgU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4oKTtcblxuICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sIHdvcmtzcGFjZU5hbWU6IHN0cmluZywgcHJpdmF0ZSBleGNsdWRlRGVwczogTWFwPHN0cmluZywgYW55PiB8IFNldDxzdHJpbmc+KSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMod29ya3NwYWNlRGVwcykpIHtcbiAgICAgIGlmICh0aGlzLmV4Y2x1ZGVEZXBzLmhhcyhuYW1lKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgICAgY29uc3QgY3Vyck5vZGUgPSB0aGlzLmRpcmVjdERlcHNMaXN0LnB1c2goW25hbWUsIHtcbiAgICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgICAgYnk6IGAoJHt3b3Jrc3BhY2VOYW1lfSlgXG4gICAgICB9XSk7XG4gICAgICB0aGlzLmRpcmVjdERlcHMuc2V0KG5hbWUsIGN1cnJOb2RlKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IFBhY2thZ2VKc29uSW50ZXJmW10pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICBjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuICAgICAgICAgIHNlbGYuX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgbG9nLndhcm4oYCR7anNvbi5uYW1lfSBjb250YWlucyBcImRldkRlcGVuZW5kaWVzXCIsIGlmIHRoZXkgYXJlIG5lY2Vzc2FyeSBmb3IgY29tcGlsaW5nIHRoaXMgY29tcG9uZW50IGAgK1xuICAgICAgICAgICd5b3Ugc2hvdWxkIG1vdmUgdGhlbSB0byBcImRlcGVuZGVuY2llc1wiIG9yIFwicGVlckRlcGVuZGVuY2llc1wiJyk7XG4gICAgICAgIC8vIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLmRldkRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgLy8gICBjb25zdCB2ZXJzaW9uID0ganNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgIC8vICAgc2VsZi5fdHJhY2tTcmNEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24ucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgc2VsZi5fdHJhY2tQZWVyRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2NhblNyY0RlcHMoanNvbkZpbGVzOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiB0aGlzLnNjYW5Gb3IoanNvbkZpbGVzLm1hcChwYWNrYWdlSnNvbiA9PiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwgJ3V0ZjgnKSkpKTtcbiAgfVxuXG4gIGhvaXN0RGVwcygpIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPiA9IHRoaXMuY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMuc3JjRGVwcyk7XG4gICAgY29uc3QgcGVlckRlcGVuZGVudEluZm8gPSB0aGlzLmNvbGxlY3REZXBlbmRlbmN5SW5mbyh0aGlzLnBlZXJEZXBzLCBmYWxzZSk7XG4gICAgLy8gbWVyZ2UgcGVlciBkZXBlbmRlbnQgaW5mbyBsaXN0IGludG8gcmVndWxhciBkZXBlbmRlbnQgaW5mbyBsaXN0XG4gICAgZm9yIChjb25zdCBbcGVlckRlcCwgcGVlckluZm9dIG9mIHBlZXJEZXBlbmRlbnRJbmZvLmVudHJpZXMoKSkge1xuICAgICAgaWYgKCFwZWVySW5mby5taXNzaW5nKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgY29uc3Qgbm9ybUluZm8gPSBkZXBlbmRlbnRJbmZvLmdldChwZWVyRGVwKTtcbiAgICAgIGlmIChub3JtSW5mbykge1xuICAgICAgICBwZWVySW5mby5kdXBsaWNhdGVQZWVyID0gdHJ1ZTtcbiAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICBwZWVySW5mby5ieS51bnNoaWZ0KG5vcm1JbmZvLmJ5WzBdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCBpdGVtXSBvZiB0aGlzLmRpcmVjdERlcHNMaXN0LnRyYXZlcnNlKCkpIHtcbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6IHRydWUsXG4gICAgICAgIGRpcmVjdDogdHJ1ZSxcbiAgICAgICAgbWlzc2luZzogZmFsc2UsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogW3t2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fV1cbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2RlcGVuZGVudEluZm8sIHBlZXJEZXBlbmRlbnRJbmZvXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb2xsZWN0RGVwZW5kZW5jeUluZm8odHJhY2tlZFJhdzogTWFwPHN0cmluZywgRGVwSW5mb1tdPiwgbm90UGVlckRlcHMgPSB0cnVlKSB7XG4gICAgY29uc3QgZGVwZW5kZW50SW5mb3M6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+ID0gbmV3IE1hcCgpO1xuXG4gICAgZm9yIChjb25zdCBbZGVwTmFtZSwgdmVyc2lvbkxpc3RdIG9mIHRyYWNrZWRSYXcuZW50cmllcygpKSB7XG4gICAgICBjb25zdCBkaXJlY3RWZXIgPSB0aGlzLmRpcmVjdERlcHMuZ2V0KGRlcE5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbnMgPSBzb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBkZXBOYW1lKTtcbiAgICAgIGlmIChkaXJlY3RWZXIpIHtcbiAgICAgICAgdmVyc2lvbnMudW5zaGlmdChkaXJlY3RWZXIudmFsdWVbMV0pO1xuICAgICAgICBpZiAobm90UGVlckRlcHMpIHtcbiAgICAgICAgICB0aGlzLmRpcmVjdERlcHNMaXN0LnJlbW92ZU5vZGUoZGlyZWN0VmVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgaGFzRGlmZlZlcnNpb24gPSBfY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG5cbiAgICAgIGNvbnN0IGRpcmVjdCA9IHRoaXMuZGlyZWN0RGVwcy5oYXMoZGVwTmFtZSk7XG4gICAgICBjb25zdCBpbmZvOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiAhaGFzRGlmZlZlcnNpb24sXG4gICAgICAgIGRpcmVjdCxcbiAgICAgICAgbWlzc2luZzogbm90UGVlckRlcHMgPyBmYWxzZSA6ICFkaXJlY3QsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogdmVyc2lvbnMubWFwKGl0ZW0gPT4gKHt2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fSkpXG4gICAgICB9O1xuICAgICAgZGVwZW5kZW50SW5mb3Muc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkZXBlbmRlbnRJbmZvcztcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVEZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMuc3JjRGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMuc3JjRGVwcy5zZXQobmFtZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRoaXMuc3JjRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVEZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMucGVlckRlcHMuaGFzKG5hbWUpKSB7XG4gICAgICB0aGlzLnBlZXJEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5wZWVyRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcbiAgaWYgKHNvcnRlZFZlcnNpb25zLmxlbmd0aCA8PSAxKVxuICAgIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgYSA9IHNvcnRlZFZlcnNpb25zW2ldLnZlcjtcbiAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgIGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAoYSAhPT0gYilcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbi8qKlxuICogU29ydCBieSBkZXNjZW5kaW5nXG4gKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHNvcnRCeVZlcnNpb24odmVySW5mb0xpc3Q6IERlcEluZm9bXSwgbmFtZTogc3RyaW5nKSB7XG4gIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICByZXR1cm4gdmVySW5mb0xpc3Q7XG4gIHRyeSB7XG4gICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtICE9IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgIGlmIChyZXMgPT09IDApXG4gICAgICAgICAgICByZXR1cm4gaW5mbzEucHJlID09PSAnJyAmJiBpbmZvMi5wcmUgIT09ICcnID8gLTEgOlxuICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cud2FybihpbmZvMSwgaW5mbzIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMi52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMS52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgIHRocm93IGU7XG4gIH1cbiAgcmV0dXJuIHZlckluZm9MaXN0O1xufVxuXG5cbiJdfQ==