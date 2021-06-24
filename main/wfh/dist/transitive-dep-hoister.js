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
const log = log4js_1.getLogger('plink.transitive-dep-hoister');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3Qix1Q0FBdUM7QUFDdkMsMENBQTRCO0FBQzVCLHVDQUFvRTtBQUNwRSxtQ0FBaUM7QUFDakMsb0RBQTRCO0FBRTVCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQVN0RDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FDaEMsV0FBbUQsRUFDbkQsU0FBaUIsRUFDakIsYUFBdUMsRUFDdkMsZ0JBQTJDO0lBRTNDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sT0FBTyxtQ0FBTyxhQUFhLEdBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEYsSUFBSSxPQUFPLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3hFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsTUFBTSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqRSxJQUFJLFVBQXNDLENBQUM7SUFDM0MsSUFBSSxl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QyxPQUFPLENBQUMsRUFBRTtRQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLElBQUksSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRyxNQUFNLENBQUMsQ0FBQztLQUNUO0lBQ0QsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlICBtYXgtbGVuICovXG4vLyBpbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7U2ltcGxlTGlua2VkTGlzdCwgU2ltcGxlTGlua2VkTGlzdE5vZGV9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzZW12ZXIgZnJvbSAnc2VtdmVyJztcblxuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay50cmFuc2l0aXZlLWRlcC1ob2lzdGVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25JbnRlcmYge1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgcGVlckRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIGRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG59XG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGVzIGpzb24gbWFwIG9mIGxpbmtlZCBwYWNrYWdlXG4gKiBAcGFyYW0gd29ya3NwYWNlIFxuICogQHBhcmFtIHdvcmtzcGFjZURlcHMgXG4gKiBAcGFyYW0gd29ya3NwYWNlRGV2RGVwcyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpc3RDb21wRGVwZW5kZW5jeShcbiAgcGtKc29uRmlsZXM6IE1hcDxzdHJpbmcsIHtqc29uOiBQYWNrYWdlSnNvbkludGVyZn0+LFxuICB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgd29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LFxuICB3b3Jrc3BhY2VEZXZEZXBzPzoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9XG4pIHtcbiAgY29uc3QganNvbnMgPSBBcnJheS5mcm9tKHBrSnNvbkZpbGVzLnZhbHVlcygpKS5tYXAoaXRlbSA9PiBpdGVtLmpzb24pO1xuICBjb25zdCBhbGxEZXBzID0gey4uLndvcmtzcGFjZURlcHMsIC4uLih3b3Jrc3BhY2VEZXZEZXBzID8gd29ya3NwYWNlRGV2RGVwcyA6IHt9KX07XG4gIGxldCBzY2FubmVyID0gbmV3IFRyYW5zaXRpdmVEZXBTY2FubmVyKGFsbERlcHMsIHdvcmtzcGFjZSwgcGtKc29uRmlsZXMpO1xuICBzY2FubmVyLnNjYW5Gb3IoanNvbnMuZmlsdGVyKGl0ZW0gPT4gXy5oYXMod29ya3NwYWNlRGVwcywgaXRlbS5uYW1lKSkpO1xuICBjb25zdCBbSG9pc3RlZERlcEluZm8sIEhvaXN0ZWRQZWVyRGVwSW5mb10gPSBzY2FubmVyLmhvaXN0RGVwcygpO1xuICBsZXQgaG9pc3RlZERldjogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGxldCBob2lzdGVkRGV2UGVlcnM6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBpZiAod29ya3NwYWNlRGV2RGVwcykge1xuICAgIHNjYW5uZXIgPSBuZXcgVHJhbnNpdGl2ZURlcFNjYW5uZXIoYWxsRGVwcywgd29ya3NwYWNlLCBwa0pzb25GaWxlcyk7XG4gICAgc2Nhbm5lci5zY2FuRm9yKGpzb25zLmZpbHRlcihpdGVtID0+IF8uaGFzKHdvcmtzcGFjZURldkRlcHMsIGl0ZW0ubmFtZSkpKTtcbiAgICBbaG9pc3RlZERldiwgaG9pc3RlZERldlBlZXJzXSA9IHNjYW5uZXIuaG9pc3REZXBzKEhvaXN0ZWREZXBJbmZvKTtcbiAgfSBlbHNlIHtcbiAgICBob2lzdGVkRGV2ID0gbmV3IE1hcCgpO1xuICAgIGhvaXN0ZWREZXZQZWVycyA9IG5ldyBNYXAoKTtcbiAgfVxuICAvLyBUT0RPOiBkZXZEZXBlbmRlbmNpZXMgbWlnaHQgY29udGFpbnMgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5IHdoaWNoIGR1cGxpY2F0ZXMgdG8gXCJkZXBlbmRlbmNpZXNcIlxuICByZXR1cm4ge1xuICAgIGhvaXN0ZWQ6IEhvaXN0ZWREZXBJbmZvLFxuICAgIGhvaXN0ZWRQZWVyczogSG9pc3RlZFBlZXJEZXBJbmZvLFxuICAgIGhvaXN0ZWREZXYsXG4gICAgaG9pc3RlZERldlBlZXJzXG4gIH07XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW50SW5mbyB7XG4gIC8qKiBJcyBhbGwgZGVwZW5kZW50cyBvbiBzYW1lIHZlcnNpb24gKi9cbiAgc2FtZVZlcjogYm9vbGVhbjtcbiAgLyoqIElzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygc3BhY2UgcGFja2FnZS5qc29uICovXG4gIGRpcmVjdDogYm9vbGVhbjtcbiAgLyoqIEluIGNhc2UgYSB0cmFuc2l0aXZlIHBlZXIgZGVwZW5kZW5jeSwgaXQgc2hvdWxkIG5vdFxuICAgKiBiZSBpbnN0YWxsZWQgYXV0b21hdGljYWxseSwgdW5sZXNzIGl0IGlzIGFsc28gYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiBjdXJyZW50IHNwYWNlLFxuICAgKiBzZXR0aW5nIHRvIGB0cnVlYCB0byByZW1pbmQgdXNlciB0byBpbnN0YWxsIG1hbnVhbGx5IFxuICAgKi9cbiAgbWlzc2luZzogYm9vbGVhbjtcbiAgLyoqIFNhbWUgdHJhc2l0aXZlIGRlcGVuZGVuY3kgaW4gYm90aCBub3JtYWwgYW5kIHBlZXIgZGVwZW5kZW5jaWVzIGxpc3RcbiAgICogYWN0dWFsIHZlcnNpb24gc2hvdWxkIGJlIHRoZSBvbmUgc2VsZWN0ZWQgZnJvbSBub3JtYWwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5XG4gICAqL1xuICBkdXBsaWNhdGVQZWVyOiBib29sZWFuO1xuICBieTogQXJyYXk8e1xuICAgIC8qKiBkZXBlbmRlbmN5IHZlcnNpb24gKG5vdCBkZXBlbmRlbnQncykgKi9cbiAgICB2ZXI6IHN0cmluZztcbiAgICAvKiogZGVwZW5kZW50IG5hbWUgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG4gIH0+O1xufVxuXG5cblxuY29uc3QgdmVyc2lvblJlZyA9IC9eKFxcRCopKFxcZC4qPykoPzpcXC50Z3opPyQvO1xuXG5leHBvcnQgY2xhc3MgVHJhbnNpdGl2ZURlcFNjYW5uZXIge1xuICB2ZXJib3NNZXNzYWdlOiBzdHJpbmc7XG4gIC8qKiBrZXkgaXMgZGVwZW5kZW5jeSBtb2R1bGUgbmFtZSAqL1xuICBwcml2YXRlIGRpcmVjdERlcHM6IE1hcDxzdHJpbmcsIFNpbXBsZUxpbmtlZExpc3ROb2RlPFtzdHJpbmcsIERlcEluZm9dPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgc3JjRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBwZWVyRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBkaXJlY3REZXBzTGlzdDogU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4gPSBuZXcgU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4oKTtcblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB3b3Jrc3BhY2VEZXBzIHNob3VsZCBpbmNsdWRlIFwiZGVwZW5kZW5jaWVzXCIgYW5kIFwiZGV2RGVwZW5kZW5jaWVzXCJcbiAgICogQHBhcmFtIHdvcmtzcGFjZU5hbWUgXG4gICAqIEBwYXJhbSBleGNsdWRlTGlua2VkRGVwcyBcbiAgICovXG4gIGNvbnN0cnVjdG9yKHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSwgd29ya3NwYWNlTmFtZTogc3RyaW5nLCBwcml2YXRlIGV4Y2x1ZGVMaW5rZWREZXBzOiBNYXA8c3RyaW5nLCBhbnk+IHwgU2V0PHN0cmluZz4pIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh3b3Jrc3BhY2VEZXBzKSkge1xuICAgICAgaWYgKHRoaXMuZXhjbHVkZUxpbmtlZERlcHMuaGFzKG5hbWUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgICBjb25zdCBjdXJyTm9kZSA9IHRoaXMuZGlyZWN0RGVwc0xpc3QucHVzaChbbmFtZSwge1xuICAgICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgICBieTogYCgke3dvcmtzcGFjZU5hbWUgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgXG4gICAgICB9XSk7XG4gICAgICB0aGlzLmRpcmVjdERlcHMuc2V0KG5hbWUsIGN1cnJOb2RlKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IEl0ZXJhYmxlPFBhY2thZ2VKc29uSW50ZXJmPikge1xuICAgIC8vIHRoaXMuc3JjRGVwcy5jbGVhcigpO1xuICAgIC8vIHRoaXMucGVlckRlcHMuY2xlYXIoKTtcblxuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICBjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuICAgICAgICAgIHRoaXMuX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgbG9nLndhcm4oYEEgbGlua2VkIHBhY2thZ2UgXCIke2pzb24ubmFtZX1cIiBjb250YWlucyBcImRldkRlcGVuZW5kaWVzXCIsIGlmIHRoZXkgYXJlIG5lY2Vzc2FyeSBmb3IgcnVubmluZyBpbiB3b3JrdHJlZSBzcGFjZSwgYCArXG4gICAgICAgICAgJ3lvdSBzaG91bGQgbW92ZSB0aGVtIHRvIFwiZGVwZW5kZW5jaWVzXCIgb3IgXCJwZWVyRGVwZW5kZW5jaWVzXCIgb2YgdGhhdCBwYWNrYWdlJyk7XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICB0aGlzLl90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBzY2FuU3JjRGVwcyhqc29uRmlsZXM6IHN0cmluZ1tdKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuc2NhbkZvcihqc29uRmlsZXMubWFwKHBhY2thZ2VKc29uID0+IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uLCAndXRmOCcpKSkpO1xuICAvLyB9XG5cbiAgLyoqXG4gICAqIFRoZSBiYXNlIGFsZ29yaXRobTogXCJuZXcgZGVwZW5kZW5jaWVzXCIgPSBcImRpcmVjdCBkZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlXCIgKyBcInRyYW5zaXZlIGRlcGVuZGVuY2llc1wiXG4gICAqIEBwYXJhbSBleHRyYURlcGVuZGVudEluZm8gZXh0cmEgZGVwZW5kZW50IGluZm9ybWF0aW9uIHRvIGNoZWNrIGlmIHRoZXkgYXJlIGR1cGxpY2F0ZS5cbiAgICovXG4gIGhvaXN0RGVwcyhleHRyYURlcGVuZGVudEluZm8/OiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPikge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm8gPSB0aGlzLmNvbGxlY3REZXBlbmRlbmN5SW5mbyh0aGlzLnNyY0RlcHMpO1xuICAgIGNvbnN0IHBlZXJEZXBlbmRlbnRJbmZvID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5wZWVyRGVwcywgdHJ1ZSk7XG4gICAgLy8gSW4gY2FzZSBwZWVyIGRlcGVuZGVuY3kgZHVwbGljYXRlcyB0byBleGlzdGluZyB0cmFuc2l0aXZlIGRlcGVuZGVuY3ksIHNldCBcIm1pc3NpbmdcIiB0byBgZmFsc2VgXG5cbiAgICBmb3IgKGNvbnN0IFtwZWVyRGVwLCBwZWVySW5mb10gb2YgcGVlckRlcGVuZGVudEluZm8uZW50cmllcygpKSB7XG4gICAgICBpZiAoIXBlZXJJbmZvLm1pc3NpbmcpXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBsZXQgbm9ybUluZm8gPSBkZXBlbmRlbnRJbmZvLmdldChwZWVyRGVwKTtcbiAgICAgIGlmIChub3JtSW5mbykge1xuICAgICAgICBwZWVySW5mby5kdXBsaWNhdGVQZWVyID0gdHJ1ZTtcbiAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICBwZWVySW5mby5ieS51bnNoaWZ0KG5vcm1JbmZvLmJ5WzBdKTtcbiAgICAgIH1cbiAgICAgIGlmIChleHRyYURlcGVuZGVudEluZm8pIHtcbiAgICAgICAgbm9ybUluZm8gPSBleHRyYURlcGVuZGVudEluZm8uZ2V0KHBlZXJEZXApO1xuICAgICAgICBpZiAobm9ybUluZm8pIHtcbiAgICAgICAgICBwZWVySW5mby5kdXBsaWNhdGVQZWVyID0gdHJ1ZTtcbiAgICAgICAgICBwZWVySW5mby5taXNzaW5nID0gZmFsc2U7XG4gICAgICAgICAgcGVlckluZm8uYnkudW5zaGlmdChub3JtSW5mby5ieVswXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtZXJnZSBkaXJlY3REZXBzTGlzdCAoZGlyZWN0IGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UpIGludG8gZGVwZW5kZW50SW5mbyAodHJhbnNpdmUgZGVwZW5kZW5jaWVzKVxuICAgIGZvciAoY29uc3QgW2RlcE5hbWUsIGl0ZW1dIG9mIHRoaXMuZGlyZWN0RGVwc0xpc3QudHJhdmVyc2UoKSkge1xuICAgICAgY29uc3QgaW5mbzogRGVwZW5kZW50SW5mbyA9IHtcbiAgICAgICAgc2FtZVZlcjogdHJ1ZSxcbiAgICAgICAgZGlyZWN0OiB0cnVlLFxuICAgICAgICBtaXNzaW5nOiBmYWxzZSxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiBbe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9XVxuICAgICAgfTtcbiAgICAgIGRlcGVuZGVudEluZm8uc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBbZGVwZW5kZW50SW5mbywgcGVlckRlcGVuZGVudEluZm9dO1xuICB9XG5cbiAgLyoqXG4gICAqIC0gSWYgdGhlcmUgaXMgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiB3b3Jrc3BhY2UsIG1vdmUgaXRzIHZlcnNpb24gdG8gdGhlIHRvcCBvZiB0aGUgdmVyc2lvbiBsaXN0LFxuICAgKiAtIElmIGl0IGlzIHBlZXIgZGVwZW5kZW5jeSBhbmQgaXQgaXMgbm90IGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLFxuICAgKiBtYXJrIGl0IFwibWlzc2luZ1wiIHNvIHRoYXQgcmVtaW5kcyB1c2VyIHRvIG1hbnVhbCBpbnN0YWxsIGl0LlxuICAgKiBAcGFyYW0gdHJhY2tlZFJhdyBcbiAgICogQHBhcmFtIGlzUGVlckRlcHMgXG4gICAqL1xuICBwcm90ZWN0ZWQgY29sbGVjdERlcGVuZGVuY3lJbmZvKHRyYWNrZWRSYXc6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4sIGlzUGVlckRlcHMgPSBmYWxzZSkge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm9zOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPiA9IG5ldyBNYXAoKTtcblxuICAgIGZvciAoY29uc3QgW2RlcE5hbWUsIHZlcnNpb25MaXN0XSBvZiB0cmFja2VkUmF3LmVudHJpZXMoKSkge1xuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiB3b3Jrc3BhY2UsIG1vdmUgaXRzIHZlcnNpb24gdG8gdGhlIHRvcCBvZiB0aGUgdmVyc2lvbiBsaXN0XG4gICAgICBjb25zdCBkaXJlY3RWZXIgPSB0aGlzLmRpcmVjdERlcHMuZ2V0KGRlcE5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbnMgPSBzb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBkZXBOYW1lKTtcbiAgICAgIGlmIChkaXJlY3RWZXIpIHtcbiAgICAgICAgdmVyc2lvbnMudW5zaGlmdChkaXJlY3RWZXIudmFsdWVbMV0pO1xuICAgICAgICBpZiAoIWlzUGVlckRlcHMpIHtcbiAgICAgICAgICB0aGlzLmRpcmVjdERlcHNMaXN0LnJlbW92ZU5vZGUoZGlyZWN0VmVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgaGFzRGlmZlZlcnNpb24gPSBfY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG5cbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6ICFoYXNEaWZmVmVyc2lvbixcbiAgICAgICAgZGlyZWN0OiBkaXJlY3RWZXIgIT0gbnVsbCxcbiAgICAgICAgLy8gSWYgaXQgaXMgcGVlciBkZXBlbmRlbmN5IGFuZCBpdCBpcyBub3QgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiB3b3Jrc3BhY2UsXG4gICAgICAgIC8vIHRoZW4gbWFyayBpdCBcIm1pc3NpbmdcIiBzbyB0aGF0IHJlbWluZHMgdXNlciB0byBtYW51YWwgaW5zdGFsbCBpdC5cbiAgICAgICAgbWlzc2luZzogaXNQZWVyRGVwcyAmJiBkaXJlY3RWZXIgPT0gbnVsbCxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiB2ZXJzaW9ucy5tYXAoaXRlbSA9PiAoe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9KSlcbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvcy5zZXQoZGVwTmFtZSwgaW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlcGVuZGVudEluZm9zO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1NyY0RlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZUxpbmtlZERlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghdGhpcy5zcmNEZXBzLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5zcmNEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5zcmNEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrUGVlckRlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZUxpbmtlZERlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghdGhpcy5wZWVyRGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMucGVlckRlcHMuc2V0KG5hbWUsIFtdKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICB0aGlzLnBlZXJEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICBpZiAoc29ydGVkVmVyc2lvbnMubGVuZ3RoIDw9IDEpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBhID0gc29ydGVkVmVyc2lvbnNbaV0udmVyO1xuICAgIGNvbnN0IGIgPSBzb3J0ZWRWZXJzaW9uc1tpICsgMV0udmVyO1xuXG4gICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgIGNvbnRpbnVlO1xuICAgIGlmIChhICE9PSBiKVxuICAgICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuLyoqXG4gKiBTb3J0IGJ5IGRlc2NlbmRpbmdcbiAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cbiAqL1xuZnVuY3Rpb24gc29ydEJ5VmVyc2lvbih2ZXJJbmZvTGlzdDogRGVwSW5mb1tdLCBuYW1lOiBzdHJpbmcpIHtcbiAgaWYgKHZlckluZm9MaXN0ID09IG51bGwgfHwgdmVySW5mb0xpc3QubGVuZ3RoID09PSAxKVxuICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgdHJ5IHtcbiAgICB2ZXJJbmZvTGlzdC5zb3J0KChpbmZvMSwgaW5mbzIpID0+IHtcbiAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBpbmZvMS5wcmUgPT09ICcnICYmIGluZm8yLnByZSAhPT0gJycgPyAtMSA6XG4gICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy53YXJuKGluZm8xLCBpbmZvMik7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtID09IG51bGwpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8yLnZlck51bSAhPSBudWxsICYmIGluZm8xLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgZWxzZSBpZiAoaW5mbzEudmVyIDwgaW5mbzIudmVyKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoYEludmFsaWQgc2VtdmVyIGZvcm1hdCBmb3IgJHtuYW1lIHx8ICcnfTogYCArIEpTT04uc3RyaW5naWZ5KHZlckluZm9MaXN0LCBudWxsLCAnICAnKSk7XG4gICAgdGhyb3cgZTtcbiAgfVxuICByZXR1cm4gdmVySW5mb0xpc3Q7XG59XG5cblxuIl19