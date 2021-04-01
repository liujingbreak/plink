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
exports.TransitiveDepScanner = exports.listCompDependency = void 0;
/* tslint:disable max-line-length */
// import {mkdirpSync} from 'fs-extra';
const _ = __importStar(require("lodash"));
const misc_1 = require("./utils/misc");
const semver = require('semver');
const log = require('log4js').getLogger('plink.transitive-dep-hoister');
/**
 *
 * @param pkJsonFiles json map of linked package
 * @param workspace
 * @param workspaceDeps
 * @param workspaceDevDeps
 */
function listCompDependency(pkJsonFiles, workspace, workspaceDeps, workspaceDevDeps) {
    const jsons = Array.from(pkJsonFiles.values()).map(item => item.json);
    const allDeps = Object.assign(Object.assign({}, workspaceDeps), (workspaceDevDeps ? workspaceDevDeps : {}));
    let scanner = new TransitiveDepScanner(allDeps, workspace, pkJsonFiles);
    scanner.scanFor(jsons.filter(item => _.has(workspaceDeps, item.name)));
    const [HoistedDepInfo, HoistedPeerDepInfo] = scanner.hoistDeps();
    let hoistedDev;
    let hoistedDevPeers;
    if (workspaceDevDeps) {
        scanner = new TransitiveDepScanner(allDeps, workspace, pkJsonFiles);
        scanner.scanFor(jsons.filter(item => _.has(workspaceDevDeps, item.name)));
        [hoistedDev, hoistedDevPeers] = scanner.hoistDeps(HoistedDepInfo);
    }
    else {
        hoistedDev = new Map();
        hoistedDevPeers = new Map();
    }
    // TODO: devDependencies might contains transitive dependency which duplicates to "dependencies"
    return {
        hoisted: HoistedDepInfo,
        hoistedPeers: HoistedPeerDepInfo,
        hoistedDev,
        hoistedDevPeers
    };
}
exports.listCompDependency = listCompDependency;
const versionReg = /^(\D*)(\d.*?)(?:\.tgz)?$/;
class TransitiveDepScanner {
    /**
     *
     * @param workspaceDeps should include "dependencies" and "devDependencies"
     * @param workspaceName
     * @param excludeLinkedDeps
     */
    constructor(workspaceDeps, workspaceName, excludeLinkedDeps) {
        this.excludeLinkedDeps = excludeLinkedDeps;
        /** key is dependency module name */
        this.directDeps = new Map();
        this.srcDeps = new Map();
        this.peerDeps = new Map();
        this.directDepsList = new misc_1.SimpleLinkedList();
        for (const [name, version] of Object.entries(workspaceDeps)) {
            if (this.excludeLinkedDeps.has(name))
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
        // this.srcDeps.clear();
        // this.peerDeps.clear();
        for (const json of pkJsons) {
            const deps = json.dependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    // log.debug('scanSrcDepsAsync() dep ' + name);
                    this._trackSrcDependency(name, version, json.name);
                }
            }
            if (json.devDependencies) {
                log.warn(`A linked package "${json.name}" contains "devDepenendies", if they are necessary for running in worktree space, ` +
                    'you should move them to "dependencies" or "peerDependencies" of that package');
            }
            if (json.peerDependencies) {
                for (const name of Object.keys(json.peerDependencies)) {
                    const version = json.peerDependencies[name];
                    this._trackPeerDependency(name, version, json.name);
                }
            }
        }
    }
    // scanSrcDeps(jsonFiles: string[]) {
    //   return this.scanFor(jsonFiles.map(packageJson => JSON.parse(fs.readFileSync(packageJson, 'utf8'))));
    // }
    /**
     * The base algorithm: "new dependencies" = "direct dependencies of workspace" + "transive dependencies"
     * @param extraDependentInfo extra dependent information to check if they are duplicate.
     */
    hoistDeps(extraDependentInfo) {
        const dependentInfo = this.collectDependencyInfo(this.srcDeps);
        const peerDependentInfo = this.collectDependencyInfo(this.peerDeps, true);
        // In case peer dependency duplicates to existing transitive dependency, set "missing" to `false`
        for (const [peerDep, peerInfo] of peerDependentInfo.entries()) {
            if (!peerInfo.missing)
                continue;
            let normInfo = dependentInfo.get(peerDep);
            if (normInfo) {
                peerInfo.duplicatePeer = true;
                peerInfo.missing = false;
                peerInfo.by.unshift(normInfo.by[0]);
            }
            if (extraDependentInfo) {
                normInfo = extraDependentInfo.get(peerDep);
                if (normInfo) {
                    peerInfo.duplicatePeer = true;
                    peerInfo.missing = false;
                    peerInfo.by.unshift(normInfo.by[0]);
                }
            }
        }
        // merge directDepsList (direct dependencies of workspace) into dependentInfo (transive dependencies)
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
    /**
     * - If there is a direct dependency of workspace, move its version to the top of the version list,
     * - If it is peer dependency and it is not a direct dependency of workspace,
     * mark it "missing" so that reminds user to manual install it.
     * @param trackedRaw
     * @param isPeerDeps
     */
    collectDependencyInfo(trackedRaw, isPeerDeps = false) {
        const dependentInfos = new Map();
        for (const [depName, versionList] of trackedRaw.entries()) {
            // If there is a direct dependency of workspace, move its version to the top of the version list
            const directVer = this.directDeps.get(depName);
            const versions = sortByVersion(versionList, depName);
            if (directVer) {
                versions.unshift(directVer.value[1]);
                if (!isPeerDeps) {
                    this.directDepsList.removeNode(directVer);
                }
            }
            const hasDiffVersion = _containsDiffVersion(versionList);
            const info = {
                sameVer: !hasDiffVersion,
                direct: directVer != null,
                // If it is peer dependency and it is not a direct dependency of workspace,
                // then mark it "missing" so that reminds user to manual install it.
                missing: isPeerDeps && directVer == null,
                duplicatePeer: false,
                by: versions.map(item => ({ ver: item.ver, name: item.by }))
            };
            dependentInfos.set(depName, info);
        }
        return dependentInfos;
    }
    _trackSrcDependency(name, version, byWhom) {
        if (this.excludeLinkedDeps.has(name))
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
        if (this.excludeLinkedDeps.has(name))
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
exports.TransitiveDepScanner = TransitiveDepScanner;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyx1Q0FBdUM7QUFDdkMsMENBQTRCO0FBQzVCLHVDQUFvRTtBQUNwRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBU3hFOzs7Ozs7R0FNRztBQUNILFNBQWdCLGtCQUFrQixDQUNoQyxXQUFvRCxFQUNwRCxTQUFpQixFQUNqQixhQUF1QyxFQUN2QyxnQkFBMkM7SUFFM0MsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEUsTUFBTSxPQUFPLG1DQUFPLGFBQWEsR0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRixJQUFJLE9BQU8sR0FBRyxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxNQUFNLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsRUFB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LENBQUMsQ0FBQztLQUNKO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixJQUFJLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLENBQUM7S0FDVDtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbi8vIGltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtTaW1wbGVMaW5rZWRMaXN0LCBTaW1wbGVMaW5rZWRMaXN0Tm9kZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IHNlbXZlciA9IHJlcXVpcmUoJ3NlbXZlcicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwbGluay50cmFuc2l0aXZlLWRlcC1ob2lzdGVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGVzIGpzb24gbWFwIG9mIGxpbmtlZCBwYWNrYWdlXG4gKiBAcGFyYW0gd29ya3NwYWNlIFxuICogQHBhcmFtIHdvcmtzcGFjZURlcHMgXG4gKiBAcGFyYW0gd29ya3NwYWNlRGV2RGVwcyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpc3RDb21wRGVwZW5kZW5jeShcbiAgcGtKc29uRmlsZXM6IE1hcDxzdHJpbmcsIHtqc29uOiBQYWNrYWdlSnNvbkludGVyZjt9PixcbiAgd29ya3NwYWNlOiBzdHJpbmcsXG4gIHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSxcbiAgd29ya3NwYWNlRGV2RGVwcz86IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVxuKSB7XG4gIGNvbnN0IGpzb25zID0gQXJyYXkuZnJvbShwa0pzb25GaWxlcy52YWx1ZXMoKSkubWFwKGl0ZW0gPT4gaXRlbS5qc29uKTtcbiAgY29uc3QgYWxsRGVwcyA9IHsuLi53b3Jrc3BhY2VEZXBzLCAuLi4od29ya3NwYWNlRGV2RGVwcyA/IHdvcmtzcGFjZURldkRlcHMgOiB7fSl9O1xuICBsZXQgc2Nhbm5lciA9IG5ldyBUcmFuc2l0aXZlRGVwU2Nhbm5lcihhbGxEZXBzLCB3b3Jrc3BhY2UsIHBrSnNvbkZpbGVzKTtcbiAgc2Nhbm5lci5zY2FuRm9yKGpzb25zLmZpbHRlcihpdGVtID0+IF8uaGFzKHdvcmtzcGFjZURlcHMsIGl0ZW0ubmFtZSkpKTtcbiAgY29uc3QgW0hvaXN0ZWREZXBJbmZvLCBIb2lzdGVkUGVlckRlcEluZm9dID0gc2Nhbm5lci5ob2lzdERlcHMoKTtcbiAgbGV0IGhvaXN0ZWREZXY6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBsZXQgaG9pc3RlZERldlBlZXJzOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaWYgKHdvcmtzcGFjZURldkRlcHMpIHtcbiAgICBzY2FubmVyID0gbmV3IFRyYW5zaXRpdmVEZXBTY2FubmVyKGFsbERlcHMsIHdvcmtzcGFjZSwgcGtKc29uRmlsZXMpO1xuICAgIHNjYW5uZXIuc2NhbkZvcihqc29ucy5maWx0ZXIoaXRlbSA9PiBfLmhhcyh3b3Jrc3BhY2VEZXZEZXBzLCBpdGVtLm5hbWUpKSk7XG4gICAgW2hvaXN0ZWREZXYsIGhvaXN0ZWREZXZQZWVyc10gPSBzY2FubmVyLmhvaXN0RGVwcyhIb2lzdGVkRGVwSW5mbyk7XG4gIH0gZWxzZSB7XG4gICAgaG9pc3RlZERldiA9IG5ldyBNYXAoKTtcbiAgICBob2lzdGVkRGV2UGVlcnMgPSBuZXcgTWFwKCk7XG4gIH1cbiAgLy8gVE9ETzogZGV2RGVwZW5kZW5jaWVzIG1pZ2h0IGNvbnRhaW5zIHRyYW5zaXRpdmUgZGVwZW5kZW5jeSB3aGljaCBkdXBsaWNhdGVzIHRvIFwiZGVwZW5kZW5jaWVzXCJcbiAgcmV0dXJuIHtcbiAgICBob2lzdGVkOiBIb2lzdGVkRGVwSW5mbyxcbiAgICBob2lzdGVkUGVlcnM6IEhvaXN0ZWRQZWVyRGVwSW5mbyxcbiAgICBob2lzdGVkRGV2LFxuICAgIGhvaXN0ZWREZXZQZWVyc1xuICB9O1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVudEluZm8ge1xuICAvKiogSXMgYWxsIGRlcGVuZGVudHMgb24gc2FtZSB2ZXJzaW9uICovXG4gIHNhbWVWZXI6IGJvb2xlYW47XG4gIC8qKiBJcyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHNwYWNlIHBhY2thZ2UuanNvbiAqL1xuICBkaXJlY3Q6IGJvb2xlYW47XG4gIC8qKiBJbiBjYXNlIGEgdHJhbnNpdGl2ZSBwZWVyIGRlcGVuZGVuY3ksIGl0IHNob3VsZCBub3RcbiAgICogYmUgaW5zdGFsbGVkIGF1dG9tYXRpY2FsbHksIHVubGVzcyBpdCBpcyBhbHNvIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2YgY3VycmVudCBzcGFjZSxcbiAgICogc2V0dGluZyB0byBgdHJ1ZWAgdG8gcmVtaW5kIHVzZXIgdG8gaW5zdGFsbCBtYW51YWxseSBcbiAgICovXG4gIG1pc3Npbmc6IGJvb2xlYW47XG4gIC8qKiBTYW1lIHRyYXNpdGl2ZSBkZXBlbmRlbmN5IGluIGJvdGggbm9ybWFsIGFuZCBwZWVyIGRlcGVuZGVuY2llcyBsaXN0XG4gICAqIGFjdHVhbCB2ZXJzaW9uIHNob3VsZCBiZSB0aGUgb25lIHNlbGVjdGVkIGZyb20gbm9ybWFsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgKi9cbiAgZHVwbGljYXRlUGVlcjogYm9vbGVhbjtcbiAgYnk6IEFycmF5PHtcbiAgICAvKiogZGVwZW5kZW5jeSB2ZXJzaW9uIChub3QgZGVwZW5kZW50J3MpICovXG4gICAgdmVyOiBzdHJpbmc7XG4gICAgLyoqIGRlcGVuZGVudCBuYW1lICovXG4gICAgbmFtZTogc3RyaW5nO1xuICB9Pjtcbn1cblxuXG5cbmNvbnN0IHZlcnNpb25SZWcgPSAvXihcXEQqKShcXGQuKj8pKD86XFwudGd6KT8kLztcblxuZXhwb3J0IGNsYXNzIFRyYW5zaXRpdmVEZXBTY2FubmVyIHtcbiAgdmVyYm9zTWVzc2FnZTogc3RyaW5nO1xuICAvKioga2V5IGlzIGRlcGVuZGVuY3kgbW9kdWxlIG5hbWUgKi9cbiAgcHJpdmF0ZSBkaXJlY3REZXBzOiBNYXA8c3RyaW5nLCBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxbc3RyaW5nLCBEZXBJbmZvXT4+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHNyY0RlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgcGVlckRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZGlyZWN0RGVwc0xpc3Q6IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+ID0gbmV3IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+KCk7XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gd29ya3NwYWNlRGVwcyBzaG91bGQgaW5jbHVkZSBcImRlcGVuZGVuY2llc1wiIGFuZCBcImRldkRlcGVuZGVuY2llc1wiXG4gICAqIEBwYXJhbSB3b3Jrc3BhY2VOYW1lIFxuICAgKiBAcGFyYW0gZXhjbHVkZUxpbmtlZERlcHMgXG4gICAqL1xuICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sIHdvcmtzcGFjZU5hbWU6IHN0cmluZywgcHJpdmF0ZSBleGNsdWRlTGlua2VkRGVwczogTWFwPHN0cmluZywgYW55PiB8IFNldDxzdHJpbmc+KSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMod29ya3NwYWNlRGVwcykpIHtcbiAgICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgICAgY29uc3QgY3Vyck5vZGUgPSB0aGlzLmRpcmVjdERlcHNMaXN0LnB1c2goW25hbWUsIHtcbiAgICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgICAgYnk6IGAoJHt3b3Jrc3BhY2VOYW1lIHx8ICc8cm9vdCBkaXJlY3Rvcnk+J30pYFxuICAgICAgfV0pO1xuICAgICAgdGhpcy5kaXJlY3REZXBzLnNldChuYW1lLCBjdXJyTm9kZSk7XG4gICAgfVxuICB9XG5cbiAgc2NhbkZvcihwa0pzb25zOiBJdGVyYWJsZTxQYWNrYWdlSnNvbkludGVyZj4pIHtcbiAgICAvLyB0aGlzLnNyY0RlcHMuY2xlYXIoKTtcbiAgICAvLyB0aGlzLnBlZXJEZXBzLmNsZWFyKCk7XG5cbiAgICBmb3IgKGNvbnN0IGpzb24gb2YgcGtKc29ucykge1xuICAgICAgY29uc3QgZGVwcyA9IGpzb24uZGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKGRlcHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKCdzY2FuU3JjRGVwc0FzeW5jKCkgZGVwICcgKyBuYW1lKTtcbiAgICAgICAgICB0aGlzLl90cmFja1NyY0RlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24uZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGxvZy53YXJuKGBBIGxpbmtlZCBwYWNrYWdlIFwiJHtqc29uLm5hbWV9XCIgY29udGFpbnMgXCJkZXZEZXBlbmVuZGllc1wiLCBpZiB0aGV5IGFyZSBuZWNlc3NhcnkgZm9yIHJ1bm5pbmcgaW4gd29ya3RyZWUgc3BhY2UsIGAgK1xuICAgICAgICAgICd5b3Ugc2hvdWxkIG1vdmUgdGhlbSB0byBcImRlcGVuZGVuY2llc1wiIG9yIFwicGVlckRlcGVuZGVuY2llc1wiIG9mIHRoYXQgcGFja2FnZScpO1xuICAgICAgfVxuICAgICAgaWYgKGpzb24ucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgdGhpcy5fdHJhY2tQZWVyRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gc2NhblNyY0RlcHMoanNvbkZpbGVzOiBzdHJpbmdbXSkge1xuICAvLyAgIHJldHVybiB0aGlzLnNjYW5Gb3IoanNvbkZpbGVzLm1hcChwYWNrYWdlSnNvbiA9PiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwgJ3V0ZjgnKSkpKTtcbiAgLy8gfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBhbGdvcml0aG06IFwibmV3IGRlcGVuZGVuY2llc1wiID0gXCJkaXJlY3QgZGVwZW5kZW5jaWVzIG9mIHdvcmtzcGFjZVwiICsgXCJ0cmFuc2l2ZSBkZXBlbmRlbmNpZXNcIlxuICAgKiBAcGFyYW0gZXh0cmFEZXBlbmRlbnRJbmZvIGV4dHJhIGRlcGVuZGVudCBpbmZvcm1hdGlvbiB0byBjaGVjayBpZiB0aGV5IGFyZSBkdXBsaWNhdGUuXG4gICAqL1xuICBob2lzdERlcHMoZXh0cmFEZXBlbmRlbnRJbmZvPzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4pIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5zcmNEZXBzKTtcbiAgICBjb25zdCBwZWVyRGVwZW5kZW50SW5mbyA9IHRoaXMuY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMucGVlckRlcHMsIHRydWUpO1xuICAgIC8vIEluIGNhc2UgcGVlciBkZXBlbmRlbmN5IGR1cGxpY2F0ZXMgdG8gZXhpc3RpbmcgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5LCBzZXQgXCJtaXNzaW5nXCIgdG8gYGZhbHNlYFxuXG4gICAgZm9yIChjb25zdCBbcGVlckRlcCwgcGVlckluZm9dIG9mIHBlZXJEZXBlbmRlbnRJbmZvLmVudHJpZXMoKSkge1xuICAgICAgaWYgKCFwZWVySW5mby5taXNzaW5nKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgbGV0IG5vcm1JbmZvID0gZGVwZW5kZW50SW5mby5nZXQocGVlckRlcCk7XG4gICAgICBpZiAobm9ybUluZm8pIHtcbiAgICAgICAgcGVlckluZm8uZHVwbGljYXRlUGVlciA9IHRydWU7XG4gICAgICAgIHBlZXJJbmZvLm1pc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgcGVlckluZm8uYnkudW5zaGlmdChub3JtSW5mby5ieVswXSk7XG4gICAgICB9XG4gICAgICBpZiAoZXh0cmFEZXBlbmRlbnRJbmZvKSB7XG4gICAgICAgIG5vcm1JbmZvID0gZXh0cmFEZXBlbmRlbnRJbmZvLmdldChwZWVyRGVwKTtcbiAgICAgICAgaWYgKG5vcm1JbmZvKSB7XG4gICAgICAgICAgcGVlckluZm8uZHVwbGljYXRlUGVlciA9IHRydWU7XG4gICAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICAgIHBlZXJJbmZvLmJ5LnVuc2hpZnQobm9ybUluZm8uYnlbMF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgZGlyZWN0RGVwc0xpc3QgKGRpcmVjdCBkZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlKSBpbnRvIGRlcGVuZGVudEluZm8gKHRyYW5zaXZlIGRlcGVuZGVuY2llcylcbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCBpdGVtXSBvZiB0aGlzLmRpcmVjdERlcHNMaXN0LnRyYXZlcnNlKCkpIHtcbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6IHRydWUsXG4gICAgICAgIGRpcmVjdDogdHJ1ZSxcbiAgICAgICAgbWlzc2luZzogZmFsc2UsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogW3t2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fV1cbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2RlcGVuZGVudEluZm8sIHBlZXJEZXBlbmRlbnRJbmZvXTtcbiAgfVxuXG4gIC8qKlxuICAgKiAtIElmIHRoZXJlIGlzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLCBtb3ZlIGl0cyB2ZXJzaW9uIHRvIHRoZSB0b3Agb2YgdGhlIHZlcnNpb24gbGlzdCxcbiAgICogLSBJZiBpdCBpcyBwZWVyIGRlcGVuZGVuY3kgYW5kIGl0IGlzIG5vdCBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHdvcmtzcGFjZSxcbiAgICogbWFyayBpdCBcIm1pc3NpbmdcIiBzbyB0aGF0IHJlbWluZHMgdXNlciB0byBtYW51YWwgaW5zdGFsbCBpdC5cbiAgICogQHBhcmFtIHRyYWNrZWRSYXcgXG4gICAqIEBwYXJhbSBpc1BlZXJEZXBzIFxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbGxlY3REZXBlbmRlbmN5SW5mbyh0cmFja2VkUmF3OiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+LCBpc1BlZXJEZXBzID0gZmFsc2UpIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvczogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4gPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCB2ZXJzaW9uTGlzdF0gb2YgdHJhY2tlZFJhdy5lbnRyaWVzKCkpIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLCBtb3ZlIGl0cyB2ZXJzaW9uIHRvIHRoZSB0b3Agb2YgdGhlIHZlcnNpb24gbGlzdFxuICAgICAgY29uc3QgZGlyZWN0VmVyID0gdGhpcy5kaXJlY3REZXBzLmdldChkZXBOYW1lKTtcbiAgICAgIGNvbnN0IHZlcnNpb25zID0gc29ydEJ5VmVyc2lvbih2ZXJzaW9uTGlzdCwgZGVwTmFtZSk7XG4gICAgICBpZiAoZGlyZWN0VmVyKSB7XG4gICAgICAgIHZlcnNpb25zLnVuc2hpZnQoZGlyZWN0VmVyLnZhbHVlWzFdKTtcbiAgICAgICAgaWYgKCFpc1BlZXJEZXBzKSB7XG4gICAgICAgICAgdGhpcy5kaXJlY3REZXBzTGlzdC5yZW1vdmVOb2RlKGRpcmVjdFZlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuXG4gICAgICBjb25zdCBpbmZvOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiAhaGFzRGlmZlZlcnNpb24sXG4gICAgICAgIGRpcmVjdDogZGlyZWN0VmVyICE9IG51bGwsXG4gICAgICAgIC8vIElmIGl0IGlzIHBlZXIgZGVwZW5kZW5jeSBhbmQgaXQgaXMgbm90IGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLFxuICAgICAgICAvLyB0aGVuIG1hcmsgaXQgXCJtaXNzaW5nXCIgc28gdGhhdCByZW1pbmRzIHVzZXIgdG8gbWFudWFsIGluc3RhbGwgaXQuXG4gICAgICAgIG1pc3Npbmc6IGlzUGVlckRlcHMgJiYgZGlyZWN0VmVyID09IG51bGwsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogdmVyc2lvbnMubWFwKGl0ZW0gPT4gKHt2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fSkpXG4gICAgICB9O1xuICAgICAgZGVwZW5kZW50SW5mb3Muc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkZXBlbmRlbnRJbmZvcztcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMuc3JjRGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMuc3JjRGVwcy5zZXQobmFtZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRoaXMuc3JjRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMucGVlckRlcHMuaGFzKG5hbWUpKSB7XG4gICAgICB0aGlzLnBlZXJEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5wZWVyRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcbiAgaWYgKHNvcnRlZFZlcnNpb25zLmxlbmd0aCA8PSAxKVxuICAgIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgYSA9IHNvcnRlZFZlcnNpb25zW2ldLnZlcjtcbiAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgIGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAoYSAhPT0gYilcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbi8qKlxuICogU29ydCBieSBkZXNjZW5kaW5nXG4gKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHNvcnRCeVZlcnNpb24odmVySW5mb0xpc3Q6IERlcEluZm9bXSwgbmFtZTogc3RyaW5nKSB7XG4gIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICByZXR1cm4gdmVySW5mb0xpc3Q7XG4gIHRyeSB7XG4gICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtICE9IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgIGlmIChyZXMgPT09IDApXG4gICAgICAgICAgICByZXR1cm4gaW5mbzEucHJlID09PSAnJyAmJiBpbmZvMi5wcmUgIT09ICcnID8gLTEgOlxuICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cud2FybihpbmZvMSwgaW5mbzIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMi52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMS52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgIHRocm93IGU7XG4gIH1cbiAgcmV0dXJuIHZlckluZm9MaXN0O1xufVxuXG5cbiJdfQ==