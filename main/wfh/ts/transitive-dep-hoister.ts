/* tslint:disable max-line-length */
import * as fs from 'fs';
// import {mkdirpSync} from 'fs-extra';
import * as _ from 'lodash';
import * as Path from 'path';
import {SimpleLinkedList, SimpleLinkedListNode} from './utils/misc';
const semver = require('semver');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));

export interface PackageJsonInterf {
  version: string;
  name: string;
  devDependencies?: {[nm: string]: string};
  peerDependencies?: {[nm: string]: string};
  dependencies?: {[nm: string]: string};
}
export function listCompDependency(
  pkJsonFiles: string[] | PackageJsonInterf[],
  workspace: string,
  workspaceDeps: {[name: string]: string},
  excludeDep: Map<string, any> | Set<string>
) {
  // log.info('scan components from:\n', pkJsonFiles.join('\n'));
  const installer = new InstallManager(workspaceDeps, workspace, excludeDep);
  if (typeof pkJsonFiles[0] === 'string')
    installer.scanSrcDeps(pkJsonFiles as string[]);
  else
    installer.scanFor(pkJsonFiles as PackageJsonInterf[]);
  // installer.scanInstalledPeerDeps();
  const [HoistedDepInfo, HoistedPeerDepInfo] = installer.hoistDeps();
  return {
    hoisted: HoistedDepInfo,
    hoistedPeers: HoistedPeerDepInfo
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
   * be installed automatically, unless it is also a direct dependency of current space 
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

export class InstallManager {
  verbosMessage: string;
  /** key is dependency module name */
  private directDeps: Map<string, SimpleLinkedListNode<[string, DepInfo]>> = new Map();
  private srcDeps: Map<string, DepInfo[]> = new Map();
  private peerDeps: Map<string, DepInfo[]> = new Map();
  private directDepsList: SimpleLinkedList<[string, DepInfo]> = new SimpleLinkedList<[string, DepInfo]>();

  constructor(workspaceDeps: {[name: string]: string}, workspaceName: string, private excludeDeps: Map<string, any> | Set<string>) {
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

  scanFor(pkJsons: PackageJsonInterf[]) {
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
        log.warn(`${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
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

  scanSrcDeps(jsonFiles: string[]) {
    return this.scanFor(jsonFiles.map(packageJson => JSON.parse(fs.readFileSync(packageJson, 'utf8'))));
  }

  hoistDeps() {
    const dependentInfo: Map<string, DependentInfo> = this.collectDependencyInfo(this.srcDeps);
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

  protected collectDependencyInfo(trackedRaw: Map<string, DepInfo[]>, notPeerDeps = true) {
    const dependentInfos: Map<string, DependentInfo> = new Map();

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
      const info: DependentInfo = {
        sameVer: !hasDiffVersion,
        direct,
        missing: notPeerDeps ? false : !direct,
        duplicatePeer: false,
        by: versions.map(item => ({ver: item.ver, name: item.by}))
      };
      dependentInfos.set(depName, info);
    }

    return dependentInfos;
  }

  protected _trackSrcDependency(name: string, version: string, byWhom: string) {
    if (this.excludeDeps.has(name))
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
    if (this.excludeDeps.has(name))
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


