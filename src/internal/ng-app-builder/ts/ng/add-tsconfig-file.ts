import Graph from '../ts-dep';
import {jsonToCompilerOptions} from 'dr-comp-package/wfh/dist/ts-compiler';
import api from '__api';
import { sys } from 'typescript';
import { AngularBuilderOptions } from './common';
import Path from 'path';
import chalk from 'chalk';

const log = require('log4js').getLogger('add-tsconfig-file');


export function addSourceFiles(compilerOptions: any, entryFiles: string[], tsconfigFile: string,
  fileReplacements: AngularBuilderOptions['fileReplacements']): string[] {

  const projDir = Path.dirname(tsconfigFile);
  const g = new Graph(jsonToCompilerOptions(compilerOptions), fileReplacements,
    file => {
      const content = sys.readFile(file, 'utf8');
      return api.browserInjector.injectToFile(file, content || '');
    });

  log.info('TS entris:\n' + entryFiles.map(file => '  ' + chalk.cyan(file)).join('\n'));

  for (const entryFile of entryFiles) {
    g.walkForDependencies(Path.resolve(projDir, entryFile));
  }
  log.info(`${chalk.redBright(g.requestMap.size + '')} TS file included`);

  const logFile = api.config.resolve('destDir', 'ng-app-builder.report', 'ts-deps.txt');
  g.report(logFile)
  .then(() => {
    log.info('All TS file names are listed in:\n  ' + chalk.blueBright(logFile));
  });
  // I must put all walked ts dependencies in Tsconfig json file, since some are package file located in
  // node_modules, by default Angular or tsc will exclude them
  return Array.from(g.requestMap.keys())
    .map(file => Path.relative(projDir, file).replace(/\\/g, '/'));
}

