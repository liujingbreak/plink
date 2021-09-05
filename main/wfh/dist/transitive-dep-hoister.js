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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransitiveDepScanner = exports.listCompDependency = void 0;
/* eslint-disable  max-len */
// import {mkdirpSync} from 'fs-extra';
const _ = __importStar(require("lodash"));
const misc_1 = require("./utils/misc");
const log4js_1 = require("log4js");
const semver_1 = __importDefault(require("semver"));
const log = (0, log4js_1.getLogger)('plink.transitive-dep-hoister');
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
    const devDeps = scanner.devDeps;
    let hoistedDev;
    let hoistedDevPeers;
    if (workspaceDevDeps) {
        scanner = new TransitiveDepScanner(allDeps, workspace, pkJsonFiles);
        scanner.initExistingDeps(devDeps);
        scanner.scanFor(jsons.filter(item => _.has(workspaceDevDeps, item.name)), true);
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
        this.devDeps = new Map();
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
    scanFor(pkJsons, combineDevDeps = false) {
        for (const json of pkJsons) {
            let deps = json.dependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    this._trackSrcDependency(name, version, json.name);
                }
            }
            deps = json.devDependencies;
            if (deps) {
                for (const name of Object.keys(deps)) {
                    const version = deps[name];
                    if (combineDevDeps)
                        this._trackSrcDependency(name, version, json.name);
                    else
                        this._trackDevDependency(name, version, json.name);
                }
            }
            if (json.peerDependencies) {
                for (const name of Object.keys(json.peerDependencies)) {
                    const version = json.peerDependencies[name];
                    this._trackPeerDependency(name, version, json.name);
                }
            }
        }
    }
    initExistingDeps(deps) {
        for (const [key, info] of deps) {
            this.srcDeps.set(key, info);
        }
    }
    /**
     * The base algorithm: "new dependencies" = "direct dependencies of workspace" + "transive dependencies"
     * @param duplicateDepsToCheck extra dependent information to check if they are duplicate.
     */
    hoistDeps(duplicateDepsToCheck) {
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
            if (duplicateDepsToCheck) {
                normInfo = duplicateDepsToCheck.get(peerDep);
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
        this._trackDependency(this.srcDeps, name, version, byWhom);
    }
    _trackDevDependency(name, version, byWhom) {
        this._trackDependency(this.devDeps, name, version, byWhom);
    }
    _trackDependency(deps, name, version, byWhom) {
        if (this.excludeLinkedDeps.has(name))
            return;
        if (!deps.has(name)) {
            deps.set(name, []);
        }
        const m = versionReg.exec(version);
        deps.get(name).push({
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
                    const res = semver_1.default.rcompare(info1.verNum, info2.verNum);
                    if (res === 0)
                        return info1.pre === '' && info2.pre !== '' ? -1 :
                            (info1.pre !== '' && info2.pre === '' ? 1 : 0);
                    else
                        return res;
                }
                catch (e) {
                    log.warn(info1, info2);
                    return 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3Qix1Q0FBdUM7QUFDdkMsMENBQTRCO0FBQzVCLHVDQUFvRTtBQUNwRSxtQ0FBaUM7QUFDakMsb0RBQTRCO0FBRTVCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBU3REOzs7Ozs7R0FNRztBQUNILFNBQWdCLGtCQUFrQixDQUNoQyxXQUFtRCxFQUNuRCxTQUFpQixFQUNqQixhQUF1QyxFQUN2QyxnQkFBMkM7SUFFM0MsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEUsTUFBTSxPQUFPLG1DQUFPLGFBQWEsR0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRixJQUFJLE9BQU8sR0FBRyxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxNQUFNLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2pFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FB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LENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlbiAqL1xuLy8gaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1NpbXBsZUxpbmtlZExpc3QsIFNpbXBsZUxpbmtlZExpc3ROb2RlfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5cbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsudHJhbnNpdGl2ZS1kZXAtaG9pc3RlcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uSW50ZXJmIHtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldkRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIHBlZXJEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBkZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlcyBqc29uIG1hcCBvZiBsaW5rZWQgcGFja2FnZVxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VEZXBzIFxuICogQHBhcmFtIHdvcmtzcGFjZURldkRlcHMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaXN0Q29tcERlcGVuZGVuY3koXG4gIHBrSnNvbkZpbGVzOiBNYXA8c3RyaW5nLCB7anNvbjogUGFja2FnZUpzb25JbnRlcmZ9PixcbiAgd29ya3NwYWNlOiBzdHJpbmcsXG4gIHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSxcbiAgd29ya3NwYWNlRGV2RGVwcz86IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVxuKSB7XG4gIGNvbnN0IGpzb25zID0gQXJyYXkuZnJvbShwa0pzb25GaWxlcy52YWx1ZXMoKSkubWFwKGl0ZW0gPT4gaXRlbS5qc29uKTtcbiAgY29uc3QgYWxsRGVwcyA9IHsuLi53b3Jrc3BhY2VEZXBzLCAuLi4od29ya3NwYWNlRGV2RGVwcyA/IHdvcmtzcGFjZURldkRlcHMgOiB7fSl9O1xuICBsZXQgc2Nhbm5lciA9IG5ldyBUcmFuc2l0aXZlRGVwU2Nhbm5lcihhbGxEZXBzLCB3b3Jrc3BhY2UsIHBrSnNvbkZpbGVzKTtcbiAgc2Nhbm5lci5zY2FuRm9yKGpzb25zLmZpbHRlcihpdGVtID0+IF8uaGFzKHdvcmtzcGFjZURlcHMsIGl0ZW0ubmFtZSkpKTtcbiAgY29uc3QgW0hvaXN0ZWREZXBJbmZvLCBIb2lzdGVkUGVlckRlcEluZm9dID0gc2Nhbm5lci5ob2lzdERlcHMoKTtcbiAgY29uc3QgZGV2RGVwcyA9IHNjYW5uZXIuZGV2RGVwcztcbiAgbGV0IGhvaXN0ZWREZXY6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBsZXQgaG9pc3RlZERldlBlZXJzOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaWYgKHdvcmtzcGFjZURldkRlcHMpIHtcbiAgICBzY2FubmVyID0gbmV3IFRyYW5zaXRpdmVEZXBTY2FubmVyKGFsbERlcHMsIHdvcmtzcGFjZSwgcGtKc29uRmlsZXMpO1xuICAgIHNjYW5uZXIuaW5pdEV4aXN0aW5nRGVwcyhkZXZEZXBzKTtcbiAgICBzY2FubmVyLnNjYW5Gb3IoanNvbnMuZmlsdGVyKGl0ZW0gPT4gXy5oYXMod29ya3NwYWNlRGV2RGVwcywgaXRlbS5uYW1lKSksIHRydWUpO1xuICAgIFtob2lzdGVkRGV2LCBob2lzdGVkRGV2UGVlcnNdID0gc2Nhbm5lci5ob2lzdERlcHMoSG9pc3RlZERlcEluZm8pO1xuICB9IGVsc2Uge1xuICAgIGhvaXN0ZWREZXYgPSBuZXcgTWFwKCk7XG4gICAgaG9pc3RlZERldlBlZXJzID0gbmV3IE1hcCgpO1xuICB9XG4gIC8vIFRPRE86IGRldkRlcGVuZGVuY2llcyBtaWdodCBjb250YWlucyB0cmFuc2l0aXZlIGRlcGVuZGVuY3kgd2hpY2ggZHVwbGljYXRlcyB0byBcImRlcGVuZGVuY2llc1wiXG4gIHJldHVybiB7XG4gICAgaG9pc3RlZDogSG9pc3RlZERlcEluZm8sXG4gICAgaG9pc3RlZFBlZXJzOiBIb2lzdGVkUGVlckRlcEluZm8sXG4gICAgaG9pc3RlZERldixcbiAgICBob2lzdGVkRGV2UGVlcnNcbiAgfTtcbn1cblxuaW50ZXJmYWNlIERlcEluZm8ge1xuICB2ZXI6IHN0cmluZztcbiAgdmVyTnVtPzogc3RyaW5nO1xuICBwcmU6IHN0cmluZztcbiAgYnk6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXBlbmRlbnRJbmZvIHtcbiAgLyoqIElzIGFsbCBkZXBlbmRlbnRzIG9uIHNhbWUgdmVyc2lvbiAqL1xuICBzYW1lVmVyOiBib29sZWFuO1xuICAvKiogSXMgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiBzcGFjZSBwYWNrYWdlLmpzb24gKi9cbiAgZGlyZWN0OiBib29sZWFuO1xuICAvKiogSW4gY2FzZSBhIHRyYW5zaXRpdmUgcGVlciBkZXBlbmRlbmN5LCBpdCBzaG91bGQgbm90XG4gICAqIGJlIGluc3RhbGxlZCBhdXRvbWF0aWNhbGx5LCB1bmxlc3MgaXQgaXMgYWxzbyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIGN1cnJlbnQgc3BhY2UsXG4gICAqIHNldHRpbmcgdG8gYHRydWVgIHRvIHJlbWluZCB1c2VyIHRvIGluc3RhbGwgbWFudWFsbHkgXG4gICAqL1xuICBtaXNzaW5nOiBib29sZWFuO1xuICAvKiogU2FtZSB0cmFzaXRpdmUgZGVwZW5kZW5jeSBpbiBib3RoIG5vcm1hbCBhbmQgcGVlciBkZXBlbmRlbmNpZXMgbGlzdFxuICAgKiBhY3R1YWwgdmVyc2lvbiBzaG91bGQgYmUgdGhlIG9uZSBzZWxlY3RlZCBmcm9tIG5vcm1hbCB0cmFuc2l0aXZlIGRlcGVuZGVuY3lcbiAgICovXG4gIGR1cGxpY2F0ZVBlZXI6IGJvb2xlYW47XG4gIGJ5OiBBcnJheTx7XG4gICAgLyoqIGRlcGVuZGVuY3kgdmVyc2lvbiAobm90IGRlcGVuZGVudCdzKSAqL1xuICAgIHZlcjogc3RyaW5nO1xuICAgIC8qKiBkZXBlbmRlbnQgbmFtZSAqL1xuICAgIG5hbWU6IHN0cmluZztcbiAgfT47XG59XG5cblxuXG5jb25zdCB2ZXJzaW9uUmVnID0gL14oXFxEKikoXFxkLio/KSg/OlxcLnRneik/JC87XG5cbmV4cG9ydCBjbGFzcyBUcmFuc2l0aXZlRGVwU2Nhbm5lciB7XG4gIHZlcmJvc01lc3NhZ2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgZGV2RGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgLyoqIGtleSBpcyBkZXBlbmRlbmN5IG1vZHVsZSBuYW1lICovXG4gIHByaXZhdGUgZGlyZWN0RGVwczogTWFwPHN0cmluZywgU2ltcGxlTGlua2VkTGlzdE5vZGU8W3N0cmluZywgRGVwSW5mb10+PiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBzcmNEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuXG4gIHByaXZhdGUgcGVlckRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgZGlyZWN0RGVwc0xpc3Q6IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+ID0gbmV3IFNpbXBsZUxpbmtlZExpc3Q8W3N0cmluZywgRGVwSW5mb10+KCk7XG5cbiAgLyoqXG4gICAqIFxuICAgKiBAcGFyYW0gd29ya3NwYWNlRGVwcyBzaG91bGQgaW5jbHVkZSBcImRlcGVuZGVuY2llc1wiIGFuZCBcImRldkRlcGVuZGVuY2llc1wiXG4gICAqIEBwYXJhbSB3b3Jrc3BhY2VOYW1lIFxuICAgKiBAcGFyYW0gZXhjbHVkZUxpbmtlZERlcHMgXG4gICAqL1xuICBjb25zdHJ1Y3Rvcih3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sIHdvcmtzcGFjZU5hbWU6IHN0cmluZywgcHJpdmF0ZSBleGNsdWRlTGlua2VkRGVwczogTWFwPHN0cmluZywgYW55PiB8IFNldDxzdHJpbmc+KSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMod29ya3NwYWNlRGVwcykpIHtcbiAgICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgICAgY29uc3QgY3Vyck5vZGUgPSB0aGlzLmRpcmVjdERlcHNMaXN0LnB1c2goW25hbWUsIHtcbiAgICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgICAgYnk6IGAoJHt3b3Jrc3BhY2VOYW1lIHx8ICc8cm9vdCBkaXJlY3Rvcnk+J30pYFxuICAgICAgfV0pO1xuICAgICAgdGhpcy5kaXJlY3REZXBzLnNldChuYW1lLCBjdXJyTm9kZSk7XG4gICAgfVxuICB9XG5cbiAgc2NhbkZvcihwa0pzb25zOiBJdGVyYWJsZTxQYWNrYWdlSnNvbkludGVyZj4sIGNvbWJpbmVEZXZEZXBzID0gZmFsc2UpIHtcbiAgICBmb3IgKGNvbnN0IGpzb24gb2YgcGtKc29ucykge1xuICAgICAgbGV0IGRlcHMgPSBqc29uLmRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIHRoaXMuX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkZXBzID0ganNvbi5kZXZEZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICBpZiAoY29tYmluZURldkRlcHMpXG4gICAgICAgICAgICB0aGlzLl90cmFja1NyY0RlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLl90cmFja0RldkRlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24ucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgdGhpcy5fdHJhY2tQZWVyRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5pdEV4aXN0aW5nRGVwcyhkZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+KSB7XG4gICAgZm9yIChjb25zdCBba2V5LCBpbmZvXSBvZiBkZXBzKSB7XG4gICAgICB0aGlzLnNyY0RlcHMuc2V0KGtleSwgaW5mbyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGFsZ29yaXRobTogXCJuZXcgZGVwZW5kZW5jaWVzXCIgPSBcImRpcmVjdCBkZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlXCIgKyBcInRyYW5zaXZlIGRlcGVuZGVuY2llc1wiXG4gICAqIEBwYXJhbSBkdXBsaWNhdGVEZXBzVG9DaGVjayBleHRyYSBkZXBlbmRlbnQgaW5mb3JtYXRpb24gdG8gY2hlY2sgaWYgdGhleSBhcmUgZHVwbGljYXRlLlxuICAgKi9cbiAgaG9pc3REZXBzKGR1cGxpY2F0ZURlcHNUb0NoZWNrPzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4pIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5zcmNEZXBzKTtcbiAgICBjb25zdCBwZWVyRGVwZW5kZW50SW5mbyA9IHRoaXMuY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMucGVlckRlcHMsIHRydWUpO1xuICAgIC8vIEluIGNhc2UgcGVlciBkZXBlbmRlbmN5IGR1cGxpY2F0ZXMgdG8gZXhpc3RpbmcgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5LCBzZXQgXCJtaXNzaW5nXCIgdG8gYGZhbHNlYFxuXG4gICAgZm9yIChjb25zdCBbcGVlckRlcCwgcGVlckluZm9dIG9mIHBlZXJEZXBlbmRlbnRJbmZvLmVudHJpZXMoKSkge1xuICAgICAgaWYgKCFwZWVySW5mby5taXNzaW5nKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgbGV0IG5vcm1JbmZvID0gZGVwZW5kZW50SW5mby5nZXQocGVlckRlcCk7XG4gICAgICBpZiAobm9ybUluZm8pIHtcbiAgICAgICAgcGVlckluZm8uZHVwbGljYXRlUGVlciA9IHRydWU7XG4gICAgICAgIHBlZXJJbmZvLm1pc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgcGVlckluZm8uYnkudW5zaGlmdChub3JtSW5mby5ieVswXSk7XG4gICAgICB9XG4gICAgICBpZiAoZHVwbGljYXRlRGVwc1RvQ2hlY2spIHtcbiAgICAgICAgbm9ybUluZm8gPSBkdXBsaWNhdGVEZXBzVG9DaGVjay5nZXQocGVlckRlcCk7XG4gICAgICAgIGlmIChub3JtSW5mbykge1xuICAgICAgICAgIHBlZXJJbmZvLmR1cGxpY2F0ZVBlZXIgPSB0cnVlO1xuICAgICAgICAgIHBlZXJJbmZvLm1pc3NpbmcgPSBmYWxzZTtcbiAgICAgICAgICBwZWVySW5mby5ieS51bnNoaWZ0KG5vcm1JbmZvLmJ5WzBdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1lcmdlIGRpcmVjdERlcHNMaXN0IChkaXJlY3QgZGVwZW5kZW5jaWVzIG9mIHdvcmtzcGFjZSkgaW50byBkZXBlbmRlbnRJbmZvICh0cmFuc2l2ZSBkZXBlbmRlbmNpZXMpXG4gICAgZm9yIChjb25zdCBbZGVwTmFtZSwgaXRlbV0gb2YgdGhpcy5kaXJlY3REZXBzTGlzdC50cmF2ZXJzZSgpKSB7XG4gICAgICBjb25zdCBpbmZvOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiB0cnVlLFxuICAgICAgICBkaXJlY3Q6IHRydWUsXG4gICAgICAgIG1pc3Npbmc6IGZhbHNlLFxuICAgICAgICBkdXBsaWNhdGVQZWVyOiBmYWxzZSxcbiAgICAgICAgYnk6IFt7dmVyOiBpdGVtLnZlciwgbmFtZTogaXRlbS5ieX1dXG4gICAgICB9O1xuICAgICAgZGVwZW5kZW50SW5mby5zZXQoZGVwTmFtZSwgaW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFtkZXBlbmRlbnRJbmZvLCBwZWVyRGVwZW5kZW50SW5mb107XG4gIH1cblxuICAvKipcbiAgICogLSBJZiB0aGVyZSBpcyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHdvcmtzcGFjZSwgbW92ZSBpdHMgdmVyc2lvbiB0byB0aGUgdG9wIG9mIHRoZSB2ZXJzaW9uIGxpc3QsXG4gICAqIC0gSWYgaXQgaXMgcGVlciBkZXBlbmRlbmN5IGFuZCBpdCBpcyBub3QgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiB3b3Jrc3BhY2UsXG4gICAqIG1hcmsgaXQgXCJtaXNzaW5nXCIgc28gdGhhdCByZW1pbmRzIHVzZXIgdG8gbWFudWFsIGluc3RhbGwgaXQuXG4gICAqIEBwYXJhbSB0cmFja2VkUmF3IFxuICAgKiBAcGFyYW0gaXNQZWVyRGVwcyBcbiAgICovXG4gIHByb3RlY3RlZCBjb2xsZWN0RGVwZW5kZW5jeUluZm8odHJhY2tlZFJhdzogTWFwPHN0cmluZywgRGVwSW5mb1tdPiwgaXNQZWVyRGVwcyA9IGZhbHNlKSB7XG4gICAgY29uc3QgZGVwZW5kZW50SW5mb3M6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+ID0gbmV3IE1hcCgpO1xuXG4gICAgZm9yIChjb25zdCBbZGVwTmFtZSwgdmVyc2lvbkxpc3RdIG9mIHRyYWNrZWRSYXcuZW50cmllcygpKSB7XG4gICAgICAvLyBJZiB0aGVyZSBpcyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHdvcmtzcGFjZSwgbW92ZSBpdHMgdmVyc2lvbiB0byB0aGUgdG9wIG9mIHRoZSB2ZXJzaW9uIGxpc3RcbiAgICAgIGNvbnN0IGRpcmVjdFZlciA9IHRoaXMuZGlyZWN0RGVwcy5nZXQoZGVwTmFtZSk7XG4gICAgICBjb25zdCB2ZXJzaW9ucyA9IHNvcnRCeVZlcnNpb24odmVyc2lvbkxpc3QsIGRlcE5hbWUpO1xuICAgICAgaWYgKGRpcmVjdFZlcikge1xuICAgICAgICB2ZXJzaW9ucy51bnNoaWZ0KGRpcmVjdFZlci52YWx1ZVsxXSk7XG4gICAgICAgIGlmICghaXNQZWVyRGVwcykge1xuICAgICAgICAgIHRoaXMuZGlyZWN0RGVwc0xpc3QucmVtb3ZlTm9kZShkaXJlY3RWZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBoYXNEaWZmVmVyc2lvbiA9IF9jb250YWluc0RpZmZWZXJzaW9uKHZlcnNpb25MaXN0KTtcblxuICAgICAgY29uc3QgaW5mbzogRGVwZW5kZW50SW5mbyA9IHtcbiAgICAgICAgc2FtZVZlcjogIWhhc0RpZmZWZXJzaW9uLFxuICAgICAgICBkaXJlY3Q6IGRpcmVjdFZlciAhPSBudWxsLFxuICAgICAgICAvLyBJZiBpdCBpcyBwZWVyIGRlcGVuZGVuY3kgYW5kIGl0IGlzIG5vdCBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHdvcmtzcGFjZSxcbiAgICAgICAgLy8gdGhlbiBtYXJrIGl0IFwibWlzc2luZ1wiIHNvIHRoYXQgcmVtaW5kcyB1c2VyIHRvIG1hbnVhbCBpbnN0YWxsIGl0LlxuICAgICAgICBtaXNzaW5nOiBpc1BlZXJEZXBzICYmIGRpcmVjdFZlciA9PSBudWxsLFxuICAgICAgICBkdXBsaWNhdGVQZWVyOiBmYWxzZSxcbiAgICAgICAgYnk6IHZlcnNpb25zLm1hcChpdGVtID0+ICh7dmVyOiBpdGVtLnZlciwgbmFtZTogaXRlbS5ieX0pKVxuICAgICAgfTtcbiAgICAgIGRlcGVuZGVudEluZm9zLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVwZW5kZW50SW5mb3M7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kodGhpcy5zcmNEZXBzLCBuYW1lLCB2ZXJzaW9uLCBieVdob20pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja0RldkRlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgdGhpcy5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuZGV2RGVwcywgbmFtZSwgdmVyc2lvbiwgYnlXaG9tKTtcbiAgfVxuXG4gIHByaXZhdGUgX3RyYWNrRGVwZW5kZW5jeShkZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+LCBuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5leGNsdWRlTGlua2VkRGVwcy5oYXMobmFtZSkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCFkZXBzLmhhcyhuYW1lKSkge1xuICAgICAgZGVwcy5zZXQobmFtZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIGRlcHMuZ2V0KG5hbWUpIS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tQZWVyRGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5leGNsdWRlTGlua2VkRGVwcy5oYXMobmFtZSkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCF0aGlzLnBlZXJEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5wZWVyRGVwcy5zZXQobmFtZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRoaXMucGVlckRlcHMuZ2V0KG5hbWUpIS5wdXNoKHtcbiAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgIHByZTogbSA/IG1bMV0gOiAnJyxcbiAgICAgIGJ5OiBieVdob21cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY29udGFpbnNEaWZmVmVyc2lvbihzb3J0ZWRWZXJzaW9uczogRGVwSW5mb1tdKSB7XG4gIGlmIChzb3J0ZWRWZXJzaW9ucy5sZW5ndGggPD0gMSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gc29ydGVkVmVyc2lvbnMubGVuZ3RoIC0gMTsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGEgPSBzb3J0ZWRWZXJzaW9uc1tpXS52ZXI7XG4gICAgY29uc3QgYiA9IHNvcnRlZFZlcnNpb25zW2kgKyAxXS52ZXI7XG5cbiAgICBpZiAoYiA9PT0gJyonIHx8IGIgPT09ICcnKVxuICAgICAgY29udGludWU7XG4gICAgaWYgKGEgIT09IGIpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4vKipcbiAqIFNvcnQgYnkgZGVzY2VuZGluZ1xuICogQHBhcmFtIHZlckluZm9MaXN0IHt2ZXI6IHN0cmluZywgYnk6IHN0cmluZywgbmFtZTogc3RyaW5nfVxuICovXG5mdW5jdGlvbiBzb3J0QnlWZXJzaW9uKHZlckluZm9MaXN0OiBEZXBJbmZvW10sIG5hbWU6IHN0cmluZykge1xuICBpZiAodmVySW5mb0xpc3QgPT0gbnVsbCB8fCB2ZXJJbmZvTGlzdC5sZW5ndGggPT09IDEpXG4gICAgcmV0dXJuIHZlckluZm9MaXN0O1xuICB0cnkge1xuICAgIHZlckluZm9MaXN0LnNvcnQoKGluZm8xLCBpbmZvMikgPT4ge1xuICAgICAgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSAhPSBudWxsKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzID0gc2VtdmVyLnJjb21wYXJlKGluZm8xLnZlck51bSwgaW5mbzIudmVyTnVtKTtcbiAgICAgICAgICBpZiAocmVzID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGluZm8xLnByZSA9PT0gJycgJiYgaW5mbzIucHJlICE9PSAnJyA/IC0xIDpcbiAgICAgICAgICAgICAgKGluZm8xLnByZSAhPT0gJycgJiYgaW5mbzIucHJlID09PSAnJyA/IDEgOiAwKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLndhcm4oaW5mbzEsIGluZm8yKTtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgZWxzZSBpZiAoaW5mbzIudmVyTnVtICE9IG51bGwgJiYgaW5mbzEudmVyTnVtID09IG51bGwpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgZWxzZSBpZiAoaW5mbzEudmVyID4gaW5mbzIudmVyKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPCBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcihgSW52YWxpZCBzZW12ZXIgZm9ybWF0IGZvciAke25hbWUgfHwgJyd9OiBgICsgSlNPTi5zdHJpbmdpZnkodmVySW5mb0xpc3QsIG51bGwsICcgICcpKTtcbiAgICB0aHJvdyBlO1xuICB9XG4gIHJldHVybiB2ZXJJbmZvTGlzdDtcbn1cblxuXG4iXX0=