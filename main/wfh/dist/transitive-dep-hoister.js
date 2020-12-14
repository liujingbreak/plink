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
                log.warn(`${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyx1Q0FBeUI7QUFHekIsMkNBQTZCO0FBQzdCLHVDQUFvRTtBQUNwRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQVNuRixTQUFnQixrQkFBa0IsQ0FDaEMsV0FBMkMsRUFDM0MsU0FBaUIsRUFDakIsYUFBdUMsRUFDdkMsVUFBMEM7SUFFMUMsK0RBQStEO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDM0UsSUFBSSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO1FBQ3BDLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBdUIsQ0FBQyxDQUFDOztRQUUvQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQWtDLENBQUMsQ0FBQztJQUN4RCxxQ0FBcUM7SUFDckMsTUFBTSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuRSxPQUFPO1FBQ0wsT0FBTyxFQUFFLGNBQWM7UUFDdkIsWUFBWSxFQUFFLGtCQUFrQjtLQUNqQyxDQUFDO0FBQ0osQ0FBQztBQWxCRCxnREFrQkM7QUFnQ0QsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUM7QUFFOUMsTUFBYSxjQUFjO0lBUXpCLFlBQVksYUFBdUMsRUFBRSxhQUFxQixFQUFV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QUFLLENBQUMsR0FBRztnQkFDNUIsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDUCxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7Z0JBQzVCLE9BQU8sQ0FBQyxDQUFDOztnQkFFVCxPQUFPLENBQUMsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRyxNQUFNLENBQUMsQ0FBQztLQUNUO0lBQ0QsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtTaW1wbGVMaW5rZWRMaXN0LCBTaW1wbGVMaW5rZWRMaXN0Tm9kZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd3ZmguJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkludGVyZiB7XG4gIHZlcnNpb246IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBkZXZEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBwZWVyRGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgZGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBsaXN0Q29tcERlcGVuZGVuY3koXG4gIHBrSnNvbkZpbGVzOiBzdHJpbmdbXSB8IFBhY2thZ2VKc29uSW50ZXJmW10sXG4gIHdvcmtzcGFjZTogc3RyaW5nLFxuICB3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sXG4gIGV4Y2x1ZGVEZXA6IE1hcDxzdHJpbmcsIGFueT4gfCBTZXQ8c3RyaW5nPlxuKSB7XG4gIC8vIGxvZy5pbmZvKCdzY2FuIGNvbXBvbmVudHMgZnJvbTpcXG4nLCBwa0pzb25GaWxlcy5qb2luKCdcXG4nKSk7XG4gIGNvbnN0IGluc3RhbGxlciA9IG5ldyBJbnN0YWxsTWFuYWdlcih3b3Jrc3BhY2VEZXBzLCB3b3Jrc3BhY2UsIGV4Y2x1ZGVEZXApO1xuICBpZiAodHlwZW9mIHBrSnNvbkZpbGVzWzBdID09PSAnc3RyaW5nJylcbiAgICBpbnN0YWxsZXIuc2NhblNyY0RlcHMocGtKc29uRmlsZXMgYXMgc3RyaW5nW10pO1xuICBlbHNlXG4gICAgaW5zdGFsbGVyLnNjYW5Gb3IocGtKc29uRmlsZXMgYXMgUGFja2FnZUpzb25JbnRlcmZbXSk7XG4gIC8vIGluc3RhbGxlci5zY2FuSW5zdGFsbGVkUGVlckRlcHMoKTtcbiAgY29uc3QgW0hvaXN0ZWREZXBJbmZvLCBIb2lzdGVkUGVlckRlcEluZm9dID0gaW5zdGFsbGVyLmhvaXN0RGVwcygpO1xuICByZXR1cm4ge1xuICAgIGhvaXN0ZWQ6IEhvaXN0ZWREZXBJbmZvLFxuICAgIGhvaXN0ZWRQZWVyczogSG9pc3RlZFBlZXJEZXBJbmZvXG4gIH07XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW50SW5mbyB7XG4gIC8qKiBJcyBhbGwgZGVwZW5kZW50cyBvbiBzYW1lIHZlcnNpb24gKi9cbiAgc2FtZVZlcjogYm9vbGVhbjtcbiAgLyoqIElzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygc3BhY2UgcGFja2FnZS5qc29uICovXG4gIGRpcmVjdDogYm9vbGVhbjtcbiAgLyoqIEluIGNhc2UgYSB0cmFuc2l0aXZlIHBlZXIgZGVwZW5kZW5jeSwgaXQgc2hvdWxkIG5vdFxuICAgKiBiZSBpbnN0YWxsZWQgYXV0b21hdGljYWxseSwgdW5sZXNzIGl0IGlzIGFsc28gYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiBjdXJyZW50IHNwYWNlIFxuICAgKi9cbiAgbWlzc2luZzogYm9vbGVhbjtcbiAgLyoqIFNhbWUgdHJhc2l0aXZlIGRlcGVuZGVuY3kgaW4gYm90aCBub3JtYWwgYW5kIHBlZXIgZGVwZW5kZW5jaWVzIGxpc3RcbiAgICogYWN0dWFsIHZlcnNpb24gc2hvdWxkIGJlIHRoZSBvbmUgc2VsZWN0ZWQgZnJvbSBub3JtYWwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5XG4gICAqL1xuICBkdXBsaWNhdGVQZWVyOiBib29sZWFuO1xuICBieTogQXJyYXk8e1xuICAgIC8qKiBkZXBlbmRlbmN5IHZlcnNpb24gKG5vdCBkZXBlbmRlbnQncykgKi9cbiAgICB2ZXI6IHN0cmluZztcbiAgICAvKiogZGVwZW5kZW50IG5hbWUgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG4gIH0+O1xufVxuXG5cblxuY29uc3QgdmVyc2lvblJlZyA9IC9eKFxcRCopKFxcZC4qPykoPzpcXC50Z3opPyQvO1xuXG5leHBvcnQgY2xhc3MgSW5zdGFsbE1hbmFnZXIge1xuICB2ZXJib3NNZXNzYWdlOiBzdHJpbmc7XG4gIC8qKiBrZXkgaXMgZGVwZW5kZW5jeSBtb2R1bGUgbmFtZSAqL1xuICBwcml2YXRlIGRpcmVjdERlcHM6IE1hcDxzdHJpbmcsIFNpbXBsZUxpbmtlZExpc3ROb2RlPFtzdHJpbmcsIERlcEluZm9dPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgc3JjRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBwZWVyRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBkaXJlY3REZXBzTGlzdDogU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4gPSBuZXcgU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4oKTtcblxuICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sIHdvcmtzcGFjZU5hbWU6IHN0cmluZywgcHJpdmF0ZSBleGNsdWRlRGVwczogTWFwPHN0cmluZywgYW55PiB8IFNldDxzdHJpbmc+KSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMod29ya3NwYWNlRGVwcykpIHtcbiAgICAgIGlmICh0aGlzLmV4Y2x1ZGVEZXBzLmhhcyhuYW1lKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgICAgY29uc3QgY3Vyck5vZGUgPSB0aGlzLmRpcmVjdERlcHNMaXN0LnB1c2goW25hbWUsIHtcbiAgICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgICAgYnk6IGAoJHt3b3Jrc3BhY2VOYW1lfSlgXG4gICAgICB9XSk7XG4gICAgICB0aGlzLmRpcmVjdERlcHMuc2V0KG5hbWUsIGN1cnJOb2RlKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IFBhY2thZ2VKc29uSW50ZXJmW10pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICBjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuICAgICAgICAgIHNlbGYuX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgbG9nLndhcm4oYCR7anNvbi5uYW1lfSBjb250YWlucyBcImRldkRlcGVuZW5kaWVzXCIsIGlmIHRoZXkgYXJlIG5lY2Vzc2FyeSBmb3IgY29tcGlsaW5nIHRoaXMgY29tcG9uZW50YCArXG4gICAgICAgICAgJ3lvdSBzaG91bGQgbW92ZSB0aGVtIHRvIFwiZGVwZW5kZW5jaWVzXCIgb3IgXCJwZWVyRGVwZW5kZW5jaWVzXCInKTtcbiAgICAgICAgLy8gZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24uZGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAvLyAgIGNvbnN0IHZlcnNpb24gPSBqc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgLy8gICBzZWxmLl90cmFja1NyY0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICBzZWxmLl90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzY2FuU3JjRGVwcyhqc29uRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NhbkZvcihqc29uRmlsZXMubWFwKHBhY2thZ2VKc29uID0+IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCAndXRmOCcpKSkpO1xuICB9XG5cbiAgaG9pc3REZXBzKCkge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+ID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5zcmNEZXBzKTtcbiAgICBjb25zdCBwZWVyRGVwZW5kZW50SW5mbyA9IHRoaXMuY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMucGVlckRlcHMsIGZhbHNlKTtcbiAgICAvLyBtZXJnZSBwZWVyIGRlcGVuZGVudCBpbmZvIGxpc3QgaW50byByZWd1bGFyIGRlcGVuZGVudCBpbmZvIGxpc3RcbiAgICBmb3IgKGNvbnN0IFtwZWVyRGVwLCBwZWVySW5mb10gb2YgcGVlckRlcGVuZGVudEluZm8uZW50cmllcygpKSB7XG4gICAgICBpZiAoIXBlZXJJbmZvLm1pc3NpbmcpXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBub3JtSW5mbyA9IGRlcGVuZGVudEluZm8uZ2V0KHBlZXJEZXApO1xuICAgICAgaWYgKG5vcm1JbmZvKSB7XG4gICAgICAgIHBlZXJJbmZvLmR1cGxpY2F0ZVBlZXIgPSB0cnVlO1xuICAgICAgICBwZWVySW5mby5taXNzaW5nID0gZmFsc2U7XG4gICAgICAgIHBlZXJJbmZvLmJ5LnVuc2hpZnQobm9ybUluZm8uYnlbMF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2RlcE5hbWUsIGl0ZW1dIG9mIHRoaXMuZGlyZWN0RGVwc0xpc3QudHJhdmVyc2UoKSkge1xuICAgICAgY29uc3QgaW5mbzogRGVwZW5kZW50SW5mbyA9IHtcbiAgICAgICAgc2FtZVZlcjogdHJ1ZSxcbiAgICAgICAgZGlyZWN0OiB0cnVlLFxuICAgICAgICBtaXNzaW5nOiBmYWxzZSxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiBbe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9XVxuICAgICAgfTtcbiAgICAgIGRlcGVuZGVudEluZm8uc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBbZGVwZW5kZW50SW5mbywgcGVlckRlcGVuZGVudEluZm9dO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbGxlY3REZXBlbmRlbmN5SW5mbyh0cmFja2VkUmF3OiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+LCBub3RQZWVyRGVwcyA9IHRydWUpIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvczogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4gPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCB2ZXJzaW9uTGlzdF0gb2YgdHJhY2tlZFJhdy5lbnRyaWVzKCkpIHtcbiAgICAgIGNvbnN0IGRpcmVjdFZlciA9IHRoaXMuZGlyZWN0RGVwcy5nZXQoZGVwTmFtZSk7XG4gICAgICBjb25zdCB2ZXJzaW9ucyA9IHNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIGRlcE5hbWUpO1xuICAgICAgaWYgKGRpcmVjdFZlcikge1xuICAgICAgICB2ZXJzaW9ucy51bnNoaWZ0KGRpcmVjdFZlci52YWx1ZVsxXSk7XG4gICAgICAgIGlmIChub3RQZWVyRGVwcykge1xuICAgICAgICAgIHRoaXMuZGlyZWN0RGVwc0xpc3QucmVtb3ZlTm9kZShkaXJlY3RWZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IF9jb250YWluc0RpZmZWZXJzaW9uKHZlcnNpb25MaXN0KTtcblxuICAgICAgY29uc3QgZGlyZWN0ID0gdGhpcy5kaXJlY3REZXBzLmhhcyhkZXBOYW1lKTtcbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6ICFoYXNEaWZmVmVyc2lvbixcbiAgICAgICAgZGlyZWN0LFxuICAgICAgICBtaXNzaW5nOiBub3RQZWVyRGVwcyA/IGZhbHNlIDogIWRpcmVjdCxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiB2ZXJzaW9ucy5tYXAoaXRlbSA9PiAoe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9KSlcbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvcy5zZXQoZGVwTmFtZSwgaW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlcGVuZGVudEluZm9zO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1NyY0RlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZURlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghdGhpcy5zcmNEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5zcmNEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5zcmNEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrUGVlckRlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZURlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghdGhpcy5wZWVyRGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMucGVlckRlcHMuc2V0KG5hbWUsIFtdKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICB0aGlzLnBlZXJEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICBpZiAoc29ydGVkVmVyc2lvbnMubGVuZ3RoIDw9IDEpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBhID0gc29ydGVkVmVyc2lvbnNbaV0udmVyO1xuICAgIGNvbnN0IGIgPSBzb3J0ZWRWZXJzaW9uc1tpICsgMV0udmVyO1xuXG4gICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgIGNvbnRpbnVlO1xuICAgIGlmIChhICE9PSBiKVxuICAgICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuLyoqXG4gKiBTb3J0IGJ5IGRlc2NlbmRpbmdcbiAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cbiAqL1xuZnVuY3Rpb24gc29ydEJ5VmVyc2lvbih2ZXJJbmZvTGlzdDogRGVwSW5mb1tdLCBuYW1lOiBzdHJpbmcpIHtcbiAgaWYgKHZlckluZm9MaXN0ID09IG51bGwgfHwgdmVySW5mb0xpc3QubGVuZ3RoID09PSAxKVxuICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgdHJ5IHtcbiAgICB2ZXJJbmZvTGlzdC5zb3J0KChpbmZvMSwgaW5mbzIpID0+IHtcbiAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBpbmZvMS5wcmUgPT09ICcnICYmIGluZm8yLnByZSAhPT0gJycgPyAtMSA6XG4gICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy53YXJuKGluZm8xLCBpbmZvMik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtID09IG51bGwpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8yLnZlck51bSAhPSBudWxsICYmIGluZm8xLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgZWxzZSBpZiAoaW5mbzEudmVyIDwgaW5mbzIudmVyKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoYEludmFsaWQgc2VtdmVyIGZvcm1hdCBmb3IgJHtuYW1lIHx8ICcnfTogYCArIEpTT04uc3RyaW5naWZ5KHZlckluZm9MaXN0LCBudWxsLCAnICAnKSk7XG4gICAgdGhyb3cgZTtcbiAgfVxuICByZXR1cm4gdmVySW5mb0xpc3Q7XG59XG5cblxuIl19