import * as fs from 'fs';
import * as _ from 'lodash';
import Path from 'path';
import ts from 'typescript';
import appTsconfig from '../../misc/tsconfig.app.json';
// import { DrcpSetting as NgAppBuilderSetting } from '../configurable';
import { findAppModuleFileFromMain } from '../utils/parse-app-module';
import { addSourceFiles as _addSourceFiles } from './add-tsconfig-file';
import { AngularBuilderOptions } from './common';
import {setTsCompilerOptForNodePath} from '@wfh/plink/wfh/dist/package-mgr/package-list-helper';
import {getState} from '@wfh/plink/wfh/dist/package-mgr';
// const currPackageName = require('../../package.json').name;

export type ParialBrowserOptions = Pick<AngularBuilderOptions, 'preserveSymlinks' | 'main' | 'fileReplacements'>;


export function createTsConfig(file: string, browserOptions: ParialBrowserOptions, reportDir: string) {

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
    const plink = getState().linkedDrcp;
    if (plink) {
      pathMapping![plink.name] = [plink.realPath];
      pathMapping![plink.name + '/*'] = [plink.realPath + '/*'];
    }
  }

  const tsConfigFileDir = Path.dirname(file);

  const tsjson: {compilerOptions: any, [key: string]: any, files?: string[], include?: string[]} = {
    compilerOptions: {
      ...appTsconfig.compilerOptions,
      baseUrl: cwd,
      preserveSymlinks,
      ...oldJson.compilerOptions,
      paths: {...appTsconfig.compilerOptions.paths, ...pathMapping}
    },
    angularCompilerOptions: {
      // trace: true
      ...oldJson.angularCompilerOptions
    }
  };
  setTsCompilerOptForNodePath(tsConfigFileDir, process.cwd(), tsjson.compilerOptions, {
    noTypeRootsInPackages: true,
    workspaceDir: process.cwd()
  });
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

  // console.log(tsjson.compilerOptions);
  const addSourceFiles = (require('./add-tsconfig-file') as {addSourceFiles: typeof _addSourceFiles}).addSourceFiles;

  if (!tsjson.files)
    tsjson.files = [];
  // We should not use "include" due to we have multiple projects in same source directory, it
  // will cause problem if unused file is included in TS compilation, not only about cpu/memory cost,
  // but also having problem like same component might be declared in multiple modules which is
  // consider as error in Angular compiler. 
  tsjson.files.push(...(addSourceFiles(tsjson.compilerOptions, tsjson.files, file,
    browserOptions.fileReplacements, reportDir).map(p => {
      if (Path.isAbsolute(p)) {
        return Path.relative(tsConfigFileDir, p).replace(/\\/g, '/');
      } else {
        return p;
      }
    })),
    Path.relative(tsConfigFileDir, Path.resolve(__dirname, '../../src/hmr.ts')).replace(/\\/g, '/')
  );

  return JSON.stringify(tsjson, null, '  ');
}

// function globRealPath(glob: string) {
//   const res = /^([^*]+)\/[^/*]*\*/.exec(glob);
//   if (res) {
//     return fs.realpathSync(res[1]).replace(/\\/g, '/') + res.input.slice(res[1].length);
//   }
//   return glob;
// }

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
