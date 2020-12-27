"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSourceFiles = void 0;
// tslint:disable: no-console
/**
 * This file will run in worker thread
 */
const worker_threads_1 = require("worker_threads");
const ts_dep_1 = __importDefault(require("../ts-dep"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const __api_1 = __importDefault(require("__api"));
const typescript_1 = require("typescript");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const log = require('log4js').getLogger(__api_1.default.packageName + '.add-tsconfig-file');
function addSourceFiles(compilerOptions, entryFiles, tsconfigFile, fileReplacements, reportDir) {
    // console.log('addSourceFiles: compilerOptions', compilerOptions);
    const projDir = path_1.default.dirname(tsconfigFile);
    const { getState, workspaceKey } = require('@wfh/plink/wfh/dist/package-mgr');
    // const cwd = process.cwd();
    const installedPkgs = getState().workspaces.get(workspaceKey(process.cwd())).installedComponents;
    // compilerOptions = addAdditionalPathsForTsResolve(projDir, compilerOptions);
    log.info(compilerOptions);
    const g = new ts_dep_1.default(ts_compiler_1.jsonToCompilerOptions(compilerOptions), fileReplacements, path => {
        const els = path.split('/');
        const hasScopename = els[0].startsWith('@');
        const pkName = hasScopename ? els[0] + '/' + els[1] : els[0];
        const pk = installedPkgs.get(pkName);
        if (pk != null) {
            return [pk.realPath.replace(/\\/g, '/'), ...(hasScopename ? els.slice(2) : els.slice(1))].join('/') + '.ts';
        }
    }, file => {
        const content = typescript_1.sys.readFile(file, 'utf8');
        const changed = __api_1.default.browserInjector.injectToFile(file, content || '');
        return changed;
    });
    let msg = 'TS entris:\n' + entryFiles.map(file => '  ' + chalk_1.default.cyan(file)).join('\n');
    if (worker_threads_1.parentPort)
        worker_threads_1.parentPort.postMessage({ log: msg });
    else
        console.log(msg);
    for (const entryFile of entryFiles) {
        g.walkForDependencies(path_1.default.resolve(projDir, entryFile));
    }
    msg = `${chalk_1.default.redBright(g.requestMap.size + '')} TS file included`;
    if (worker_threads_1.parentPort)
        worker_threads_1.parentPort.postMessage({ log: msg });
    else
        console.log(msg);
    g.report(path_1.default.resolve(reportDir, 'deps.txt'))
        .then(() => {
        const msg = 'All TS file names are listed in:\n  ' + chalk_1.default.blueBright(path_1.default.resolve(reportDir, 'deps.txt'));
        if (worker_threads_1.parentPort)
            worker_threads_1.parentPort.postMessage({ log: msg });
        else
            console.log(msg);
    })
        .catch(ex => {
        if (worker_threads_1.parentPort)
            worker_threads_1.parentPort.postMessage({ log: ex.toString() });
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
exports.addSourceFiles = addSourceFiles;
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

//# sourceMappingURL=add-tsconfig-file.js.map
