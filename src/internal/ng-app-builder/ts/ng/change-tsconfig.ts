import { PackageInfo } from 'dr-comp-package/wfh/dist/build-util/ts';
// import { DrcpConfig } from 'dr-comp-package/wfh/dist/config-handler';
import * as fs from 'fs';
import * as _ from 'lodash';
import Path from 'path';
import ts from 'typescript';
import appTsconfig from '../../misc/tsconfig.app.json';
import { DrcpSetting as NgAppBuilderSetting } from '../configurable';
import { findAppModuleFileFromMain } from '../utils/parse-app-module';
import { addSourceFiles } from './add-tsconfig-file';
import { AngularBuilderOptions } from './common';
import {setTsCompilerOptForNodePath} from 'dr-comp-package/wfh/dist/config-handler';
import {getState} from 'dr-comp-package/wfh/dist/package-mgr';
// const currPackageName = require('../../package.json').name;

export type ParialBrowserOptions = Pick<AngularBuilderOptions, 'preserveSymlinks' | 'main' | 'fileReplacements'>;


export function createTsConfig(file: string,
  browserOptions: ParialBrowserOptions,
  config: NgAppBuilderSetting,
  packageInfo: PackageInfo,
  reportDir: string) {

  // const reportFile = config.resolve('destDir', 'ng-app-builder.report', 'tsconfig.json');
  return overrideTsConfig(file, packageInfo, browserOptions,
    config, reportDir);
}

/**
 * Let's override tsconfig.json files for Angular at rutime :)
 * - Read into memory
 * - Do not override properties of compilerOptions,angularCompilerOptions that exists in current file
 * - "extends" must be ...
 * - Traverse packages to build proper includes and excludes list and ...
 * - Find file where AppModule is in, find its package, move its directory to top of includes list,
 * 	which fixes ng cli windows bug
 */
function overrideTsConfig(file: string, pkInfo: PackageInfo,
  browserOptions: ParialBrowserOptions,
  config: NgAppBuilderSetting, reportDir: string): string {

  const cwd = process.cwd();
  const result = ts.parseConfigFileTextToJson(file, fs.readFileSync(file, 'utf8'));
  if (result.error) {
    // log.error(result.error);
    throw new Error(`${file} contains incorrect configuration:\n${result.error}`);
  }
  const oldJson = result.config;
  const preserveSymlinks = browserOptions.preserveSymlinks;
  const pathMapping: {[key: string]: string[]} | undefined = preserveSymlinks ? undefined : {};

  // type PackageInstances = typeof pkInfo.allModules;

  // let ngPackages: PackageInstances = pkInfo.allModules;

  const appModuleFile = findAppModuleFileFromMain(Path.resolve(browserOptions.main));
  const appPackageJson = lookupEntryPackage(appModuleFile);
  if (appPackageJson == null)
    throw new Error('Error, can not find package.json of ' + appModuleFile);

  if (!preserveSymlinks) {
    for (const pk of getState().srcPackages.values()) {
      const realDir = Path.relative(cwd, pk.realPath).replace(/\\/g, '/');
      pathMapping![pk.name] = [realDir];
      pathMapping![pk.name + '/*'] = [realDir + '/*'];
    }
  }

  // // Important! to make Angular & Typescript resolve correct real path of symlink lazy route module
  if (!preserveSymlinks) {
    const drcpDir = Path.relative(cwd, fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
    pathMapping!['dr-comp-package'] = [drcpDir];
    pathMapping!['dr-comp-package/*'] = [drcpDir + '/*'];
  }


  var tsjson: {compilerOptions: any, [key: string]: any, files?: string[], include: string[]} = {
    // extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
    include: config
      .tsconfigInclude
      .map(preserveSymlinks ? p => p : globRealPath)
      .map(
        pattern => Path.relative(Path.dirname(file), pattern).replace(/\\/g, '/')
      ),
    exclude: [], // tsExclude,
    compilerOptions: {
      ...appTsconfig.compilerOptions,
      baseUrl: cwd,
      // typeRoots: [
      //   Path.resolve(root, 'node_modules/@types'),
      //   Path.resolve(root, 'node_modules/@dr-types'),
      //   // Below is NodeJS only, which will break Angular Ivy engine
      //   Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
      // ],
      // module: 'esnext',
      preserveSymlinks,
      ...oldJson.compilerOptions,
      paths: {...appTsconfig.compilerOptions.paths, ...pathMapping}
    },
    angularCompilerOptions: {
      // trace: true
      ...oldJson.angularCompilerOptions
    }
  };
  setTsCompilerOptForNodePath(cwd, tsjson.compilerOptions, {enableTypeRoots: false});
  tsjson.compilerOptions.baseUrl = cwd;
  // Object.assign(tsjson.compilerOptions.paths, appTsconfig.compilerOptions.paths, pathMapping);

  if (oldJson.extends) {
    tsjson.extends = oldJson.extends;
  }

  if (oldJson.compilerOptions.paths) {
    Object.assign(tsjson.compilerOptions.paths, oldJson.compilerOptions.paths);
  }
  if (oldJson.include) {
    tsjson.include = _.union((tsjson.include as string[]).concat(oldJson.include));
  }
  if (oldJson.exclude) {
    tsjson.exclude = _.union((tsjson.exclude as string[]).concat(oldJson.exclude));
  }
  if (oldJson.files)
    tsjson.files = oldJson.files;

  const sourceFiles: typeof addSourceFiles = require('./add-tsconfig-file').addSourceFiles;

  if (!tsjson.files)
    tsjson.files = [];
  // We should not use "include" due to we have multiple projects in same source directory, it
  // will cause problem if unused file is included in TS compilation, not only about cpu/memory cost,
  // but also having problem like same component might be declared in multiple modules which is
  // consider as error in Angular compiler. 
  tsjson.files.push(...(sourceFiles(tsjson.compilerOptions, tsjson.files, file,
    browserOptions.fileReplacements, reportDir)));

  return JSON.stringify(tsjson, null, '  ');
}

function globRealPath(glob: string) {
  const res = /^([^*]+)\/[^/*]*\*/.exec(glob);
  if (res) {
    return fs.realpathSync(res[1]).replace(/\\/g, '/') + res.input.slice(res[1].length);
  }
  return glob;
}

function lookupEntryPackage(lookupDir: string): any {
  while (true) {
    const pk = Path.join(lookupDir, 'package.json');
    if (fs.existsSync(pk)) {
      return require(pk);
    } else if (lookupDir === Path.dirname(lookupDir)) {
      break;
    }
    lookupDir = Path.dirname(lookupDir);
  }
  return null;
}
