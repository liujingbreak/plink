"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printWorkspaceHoistedDeps = exports.printWorkspaces = void 0;
/* eslint-disable no-console, max-len */
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const cli_ls_1 = require("./cli-ls");
const package_mgr_1 = require("../package-mgr");
require("../editor-helper");
const package_utils_1 = require("../package-utils");
// import { getRootDir } from '../utils/misc';
const cli_project_1 = require("./cli-project");
const lodash_1 = __importDefault(require("lodash"));
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
function default_1(opt, workspace) {
    store_1.dispatcher.changeActionOnExit('save');
    (0, package_mgr_1.getStore)().pipe((0, operators_1.distinctUntilChanged)((s1, s2) => s1.packagesUpdateChecksum === s2.packagesUpdateChecksum), (0, operators_1.skip)(1), (0, operators_1.map)(s => {
        console.log((0, cli_ls_1.listPackagesByProjects)(s));
        printWorkspaces();
    })).subscribe();
    const existingWsKeys = (0, package_mgr_1.getState)().workspaces;
    // print newly added workspace hoisted dependency information
    (0, package_mgr_1.getStore)().pipe((0, operators_1.map)(s => s.lastCreatedWorkspace), (0, operators_1.distinctUntilChanged)(), (0, operators_1.scan)((prev, curr) => {
        if (curr && !existingWsKeys.has(curr)) {
            printWorkspaceHoistedDeps((0, package_mgr_1.getState)().workspaces.get(curr));
        }
        return curr;
    })).subscribe();
    // print existing workspace CHANGED hoisted dependency information
    (0, rxjs_1.merge)(...Array.from((0, package_mgr_1.getState)().workspaces.keys()).map(wsKey => (0, package_mgr_1.getStore)().pipe((0, operators_1.map)(s => s.workspaces), (0, operators_1.distinctUntilChanged)(), (0, operators_1.map)(s => s.get(wsKey)), (0, operators_1.distinctUntilChanged)((s1, s2) => s1.hoistInfo === s2.hoistInfo && s1.hoistPeerDepInfo === s2.hoistPeerDepInfo), (0, operators_1.scan)((wsOld, wsNew) => {
        // console.log('*****************', wsKey);
        printWorkspaceHoistedDeps(wsNew);
        return wsNew;
    })))).subscribe();
    if (workspace) {
        package_mgr_1.actionDispatcher.updateWorkspace({ dir: workspace, isForce: opt.force, cache: opt.cache, useNpmCi: opt.useCi });
    }
    else {
        package_mgr_1.actionDispatcher.initRootDir({ isForce: opt.force, cache: opt.cache, useNpmCi: opt.useCi });
        setImmediate(() => (0, cli_project_1.listProject)());
    }
    // setImmediate(() => printWorkspaces());
}
exports.default = default_1;
function printWorkspaces() {
    const table = (0, misc_1.createCliTable)({
        horizontalLines: false,
        colAligns: ['right', 'right']
    });
    const sep = ['--------------', '------------------', '------------', '----------', '-----'].map(item => chalk_1.default.gray(item));
    table.push([{ colSpan: 5, content: chalk_1.default.underline('Worktree Space and linked dependencies\n'), hAlign: 'center' }], ['WORKTREE SPACE', 'DEPENDENCY PACKAGE', 'EXPECTED VERSION', 'ACTUAL VERSION', 'SRC DIR'].map(item => chalk_1.default.gray(item)), sep);
    let wsIdx = 0;
    const srcPkgs = (0, package_mgr_1.getState)().srcPackages;
    for (const reldir of (0, package_mgr_1.getState)().workspaces.keys()) {
        if (wsIdx > 0) {
            table.push(sep);
        }
        let i = 0;
        const pkJson = (0, package_mgr_1.getState)().workspaces.get(reldir).originInstallJson;
        // console.log(pkJson);
        let workspaceLabel = reldir ? `  ${reldir}` : '  (root directory)';
        if ((0, package_mgr_1.getState)().currWorkspace === reldir) {
            workspaceLabel = chalk_1.default.inverse(workspaceLabel);
        }
        else {
            workspaceLabel = chalk_1.default.gray(workspaceLabel);
        }
        for (const { name: dep, json: { version: ver }, isInstalled } of (0, package_utils_1.packages4WorkspaceKey)(reldir)) {
            const expectedVer = convertVersion(pkJson, dep);
            const same = expectedVer === ver;
            table.push([
                i === 0 ? workspaceLabel : '',
                same || !isInstalled ? dep : `${chalk_1.default.red('*')} ${dep}`,
                same ? expectedVer : chalk_1.default.yellow(expectedVer),
                ver,
                isInstalled ? chalk_1.default.gray('(installed)') : path_1.default.relative(misc_1.plinkEnv.rootDir, srcPkgs.get(dep).realPath)
            ]);
            i++;
        }
        if (i === 0) {
            table.push([workspaceLabel]);
        }
        wsIdx++;
    }
    console.log(table.toString());
}
exports.printWorkspaces = printWorkspaces;
function convertVersion(pkgJson, depName) {
    let ver = pkgJson.dependencies ? pkgJson.dependencies[depName] : null;
    if (ver == null && pkgJson.devDependencies) {
        ver = pkgJson.devDependencies[depName];
    }
    if (ver == null) {
        return '';
    }
    if (ver.startsWith('.') || ver.startsWith('file:')) {
        const m = /\-(\d+(?:\.\d+){1,2}(?:\-[^\-]+)?)\.tgz$/.exec(ver);
        if (m) {
            return m[1];
        }
    }
    return ver;
}
function printWorkspaceHoistedDeps(workspace) {
    console.log(chalk_1.default.bold(`\nHoisted Transitive Dependency & Dependents (${workspace.id || '<root directory>'})`));
    const table = createTable();
    table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
    for (const [dep, dependents] of workspace.hoistInfo.entries()) {
        table.push(renderHoistDepInfo(dep, dependents));
    }
    console.log(table.toString());
    if (workspace.hoistDevInfo.size > 0) {
        const table = createTable();
        table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
        console.log(chalk_1.default.bold(`\nHoisted Transitive (dev) Dependency & Dependents (${workspace.id || '<root directory>'})`));
        for (const [dep, dependents] of workspace.hoistDevInfo.entries()) {
            table.push(renderHoistDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    if (workspace.hoistPeerDepInfo.size > 0) {
        console.log(chalk_1.default.bold(`Hoisted Transitive Peer Dependencies (${workspace.id || '<root directory>'})`));
        const table = createTable();
        table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
        for (const [dep, dependents] of workspace.hoistPeerDepInfo.entries()) {
            table.push(renderHoistPeerDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    if (workspace.hoistDevPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright(`\nHoisted Transitive Peer Dependencies (dev) (${workspace.id || '<root directory>'})`));
        const table = createTable();
        table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
        for (const [dep, dependents] of workspace.hoistDevPeerDepInfo.entries()) {
            table.push(renderHoistPeerDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    printColorExplaination(workspace);
}
exports.printWorkspaceHoistedDeps = printWorkspaceHoistedDeps;
function createTable() {
    const table = (0, misc_1.createCliTable)({
        horizontalLines: false,
        // style: {head: []},
        colAligns: ['right', 'left']
    });
    return table;
}
function renderHoistDepInfo(dep, dependents) {
    return [
        dependents.sameVer ? dep : dependents.direct ? chalk_1.default.yellow(dep) : chalk_1.default.bgRed(dep),
        dependents.by.map((item, idx) => `${dependents.direct && idx === 0 ? chalk_1.default.green(item.ver) : idx > 0 ? chalk_1.default.gray(item.ver) : chalk_1.default.cyan(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')
    ];
}
function renderHoistPeerDepInfo(dep, dependents) {
    return [
        dependents.missing ? chalk_1.default.bgYellow(dep) : (dependents.duplicatePeer ? dep : chalk_1.default.green(dep)),
        dependents.by.map((item, idx) => `${dependents.direct && idx === 0 ? chalk_1.default.green(item.ver) : idx > 0 ? item.ver : chalk_1.default.cyan(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')
    ];
}
function printColorExplaination(workspace) {
    const summary = workspace.hoistInfoSummary;
    if (summary == null)
        return;
    if (summary.conflictDeps.length > 0) {
        console.log(`Above listed transitive dependencies: "${chalk_1.default.red(summary.conflictDeps.join(', '))}" have ` +
            'conflict dependency version, resolve them by choosing a version and add them to worktree space.\n');
    }
    if (lodash_1.default.size(summary.missingDeps) > 0) {
        console.log(`Above listed transitive peer dependencies in ${chalk_1.default.bgYellow('yellow')} should be added to worktree space as "dependencies":\n` +
            chalk_1.default.yellow(JSON.stringify(summary.missingDeps, null, '  ').replace(/^([^])/mg, (m, p1) => '  ' + p1) + '\n'));
    }
    if (lodash_1.default.size(summary.missingDevDeps) > 0) {
        console.log('Above listed transitive peer dependencies might should be added to worktree space as "devDependencies":\n' +
            chalk_1.default.yellow(JSON.stringify(summary.missingDevDeps, null, '  ').replace(/^([^])/mg, (m, p1) => '  ' + p1)) + '\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0NBQXdDO0FBQ3hDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUF1RTtBQUN2RSxxQ0FBZ0Q7QUFDaEQsZ0RBQWdHO0FBQ2hHLDRCQUEwQjtBQUMxQixvREFBeUQ7QUFDekQsOENBQThDO0FBQzlDLCtDQUE0QztBQUM1QyxvREFBdUI7QUFFdkIsd0NBQXVEO0FBQ3ZELG9DQUE4RDtBQUU5RCxtQkFBd0IsR0FBa0QsRUFBRSxTQUFrQjtJQUM1RixrQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsRCxJQUFBLHNCQUFRLEdBQUUsQ0FBQyxJQUFJLENBQ2IsSUFBQSxnQ0FBb0IsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsS0FBSyxFQUFFLENBQUMsc0JBQXNCLENBQUMsRUFDekYsSUFBQSxnQkFBSSxFQUFDLENBQUMsQ0FBQyxFQUNQLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLCtCQUFzQixFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMsZUFBZSxFQUFFLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUVkLE1BQU0sY0FBYyxHQUFHLElBQUEsc0JBQVEsR0FBRSxDQUFDLFVBQVUsQ0FBQztJQUU3Qyw2REFBNkQ7SUFDN0QsSUFBQSxzQkFBUSxHQUFFLENBQUMsSUFBSSxDQUFDLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQzlDLElBQUEsZ0NBQW9CLEdBQUUsRUFDdEIsSUFBQSxnQkFBSSxFQUFD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QVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUztZQUN2RyxtR0FBbUcsQ0FBQyxDQUFDO0tBQ3hHO0lBQ0QsSUFBSSxnQkFBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0RBQWdELGVBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLHlEQUF5RDtZQUMzSSxlQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ25IO0lBQ0QsSUFBSSxnQkFBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkdBQTJHO1lBQ3JILGVBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDdEg7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSwgbWF4LWxlbiAqL1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCBza2lwLCBzY2FuIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtsaXN0UGFja2FnZXNCeVByb2plY3RzfSBmcm9tICcuL2NsaS1scyc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIGFjdGlvbnMsIGdldFN0YXRlLCBnZXRTdG9yZSwgV29ya3NwYWNlU3RhdGV9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCAnLi4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgeyBwYWNrYWdlczRXb3Jrc3BhY2VLZXkgfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbi8vIGltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7IGxpc3RQcm9qZWN0IH0gZnJvbSAnLi9jbGktcHJvamVjdCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgb3B0aW9ucyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGUsIHBsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7ZGlzcGF0Y2hlciBhcyBzdG9yZVNldHRpbmdEaXNwYXRjaGVyfSBmcm9tICcuLi9zdG9yZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG9wdDogb3B0aW9ucy5Jbml0Q21kT3B0aW9ucyAmIG9wdGlvbnMuTnBtQ2xpT3B0aW9uLCB3b3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0gPT09IHMyLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0pLFxuICAgIHNraXAoMSksXG4gICAgbWFwKHMgPT4ge1xuICAgICAgY29uc29sZS5sb2cobGlzdFBhY2thZ2VzQnlQcm9qZWN0cyhzKSk7XG4gICAgICBwcmludFdvcmtzcGFjZXMoKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGNvbnN0IGV4aXN0aW5nV3NLZXlzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzO1xuXG4gIC8vIHByaW50IG5ld2x5IGFkZGVkIHdvcmtzcGFjZSBob2lzdGVkIGRlcGVuZGVuY3kgaW5mb3JtYXRpb25cbiAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMubGFzdENyZWF0ZWRXb3Jrc3BhY2UpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgc2NhbigocHJldiwgY3VycikgPT4ge1xuICAgICAgaWYgKGN1cnIgJiYgIWV4aXN0aW5nV3NLZXlzLmhhcyhjdXJyKSkge1xuICAgICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQoY3VycikhKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjdXJyO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgLy8gcHJpbnQgZXhpc3Rpbmcgd29ya3NwYWNlIENIQU5HRUQgaG9pc3RlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIG1lcmdlKC4uLkFycmF5LmZyb20oZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKHdzS2V5ID0+IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHMgPT4gcy5nZXQod3NLZXkpKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMSEuaG9pc3RJbmZvID09PSBzMiEuaG9pc3RJbmZvICYmIHMxIS5ob2lzdFBlZXJEZXBJbmZvID09PSBzMiEuaG9pc3RQZWVyRGVwSW5mbyksXG4gICAgc2Nhbigod3NPbGQsIHdzTmV3KSA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnKioqKioqKioqKioqKioqKionLCB3c0tleSk7XG4gICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdzTmV3ISk7XG4gICAgICByZXR1cm4gd3NOZXc7XG4gICAgfSlcbiAgKSkpLnN1YnNjcmliZSgpO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBhY3Rpb25zLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiB3b3Jrc3BhY2UsIGlzRm9yY2U6IG9wdC5mb3JjZSwgY2FjaGU6IG9wdC5jYWNoZSwgdXNlTnBtQ2k6IG9wdC51c2VDaX0pO1xuICB9IGVsc2Uge1xuICAgIGFjdGlvbnMuaW5pdFJvb3REaXIoe2lzRm9yY2U6IG9wdC5mb3JjZSwgY2FjaGU6IG9wdC5jYWNoZSwgdXNlTnBtQ2k6IG9wdC51c2VDaX0pO1xuICAgIHNldEltbWVkaWF0ZSgoKSA9PiBsaXN0UHJvamVjdCgpKTtcbiAgfVxuICAvLyBzZXRJbW1lZGlhdGUoKCkgPT4gcHJpbnRXb3Jrc3BhY2VzKCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRXb3Jrc3BhY2VzKCkge1xuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtcbiAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlLFxuICAgIGNvbEFsaWduczogWydyaWdodCcsICdyaWdodCddXG4gIH0pO1xuICBjb25zdCBzZXAgPSBbJy0tLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0tLS0tLS0tLS0tLScsICctLS0tLS0tLS0tLS0nLCAnLS0tLS0tLS0tLScsICctLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpO1xuICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogNSwgY29udGVudDogY2hhbGsudW5kZXJsaW5lKCdXb3JrdHJlZSBTcGFjZSBhbmQgbGlua2VkIGRlcGVuZGVuY2llc1xcbicpLCBoQWxpZ246ICdjZW50ZXInfV0sXG4gICAgWydXT1JLVFJFRSBTUEFDRScsICdERVBFTkRFTkNZIFBBQ0tBR0UnLCAnRVhQRUNURUQgVkVSU0lPTicsICdBQ1RVQUwgVkVSU0lPTicsICdTUkMgRElSJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgc2VwKTtcblxuICBsZXQgd3NJZHggPSAwO1xuICBjb25zdCBzcmNQa2dzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCByZWxkaXIgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGlmICh3c0lkeCA+IDApIHtcbiAgICAgIHRhYmxlLnB1c2goc2VwKTtcbiAgICB9XG5cbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgcGtKc29uID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldChyZWxkaXIpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgICAvLyBjb25zb2xlLmxvZyhwa0pzb24pO1xuICAgIGxldCB3b3Jrc3BhY2VMYWJlbCA9IHJlbGRpciA/IGAgICR7cmVsZGlyfWAgOiAnICAocm9vdCBkaXJlY3RvcnkpJztcbiAgICBpZiAoZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlID09PSByZWxkaXIpIHtcbiAgICAgIHdvcmtzcGFjZUxhYmVsID0gY2hhbGsuaW52ZXJzZSh3b3Jrc3BhY2VMYWJlbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmtzcGFjZUxhYmVsID0gY2hhbGsuZ3JheSh3b3Jrc3BhY2VMYWJlbCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB7bmFtZTogZGVwLCBqc29uOiB7dmVyc2lvbjogdmVyfSwgaXNJbnN0YWxsZWR9IG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleShyZWxkaXIpKSB7XG4gICAgICBjb25zdCBleHBlY3RlZFZlciA9IGNvbnZlcnRWZXJzaW9uKHBrSnNvbiwgZGVwKTtcbiAgICAgIGNvbnN0IHNhbWUgPSBleHBlY3RlZFZlciA9PT0gdmVyO1xuICAgICAgdGFibGUucHVzaChbXG4gICAgICAgIGkgPT09IDAgPyB3b3Jrc3BhY2VMYWJlbCA6ICcnLFxuICAgICAgICBzYW1lIHx8ICFpc0luc3RhbGxlZCA/IGRlcCA6IGAke2NoYWxrLnJlZCgnKicpfSAke2RlcH1gLFxuICAgICAgICBzYW1lID8gZXhwZWN0ZWRWZXIgOiBjaGFsay55ZWxsb3coZXhwZWN0ZWRWZXIpLFxuICAgICAgICB2ZXIsXG4gICAgICAgIGlzSW5zdGFsbGVkID8gY2hhbGsuZ3JheSgnKGluc3RhbGxlZCknKSA6IFBhdGgucmVsYXRpdmUocGxpbmtFbnYucm9vdERpciwgc3JjUGtncy5nZXQoZGVwKSEucmVhbFBhdGgpXG4gICAgICBdKTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHRhYmxlLnB1c2goW3dvcmtzcGFjZUxhYmVsXSk7XG4gICAgfVxuICAgIHdzSWR4Kys7XG4gIH1cblxuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFZlcnNpb24ocGtnSnNvbjoge1xuICBkZXBlbmRlbmNpZXM/OiB7W2s6IHN0cmluZ106IHN0cmluZ307XG4gIGRldkRlcGVuZGVuY2llcz86IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbn0sIGRlcE5hbWU6IHN0cmluZykge1xuICBsZXQgdmVyID0gcGtnSnNvbi5kZXBlbmRlbmNpZXMgPyBwa2dKc29uLmRlcGVuZGVuY2llc1tkZXBOYW1lXSA6IG51bGw7XG4gIGlmICh2ZXIgPT0gbnVsbCAmJiBwa2dKc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgIHZlciA9IHBrZ0pzb24uZGV2RGVwZW5kZW5jaWVzW2RlcE5hbWVdO1xuICB9XG4gIGlmICh2ZXIgPT0gbnVsbCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuICBpZiAodmVyLnN0YXJ0c1dpdGgoJy4nKSB8fCB2ZXIuc3RhcnRzV2l0aCgnZmlsZTonKSkge1xuICAgIGNvbnN0IG0gPSAvXFwtKFxcZCsoPzpcXC5cXGQrKXsxLDJ9KD86XFwtW15cXC1dKyk/KVxcLnRneiQvLmV4ZWModmVyKTtcbiAgICBpZiAobSkge1xuICAgICAgcmV0dXJuIG1bMV07XG4gICAgfVxuICB9XG4gIHJldHVybiB2ZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdvcmtzcGFjZTogV29ya3NwYWNlU3RhdGUpIHtcbiAgY29uc29sZS5sb2coY2hhbGsuYm9sZChgXFxuSG9pc3RlZCBUcmFuc2l0aXZlIERlcGVuZGVuY3kgJiBEZXBlbmRlbnRzICgke3dvcmtzcGFjZS5pZCB8fCAnPHJvb3QgZGlyZWN0b3J5Pid9KWApKTtcbiAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICB0YWJsZS5wdXNoKFsnREVQRU5ERU5DWScsICdERVBFTkRFTlQnXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICBbJy0tLScsICctLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSk7XG4gIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0SW5mby5lbnRyaWVzKCkpIHtcbiAgICB0YWJsZS5wdXNoKHJlbmRlckhvaXN0RGVwSW5mbyhkZXAsIGRlcGVuZGVudHMpKTtcbiAgfVxuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgaWYgKHdvcmtzcGFjZS5ob2lzdERldkluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gICAgdGFibGUucHVzaChbJ0RFUEVOREVOQ1knLCAnREVQRU5ERU5UJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSkpO1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLmJvbGQoYFxcbkhvaXN0ZWQgVHJhbnNpdGl2ZSAoZGV2KSBEZXBlbmRlbmN5ICYgRGVwZW5kZW50cyAoJHt3b3Jrc3BhY2UuaWQgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3REZXZJbmZvLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdERlcEluZm8oZGVwLCBkZXBlbmRlbnRzKSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mby5zaXplID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLmJvbGQoYEhvaXN0ZWQgVHJhbnNpdGl2ZSBQZWVyIERlcGVuZGVuY2llcyAoJHt3b3Jrc3BhY2UuaWQgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydERVBFTkRFTkNZJywgJ0RFUEVOREVOVCddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdFBlZXJEZXBJbmZvLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBpZiAod29ya3NwYWNlLmhvaXN0RGV2UGVlckRlcEluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3dCcmlnaHQoYFxcbkhvaXN0ZWQgVHJhbnNpdGl2ZSBQZWVyIERlcGVuZGVuY2llcyAoZGV2KSAoJHt3b3Jrc3BhY2UuaWQgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydERVBFTkRFTkNZJywgJ0RFUEVOREVOVCddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBwcmludENvbG9yRXhwbGFpbmF0aW9uKHdvcmtzcGFjZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRhYmxlKCkge1xuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtcbiAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlLFxuICAgIC8vIHN0eWxlOiB7aGVhZDogW119LFxuICAgIGNvbEFsaWduczogWydyaWdodCcsICdsZWZ0J11cbiAgfSk7XG4gIHJldHVybiB0YWJsZTtcbn1cblxudHlwZSBEZXBlbmRlbnRJbmZvID0gV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mbyddIGV4dGVuZHMgTWFwPHN0cmluZywgaW5mZXIgVD4gPyBUIDogdW5rbm93bjtcblxuZnVuY3Rpb24gcmVuZGVySG9pc3REZXBJbmZvKGRlcDogc3RyaW5nLCBkZXBlbmRlbnRzOiBEZXBlbmRlbnRJbmZvKTogW2RlcDogc3RyaW5nLCB2ZXI6IHN0cmluZ10ge1xuICByZXR1cm4gW1xuICAgIGRlcGVuZGVudHMuc2FtZVZlciA/IGRlcCA6IGRlcGVuZGVudHMuZGlyZWN0ID8gY2hhbGsueWVsbG93KGRlcCkgOiBjaGFsay5iZ1JlZChkZXApLFxuICAgIGRlcGVuZGVudHMuYnkubWFwKChpdGVtLCBpZHgpID0+XG4gICAgICBgJHtkZXBlbmRlbnRzLmRpcmVjdCAmJiBpZHggPT09IDAgPyBjaGFsay5ncmVlbihpdGVtLnZlcikgOiBpZHggPiAwID8gY2hhbGsuZ3JheShpdGVtLnZlcikgOiBjaGFsay5jeWFuKGl0ZW0udmVyKX06ICR7Y2hhbGsuZ3JleShpdGVtLm5hbWUpfWBcbiAgICApLmpvaW4oJ1xcbicpXG4gIF07XG59XG5mdW5jdGlvbiByZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcDogc3RyaW5nLCBkZXBlbmRlbnRzOiBEZXBlbmRlbnRJbmZvKTogW2RlcDogc3RyaW5nLCB2ZXI6IHN0cmluZ10ge1xuICByZXR1cm4gW1xuICAgIGRlcGVuZGVudHMubWlzc2luZyA/IGNoYWxrLmJnWWVsbG93KGRlcCkgOiAoZGVwZW5kZW50cy5kdXBsaWNhdGVQZWVyID8gZGVwIDogY2hhbGsuZ3JlZW4oZGVwKSksXG4gICAgZGVwZW5kZW50cy5ieS5tYXAoKGl0ZW0sIGlkeCkgPT5cbiAgICAgIGAke2RlcGVuZGVudHMuZGlyZWN0ICYmIGlkeCA9PT0gMCA/IGNoYWxrLmdyZWVuKGl0ZW0udmVyKSA6IGlkeCA+IDAgPyBpdGVtLnZlciA6IGNoYWxrLmN5YW4oaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YFxuICAgICkuam9pbignXFxuJylcbiAgXTtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb2xvckV4cGxhaW5hdGlvbih3b3Jrc3BhY2U6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnN0IHN1bW1hcnkgPSB3b3Jrc3BhY2UuaG9pc3RJbmZvU3VtbWFyeTtcbiAgaWYgKHN1bW1hcnkgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChzdW1tYXJ5LmNvbmZsaWN0RGVwcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS5sb2coYEFib3ZlIGxpc3RlZCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llczogXCIke2NoYWxrLnJlZChzdW1tYXJ5LmNvbmZsaWN0RGVwcy5qb2luKCcsICcpKX1cIiBoYXZlIGAgK1xuICAgICAgJ2NvbmZsaWN0IGRlcGVuZGVuY3kgdmVyc2lvbiwgcmVzb2x2ZSB0aGVtIGJ5IGNob29zaW5nIGEgdmVyc2lvbiBhbmQgYWRkIHRoZW0gdG8gd29ya3RyZWUgc3BhY2UuXFxuJyk7XG4gIH1cbiAgaWYgKF8uc2l6ZShzdW1tYXJ5Lm1pc3NpbmdEZXBzKSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhgQWJvdmUgbGlzdGVkIHRyYW5zaXRpdmUgcGVlciBkZXBlbmRlbmNpZXMgaW4gJHtjaGFsay5iZ1llbGxvdygneWVsbG93Jyl9IHNob3VsZCBiZSBhZGRlZCB0byB3b3JrdHJlZSBzcGFjZSBhcyBcImRlcGVuZGVuY2llc1wiOlxcbmAgK1xuICAgICAgY2hhbGsueWVsbG93KEpTT04uc3RyaW5naWZ5KHN1bW1hcnkubWlzc2luZ0RlcHMsIG51bGwsICcgICcpLnJlcGxhY2UoL14oW15dKS9tZywgKG0sIHAxKSA9PiAnICAnICsgcDEpICsgJ1xcbicpKTtcbiAgfVxuICBpZiAoXy5zaXplKHN1bW1hcnkubWlzc2luZ0RldkRlcHMpID4gMCkge1xuICAgIGNvbnNvbGUubG9nKCdBYm92ZSBsaXN0ZWQgdHJhbnNpdGl2ZSBwZWVyIGRlcGVuZGVuY2llcyBtaWdodCBzaG91bGQgYmUgYWRkZWQgdG8gd29ya3RyZWUgc3BhY2UgYXMgXCJkZXZEZXBlbmRlbmNpZXNcIjpcXG4nICtcbiAgICAgIGNoYWxrLnllbGxvdyhKU09OLnN0cmluZ2lmeShzdW1tYXJ5Lm1pc3NpbmdEZXZEZXBzLCBudWxsLCAnICAnKS5yZXBsYWNlKC9eKFteXSkvbWcsIChtLCBwMSkgPT4gJyAgJyArIHAxKSkgKyAnXFxuJyk7XG4gIH1cbn1cbiJdfQ==