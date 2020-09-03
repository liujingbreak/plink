/* tslint:disable max-line-length */
import * as fs from 'fs';
// import {mkdirpSync} from 'fs-extra';
import * as _ from 'lodash';
import * as Path from 'path';
// import config from './config';
const chalk = require('chalk');
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
  workspaceDeps: {[name: string]: string}
) {
  // log.info('scan components from:\n', pkJsonFiles.join('\n'));
  const installer = new InstallManager(workspaceDeps, workspace);
  if (typeof pkJsonFiles[0] === 'string')
    installer.scanSrcDeps(pkJsonFiles as string[]);
  else
    installer.scanFor(pkJsonFiles as PackageJsonInterf[]);
  // installer.scanInstalledPeerDeps();
  return {hoisted: installer.hoistDeps(), msg: () => installer.verbosMessage};
}

interface DepInfo {
  ver: string;
  verNum?: string;
  pre: string;
  by: string;
}

interface DependentInfo {
  /** All dependents on same version */
  sameVer: boolean;
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
  private srcDeps: Map<string, DepInfo[]> = new Map();
  // componentMap: {[pName: string]: {ver: string, toInstall: boolean}};

  constructor(workspaceDeps: {[name: string]: string}, workspaceName: string) {
    if (!(this instanceof InstallManager)) {
      return new InstallManager(workspaceDeps, workspaceName);
    }
    this.srcDeps = new Map(); // src packages needed dependencies and all packages needed peer dependencies
    // this.peerDeps = {}; // all packages needed peer dependencies

    for (const [name, version] of Object.entries(workspaceDeps)) {
      this._trackDependency(name, version, workspaceName);
    }
  }

  scanFor(pkJsons: PackageJsonInterf[]) {
    const self = this;
    // this.componentMap = {};
    for (const json of pkJsons) {
      // this.componentMap[json.name] = {ver: json.version, toInstall: false};
      const deps = json.dependencies;
      if (deps) {
        for (const name of Object.keys(deps)) {
          const version = deps[name];
          // log.debug('scanSrcDepsAsync() dep ' + name);
          self._trackDependency(name, version, json.name);
        }
      }
      if (json.devDependencies) {
        log.warn(`$${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
          'you should move them to "dependencies" or "peerDependencies"');
        // for (const name of Object.keys(json.devDependencies)) {
        //   const version = json.devDependencies[name];
        //   self._trackDependency(this.srcDeps, name, version, json.name);
        // }
      }
      if (json.peerDependencies) {
        for (const name of Object.keys(json.peerDependencies)) {
          const version = json.peerDependencies[name];
          self._trackDependency(name, version, json.name);
        }
      }
    }
  }

  scanSrcDeps(jsonFiles: string[]) {
    return this.scanFor(jsonFiles.map(packageJson => JSON.parse(fs.readFileSync(packageJson, 'utf8'))));
  }

  // scanInstalledPeerDeps() {
  //   // TODO: Here I want to determine expected component version to install with, but so far the version number of each component that I get is currently installed
  //   // one which might be incorrect or outdated, in case like developer did not run "yarn install" before "drcp init".
  //   // One problem is: 
  //   // Without running "yarn install" to download "recipe" package, I can't know exact up to date version number of those components
  //   // which belong to a certain "recipe" pacakge.
  //   // So firstly, always "yarn install" before "drcp init"

  //   // Another problem is:
  //   // These old component versions are tracked in dist/dr.package.json waiting for being compared with newly changed version list.
  //   // But ...
  //   packageUtils.findAllPackages((name, entryPath: string, parsedName, json, packagePath) => {
  //     if (_.has(this.componentMap, name))
  //       return; // Skip it, since most likely there is a duplicate "installed" dependency in package.json against an symbolic linked component
  //     this.componentMap[name] = {ver: json.version, toInstall: true};
  //     _.each(json.peerDependencies, (version, name) => {
  //       this._trackDependency(this.srcDeps, name, version, json.name);
  //     });
  //   }, 'installed');
  // }

  hoistDeps() {
    const dependentInfo: Map<string, DependentInfo> = new Map();
    // const hoistDeps: {[dep: string]: string} = {};

    const depNames = Array.from(this.srcDeps.keys());
    if (this.srcDeps.size === 0)
      return dependentInfo;
    depNames.sort();
    const nameWidth = _.maxBy(depNames, name => name.length)!.length;
    const col0Width = nameWidth + 15;
    let printOut = '';
    printOut += _.padStart('Dependency ', col0Width - 1) + '| Dependent\n';
    printOut += _.repeat('-', col0Width) + '|' + _.repeat('-', 10) + '\n';
    let countDep = 0;
    for (const name of depNames) {
      const versionList = this.srcDeps.get(name)!;
      const firstVersion = this.sortByVersion(versionList, name)[0];
      const hasDiffVersion = this._containsDiffVersion(versionList);
      const dependentInfos: DependentInfo = {
        sameVer: !hasDiffVersion,
        by: [{ver: firstVersion.ver, name: firstVersion.by}]
      };

      const printName = (hasDiffVersion ? chalk.red : chalk.cyan)(_.padStart(name, nameWidth, ' '));
      printOut += `${printName} ${versionList.length > 1 ? '─┬─' : '───'}${_.padEnd(' ' + firstVersion.ver + ' ', 12, ' ')} ${firstVersion.by}\n`;
      var i = versionList.length - 1;
      for (const rest of versionList.slice(1)) {
        dependentInfos.by.push({ver: rest.ver, name: rest.by});
        printOut += `${_.repeat(' ', nameWidth)} ${i === 1 ? ' └─' : ' ├─'}${_.padEnd(' ' + rest.ver + ' ', 12, ' ')} ${rest.by}\n`;
        i--;
      }
      countDep++;
      // hoistDeps[name] = firstVersion.ver;
      dependentInfo.set(name, dependentInfos);
    }
    printOut += _.pad(` total ${chalk.green(countDep)} `, 60, '-');
    this.verbosMessage = printOut;

    return dependentInfo;
  }

  protected _trackDependency(name: string, version: string, byWhom: string) {
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

  protected _containsDiffVersion(sortedVersions: DepInfo[]) {
    // var self = this;
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
  protected sortByVersion(verInfoList: DepInfo[], name: string) {
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
}
