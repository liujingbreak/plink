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
        // In case peer dependency duplicates to existing transitive dependency, set "missing" to `false`
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
        // merge directDepsList into dependentInfo
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
                missing: !notPeerDeps && !direct,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNpdGl2ZS1kZXAtaG9pc3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQyx1Q0FBeUI7QUFHekIsdUNBQW9FO0FBQ3BFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFTeEUsU0FBZ0Isa0JBQWtCLENBQ2hDLFdBQTJDLEVBQzNDLFNBQWlCLEVBQ2pCLGFBQXVDLEVBQ3ZDLFVBQTBDO0lBRTFDLCtEQUErRDtJQUMvRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzNFLElBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtRQUNwQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQXVCLENBQUMsQ0FBQzs7UUFFL0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFrQyxDQUFDLENBQUM7SUFDeEQscUNBQXFDO0lBQ3JDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbkUsT0FBTztRQUNMLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFlBQVksRUFBRSxrQkFBa0I7S0FDakMsQ0FBQztBQUNKLENBQUM7QUFsQkQsZ0RBa0JDO0FBaUNELE1BQU0sVUFBVSxHQUFHLDBCQUEwQixDQUFDO0FBRTlDLE1BQWEsY0FBYztJQVF6QixZQUFZLGFBQXVDLEVBQUUsYUFBcUIsRUFBVSxXQUEyQztRQUEzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0M7UUFOL0gsb0NBQW9DO1FBQzVCLGVB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QUNQLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztnQkFDNUIsT0FBTyxDQUFDLENBQUM7O2dCQUVULE9BQU8sQ0FBQyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsSUFBSSxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sQ0FBQyxDQUFDO0tBQ1Q7SUFDRCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQge21rZGlycFN5bmN9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7U2ltcGxlTGlua2VkTGlzdCwgU2ltcGxlTGlua2VkTGlzdE5vZGV9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5jb25zdCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigncGxpbmsudHJhbnNpdGl2ZS1kZXAtaG9pc3RlcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uSW50ZXJmIHtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldkRlcGVuZGVuY2llcz86IHtbbm06IHN0cmluZ106IHN0cmluZ307XG4gIHBlZXJEZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xuICBkZXBlbmRlbmNpZXM/OiB7W25tOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RDb21wRGVwZW5kZW5jeShcbiAgcGtKc29uRmlsZXM6IHN0cmluZ1tdIHwgUGFja2FnZUpzb25JbnRlcmZbXSxcbiAgd29ya3NwYWNlOiBzdHJpbmcsXG4gIHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSxcbiAgZXhjbHVkZURlcDogTWFwPHN0cmluZywgYW55PiB8IFNldDxzdHJpbmc+XG4pIHtcbiAgLy8gbG9nLmluZm8oJ3NjYW4gY29tcG9uZW50cyBmcm9tOlxcbicsIHBrSnNvbkZpbGVzLmpvaW4oJ1xcbicpKTtcbiAgY29uc3QgaW5zdGFsbGVyID0gbmV3IEluc3RhbGxNYW5hZ2VyKHdvcmtzcGFjZURlcHMsIHdvcmtzcGFjZSwgZXhjbHVkZURlcCk7XG4gIGlmICh0eXBlb2YgcGtKc29uRmlsZXNbMF0gPT09ICdzdHJpbmcnKVxuICAgIGluc3RhbGxlci5zY2FuU3JjRGVwcyhwa0pzb25GaWxlcyBhcyBzdHJpbmdbXSk7XG4gIGVsc2VcbiAgICBpbnN0YWxsZXIuc2NhbkZvcihwa0pzb25GaWxlcyBhcyBQYWNrYWdlSnNvbkludGVyZltdKTtcbiAgLy8gaW5zdGFsbGVyLnNjYW5JbnN0YWxsZWRQZWVyRGVwcygpO1xuICBjb25zdCBbSG9pc3RlZERlcEluZm8sIEhvaXN0ZWRQZWVyRGVwSW5mb10gPSBpbnN0YWxsZXIuaG9pc3REZXBzKCk7XG4gIHJldHVybiB7XG4gICAgaG9pc3RlZDogSG9pc3RlZERlcEluZm8sXG4gICAgaG9pc3RlZFBlZXJzOiBIb2lzdGVkUGVlckRlcEluZm9cbiAgfTtcbn1cblxuaW50ZXJmYWNlIERlcEluZm8ge1xuICB2ZXI6IHN0cmluZztcbiAgdmVyTnVtPzogc3RyaW5nO1xuICBwcmU6IHN0cmluZztcbiAgYnk6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXBlbmRlbnRJbmZvIHtcbiAgLyoqIElzIGFsbCBkZXBlbmRlbnRzIG9uIHNhbWUgdmVyc2lvbiAqL1xuICBzYW1lVmVyOiBib29sZWFuO1xuICAvKiogSXMgYSBkaXJlY3QgZGVwZW5kZW5jeSBvZiBzcGFjZSBwYWNrYWdlLmpzb24gKi9cbiAgZGlyZWN0OiBib29sZWFuO1xuICAvKiogSW4gY2FzZSBhIHRyYW5zaXRpdmUgcGVlciBkZXBlbmRlbmN5LCBpdCBzaG91bGQgbm90XG4gICAqIGJlIGluc3RhbGxlZCBhdXRvbWF0aWNhbGx5LCB1bmxlc3MgaXQgaXMgYWxzbyBhIGRpcmVjdCBkZXBlbmRlbmN5IG9mIGN1cnJlbnQgc3BhY2UsXG4gICAqIHNldHRpbmcgdG8gYHRydWVgIHRvIHJlbWluZCB1c2VyIHRvIGluc3RhbGwgbWFudWFsbHkgXG4gICAqL1xuICBtaXNzaW5nOiBib29sZWFuO1xuICAvKiogU2FtZSB0cmFzaXRpdmUgZGVwZW5kZW5jeSBpbiBib3RoIG5vcm1hbCBhbmQgcGVlciBkZXBlbmRlbmNpZXMgbGlzdFxuICAgKiBhY3R1YWwgdmVyc2lvbiBzaG91bGQgYmUgdGhlIG9uZSBzZWxlY3RlZCBmcm9tIG5vcm1hbCB0cmFuc2l0aXZlIGRlcGVuZGVuY3lcbiAgICovXG4gIGR1cGxpY2F0ZVBlZXI6IGJvb2xlYW47XG4gIGJ5OiBBcnJheTx7XG4gICAgLyoqIGRlcGVuZGVuY3kgdmVyc2lvbiAobm90IGRlcGVuZGVudCdzKSAqL1xuICAgIHZlcjogc3RyaW5nO1xuICAgIC8qKiBkZXBlbmRlbnQgbmFtZSAqL1xuICAgIG5hbWU6IHN0cmluZztcbiAgfT47XG59XG5cblxuXG5jb25zdCB2ZXJzaW9uUmVnID0gL14oXFxEKikoXFxkLio/KSg/OlxcLnRneik/JC87XG5cbmV4cG9ydCBjbGFzcyBJbnN0YWxsTWFuYWdlciB7XG4gIHZlcmJvc01lc3NhZ2U6IHN0cmluZztcbiAgLyoqIGtleSBpcyBkZXBlbmRlbmN5IG1vZHVsZSBuYW1lICovXG4gIHByaXZhdGUgZGlyZWN0RGVwczogTWFwPHN0cmluZywgU2ltcGxlTGlua2VkTGlzdE5vZGU8W3N0cmluZywgRGVwSW5mb10+PiA9IG5ldyBNYXAoKTtcbiAgcHJpdmF0ZSBzcmNEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIHBlZXJEZXBzOiBNYXA8c3RyaW5nLCBEZXBJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGRpcmVjdERlcHNMaXN0OiBTaW1wbGVMaW5rZWRMaXN0PFtzdHJpbmcsIERlcEluZm9dPiA9IG5ldyBTaW1wbGVMaW5rZWRMaXN0PFtzdHJpbmcsIERlcEluZm9dPigpO1xuXG4gIGNvbnN0cnVjdG9yKHdvcmtzcGFjZURlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSwgd29ya3NwYWNlTmFtZTogc3RyaW5nLCBwcml2YXRlIGV4Y2x1ZGVEZXBzOiBNYXA8c3RyaW5nLCBhbnk+IHwgU2V0PHN0cmluZz4pIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyh3b3Jrc3BhY2VEZXBzKSkge1xuICAgICAgaWYgKHRoaXMuZXhjbHVkZURlcHMuaGFzKG5hbWUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgICBjb25zdCBjdXJyTm9kZSA9IHRoaXMuZGlyZWN0RGVwc0xpc3QucHVzaChbbmFtZSwge1xuICAgICAgICB2ZXI6IHZlcnNpb24gPT09ICcqJyA/ICcnIDogdmVyc2lvbixcbiAgICAgICAgdmVyTnVtOiBtID8gbVsyXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgICBieTogYCgke3dvcmtzcGFjZU5hbWUgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgXG4gICAgICB9XSk7XG4gICAgICB0aGlzLmRpcmVjdERlcHMuc2V0KG5hbWUsIGN1cnJOb2RlKTtcbiAgICB9XG4gIH1cblxuICBzY2FuRm9yKHBrSnNvbnM6IFBhY2thZ2VKc29uSW50ZXJmW10pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGZvciAoY29uc3QganNvbiBvZiBwa0pzb25zKSB7XG4gICAgICBjb25zdCBkZXBzID0ganNvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gZGVwc1tuYW1lXTtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoJ3NjYW5TcmNEZXBzQXN5bmMoKSBkZXAgJyArIG5hbWUpO1xuICAgICAgICAgIHNlbGYuX3RyYWNrU3JjRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoanNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgbG9nLndhcm4oYCR7anNvbi5uYW1lfSBjb250YWlucyBcImRldkRlcGVuZW5kaWVzXCIsIGlmIHRoZXkgYXJlIG5lY2Vzc2FyeSBmb3IgY29tcGlsaW5nIHRoaXMgY29tcG9uZW50IGAgK1xuICAgICAgICAgICd5b3Ugc2hvdWxkIG1vdmUgdGhlbSB0byBcImRlcGVuZGVuY2llc1wiIG9yIFwicGVlckRlcGVuZGVuY2llc1wiJyk7XG4gICAgICAgIC8vIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhqc29uLmRldkRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgLy8gICBjb25zdCB2ZXJzaW9uID0ganNvbi5kZXZEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgIC8vICAgc2VsZi5fdHJhY2tTcmNEZXBlbmRlbmN5KHRoaXMuc3JjRGVwcywgbmFtZSwgdmVyc2lvbiwganNvbi5uYW1lKTtcbiAgICAgICAgLy8gfVxuICAgICAgfVxuICAgICAgaWYgKGpzb24ucGVlckRlcGVuZGVuY2llcykge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoanNvbi5wZWVyRGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBqc29uLnBlZXJEZXBlbmRlbmNpZXNbbmFtZV07XG4gICAgICAgICAgc2VsZi5fdHJhY2tQZWVyRGVwZW5kZW5jeShuYW1lLCB2ZXJzaW9uLCBqc29uLm5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2NhblNyY0RlcHMoanNvbkZpbGVzOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiB0aGlzLnNjYW5Gb3IoanNvbkZpbGVzLm1hcChwYWNrYWdlSnNvbiA9PiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvbiwgJ3V0ZjgnKSkpKTtcbiAgfVxuXG4gIGhvaXN0RGVwcygpIHtcbiAgICBjb25zdCBkZXBlbmRlbnRJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPiA9IHRoaXMuY29sbGVjdERlcGVuZGVuY3lJbmZvKHRoaXMuc3JjRGVwcyk7XG4gICAgY29uc3QgcGVlckRlcGVuZGVudEluZm8gPSB0aGlzLmNvbGxlY3REZXBlbmRlbmN5SW5mbyh0aGlzLnBlZXJEZXBzLCBmYWxzZSk7XG4gICAgLy8gbWVyZ2UgcGVlciBkZXBlbmRlbnQgaW5mbyBsaXN0IGludG8gcmVndWxhciBkZXBlbmRlbnQgaW5mbyBsaXN0XG4gICAgLy8gSW4gY2FzZSBwZWVyIGRlcGVuZGVuY3kgZHVwbGljYXRlcyB0byBleGlzdGluZyB0cmFuc2l0aXZlIGRlcGVuZGVuY3ksIHNldCBcIm1pc3NpbmdcIiB0byBgZmFsc2VgXG4gICAgZm9yIChjb25zdCBbcGVlckRlcCwgcGVlckluZm9dIG9mIHBlZXJEZXBlbmRlbnRJbmZvLmVudHJpZXMoKSkge1xuICAgICAgaWYgKCFwZWVySW5mby5taXNzaW5nKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgY29uc3Qgbm9ybUluZm8gPSBkZXBlbmRlbnRJbmZvLmdldChwZWVyRGVwKTtcbiAgICAgIGlmIChub3JtSW5mbykge1xuICAgICAgICBwZWVySW5mby5kdXBsaWNhdGVQZWVyID0gdHJ1ZTtcbiAgICAgICAgcGVlckluZm8ubWlzc2luZyA9IGZhbHNlO1xuICAgICAgICBwZWVySW5mby5ieS51bnNoaWZ0KG5vcm1JbmZvLmJ5WzBdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtZXJnZSBkaXJlY3REZXBzTGlzdCBpbnRvIGRlcGVuZGVudEluZm9cbiAgICBmb3IgKGNvbnN0IFtkZXBOYW1lLCBpdGVtXSBvZiB0aGlzLmRpcmVjdERlcHNMaXN0LnRyYXZlcnNlKCkpIHtcbiAgICAgIGNvbnN0IGluZm86IERlcGVuZGVudEluZm8gPSB7XG4gICAgICAgIHNhbWVWZXI6IHRydWUsXG4gICAgICAgIGRpcmVjdDogdHJ1ZSxcbiAgICAgICAgbWlzc2luZzogZmFsc2UsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogW3t2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fV1cbiAgICAgIH07XG4gICAgICBkZXBlbmRlbnRJbmZvLnNldChkZXBOYW1lLCBpbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2RlcGVuZGVudEluZm8sIHBlZXJEZXBlbmRlbnRJbmZvXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb2xsZWN0RGVwZW5kZW5jeUluZm8odHJhY2tlZFJhdzogTWFwPHN0cmluZywgRGVwSW5mb1tdPiwgbm90UGVlckRlcHMgPSB0cnVlKSB7XG4gICAgY29uc3QgZGVwZW5kZW50SW5mb3M6IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+ID0gbmV3IE1hcCgpO1xuXG4gICAgZm9yIChjb25zdCBbZGVwTmFtZSwgdmVyc2lvbkxpc3RdIG9mIHRyYWNrZWRSYXcuZW50cmllcygpKSB7XG4gICAgICBjb25zdCBkaXJlY3RWZXIgPSB0aGlzLmRpcmVjdERlcHMuZ2V0KGRlcE5hbWUpO1xuICAgICAgY29uc3QgdmVyc2lvbnMgPSBzb3J0QnlWZXJzaW9uKHZlcnNpb25MaXN0LCBkZXBOYW1lKTtcbiAgICAgIGlmIChkaXJlY3RWZXIpIHtcbiAgICAgICAgdmVyc2lvbnMudW5zaGlmdChkaXJlY3RWZXIudmFsdWVbMV0pO1xuICAgICAgICBpZiAobm90UGVlckRlcHMpIHtcbiAgICAgICAgICB0aGlzLmRpcmVjdERlcHNMaXN0LnJlbW92ZU5vZGUoZGlyZWN0VmVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgaGFzRGlmZlZlcnNpb24gPSBfY29udGFpbnNEaWZmVmVyc2lvbih2ZXJzaW9uTGlzdCk7XG5cbiAgICAgIGNvbnN0IGRpcmVjdCA9IHRoaXMuZGlyZWN0RGVwcy5oYXMoZGVwTmFtZSk7XG4gICAgICBjb25zdCBpbmZvOiBEZXBlbmRlbnRJbmZvID0ge1xuICAgICAgICBzYW1lVmVyOiAhaGFzRGlmZlZlcnNpb24sXG4gICAgICAgIGRpcmVjdCxcbiAgICAgICAgbWlzc2luZzogIW5vdFBlZXJEZXBzICYmICFkaXJlY3QsXG4gICAgICAgIGR1cGxpY2F0ZVBlZXI6IGZhbHNlLFxuICAgICAgICBieTogdmVyc2lvbnMubWFwKGl0ZW0gPT4gKHt2ZXI6IGl0ZW0udmVyLCBuYW1lOiBpdGVtLmJ5fSkpXG4gICAgICB9O1xuICAgICAgZGVwZW5kZW50SW5mb3Muc2V0KGRlcE5hbWUsIGluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkZXBlbmRlbnRJbmZvcztcbiAgfVxuXG4gIHByb3RlY3RlZCBfdHJhY2tTcmNEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVEZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMuc3JjRGVwcy5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMuc3JjRGVwcy5zZXQobmFtZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBtID0gdmVyc2lvblJlZy5leGVjKHZlcnNpb24pO1xuICAgIHRoaXMuc3JjRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIF90cmFja1BlZXJEZXBlbmRlbmN5KG5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBieVdob206IHN0cmluZykge1xuICAgIGlmICh0aGlzLmV4Y2x1ZGVEZXBzLmhhcyhuYW1lKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoIXRoaXMucGVlckRlcHMuaGFzKG5hbWUpKSB7XG4gICAgICB0aGlzLnBlZXJEZXBzLnNldChuYW1lLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IG0gPSB2ZXJzaW9uUmVnLmV4ZWModmVyc2lvbik7XG4gICAgdGhpcy5wZWVyRGVwcy5nZXQobmFtZSkhLnB1c2goe1xuICAgICAgdmVyOiB2ZXJzaW9uID09PSAnKicgPyAnJyA6IHZlcnNpb24sXG4gICAgICB2ZXJOdW06IG0gPyBtWzJdIDogdW5kZWZpbmVkLFxuICAgICAgcHJlOiBtID8gbVsxXSA6ICcnLFxuICAgICAgYnk6IGJ5V2hvbVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jb250YWluc0RpZmZWZXJzaW9uKHNvcnRlZFZlcnNpb25zOiBEZXBJbmZvW10pIHtcbiAgaWYgKHNvcnRlZFZlcnNpb25zLmxlbmd0aCA8PSAxKVxuICAgIHJldHVybiBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzb3J0ZWRWZXJzaW9ucy5sZW5ndGggLSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgYSA9IHNvcnRlZFZlcnNpb25zW2ldLnZlcjtcbiAgICBjb25zdCBiID0gc29ydGVkVmVyc2lvbnNbaSArIDFdLnZlcjtcblxuICAgIGlmIChiID09PSAnKicgfHwgYiA9PT0gJycpXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAoYSAhPT0gYilcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbi8qKlxuICogU29ydCBieSBkZXNjZW5kaW5nXG4gKiBAcGFyYW0gdmVySW5mb0xpc3Qge3Zlcjogc3RyaW5nLCBieTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHNvcnRCeVZlcnNpb24odmVySW5mb0xpc3Q6IERlcEluZm9bXSwgbmFtZTogc3RyaW5nKSB7XG4gIGlmICh2ZXJJbmZvTGlzdCA9PSBudWxsIHx8IHZlckluZm9MaXN0Lmxlbmd0aCA9PT0gMSlcbiAgICByZXR1cm4gdmVySW5mb0xpc3Q7XG4gIHRyeSB7XG4gICAgdmVySW5mb0xpc3Quc29ydCgoaW5mbzEsIGluZm8yKSA9PiB7XG4gICAgICBpZiAoaW5mbzEudmVyTnVtICE9IG51bGwgJiYgaW5mbzIudmVyTnVtICE9IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXMgPSBzZW12ZXIucmNvbXBhcmUoaW5mbzEudmVyTnVtLCBpbmZvMi52ZXJOdW0pO1xuICAgICAgICAgIGlmIChyZXMgPT09IDApXG4gICAgICAgICAgICByZXR1cm4gaW5mbzEucHJlID09PSAnJyAmJiBpbmZvMi5wcmUgIT09ICcnID8gLTEgOlxuICAgICAgICAgICAgICAoaW5mbzEucHJlICE9PSAnJyAmJiBpbmZvMi5wcmUgPT09ICcnID8gMSA6IDApO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cud2FybihpbmZvMSwgaW5mbzIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGluZm8xLnZlck51bSAhPSBudWxsICYmIGluZm8yLnZlck51bSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICBlbHNlIGlmIChpbmZvMi52ZXJOdW0gIT0gbnVsbCAmJiBpbmZvMS52ZXJOdW0gPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlIGlmIChpbmZvMS52ZXIgPiBpbmZvMi52ZXIpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIGVsc2UgaWYgKGluZm8xLnZlciA8IGluZm8yLnZlcilcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGBJbnZhbGlkIHNlbXZlciBmb3JtYXQgZm9yICR7bmFtZSB8fCAnJ306IGAgKyBKU09OLnN0cmluZ2lmeSh2ZXJJbmZvTGlzdCwgbnVsbCwgJyAgJykpO1xuICAgIHRocm93IGU7XG4gIH1cbiAgcmV0dXJuIHZlckluZm9MaXN0O1xufVxuXG5cbiJdfQ==