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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3Qix1Q0FBdUM7QUFDdkMsMENBQTRCO0FBQzVCLHVDQUFvRTtBQUNwRSxtQ0FBaUM7QUFDakMsb0RBQTRCO0FBRTVCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQVN0RDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FDaEMsV0FBbUQsRUFDbkQsU0FBaUIsRUFDakIsYUFBdUMsRUFDdkMsZ0JBQTJDO0lBRTNDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sT0FBTyxtQ0FBTyxhQUFhLEdBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEYsSUFBSSxPQUFPLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3hFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsTUFBTSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqRSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ2hDLElBQUksVUFBc0MsQ0FBQztJQUMzQyxJQUFJLGVBQTJDLENBQUM7SUFDaEQsSUFBSSxnQkFBZ0IsRUFBRTtRQUNwQixPQUFPLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hGLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7S0FDbkU7U0FBTTtRQUNMLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQzdCO0lBQ0QsZ0dBQWdHO0lBQ2hHLE9BQU87UUFDTCxPQUFPLEVBQUUsY0FBYztRQUN2QixZQUFZLEVBQUUsa0JBQWtCO1FBQ2hDLFVBQVU7UUFDVixlQUFlO0tBQ2hCLENBQUM7QUFDSixDQUFDO0FBOUJELGdEQThCQztBQWlDRCxNQUFNLFVBQVUsR0FBRywwQkFBMEIsQ0FBQztBQUU5QyxNQUFhLG9CQUFvQjtJQVUvQjs7Ozs7T0FLRztJQUNILFlBQVksYUFBdUMsRUFBRSxhQUFxQixFQUFVLGlCQUFpRDtRQUFqRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQWdDO1FBZHJJLFlBQU8sR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM1QyxvQ0FBb0M7UUFDNUIsZUFBVSxHQUF5RCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzdFLFlBQU8sR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUU1QyxhQUFRLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDN0MsbUJBQWMsR0FBd0MsSUFBSSx1QkFBZ0IsRUFBcUIsQ0FBQztRQVN0RyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUMzRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNsQyxTQUFTO1lBQ1gsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRTtvQkFDL0MsR0FBRyxFQUFFLE9BQU8sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTztvQkFDbkMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO29CQUM1QixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ2xCLEVBQUUsRUFBRSxJQUFJLGFBQWEsSUFBSSxrQkFBa0IsR0FBRztpQkFDL0MsQ0FBQyxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDckM7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLE9BQW9DLEVBQUUsY0FBYyxHQUFHLEtBQUs7UUFDbEUsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUU7WUFDMUIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUM3QixJQUFJLElBQUksRUFBRTtnQkFDUixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNwRDthQUNGO1lBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDNUIsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzNCLElBQUksY0FBYzt3QkFDaEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzt3QkFFbkQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN0RDthQUNGO1lBQ0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ3pCLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtvQkFDckQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM1QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3JEO2FBQ0Y7U0FDRjtJQUNILENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUE0QjtRQUMzQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFO1lBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM3QjtJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLENBQUMsb0JBQWlEO1FBQ3pELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRSxpR0FBaUc7UUFFakcsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzdELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTztnQkFDbkIsU0FBUztZQUVYLElBQUksUUFBUSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUMsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osUUFBUSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7Z0JBQzlCLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUN6QixRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDckM7WUFDRCxJQUFJLG9CQUFvQixFQUFFO2dCQUN4QixRQUFRLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLFFBQVEsRUFBRTtvQkFDWixRQUFRLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztvQkFDOUIsUUFBUSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7b0JBQ3pCLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDckM7YUFDRjtTQUNGO1FBRUQscUdBQXFHO1FBQ3JHLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzVELE1BQU0sSUFBSSxHQUFrQjtnQkFDMUIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsYUFBYSxFQUFFLEtBQUs7Z0JBQ3BCLEVBQUUsRUFBRSxDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUMsQ0FBQzthQUNyQyxDQUFDO1lBQ0YsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDbEM7UUFFRCxPQUFPLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNPLHFCQUFxQixDQUFDLFVBQWtDLEVBQUUsVUFBVSxHQUFHLEtBQUs7UUFDcEYsTUFBTSxjQUFjLEdBQStCLElBQUksR0FBRyxFQUFFLENBQUM7UUFFN0QsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN6RCxnR0FBZ0c7WUFDaEcsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNyRCxJQUFJLFNBQVMsRUFBRTtnQkFDYixRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLFVBQVUsRUFBRTtvQkFDZixJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDM0M7YUFDRjtZQUNELE1BQU0sY0FBYyxHQUFHLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRXpELE1BQU0sSUFBSSxHQUFrQjtnQkFDMUIsT0FBTyxFQUFFLENBQUMsY0FBYztnQkFDeEIsTUFBTSxFQUFFLFNBQVMsSUFBSSxJQUFJO2dCQUN6QiwyRUFBMkU7Z0JBQzNFLG9FQUFvRTtnQkFDcEUsT0FBTyxFQUFFLFVBQVUsSUFBSSxTQUFTLElBQUksSUFBSTtnQkFDeEMsYUFBYSxFQUFFLEtBQUs7Z0JBQ3BCLEVBQUUsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQzthQUMzRCxDQUFDO1lBQ0YsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDbkM7UUFFRCxPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBRVMsbUJBQW1CLENBQUMsSUFBWSxFQUFFLE9BQWUsRUFBRSxNQUFjO1FBQ3pFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVTLG1CQUFtQixDQUFDLElBQVksRUFBRSxPQUFlLEVBQUUsTUFBYztRQUN6RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUE0QixFQUFFLElBQVksRUFBRSxPQUFlLEVBQUUsTUFBYztRQUNsRyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2xDLE9BQU87UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNwQjtRQUNELE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUM7WUFDbkIsR0FBRyxFQUFFLE9BQU8sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTztZQUNuQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDNUIsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2xCLEVBQUUsRUFBRSxNQUFNO1NBQ1gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVTLG9CQUFvQixDQUFDLElBQVksRUFBRSxPQUFlLEVBQUUsTUFBYztRQUMxRSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2xDLE9BQU87UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQzdCO1FBQ0QsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUM7WUFDNUIsR0FBRyxFQUFFLE9BQU8sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTztZQUNuQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDNUIsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2xCLEVBQUUsRUFBRSxNQUFNO1NBQ1gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdkxELG9EQXVMQztBQUVELFNBQVMsb0JBQW9CLENBQUMsY0FBeUI7SUFDckQsSUFBSSxjQUFjLENBQUMsTUFBTSxJQUFJLENBQUM7UUFDNUIsT0FBTyxLQUFLLENBQUM7SUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN6RCxNQUFNLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBRXBDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUN2QixTQUFTO1FBQ1gsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUNULE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFDRDs7O0dBR0c7QUFDSCxTQUFTLGFBQWEsQ0FBQyxXQUFzQixFQUFFLElBQVk7SUFDekQsSUFBSSxXQUFXLElBQUksSUFBSSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUNqRCxPQUFPLFdBQVcsQ0FBQztJQUNyQixJQUFJO1FBQ0YsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNoQyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxFQUFFO2dCQUNoRCxJQUFJO29CQUNGLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN4RCxJQUFJLEdBQUcsS0FBSyxDQUFDO3dCQUNYLE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2hELENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O3dCQUVqRCxPQUFPLEdBQUcsQ0FBQztpQkFDZDtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDdkIsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7YUFDRjtpQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSTtnQkFDckQsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDUCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSTtnQkFDbkQsT0FBTyxDQUFDLENBQUM7aUJBQ04sSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHO2dCQUM1QixPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNQLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztnQkFDNUIsT0FBTyxDQUFDLENBQUM7O2dCQUVULE9BQU8sQ0FBQyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsSUFBSSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sQ0FBQyxDQUFDO0tBQ1Q7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgIG1heC1sZW4gKi9cbi8vIGltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtTaW1wbGVMaW5rZWRMaXN0LCBTaW1wbGVMaW5rZWRMaXN0Tm9kZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuXG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnRyYW5zaXRpdmUtZGVwLWhvaXN0ZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkludGVyZiB7XG4gIHZlcnNpb246IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBkZXZEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBwZWVyRGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgZGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbn1cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZXMganNvbiBtYXAgb2YgbGlua2VkIHBhY2thZ2VcbiAqIEBwYXJhbSB3b3Jrc3BhY2UgXG4gKiBAcGFyYW0gd29ya3NwYWNlRGVwcyBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VEZXZEZXBzIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogTWFwPHN0cmluZywge2pzb246IFBhY2thZ2VKc29uSW50ZXJmfT4sXG4gIHdvcmtzcGFjZTogc3RyaW5nLFxuICB3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sXG4gIHdvcmtzcGFjZURldkRlcHM/OiB7W25hbWU6IHN0cmluZ106IHN0cmluZ31cbikge1xuICBjb25zdCBqc29ucyA9IEFycmF5LmZyb20ocGtKc29uRmlsZXMudmFsdWVzKCkpLm1hcChpdGVtID0+IGl0ZW0uanNvbik7XG4gIGNvbnN0IGFsbERlcHMgPSB7Li4ud29ya3NwYWNlRGVwcywgLi4uKHdvcmtzcGFjZURldkRlcHMgPyB3b3Jrc3BhY2VEZXZEZXBzIDoge30pfTtcbiAgbGV0IHNjYW5uZXIgPSBuZXcgVHJhbnNpdGl2ZURlcFNjYW5uZXIoYWxsRGVwcywgd29ya3NwYWNlLCBwa0pzb25GaWxlcyk7XG4gIHNjYW5uZXIuc2NhbkZvcihqc29ucy5maWx0ZXIoaXRlbSA9PiBfLmhhcyh3b3Jrc3BhY2VEZXBzLCBpdGVtLm5hbWUpKSk7XG4gIGNvbnN0IFtIb2lzdGVkRGVwSW5mbywgSG9pc3RlZFBlZXJEZXBJbmZvXSA9IHNjYW5uZXIuaG9pc3REZXBzKCk7XG4gIGNvbnN0IGRldkRlcHMgPSBzY2FubmVyLmRldkRlcHM7XG4gIGxldCBob2lzdGVkRGV2OiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgbGV0IGhvaXN0ZWREZXZQZWVyczogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGlmICh3b3Jrc3BhY2VEZXZEZXBzKSB7XG4gICAgc2Nhbm5lciA9IG5ldyBUcmFuc2l0aXZlRGVwU2Nhbm5lcihhbGxEZXBzLCB3b3Jrc3BhY2UsIHBrSnNvbkZpbGVzKTtcbiAgICBzY2FubmVyLmluaXRFeGlzdGluZ0RlcHMoZGV2RGVwcyk7XG4gICAgc2Nhbm5lci5zY2FuRm9yKGpzb25zLmZpbHRlcihpdGVtID0+IF8uaGFzKHdvcmtzcGFjZURldkRlcHMsIGl0ZW0ubmFtZSkpLCB0cnVlKTtcbiAgICBbaG9pc3RlZERldiwgaG9pc3RlZERldlBlZXJzXSA9IHNjYW5uZXIuaG9pc3REZXBzKEhvaXN0ZWREZXBJbmZvKTtcbiAgfSBlbHNlIHtcbiAgICBob2lzdGVkRGV2ID0gbmV3IE1hcCgpO1xuICAgIGhvaXN0ZWREZXZQZWVycyA9IG5ldyBNYXAoKTtcbiAgfVxuICAvLyBUT0RPOiBkZXZEZXBlbmRlbmNpZXMgbWlnaHQgY29udGFpbnMgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5IHdoaWNoIGR1cGxpY2F0ZXMgdG8gXCJkZXBlbmRlbmNpZXNcIlxuICByZXR1cm4ge1xuICAgIGhvaXN0ZWQ6IEhvaXN0ZWREZXBJbmZvLFxuICAgIGhvaXN0ZWRQZWVyczogSG9pc3RlZFBlZXJEZXBJbmZvLFxuICAgIGhvaXN0ZWREZXYsXG4gICAgaG9pc3RlZERldlBlZXJzXG4gIH07XG59XG5cbmludGVyZmFjZSBEZXBJbmZvIHtcbiAgdmVyOiBzdHJpbmc7XG4gIHZlck51bT86IHN0cmluZztcbiAgcHJlOiBzdHJpbmc7XG4gIGJ5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW50SW5mbyB7XG4gIC8qKiBJcyBhbGwgZGVwZW5kZW50cyBvbiBzYW1lIHZlcnNpb24gKi9cbiAgc2FtZVZlcjogYm9vbGVhbjtcbiAgLyoqIElzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygc3BhY2UgcGFja2FnZS5qc29uICovXG4gIGRpcmVjdDogYm9vbGVhbjtcbiAgLyoqIEluIGNhc2UgYSB0cmFuc2l0aXZlIHBlZXIgZGVwZW5kZW5jeSwgaXQgc2hvdWxkIG5vdFxuICAgKiBiZSBpbnN0YWxsZWQgYXV0b21hdGljYWxseSwgdW5sZXNzIGl0IGlzIGFsc28gYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiBjdXJyZW50IHNwYWNlLFxuICAgKiBzZXR0aW5nIHRvIGB0cnVlYCB0byByZW1pbmQgdXNlciB0byBpbnN0YWxsIG1hbnVhbGx5IFxuICAgKi9cbiAgbWlzc2luZzogYm9vbGVhbjtcbiAgLyoqIFNhbWUgdHJhc2l0aXZlIGRlcGVuZGVuY3kgaW4gYm90aCBub3JtYWwgYW5kIHBlZXIgZGVwZW5kZW5jaWVzIGxpc3RcbiAgICogYWN0dWFsIHZlcnNpb24gc2hvdWxkIGJlIHRoZSBvbmUgc2VsZWN0ZWQgZnJvbSBub3JtYWwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5XG4gICAqL1xuICBkdXBsaWNhdGVQZWVyOiBib29sZWFuO1xuICBieTogQXJyYXk8e1xuICAgIC8qKiBkZXBlbmRlbmN5IHZlcnNpb24gKG5vdCBkZXBlbmRlbnQncykgKi9cbiAgICB2ZXI6IHN0cmluZztcbiAgICAvKiogZGVwZW5kZW50IG5hbWUgKi9cbiAgICBuYW1lOiBzdHJpbmc7XG4gIH0+O1xufVxuXG5cblxuY29uc3QgdmVyc2lvblJlZyA9IC9eKFxcRCopKFxcZC4qPykoPzpcXC50Z3opPyQvO1xuXG5leHBvcnQgY2xhc3MgVHJhbnNpdGl2ZURlcFNjYW5uZXIge1xuICB2ZXJib3NNZXNzYWdlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRldkRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIC8qKiBrZXkgaXMgZGVwZW5kZW5jeSBtb2R1bGUgbmFtZSAqL1xuICBwcml2YXRlIGRpcmVjdERlcHM6IE1hcDxzdHJpbmcsIFNpbXBsZUxpbmtlZExpc3ROb2RlPFtzdHJpbmcsIERlcEluZm9dPj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgc3JjRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcblxuICBwcml2YXRlIHBlZXJEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGRpcmVjdERlcHNMaXN0OiBTaW1wbGVMaW5rZWRMaXN0PFtzdHJpbmcsIERlcEluZm9dPiA9IG5ldyBTaW1wbGVMaW5rZWRMaXN0PFtzdHJpbmcsIERlcEluZm9dPigpO1xuXG4gIC8qKlxuICAgKiBcbiAgICogQHBhcmFtIHdvcmtzcGFjZURlcHMgc2hvdWxkIGluY2x1ZGUgXCJkZXBlbmRlbmNpZXNcIiBhbmQgXCJkZXZEZXBlbmRlbmNpZXNcIlxuICAgKiBAcGFyYW0gd29ya3NwYWNlTmFtZSBcbiAgICogQHBhcmFtIGV4Y2x1ZGVMaW5rZWREZXBzIFxuICAgKi9cbiAgY29uc3RydWN0b3Iod29ya3NwYWNlRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LCB3b3Jrc3BhY2VOYW1lOiBzdHJpbmcsIHByaXZhdGUgZXhjbHVkZUxpbmtlZERlcHM6IE1hcDxzdHJpbmcsIGFueT4gfCBTZXQ8c3RyaW5nPikge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHdvcmtzcGFjZURlcHMpKSB7XG4gICAgICBpZiAodGhpcy5leGNsdWRlTGlua2VkRGVwcy5oYXMobmFtZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICAgIGNvbnN0IGN1cnJOb2RlID0gdGhpcy5kaXJlY3REZXBzTGlzdC5wdXNoKFtuYW1lLCB7XG4gICAgICAgIHZlcjogdmVyc2lvbiA9PT0gJyonID8gJycgOiB2ZXJzaW9uLFxuICAgICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICAgIGJ5OiBgKCR7d29ya3NwYWNlTmFtZSB8fCAnPHJvb3QgZGlyZWN0b3J5Pid9KWBcbiAgICAgIH1dKTtcbiAgICAgIHRoaXMuZGlyZWN0RGVwcy5zZXQobmFtZSwgY3Vyck5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHNjYW5Gb3IocGtKc29uczogSXRlcmFibGU8UGFja2FnZUpzb25JbnRlcmY+LCBjb21iaW5lRGV2RGVwcyA9IGZhbHNlKSB7XG4gICAgZm9yIChjb25zdCBqc29uIG9mIHBrSnNvbnMpIHtcbiAgICAgIGxldCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICB0aGlzLl90cmFja1NyY0RlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGVwcyA9IGpzb24uZGV2RGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKGRlcHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgICAgICAgaWYgKGNvbWJpbmVEZXZEZXBzKVxuICAgICAgICAgICAgdGhpcy5fdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5fdHJhY2tEZXZEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChqc29uLnBlZXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGpzb24ucGVlckRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0ganNvbi5wZWVyRGVwZW5kZW5jaWVzW25hbWVdO1xuICAgICAgICAgIHRoaXMuX3RyYWNrUGVlckRlcGVuZGVuY3kobmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGluaXRFeGlzdGluZ0RlcHMoZGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPikge1xuICAgIGZvciAoY29uc3QgW2tleSwgaW5mb10gb2YgZGVwcykge1xuICAgICAgdGhpcy5zcmNEZXBzLnNldChrZXksIGluZm8pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYmFzZSBhbGdvcml0aG06IFwibmV3IGRlcGVuZGVuY2llc1wiID0gXCJkaXJlY3QgZGVwZW5kZW5jaWVzIG9mIHdvcmtzcGFjZVwiICsgXCJ0cmFuc2l2ZSBkZXBlbmRlbmNpZXNcIlxuICAgKiBAcGFyYW0gZHVwbGljYXRlRGVwc1RvQ2hlY2sgZXh0cmEgZGVwZW5kZW50IGluZm9ybWF0aW9uIHRvIGNoZWNrIGlmIHRoZXkgYXJlIGR1cGxpY2F0ZS5cbiAgICovXG4gIGhvaXN0RGVwcyhkdXBsaWNhdGVEZXBzVG9DaGVjaz86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+KSB7XG4gICAgY29uc3QgZGVwZW5kZW50SW5mbyA9IHRoaXMuY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMuc3JjRGVwcyk7XG4gICAgY29uc3QgcGVlckRlcGVuZGVudEluZm8gPSB0aGlzLmNvbGxlY3REZXBlbmRlbmN5SW5mbyh0aGlzLnBlZXJEZXBzLCB0cnVlKTtcbiAgICAvLyBJbiBjYXNlIHBlZXIgZGVwZW5kZW5jeSBkdXBsaWNhdGVzIHRvIGV4aXN0aW5nIHRyYW5zaXRpdmUgZGVwZW5kZW5jeSwgc2V0IFwibWlzc2luZ1wiIHRvIGBmYWxzZWBcblxuICAgIGZvciAoY29uc3QgW3BlZXJEZXAsIHBlZXJJbmZvXSBvZiBwZWVyRGVwZW5kZW50SW5mby5lbnRyaWVzKCkpIHtcbiAgICAgIGlmICghcGVlckluZm8ubWlzc2luZylcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIGxldCBub3JtSW5mbyA9IGRlcGVuZGVudEluZm8uZ2V0KHBlZXJEZXApO1xuICAgICAgaWYgKG5vcm1JbmZvKSB7XG4gICAgICAgIHBlZXJJbmZvLmR1cGxpY2F0ZVBlZXIgPSB0cnVlO1xuICAgICAgICBwZWVySW5mby5taXNzaW5nID0gZmFsc2U7XG4gICAgICAgIHBlZXJJbmZvLmJ5LnVuc2hpZnQobm9ybUluZm8uYnlbMF0pO1xuICAgICAgfVxuICAgICAgaWYgKGR1cGxpY2F0ZURlcHNUb0NoZWNrKSB7XG4gICAgICAgIG5vcm1JbmZvID0gZHVwbGljYXRlRGVwc1RvQ2hlY2suZ2V0KHBlZXJEZXApO1xuICAgICAgICBpZiAobm9ybUluZm8pIHtcbiAgICAgICAgICBwZWVySW5mby5kdXBsaWNhdGVQZWVyID0gdHJ1ZTtcbiAgICAgICAgICBwZWVySW5mby5taXNzaW5nID0gZmFsc2U7XG4gICAgICAgICAgcGVlckluZm8uYnkudW5zaGlmdChub3JtSW5mby5ieVswXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtZXJnZSBkaXJlY3REZXBzTGlzdCAoZGlyZWN0IGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UpIGludG8gZGVwZW5kZW50SW5mbyAodHJhbnNpdmUgZGVwZW5kZW5jaWVzKVxuICAgIGZvciAoY29uc3QgW2RlcE5hbWUsIGl0ZW1dIG9mIHRoaXMuZGlyZWN0RGVwc0xpc3QudHJhdmVyc2UoKSkge1xuICAgICAgY29uc3QgaW5mbzogRGVwZW5kZW50SW5mbyA9IHtcbiAgICAgICAgc2FtZVZlcjogdHJ1ZSxcbiAgICAgICAgZGlyZWN0OiB0cnVlLFxuICAgICAgICBtaXNzaW5nOiBmYWxzZSxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiBbe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9XVxuICAgICAgfTtcbiAgICAgIGRlcGVuZGVudEluZm8uc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBbZGVwZW5kZW50SW5mbywgcGVlckRlcGVuZGVudEluZm9dO1xuICB9XG5cbiAgLyoqXG4gICAqIC0gSWYgdGhlcmUgaXMgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiB3b3Jrc3BhY2UsIG1vdmUgaXRzIHZlcnNpb24gdG8gdGhlIHRvcCBvZiB0aGUgdmVyc2lvbiBsaXN0LFxuICAgKiAtIElmIGl0IGlzIHBlZXIgZGVwZW5kZW5jeSBhbmQgaXQgaXMgbm90IGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLFxuICAgKiBtYXJrIGl0IFwibWlzc2luZ1wiIHNvIHRoYXQgcmVtaW5kcyB1c2VyIHRvIG1hbnVhbCBpbnN0YWxsIGl0LlxuICAgKiBAcGFyYW0gdHJhY2tlZFJhdyBcbiAgICogQHBhcmFtIGlzUGVlckRlcHMgXG4gICAqL1xuICBwcm90ZWN0ZWQgY29sbGVjdERlcGVuZGVuY3lJbmZvKHRyYWNrZWRSYXc6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4sIGlzUGVlckRlcHMgPSBmYWxzZSkge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm9zOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPiA9IG5ldyBNYXAoKTtcblxuICAgIGZvciAoY29uc3QgW2RlcE5hbWUsIHZlcnNpb25MaXN0XSBvZiB0cmFja2VkUmF3LmVudHJpZXMoKSkge1xuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiB3b3Jrc3BhY2UsIG1vdmUgaXRzIHZlcnNpb24gdG8gdGhlIHRvcCBvZiB0aGUgdmVyc2lvbiBsaXN0XG4gICAgICBjb25zdCBkaXJlY3RWZXIgPSB0aGlzLmRpcmVjdERlcHMuZ2V0KGRlcE5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbnMgPSBzb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBkZXBOYW1lKTtcbiAgICAgIGlmIChkaXJlY3RWZXIpIHtcbiAgICAgICAgdmVyc2lvbnMudW5zaGlmdChkaXJlY3RWZXIudmFsdWVbMV0pO1xuICAgICAgICBpZiAoIWlzUGVlckRlcHMpIHtcbiAgICAgICAgICB0aGlzLmRpcmVjdERlcHNMaXN0LnJlbW92ZU5vZGUoZGlyZWN0VmVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgaGFzRGlmZlZlcnNpb24gPSBfY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG5cbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6ICFoYXNEaWZmVmVyc2lvbixcbiAgICAgICAgZGlyZWN0OiBkaXJlY3RWZXIgIT0gbnVsbCxcbiAgICAgICAgLy8gSWYgaXQgaXMgcGVlciBkZXBlbmRlbmN5IGFuZCBpdCBpcyBub3QgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiB3b3Jrc3BhY2UsXG4gICAgICAgIC8vIHRoZW4gbWFyayBpdCBcIm1pc3NpbmdcIiBzbyB0aGF0IHJlbWluZHMgdXNlciB0byBtYW51YWwgaW5zdGFsbCBpdC5cbiAgICAgICAgbWlzc2luZzogaXNQZWVyRGVwcyAmJiBkaXJlY3RWZXIgPT0gbnVsbCxcbiAgICAgICAgZHVwbGljYXRlUGVlcjogZmFsc2UsXG4gICAgICAgIGJ5OiB2ZXJzaW9ucy5tYXAoaXRlbSA9PiAoe3ZlcjogaXRlbS52ZXIsIG5hbWU6IGl0ZW0uYnl9KSlcbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvcy5zZXQoZGVwTmFtZSwgaW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlcGVuZGVudEluZm9zO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1NyY0RlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgdGhpcy5fdHJhY2tEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwgYnlXaG9tKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tEZXZEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLmRldkRlcHMsIG5hbWUsIHZlcnNpb24sIGJ5V2hvbSk7XG4gIH1cblxuICBwcml2YXRlIF90cmFja0RlcGVuZGVuY3koZGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiwgbmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZUxpbmtlZERlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghZGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIGRlcHMuc2V0KG5hbWUsIFtdKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICBkZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrUGVlckRlcGVuZGVuY3kobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcsIGJ5V2hvbTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZXhjbHVkZUxpbmtlZERlcHMuaGFzKG5hbWUpKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICghdGhpcy5wZWVyRGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMucGVlckRlcHMuc2V0KG5hbWUsIFtdKTtcbiAgICB9XG4gICAgY29uc3QgbSA9IHZlcnNpb25SZWcuZXhlYyh2ZXJzaW9uKTtcbiAgICB0aGlzLnBlZXJEZXBzLmdldChuYW1lKSEucHVzaCh7XG4gICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgIHZlck51bTogbSA/IG1bMl0gOiB1bmRlZmluZWQsXG4gICAgICBwcmU6IG0gPyBtWzFdIDogJycsXG4gICAgICBieTogYnlXaG9tXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NvbnRhaW5zRGlmZlZlcnNpb24oc29ydGVkVmVyc2lvbnM6IERlcEluZm9bXSkge1xuICBpZiAoc29ydGVkVmVyc2lvbnMubGVuZ3RoIDw9IDEpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IHNvcnRlZFZlcnNpb25zLmxlbmd0aCAtIDE7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBhID0gc29ydGVkVmVyc2lvbnNbaV0udmVyO1xuICAgIGNvbnN0IGIgPSBzb3J0ZWRWZXJzaW9uc1tpICsgMV0udmVyO1xuXG4gICAgaWYgKGIgPT09ICcqJyB8fCBiID09PSAnJylcbiAgICAgIGNvbnRpbnVlO1xuICAgIGlmIChhICE9PSBiKVxuICAgICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuLyoqXG4gKiBTb3J0IGJ5IGRlc2NlbmRpbmdcbiAqIEBwYXJhbSB2ZXJJbmZvTGlzdCB7dmVyOiBzdHJpbmcsIGJ5OiBzdHJpbmcsIG5hbWU6IHN0cmluZ31cbiAqL1xuZnVuY3Rpb24gc29ydEJ5VmVyc2lvbih2ZXJJbmZvTGlzdDogRGVwSW5mb1tdLCBuYW1lOiBzdHJpbmcpIHtcbiAgaWYgKHZlckluZm9MaXN0ID09IG51bGwgfHwgdmVySW5mb0xpc3QubGVuZ3RoID09PSAxKVxuICAgIHJldHVybiB2ZXJJbmZvTGlzdDtcbiAgdHJ5IHtcbiAgICB2ZXJJbmZvTGlzdC5zb3J0KChpbmZvMSwgaW5mbzIpID0+IHtcbiAgICAgIGlmIChpbmZvMS52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMi52ZXJOdW0gIT0gbnVsbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlcyA9IHNlbXZlci5yY29tcGFyZShpbmZvMS52ZXJOdW0sIGluZm8yLnZlck51bSk7XG4gICAgICAgICAgaWYgKHJlcyA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBpbmZvMS5wcmUgPT09ICcnICYmIGluZm8yLnByZSAhPT0gJycgPyAtMSA6XG4gICAgICAgICAgICAgIChpbmZvMS5wcmUgIT09ICcnICYmIGluZm8yLnByZSA9PT0gJycgPyAxIDogMCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy53YXJuKGluZm8xLCBpbmZvMik7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtID09IG51bGwpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8yLnZlck51bSAhPSBudWxsICYmIGluZm8xLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA+IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgZWxzZSBpZiAoaW5mbzEudmVyIDwgaW5mbzIudmVyKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoYEludmFsaWQgc2VtdmVyIGZvcm1hdCBmb3IgJHtuYW1lIHx8ICcnfTogYCArIEpTT04uc3RyaW5naWZ5KHZlckluZm9MaXN0LCBudWxsLCAnICAnKSk7XG4gICAgdGhyb3cgZTtcbiAgfVxuICByZXR1cm4gdmVySW5mb0xpc3Q7XG59XG5cblxuIl19