/* eslint-disable prefer-rest-params */
/**
 * @Deprecated
 * For fork-ts-checker-webpack-plugin 4.1.6,
 * patch some dark magic to Typescript compiler
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
import Path from 'path';
import {hookCommonJsRequire} from '@wfh/plink/wfh/dist/loaderHooks';
import chalk from 'chalk';
import ts, {CompilerOptions/* , CompilerHost, CreateProgramOptions*/} from 'typescript';
import nodeResolve from 'resolve';
import {log4File} from '@wfh/plink';
import plink from '__plink';

const forkTsDir = Path.resolve('node_modules', 'fork-ts-checker-webpack-plugin') + Path.sep;
const tsJs = nodeResolve.sync('typescript', {basedir: forkTsDir});
const log = log4File(__filename);

log.info(' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);

const localTs = require(tsJs) as typeof ts;
const cwd = process.cwd();
const createWatchCompilerHost = localTs.createWatchCompilerHost;

localTs.createWatchCompilerHost = function(this: typeof ts, configFileName: string | string[], optionsToExtend: CompilerOptions | undefined,
  ...restArgs: unknown[]) {

  // const co = changeTsConfigFile().compilerOptions;
  // const host: ts.WatchCompilerHost<ts.BuilderProgram> = createWatchCompilerHost.apply(this, [configFileName, co, ...restArgs] as any);
  // log.info('createWatchCompilerHost:', configFileName);
  const host: ts.WatchCompilerHost<ts.BuilderProgram> = createWatchCompilerHost.apply(this, [configFileName, optionsToExtend, ...restArgs] as any);
  const readFile = host.readFile;
  host.readFile = function(path: string, encoding?: string) {
    const content = readFile.apply(this, arguments as any);
    if (!path.endsWith('.d.ts') && !path.endsWith('.json') && content) {
      log.info('WatchCompilerHost.readFile', path);
      const changed = plink.browserInjector!.injectToFile(path, content);
      if (changed !== content) {
        log.info(Path.relative(cwd, path) + ' is patched');
        return changed;
      }
    }
    return content;
  };
  return host;
} as typeof createWatchCompilerHost;

// Patch createProgram to change "rootFiles"
// const _createPrm = localTs.createProgram;
// localTs.createProgram = function(rootNames: readonly string[], options: CompilerOptions, host?: CompilerHost) {
//   try {
//     // const co = changeTsConfigFile();
//     const changedRootNames: string[] = [indexJs.replace(/\\/g, '/')];
//     // Because createProgram() is overloaded, it might accept 1 or 5 parameters
//     if (arguments.length === 1) {
//       options = (arguments[0] as CreateProgramOptions).options;
//       host = (arguments[0] as CreateProgramOptions).host;
//       (arguments[0] as CreateProgramOptions).rootNames = changedRootNames;
//     } else {
//       arguments[0] = changedRootNames;
//     }
//     // options.baseUrl = co.baseUrl;
//     // options.rootDir = co.rootDir;
//     // options.paths = co.paths;
//     // options.typeRoots = co.typeRoots;

//     // eslint-disable-next-line no-console
//     // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts program "rootNames":', (arguments[0] as CreateProgramOptions).rootNames);
//     // eslint-disable-next-line no-console
//     // console.log(chalk.cyan('[hack-for-ts-checker]') + ' ts compilerOptions:\n', options);

//     const program: ts.Program = _createPrm.apply(localTs, arguments as any);
//     return program;
//   } catch (ex) {
//     console.error('[hack-fork-ts-checker-worker] Error', ex);
//     throw ex;
//   }
// } as typeof _createPrm;
// Object.assign(localTs.createProgram, _createPrm);

hookCommonJsRequire((filename, target, rq, resolve) => {
  if (filename.startsWith(forkTsDir)) {
    if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
      log.info(chalk.cyan('monkey-patch typescript'));
      return localTs;
    }
  }
});
