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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLXRzY29uZmlnLWZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhZGQtdHNjb25maWctZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2QkFBNkI7QUFDN0I7O0dBRUc7QUFDSCxtREFBMEM7QUFDMUMsdURBQThCO0FBQzlCLGlFQUFzRTtBQUN0RSxrREFBd0I7QUFDeEIsMkNBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4QixrREFBMEI7QUFJMUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLENBQUM7QUFFaEYsU0FBZ0IsY0FBYyxDQUFDLGVBQW9CLEVBQUUsVUFBb0IsRUFBRSxZQUFvQixFQUM3RixnQkFBMkQsRUFBRSxTQUFpQjtJQUU5RSxtRUFBbUU7SUFDbkUsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUUzQyxNQUFNLEVBQUMsUUFBUSxFQUFFLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBa0IsQ0FBQztJQUU3Riw2QkFBNkI7SUFDN0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUUsQ0FBQyxtQkFBb0IsQ0FBQztJQUVuRyw4RUFBOEU7SUFDOUUsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMxQixNQUFNLENBQUMsR0FBRyxJQUFJLGdCQUFLLENBQUMsbUNBQXFCLENBQUMsZUFBZSxDQUFDLEVBQUUsZ0JBQWdCLEVBQzFFLElBQUksQ0FBQyxFQUFFO1FBQ0wsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtZQUNkLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUM3RztJQUNILENBQUMsRUFDRCxJQUFJLENBQUMsRUFBRTtRQUNMLE1BQU0sT0FBTyxHQUFHLGdCQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzQyxNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUwsSUFBSSxHQUFHLEdBQUcsY0FBYyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RixJQUFJLDJCQUFVO1FBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzs7UUFFbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRTtRQUNsQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUN6RDtJQUVELEdBQUcsR0FBRyxHQUFHLGVBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDO0lBQ3BFLElBQUksMkJBQVU7UUFDWiwyQkFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDOztRQUVuQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRW5CLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDNUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNULE1BQU0sR0FBRyxHQUFHLHNDQUFzQyxHQUFHLGVBQUssQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUMzRyxJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQzs7WUFFbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDVixJQUFJLDJCQUFVO1lBQ1osMkJBQVUsQ0FBQyxXQUFXLENBQUMsRUFBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFDLENBQUMsQ0FBQzs7WUFFN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUNILHFIQUFxSDtJQUNySCx5R0FBeUc7SUFDekcsa0VBQWtFO0lBQ2xFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RDLGlFQUFpRTtTQUNoRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEcsQ0FBQztBQWpFRCx3Q0FpRUM7QUFHRCxzSEFBc0g7QUFDdEgsa0dBQWtHO0FBRWxHLCtCQUErQjtBQUMvQix3R0FBd0c7QUFDeEcsbURBQW1EO0FBRW5ELCtDQUErQztBQUMvQyxnRkFBZ0Y7QUFDaEYsOEZBQThGO0FBQzlGLE1BQU07QUFFTixhQUFhO0FBQ2IsMEJBQTBCO0FBQzFCLGVBQWU7QUFDZixrQ0FBa0M7QUFDbEMsbUJBQW1CO0FBQ25CLFFBQVE7QUFDUixPQUFPO0FBQ1AsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG4vKipcbiAqIFRoaXMgZmlsZSB3aWxsIHJ1biBpbiB3b3JrZXIgdGhyZWFkXG4gKi9cbmltcG9ydCB7cGFyZW50UG9ydH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IEdyYXBoIGZyb20gJy4uL3RzLWRlcCc7XG5pbXBvcnQge2pzb25Ub0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgQW5ndWxhckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5hZGQtdHNjb25maWctZmlsZScpO1xuXG5leHBvcnQgZnVuY3Rpb24gYWRkU291cmNlRmlsZXMoY29tcGlsZXJPcHRpb25zOiBhbnksIGVudHJ5RmlsZXM6IHN0cmluZ1tdLCB0c2NvbmZpZ0ZpbGU6IHN0cmluZyxcbiAgZmlsZVJlcGxhY2VtZW50czogQW5ndWxhckJ1aWxkZXJPcHRpb25zWydmaWxlUmVwbGFjZW1lbnRzJ10sIHJlcG9ydERpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuXG4gIC8vIGNvbnNvbGUubG9nKCdhZGRTb3VyY2VGaWxlczogY29tcGlsZXJPcHRpb25zJywgY29tcGlsZXJPcHRpb25zKTtcbiAgY29uc3QgcHJvakRpciA9IFBhdGguZGlybmFtZSh0c2NvbmZpZ0ZpbGUpO1xuXG4gIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuXG4gIC8vIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGluc3RhbGxlZFBrZ3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKSkhLmluc3RhbGxlZENvbXBvbmVudHMhO1xuXG4gIC8vIGNvbXBpbGVyT3B0aW9ucyA9IGFkZEFkZGl0aW9uYWxQYXRoc0ZvclRzUmVzb2x2ZShwcm9qRGlyLCBjb21waWxlck9wdGlvbnMpO1xuICBsb2cuaW5mbyhjb21waWxlck9wdGlvbnMpO1xuICBjb25zdCBnID0gbmV3IEdyYXBoKGpzb25Ub0NvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpLCBmaWxlUmVwbGFjZW1lbnRzLFxuICAgIHBhdGggPT4ge1xuICAgICAgY29uc3QgZWxzID0gcGF0aC5zcGxpdCgnLycpO1xuICAgICAgY29uc3QgaGFzU2NvcGVuYW1lID0gZWxzWzBdLnN0YXJ0c1dpdGgoJ0AnKTtcbiAgICAgIGNvbnN0IHBrTmFtZSA9IGhhc1Njb3BlbmFtZSA/IGVsc1swXSArICcvJyArIGVsc1sxXSA6IGVsc1swXTtcbiAgICAgIGNvbnN0IHBrID0gaW5zdGFsbGVkUGtncy5nZXQocGtOYW1lKTtcbiAgICAgIGlmIChwayAhPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBbcGsucmVhbFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLCAuLi4oaGFzU2NvcGVuYW1lID8gZWxzLnNsaWNlKDIpIDogZWxzLnNsaWNlKDEpKV0uam9pbignLycpICsgJy50cyc7XG4gICAgICB9XG4gICAgfSxcbiAgICBmaWxlID0+IHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBzeXMucmVhZEZpbGUoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSBhcGkuYnJvd3NlckluamVjdG9yLmluamVjdFRvRmlsZShmaWxlLCBjb250ZW50IHx8ICcnKTtcbiAgICAgIHJldHVybiBjaGFuZ2VkO1xuICAgIH0pO1xuXG4gIGxldCBtc2cgPSAnVFMgZW50cmlzOlxcbicgKyBlbnRyeUZpbGVzLm1hcChmaWxlID0+ICcgICcgKyBjaGFsay5jeWFuKGZpbGUpKS5qb2luKCdcXG4nKTtcbiAgaWYgKHBhcmVudFBvcnQpXG4gICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7bG9nOiBtc2d9KTtcbiAgZWxzZVxuICAgIGNvbnNvbGUubG9nKG1zZyk7XG5cbiAgZm9yIChjb25zdCBlbnRyeUZpbGUgb2YgZW50cnlGaWxlcykge1xuICAgIGcud2Fsa0ZvckRlcGVuZGVuY2llcyhQYXRoLnJlc29sdmUocHJvakRpciwgZW50cnlGaWxlKSk7XG4gIH1cblxuICBtc2cgPSBgJHtjaGFsay5yZWRCcmlnaHQoZy5yZXF1ZXN0TWFwLnNpemUgKyAnJyl9IFRTIGZpbGUgaW5jbHVkZWRgO1xuICBpZiAocGFyZW50UG9ydClcbiAgICBwYXJlbnRQb3J0LnBvc3RNZXNzYWdlKHtsb2c6IG1zZ30pO1xuICBlbHNlXG4gICAgY29uc29sZS5sb2cobXNnKTtcblxuICBnLnJlcG9ydChQYXRoLnJlc29sdmUocmVwb3J0RGlyLCAnZGVwcy50eHQnKSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIGNvbnN0IG1zZyA9ICdBbGwgVFMgZmlsZSBuYW1lcyBhcmUgbGlzdGVkIGluOlxcbiAgJyArIGNoYWxrLmJsdWVCcmlnaHQoUGF0aC5yZXNvbHZlKHJlcG9ydERpciwgJ2RlcHMudHh0JykpO1xuICAgIGlmIChwYXJlbnRQb3J0KVxuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7bG9nOiBtc2d9KTtcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLmxvZyhtc2cpO1xuICB9KVxuICAuY2F0Y2goZXggPT4ge1xuICAgIGlmIChwYXJlbnRQb3J0KVxuICAgICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZSh7bG9nOiBleC50b1N0cmluZygpfSk7XG4gICAgZWxzZVxuICAgICAgY29uc29sZS5sb2coZXgudG9TdHJpbmcoKSk7XG4gIH0pO1xuICAvLyBJIG11c3QgZXhwbGljaXRseSBpbnZvbHZlIFwiZXh0ZXJuYWxcIiB0cyBkZXBlbmRlbmNpZXMgaW4gVHNjb25maWcganNvbiBmaWxlLCBzaW5jZSBzb21lIGFyZSBwYWNrYWdlIGZpbGUgbG9jYXRlZCBpblxuICAvLyBub2RlX21vZHVsZXMsIGJ5IGRlZmF1bHQgQW5ndWxhciBvciB0c2Mgd2lsbCBleGNsdWRlIHRoZW0sIGluIEFPVCBtb2RlIHdlIHVzZSBwcmVzZXJ2ZS1zeW1ibGluayBvcHRpb25cbiAgLy8gc28gdGhhdCBzb21lIHN5bWxpbmsgc291cmNlIGZpbGUgaXMgY29uc2lkZXJlZCBpbiBub2RlX21vZHVsZXMuXG4gIHJldHVybiBBcnJheS5mcm9tKGcubG9hZENoaWxkcmVuLmtleXMoKSlcbiAgICAvLyAubWFwKGZpbGUgPT4gUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgLmNvbmNhdChBcnJheS5mcm9tKGcuZXh0ZXJuYWxzLnZhbHVlcygpKS5maWx0ZXIoZXh0ZXJuYWwgPT4gIWcubG9hZENoaWxkcmVuLmhhcyhleHRlcm5hbCkpKTtcbn1cblxuXG4vLyBmdW5jdGlvbiBhZGRBZGRpdGlvbmFsUGF0aHNGb3JUc1Jlc29sdmUodHNjb25maWdEaXI6IHN0cmluZywgY29tcGlsZXJPcHRpb25zOiB7cGF0aHM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX19KSB7XG4vLyAgIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuXG4vLyAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4vLyAgIGNvbnN0IGluc3RhbGxlZFBrZ3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKSkhLmluc3RhbGxlZENvbXBvbmVudHMhO1xuLy8gICBjb25zdCBwYXRoTWFwOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cbi8vICAgZm9yIChjb25zdCBwayBvZiBpbnN0YWxsZWRQa2dzLnZhbHVlcygpKSB7XG4vLyAgICAgcGF0aE1hcFtway5uYW1lXSA9IFtQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV07XG4vLyAgICAgcGF0aE1hcFtway5uYW1lICsgJy8qJ10gPSBbUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLyonXTtcbi8vICAgfVxuXG4vLyAgIHJldHVybiB7XG4vLyAgICAgLi4uY29tcGlsZXJPcHRpb25zLFxuLy8gICAgIHBhdGhzOiB7XG4vLyAgICAgICAuLi5jb21waWxlck9wdGlvbnMucGF0aHMsXG4vLyAgICAgICAuLi5wYXRoTWFwXG4vLyAgICAgfVxuLy8gICB9O1xuLy8gfVxuXG5cblxuIl19