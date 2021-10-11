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
    scanner = new TransitiveDepScanner(allDeps, workspace, pkJsonFiles);
    scanner.initExistingDeps(devDeps);
    if (workspaceDevDeps)
        scanner.scanFor(jsons.filter(item => _.has(workspaceDevDeps, item.name)), true);
    [hoistedDev, hoistedDevPeers] = scanner.hoistDeps(HoistedDepInfo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZCQUE2QjtBQUM3Qix1Q0FBdUM7QUFDdkMsMENBQTRCO0FBQzVCLHVDQUFvRTtBQUNwRSxtQ0FBaUM7QUFDakMsb0RBQTRCO0FBRTVCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBU3REOzs7Ozs7R0FNRztBQUNILFNBQWdCLGtCQUFrQixDQUNoQyxXQUFtRCxFQUNuRCxTQUFpQixFQUNqQixhQUF1QyxFQUN2QyxnQkFBMkM7SUFFM0MsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEUsTUFBTSxPQUFPLG1DQUFPLGFBQWEsR0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRixJQUFJLE9BQU8sR0FBRyxJQUFJLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDeEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxNQUFNLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2pFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FB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NEJBQ2hELENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O3dCQUVqRCxPQUFPLEdBQUcsQ0FBQztpQkFDZDtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDdkIsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7YUFDRjtpQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSTtnQkFDckQsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDUCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSTtnQkFDbkQsT0FBTyxDQUFDLENBQUM7aUJBQ04sSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHO2dCQUM1QixPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNQLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztnQkFDNUIsT0FBTyxDQUFDLENBQUM7O2dCQUVULE9BQU8sQ0FBQyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsSUFBSSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sQ0FBQyxDQUFDO0tBQ1Q7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgIG1heC1sZW4gKi9cbi8vIGltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtTaW1wbGVMaW5rZWRMaXN0LCBTaW1wbGVMaW5rZWRMaXN0Tm9kZX0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuXG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnRyYW5zaXRpdmUtZGVwLWhvaXN0ZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkludGVyZiB7XG4gIHZlcnNpb246IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBkZXZEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBwZWVyRGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbiAgZGVwZW5kZW5jaWVzPzoge1tubTogc3RyaW5nXTogc3RyaW5nfTtcbn1cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZXMganNvbiBtYXAgb2YgbGlua2VkIHBhY2thZ2VcbiAqIEBwYXJhbSB3b3Jrc3BhY2UgXG4gKiBAcGFyYW0gd29ya3NwYWNlRGVwcyBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VEZXZEZXBzIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbGlzdENvbXBEZXBlbmRlbmN5KFxuICBwa0pzb25GaWxlczogTWFwPHN0cmluZywge2pzb246IFBhY2thZ2VKc29uSW50ZXJmfT4sXG4gIHdvcmtzcGFjZTogc3RyaW5nLFxuICB3b3Jrc3BhY2VEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30sXG4gIHdvcmtzcGFjZURldkRlcHM/OiB7W25hbWU6IHN0cmluZ106IHN0cmluZ31cbikge1xuICBjb25zdCBqc29ucyA9IEFycmF5LmZyb20ocGtKc29uRmlsZXMudmFsdWVzKCkpLm1hcChpdGVtID0+IGl0ZW0uanNvbik7XG4gIGNvbnN0IGFsbERlcHMgPSB7Li4ud29ya3NwYWNlRGVwcywgLi4uKHdvcmtzcGFjZURldkRlcHMgPyB3b3Jrc3BhY2VEZXZEZXBzIDoge30pfTtcbiAgbGV0IHNjYW5uZXIgPSBuZXcgVHJhbnNpdGl2ZURlcFNjYW5uZXIoYWxsRGVwcywgd29ya3NwYWNlLCBwa0pzb25GaWxlcyk7XG4gIHNjYW5uZXIuc2NhbkZvcihqc29ucy5maWx0ZXIoaXRlbSA9PiBfLmhhcyh3b3Jrc3BhY2VEZXBzLCBpdGVtLm5hbWUpKSk7XG4gIGNvbnN0IFtIb2lzdGVkRGVwSW5mbywgSG9pc3RlZFBlZXJEZXBJbmZvXSA9IHNjYW5uZXIuaG9pc3REZXBzKCk7XG4gIGNvbnN0IGRldkRlcHMgPSBzY2FubmVyLmRldkRlcHM7XG4gIGxldCBob2lzdGVkRGV2OiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgbGV0IGhvaXN0ZWREZXZQZWVyczogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgc2Nhbm5lciA9IG5ldyBUcmFuc2l0aXZlRGVwU2Nhbm5lcihhbGxEZXBzLCB3b3Jrc3BhY2UsIHBrSnNvbkZpbGVzKTtcbiAgc2Nhbm5lci5pbml0RXhpc3RpbmdEZXBzKGRldkRlcHMpO1xuICBpZiAod29ya3NwYWNlRGV2RGVwcylcbiAgICBzY2FubmVyLnNjYW5Gb3IoanNvbnMuZmlsdGVyKGl0ZW0gPT4gXy5oYXMod29ya3NwYWNlRGV2RGVwcywgaXRlbS5uYW1lKSksIHRydWUpO1xuICBbaG9pc3RlZERldiwgaG9pc3RlZERldlBlZXJzXSA9IHNjYW5uZXIuaG9pc3REZXBzKEhvaXN0ZWREZXBJbmZvKTtcbiAgLy8gVE9ETzogZGV2RGVwZW5kZW5jaWVzIG1pZ2h0IGNvbnRhaW5zIHRyYW5zaXRpdmUgZGVwZW5kZW5jeSB3aGljaCBkdXBsaWNhdGVzIHRvIFwiZGVwZW5kZW5jaWVzXCJcbiAgcmV0dXJuIHtcbiAgICBob2lzdGVkOiBIb2lzdGVkRGVwSW5mbyxcbiAgICBob2lzdGVkUGVlcnM6IEhvaXN0ZWRQZWVyRGVwSW5mbyxcbiAgICBob2lzdGVkRGV2LFxuICAgIGhvaXN0ZWREZXZQZWVyc1xuICB9O1xufVxuXG5pbnRlcmZhY2UgRGVwSW5mbyB7XG4gIHZlcjogc3RyaW5nO1xuICB2ZXJOdW0/OiBzdHJpbmc7XG4gIHByZTogc3RyaW5nO1xuICBieTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVudEluZm8ge1xuICAvKiogSXMgYWxsIGRlcGVuZGVudHMgb24gc2FtZSB2ZXJzaW9uICovXG4gIHNhbWVWZXI6IGJvb2xlYW47XG4gIC8qKiBJcyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHNwYWNlIHBhY2thZ2UuanNvbiAqL1xuICBkaXJlY3Q6IGJvb2xlYW47XG4gIC8qKiBJbiBjYXNlIGEgdHJhbnNpdGl2ZSBwZWVyIGRlcGVuZGVuY3ksIGl0IHNob3VsZCBub3RcbiAgICogYmUgaW5zdGFsbGVkIGF1dG9tYXRpY2FsbHksIHVubGVzcyBpdCBpcyBhbHNvIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2YgY3VycmVudCBzcGFjZSxcbiAgICogc2V0dGluZyB0byBgdHJ1ZWAgdG8gcmVtaW5kIHVzZXIgdG8gaW5zdGFsbCBtYW51YWxseSBcbiAgICovXG4gIG1pc3Npbmc6IGJvb2xlYW47XG4gIC8qKiBTYW1lIHRyYXNpdGl2ZSBkZXBlbmRlbmN5IGluIGJvdGggbm9ybWFsIGFuZCBwZWVyIGRlcGVuZGVuY2llcyBsaXN0XG4gICAqIGFjdHVhbCB2ZXJzaW9uIHNob3VsZCBiZSB0aGUgb25lIHNlbGVjdGVkIGZyb20gbm9ybWFsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgKi9cbiAgZHVwbGljYXRlUGVlcjogYm9vbGVhbjtcbiAgYnk6IEFycmF5PHtcbiAgICAvKiogZGVwZW5kZW5jeSB2ZXJzaW9uIChub3QgZGVwZW5kZW50J3MpICovXG4gICAgdmVyOiBzdHJpbmc7XG4gICAgLyoqIGRlcGVuZGVudCBuYW1lICovXG4gICAgbmFtZTogc3RyaW5nO1xuICB9Pjtcbn1cblxuXG5cbmNvbnN0IHZlcnNpb25SZWcgPSAvXihcXEQqKShcXGQuKj8pKD86XFwudGd6KT8kLztcblxuZXhwb3J0IGNsYXNzIFRyYW5zaXRpdmVEZXBTY2FubmVyIHtcbiAgdmVyYm9zTWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBkZXZEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuICAvKioga2V5IGlzIGRlcGVuZGVuY3kgbW9kdWxlIG5hbWUgKi9cbiAgcHJpdmF0ZSBkaXJlY3REZXBzOiBNYXA8c3RyaW5nLCBTaW1wbGVMaW5rZWRMaXN0Tm9kZTxbc3RyaW5nLCBEZXBJbmZvXT4+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHNyY0RlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4gPSBuZXcgTWFwKCk7XG5cbiAgcHJpdmF0ZSBwZWVyRGVwczogTWFwPHN0cmluZywgRGVwSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBkaXJlY3REZXBzTGlzdDogU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4gPSBuZXcgU2ltcGxlTGlua2VkTGlzdDxbc3RyaW5nLCBEZXBJbmZvXT4oKTtcblxuICAvKipcbiAgICogXG4gICAqIEBwYXJhbSB3b3Jrc3BhY2VEZXBzIHNob3VsZCBpbmNsdWRlIFwiZGVwZW5kZW5jaWVzXCIgYW5kIFwiZGV2RGVwZW5kZW5jaWVzXCJcbiAgICogQHBhcmFtIHdvcmtzcGFjZU5hbWUgXG4gICAqIEBwYXJhbSBleGNsdWRlTGlua2VkRGVwcyBcbiAgICovXG4gIGNvbnN0cnVjdG9yKHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSwgd29ya3NwYWNlTmFtZTogc3RyaW5nLCBwcml2YXRlIGV4Y2x1ZGVMaW5rZWREZXBzOiBNYXA8c3RyaW5nLCBhbnk+IHwgU2V0PHN0cmluZz4pIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh3b3Jrc3BhY2VEZXBzKSkge1xuICAgICAgaWYgKHRoaXMuZXhjbHVkZUxpbmtlZERlcHMuaGFzKG5hbWUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgICBjb25zdCBjdXJyTm9kZSA9IHRoaXMuZGlyZWN0RGVwc0xpc3QucHVzaChbbmFtZSwge1xuICAgICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgICBieTogYCgke3dvcmtzcGFjZU5hbWUgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgXG4gICAgICB9XSk7XG4gICAgICB0aGlzLmRpcmVjdERlcHMuc2V0KG5hbWUsIGN1cnJOb2RlKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IEl0ZXJhYmxlPFBhY2thZ2VKc29uSW50ZXJmPiwgY29tYmluZURldkRlcHMgPSBmYWxzZSkge1xuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICBsZXQgZGVwcyA9IGpzb24uZGVwZW5kZW5jaWVzO1xuICAgICAgaWYgKGRlcHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGRlcHNbbmFtZV07XG4gICAgICAgICAgdGhpcy5fdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRlcHMgPSBqc29uLmRldkRlcGVuZGVuY2llcztcbiAgICAgIGlmIChkZXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBkZXBzW25hbWVdO1xuICAgICAgICAgIGlmIChjb21iaW5lRGV2RGVwcylcbiAgICAgICAgICAgIHRoaXMuX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuX3RyYWNrRGV2RGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLnBlZXJEZXBlbmRlbmNpZXMpKSB7XG4gICAgICAgICAgY29uc3QgdmVyc2lvbiA9IGpzb24ucGVlckRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgICAgICB0aGlzLl90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWUsIHZlcnNpb24sIGpzb24ubmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpbml0RXhpc3RpbmdEZXBzKGRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4pIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIGluZm9dIG9mIGRlcHMpIHtcbiAgICAgIHRoaXMuc3JjRGVwcy5zZXQoa2V5LCBpbmZvKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIGJhc2UgYWxnb3JpdGhtOiBcIm5ldyBkZXBlbmRlbmNpZXNcIiA9IFwiZGlyZWN0IGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2VcIiArIFwidHJhbnNpdmUgZGVwZW5kZW5jaWVzXCJcbiAgICogQHBhcmFtIGR1cGxpY2F0ZURlcHNUb0NoZWNrIGV4dHJhIGRlcGVuZGVudCBpbmZvcm1hdGlvbiB0byBjaGVjayBpZiB0aGV5IGFyZSBkdXBsaWNhdGUuXG4gICAqL1xuICBob2lzdERlcHMoZHVwbGljYXRlRGVwc1RvQ2hlY2s/OiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPikge1xuICAgIGNvbnN0IGRlcGVuZGVudEluZm8gPSB0aGlzLmNvbGxlY3REZXBlbmRlbmN5SW5mbyh0aGlzLnNyY0RlcHMpO1xuICAgIGNvbnN0IHBlZXJEZXBlbmRlbnRJbmZvID0gdGhpcy5jb2xsZWN0RGVwZW5kZW5jeUluZm8odGhpcy5wZWVyRGVwcywgdHJ1ZSk7XG4gICAgLy8gSW4gY2FzZSBwZWVyIGRlcGVuZGVuY3kgZHVwbGljYXRlcyB0byBleGlzdGluZyB0cmFuc2l0aXZlIGRlcGVuZGVuY3ksIHNldCBcIm1pc3NpbmdcIiB0byBgZmFsc2VgXG5cbiAgICBmb3IgKGNvbnN0IFtwZWVyRGVwLCBwZWVySW5mb10gb2YgcGVlckRlcGVuZGVudEluZm8uZW50cmllcygpKSB7XG4gICAgICBpZiAoIXBlZXJJbmZvLm1pc3NpbmcpXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBsZXQgbm9ybUluZm8gPSBkZXBlbmRlbnRJbmZvLmdldChwZWVyRGVwKTtcbiAgICAgIGlmIChub3JtSW5mbykge1xuICAgICAgICBwZWVySW5mby5kdXBsaWNhdGVQZWVyID0gdHJ1ZTtcbiAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICBwZWVySW5mby5ieS51bnNoaWZ0KG5vcm1JbmZvLmJ5WzBdKTtcbiAgICAgIH1cbiAgICAgIGlmIChkdXBsaWNhdGVEZXBzVG9DaGVjaykge1xuICAgICAgICBub3JtSW5mbyA9IGR1cGxpY2F0ZURlcHNUb0NoZWNrLmdldChwZWVyRGVwKTtcbiAgICAgICAgaWYgKG5vcm1JbmZvKSB7XG4gICAgICAgICAgcGVlckluZm8uZHVwbGljYXRlUGVlciA9IHRydWU7XG4gICAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICAgIHBlZXJJbmZvLmJ5LnVuc2hpZnQobm9ybUluZm8uYnlbMF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbWVyZ2UgZGlyZWN0RGVwc0xpc3QgKGRpcmVjdCBkZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlKSBpbnRvIGRlcGVuZGVudEluZm8gKHRyYW5zaXZlIGRlcGVuZGVuY2llcylcbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCBpdGVtXSBvZiB0aGlzLmRpcmVjdERlcHNMaXN0LnRyYXZlcnNlKCkpIHtcbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6IHRydWUsXG4gICAgICAgIGRpcmVjdDogdHJ1ZSxcbiAgICAgICAgbWlzc2luZzogZmFsc2UsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogW3t2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fV1cbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2RlcGVuZGVudEluZm8sIHBlZXJEZXBlbmRlbnRJbmZvXTtcbiAgfVxuXG4gIC8qKlxuICAgKiAtIElmIHRoZXJlIGlzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLCBtb3ZlIGl0cyB2ZXJzaW9uIHRvIHRoZSB0b3Agb2YgdGhlIHZlcnNpb24gbGlzdCxcbiAgICogLSBJZiBpdCBpcyBwZWVyIGRlcGVuZGVuY3kgYW5kIGl0IGlzIG5vdCBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIHdvcmtzcGFjZSxcbiAgICogbWFyayBpdCBcIm1pc3NpbmdcIiBzbyB0aGF0IHJlbWluZHMgdXNlciB0byBtYW51YWwgaW5zdGFsbCBpdC5cbiAgICogQHBhcmFtIHRyYWNrZWRSYXcgXG4gICAqIEBwYXJhbSBpc1BlZXJEZXBzIFxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbGxlY3REZXBlbmRlbmN5SW5mbyh0cmFja2VkUmF3OiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+LCBpc1BlZXJEZXBzID0gZmFsc2UpIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvczogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz4gPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCB2ZXJzaW9uTGlzdF0gb2YgdHJhY2tlZFJhdy5lbnRyaWVzKCkpIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLCBtb3ZlIGl0cyB2ZXJzaW9uIHRvIHRoZSB0b3Agb2YgdGhlIHZlcnNpb24gbGlzdFxuICAgICAgY29uc3QgZGlyZWN0VmVyID0gdGhpcy5kaXJlY3REZXBzLmdldChkZXBOYW1lKTtcbiAgICAgIGNvbnN0IHZlcnNpb25zID0gc29ydEJ5VmVyc2lvbih2ZXJzaW9uTGlzdCwgZGVwTmFtZSk7XG4gICAgICBpZiAoZGlyZWN0VmVyKSB7XG4gICAgICAgIHZlcnNpb25zLnVuc2hpZnQoZGlyZWN0VmVyLnZhbHVlWzFdKTtcbiAgICAgICAgaWYgKCFpc1BlZXJEZXBzKSB7XG4gICAgICAgICAgdGhpcy5kaXJlY3REZXBzTGlzdC5yZW1vdmVOb2RlKGRpcmVjdFZlcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhc0RpZmZWZXJzaW9uID0gX2NvbnRhaW5zRGlmZlZlcnNpb24odmVyc2lvbkxpc3QpO1xuXG4gICAgICBjb25zdCBpbmZvOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiAhaGFzRGlmZlZlcnNpb24sXG4gICAgICAgIGRpcmVjdDogZGlyZWN0VmVyICE9IG51bGwsXG4gICAgICAgIC8vIElmIGl0IGlzIHBlZXIgZGVwZW5kZW5jeSBhbmQgaXQgaXMgbm90IGEgZGlyZWN0IGRlcGVuZGVuY3kgb2Ygd29ya3NwYWNlLFxuICAgICAgICAvLyB0aGVuIG1hcmsgaXQgXCJtaXNzaW5nXCIgc28gdGhhdCByZW1pbmRzIHVzZXIgdG8gbWFudWFsIGluc3RhbGwgaXQuXG4gICAgICAgIG1pc3Npbmc6IGlzUGVlckRlcHMgJiYgZGlyZWN0VmVyID09IG51bGwsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogdmVyc2lvbnMubWFwKGl0ZW0gPT4gKHt2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fSkpXG4gICAgICB9O1xuICAgICAgZGVwZW5kZW50SW5mb3Muc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkZXBlbmRlbnRJbmZvcztcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIHRoaXMuX3RyYWNrRGVwZW5kZW5jeSh0aGlzLnNyY0RlcHMsIG5hbWUsIHZlcnNpb24sIGJ5V2hvbSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3RyYWNrRGV2RGVwZW5kZW5jeShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgYnlXaG9tOiBzdHJpbmcpIHtcbiAgICB0aGlzLl90cmFja0RlcGVuZGVuY3kodGhpcy5kZXZEZXBzLCBuYW1lLCB2ZXJzaW9uLCBieVdob20pO1xuICB9XG5cbiAgcHJpdmF0ZSBfdHJhY2tEZXBlbmRlbmN5KGRlcHM6IE1hcDxzdHJpbmcsIERlcEluZm9bXT4sIG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIWRlcHMuaGFzKG5hbWUpKSB7XG4gICAgICBkZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgZGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVMaW5rZWREZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMucGVlckRlcHMuaGFzKG5hbWUpKSB7XG4gICAgICB0aGlzLnBlZXJEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5wZWVyRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcbiAgaWYgKHNvcnRlZFZlcnNpb25zLmxlbmd0aCA8PSAxKVxuICAgIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgYSA9IHNvcnRlZFZlcnNpb25zW2ldLnZlcjtcbiAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgIGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAoYSAhPT0gYilcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbi8qKlxuICogU29ydCBieSBkZXNjZW5kaW5nXG4gKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHNvcnRCeVZlcnNpb24odmVySW5mb0xpc3Q6IERlcEluZm9bXSwgbmFtZTogc3RyaW5nKSB7XG4gIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICByZXR1cm4gdmVySW5mb0xpc3Q7XG4gIHRyeSB7XG4gICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtICE9IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgIGlmIChyZXMgPT09IDApXG4gICAgICAgICAgICByZXR1cm4gaW5mbzEucHJlID09PSAnJyAmJiBpbmZvMi5wcmUgIT09ICcnID8gLTEgOlxuICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cud2FybihpbmZvMSwgaW5mbzIpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMi52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMS52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgIHRocm93IGU7XG4gIH1cbiAgcmV0dXJuIHZlckluZm9MaXN0O1xufVxuXG5cbiJdfQ==