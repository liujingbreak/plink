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
    const cwd = misc_1.plinkEnv.workDir;
    (0, package_mgr_1.getStore)().pipe((0, operators_1.distinctUntilChanged)((s1, s2) => s1.packagesUpdateChecksum === s2.packagesUpdateChecksum), (0, operators_1.skip)(1), (0, operators_1.map)(s => s.srcPackages), (0, operators_1.map)(srcPackages => {
        const paks = Array.from(srcPackages.values());
        const table = (0, misc_1.createCliTable)({
            horizontalLines: false,
            colAligns: ['right', 'left']
        });
        table.push([{ colSpan: 3, content: 'Linked packages', hAlign: 'center' }]);
        table.push(['Package name', 'Version', 'Path'], ['------------', '-------', '----']);
        for (const pk of paks) {
            table.push([pk.name, pk.json.version, chalk_1.default.gray(path_1.default.relative(cwd, pk.realPath))]);
        }
        console.log(table.toString());
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
                same ? expectedVer : isInstalled ? chalk_1.default.bgRed(expectedVer) : chalk_1.default.gray(expectedVer),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0NBQXdDO0FBQ3hDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUF1RTtBQUN2RSxnREFBZ0c7QUFDaEcsNEJBQTBCO0FBQzFCLG9EQUF5RDtBQUN6RCw4Q0FBOEM7QUFDOUMsK0NBQTRDO0FBQzVDLG9EQUF1QjtBQUV2Qix3Q0FBdUQ7QUFDdkQsb0NBQThEO0FBRTlELG1CQUF3QixHQUFrRCxFQUFFLFNBQWtCO0lBQzVGLGtCQUFzQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELE1BQU0sR0FBRyxHQUFHLGVBQVEsQ0FBQyxPQUFPLENBQUM7SUFDN0IsSUFBQSxzQkFBUSxHQUFFLENBQUMsSUFBSSxDQUNiLElBQUEsZ0NBQW9CLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsc0JBQXNCLEtBQUssRUFBRSxDQUFDLHNCQUFzQixDQUFDLEVBQ3pGLElBQUEsZ0JBQUksRUFBQyxDQUFDLENBQUMsRUFDUCxJQUFBLGVBQUcsRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDdkIsSUFBQSxlQUFHLEVBQUMsV0FBVyxDQUFDLEVBQUU7UUFDaEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUU5QyxNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFjLEVBQUM7WUFDM0IsZUFBZSxFQUFFLEtBQUs7WUFDdEIsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQztTQUM3QixDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxF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QUFFO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0RBQWdELGVBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLHlEQUF5RDtZQUMzSSxlQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ25IO0lBQ0QsSUFBSSxnQkFBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkdBQTJHO1lBQ3JILGVBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDdEg7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSwgbWF4LWxlbiAqL1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCBza2lwLCBzY2FuIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdGF0ZSwgZ2V0U3RvcmUsIFdvcmtzcGFjZVN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgJy4uL2VkaXRvci1oZWxwZXInO1xuaW1wb3J0IHsgcGFja2FnZXM0V29ya3NwYWNlS2V5IH0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG4vLyBpbXBvcnQgeyBnZXRSb290RGlyIH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgeyBsaXN0UHJvamVjdCB9IGZyb20gJy4vY2xpLXByb2plY3QnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIG9wdGlvbnMgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlLCBwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2Rpc3BhdGNoZXIgYXMgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcn0gZnJvbSAnLi4vc3RvcmUnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihvcHQ6IG9wdGlvbnMuSW5pdENtZE9wdGlvbnMgJiBvcHRpb25zLk5wbUNsaU9wdGlvbiwgd29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdzYXZlJyk7XG4gIGNvbnN0IGN3ZCA9IHBsaW5rRW52LndvcmtEaXI7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtID09PSBzMi5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKSxcbiAgICBza2lwKDEpLFxuICAgIG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgICBjb25zdCBwYWtzID0gQXJyYXkuZnJvbShzcmNQYWNrYWdlcy52YWx1ZXMoKSk7XG5cbiAgICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgICAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlLFxuICAgICAgICBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCddXG4gICAgICB9KTtcbiAgICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAzLCBjb250ZW50OiAnTGlua2VkIHBhY2thZ2VzJywgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICAgIHRhYmxlLnB1c2goWydQYWNrYWdlIG5hbWUnLCAnVmVyc2lvbicsICdQYXRoJ10sXG4gICAgICAgICAgICAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddKTtcbiAgICAgIGZvciAoY29uc3QgcGsgb2YgcGFrcykge1xuICAgICAgICB0YWJsZS5wdXNoKFtway5uYW1lLCAocGsuanNvbiBhcyB7dmVyc2lvbjogc3RyaW5nfSkudmVyc2lvbiwgY2hhbGsuZ3JheShQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpKV0pO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gICAgICBwcmludFdvcmtzcGFjZXMoKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGNvbnN0IGV4aXN0aW5nV3NLZXlzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzO1xuXG4gIC8vIHByaW50IG5ld2x5IGFkZGVkIHdvcmtzcGFjZSBob2lzdGVkIGRlcGVuZGVuY3kgaW5mb3JtYXRpb25cbiAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMubGFzdENyZWF0ZWRXb3Jrc3BhY2UpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgc2NhbigocHJldiwgY3VycikgPT4ge1xuICAgICAgaWYgKGN1cnIgJiYgIWV4aXN0aW5nV3NLZXlzLmhhcyhjdXJyKSkge1xuICAgICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQoY3VycikhKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjdXJyO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgLy8gcHJpbnQgZXhpc3Rpbmcgd29ya3NwYWNlIENIQU5HRUQgaG9pc3RlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIG1lcmdlKC4uLkFycmF5LmZyb20oZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKHdzS2V5ID0+IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHMgPT4gcy5nZXQod3NLZXkpKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMSEuaG9pc3RJbmZvID09PSBzMiEuaG9pc3RJbmZvICYmIHMxIS5ob2lzdFBlZXJEZXBJbmZvID09PSBzMiEuaG9pc3RQZWVyRGVwSW5mbyksXG4gICAgc2Nhbigod3NPbGQsIHdzTmV3KSA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnKioqKioqKioqKioqKioqKionLCB3c0tleSk7XG4gICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdzTmV3ISk7XG4gICAgICByZXR1cm4gd3NOZXc7XG4gICAgfSlcbiAgKSkpLnN1YnNjcmliZSgpO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBhY3Rpb25zLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiB3b3Jrc3BhY2UsIGlzRm9yY2U6IG9wdC5mb3JjZSwgY2FjaGU6IG9wdC5jYWNoZSwgdXNlTnBtQ2k6IG9wdC51c2VDaX0pO1xuICB9IGVsc2Uge1xuICAgIGFjdGlvbnMuaW5pdFJvb3REaXIoe2lzRm9yY2U6IG9wdC5mb3JjZSwgY2FjaGU6IG9wdC5jYWNoZSwgdXNlTnBtQ2k6IG9wdC51c2VDaX0pO1xuICAgIHNldEltbWVkaWF0ZSgoKSA9PiBsaXN0UHJvamVjdCgpKTtcbiAgfVxuICAvLyBzZXRJbW1lZGlhdGUoKCkgPT4gcHJpbnRXb3Jrc3BhY2VzKCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRXb3Jrc3BhY2VzKCkge1xuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtcbiAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlLFxuICAgIGNvbEFsaWduczogWydyaWdodCcsICdyaWdodCddXG4gIH0pO1xuICBjb25zdCBzZXAgPSBbJy0tLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0tLS0tLS0tLS0tLScsICctLS0tLS0tLS0tLS0nLCAnLS0tLS0tLS0tLScsICctLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpO1xuICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogNSwgY29udGVudDogY2hhbGsudW5kZXJsaW5lKCdXb3JrdHJlZSBTcGFjZSBhbmQgbGlua2VkIGRlcGVuZGVuY2llc1xcbicpLCBoQWxpZ246ICdjZW50ZXInfV0sXG4gICAgWydXT1JLVFJFRSBTUEFDRScsICdERVBFTkRFTkNZIFBBQ0tBR0UnLCAnRVhQRUNURUQgVkVSU0lPTicsICdBQ1RVQUwgVkVSU0lPTicsICdTUkMgRElSJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgc2VwKTtcblxuICBsZXQgd3NJZHggPSAwO1xuICBjb25zdCBzcmNQa2dzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCByZWxkaXIgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGlmICh3c0lkeCA+IDApIHtcbiAgICAgIHRhYmxlLnB1c2goc2VwKTtcbiAgICB9XG5cbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgcGtKc29uID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldChyZWxkaXIpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgICAvLyBjb25zb2xlLmxvZyhwa0pzb24pO1xuICAgIGxldCB3b3Jrc3BhY2VMYWJlbCA9IHJlbGRpciA/IGAgICR7cmVsZGlyfWAgOiAnICAocm9vdCBkaXJlY3RvcnkpJztcbiAgICBpZiAoZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlID09PSByZWxkaXIpIHtcbiAgICAgIHdvcmtzcGFjZUxhYmVsID0gY2hhbGsuaW52ZXJzZSh3b3Jrc3BhY2VMYWJlbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmtzcGFjZUxhYmVsID0gY2hhbGsuZ3JheSh3b3Jrc3BhY2VMYWJlbCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB7bmFtZTogZGVwLCBqc29uOiB7dmVyc2lvbjogdmVyfSwgaXNJbnN0YWxsZWR9IG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleShyZWxkaXIpKSB7XG4gICAgICBjb25zdCBleHBlY3RlZFZlciA9IGNvbnZlcnRWZXJzaW9uKHBrSnNvbiwgZGVwKTtcbiAgICAgIGNvbnN0IHNhbWUgPSBleHBlY3RlZFZlciA9PT0gdmVyO1xuICAgICAgdGFibGUucHVzaChbXG4gICAgICAgIGkgPT09IDAgPyB3b3Jrc3BhY2VMYWJlbCA6ICcnLFxuICAgICAgICBzYW1lIHx8ICFpc0luc3RhbGxlZCA/IGRlcCA6IGAke2NoYWxrLnJlZCgnKicpfSAke2RlcH1gLFxuICAgICAgICBzYW1lID8gZXhwZWN0ZWRWZXIgOiBpc0luc3RhbGxlZCA/IGNoYWxrLmJnUmVkKGV4cGVjdGVkVmVyKSA6IGNoYWxrLmdyYXkoZXhwZWN0ZWRWZXIpLFxuICAgICAgICB2ZXIsXG4gICAgICAgIGlzSW5zdGFsbGVkID8gY2hhbGsuZ3JheSgnKGluc3RhbGxlZCknKSA6IFBhdGgucmVsYXRpdmUocGxpbmtFbnYucm9vdERpciwgc3JjUGtncy5nZXQoZGVwKSEucmVhbFBhdGgpXG4gICAgICBdKTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHRhYmxlLnB1c2goW3dvcmtzcGFjZUxhYmVsXSk7XG4gICAgfVxuICAgIHdzSWR4Kys7XG4gIH1cblxuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbn1cblxuZnVuY3Rpb24gY29udmVydFZlcnNpb24ocGtnSnNvbjoge1xuICBkZXBlbmRlbmNpZXM/OiB7W2s6IHN0cmluZ106IHN0cmluZ307XG4gIGRldkRlcGVuZGVuY2llcz86IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbn0sIGRlcE5hbWU6IHN0cmluZykge1xuICBsZXQgdmVyID0gcGtnSnNvbi5kZXBlbmRlbmNpZXMgPyBwa2dKc29uLmRlcGVuZGVuY2llc1tkZXBOYW1lXSA6IG51bGw7XG4gIGlmICh2ZXIgPT0gbnVsbCAmJiBwa2dKc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgIHZlciA9IHBrZ0pzb24uZGV2RGVwZW5kZW5jaWVzW2RlcE5hbWVdO1xuICB9XG4gIGlmICh2ZXIgPT0gbnVsbCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuICBpZiAodmVyLnN0YXJ0c1dpdGgoJy4nKSB8fCB2ZXIuc3RhcnRzV2l0aCgnZmlsZTonKSkge1xuICAgIGNvbnN0IG0gPSAvXFwtKFxcZCsoPzpcXC5cXGQrKXsxLDJ9KD86XFwtW15cXC1dKyk/KVxcLnRneiQvLmV4ZWModmVyKTtcbiAgICBpZiAobSkge1xuICAgICAgcmV0dXJuIG1bMV07XG4gICAgfVxuICB9XG4gIHJldHVybiB2ZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdvcmtzcGFjZTogV29ya3NwYWNlU3RhdGUpIHtcbiAgY29uc29sZS5sb2coY2hhbGsuYm9sZChgXFxuSG9pc3RlZCBUcmFuc2l0aXZlIERlcGVuZGVuY3kgJiBEZXBlbmRlbnRzICgke3dvcmtzcGFjZS5pZCB8fCAnPHJvb3QgZGlyZWN0b3J5Pid9KWApKTtcbiAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICB0YWJsZS5wdXNoKFsnREVQRU5ERU5DWScsICdERVBFTkRFTlQnXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICBbJy0tLScsICctLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSk7XG4gIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0SW5mby5lbnRyaWVzKCkpIHtcbiAgICB0YWJsZS5wdXNoKHJlbmRlckhvaXN0RGVwSW5mbyhkZXAsIGRlcGVuZGVudHMpKTtcbiAgfVxuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgaWYgKHdvcmtzcGFjZS5ob2lzdERldkluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gICAgdGFibGUucHVzaChbJ0RFUEVOREVOQ1knLCAnREVQRU5ERU5UJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSkpO1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLmJvbGQoYFxcbkhvaXN0ZWQgVHJhbnNpdGl2ZSAoZGV2KSBEZXBlbmRlbmN5ICYgRGVwZW5kZW50cyAoJHt3b3Jrc3BhY2UuaWQgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3REZXZJbmZvLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdERlcEluZm8oZGVwLCBkZXBlbmRlbnRzKSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mby5zaXplID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLmJvbGQoYEhvaXN0ZWQgVHJhbnNpdGl2ZSBQZWVyIERlcGVuZGVuY2llcyAoJHt3b3Jrc3BhY2UuaWQgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydERVBFTkRFTkNZJywgJ0RFUEVOREVOVCddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdFBlZXJEZXBJbmZvLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBpZiAod29ya3NwYWNlLmhvaXN0RGV2UGVlckRlcEluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3dCcmlnaHQoYFxcbkhvaXN0ZWQgVHJhbnNpdGl2ZSBQZWVyIERlcGVuZGVuY2llcyAoZGV2KSAoJHt3b3Jrc3BhY2UuaWQgfHwgJzxyb290IGRpcmVjdG9yeT4nfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydERVBFTkRFTkNZJywgJ0RFUEVOREVOVCddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBwcmludENvbG9yRXhwbGFpbmF0aW9uKHdvcmtzcGFjZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRhYmxlKCkge1xuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtcbiAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlLFxuICAgIC8vIHN0eWxlOiB7aGVhZDogW119LFxuICAgIGNvbEFsaWduczogWydyaWdodCcsICdsZWZ0J11cbiAgfSk7XG4gIHJldHVybiB0YWJsZTtcbn1cblxudHlwZSBEZXBlbmRlbnRJbmZvID0gV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mbyddIGV4dGVuZHMgTWFwPHN0cmluZywgaW5mZXIgVD4gPyBUIDogdW5rbm93bjtcblxuZnVuY3Rpb24gcmVuZGVySG9pc3REZXBJbmZvKGRlcDogc3RyaW5nLCBkZXBlbmRlbnRzOiBEZXBlbmRlbnRJbmZvKTogW2RlcDogc3RyaW5nLCB2ZXI6IHN0cmluZ10ge1xuICByZXR1cm4gW1xuICAgIGRlcGVuZGVudHMuc2FtZVZlciA/IGRlcCA6IGRlcGVuZGVudHMuZGlyZWN0ID8gY2hhbGsueWVsbG93KGRlcCkgOiBjaGFsay5iZ1JlZChkZXApLFxuICAgIGRlcGVuZGVudHMuYnkubWFwKChpdGVtLCBpZHgpID0+XG4gICAgICBgJHtkZXBlbmRlbnRzLmRpcmVjdCAmJiBpZHggPT09IDAgPyBjaGFsay5ncmVlbihpdGVtLnZlcikgOiBpZHggPiAwID8gY2hhbGsuZ3JheShpdGVtLnZlcikgOiBjaGFsay5jeWFuKGl0ZW0udmVyKX06ICR7Y2hhbGsuZ3JleShpdGVtLm5hbWUpfWBcbiAgICApLmpvaW4oJ1xcbicpXG4gIF07XG59XG5mdW5jdGlvbiByZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcDogc3RyaW5nLCBkZXBlbmRlbnRzOiBEZXBlbmRlbnRJbmZvKTogW2RlcDogc3RyaW5nLCB2ZXI6IHN0cmluZ10ge1xuICByZXR1cm4gW1xuICAgIGRlcGVuZGVudHMubWlzc2luZyA/IGNoYWxrLmJnWWVsbG93KGRlcCkgOiAoZGVwZW5kZW50cy5kdXBsaWNhdGVQZWVyID8gZGVwIDogY2hhbGsuZ3JlZW4oZGVwKSksXG4gICAgZGVwZW5kZW50cy5ieS5tYXAoKGl0ZW0sIGlkeCkgPT5cbiAgICAgIGAke2RlcGVuZGVudHMuZGlyZWN0ICYmIGlkeCA9PT0gMCA/IGNoYWxrLmdyZWVuKGl0ZW0udmVyKSA6IGlkeCA+IDAgPyBpdGVtLnZlciA6IGNoYWxrLmN5YW4oaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YFxuICAgICkuam9pbignXFxuJylcbiAgXTtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb2xvckV4cGxhaW5hdGlvbih3b3Jrc3BhY2U6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnN0IHN1bW1hcnkgPSB3b3Jrc3BhY2UuaG9pc3RJbmZvU3VtbWFyeTtcbiAgaWYgKHN1bW1hcnkgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChzdW1tYXJ5LmNvbmZsaWN0RGVwcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS5sb2coYEFib3ZlIGxpc3RlZCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llczogXCIke2NoYWxrLnJlZChzdW1tYXJ5LmNvbmZsaWN0RGVwcy5qb2luKCcsICcpKX1cIiBoYXZlIGAgK1xuICAgICAgJ2NvbmZsaWN0IGRlcGVuZGVuY3kgdmVyc2lvbiwgcmVzb2x2ZSB0aGVtIGJ5IGNob29zaW5nIGEgdmVyc2lvbiBhbmQgYWRkIHRoZW0gdG8gd29ya3RyZWUgc3BhY2UuXFxuJyk7XG4gIH1cbiAgaWYgKF8uc2l6ZShzdW1tYXJ5Lm1pc3NpbmdEZXBzKSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhgQWJvdmUgbGlzdGVkIHRyYW5zaXRpdmUgcGVlciBkZXBlbmRlbmNpZXMgaW4gJHtjaGFsay5iZ1llbGxvdygneWVsbG93Jyl9IHNob3VsZCBiZSBhZGRlZCB0byB3b3JrdHJlZSBzcGFjZSBhcyBcImRlcGVuZGVuY2llc1wiOlxcbmAgK1xuICAgICAgY2hhbGsueWVsbG93KEpTT04uc3RyaW5naWZ5KHN1bW1hcnkubWlzc2luZ0RlcHMsIG51bGwsICcgICcpLnJlcGxhY2UoL14oW15dKS9tZywgKG0sIHAxKSA9PiAnICAnICsgcDEpICsgJ1xcbicpKTtcbiAgfVxuICBpZiAoXy5zaXplKHN1bW1hcnkubWlzc2luZ0RldkRlcHMpID4gMCkge1xuICAgIGNvbnNvbGUubG9nKCdBYm92ZSBsaXN0ZWQgdHJhbnNpdGl2ZSBwZWVyIGRlcGVuZGVuY2llcyBtaWdodCBzaG91bGQgYmUgYWRkZWQgdG8gd29ya3RyZWUgc3BhY2UgYXMgXCJkZXZEZXBlbmRlbmNpZXNcIjpcXG4nICtcbiAgICAgIGNoYWxrLnllbGxvdyhKU09OLnN0cmluZ2lmeShzdW1tYXJ5Lm1pc3NpbmdEZXZEZXBzLCBudWxsLCAnICAnKS5yZXBsYWNlKC9eKFteXSkvbWcsIChtLCBwMSkgPT4gJyAgJyArIHAxKSkgKyAnXFxuJyk7XG4gIH1cbn1cbiJdfQ==