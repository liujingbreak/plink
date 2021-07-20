"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSourceFiles = void 0;
/* eslint-disable no-console */
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
// const log = require('log4js').getLogger(api.packageName + '.add-tsconfig-file');
function addSourceFiles(compilerOptions, entryFiles, tsconfigFile, fileReplacements, reportDir) {
    // console.log('addSourceFiles: compilerOptions', compilerOptions);
    const projDir = path_1.default.dirname(tsconfigFile);
    const { getState, workspaceKey } = require('@wfh/plink/wfh/dist/package-mgr');
    // const cwd = process.cwd();
    const installedPkgs = getState().workspaces.get(workspaceKey(process.cwd())).installedComponents;
    // log.info(compilerOptions);
    // compilerOptions = addAdditionalPathsForTsResolve(projDir, compilerOptions);
    const co = ts_compiler_1.jsonToCompilerOptions(compilerOptions, tsconfigFile, projDir);
    // log.info(tsconfigFile, co);
    const g = new ts_dep_1.default(co, fileReplacements, path => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLXRzY29uZmlnLWZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhZGQtdHNjb25maWctZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwrQkFBK0I7QUFDL0I7O0dBRUc7QUFDSCxtREFBMEM7QUFDMUMsdURBQThCO0FBQzlCLGlFQUFzRTtBQUN0RSxrREFBd0I7QUFDeEIsMkNBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4QixrREFBMEI7QUFJMUIsbUZBQW1GO0FBRW5GLFNBQWdCLGNBQWMsQ0FBQyxlQUFvQixFQUFFLFVBQW9CLEVBQUUsWUFBb0IsRUFDN0YsZ0JBQTJELEVBQUUsU0FBaUI7SUFFOUUsbUVBQW1FO0lBQ25FLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFM0MsTUFBTSxFQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQWtCLENBQUM7SUFFN0YsNkJBQTZCO0lBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFFLENBQUMsbUJBQW9CLENBQUM7SUFDbkcsNkJBQTZCO0lBQzdCLDhFQUE4RTtJQUM5RSxNQUFNLEVBQUUsR0FBRyxtQ0FBcUIsQ0FBQyxlQUFlLEVBQUUsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3pFLDhCQUE4QjtJQUM5QixNQUFNLENBQUMsR0FBRyxJQUFJLGdCQUFLLENBQUMsRUFBRSxFQUFFLGdCQUFnQixFQUN0QyxJQUFJLENBQUMsRUFBRTtRQUNMLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1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LENBQUM7SUFDSCxxSEFBcUg7SUFDckgseUdBQXlHO0lBQ3pHLGtFQUFrRTtJQUNsRSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QyxpRUFBaUU7U0FDaEUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFsRUQsd0NBa0VDO0FBR0Qsc0hBQXNIO0FBQ3RILGtHQUFrRztBQUVsRywrQkFBK0I7QUFDL0Isd0dBQXdHO0FBQ3hHLG1EQUFtRDtBQUVuRCwrQ0FBK0M7QUFDL0MsZ0ZBQWdGO0FBQ2hGLDhGQUE4RjtBQUM5RixNQUFNO0FBRU4sYUFBYTtBQUNiLDBCQUEwQjtBQUMxQixlQUFlO0FBQ2Ysa0NBQWtDO0FBQ2xDLG1CQUFtQjtBQUNuQixRQUFRO0FBQ1IsT0FBTztBQUNQLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4vKipcbiAqIFRoaXMgZmlsZSB3aWxsIHJ1biBpbiB3b3JrZXIgdGhyZWFkXG4gKi9cbmltcG9ydCB7cGFyZW50UG9ydH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IEdyYXBoIGZyb20gJy4uL3RzLWRlcCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgQW5ndWxhckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuXG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5hZGQtdHNjb25maWctZmlsZScpO1xuXG5leHBvcnQgZnVuY3Rpb24gYWRkU291cmNlRmlsZXMoY29tcGlsZXJPcHRpb25zOiBhbnksIGVudHJ5RmlsZXM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZyxcbiAgZmlsZVJlcGxhY2VtZW50czogQW5ndWxhckJ1aWxkZXJPcHRpb25zWydmaWxlUmVwbGFjZW1lbnRzJ10sIHJlcG9ydERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuXG4gIC8vIGNvbnNvbGUubG9nKCdhZGRTb3VyY2VGaWxlczogY29tcGlsZXJPcHRpb25zJywgY29tcGlsZXJPcHRpb25zKTtcbiAgY29uc3QgcHJvakRpciA9IFBhdGguZGlybmFtZSh0c2NvbmZpZ0ZpbGUpO1xuXG4gIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuXG4gIC8vIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGluc3RhbGxlZFBrZ3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKSkhLmluc3RhbGxlZENvbXBvbmVudHMhO1xuICAvLyBsb2cuaW5mbyhjb21waWxlck9wdGlvbnMpO1xuICAvLyBjb21waWxlck9wdGlvbnMgPSBhZGRBZGRpdGlvbmFsUGF0aHNGb3JUc1Jlc29sdmUocHJvakRpciwgY29tcGlsZXJPcHRpb25zKTtcbiAgY29uc3QgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zLCB0c2NvbmZpZ0ZpbGUsIHByb2pEaXIpO1xuICAvLyBsb2cuaW5mbyh0c2NvbmZpZ0ZpbGUsIGNvKTtcbiAgY29uc3QgZyA9IG5ldyBHcmFwaChjbywgZmlsZVJlcGxhY2VtZW50cyxcbiAgICBwYXRoID0+IHtcbiAgICAgIGNvbnN0IGVscyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICAgIGNvbnN0IGhhc1Njb3BlbmFtZSA9IGVsc1swXS5zdGFydHNXaXRoKCdAJyk7XG4gICAgICBjb25zdCBwa05hbWUgPSBoYXNTY29wZW5hbWUgPyBlbHNbMF0gKyAnLycgKyBlbHNbMV0gOiBlbHNbMF07XG4gICAgICBjb25zdCBwayA9IGluc3RhbGxlZFBrZ3MuZ2V0KHBrTmFtZSk7XG4gICAgICBpZiAocGsgIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gW3BrLnJlYWxQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKSwgLi4uKGhhc1Njb3BlbmFtZSA/IGVscy5zbGljZSgyKSA6IGVscy5zbGljZSgxKSldLmpvaW4oJy8nKSArICcudHMnO1xuICAgICAgfVxuICAgIH0sXG4gICAgZmlsZSA9PiB7XG4gICAgICBjb25zdCBjb250ZW50ID0gc3lzLnJlYWRGaWxlKGZpbGUsICd1dGY4Jyk7XG4gICAgICBjb25zdCBjaGFuZ2VkID0gYXBpLmJyb3dzZXJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgY29udGVudCB8fCAnJyk7XG4gICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICB9KTtcblxuICBsZXQgbXNnID0gJ1RTIGVudHJpczpcXG4nICsgZW50cnlGaWxlcy5tYXAoZmlsZSA9PiAnICAnICsgY2hhbGsuY3lhbihmaWxlKSkuam9pbignXFxuJyk7XG4gIGlmIChwYXJlbnRQb3J0KVxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe2xvZzogbXNnfSk7XG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhtc2cpO1xuXG4gIGZvciAoY29uc3QgZW50cnlGaWxlIG9mIGVudHJ5RmlsZXMpIHtcbiAgICBnLndhbGtGb3JEZXBlbmRlbmNpZXMoUGF0aC5yZXNvbHZlKHByb2pEaXIsIGVudHJ5RmlsZSkpO1xuICB9XG5cbiAgbXNnID0gYCR7Y2hhbGsucmVkQnJpZ2h0KGcucmVxdWVzdE1hcC5zaXplICsgJycpfSBUUyBmaWxlIGluY2x1ZGVkYDtcbiAgaWYgKHBhcmVudFBvcnQpXG4gICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7bG9nOiBtc2d9KTtcbiAgZWxzZVxuICAgIGNvbnNvbGUubG9nKG1zZyk7XG5cbiAgZy5yZXBvcnQoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ2RlcHMudHh0JykpXG4gIC50aGVuKCgpID0+IHtcbiAgICBjb25zdCBtc2cgPSAnQWxsIFRTIGZpbGUgbmFtZXMgYXJlIGxpc3RlZCBpbjpcXG4gICcgKyBjaGFsay5ibHVlQnJpZ2h0KFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICdkZXBzLnR4dCcpKTtcbiAgICBpZiAocGFyZW50UG9ydClcbiAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe2xvZzogbXNnfSk7XG4gICAgZWxzZVxuICAgICAgY29uc29sZS5sb2cobXNnKTtcbiAgfSlcbiAgLmNhdGNoKGV4ID0+IHtcbiAgICBpZiAocGFyZW50UG9ydClcbiAgICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe2xvZzogZXgudG9TdHJpbmcoKX0pO1xuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUubG9nKGV4LnRvU3RyaW5nKCkpO1xuICB9KTtcbiAgLy8gSSBtdXN0IGV4cGxpY2l0bHkgaW52b2x2ZSBcImV4dGVybmFsXCIgdHMgZGVwZW5kZW5jaWVzIGluIFRzY29uZmlnIGpzb24gZmlsZSwgc2luY2Ugc29tZSBhcmUgcGFja2FnZSBmaWxlIGxvY2F0ZWQgaW5cbiAgLy8gbm9kZV9tb2R1bGVzLCBieSBkZWZhdWx0IEFuZ3VsYXIgb3IgdHNjIHdpbGwgZXhjbHVkZSB0aGVtLCBpbiBBT1QgbW9kZSB3ZSB1c2UgcHJlc2VydmUtc3ltYmxpbmsgb3B0aW9uXG4gIC8vIHNvIHRoYXQgc29tZSBzeW1saW5rIHNvdXJjZSBmaWxlIGlzIGNvbnNpZGVyZWQgaW4gbm9kZV9tb2R1bGVzLlxuICByZXR1cm4gQXJyYXkuZnJvbShnLmxvYWRDaGlsZHJlbi5rZXlzKCkpXG4gICAgLy8gLm1hcChmaWxlID0+IFBhdGgucmVsYXRpdmUocHJvakRpciwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKVxuICAgIC5jb25jYXQoQXJyYXkuZnJvbShnLmV4dGVybmFscy52YWx1ZXMoKSkuZmlsdGVyKGV4dGVybmFsID0+ICFnLmxvYWRDaGlsZHJlbi5oYXMoZXh0ZXJuYWwpKSk7XG59XG5cblxuLy8gZnVuY3Rpb24gYWRkQWRkaXRpb25hbFBhdGhzRm9yVHNSZXNvbHZlKHRzY29uZmlnRGlyOiBzdHJpbmcsIGNvbXBpbGVyT3B0aW9uczoge3BhdGhzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119fSkge1xuLy8gICBjb25zdCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIHBrZ01ncjtcblxuLy8gICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuLy8gICBjb25zdCBpbnN0YWxsZWRQa2dzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSkpIS5pbnN0YWxsZWRDb21wb25lbnRzITtcbi8vICAgY29uc3QgcGF0aE1hcDoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuXG4vLyAgIGZvciAoY29uc3QgcGsgb2YgaW5zdGFsbGVkUGtncy52YWx1ZXMoKSkge1xuLy8gICAgIHBhdGhNYXBbcGsubmFtZV0gPSBbUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyldO1xuLy8gICAgIHBhdGhNYXBbcGsubmFtZSArICcvKiddID0gW1BhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qJ107XG4vLyAgIH1cblxuLy8gICByZXR1cm4ge1xuLy8gICAgIC4uLmNvbXBpbGVyT3B0aW9ucyxcbi8vICAgICBwYXRoczoge1xuLy8gICAgICAgLi4uY29tcGlsZXJPcHRpb25zLnBhdGhzLFxuLy8gICAgICAgLi4ucGF0aE1hcFxuLy8gICAgIH1cbi8vICAgfTtcbi8vIH1cblxuXG5cbiJdfQ==