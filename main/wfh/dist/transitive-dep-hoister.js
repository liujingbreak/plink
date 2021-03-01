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
                    by: `(${workspaceName || '<root directory>'})`
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyx1Q0FBeUI7QUFHekIsdUNBQW9FO0FBQ3BFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFTeEUsU0FBZ0Isa0JBQWtCLENBQ2hDLFdBQTJDLEVBQzNDLFNBQWlCLEVBQ2pCLGFBQXVDLEVBQ3ZDLFVBQTBDO0lBRTFDLCtEQUErRDtJQUMvRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzNFLElBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtRQUNwQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQXVCLENBQUMsQ0FBQzs7UUFFL0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFrQyxDQUFDLENBQUM7SUFDeEQscUNBQXFDO0lBQ3JDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkUsT0FBTztRQUNMLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFlBQVksRUFBRSxrQkFBa0I7S0FDakMsQ0FBQztBQUNKLENBQUM7QUFsQkQsZ0RBa0JDO0FBZ0NELE1BQU0sVUFBVSxHQUFHLDBCQUEwQixDQUFDO0FBRTlDLE1BQWEsY0FBYztJQVF6QixZQUFZLGFBQXVDLEVBQUUsYUFBcUIsRUFBVSxXQUEyQztRQUEzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0M7UUFOL0gsb0NBQW9DO1FBQzVCLGVB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Q1AsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHO2dCQUM1QixPQUFPLENBQUMsQ0FBQzs7Z0JBRVQsT0FBTyxDQUFDLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztLQUNKO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixJQUFJLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLENBQUM7S0FDVDtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtTaW1wbGVMaW5rZWRMaXN0LCBTaW1wbGVMaW5rZWRMaXN0Tm9kZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwbGluay50cmFuc2l0aXZlLWRlcC1ob2lzdGVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogc3RyaW5nW10gfCBQYWNrYWdlSnNvbkludGVyZltdLFxuICB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgd29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LFxuICBleGNsdWRlRGVwOiBNYXA8c3RyaW5nLCBhbnk+IHwgU2V0PHN0cmluZz5cbikge1xuICAvLyBsb2cuaW5mbygnc2NhbiBjb21wb25lbnRzIGZyb206XFxuJywgcGtKc29uRmlsZXMuam9pbignXFxuJykpO1xuICBjb25zdCBpbnN0YWxsZXIgPSBuZXcgSW5zdGFsbE1hbmFnZXIod29ya3NwYWNlRGVwcywgd29ya3NwYWNlLCBleGNsdWRlRGVwKTtcbiAgaWYgKHR5cGVvZiBwa0pzb25GaWxlc1swXSA9PT0gJ3N0cmluZycpXG4gICAgaW5zdGFsbGVyLnNjYW5TcmNEZXBzKHBrSnNvbkZpbGVzIGFzIHN0cmluZ1tdKTtcbiAgZWxzZVxuICAgIGluc3RhbGxlci5zY2FuRm9yKHBrSnNvbkZpbGVzIGFzIFBhY2thZ2VKc29uSW50ZXJmW10pO1xuICAvLyBpbnN0YWxsZXIuc2Nhbkluc3RhbGxlZFBlZXJEZXBzKCk7XG4gIGNvbnN0IFtIb2lzdGVkRGVwSW5mbywgSG9pc3RlZFBlZXJEZXBJbmZvXSA9IGluc3RhbGxlci5ob2lzdERlcHMoKTtcbiAgcmV0dXJuIHtcbiAgICBob2lzdGVkOiBIb2lzdGVkRGVwSW5mbyxcbiAgICBob2lzdGVkUGVlcnM6IEhvaXN0ZWRQZWVyRGVwSW5mb1xuICB9O1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVudEluZm8ge1xuICAvKiogSXMgYWxsIGRlcGVuZGVudHMgb24gc2FtZSB2ZXJzaW9uICovXG4gIHNhbWVWZXI6IGJvb2xlYW47XG4gIC8qKiBJcyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHNwYWNlIHBhY2thZ2UuanNvbiAqL1xuICBkaXJlY3Q6IGJvb2xlYW47XG4gIC8qKiBJbiBjYXNlIGEgdHJhbnNpdGl2ZSBwZWVyIGRlcGVuZGVuY3ksIGl0IHNob3VsZCBub3RcbiAgICogYmUgaW5zdGFsbGVkIGF1dG9tYXRpY2FsbHksIHVubGVzcyBpdCBpcyBhbHNvIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2YgY3VycmVudCBzcGFjZSBcbiAgICovXG4gIG1pc3Npbmc6IGJvb2xlYW47XG4gIC8qKiBTYW1lIHRyYXNpdGl2ZSBkZXBlbmRlbmN5IGluIGJvdGggbm9ybWFsIGFuZCBwZWVyIGRlcGVuZGVuY2llcyBsaXN0XG4gICAqIGFjdHVhbCB2ZXJzaW9uIHNob3VsZCBiZSB0aGUgb25lIHNlbGVjdGVkIGZyb20gbm9ybWFsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgKi9cbiAgZHVwbGljYXRlUGVlcjogYm9vbGVhbjtcbiAgYnk6IEFycmF5PHtcbiAgICAvKiogZGVwZW5kZW5jeSB2ZXJzaW9uIChub3QgZGVwZW5kZW50J3MpICovXG4gICAgdmVyOiBzdHJpbmc7XG4gICAgLyoqIGRlcGVuZGVudCBuYW1lICovXG4gICAgbmFtZTogc3RyaW5nO1xuICB9Pjtcbn1cblxuXG5cbmNvbnN0IHZlcnNpb25SZWcgPSAvXihcXEQqKShcXGQuKj8pKD86XFwudGd6KT8kLztcblxuZXhwb3J0IGNsYXNzIEluc3RhbGxNYW5hZ2VyIHtcbiAgdmVyYm9zTWVzc2FnZTogc3RyaW5nO1xuICAvKioga2V5IGlzIGRlcGVuZGVuY3kgbW9kdWxlIG5hbWUgKi9cbiAgcHJpdmF0ZSBkaXJlY3REZXBzOiBNYXA8c3RyaW5nLCBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxbc3RyaW5nLCBEZXBJbmZvXT4+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHNyY0RlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgcGVlckRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZGlyZWN0RGVwc0xpc3Q6IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+ID0gbmV3IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+KCk7XG5cbiAgY29uc3RydWN0b3Iod29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LCB3b3Jrc3BhY2VOYW1lOiBzdHJpbmcsIHByaXZhdGUgZXhjbHVkZURlcHM6IE1hcDxzdHJpbmcsIGFueT4gfCBTZXQ8c3RyaW5nPikge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHdvcmtzcGFjZURlcHMpKSB7XG4gICAgICBpZiAodGhpcy5leGNsdWRlRGVwcy5oYXMobmFtZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICAgIGNvbnN0IGN1cnJOb2RlID0gdGhpcy5kaXJlY3REZXBzTGlzdC5wdXNoKFtuYW1lLCB7XG4gICAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICAgIGJ5OiBgKCR7d29ya3NwYWNlTmFtZSB8fCAnPHJvb3QgZGlyZWN0b3J5Pid9KWBcbiAgICAgIH1dKTtcbiAgICAgIHRoaXMuZGlyZWN0RGVwcy5zZXQobmFtZSwgY3Vyck5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHNjYW5Gb3IocGtKc29uczogUGFja2FnZUpzb25JbnRlcmZbXSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgZm9yIChjb25zdCBqc29uIG9mIHBrSnNvbnMpIHtcbiAgICAgIGNvbnN0IGRlcHMgPSBqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1Zygnc2NhblNyY0RlcHNBc3luYygpIGRlcCAnICsgbmFtZSk7XG4gICAgICAgICAgc2VsZi5fdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgICBsb2cud2FybihgJHtqc29uLm5hbWV9IGNvbnRhaW5zIFwiZGV2RGVwZW5lbmRpZXNcIiwgaWYgdGhleSBhcmUgbmVjZXNzYXJ5IGZvciBjb21waWxpbmcgdGhpcyBjb21wb25lbnQgYCArXG4gICAgICAgICAgJ3lvdSBzaG91bGQgbW92ZSB0aGVtIHRvIFwiZGVwZW5kZW5jaWVzXCIgb3IgXCJwZWVyRGVwZW5kZW5jaWVzXCInKTtcbiAgICAgICAgLy8gZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24uZGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAvLyAgIGNvbnN0IHZlcnNpb24gPSBqc29uLmRldkRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgLy8gICBzZWxmLl90cmFja1NyY0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICBzZWxmLl90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzY2FuU3JjRGVwcyhqc29uRmlsZXM6IHN0cmluZ1tdKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NhbkZvcihqc29uRmlsZXMubWFwKHBhY2thZ2VKc29uID0+IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCAndXRmOCcpKSkpO1xuICB9XG5cbiAgaG9pc3REZXBzKCkge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+ID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5zcmNEZXBzKTtcbiAgICBjb25zdCBwZWVyRGVwZW5kZW50SW5mbyA9IHRoaXMuY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMucGVlckRlcHMsIGZhbHNlKTtcbiAgICAvLyBtZXJnZSBwZWVyIGRlcGVuZGVudCBpbmZvIGxpc3QgaW50byByZWd1bGFyIGRlcGVuZGVudCBpbmZvIGxpc3RcbiAgICBmb3IgKGNvbnN0IFtwZWVyRGVwLCBwZWVySW5mb10gb2YgcGVlckRlcGVuZGVudEluZm8uZW50cmllcygpKSB7XG4gICAgICBpZiAoIXBlZXJJbmZvLm1pc3NpbmcpXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBub3JtSW5mbyA9IGRlcGVuZGVudEluZm8uZ2V0KHBlZXJEZXApO1xuICAgICAgaWYgKG5vcm1JbmZvKSB7XG4gICAgICAgIHBlZXJJbmZvLmR1cGxpY2F0ZVBlZXIgPSB0cnVlO1xuICAgICAgICBwZWVySW5mby5taXNzaW5nID0gZmFsc2U7XG4gICAgICAgIHBlZXJJbmZvLmJ5LnVuc2hpZnQobm9ybUluZm8uYnlbMF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2RlcE5hbWUsIGl0ZW1dIG9mIHRoaXMuZGlyZWN0RGVwc0xpc3QudHJhdmVyc2UoKSkge1xuICAgICAgY29uc3QgaW5mbzogRGVwZW5kZW50SW5mbyA9IHtcbiAgICAgICAgc2FtZVZlcjogdHJ1ZSxcbiAgICAgICAgZGlyZWN0OiB0cnVlLFxuICAgICAgICBtaXNzaW5nOiBmYWxzZSxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiBbe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9XVxuICAgICAgfTtcbiAgICAgIGRlcGVuZGVudEluZm8uc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBbZGVwZW5kZW50SW5mbywgcGVlckRlcGVuZGVudEluZm9dO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbGxlY3REZXBlbmRlbmN5SW5mbyh0cmFja2VkUmF3OiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+LCBub3RQZWVyRGVwcyA9IHRydWUpIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvczogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4gPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCB2ZXJzaW9uTGlzdF0gb2YgdHJhY2tlZFJhdy5lbnRyaWVzKCkpIHtcbiAgICAgIGNvbnN0IGRpcmVjdFZlciA9IHRoaXMuZGlyZWN0RGVwcy5nZXQoZGVwTmFtZSk7XG4gICAgICBjb25zdCB2ZXJzaW9ucyA9IHNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIGRlcE5hbWUpO1xuICAgICAgaWYgKGRpcmVjdFZlcikge1xuICAgICAgICB2ZXJzaW9ucy51bnNoaWZ0KGRpcmVjdFZlci52YWx1ZVsxXSk7XG4gICAgICAgIGlmIChub3RQZWVyRGVwcykge1xuICAgICAgICAgIHRoaXMuZGlyZWN0RGVwc0xpc3QucmVtb3ZlTm9kZShkaXJlY3RWZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IF9jb250YWluc0RpZmZWZXJzaW9uKHZlcnNpb25MaXN0KTtcblxuICAgICAgY29uc3QgZGlyZWN0ID0gdGhpcy5kaXJlY3REZXBzLmhhcyhkZXBOYW1lKTtcbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6ICFoYXNEaWZmVmVyc2lvbixcbiAgICAgICAgZGlyZWN0LFxuICAgICAgICBtaXNzaW5nOiBub3RQZWVyRGVwcyA/IGZhbHNlIDogIWRpcmVjdCxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiB2ZXJzaW9ucy5tYXAoaXRlbSA9PiAoe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9KSlcbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvcy5zZXQoZGVwTmFtZSwgaW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlcGVuZGVudEluZm9zO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1NyY0RlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZURlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghdGhpcy5zcmNEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5zcmNEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5zcmNEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrUGVlckRlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZURlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghdGhpcy5wZWVyRGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMucGVlckRlcHMuc2V0KG5hbWUsIFtdKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICB0aGlzLnBlZXJEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICBpZiAoc29ydGVkVmVyc2lvbnMubGVuZ3RoIDw9IDEpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBhID0gc29ydGVkVmVyc2lvbnNbaV0udmVyO1xuICAgIGNvbnN0IGIgPSBzb3J0ZWRWZXJzaW9uc1tpICsgMV0udmVyO1xuXG4gICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgIGNvbnRpbnVlO1xuICAgIGlmIChhICE9PSBiKVxuICAgICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuLyoqXG4gKiBTb3J0IGJ5IGRlc2NlbmRpbmdcbiAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cbiAqL1xuZnVuY3Rpb24gc29ydEJ5VmVyc2lvbih2ZXJJbmZvTGlzdDogRGVwSW5mb1tdLCBuYW1lOiBzdHJpbmcpIHtcbiAgaWYgKHZlckluZm9MaXN0ID09IG51bGwgfHwgdmVySW5mb0xpc3QubGVuZ3RoID09PSAxKVxuICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgdHJ5IHtcbiAgICB2ZXJJbmZvTGlzdC5zb3J0KChpbmZvMSwgaW5mbzIpID0+IHtcbiAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBpbmZvMS5wcmUgPT09ICcnICYmIGluZm8yLnByZSAhPT0gJycgPyAtMSA6XG4gICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy53YXJuKGluZm8xLCBpbmZvMik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtID09IG51bGwpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8yLnZlck51bSAhPSBudWxsICYmIGluZm8xLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgZWxzZSBpZiAoaW5mbzEudmVyIDwgaW5mbzIudmVyKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoYEludmFsaWQgc2VtdmVyIGZvcm1hdCBmb3IgJHtuYW1lIHx8ICcnfTogYCArIEpTT04uc3RyaW5naWZ5KHZlckluZm9MaXN0LCBudWxsLCAnICAnKSk7XG4gICAgdGhyb3cgZTtcbiAgfVxuICByZXR1cm4gdmVySW5mb0xpc3Q7XG59XG5cblxuIl19