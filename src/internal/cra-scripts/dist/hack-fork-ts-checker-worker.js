"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Hack fork-ts-checker-webpack-plugin:
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
const loaderHooks_1 = require("@wfh/plink/wfh/dist/loaderHooks");
// import {getState} from '@wfh/plink/wfh/dist/package-mgr';
// import {getRootDir} from '@wfh/plink/wfh/dist';
// import {closestCommonParentDir} from '@wfh/plink/wfh/dist/utils/misc';
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const resolve_1 = __importDefault(require("resolve"));
const change_tsconfig_1 = require("./change-tsconfig");
// import {setTsCompilerOptForNodePath} from '@wfh/plink/wfh/dist/config-handler';
const indexJs = process.env._plink_cra_scripts_indexJs;
// const tsconfigFile = process.env._plink_cra_scripts_tsConfig!;
// const tsCoJson = ts.readConfigFile(tsconfigFile, (file) => fs.readFileSync(file, 'utf-8')).config.compilerOptions;
// const plinkRoot = getRootDir();
const forkTsDir = path_1.default.resolve('node_modules', 'fork-ts-checker-webpack-plugin') + path_1.default.sep;
const tsJs = resolve_1.default.sync('typescript', { basedir: forkTsDir });
// tslint:disable-next-line: no-console
console.log(chalk_1.default.cyan('[hack-for-ts-checker]') + ' fork-ts-checker-webpack-plugin runs, ' + forkTsDir);
const hackedTs = require(tsJs);
const _createPrm = hackedTs.createProgram;
hackedTs.createProgram = function (rootNames, options, host) {
    try {
        const tsConfigJson = change_tsconfig_1.changeTsConfigFile();
        let changedRootNames = [indexJs.replace(/\\/g, '/')];
        // console.log(new Error().stack);
        // Because createProgram() is overloaded, it might accept 1 or 5 parameters
        if (arguments.length === 1) {
            options = arguments[0].options;
            host = arguments[0].host;
            arguments[0].rootNames = changedRootNames;
            arguments[0].options.rootDir = tsConfigJson.compilerOptions.rootDir;
            arguments[0].options.paths = tsConfigJson.compilerOptions.paths;
            arguments[0].options.typeRoots = tsConfigJson.compilerOptions.typeRoots;
        }
        else {
            arguments[0] = changedRootNames;
            arguments[1].rootDir = tsConfigJson.compilerOptions.rootDir;
            arguments[1].paths = tsConfigJson.compilerOptions.paths;
            arguments[1].typeRoots = tsConfigJson.compilerOptions.typeRoots;
        }
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
    }
    catch (ex) {
        console.error('[hack-fork-ts-checker-worker] Error', ex);
        throw ex;
    }
};
Object.assign(hackedTs.createProgram, _createPrm);
loaderHooks_1.hookCommonJsRequire((filename, target, rq, resolve) => {
    if (filename.startsWith(forkTsDir)) {
        // console.log(filename, target);
        if (target.indexOf('typescript') >= 0 && resolve(target) === tsJs) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.cyan('[hack-for-ts-checker]') + ' monkey-patch typescript');
            // const ts: typeof _ts = require('typescript');
            return hackedTs;
        }
    }
});

//# sourceMappingURL=hack-fork-ts-checker-worker.js.map
