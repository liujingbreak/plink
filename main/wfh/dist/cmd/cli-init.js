"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printWorkspaceHoistedDeps = exports.printWorkspaces = void 0;
// tslint:disable: no-console max-line-length
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const config_1 = __importDefault(require("../config"));
const package_mgr_1 = require("../package-mgr");
const package_utils_1 = require("../package-utils");
// import { getRootDir } from '../utils/misc';
const cli_project_1 = require("./cli-project");
const misc_1 = require("../utils/misc");
function default_1(opt, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        const cwd = process.cwd();
        package_mgr_1.getStore().pipe(operators_1.distinctUntilChanged((s1, s2) => s1.workspaceUpdateChecksum === s2.workspaceUpdateChecksum), operators_1.skip(1), operators_1.take(1), operators_1.map(s => s.srcPackages), operators_1.map(srcPackages => {
            const paks = Array.from(srcPackages.values());
            const table = misc_1.createCliTable({
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
        const existingWsKeys = package_mgr_1.getState().workspaces;
        // print newly added workspace hoisted dependency information
        package_mgr_1.getStore().pipe(operators_1.map(s => s.lastCreatedWorkspace), operators_1.distinctUntilChanged(), operators_1.scan((prev, curr) => {
            if (curr && !existingWsKeys.has(curr)) {
                printWorkspaceHoistedDeps(package_mgr_1.getState().workspaces.get(curr));
            }
            return curr;
        })).subscribe();
        // print existing workspace CHANGED hoisted dependency information
        rxjs_1.merge(...Array.from(package_mgr_1.getState().workspaces.keys()).map(wsKey => package_mgr_1.getStore().pipe(operators_1.map(s => s.workspaces), operators_1.distinctUntilChanged(), operators_1.map(s => s.get(wsKey)), operators_1.distinctUntilChanged((s1, s2) => s1.hoistInfo === s2.hoistInfo && s1.hoistPeerDepInfo === s2.hoistPeerDepInfo), operators_1.scan((wsOld, wsNew) => {
            // console.log('*****************', wsKey);
            printWorkspaceHoistedDeps(wsNew);
            return wsNew;
        })))).subscribe();
        if (workspace) {
            package_mgr_1.actionDispatcher.updateWorkspace({ dir: workspace, isForce: opt.force });
        }
        else {
            package_mgr_1.actionDispatcher.initRootDir({ isForce: opt.force });
            setImmediate(() => cli_project_1.listProject());
        }
        // setImmediate(() => printWorkspaces());
    });
}
exports.default = default_1;
function printWorkspaces() {
    const table = misc_1.createCliTable({
        horizontalLines: false,
        colAligns: ['right', 'right']
    });
    const sep = ['--------------', '------------------', '------------', '----------', '-----'];
    table.push([{ colSpan: 5, content: chalk_1.default.underline('Worktree Space directories and linked dependencies\n'), hAlign: 'center' }], ['Worktree Space', 'Dependency package', 'Expected version', 'Actual version', 'state'].map(item => chalk_1.default.bold(item)), sep);
    let wsIdx = 0;
    for (const reldir of package_mgr_1.getState().workspaces.keys()) {
        if (wsIdx > 0) {
            table.push(sep);
        }
        let i = 0;
        const pkJson = package_mgr_1.getState().workspaces.get(reldir).originInstallJson;
        // console.log(pkJson);
        for (const { name: dep, json: { version: ver }, isInstalled } of package_utils_1.packages4WorkspaceKey(reldir)) {
            const expectedVer = convertVersion(pkJson, dep);
            const same = expectedVer === ver;
            table.push([
                i === 0 ? chalk_1.default.cyan(reldir ? `  ${reldir}/` : '  (root directory)') : '',
                same ? dep : chalk_1.default.red(dep),
                same ? expectedVer : chalk_1.default.bgRed(expectedVer),
                ver,
                isInstalled ? '' : chalk_1.default.gray('linked')
            ]);
            i++;
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
        const m = /\-(\d+(?:\.\d+){1,2}(?:\-[^\-])?)\.tgz$/.exec(ver);
        if (m) {
            return m[1];
        }
    }
    return ver;
}
function printWorkspaceHoistedDeps(workspace) {
    console.log(chalk_1.default.underline(`\nHoisted transitive dependency & dependents (${workspace.id})`));
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
    for (const [dep, dependents] of workspace.hoistInfo.entries()) {
        table.push(renderHoistDepInfo(dep, dependents));
    }
    console.log(table.toString());
    if (workspace.hoistDevInfo.size > 0) {
        const table = createTable();
        table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
        console.log(chalk_1.default.underline(`\nHoisted transitive (dev) dependency & dependents (${workspace.id})`));
        for (const [dep, dependents] of workspace.hoistDevInfo.entries()) {
            table.push(renderHoistDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    if (workspace.hoistPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright(`\nMissing Peer Dependencies for production (${workspace.id})`));
        const table = createTable();
        table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
        for (const [dep, dependents] of workspace.hoistPeerDepInfo.entries()) {
            table.push(renderHoistPeerDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    if (workspace.hoistDevPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright(`\nMissing Peer Dependencies for dev (${workspace.id})`));
        const table = createTable();
        table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
        for (const [dep, dependents] of workspace.hoistDevPeerDepInfo.entries()) {
            table.push(renderHoistPeerDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
}
exports.printWorkspaceHoistedDeps = printWorkspaceHoistedDeps;
function createTable() {
    const table = misc_1.createCliTable({
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
        dependents.sameVer ? dep : dependents.direct ? chalk_1.default.yellow(dep) : chalk_1.default.bgRed(dep),
        dependents.by.map((item, idx) => `${dependents.direct && idx === 0 ? chalk_1.default.green(item.ver) : idx > 0 ? item.ver : chalk_1.default.cyan(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUE2RTtBQUM3RSx1REFBK0I7QUFDL0IsZ0RBQWdHO0FBQ2hHLG9EQUF5RDtBQUN6RCw4Q0FBOEM7QUFDOUMsK0NBQTRDO0FBRzVDLHdDQUE2QztBQUU3QyxtQkFBOEIsR0FBMkIsRUFBRSxTQUFrQjs7UUFDM0UsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixnQ0FBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsS0FBSyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFDM0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNoQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRTlDLE1BQU0sS0FBSyxHQUFHLHFCQUFjLENBQUM7Z0JBQzNCLGVBQWUsRUFBRSxLQUFLO2dCQUN0QixTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO2FBQzdCLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxF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QUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNsSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7S0FDYixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCB0YWtlLCBza2lwLCBzY2FuIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdGF0ZSwgZ2V0U3RvcmUsIFdvcmtzcGFjZVN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBwYWNrYWdlczRXb3Jrc3BhY2VLZXkgfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbi8vIGltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7IGxpc3RQcm9qZWN0IH0gZnJvbSAnLi9jbGktcHJvamVjdCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgb3B0aW9ucyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHQ6IG9wdGlvbnMuSW5pdENtZE9wdGlvbnMsIHdvcmtzcGFjZT86IHN0cmluZykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0gPT09IHMyLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtKSxcbiAgICBza2lwKDEpLCB0YWtlKDEpLFxuICAgIG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgICBjb25zdCBwYWtzID0gQXJyYXkuZnJvbShzcmNQYWNrYWdlcy52YWx1ZXMoKSk7XG5cbiAgICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgICAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlLFxuICAgICAgICBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCddXG4gICAgICB9KTtcbiAgICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAzLCBjb250ZW50OiAnTGlua2VkIHBhY2thZ2VzJywgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICAgIHRhYmxlLnB1c2goWydQYWNrYWdlIG5hbWUnLCAnVmVyc2lvbicsICdQYXRoJ10sXG4gICAgICAgICAgICAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddKTtcbiAgICAgIGZvciAoY29uc3QgcGsgb2YgcGFrcykge1xuICAgICAgICB0YWJsZS5wdXNoKFtway5uYW1lLCBway5qc29uLnZlcnNpb24sIGNoYWxrLmdyYXkoUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKSldKTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VzKCk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBjb25zdCBleGlzdGluZ1dzS2V5cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcztcblxuICAvLyBwcmludCBuZXdseSBhZGRlZCB3b3Jrc3BhY2UgaG9pc3RlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLmxhc3RDcmVhdGVkV29ya3NwYWNlKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNjYW4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgIGlmIChjdXJyICYmICFleGlzdGluZ1dzS2V5cy5oYXMoY3VycikpIHtcbiAgICAgICAgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyhnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KGN1cnIpISk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3VycjtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIC8vIHByaW50IGV4aXN0aW5nIHdvcmtzcGFjZSBDSEFOR0VEIGhvaXN0ZWQgZGVwZW5kZW5jeSBpbmZvcm1hdGlvblxuICBtZXJnZSguLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcCh3c0tleSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChzID0+IHMuZ2V0KHdzS2V5KSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEhLmhvaXN0SW5mbyA9PT0gczIhLmhvaXN0SW5mbyAmJiBzMSEuaG9pc3RQZWVyRGVwSW5mbyA9PT0gczIhLmhvaXN0UGVlckRlcEluZm8pLFxuICAgIHNjYW4oKHdzT2xkLCB3c05ldykgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqKioqKioqKioqJywgd3NLZXkpO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyh3c05ldyEpO1xuICAgICAgcmV0dXJuIHdzTmV3O1xuICAgIH0pXG4gICkpKS5zdWJzY3JpYmUoKTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgYWN0aW9ucy51cGRhdGVXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKHtpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gbGlzdFByb2plY3QoKSk7XG4gIH1cbiAgLy8gc2V0SW1tZWRpYXRlKCgpID0+IHByaW50V29ya3NwYWNlcygpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50V29ya3NwYWNlcygpIHtcbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7XG4gICAgaG9yaXpvbnRhbExpbmVzOiBmYWxzZSxcbiAgICBjb2xBbGlnbnM6IFsncmlnaHQnLCAncmlnaHQnXVxuICB9KTtcbiAgY29uc3Qgc2VwID0gWyctLS0tLS0tLS0tLS0tLScsICctLS0tLS0tLS0tLS0tLS0tLS0nLCAnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0tLS0nLCAnLS0tLS0nXTtcbiAgdGFibGUucHVzaChbe2NvbFNwYW46IDUsIGNvbnRlbnQ6IGNoYWxrLnVuZGVybGluZSgnV29ya3RyZWUgU3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXNcXG4nKSwgaEFsaWduOiAnY2VudGVyJ31dLFxuICAgIFsnV29ya3RyZWUgU3BhY2UnLCAnRGVwZW5kZW5jeSBwYWNrYWdlJywgJ0V4cGVjdGVkIHZlcnNpb24nLCAnQWN0dWFsIHZlcnNpb24nLCAnc3RhdGUnXS5tYXAoaXRlbSA9PiBjaGFsay5ib2xkKGl0ZW0pKSxcbiAgICBzZXApO1xuXG4gIGxldCB3c0lkeCA9IDA7XG4gIGZvciAoY29uc3QgcmVsZGlyIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBpZiAod3NJZHggPiAwKSB7XG4gICAgICB0YWJsZS5wdXNoKHNlcCk7XG4gICAgfVxuXG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IHBrSnNvbiA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQocmVsZGlyKSEub3JpZ2luSW5zdGFsbEpzb247XG4gICAgLy8gY29uc29sZS5sb2cocGtKc29uKTtcblxuICAgIGZvciAoY29uc3Qge25hbWU6IGRlcCwganNvbjoge3ZlcnNpb246IHZlcn0sIGlzSW5zdGFsbGVkfSBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkocmVsZGlyKSkge1xuICAgICAgY29uc3QgZXhwZWN0ZWRWZXIgPSBjb252ZXJ0VmVyc2lvbihwa0pzb24sIGRlcCk7XG4gICAgICBjb25zdCBzYW1lID0gZXhwZWN0ZWRWZXIgPT09IHZlcjtcbiAgICAgIHRhYmxlLnB1c2goW1xuICAgICAgICBpID09PSAwID8gY2hhbGsuY3lhbihyZWxkaXIgPyBgICAke3JlbGRpcn0vYCA6ICcgIChyb290IGRpcmVjdG9yeSknKSA6ICcnLFxuICAgICAgICBzYW1lID8gZGVwIDogY2hhbGsucmVkKGRlcCksXG4gICAgICAgIHNhbWUgPyBleHBlY3RlZFZlciA6IGNoYWxrLmJnUmVkKGV4cGVjdGVkVmVyKSxcbiAgICAgICAgdmVyLFxuICAgICAgICBpc0luc3RhbGxlZCA/ICcnIDogY2hhbGsuZ3JheSgnbGlua2VkJylcbiAgICAgIF0pO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICB3c0lkeCsrO1xuICB9XG4gIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0VmVyc2lvbihwa2dKc29uOiB7XG4gIGRlcGVuZGVuY2llcz86IHtbazogc3RyaW5nXTogc3RyaW5nfSxcbiAgZGV2RGVwZW5kZW5jaWVzPzoge1trOiBzdHJpbmddOiBzdHJpbmd9XG59LCBkZXBOYW1lOiBzdHJpbmcpIHtcbiAgbGV0IHZlciA9IHBrZ0pzb24uZGVwZW5kZW5jaWVzID8gcGtnSnNvbi5kZXBlbmRlbmNpZXNbZGVwTmFtZV0gOiBudWxsO1xuICBpZiAodmVyID09IG51bGwgJiYgcGtnSnNvbi5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICB2ZXIgPSBwa2dKc29uLmRldkRlcGVuZGVuY2llc1tkZXBOYW1lXTtcbiAgfVxuICBpZiAodmVyID09IG51bGwpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbiAgaWYgKHZlci5zdGFydHNXaXRoKCcuJykgfHwgdmVyLnN0YXJ0c1dpdGgoJ2ZpbGU6JykpIHtcbiAgICBjb25zdCBtID0gL1xcLShcXGQrKD86XFwuXFxkKyl7MSwyfSg/OlxcLVteXFwtXSk/KVxcLnRneiQvLmV4ZWModmVyKTtcbiAgICBpZiAobSkge1xuICAgICAgcmV0dXJuIG1bMV07XG4gICAgfVxuICB9XG4gIHJldHVybiB2ZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdvcmtzcGFjZTogV29ya3NwYWNlU3RhdGUpIHtcbiAgY29uc29sZS5sb2coY2hhbGsudW5kZXJsaW5lKGBcXG5Ib2lzdGVkIHRyYW5zaXRpdmUgZGVwZW5kZW5jeSAmIGRlcGVuZGVudHMgKCR7d29ya3NwYWNlLmlkfSlgKSk7XG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlVGFibGUoKTtcbiAgdGFibGUucHVzaChbJ0RlcGVuZGVuY3knLCAnRGVwZW5kZW50J10ubWFwKGl0ZW0gPT4gY2hhbGsuYm9sZChpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10pO1xuICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdEluZm8hLmVudHJpZXMoKSkge1xuICAgIHRhYmxlLnB1c2gocmVuZGVySG9pc3REZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICB9XG4gIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICBpZiAod29ya3NwYWNlLmhvaXN0RGV2SW5mby5zaXplID4gMCkge1xuICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlVGFibGUoKTtcbiAgICB0YWJsZS5wdXNoKFsnRGVwZW5kZW5jeScsICdEZXBlbmRlbnQnXS5tYXAoaXRlbSA9PiBjaGFsay5ib2xkKGl0ZW0pKSxcbiAgICBbJy0tLScsICctLS0nXSk7XG4gICAgY29uc29sZS5sb2coY2hhbGsudW5kZXJsaW5lKGBcXG5Ib2lzdGVkIHRyYW5zaXRpdmUgKGRldikgZGVwZW5kZW5jeSAmIGRlcGVuZGVudHMgKCR7d29ya3NwYWNlLmlkfSlgKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3REZXZJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICAgIHRhYmxlLnB1c2gocmVuZGVySG9pc3REZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBpZiAod29ya3NwYWNlLmhvaXN0UGVlckRlcEluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3dCcmlnaHQoYFxcbk1pc3NpbmcgUGVlciBEZXBlbmRlbmNpZXMgZm9yIHByb2R1Y3Rpb24gKCR7d29ya3NwYWNlLmlkfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydEZXBlbmRlbmN5JywgJ0RlcGVuZGVudCddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdFBlZXJEZXBJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICAgIHRhYmxlLnB1c2gocmVuZGVySG9pc3RQZWVyRGVwSW5mbyhkZXAsIGRlcGVuZGVudHMpKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cbiAgaWYgKHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvLnNpemUgPiAwKSB7XG4gICAgY29uc29sZS5sb2coY2hhbGsueWVsbG93QnJpZ2h0KGBcXG5NaXNzaW5nIFBlZXIgRGVwZW5kZW5jaWVzIGZvciBkZXYgKCR7d29ya3NwYWNlLmlkfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydEZXBlbmRlbmN5JywgJ0RlcGVuZGVudCddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICAgIHRhYmxlLnB1c2gocmVuZGVySG9pc3RQZWVyRGVwSW5mbyhkZXAsIGRlcGVuZGVudHMpKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVGFibGUoKSB7XG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgIGhvcml6b250YWxMaW5lczogZmFsc2UsXG4gICAgLy8gc3R5bGU6IHtoZWFkOiBbXX0sXG4gICAgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnXVxuICB9KTtcbiAgcmV0dXJuIHRhYmxlO1xufVxuXG5mdW5jdGlvbiByZW5kZXJIb2lzdERlcEluZm8oZGVwOiBzdHJpbmcsIGRlcGVuZGVudHM6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm8nXSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IHVua25vd24pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBbXG4gICAgZGVwZW5kZW50cy5zYW1lVmVyID8gZGVwIDogZGVwZW5kZW50cy5kaXJlY3QgPyBjaGFsay55ZWxsb3coZGVwKSA6IGNoYWxrLmJnUmVkKGRlcCksXG4gICAgZGVwZW5kZW50cy5ieS5tYXAoKGl0ZW0sIGlkeCkgPT5cbiAgICAgIGAke2RlcGVuZGVudHMuZGlyZWN0ICYmIGlkeCA9PT0gMCA/IGNoYWxrLmdyZWVuKGl0ZW0udmVyKSA6IGlkeCA+IDAgPyBjaGFsay5ncmF5KGl0ZW0udmVyKSA6IGNoYWxrLmN5YW4oaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YFxuICAgICkuam9pbignXFxuJylcbiAgXTtcbn1cbmZ1bmN0aW9uIHJlbmRlckhvaXN0UGVlckRlcEluZm8oZGVwOiBzdHJpbmcsIGRlcGVuZGVudHM6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm8nXSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IHVua25vd24pIHtcbiAgcmV0dXJuIFtcbiAgICBkZXBlbmRlbnRzLnNhbWVWZXIgPyBkZXAgOiBkZXBlbmRlbnRzLmRpcmVjdCA/IGNoYWxrLnllbGxvdyhkZXApIDogY2hhbGsuYmdSZWQoZGVwKSxcbiAgICBkZXBlbmRlbnRzLmJ5Lm1hcCgoaXRlbSwgaWR4KSA9PlxuICAgICAgYCR7ZGVwZW5kZW50cy5kaXJlY3QgJiYgaWR4ID09PSAwID8gY2hhbGsuZ3JlZW4oaXRlbS52ZXIpIDogaWR4ID4gMCA/IGl0ZW0udmVyIDogY2hhbGsuY3lhbihpdGVtLnZlcil9OiAke2NoYWxrLmdyZXkoaXRlbS5uYW1lKX1gXG4gICAgKS5qb2luKCdcXG4nKVxuICBdO1xufVxuIl19