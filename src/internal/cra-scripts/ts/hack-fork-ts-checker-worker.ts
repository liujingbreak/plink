/**
 * Hack fork-ts-checker-webpack-plugin:
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
import {hookCommonJsRequire} from '@wfh/plink/wfh/dist/loaderHooks';
import chalk from 'chalk';
import Path from 'path';
import ts, {CompilerOptions, CompilerHost, CreateProgramOptions} from 'typescript';
import nodeResolve from 'resolve';
import {changeTsConfigFile} from './change-tsconfig';
import {log4File} from '@wfh/plink';

const indexJs = process.env._plink_cra_scripts_indexJs!;

const forkTsDir = Path.resolve('node_modules', 'fork-ts-checker-webpack-plugin') + Path.sep;
const tsJs = nodeResolve.sync('typescript', {basedir: forkTsDir});
const log = log4File(__filename);

log.info(chalk.cyan('[hack-for-ts-checker]') + ' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);

const hackedTs: typeof ts = require(tsJs);

const _createPrm = hackedTs.createProgram;
hackedTs.createProgram = function(rootNames: readonly string[], options: CompilerOptions, host?: CompilerHost) {
  try {
    const co = changeTsConfigFile();
    let changedRootNames: string[] = [indexJs.replace(/\\/g, '/')];
    // Because createProgram() is overloaded, it might accept 1 or 5 parameters
    if (arguments.length === 1) {
      options = (arguments[0] as CreateProgramOptions).options;
      host = (arguments[0] as CreateProgramOptions).host;
      (arguments[0] as CreateProgramOptions).rootNames = changedRootNames;
    } else {
      arguments[0] = changedRootNames;
    }
    options.baseUrl = co.baseUrl;
    options.rootDir = co.rootDir;
    options.paths = co.paths;
    options.typeRoots = co.typeRoots;

    // tslint:disable-next-line: no-console
    // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts program "rootNames":', (arguments[0] as CreateProgramOptions).rootNames);
    // tslint:disable-next-line: no-console
    // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts compilerOptions:\n', options);

    // if (host && (host.readFile as any)._hacked == null) {
    //   const rf = host.readFile;
    //   host.readFile = function(file) {
    //     // tslint:disable-next-line: no-console
    //     console.log(chalk.cyan('[hack-for-ts-checker]') + ' TS read', file);
    //     return rf.call(host, file);
    //   };
    //   (host.readFile as any)._hacked = true;
    // }
    return _createPrm.apply(hackedTs, arguments);
  } catch (ex) {
    console.error('[hack-fork-ts-checker-worker] Error', ex);
    throw ex;
  }
} as any;
Object.assign(hackedTs.createProgram, _createPrm);

hookCommonJsRequire((filename, target, rq, resolve) => {
  if (filename.startsWith(forkTsDir)) {
    if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
      log.info(chalk.cyan('[hack-for-ts-checker]') + ' monkey-patch typescript');
      return hackedTs;
    }
  }
});
