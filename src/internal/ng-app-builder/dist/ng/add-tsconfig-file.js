"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        .map(file => path_1.default.relative(projDir, file).replace(/\\/g, '/'))
        .concat(Array.from(g.externals.values()));
}
exports.addSourceFiles = addSourceFiles;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9hZGQtdHNjb25maWctZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0I7O0dBRUc7QUFDSCxtREFBMEM7QUFDMUMsK0RBQThCO0FBQzlCLHNFQUEyRTtBQUMzRSwwREFBd0I7QUFDeEIsMkNBQWlDO0FBQ2pDLHdEQUF3QjtBQUN4QiwwREFBMEI7QUFFMUIsZ0NBQWdDO0FBQ2hDLGdFQUFnRTtBQUU5RCwwQkFBMEI7QUFDMUIsd0JBQXdCO0FBQ3hCLDhEQUE4RDtBQUM5RCxNQUFNO0FBRVIsU0FBZ0IsY0FBYyxDQUFDLGVBQW9CLEVBQUUsVUFBb0IsRUFBRSxZQUFvQixFQUM3RixnQkFBMkQsRUFBRSxTQUFpQjtJQUM5RSxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sQ0FBQyxHQUFHLElBQUksZ0JBQUssQ0FBQyxtQ0FBcUIsQ0FBQyxlQUFlLENBQUMsRUFBRSxnQkFBZ0IsRUFDMUUsSUFBSSxDQUFDLEVBQUU7UUFDTCxNQUFNLE9BQU8sR0FBRyxnQkFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0MsT0FBTyxlQUFHLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUwsSUFBSSxHQUFHLEdBQUcsY0FBYyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RixJQUFJLDJCQUFVO1FBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztJQUVyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtRQUNsQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUN6RDtJQUVELEdBQUcsR0FBRyxHQUFHLGVBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDO0lBQ3BFLElBQUksMkJBQVU7UUFDWiwyQkFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDOztRQUVuQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRW5CLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDNUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULE1BQU0sR0FBRyxHQUFHLHNDQUFzQyxHQUFHLGVBQUssQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUMzRyxJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzs7WUFFbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDVixJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFDLENBQUMsQ0FBQzs7WUFFN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUNILHFIQUFxSDtJQUNySCx5R0FBeUc7SUFDekcsa0VBQWtFO0lBQ2xFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3JDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDN0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQTNDRCx3Q0EyQ0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvYWRkLXRzY29uZmlnLWZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuLyoqXG4gKiBUaGlzIGZpbGUgd2lsbCBydW4gaW4gd29ya2VyIHRocmVhZFxuICovXG5pbXBvcnQge3BhcmVudFBvcnR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBHcmFwaCBmcm9tICcuLi90cy1kZXAnO1xuaW1wb3J0IHtqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgQW5ndWxhckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9jb21tb24nO1xuLy8gaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignYWRkLXRzY29uZmlnLWZpbGUnKTtcblxuICAvLyBpbml0Q2xpKGJyb3dzZXJPcHRpb25zKVxuICAvLyAudGhlbihkcmNwQ29uZmlnID0+IHtcbiAgLy8gICByZXR1cm4gaW5qZWN0b3JTZXR1cChwa0luZm8sIGRyY3BDb25maWcsIGJyb3dzZXJPcHRpb25zKTtcbiAgLy8gfSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRTb3VyY2VGaWxlcyhjb21waWxlck9wdGlvbnM6IGFueSwgZW50cnlGaWxlczogc3RyaW5nW10sIHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBmaWxlUmVwbGFjZW1lbnRzOiBBbmd1bGFyQnVpbGRlck9wdGlvbnNbJ2ZpbGVSZXBsYWNlbWVudHMnXSwgcmVwb3J0RGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgcHJvakRpciA9IFBhdGguZGlybmFtZSh0c2NvbmZpZ0ZpbGUpO1xuICBjb25zdCBnID0gbmV3IEdyYXBoKGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpLCBmaWxlUmVwbGFjZW1lbnRzLFxuICAgIGZpbGUgPT4ge1xuICAgICAgY29uc3QgY29udGVudCA9IHN5cy5yZWFkRmlsZShmaWxlLCAndXRmOCcpO1xuICAgICAgcmV0dXJuIGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQgfHwgJycpO1xuICAgIH0pO1xuXG4gIGxldCBtc2cgPSAnVFMgZW50cmlzOlxcbicgKyBlbnRyeUZpbGVzLm1hcChmaWxlID0+ICcgICcgKyBjaGFsay5jeWFuKGZpbGUpKS5qb2luKCdcXG4nKTtcbiAgaWYgKHBhcmVudFBvcnQpXG4gICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7bG9nOiBtc2d9KTtcblxuICBmb3IgKGNvbnN0IGVudHJ5RmlsZSBvZiBlbnRyeUZpbGVzKSB7XG4gICAgZy53YWxrRm9yRGVwZW5kZW5jaWVzKFBhdGgucmVzb2x2ZShwcm9qRGlyLCBlbnRyeUZpbGUpKTtcbiAgfVxuXG4gIG1zZyA9IGAke2NoYWxrLnJlZEJyaWdodChnLnJlcXVlc3RNYXAuc2l6ZSArICcnKX0gVFMgZmlsZSBpbmNsdWRlZGA7XG4gIGlmIChwYXJlbnRQb3J0KVxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe2xvZzogbXNnfSk7XG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhtc2cpO1xuXG4gIGcucmVwb3J0KFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICdkZXBzLnR4dCcpKVxuICAudGhlbigoKSA9PiB7XG4gICAgY29uc3QgbXNnID0gJ0FsbCBUUyBmaWxlIG5hbWVzIGFyZSBsaXN0ZWQgaW46XFxuICAnICsgY2hhbGsuYmx1ZUJyaWdodChQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnZGVwcy50eHQnKSk7XG4gICAgaWYgKHBhcmVudFBvcnQpXG4gICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtsb2c6IG1zZ30pO1xuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUubG9nKG1zZyk7XG4gIH0pXG4gIC5jYXRjaChleCA9PiB7XG4gICAgaWYgKHBhcmVudFBvcnQpXG4gICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtsb2c6IGV4LnRvU3RyaW5nKCl9KTtcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLmxvZyhleC50b1N0cmluZygpKTtcbiAgfSk7XG4gIC8vIEkgbXVzdCBleHBsaWNpdGx5IGludm9sdmUgXCJleHRlcm5hbFwiIHRzIGRlcGVuZGVuY2llcyBpbiBUc2NvbmZpZyBqc29uIGZpbGUsIHNpbmNlIHNvbWUgYXJlIHBhY2thZ2UgZmlsZSBsb2NhdGVkIGluXG4gIC8vIG5vZGVfbW9kdWxlcywgYnkgZGVmYXVsdCBBbmd1bGFyIG9yIHRzYyB3aWxsIGV4Y2x1ZGUgdGhlbSwgaW4gQU9UIG1vZGUgd2UgdXNlIHByZXNlcnZlLXN5bWJsaW5rIG9wdGlvblxuICAvLyBzbyB0aGF0IHNvbWUgc3ltbGluayBzb3VyY2UgZmlsZSBpcyBjb25zaWRlcmVkIGluIG5vZGVfbW9kdWxlcy5cbiAgcmV0dXJuIEFycmF5LmZyb20oZy5sb2FkQ2hpbGRyZW4ua2V5cygpKVxuICAgIC5tYXAoZmlsZSA9PiBQYXRoLnJlbGF0aXZlKHByb2pEaXIsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcbiAgICAuY29uY2F0KEFycmF5LmZyb20oZy5leHRlcm5hbHMudmFsdWVzKCkpKTtcbn1cblxuXG5cblxuXG4iXX0=
