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
const misc_1 = require("./utils/misc");
const semver = require('semver');
const log = require('log4js').getLogger('plink.transitive-dep-hoister');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyx1Q0FBeUI7QUFHekIsdUNBQW9FO0FBQ3BFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFTeEUsU0FBZ0Isa0JBQWtCLENBQ2hDLFdBQTJDLEVBQzNDLFNBQWlCLEVBQ2pCLGFBQXVDLEVBQ3ZDLFVBQTBDO0lBRTFDLCtEQUErRDtJQUMvRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzNFLElBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtRQUNwQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQXVCLENBQUMsQ0FBQzs7UUFFL0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFrQyxDQUFDLENBQUM7SUFDeEQscUNBQXFDO0lBQ3JDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkUsT0FBTztRQUNMLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFlBQVksRUFBRSxrQkFBa0I7S0FDakMsQ0FBQztBQUNKLENBQUM7QUFsQkQsZ0RBa0JDO0FBZ0NELE1BQU0sVUFBVSxHQUFHLDBCQUEwQixDQUFDO0FBRTlDLE1BQWEsY0FBYztJQVF6QixZQUFZLGFBQXVDLEVBQUUsYUFBcUIsRUFBVSxXQUEyQztRQUEzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0M7UUFOL0gsb0NBQW9DO1FBQzVCLGVB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LENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHO2dCQUM1QixPQUFPLENBQUMsQ0FBQzs7Z0JBRVQsT0FBTyxDQUFDLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztLQUNKO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixJQUFJLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLENBQUM7S0FDVDtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtTaW1wbGVMaW5rZWRMaXN0LCBTaW1wbGVMaW5rZWRMaXN0Tm9kZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwbGluay50cmFuc2l0aXZlLWRlcC1ob2lzdGVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogc3RyaW5nW10gfCBQYWNrYWdlSnNvbkludGVyZltdLFxuICB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgd29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LFxuICBleGNsdWRlRGVwOiBNYXA8c3RyaW5nLCBhbnk+IHwgU2V0PHN0cmluZz5cbikge1xuICAvLyBsb2cuaW5mbygnc2NhbiBjb21wb25lbnRzIGZyb206XFxuJywgcGtKc29uRmlsZXMuam9pbignXFxuJykpO1xuICBjb25zdCBpbnN0YWxsZXIgPSBuZXcgSW5zdGFsbE1hbmFnZXIod29ya3NwYWNlRGVwcywgd29ya3NwYWNlLCBleGNsdWRlRGVwKTtcbiAgaWYgKHR5cGVvZiBwa0pzb25GaWxlc1swXSA9PT0gJ3N0cmluZycpXG4gICAgaW5zdGFsbGVyLnNjYW5TcmNEZXBzKHBrSnNvbkZpbGVzIGFzIHN0cmluZ1tdKTtcbiAgZWxzZVxuICAgIGluc3RhbGxlci5zY2FuRm9yKHBrSnNvbkZpbGVzIGFzIFBhY2thZ2VKc29uSW50ZXJmW10pO1xuICAvLyBpbnN0YWxsZXIuc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCk7XG4gIGNvbnN0IFtIb2lzdGVkRGVwSW5mbywgSG9pc3RlZFBlZXJEZXBJbmZvXSA9IGluc3RhbGxlci5ob2lzdERlcHMoKTtcbiAgcmV0dXJuIHtcbiAgICBob2lzdGVkOiBIb2lzdGVkRGVwSW5mbyxcbiAgICBob2lzdGVkUGVlcnM6IEhvaXN0ZWRQZWVyRGVwSW5mb1xuICB9O1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVudEluZm8ge1xuICAvKiogSXMgYWxsIGRlcGVuZGVudHMgb24gc2FtZSB2ZXJzaW9uICovXG4gIHNhbWVWZXI6IGJvb2xlYW47XG4gIC8qKiBJcyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHNwYWNlIHBhY2thZ2UuanNvbiAqL1xuICBkaXJlY3Q6IGJvb2xlYW47XG4gIC8qKiBJbiBjYXNlIGEgdHJhbnNpdGl2ZSBwZWVyIGRlcGVuZGVuY3ksIGl0IHNob3VsZCBub3RcbiAgICogYmUgaW5zdGFsbGVkIGF1dG9tYXRpY2FsbHksIHVubGVzcyBpdCBpcyBhbHNvIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2YgY3VycmVudCBzcGFjZSBcbiAgICovXG4gIG1pc3Npbmc6IGJvb2xlYW47XG4gIC8qKiBTYW1lIHRyYXNpdGl2ZSBkZXBlbmRlbmN5IGluIGJvdGggbm9ybWFsIGFuZCBwZWVyIGRlcGVuZGVuY2llcyBsaXN0XG4gICAqIGFjdHVhbCB2ZXJzaW9uIHNob3VsZCBiZSB0aGUgb25lIHNlbGVjdGVkIGZyb20gbm9ybWFsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgKi9cbiAgZHVwbGljYXRlUGVlcjogYm9vbGVhbjtcbiAgYnk6IEFycmF5PHtcbiAgICAvKiogZGVwZW5kZW5jeSB2ZXJzaW9uIChub3QgZGVwZW5kZW50J3MpICovXG4gICAgdmVyOiBzdHJpbmc7XG4gICAgLyoqIGRlcGVuZGVudCBuYW1lICovXG4gICAgbmFtZTogc3RyaW5nO1xuICB9Pjtcbn1cblxuXG5cbmNvbnN0IHZlcnNpb25SZWcgPSAvXihcXEQqKShcXGQuKj8pKD86XFwudGd6KT8kLztcblxuZXhwb3J0IGNsYXNzIEluc3RhbGxNYW5hZ2VyIHtcbiAgdmVyYm9zTWVzc2FnZTogc3RyaW5nO1xuICAvKioga2V5IGlzIGRlcGVuZGVuY3kgbW9kdWxlIG5hbWUgKi9cbiAgcHJpdmF0ZSBkaXJlY3REZXBzOiBNYXA8c3RyaW5nLCBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxbc3RyaW5nLCBEZXBJbmZvXT4+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHNyY0RlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgcGVlckRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZGlyZWN0RGVwc0xpc3Q6IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+ID0gbmV3IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+KCk7XG5cbiAgY29uc3RydWN0b3Iod29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LCB3b3Jrc3BhY2VOYW1lOiBzdHJpbmcsIHByaXZhdGUgZXhjbHVkZURlcHM6IE1hcDxzdHJpbmcsIGFueT4gfCBTZXQ8c3RyaW5nPikge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHdvcmtzcGFjZURlcHMpKSB7XG4gICAgICBpZiAodGhpcy5leGNsdWRlRGVwcy5oYXMobmFtZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICAgIGNvbnN0IGN1cnJOb2RlID0gdGhpcy5kaXJlY3REZXBzTGlzdC5wdXNoKFtuYW1lLCB7XG4gICAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICAgIGJ5OiBgKCR7d29ya3NwYWNlTmFtZX0pYFxuICAgICAgfV0pO1xuICAgICAgdGhpcy5kaXJlY3REZXBzLnNldChuYW1lLCBjdXJyTm9kZSk7XG4gICAgfVxuICB9XG5cbiAgc2NhbkZvcihwa0pzb25zOiBQYWNrYWdlSnNvbkludGVyZltdKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBmb3IgKGNvbnN0IGpzb24gb2YgcGtKc29ucykge1xuICAgICAgY29uc3QgZGVwcyA9IGpzb24uZGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKGRlcHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdzY2FuU3JjRGVwc0FzeW5jKCkgZGVwICcgKyBuYW1lKTtcbiAgICAgICAgICBzZWxmLl90cmFja1NyY0RlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24uZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGxvZy53YXJuKGAke2pzb24ubmFtZX0gY29udGFpbnMgXCJkZXZEZXBlbmVuZGllc1wiLCBpZiB0aGV5IGFyZSBuZWNlc3NhcnkgZm9yIGNvbXBpbGluZyB0aGlzIGNvbXBvbmVudCBgICtcbiAgICAgICAgICAneW91IHNob3VsZCBtb3ZlIHRoZW0gdG8gXCJkZXBlbmRlbmNpZXNcIiBvciBcInBlZXJEZXBlbmRlbmNpZXNcIicpO1xuICAgICAgICAvLyBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5kZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgIC8vICAgY29uc3QgdmVyc2lvbiA9IGpzb24uZGV2RGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAvLyAgIHNlbGYuX3RyYWNrU3JjRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLnBlZXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24ucGVlckRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0ganNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAgIHNlbGYuX3RyYWNrUGVlckRlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNjYW5TcmNEZXBzKGpzb25GaWxlczogc3RyaW5nW10pIHtcbiAgICByZXR1cm4gdGhpcy5zY2FuRm9yKGpzb25GaWxlcy5tYXAocGFja2FnZUpzb24gPT4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGFja2FnZUpzb24sICd1dGY4JykpKSk7XG4gIH1cblxuICBob2lzdERlcHMoKSB7XG4gICAgY29uc3QgZGVwZW5kZW50SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4gPSB0aGlzLmNvbGxlY3REZXBlbmRlbmN5SW5mbyh0aGlzLnNyY0RlcHMpO1xuICAgIGNvbnN0IHBlZXJEZXBlbmRlbnRJbmZvID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5wZWVyRGVwcywgZmFsc2UpO1xuICAgIC8vIG1lcmdlIHBlZXIgZGVwZW5kZW50IGluZm8gbGlzdCBpbnRvIHJlZ3VsYXIgZGVwZW5kZW50IGluZm8gbGlzdFxuICAgIGZvciAoY29uc3QgW3BlZXJEZXAsIHBlZXJJbmZvXSBvZiBwZWVyRGVwZW5kZW50SW5mby5lbnRyaWVzKCkpIHtcbiAgICAgIGlmICghcGVlckluZm8ubWlzc2luZylcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIGNvbnN0IG5vcm1JbmZvID0gZGVwZW5kZW50SW5mby5nZXQocGVlckRlcCk7XG4gICAgICBpZiAobm9ybUluZm8pIHtcbiAgICAgICAgcGVlckluZm8uZHVwbGljYXRlUGVlciA9IHRydWU7XG4gICAgICAgIHBlZXJJbmZvLm1pc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgcGVlckluZm8uYnkudW5zaGlmdChub3JtSW5mby5ieVswXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbZGVwTmFtZSwgaXRlbV0gb2YgdGhpcy5kaXJlY3REZXBzTGlzdC50cmF2ZXJzZSgpKSB7XG4gICAgICBjb25zdCBpbmZvOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiB0cnVlLFxuICAgICAgICBkaXJlY3Q6IHRydWUsXG4gICAgICAgIG1pc3Npbmc6IGZhbHNlLFxuICAgICAgICBkdXBsaWNhdGVQZWVyOiBmYWxzZSxcbiAgICAgICAgYnk6IFt7dmVyOiBpdGVtLnZlciwgbmFtZTogaXRlbS5ieX1dXG4gICAgICB9O1xuICAgICAgZGVwZW5kZW50SW5mby5zZXQoZGVwTmFtZSwgaW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFtkZXBlbmRlbnRJbmZvLCBwZWVyRGVwZW5kZW50SW5mb107XG4gIH1cblxuICBwcm90ZWN0ZWQgY29sbGVjdERlcGVuZGVuY3lJbmZvKHRyYWNrZWRSYXc6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4sIG5vdFBlZXJEZXBzID0gdHJ1ZSkge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm9zOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPiA9IG5ldyBNYXAoKTtcblxuICAgIGZvciAoY29uc3QgW2RlcE5hbWUsIHZlcnNpb25MaXN0XSBvZiB0cmFja2VkUmF3LmVudHJpZXMoKSkge1xuICAgICAgY29uc3QgZGlyZWN0VmVyID0gdGhpcy5kaXJlY3REZXBzLmdldChkZXBOYW1lKTtcbiAgICAgIGNvbnN0IHZlcnNpb25zID0gc29ydEJ5VmVyc2lvbih2ZXJzaW9uTGlzdCwgZGVwTmFtZSk7XG4gICAgICBpZiAoZGlyZWN0VmVyKSB7XG4gICAgICAgIHZlcnNpb25zLnVuc2hpZnQoZGlyZWN0VmVyLnZhbHVlWzFdKTtcbiAgICAgICAgaWYgKG5vdFBlZXJEZXBzKSB7XG4gICAgICAgICAgdGhpcy5kaXJlY3REZXBzTGlzdC5yZW1vdmVOb2RlKGRpcmVjdFZlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuXG4gICAgICBjb25zdCBkaXJlY3QgPSB0aGlzLmRpcmVjdERlcHMuaGFzKGRlcE5hbWUpO1xuICAgICAgY29uc3QgaW5mbzogRGVwZW5kZW50SW5mbyA9IHtcbiAgICAgICAgc2FtZVZlcjogIWhhc0RpZmZWZXJzaW9uLFxuICAgICAgICBkaXJlY3QsXG4gICAgICAgIG1pc3Npbmc6IG5vdFBlZXJEZXBzID8gZmFsc2UgOiAhZGlyZWN0LFxuICAgICAgICBkdXBsaWNhdGVQZWVyOiBmYWxzZSxcbiAgICAgICAgYnk6IHZlcnNpb25zLm1hcChpdGVtID0+ICh7dmVyOiBpdGVtLnZlciwgbmFtZTogaXRlbS5ieX0pKVxuICAgICAgfTtcbiAgICAgIGRlcGVuZGVudEluZm9zLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVwZW5kZW50SW5mb3M7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5leGNsdWRlRGVwcy5oYXMobmFtZSkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCF0aGlzLnNyY0RlcHMuaGFzKG5hbWUpKSB7XG4gICAgICB0aGlzLnNyY0RlcHMuc2V0KG5hbWUsIFtdKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICB0aGlzLnNyY0RlcHMuZ2V0KG5hbWUpIS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tQZWVyRGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5leGNsdWRlRGVwcy5oYXMobmFtZSkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCF0aGlzLnBlZXJEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5wZWVyRGVwcy5zZXQobmFtZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRoaXMucGVlckRlcHMuZ2V0KG5hbWUpIS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY29udGFpbnNEaWZmVmVyc2lvbihzb3J0ZWRWZXJzaW9uczogRGVwSW5mb1tdKSB7XG4gIGlmIChzb3J0ZWRWZXJzaW9ucy5sZW5ndGggPD0gMSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gc29ydGVkVmVyc2lvbnMubGVuZ3RoIC0gMTsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGEgPSBzb3J0ZWRWZXJzaW9uc1tpXS52ZXI7XG4gICAgY29uc3QgYiA9IHNvcnRlZFZlcnNpb25zW2kgKyAxXS52ZXI7XG5cbiAgICBpZiAoYiA9PT0gJyonIHx8IGIgPT09ICcnKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGEgIT09IGIpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4vKipcbiAqIFNvcnQgYnkgZGVzY2VuZGluZ1xuICogQHBhcmFtIHZlckluZm9MaXN0IHt2ZXI6IHN0cmluZywgYnk6IHN0cmluZywgbmFtZTogc3RyaW5nfVxuICovXG5mdW5jdGlvbiBzb3J0QnlWZXJzaW9uKHZlckluZm9MaXN0OiBEZXBJbmZvW10sIG5hbWU6IHN0cmluZykge1xuICBpZiAodmVySW5mb0xpc3QgPT0gbnVsbCB8fCB2ZXJJbmZvTGlzdC5sZW5ndGggPT09IDEpXG4gICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICB0cnkge1xuICAgIHZlckluZm9MaXN0LnNvcnQoKGluZm8xLCBpbmZvMikgPT4ge1xuICAgICAgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSAhPSBudWxsKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gc2VtdmVyLnJjb21wYXJlKGluZm8xLnZlck51bSwgaW5mbzIudmVyTnVtKTtcbiAgICAgICAgICBpZiAocmVzID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGluZm8xLnByZSA9PT0gJycgJiYgaW5mbzIucHJlICE9PSAnJyA/IC0xIDpcbiAgICAgICAgICAgICAgKGluZm8xLnByZSAhPT0gJycgJiYgaW5mbzIucHJlID09PSAnJyA/IDEgOiAwKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLndhcm4oaW5mbzEsIGluZm8yKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgZWxzZSBpZiAoaW5mbzIudmVyTnVtICE9IG51bGwgJiYgaW5mbzEudmVyTnVtID09IG51bGwpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgZWxzZSBpZiAoaW5mbzEudmVyID4gaW5mbzIudmVyKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPCBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcihgSW52YWxpZCBzZW12ZXIgZm9ybWF0IGZvciAke25hbWUgfHwgJyd9OiBgICsgSlNPTi5zdHJpbmdpZnkodmVySW5mb0xpc3QsIG51bGwsICcgICcpKTtcbiAgICB0aHJvdyBlO1xuICB9XG4gIHJldHVybiB2ZXJJbmZvTGlzdDtcbn1cblxuXG4iXX0=