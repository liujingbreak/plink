"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const log4js_1 = require("log4js");
const semver_1 = __importDefault(require("semver"));
const misc_1 = require("./utils/misc");
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
    // let hoistedDev: Map<string, DependentInfo>;
    // let hoistedDevPeers: Map<string, DependentInfo>;
    scanner = new TransitiveDepScanner(allDeps, workspace, pkJsonFiles);
    scanner.initExistingDeps(devDeps);
    if (workspaceDevDeps)
        scanner.scanFor(jsons.filter(item => _.has(workspaceDevDeps, item.name)), true);
    const [hoistedDev, hoistedDevPeers] = scanner.hoistDeps(HoistedDepInfo);
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
            const currNode = this.directDepsList.push([
                name, {
                    ver: version === '*' ? '' : version,
                    verNum: m ? m[2] : undefined,
                    pre: m ? m[1] : '',
                    by: `(${workspaceName || '<root directory>'})`
                }
            ]);
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
                        return info1.pre === '' && info2.pre !== ''
                            ? -1 :
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0IsdUNBQXVDO0FBQ3ZDLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsb0RBQTRCO0FBQzVCLHVDQUFvRTtBQUVwRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsOEJBQThCLENBQUMsQ0FBQztBQVN0RDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FDaEMsV0FBbUQsRUFDbkQsU0FBaUIsRUFDakIsYUFBdUMsRUFDdkMsZ0JBQTJDO0lBRTNDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sT0FBTyxtQ0FBTyxhQUFhLEdBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEYsSUFBSSxPQUFPLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3hFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsTUFBTSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqRSxNQUFNLE9BQU8sR0FBRyxPQUFP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Q0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7d0JBRWpELE9BQU8sR0FBRyxDQUFDO2lCQUNkO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUN2QixPQUFPLENBQUMsQ0FBQztpQkFDVjthQUNGO2lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJO2dCQUNyRCxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNQLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJO2dCQUNuRCxPQUFPLENBQUMsQ0FBQztpQkFDTixJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUc7Z0JBQzVCLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ1AsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHO2dCQUM1QixPQUFPLENBQUMsQ0FBQzs7Z0JBRVQsT0FBTyxDQUFDLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztLQUNKO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixJQUFJLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLENBQUM7S0FDVDtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlbiAqL1xuLy8gaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7U2ltcGxlTGlua2VkTGlzdCwgU2ltcGxlTGlua2VkTGlzdE5vZGV9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5cbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsudHJhbnNpdGl2ZS1kZXAtaG9pc3RlcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uSW50ZXJmIHtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldkRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIHBlZXJEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBkZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlcyBqc29uIG1hcCBvZiBsaW5rZWQgcGFja2FnZVxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VEZXBzIFxuICogQHBhcmFtIHdvcmtzcGFjZURldkRlcHMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaXN0Q29tcERlcGVuZGVuY3koXG4gIHBrSnNvbkZpbGVzOiBNYXA8c3RyaW5nLCB7anNvbjogUGFja2FnZUpzb25JbnRlcmZ9PixcbiAgd29ya3NwYWNlOiBzdHJpbmcsXG4gIHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSxcbiAgd29ya3NwYWNlRGV2RGVwcz86IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVxuKSB7XG4gIGNvbnN0IGpzb25zID0gQXJyYXkuZnJvbShwa0pzb25GaWxlcy52YWx1ZXMoKSkubWFwKGl0ZW0gPT4gaXRlbS5qc29uKTtcbiAgY29uc3QgYWxsRGVwcyA9IHsuLi53b3Jrc3BhY2VEZXBzLCAuLi4od29ya3NwYWNlRGV2RGVwcyA/IHdvcmtzcGFjZURldkRlcHMgOiB7fSl9O1xuICBsZXQgc2Nhbm5lciA9IG5ldyBUcmFuc2l0aXZlRGVwU2Nhbm5lcihhbGxEZXBzLCB3b3Jrc3BhY2UsIHBrSnNvbkZpbGVzKTtcbiAgc2Nhbm5lci5zY2FuRm9yKGpzb25zLmZpbHRlcihpdGVtID0+IF8uaGFzKHdvcmtzcGFjZURlcHMsIGl0ZW0ubmFtZSkpKTtcbiAgY29uc3QgW0hvaXN0ZWREZXBJbmZvLCBIb2lzdGVkUGVlckRlcEluZm9dID0gc2Nhbm5lci5ob2lzdERlcHMoKTtcbiAgY29uc3QgZGV2RGVwcyA9IHNjYW5uZXIuZGV2RGVwcztcbiAgLy8gbGV0IGhvaXN0ZWREZXY6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICAvLyBsZXQgaG9pc3RlZERldlBlZXJzOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBzY2FubmVyID0gbmV3IFRyYW5zaXRpdmVEZXBTY2FubmVyKGFsbERlcHMsIHdvcmtzcGFjZSwgcGtKc29uRmlsZXMpO1xuICBzY2FubmVyLmluaXRFeGlzdGluZ0RlcHMoZGV2RGVwcyk7XG4gIGlmICh3b3Jrc3BhY2VEZXZEZXBzKVxuICAgIHNjYW5uZXIuc2NhbkZvcihqc29ucy5maWx0ZXIoaXRlbSA9PiBfLmhhcyh3b3Jrc3BhY2VEZXZEZXBzLCBpdGVtLm5hbWUpKSwgdHJ1ZSk7XG4gIGNvbnN0IFtob2lzdGVkRGV2LCBob2lzdGVkRGV2UGVlcnNdID0gc2Nhbm5lci5ob2lzdERlcHMoSG9pc3RlZERlcEluZm8pO1xuICAvLyBUT0RPOiBkZXZEZXBlbmRlbmNpZXMgbWlnaHQgY29udGFpbnMgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5IHdoaWNoIGR1cGxpY2F0ZXMgdG8gXCJkZXBlbmRlbmNpZXNcIlxuICByZXR1cm4ge1xuICAgIGhvaXN0ZWQ6IEhvaXN0ZWREZXBJbmZvLFxuICAgIGhvaXN0ZWRQZWVyczogSG9pc3RlZFBlZXJEZXBJbmZvLFxuICAgIGhvaXN0ZWREZXYsXG4gICAgaG9pc3RlZERldlBlZXJzXG4gIH07XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW50SW5mbyB7XG4gIC8qKiBJcyBhbGwgZGVwZW5kZW50cyBvbiBzYW1lIHZlcnNpb24gKi9cbiAgc2FtZVZlcjogYm9vbGVhbjtcbiAgLyoqIElzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygc3BhY2UgcGFja2FnZS5qc29uICovXG4gIGRpcmVjdDogYm9vbGVhbjtcbiAgLyoqIEluIGNhc2UgYSB0cmFuc2l0aXZlIHBlZXIgZGVwZW5kZW5jeSwgaXQgc2hvdWxkIG5vdFxuICAgKiBiZSBpbnN0YWxsZWQgYXV0b21hdGljYWxseSwgdW5sZXNzIGl0IGlzIGFsc28gYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiBjdXJyZW50IHNwYWNlLFxuICAgKiBzZXR0aW5nIHRvIGB0cnVlYCB0byByZW1pbmQgdXNlciB0byBpbnN0YWxsIG1hbnVhbGx5IFxuICAgKi9cbiAgbWlzc2luZzogYm9vbGVhbjtcbiAgLyoqIFNhbWUgdHJhc2l0aXZlIGRlcGVuZGVuY3kgaW4gYm90aCBub3JtYWwgYW5kIHBlZXIgZGVwZW5kZW5jaWVzIGxpc3RcbiAgICogYWN0dWFsIHZlcnNpb24gc2hvdWxkIGJlIHRoZSBvbmUgc2VsZWN0ZWQgZnJvbSBub3JtYWwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5XG4gICAqL1xuICBkdXBsaWNhdGVQZWVyOiBib29sZWFuO1xuICBieTogQXJyYXk8e1xuICAgIC8qKiBkZXBlbmRlbmN5IHZlcnNpb24gKG5vdCBkZXBlbmRlbnQncykgKi9cbiAgICB2ZXI6IHN0cmluZztcbiAgICAvKiogZGVwZW5kZW50IG5hbWUgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG4gIH0+O1xufVxuXG5cblxuY29uc3QgdmVyc2lvblJlZyA9IC9eKFxcRCopKFxcZC4qPykoPzpcXC50Z3opPyQvO1xuXG5leHBvcnQgY2xhc3MgVHJhbnNpdGl2ZURlcFNjYW5uZXIge1xuICB2ZXJib3NNZXNzYWdlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRldkRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIC8qKiBrZXkgaXMgZGVwZW5kZW5jeSBtb2R1bGUgbmFtZSAqL1xuICBwcml2YXRlIGRpcmVjdERlcHM6IE1hcDxzdHJpbmcsIFNpbXBsZUxpbmtlZExpc3ROb2RlPFtzdHJpbmcsIERlcEluZm9dPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgc3JjRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcblxuICBwcml2YXRlIHBlZXJEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGRpcmVjdERlcHNMaXN0OiBTaW1wbGVMaW5rZWRMaXN0PFtzdHJpbmcsIERlcEluZm9dPiA9IG5ldyBTaW1wbGVMaW5rZWRMaXN0PFtzdHJpbmcsIERlcEluZm9dPigpO1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHdvcmtzcGFjZURlcHMgc2hvdWxkIGluY2x1ZGUgXCJkZXBlbmRlbmNpZXNcIiBhbmQgXCJkZXZEZXBlbmRlbmNpZXNcIlxuICAgKiBAcGFyYW0gd29ya3NwYWNlTmFtZSBcbiAgICogQHBhcmFtIGV4Y2x1ZGVMaW5rZWREZXBzIFxuICAgKi9cbiAgY29uc3RydWN0b3Iod29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LCB3b3Jrc3BhY2VOYW1lOiBzdHJpbmcsIHByaXZhdGUgZXhjbHVkZUxpbmtlZERlcHM6IE1hcDxzdHJpbmcsIGFueT4gfCBTZXQ8c3RyaW5nPikge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHdvcmtzcGFjZURlcHMpKSB7XG4gICAgICBpZiAodGhpcy5leGNsdWRlTGlua2VkRGVwcy5oYXMobmFtZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICAgIGNvbnN0IGN1cnJOb2RlID0gdGhpcy5kaXJlY3REZXBzTGlzdC5wdXNoKFtcbiAgICAgICAgbmFtZSwge1xuICAgICAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgICAgIGJ5OiBgKCR7d29ya3NwYWNlTmFtZSB8fCAnPHJvb3QgZGlyZWN0b3J5Pid9KWBcbiAgICAgICAgfVxuICAgICAgXSk7XG4gICAgICB0aGlzLmRpcmVjdERlcHMuc2V0KG5hbWUsIGN1cnJOb2RlKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IEl0ZXJhYmxlPFBhY2thZ2VKc29uSW50ZXJmPiwgY29tYmluZURldkRlcHMgPSBmYWxzZSkge1xuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICBsZXQgZGVwcyA9IGpzb24uZGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKGRlcHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgICAgICAgdGhpcy5fdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRlcHMgPSBqc29uLmRldkRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIGlmIChjb21iaW5lRGV2RGVwcylcbiAgICAgICAgICAgIHRoaXMuX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuX3RyYWNrRGV2RGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICB0aGlzLl90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RXhpc3RpbmdEZXBzKGRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4pIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIGluZm9dIG9mIGRlcHMpIHtcbiAgICAgIHRoaXMuc3JjRGVwcy5zZXQoa2V5LCBpbmZvKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIGJhc2UgYWxnb3JpdGhtOiBcIm5ldyBkZXBlbmRlbmNpZXNcIiA9IFwiZGlyZWN0IGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2VcIiArIFwidHJhbnNpdmUgZGVwZW5kZW5jaWVzXCJcbiAgICogQHBhcmFtIGR1cGxpY2F0ZURlcHNUb0NoZWNrIGV4dHJhIGRlcGVuZGVudCBpbmZvcm1hdGlvbiB0byBjaGVjayBpZiB0aGV5IGFyZSBkdXBsaWNhdGUuXG4gICAqL1xuICBob2lzdERlcHMoZHVwbGljYXRlRGVwc1RvQ2hlY2s/OiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPikge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm8gPSB0aGlzLmNvbGxlY3REZXBlbmRlbmN5SW5mbyh0aGlzLnNyY0RlcHMpO1xuICAgIGNvbnN0IHBlZXJEZXBlbmRlbnRJbmZvID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5wZWVyRGVwcywgdHJ1ZSk7XG4gICAgLy8gSW4gY2FzZSBwZWVyIGRlcGVuZGVuY3kgZHVwbGljYXRlcyB0byBleGlzdGluZyB0cmFuc2l0aXZlIGRlcGVuZGVuY3ksIHNldCBcIm1pc3NpbmdcIiB0byBgZmFsc2VgXG5cbiAgICBmb3IgKGNvbnN0IFtwZWVyRGVwLCBwZWVySW5mb10gb2YgcGVlckRlcGVuZGVudEluZm8uZW50cmllcygpKSB7XG4gICAgICBpZiAoIXBlZXJJbmZvLm1pc3NpbmcpXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBsZXQgbm9ybUluZm8gPSBkZXBlbmRlbnRJbmZvLmdldChwZWVyRGVwKTtcbiAgICAgIGlmIChub3JtSW5mbykge1xuICAgICAgICBwZWVySW5mby5kdXBsaWNhdGVQZWVyID0gdHJ1ZTtcbiAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICBwZWVySW5mby5ieS51bnNoaWZ0KG5vcm1JbmZvLmJ5WzBdKTtcbiAgICAgIH1cbiAgICAgIGlmIChkdXBsaWNhdGVEZXBzVG9DaGVjaykge1xuICAgICAgICBub3JtSW5mbyA9IGR1cGxpY2F0ZURlcHNUb0NoZWNrLmdldChwZWVyRGVwKTtcbiAgICAgICAgaWYgKG5vcm1JbmZvKSB7XG4gICAgICAgICAgcGVlckluZm8uZHVwbGljYXRlUGVlciA9IHRydWU7XG4gICAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICAgIHBlZXJJbmZvLmJ5LnVuc2hpZnQobm9ybUluZm8uYnlbMF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgZGlyZWN0RGVwc0xpc3QgKGRpcmVjdCBkZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlKSBpbnRvIGRlcGVuZGVudEluZm8gKHRyYW5zaXZlIGRlcGVuZGVuY2llcylcbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCBpdGVtXSBvZiB0aGlzLmRpcmVjdERlcHNMaXN0LnRyYXZlcnNlKCkpIHtcbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6IHRydWUsXG4gICAgICAgIGRpcmVjdDogdHJ1ZSxcbiAgICAgICAgbWlzc2luZzogZmFsc2UsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogW3t2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fV1cbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2RlcGVuZGVudEluZm8sIHBlZXJEZXBlbmRlbnRJbmZvXTtcbiAgfVxuXG4gIC8qKlxuICAgKiAtIElmIHRoZXJlIGlzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLCBtb3ZlIGl0cyB2ZXJzaW9uIHRvIHRoZSB0b3Agb2YgdGhlIHZlcnNpb24gbGlzdCxcbiAgICogLSBJZiBpdCBpcyBwZWVyIGRlcGVuZGVuY3kgYW5kIGl0IGlzIG5vdCBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHdvcmtzcGFjZSxcbiAgICogbWFyayBpdCBcIm1pc3NpbmdcIiBzbyB0aGF0IHJlbWluZHMgdXNlciB0byBtYW51YWwgaW5zdGFsbCBpdC5cbiAgICogQHBhcmFtIHRyYWNrZWRSYXcgXG4gICAqIEBwYXJhbSBpc1BlZXJEZXBzIFxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbGxlY3REZXBlbmRlbmN5SW5mbyh0cmFja2VkUmF3OiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+LCBpc1BlZXJEZXBzID0gZmFsc2UpIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvczogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4gPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCB2ZXJzaW9uTGlzdF0gb2YgdHJhY2tlZFJhdy5lbnRyaWVzKCkpIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLCBtb3ZlIGl0cyB2ZXJzaW9uIHRvIHRoZSB0b3Agb2YgdGhlIHZlcnNpb24gbGlzdFxuICAgICAgY29uc3QgZGlyZWN0VmVyID0gdGhpcy5kaXJlY3REZXBzLmdldChkZXBOYW1lKTtcbiAgICAgIGNvbnN0IHZlcnNpb25zID0gc29ydEJ5VmVyc2lvbih2ZXJzaW9uTGlzdCwgZGVwTmFtZSk7XG4gICAgICBpZiAoZGlyZWN0VmVyKSB7XG4gICAgICAgIHZlcnNpb25zLnVuc2hpZnQoZGlyZWN0VmVyLnZhbHVlWzFdKTtcbiAgICAgICAgaWYgKCFpc1BlZXJEZXBzKSB7XG4gICAgICAgICAgdGhpcy5kaXJlY3REZXBzTGlzdC5yZW1vdmVOb2RlKGRpcmVjdFZlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuXG4gICAgICBjb25zdCBpbmZvOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiAhaGFzRGlmZlZlcnNpb24sXG4gICAgICAgIGRpcmVjdDogZGlyZWN0VmVyICE9IG51bGwsXG4gICAgICAgIC8vIElmIGl0IGlzIHBlZXIgZGVwZW5kZW5jeSBhbmQgaXQgaXMgbm90IGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLFxuICAgICAgICAvLyB0aGVuIG1hcmsgaXQgXCJtaXNzaW5nXCIgc28gdGhhdCByZW1pbmRzIHVzZXIgdG8gbWFudWFsIGluc3RhbGwgaXQuXG4gICAgICAgIG1pc3Npbmc6IGlzUGVlckRlcHMgJiYgZGlyZWN0VmVyID09IG51bGwsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogdmVyc2lvbnMubWFwKGl0ZW0gPT4gKHt2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fSkpXG4gICAgICB9O1xuICAgICAgZGVwZW5kZW50SW5mb3Muc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkZXBlbmRlbnRJbmZvcztcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGJ5V2hvbSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrRGV2RGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kodGhpcy5kZXZEZXBzLCBuYW1lLCB2ZXJzaW9uLCBieVdob20pO1xuICB9XG5cbiAgcHJpdmF0ZSBfdHJhY2tEZXBlbmRlbmN5KGRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4sIG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIWRlcHMuaGFzKG5hbWUpKSB7XG4gICAgICBkZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgZGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMucGVlckRlcHMuaGFzKG5hbWUpKSB7XG4gICAgICB0aGlzLnBlZXJEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5wZWVyRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcbiAgaWYgKHNvcnRlZFZlcnNpb25zLmxlbmd0aCA8PSAxKVxuICAgIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgYSA9IHNvcnRlZFZlcnNpb25zW2ldLnZlcjtcbiAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgIGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAoYSAhPT0gYilcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbi8qKlxuICogU29ydCBieSBkZXNjZW5kaW5nXG4gKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHNvcnRCeVZlcnNpb24odmVySW5mb0xpc3Q6IERlcEluZm9bXSwgbmFtZTogc3RyaW5nKSB7XG4gIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICByZXR1cm4gdmVySW5mb0xpc3Q7XG4gIHRyeSB7XG4gICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtICE9IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgIGlmIChyZXMgPT09IDApXG4gICAgICAgICAgICByZXR1cm4gaW5mbzEucHJlID09PSAnJyAmJiBpbmZvMi5wcmUgIT09ICcnXG4gICAgICAgICAgICAgID8gLTEgOlxuICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cud2FybihpbmZvMSwgaW5mbzIpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMi52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMS52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgIHRocm93IGU7XG4gIH1cbiAgcmV0dXJuIHZlckluZm9MaXN0O1xufVxuXG5cbiJdfQ==