/* eslint-disable no-console */
/**
 * This file will run in worker thread
 */
import {parentPort} from 'worker_threads';
import Graph from '../ts-dep';
import {jsonToCompilerOptions} from '@wfh/plink/wfh/dist/ts-compiler';
import api from '__api';
import { sys } from 'typescript';
import Path from 'path';
import chalk from 'chalk';
import { AngularBuilderOptions } from './common';
import * as pkgMgr from '@wfh/plink/wfh/dist/package-mgr';

// const log = require('log4js').getLogger(api.packageName + '.add-tsconfig-file');

export function addSourceFiles(compilerOptions: any, entryFiles: string[], tsconfigFile: string,
  fileReplacements: AngularBuilderOptions['fileReplacements'], reportDir: string): string[] {

  // console.log('addSourceFiles: compilerOptions', compilerOptions);
  const projDir = Path.dirname(tsconfigFile);

  const {getState, workspaceKey} = require('@wfh/plink/wfh/dist/package-mgr') as typeof pkgMgr;

  // const cwd = process.cwd();
  const installedPkgs = getState().workspaces.get(workspaceKey(process.cwd()))!.installedComponents!;
  // log.info(compilerOptions);
  // compilerOptions = addAdditionalPathsForTsResolve(projDir, compilerOptions);
  const co = jsonToCompilerOptions(compilerOptions, tsconfigFile, projDir);
  // log.info(tsconfigFile, co);
  const g = new Graph(co, fileReplacements,
    path => {
      const els = path.split('/');
      const hasScopename = els[0].startsWith('@');
      const pkName = hasScopename ? els[0] + '/' + els[1] : els[0];
      const pk = installedPkgs.get(pkName);
      if (pk != null) {
        return [pk.realPath.replace(/\\/g, '/'), ...(hasScopename ? els.slice(2) : els.slice(1))].join('/') + '.ts';
      }
    },
    file => {
      const content = sys.readFile(file, 'utf8');
      const changed = api.browserInjector.injectToFile(file, content || '');
      return changed;
    });

  let msg = 'TS entris:\n' + entryFiles.map(file => '  ' + chalk.cyan(file)).join('\n');
  if (parentPort)
    parentPort.postMessage({log: msg});
  else
    console.log(msg);

  for (const entryFile of entryFiles) {
    g.walkForDependencies(Path.resolve(projDir, entryFile));
  }

  msg = `${chalk.redBright(g.requestMap.size + '')} TS file included`;
  if (parentPort)
    parentPort.postMessage({log: msg});
  else
    console.log(msg);

  g.report(Path.resolve(reportDir, 'deps.txt'))
  .then(() => {
    const msg = 'All TS file names are listed in:\n  ' + chalk.blueBright(Path.resolve(reportDir, 'deps.txt'));
    if (parentPort)
      parentPort.postMessage({log: msg});
    else
      console.log(msg);
  })
  .catch(ex => {
    if (parentPort)
      parentPort.postMessage({log: ex.toString()});
    else
      console.log(ex.toString());
  });
  // I must explicitly involve "external" ts dependencies in Tsconfig json file, since some are package file located in
  // node_modules, by default Angular or tsc will exclude them, in AOT mode we use preserve-symblink option
  // so that some symlink source file is considered in node_modules.
  return Array.from(g.loadChildren.keys())
    // .map(file => Path.relative(projDir, file).replace(/\\/g, '/'))
    .concat(Array.from(g.externals.values()).filter(external => !g.loadChildren.has(external)));
}


// function addAdditionalPathsForTsResolve(tsconfigDir: string, compilerOptions: {paths: {[key: string]: string[]}}) {
//   const {getState, workspaceKey} = require('@wfh/plink/wfh/dist/package-mgr') as typeof pkgMgr;

//   const cwd = process.cwd();
//   const installedPkgs = getState().workspaces.get(workspaceKey(process.cwd()))!.installedComponents!;
//   const pathMap: {[key: string]: string[]} = {};

//   for (const pk of installedPkgs.values()) {
//     pathMap[pk.name] = [Path.relative(cwd, pk.realPath).replace(/\\/g, '/')];
//     pathMap[pk.name + '/*'] = [Path.relative(cwd, pk.realPath).replace(/\\/g, '/') + '/*'];
//   }

//   return {
//     ...compilerOptions,
//     paths: {
//       ...compilerOptions.paths,
//       ...pathMap
//     }
//   };
// }



