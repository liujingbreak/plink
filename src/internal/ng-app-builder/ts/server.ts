/* tslint:disable max-line-length */
import * as _fs from 'fs-extra';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import * as Path from 'path';
import * as ts from 'typescript';
import api from '__api';
import { ReplacementInf, TsHandler } from './utils/ts-before-aot';

export * from './configurable';
// export * from './ng-prerender';
export * from './ng/common';

const semver = require('semver');
const {red, yellow} = require('chalk');

const log = log4js.getLogger(api.packageName);


export let tsHandler: TsHandler = resolveImports;
function resolveImports(src: ts.SourceFile): ReplacementInf[] {
  return [];
}

export async function init() {
  if (!checkAngularVersion())
    throw new Error('Angular version check Error');
  checkAngularCliDepVersion();
  // writeTsconfig();
  hackFixWatchpack();
}

export function activate() {
}

function checkAngularVersion() {
  const deps: {[k: string]: string} = {
    '@angular-devkit/build-angular': '~0.803.12',
    '@angular/cli': '~8.3.12',
    '@angular/compiler-cli': '~8.2.11',
    '@angular/language-service': '~8.2.11'
  };
  let valid = true;
  _.each(deps, (expectVer, mod) => {
    const ver = require(mod + '/package.json').version;
    if (!semver.satisfies(ver, expectVer)) {
      valid = false;
      log.error(yellow(`Installed dependency "${mod}@`) + red(ver) + yellow(`" version is not supported, install ${expectVer} instead.`));
    }
  });

  try {
    const duplicate = require.resolve('@angular-devkit/build-angular/node_modules/webpack/package.json');
    log.error(`Duplicate dependency is found in "${duplicate}",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
    valid = false;
  } catch (ex) {}

  if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@angular-devkit')) {
    log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@angular-devkit",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
    valid = false;
  }
  if (_fs.existsSync('@angular-devkit/build-angular/node_modules/@ngtools/webpack')) {
    log.error(`Duplicate dependency is found in "@angular-devkit/build-angular/node_modules/@ngtools/webpack",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
    valid = false;
  }
  try {
    const duplicate = require.resolve('@angular-devkit/architect/node_modules/rxjs/package.json');
    log.error(`Duplicate dependency is found in "${duplicate}",\n
		DRCP failed to delete some files for unknow reason, please try this command again`);
    valid = false;
  } catch (ex) {}
  return valid;
}

function checkAngularCliDepVersion() {
  const ngDeps: {[name: string]: string} = require('@angular-devkit/build-angular/package.json').dependencies;
  const ourDeps: {[name: string]: string} = require('../package.json').dependencies;

  let msg = '';
  for (const ngDep of Object.keys(ngDeps)) {
    if (_.has(ourDeps, ngDep) && ourDeps[ngDep] !== ngDeps[ngDep]) {
      msg += `Different version of dependency between @angular-devkit/build-angular and ng-app-builder:\n  ${ngDep}@${ngDeps[ngDep]} vs ${ngDep}@${ourDeps[ngDep]}\n`;
    }
  }
  if (msg.length > 0) {
    throw new Error(`You need to contact author of ng-app-builder for:\n${msg}`);
  }
}


/**
 * https://github.com/webpack/watchpack/issues/61
 */
function hackFixWatchpack() {
  const watchpackPath = ['webpack/node_modules/watchpack', 'watchpack'].find(path => {
    return _fs.existsSync(Path.resolve('node_modules/' + path + '/lib/DirectoryWatcher.js'));
  });
  if (!watchpackPath) {
    log.warn('Can not find watchpack, please make sure Webpack is installed.');
    return;
  }
  const target = Path.resolve('node_modules/' + watchpackPath + '/lib/DirectoryWatcher.js');
  if (_fs.existsSync(target + '.drcp-bak'))
    return;
  log.info(`hacking ${target}\n\t to workaround issue: https://github.com/webpack/watchpack/issues/61`);
  _fs.renameSync(target, target + '.drcp-bak');
  _fs.writeFileSync(target,
    _fs.readFileSync(target + '.drcp-bak', 'utf8').replace(/\WfollowSymlinks:\sfalse/g, 'followSymlinks: true'), 'utf8');
}
