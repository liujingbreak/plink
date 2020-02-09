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
  fileReplacements: AngularBuilderOptions['fileReplacements'], reportDir: string) {
  const projDir = Path.dirname(tsconfigFile);
  const g = new Graph(jsonToCompilerOptions(compilerOptions), fileReplacements,
    file => {
      const content = sys.readFile(file, 'utf8');
      return api.browserInjector.injectToFile(file, content || '');
    });

  parentPort!.postMessage({log: 'TS entris:\n' + entryFiles.map(file => '  ' + chalk.cyan(file)).join('\n')});

  for (const entryFile of entryFiles) {
    g.walkForDependencies(Path.resolve(projDir, entryFile));
  }
  parentPort!.postMessage({log: `${chalk.redBright(g.requestMap.size + '')} TS file included`});

  g.report(Path.resolve(reportDir, 'deps.txt'))
  .then(() => {
    parentPort!.postMessage({log: 'All TS file names are listed in:\n  ' + chalk.blueBright(Path.resolve(reportDir, 'deps.txt'))});
  })
  .catch(ex => {
    parentPort!.postMessage({log: ex.toString()});
  });
  // I must put all walked ts dependencies in Tsconfig json file, since some are package file located in
  // node_modules, by default Angular or tsc will exclude them
  return Array.from(g.requestMap.keys())
    .map(file => Path.relative(projDir, file).replace(/\\/g, '/'));
}





