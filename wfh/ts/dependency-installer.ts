/* tslint:disable max-line-length */
import * as fs from 'fs';
import {mkdirpSync} from 'fs-extra';
import * as _ from 'lodash';
import * as Path from 'path';
const config = require('../lib/config');
const chalk = require('chalk');
const semver = require('semver');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename, '.js'));
const packageUtils = require('../lib/packageMgr/packageUtils');
const getPackageJsonGuarder = require('../lib/gulp/packageJsonGuarder');
import * as recipeManager from './recipe-manager';

export function listCompDependency(pkJsonFiles: string[], write: boolean, isDrcpSymlink: boolean) {
  // log.info('scan components from:\n', pkJsonFiles.join('\n'));
  const installer = new InstallManager();
  installer.scanSrcDeps(pkJsonFiles);
  installer.scanInstalledPeerDeps();
  return installer.printComponentDep(write, isDrcpSymlink);
}

interface DepInfo {
  ver: string;
  verNum: string;
  pre: string;
  by: string;
  path: string;
}

class InstallManager {

  srcDeps: {[pName: string]: DepInfo[]};
  versionReg = /^(\D*)(\d.*?)$/;
  componentMap: {[pName: string]: {ver: string, toInstall: boolean}};

  constructor() {
    if (!(this instanceof InstallManager)) {
      return new InstallManager();
    }
    this.srcDeps = {}; // src packages needed dependencies and all packages needed peer dependencies
    // this.peerDeps = {}; // all packages needed peer dependencies
  }

  scanSrcDeps(jsonFiles: string[]) {
    const self = this;
    this.componentMap = {};
    for (const packageJson of jsonFiles) {
      log.debug('scanSrcDepsAsync() ' + Path.relative(config().rootPath, packageJson));
      const json = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      if (!json.dr)
        continue;
      this.componentMap[json.name] = {ver: json.version, toInstall: false};
      const deps = json.dependencies;
      if (deps) {
        for (const name of Object.keys(deps)) {
          const version = deps[name];
          // log.debug('scanSrcDepsAsync() dep ' + name);
          self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
        }
      }
      if (json.devDependencies) {
        // log.warn(`$${json.name} contains "devDepenendies", if they are necessary for compiling this component` +
        // 	'you should move them to "dependencies" or "peerDependencies"');
        for (const name of Object.keys(json.devDependencies)) {
          const version = json.devDependencies[name];
          self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
        }
      }
      if (json.peerDependencies) {
        for (const name of Object.keys(json.peerDependencies)) {
          const version = json.peerDependencies[name];
          self._trackDependency(this.srcDeps, name, version, json.name, packageJson);
        }
      }
    }
  }

  scanInstalledPeerDeps() {
    // TODO: Here I want to determine expected component version to install with, but so far the version number of each component that I get is currently installed
    // one which might be incorrect or outdated, in case like developer did not run "yarn install" before "drcp init".
    // One problem is: 
    // Without running "yarn install" to download "recipe" package, I can't know exact up to date version number of those components
    // which belong to a certain "recipe" pacakge.
    // So firstly, always "yarn install" before "drcp init"

    // Another problem is:
    // These old component versions are tracked in dist/dr.package.json waiting for being compared with newly changed version list.
    // But ...
    packageUtils.findAllPackages((name: string, entryPath: string, parsedName: string, json: any, packagePath: string) => {
      if (_.has(this.componentMap, name))
        return; // Skip it, since most likely there is a duplicate "installed" dependency in package.json against an symbolic linked component
      this.componentMap[name] = {ver: json.version, toInstall: true};
      _.each(json.peerDependencies, (version, name) => {
        this._trackDependency(this.srcDeps, name, version, json.name, Path.join(packagePath, 'package.josn'));
      });
    }, 'installed');
  }

