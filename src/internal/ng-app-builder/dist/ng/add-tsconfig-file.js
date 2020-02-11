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
    // I must put all walked ts dependencies in Tsconfig json file, since some are package file located in
    // node_modules, by default Angular or tsc will exclude them
    return Array.from(g.requestMap.keys())
        .map(file => path_1.default.relative(projDir, file).replace(/\\/g, '/'));
}
exports.addSourceFiles = addSourceFiles;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9hZGQtdHNjb25maWctZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0I7O0dBRUc7QUFDSCxtREFBMEM7QUFDMUMsK0RBQThCO0FBQzlCLHNFQUEyRTtBQUMzRSwwREFBd0I7QUFDeEIsMkNBQWlDO0FBQ2pDLHdEQUF3QjtBQUN4QiwwREFBMEI7QUFFMUIsZ0NBQWdDO0FBQ2hDLGdFQUFnRTtBQUU5RCwwQkFBMEI7QUFDMUIsd0JBQXdCO0FBQ3hCLDhEQUE4RDtBQUM5RCxNQUFNO0FBRVIsU0FBZ0IsY0FBYyxDQUFDLGVBQW9CLEVBQUUsVUFBb0IsRUFBRSxZQUFvQixFQUM3RixnQkFBMkQsRUFBRSxTQUFpQjtJQUM5RSxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sQ0FBQyxHQUFHLElBQUksZ0JBQUssQ0FBQyxtQ0FBcUIsQ0FBQyxlQUFlLENBQUMsRUFBRSxnQkFBZ0IsRUFDMUUsSUFBSSxDQUFDLEVBQUU7UUFDTCxNQUFNLE9BQU8sR0FBRyxnQkFBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0MsT0FBTyxlQUFHLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUwsSUFBSSxHQUFHLEdBQUcsY0FBYyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RixJQUFJLDJCQUFVO1FBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztJQUVyQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtRQUNsQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUN6RDtJQUVELEdBQUcsR0FBRyxHQUFHLGVBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDO0lBQ3BFLElBQUksMkJBQVU7UUFDWiwyQkFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDOztRQUVuQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRW5CLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDNUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULE1BQU0sR0FBRyxHQUFHLHNDQUFzQyxHQUFHLGVBQUssQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUMzRyxJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzs7WUFFbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDVixJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFDLENBQUMsQ0FBQzs7WUFFN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUNILHNHQUFzRztJQUN0Ryw0REFBNEQ7SUFDNUQsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUM7QUF6Q0Qsd0NBeUNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2FkZC10c2NvbmZpZy1maWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbi8qKlxuICogVGhpcyBmaWxlIHdpbGwgcnVuIGluIHdvcmtlciB0aHJlYWRcbiAqL1xuaW1wb3J0IHtwYXJlbnRQb3J0fSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgR3JhcGggZnJvbSAnLi4vdHMtZGVwJztcbmltcG9ydCB7anNvblRvQ29tcGlsZXJPcHRpb25zfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbi8vIGltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2FkZC10c2NvbmZpZy1maWxlJyk7XG5cbiAgLy8gaW5pdENsaShicm93c2VyT3B0aW9ucylcbiAgLy8gLnRoZW4oZHJjcENvbmZpZyA9PiB7XG4gIC8vICAgcmV0dXJuIGluamVjdG9yU2V0dXAocGtJbmZvLCBkcmNwQ29uZmlnLCBicm93c2VyT3B0aW9ucyk7XG4gIC8vIH0pO1xuXG5leHBvcnQgZnVuY3Rpb24gYWRkU291cmNlRmlsZXMoY29tcGlsZXJPcHRpb25zOiBhbnksIGVudHJ5RmlsZXM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZyxcbiAgZmlsZVJlcGxhY2VtZW50czogQW5ndWxhckJ1aWxkZXJPcHRpb25zWydmaWxlUmVwbGFjZW1lbnRzJ10sIHJlcG9ydERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHByb2pEaXIgPSBQYXRoLmRpcm5hbWUodHNjb25maWdGaWxlKTtcbiAgY29uc3QgZyA9IG5ldyBHcmFwaChqc29uVG9Db21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKSwgZmlsZVJlcGxhY2VtZW50cyxcbiAgICBmaWxlID0+IHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBzeXMucmVhZEZpbGUoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgIHJldHVybiBhcGkuYnJvd3NlckluamVjdG9yLmluamVjdFRvRmlsZShmaWxlLCBjb250ZW50IHx8ICcnKTtcbiAgICB9KTtcblxuICBsZXQgbXNnID0gJ1RTIGVudHJpczpcXG4nICsgZW50cnlGaWxlcy5tYXAoZmlsZSA9PiAnICAnICsgY2hhbGsuY3lhbihmaWxlKSkuam9pbignXFxuJyk7XG4gIGlmIChwYXJlbnRQb3J0KVxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe2xvZzogbXNnfSk7XG5cbiAgZm9yIChjb25zdCBlbnRyeUZpbGUgb2YgZW50cnlGaWxlcykge1xuICAgIGcud2Fsa0ZvckRlcGVuZGVuY2llcyhQYXRoLnJlc29sdmUocHJvakRpciwgZW50cnlGaWxlKSk7XG4gIH1cblxuICBtc2cgPSBgJHtjaGFsay5yZWRCcmlnaHQoZy5yZXF1ZXN0TWFwLnNpemUgKyAnJyl9IFRTIGZpbGUgaW5jbHVkZWRgO1xuICBpZiAocGFyZW50UG9ydClcbiAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtsb2c6IG1zZ30pO1xuICBlbHNlXG4gICAgY29uc29sZS5sb2cobXNnKTtcblxuICBnLnJlcG9ydChQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnZGVwcy50eHQnKSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIGNvbnN0IG1zZyA9ICdBbGwgVFMgZmlsZSBuYW1lcyBhcmUgbGlzdGVkIGluOlxcbiAgJyArIGNoYWxrLmJsdWVCcmlnaHQoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ2RlcHMudHh0JykpO1xuICAgIGlmIChwYXJlbnRQb3J0KVxuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7bG9nOiBtc2d9KTtcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLmxvZyhtc2cpO1xuICB9KVxuICAuY2F0Y2goZXggPT4ge1xuICAgIGlmIChwYXJlbnRQb3J0KVxuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7bG9nOiBleC50b1N0cmluZygpfSk7XG4gICAgZWxzZVxuICAgICAgY29uc29sZS5sb2coZXgudG9TdHJpbmcoKSk7XG4gIH0pO1xuICAvLyBJIG11c3QgcHV0IGFsbCB3YWxrZWQgdHMgZGVwZW5kZW5jaWVzIGluIFRzY29uZmlnIGpzb24gZmlsZSwgc2luY2Ugc29tZSBhcmUgcGFja2FnZSBmaWxlIGxvY2F0ZWQgaW5cbiAgLy8gbm9kZV9tb2R1bGVzLCBieSBkZWZhdWx0IEFuZ3VsYXIgb3IgdHNjIHdpbGwgZXhjbHVkZSB0aGVtXG4gIHJldHVybiBBcnJheS5mcm9tKGcucmVxdWVzdE1hcC5rZXlzKCkpXG4gICAgLm1hcChmaWxlID0+IFBhdGgucmVsYXRpdmUocHJvakRpciwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbn1cblxuXG5cblxuXG4iXX0=
