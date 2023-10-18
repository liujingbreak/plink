"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable prefer-rest-params */
/**
 * @Deprecated
 * For fork-ts-checker-webpack-plugin 4.1.6,
 * patch some dark magic to Typescript compiler
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
const path_1 = tslib_1.__importDefault(require("path"));
const loaderHooks_1 = require("@wfh/plink/wfh/dist/loaderHooks");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const resolve_1 = tslib_1.__importDefault(require("resolve"));
const plink_1 = require("@wfh/plink");
const __plink_1 = tslib_1.__importDefault(require("__plink"));
const forkTsDir = path_1.default.resolve('node_modules', 'fork-ts-checker-webpack-plugin') + path_1.default.sep;
const tsJs = resolve_1.default.sync('typescript', { basedir: forkTsDir });
const log = (0, plink_1.log4File)(__filename);
log.info(' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);
const localTs = require(tsJs);
const cwd = process.cwd();
const createWatchCompilerHost = localTs.createWatchCompilerHost;
localTs.createWatchCompilerHost = function (configFileName, optionsToExtend, ...restArgs) {
    // const co = changeTsConfigFile().compilerOptions;
    // const host: ts.WatchCompilerHost<ts.BuilderProgram> = createWatchCompilerHost.apply(this, [configFileName, co, ...restArgs] as any);
    // log.info('createWatchCompilerHost:', configFileName);
    const host = createWatchCompilerHost.apply(this, [configFileName, optionsToExtend, ...restArgs]);
    const readFile = host.readFile;
    host.readFile = function (path, encoding) {
        const content = readFile.apply(this, arguments);
        if (!path.endsWith('.d.ts') && !path.endsWith('.json') && content) {
            log.info('WatchCompilerHost.readFile', path);
            const changed = __plink_1.default.browserInjector.injectToFile(path, content);
            if (changed !== content) {
                log.info(path_1.default.relative(cwd, path) + ' is patched');
                return changed;
            }
        }
        return content;
    };
    return host;
};
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
(0, loaderHooks_1.hookCommonJsRequire)((filename, target, rq, resolve) => {
    if (filename.startsWith(forkTsDir)) {
        if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
            log.info(chalk_1.default.cyan('monkey-patch typescript'));
            return localTs;
        }
    }
});
//# sourceMappingURL=hack-fork-ts-checker-worker.js.map