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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLXRzY29uZmlnLWZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhZGQtdHNjb25maWctZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2QkFBNkI7QUFDN0I7O0dBRUc7QUFDSCxtREFBMEM7QUFDMUMsdURBQThCO0FBQzlCLGlFQUFzRTtBQUN0RSxrREFBd0I7QUFDeEIsMkNBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4QixrREFBMEI7QUFJMUIsbUZBQW1GO0FBRW5GLFNBQWdCLGNBQWMsQ0FBQyxlQUFvQixFQUFFLFVBQW9CLEVBQUUsWUFBb0IsRUFDN0YsZ0JBQTJELEVBQUUsU0FBaUI7SUFFOUUsbUVBQW1FO0lBQ25FLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFM0MsTUFBTSxFQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQWtCLENBQUM7SUFFN0YsNkJBQTZCO0lBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFFLENBQUMsbUJBQW9CLENBQUM7SUFDbkcsNkJBQTZCO0lBQzdCLDhFQUE4RTtJQUM5RSxNQUFNLEVBQUUsR0FBRyxtQ0FBcUIsQ0FBQyxlQUFlLEVBQUUsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3pFLDhCQUE4QjtJQUM5QixNQUFNLENBQUMsR0FBRyxJQUFJLGdCQUFLLENBQUMsRUFBRSxFQUFFLGdCQUFnQixFQUN0QyxJQUFJLENBQUMsRUFBRTtRQUNMLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1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LENBQUM7SUFDSCxxSEFBcUg7SUFDckgseUdBQXlHO0lBQ3pHLGtFQUFrRTtJQUNsRSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QyxpRUFBaUU7U0FDaEUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUM7QUFsRUQsd0NBa0VDO0FBR0Qsc0hBQXNIO0FBQ3RILGtHQUFrRztBQUVsRywrQkFBK0I7QUFDL0Isd0dBQXdHO0FBQ3hHLG1EQUFtRDtBQUVuRCwrQ0FBK0M7QUFDL0MsZ0ZBQWdGO0FBQ2hGLDhGQUE4RjtBQUM5RixNQUFNO0FBRU4sYUFBYTtBQUNiLDBCQUEwQjtBQUMxQixlQUFlO0FBQ2Ysa0NBQWtDO0FBQ2xDLG1CQUFtQjtBQUNuQixRQUFRO0FBQ1IsT0FBTztBQUNQLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuLyoqXG4gKiBUaGlzIGZpbGUgd2lsbCBydW4gaW4gd29ya2VyIHRocmVhZFxuICovXG5pbXBvcnQge3BhcmVudFBvcnR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBHcmFwaCBmcm9tICcuLi90cy1kZXAnO1xuaW1wb3J0IHtqc29uVG9Db21waWxlck9wdGlvbnN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcblxuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuYWRkLXRzY29uZmlnLWZpbGUnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGFkZFNvdXJjZUZpbGVzKGNvbXBpbGVyT3B0aW9uczogYW55LCBlbnRyeUZpbGVzOiBzdHJpbmdbXSwgdHNjb25maWdGaWxlOiBzdHJpbmcsXG4gIGZpbGVSZXBsYWNlbWVudHM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9uc1snZmlsZVJlcGxhY2VtZW50cyddLCByZXBvcnREaXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcblxuICAvLyBjb25zb2xlLmxvZygnYWRkU291cmNlRmlsZXM6IGNvbXBpbGVyT3B0aW9ucycsIGNvbXBpbGVyT3B0aW9ucyk7XG4gIGNvbnN0IHByb2pEaXIgPSBQYXRoLmRpcm5hbWUodHNjb25maWdGaWxlKTtcblxuICBjb25zdCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIHBrZ01ncjtcblxuICAvLyBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBpbnN0YWxsZWRQa2dzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSkpIS5pbnN0YWxsZWRDb21wb25lbnRzITtcbiAgLy8gbG9nLmluZm8oY29tcGlsZXJPcHRpb25zKTtcbiAgLy8gY29tcGlsZXJPcHRpb25zID0gYWRkQWRkaXRpb25hbFBhdGhzRm9yVHNSZXNvbHZlKHByb2pEaXIsIGNvbXBpbGVyT3B0aW9ucyk7XG4gIGNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucywgdHNjb25maWdGaWxlLCBwcm9qRGlyKTtcbiAgLy8gbG9nLmluZm8odHNjb25maWdGaWxlLCBjbyk7XG4gIGNvbnN0IGcgPSBuZXcgR3JhcGgoY28sIGZpbGVSZXBsYWNlbWVudHMsXG4gICAgcGF0aCA9PiB7XG4gICAgICBjb25zdCBlbHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICBjb25zdCBoYXNTY29wZW5hbWUgPSBlbHNbMF0uc3RhcnRzV2l0aCgnQCcpO1xuICAgICAgY29uc3QgcGtOYW1lID0gaGFzU2NvcGVuYW1lID8gZWxzWzBdICsgJy8nICsgZWxzWzFdIDogZWxzWzBdO1xuICAgICAgY29uc3QgcGsgPSBpbnN0YWxsZWRQa2dzLmdldChwa05hbWUpO1xuICAgICAgaWYgKHBrICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIFtway5yZWFsUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyksIC4uLihoYXNTY29wZW5hbWUgPyBlbHMuc2xpY2UoMikgOiBlbHMuc2xpY2UoMSkpXS5qb2luKCcvJykgKyAnLnRzJztcbiAgICAgIH1cbiAgICB9LFxuICAgIGZpbGUgPT4ge1xuICAgICAgY29uc3QgY29udGVudCA9IHN5cy5yZWFkRmlsZShmaWxlLCAndXRmOCcpO1xuICAgICAgY29uc3QgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQgfHwgJycpO1xuICAgICAgcmV0dXJuIGNoYW5nZWQ7XG4gICAgfSk7XG5cbiAgbGV0IG1zZyA9ICdUUyBlbnRyaXM6XFxuJyArIGVudHJ5RmlsZXMubWFwKGZpbGUgPT4gJyAgJyArIGNoYWxrLmN5YW4oZmlsZSkpLmpvaW4oJ1xcbicpO1xuICBpZiAocGFyZW50UG9ydClcbiAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtsb2c6IG1zZ30pO1xuICBlbHNlXG4gICAgY29uc29sZS5sb2cobXNnKTtcblxuICBmb3IgKGNvbnN0IGVudHJ5RmlsZSBvZiBlbnRyeUZpbGVzKSB7XG4gICAgZy53YWxrRm9yRGVwZW5kZW5jaWVzKFBhdGgucmVzb2x2ZShwcm9qRGlyLCBlbnRyeUZpbGUpKTtcbiAgfVxuXG4gIG1zZyA9IGAke2NoYWxrLnJlZEJyaWdodChnLnJlcXVlc3RNYXAuc2l6ZSArICcnKX0gVFMgZmlsZSBpbmNsdWRlZGA7XG4gIGlmIChwYXJlbnRQb3J0KVxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2Uoe2xvZzogbXNnfSk7XG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhtc2cpO1xuXG4gIGcucmVwb3J0KFBhdGgucmVzb2x2ZShyZXBvcnREaXIsICdkZXBzLnR4dCcpKVxuICAudGhlbigoKSA9PiB7XG4gICAgY29uc3QgbXNnID0gJ0FsbCBUUyBmaWxlIG5hbWVzIGFyZSBsaXN0ZWQgaW46XFxuICAnICsgY2hhbGsuYmx1ZUJyaWdodChQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnZGVwcy50eHQnKSk7XG4gICAgaWYgKHBhcmVudFBvcnQpXG4gICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtsb2c6IG1zZ30pO1xuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUubG9nKG1zZyk7XG4gIH0pXG4gIC5jYXRjaChleCA9PiB7XG4gICAgaWYgKHBhcmVudFBvcnQpXG4gICAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtsb2c6IGV4LnRvU3RyaW5nKCl9KTtcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLmxvZyhleC50b1N0cmluZygpKTtcbiAgfSk7XG4gIC8vIEkgbXVzdCBleHBsaWNpdGx5IGludm9sdmUgXCJleHRlcm5hbFwiIHRzIGRlcGVuZGVuY2llcyBpbiBUc2NvbmZpZyBqc29uIGZpbGUsIHNpbmNlIHNvbWUgYXJlIHBhY2thZ2UgZmlsZSBsb2NhdGVkIGluXG4gIC8vIG5vZGVfbW9kdWxlcywgYnkgZGVmYXVsdCBBbmd1bGFyIG9yIHRzYyB3aWxsIGV4Y2x1ZGUgdGhlbSwgaW4gQU9UIG1vZGUgd2UgdXNlIHByZXNlcnZlLXN5bWJsaW5rIG9wdGlvblxuICAvLyBzbyB0aGF0IHNvbWUgc3ltbGluayBzb3VyY2UgZmlsZSBpcyBjb25zaWRlcmVkIGluIG5vZGVfbW9kdWxlcy5cbiAgcmV0dXJuIEFycmF5LmZyb20oZy5sb2FkQ2hpbGRyZW4ua2V5cygpKVxuICAgIC8vIC5tYXAoZmlsZSA9PiBQYXRoLnJlbGF0aXZlKHByb2pEaXIsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcbiAgICAuY29uY2F0KEFycmF5LmZyb20oZy5leHRlcm5hbHMudmFsdWVzKCkpLmZpbHRlcihleHRlcm5hbCA9PiAhZy5sb2FkQ2hpbGRyZW4uaGFzKGV4dGVybmFsKSkpO1xufVxuXG5cbi8vIGZ1bmN0aW9uIGFkZEFkZGl0aW9uYWxQYXRoc0ZvclRzUmVzb2x2ZSh0c2NvbmZpZ0Rpcjogc3RyaW5nLCBjb21waWxlck9wdGlvbnM6IHtwYXRoczoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfX0pIHtcbi8vICAgY29uc3Qge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG5cbi8vICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbi8vICAgY29uc3QgaW5zdGFsbGVkUGtncyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKSEuaW5zdGFsbGVkQ29tcG9uZW50cyE7XG4vLyAgIGNvbnN0IHBhdGhNYXA6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblxuLy8gICBmb3IgKGNvbnN0IHBrIG9mIGluc3RhbGxlZFBrZ3MudmFsdWVzKCkpIHtcbi8vICAgICBwYXRoTWFwW3BrLm5hbWVdID0gW1BhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpXTtcbi8vICAgICBwYXRoTWFwW3BrLm5hbWUgKyAnLyonXSA9IFtQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiddO1xuLy8gICB9XG5cbi8vICAgcmV0dXJuIHtcbi8vICAgICAuLi5jb21waWxlck9wdGlvbnMsXG4vLyAgICAgcGF0aHM6IHtcbi8vICAgICAgIC4uLmNvbXBpbGVyT3B0aW9ucy5wYXRocyxcbi8vICAgICAgIC4uLnBhdGhNYXBcbi8vICAgICB9XG4vLyAgIH07XG4vLyB9XG5cblxuXG4iXX0=