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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9hZGQtdHNjb25maWctZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2QkFBNkI7QUFDN0I7O0dBRUc7QUFDSCxtREFBMEM7QUFDMUMsdURBQThCO0FBQzlCLGlFQUFzRTtBQUN0RSxrREFBd0I7QUFDeEIsMkNBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4QixrREFBMEI7QUFFMUIsZ0NBQWdDO0FBQ2hDLGdFQUFnRTtBQUU5RCwwQkFBMEI7QUFDMUIsd0JBQXdCO0FBQ3hCLDhEQUE4RDtBQUM5RCxNQUFNO0FBRVIsU0FBZ0IsY0FBYyxDQUFDLGVBQW9CLEVBQUUsVUFBb0IsRUFBRSxZQUFvQixFQUM3RixnQkFBMkQsRUFBRSxTQUFpQjtJQUM5RSxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sQ0FBQyxHQUFHLElBQUksZ0JBQUssQ0FBQyxtQ0FBcUIsQ0FBQyxlQUFlLENBQUMsRUFBRSxnQkFBZ0IsRUFDMUUsSUFBSSxDQUFDLEVBQUU7UUFDTCxNQUFNLE9BQU8sR0FBRyxnQkFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0MsT0FBTyxlQUFHLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUwsSUFBSSxHQUFHLEdBQUcsY0FBYyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RixJQUFJLDJCQUFVO1FBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztJQUVyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtRQUNsQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUN6RDtJQUVELEdBQUcsR0FBRyxHQUFHLGVBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDO0lBQ3BFLElBQUksMkJBQVU7UUFDWiwyQkFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDOztRQUVuQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRW5CLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDNUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULE1BQU0sR0FBRyxHQUFHLHNDQUFzQyxHQUFHLGVBQUssQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUMzRyxJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzs7WUFFbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDVixJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFDLENBQUMsQ0FBQzs7WUFFN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUNILHFIQUFxSDtJQUNySCx5R0FBeUc7SUFDekcsa0VBQWtFO0lBQ2xFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RDLGlFQUFpRTtTQUNoRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQztBQTNDRCx3Q0EyQ0MiLCJmaWxlIjoiZGlzdC9uZy9hZGQtdHNjb25maWctZmlsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
