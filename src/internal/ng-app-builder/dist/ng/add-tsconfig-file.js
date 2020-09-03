"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSourceFiles = void 0;
const tslib_1 = require("tslib");
// tslint:disable: no-console
/**
 * This file will run in worker thread
 */
const worker_threads_1 = require("worker_threads");
const ts_dep_1 = tslib_1.__importDefault(require("../ts-dep"));
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const __api_1 = tslib_1.__importDefault(require("__api"));
const typescript_1 = require("typescript");
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
// import * as util from 'util';
// const log = require('log4js').getLogger('add-tsconfig-file');
// initCli(browserOptions)
// .then(drcpConfig => {
//   return injectorSetup(pkInfo, drcpConfig, browserOptions);
// });
function addSourceFiles(compilerOptions, entryFiles, tsconfigFile, fileReplacements, reportDir) {
    const projDir = path_1.default.dirname(tsconfigFile);
    const g = new ts_dep_1.default(ts_compiler_1.jsonToCompilerOptions(compilerOptions), fileReplacements, file => {
        const content = typescript_1.sys.readFile(file, 'utf8');
        return __api_1.default.browserInjector.injectToFile(file, content || '');
    });
    let msg = 'TS entris:\n' + entryFiles.map(file => '  ' + chalk_1.default.cyan(file)).join('\n');
    if (worker_threads_1.parentPort)
        worker_threads_1.parentPort.postMessage({ log: msg });
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

//# sourceMappingURL=add-tsconfig-file.js.map
