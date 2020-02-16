/* tslint:disable max-line-length */
import { boxString } from 'dr-comp-package/wfh/dist/utils';
import * as _fs from 'fs-extra';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import * as Path from 'path';
import * as ts from 'typescript';
import api from '__api';
import { ReplacementInf, TsHandler } from './utils/ts-before-aot';
const {parse} = require('comment-json');

export * from './config-webpack';
export * from './configurable';
export * from './ng-prerender';
export { AngularConfigHandler } from './ng/change-cli-options';
export * from './ng/common';

const semver = require('semver');
const {red, yellow} = require('chalk');

// const fs = require('fs-extra');
// const sysFs = fs as typeof _fs & {mkdirsSync: (file: string) => void};
const log = log4js.getLogger(api.packageName);

export function compile() {
  // return setupApiForAngularCli();
}

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
  writeTsconfig4Editor();
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

function writeTsconfig4Editor() {
  const tsjson: any = {
    extends: null
  };
  // ------- Write tsconfig.json for Visual Code Editor --------

  let srcDirCount = 0;
  const root = api.config().rootPath;

  const packageToRealPath: Array<[string, string]> = [];
  require('dr-comp-package/wfh/lib/packageMgr/packageUtils')
  .findAllPackages((name: string, entryPath: string, parsedName: string, json: any, packagePath: string) => {
    const realDir = _fs.realpathSync(packagePath);
    // Path.relative(root, realDir).replace(/\\/g, '/');
    packageToRealPath.push([name, realDir]);
  }, 'src');

  const recipeManager = require('dr-comp-package/wfh/dist/recipe-manager');

  for (let proj of api.config().projectList) {
    tsjson.include = [];
    tsjson.extends = Path.relative(proj, require.resolve('dr-comp-package/wfh/tsconfig.json'));
    if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
      tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    recipeManager.eachRecipeSrc(proj, (srcDir: string) => {
      let includeDir = Path.relative(proj, srcDir).replace(/\\/g, '/');
      if (includeDir && includeDir !== '/')
        includeDir += '/';
      tsjson.include.push(includeDir + '**/*.ts');
      tsjson.include.push(includeDir + '**/*.tsx');
      srcDirCount++;
    });
    log.info('Write tsconfig.json to ' + proj);
    const pathMapping: {[key: string]: string[]} = {};
    for (const [name, realPath] of packageToRealPath) {
      const realDir = Path.relative(proj, realPath).replace(/\\/g, '/');
      pathMapping[name] = [realDir];
      pathMapping[name + '/*'] = [realDir + '/*'];
    }

    const drcpDir = Path.relative(root, _fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
    pathMapping['dr-comp-package'] = [drcpDir];
    pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
    // pathMapping['*'] = ['node_modules/*', 'node_modules/@types/*'];

    tsjson.compilerOptions = {
      rootDir: './',
      baseUrl: root,
      // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
      paths: pathMapping,
      skipLibCheck: false,
      jsx: 'preserve',
      // typeRoots: [
      //   Path.join(root, 'node_modules/@types'),
      //   Path.join(root, 'node_modules/@dr-types'),
      //   Path.join(Path.dirname(require.resolve('dr-comp-package/package.json')), '/wfh/types')
      // ],
      noImplicitAny: true,
      target: 'es2015',
      module: 'commonjs'
    };
    const tsconfigFile = Path.resolve(proj, 'tsconfig.json');
    if (_fs.existsSync(tsconfigFile)) {
      const existingJson = parse(_fs.readFileSync(tsconfigFile, 'utf8'));
      const co = existingJson.compilerOptions;
      const newCo = tsjson.compilerOptions;
      co.typeRoots = newCo.typeRoots;
      co.baseUrl = newCo.baseUrl;
      co.paths = newCo.paths;
      co.rootDir = newCo.rootDir;

      existingJson.extends = tsjson.extends;
      existingJson.include = tsjson.include;

      _fs.writeFileSync(Path.resolve(proj, 'tsconfig.json'), JSON.stringify(existingJson, null, '  '));
    } else {
      _fs.writeFileSync(Path.resolve(proj, 'tsconfig.json'), JSON.stringify(tsjson, null, '  '));
    }
  }


  if (srcDirCount > 0) {
    log.info('\n' + boxString('To be friendly to your editor, we just added tsconfig.json file to each of your project directories,\n' +
    'But please add "tsconfig.json" to your .gitingore file,\n' +
    'since these tsconfig.json are generated based on your local workspace location.'));
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
