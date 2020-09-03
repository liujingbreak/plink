// tslint:disable: no-console
/**
 * This file will run in worker thread
 */
import {parentPort} from 'worker_threads';
import Graph from '../ts-dep';
import {jsonToCompilerOptions} from 'dr-comp-package/wfh/dist/ts-compiler';
import api from '__api';
import { sys } from 'typescript';
import Path from 'path';
import chalk from 'chalk';
import { AngularBuilderOptions } from './common';
// import * as util from 'util';
// const log = require('log4js').getLogger('add-tsconfig-file');

  // initCli(browserOptions)
  // .then(drcpConfig => {
  //   return injectorSetup(pkInfo, drcpConfig, browserOptions);
  // });

export function addSourceFiles(compilerOptions: any, entryFiles: string[], tsconfigFile: string,
  fileReplacements: AngularBuilderOptions['fileReplacements'], reportDir: string): string[] {
  const projDir = Path.dirname(tsconfigFile);
  const g = new Graph(jsonToCompilerOptions(compilerOptions), fileReplacements,
    file => {
      const content = sys.readFile(file, 'utf8');
      return api.browserInjector.injectToFile(file, content || '');
    });

  let msg = 'TS entris:\n' + entryFiles.map(file => '  ' + chalk.cyan(file)).join('\n');
  if (parentPort)
    parentPort.postMessage({log: msg});

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