  /**
	 * @return true if there are newly found dependencies added to package.json
	 */
  printComponentDep(write: boolean, isDrcpSymlink: boolean) {
    const self = this;
    const rootPath = config().rootPath;
    const packageJsonGuarder = getPackageJsonGuarder(rootPath);
    var mainPkjson, mainDeps: {[name: string]: string};

    if (!packageJsonGuarder.isPackageJsonDirty) {
      const mainPkFile = Path.resolve(rootPath, 'package.json');
      log.info('Checking', mainPkFile);
      mainPkjson = JSON.parse(fs.readFileSync(mainPkFile, 'utf8'));
      mainDeps = mainPkjson.dependencies;
      if (mainDeps == null)
        mainDeps = mainPkjson.dependencies = {};
      if (process.env.NODE_ENV === 'development')
        _.assign(mainDeps, mainPkjson.devDependencies);
      _.each(packageJsonGuarder.getChanges().dependencies, (ver, name) => {
        // If there is a same dependency in original package.json, we use the version of that one, cuz' that might be manually set
        if (!_.has(mainDeps, name))
          mainDeps[name] = ver;
      });
    } else {
      mainPkjson = packageJsonGuarder.getChanges();
      mainDeps = mainPkjson.dependencies;
    }

    const depNames = Object.keys(this.srcDeps);
    depNames.sort();
    // var peerDepNames = Object.keys(this.peerDeps);
    if (depNames.length === 0)
      return;
      const nameWidth = _.maxBy(depNames, name => name.length).length;

    // log.warn(Object.keys(this.componentMap));

    if (depNames.length > 0) {
      let printOut = _.pad(' Associated Components Dependencies & ' + chalk.cyan('Components Peer Dependencies'), 60, '-') + '\n';
      printOut += _.padStart('Dependency ', nameWidth + 13) + '| By\n';
      printOut += _.repeat('-', nameWidth + 13) + '|' + _.repeat('-', 10) + '\n';
      let countDep = 0;
      for (const name of depNames) {
        const versionList = this.srcDeps[name];
        const firstVersion = self.sortByVersion(versionList, name)[0];
        let markNew = '  ';
        if (name !== '@dr/internal-recipe' && (!_.has(this.componentMap, name)) &&
          (mainDeps[name] !== firstVersion.ver)) {
          mainDeps[name] = firstVersion.ver;
          markNew = '+ ';
        }

        const hasDiffVersion = self._containsDiffVersion(versionList);
        const printName = (hasDiffVersion ? chalk.red : chalk.cyan)(_.padStart(markNew + name, nameWidth, ' '));
        printOut += `${printName} ${versionList.length > 1 ? '─┬─' : '───'}${_.padEnd(firstVersion.ver, 9, '─')} ${firstVersion.by}\n`;
        var i = versionList.length - 1;
        for (const rest of versionList.slice(1)) {
          printOut += `${_.repeat(' ', nameWidth)} ${i === 1 ? ' └─' : ' ├─'}${_.padEnd(rest.ver, 9, '─')} ${rest.by}\n`;
          i--;
        }
        countDep++;
      }
      printOut += _.pad(` total ${chalk.green(countDep)} `, 60, '-');
      log.info(printOut);
    }
    mkdirpSync(config().destDir);
    if (write) {
      // _.assign(mainPkjson.dependencies, newDepJson);
      _.each(mainDeps, (ver, name) => {
        if (_.get(this.componentMap, [name, 'toInstall']) as any === false) {
          delete mainDeps[name];
          log.info(chalk.blue('Remove source linked dependency: ' + name));
        }
      });
      recipeManager.eachRecipeSrc((srcDir: string, recipeDir: string, recipeName: string) => {
        if (recipeName && _.has(mainDeps, recipeName)) {
          delete mainDeps[recipeName];
          log.info(chalk.blue('Remove recipe dependency: ' + recipeName));
        }
      });
      const changeList: Array<[string, string]> = packageJsonGuarder.markChanges(mainPkjson);
      const needInstall = _.size(changeList) > 0;
      if (needInstall) {
        const changed = [];
        const removed = [];
        for (const row of changeList) {
          if (row[1] == null)
            removed.push(row[0]);
          else
            changed.push(row[0] + '@' + row[1]);
        }
        if (changed.length > 0)
          log.info('Changed dependencies:', changed.join(', '));
        if (removed.length > 0)
          log.info(chalk.blue('Removed dependencies:'), removed.join(', '));
      }
      // fs.writeFileSync(mainPkFile, JSON.stringify(mainPkjson, null, '  '));
      // log.info('%s is written.', mainPkFile);
      return needInstall;
    }
    return false;
  }

  protected _trackDependency(trackTo: {[pName: string]: DepInfo[]}, name: string, version: string, byWhom: string, path: string) {
    if (!_.has(trackTo, name)) {
      trackTo[name] = [];
    }
    const m = this.versionReg.exec(version);
    trackTo[name].push({
      ver: version === '*' ? '' : version,
      verNum: m ? m[2] : null,
      pre: m ? m[1] : '',
      by: byWhom,
      path
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
    if (verInfoList == null)
      return verInfoList;
    try {
      verInfoList.sort((info1, info2) => {
        if (info1.verNum != null && info2.verNum != null) {
          const res = semver.rcompare(info1.verNum, info2.verNum);
          if (res === 0)
            return info1.pre === '' && info2.pre !== '' ? -1 :
              (info1.pre !== '' && info2.pre === '' ? 1 : 0);
          else
            return res;
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
