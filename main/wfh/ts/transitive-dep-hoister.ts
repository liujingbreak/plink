/* eslint-disable  max-len */
// import {mkdirpSync} from 'fs-extra';
import * as _ from 'lodash';
import {SimpleLinkedList, SimpleLinkedListNode} from './utils/misc';
const semver = require('semver');
const log = require('log4js').getLogger('plink.transitive-dep-hoister');

export interface PackageJsonInterf {
  version: string;
  name: string;
  devDependencies?: {[nm: string]: string};
  peerDependencies?: {[nm: string]: string};
  dependencies?: {[nm: string]: string};
}
/**
 * 
 * @param pkJsonFiles json map of linked package
 * @param workspace 
 * @param workspaceDeps 
 * @param workspaceDevDeps 
 */
export function listCompDependency(
  pkJsonFiles: Map<string, {json: PackageJsonInterf;}>,
  workspace: string,
  workspaceDeps: {[name: string]: string},
  workspaceDevDeps?: {[name: string]: string}
) {
  const jsons = Array.from(pkJsonFiles.values()).map(item => item.json);
  const allDeps = {...workspaceDeps, ...(workspaceDevDeps ? workspaceDevDeps : {})};
  let scanner = new TransitiveDepScanner(allDeps, workspace, pkJsonFiles);
  scanner.scanFor(jsons.filter(item => _.has(workspaceDeps, item.name)));
  const [HoistedDepInfo, HoistedPeerDepInfo] = scanner.hoistDeps();
  let hoistedDev: Map<string, DependentInfo>;
  let hoistedDevPeers: Map<string, DependentInfo>;
  if (workspaceDevDeps) {
    scanner = new TransitiveDepScanner(allDeps, workspace, pkJsonFiles);
    scanner.scanFor(jsons.filter(item => _.has(workspaceDevDeps, item.name)));
    [hoistedDev, hoistedDevPeers] = scanner.hoistDeps(HoistedDepInfo);
  } else {
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

interface DepInfo {
  ver: string;
  verNum?: string;
  pre: string;
  by: string;
}

export interface DependentInfo {
  /** Is all dependents on same version */
  sameVer: boolean;
  /** Is a direct dependency of space package.json */
  direct: boolean;
  /** In case a transitive peer dependency, it should not
   * be installed automatically, unless it is also a direct dependency of current space,
   * setting to `true` to remind user to install manually 
   */
  missing: boolean;
  /** Same trasitive dependency in both normal and peer dependencies list
   * actual version should be the one selected from normal transitive dependency
   */
  duplicatePeer: boolean;
  by: Array<{
    /** dependency version (not dependent's) */
    ver: string;
    /** dependent name */
    name: string;
  }>;
}



const versionReg = /^(\D*)(\d.*?)(?:\.tgz)?$/;

export class TransitiveDepScanner {
  verbosMessage: string;
  /** key is dependency module name */
  private directDeps: Map<string, SimpleLinkedListNode<[string, DepInfo]>> = new Map();
  private srcDeps: Map<string, DepInfo[]> = new Map();
  private peerDeps: Map<string, DepInfo[]> = new Map();
  private directDepsList: SimpleLinkedList<[string, DepInfo]> = new SimpleLinkedList<[string, DepInfo]>();

  /**
   * 
   * @param workspaceDeps should include "dependencies" and "devDependencies"
   * @param workspaceName 
   * @param excludeLinkedDeps 
   */
  constructor(workspaceDeps: {[name: string]: string}, workspaceName: string, private excludeLinkedDeps: Map<string, any> | Set<string>) {
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

  scanFor(pkJsons: Iterable<PackageJsonInterf>) {
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
  hoistDeps(extraDependentInfo?: Map<string, DependentInfo>) {
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
      const info: DependentInfo = {
        sameVer: true,
        direct: true,
        missing: false,
        duplicatePeer: false,
        by: [{ver: item.ver, name: item.by}]
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
  protected collectDependencyInfo(trackedRaw: Map<string, DepInfo[]>, isPeerDeps = false) {
    const dependentInfos: Map<string, DependentInfo> = new Map();

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

      const info: DependentInfo = {
        sameVer: !hasDiffVersion,
        direct: directVer != null,
        // If it is peer dependency and it is not a direct dependency of workspace,
        // then mark it "missing" so that reminds user to manual install it.
        missing: isPeerDeps && directVer == null,
        duplicatePeer: false,
        by: versions.map(item => ({ver: item.ver, name: item.by}))
      };
      dependentInfos.set(depName, info);
    }

    return dependentInfos;
  }

  protected _trackSrcDependency(name: string, version: string, byWhom: string) {
    if (this.excludeLinkedDeps.has(name))
      return;
    if (!this.srcDeps.has(name)) {
      this.srcDeps.set(name, []);
    }
    const m = versionReg.exec(version);
    this.srcDeps.get(name)!.push({
      ver: version === '*' ? '' : version,
      verNum: m ? m[2] : undefined,
      pre: m ? m[1] : '',
      by: byWhom
    });
  }

  protected _trackPeerDependency(name: string, version: string, byWhom: string) {
    if (this.excludeLinkedDeps.has(name))
      return;
    if (!this.peerDeps.has(name)) {
      this.peerDeps.set(name, []);
    }
    const m = versionReg.exec(version);
    this.peerDeps.get(name)!.push({
      ver: version === '*' ? '' : version,
      verNum: m ? m[2] : undefined,
      pre: m ? m[1] : '',
      by: byWhom
    });
  }
}

function _containsDiffVersion(sortedVersions: DepInfo[]) {
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
function sortByVersion(verInfoList: DepInfo[], name: string) {
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
        } catch (e) {
          log.warn(info1, info2);
        }
      } else if (info1.verNum != null && info2.verNum == null)
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
  } catch (e) {
    log.error(`Invalid semver format for ${name || ''}: ` + JSON.stringify(verInfoList, null, '  '));
    throw e;
  }
  return verInfoList;
}


