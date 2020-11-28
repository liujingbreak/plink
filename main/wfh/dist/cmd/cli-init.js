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
exports.printWorkspaces = void 0;
// tslint:disable: no-console max-line-length
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const config_1 = __importDefault(require("../config"));
const package_mgr_1 = require("../package-mgr");
const package_utils_1 = require("../package-utils");
const misc_1 = require("../utils/misc");
const cli_project_1 = require("./cli-project");
const misc_2 = require("../utils/misc");
function default_1(opt, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        const cwd = process.cwd();
        package_mgr_1.getStore().pipe(operators_1.distinctUntilChanged((s1, s2) => s1.workspaceUpdateChecksum === s2.workspaceUpdateChecksum), operators_1.skip(1), operators_1.take(1), operators_1.map(s => s.srcPackages), operators_1.map(srcPackages => {
            const paks = Array.from(srcPackages.values());
            const table = misc_2.createCliTable({
                horizontalLines: false,
                colAligns: ['right', 'left']
            });
            table.push([{ colSpan: 3, content: 'Linked packages', hAlign: 'center' }]);
            table.push(['Package name', 'Version', 'Path'], ['------------', '-------', '----']);
            for (const pk of paks) {
                table.push([chalk_1.default.cyan(pk.name), chalk_1.default.green(pk.json.version), chalk_1.default.gray(path_1.default.relative(cwd, pk.realPath))]);
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
    const table = misc_2.createCliTable({
        horizontalLines: false,
        colAligns: ['right', 'right']
    });
    table.push([{ colSpan: 4, content: chalk_1.default.bold('Worktree Space directories and linked dependencies\n'), hAlign: 'center' }], ['Worktree Space', 'Dependency package', 'Version', 'state'].map(item => chalk_1.default.bold(item)), ['--------------', '------------------', '-------', '-----']);
    for (const reldir of package_mgr_1.getState().workspaces.keys()) {
        let i = 0;
        for (const { name: dep, json: { version: ver }, isInstalled } of package_utils_1.packages4Workspace(path_1.default.resolve(misc_1.getRootDir(), reldir))) {
            table.push([i === 0 ? chalk_1.default.cyan(reldir ? `  ${reldir}/` : '  (root directory)') : '', dep, ver, isInstalled ? '' : chalk_1.default.gray('linked')]);
            i++;
        }
    }
    console.log(table.toString());
}
exports.printWorkspaces = printWorkspaces;
function printWorkspaceHoistedDeps(workspace) {
    console.log(chalk_1.default.bold(`\nHoisted production dependency and corresponding dependents (${workspace.id})`));
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
    for (const [dep, dependents] of workspace.hoistInfo.entries()) {
        table.push(renderHoistDepInfo(dep, dependents));
    }
    console.log(table.toString());
    if (workspace.hoistDevInfo.size > 0) {
        const table = createTable();
        table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
        console.log(chalk_1.default.bold(`\nHoisted dev dependency and corresponding dependents (${workspace.id})`));
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
function createTable() {
    const table = misc_2.createCliTable({
        horizontalLines: false,
        // style: {head: []},
        colAligns: ['right', 'left']
    });
    return table;
}
function renderHoistDepInfo(dep, dependents) {
    return [dependents.sameVer ? dep : chalk_1.default.bgRed(dep), dependents.by.map(item => `${chalk_1.default.cyan(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')];
}
function renderHoistPeerDepInfo(dep, dependents) {
    return [dependents.sameVer ? chalk_1.default.yellow(dep) : chalk_1.default.red(dep),
        dependents.by.map(item => `${chalk_1.default.cyan(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUE2RTtBQUM3RSx1REFBK0I7QUFDL0IsZ0RBQWdHO0FBQ2hHLG9EQUFzRDtBQUN0RCx3Q0FBMkM7QUFDM0MsK0NBQTRDO0FBRzVDLHdDQUE2QztBQUU3QyxtQkFBOEIsR0FBMkIsRUFBRSxTQUFrQjs7UUFDM0UsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixnQ0FBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsS0FBSyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFDM0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNoQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRTlDLE1BQU0sS0FBSyxHQUFHLHFCQUFjLENBQUM7Z0JBQzNCLGVBQWUsRUFBRSxLQUFLO2dCQUN0QixTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO2FBQzdCLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxF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LGVBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNsSixDQUFDO0FBQ0QsU0FBUyxzQkFBc0IsQ0FBQyxHQUFXLEVBQUUsVUFBa0Y7SUFDN0gsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1FBQzdELFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDL0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCB0YWtlLCBza2lwLCBzY2FuIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdGF0ZSwgZ2V0U3RvcmUsIFdvcmtzcGFjZVN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBwYWNrYWdlczRXb3Jrc3BhY2UgfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7IGxpc3RQcm9qZWN0IH0gZnJvbSAnLi9jbGktcHJvamVjdCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgb3B0aW9ucyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHQ6IG9wdGlvbnMuSW5pdENtZE9wdGlvbnMsIHdvcmtzcGFjZT86IHN0cmluZykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0gPT09IHMyLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtKSxcbiAgICBza2lwKDEpLCB0YWtlKDEpLFxuICAgIG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgICBjb25zdCBwYWtzID0gQXJyYXkuZnJvbShzcmNQYWNrYWdlcy52YWx1ZXMoKSk7XG5cbiAgICAgIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgICAgICBob3Jpem9udGFsTGluZXM6IGZhbHNlLFxuICAgICAgICBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCddXG4gICAgICB9KTtcbiAgICAgIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAzLCBjb250ZW50OiAnTGlua2VkIHBhY2thZ2VzJywgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgICAgIHRhYmxlLnB1c2goWydQYWNrYWdlIG5hbWUnLCAnVmVyc2lvbicsICdQYXRoJ10sXG4gICAgICAgICAgICAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddKTtcbiAgICAgIGZvciAoY29uc3QgcGsgb2YgcGFrcykge1xuICAgICAgICB0YWJsZS5wdXNoKFtjaGFsay5jeWFuKHBrLm5hbWUpLCBjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pLCBjaGFsay5ncmF5KFBhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCkpXSk7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgICAgIHByaW50V29ya3NwYWNlcygpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgY29uc3QgZXhpc3RpbmdXc0tleXMgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXM7XG5cbiAgLy8gcHJpbnQgbmV3bHkgYWRkZWQgd29ya3NwYWNlIGhvaXN0ZWQgZGVwZW5kZW5jeSBpbmZvcm1hdGlvblxuICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5sYXN0Q3JlYXRlZFdvcmtzcGFjZSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBzY2FuKChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICBpZiAoY3VyciAmJiAhZXhpc3RpbmdXc0tleXMuaGFzKGN1cnIpKSB7XG4gICAgICAgIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldChjdXJyKSEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGN1cnI7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICAvLyBwcmludCBleGlzdGluZyB3b3Jrc3BhY2UgQ0hBTkdFRCBob2lzdGVkIGRlcGVuZGVuY3kgaW5mb3JtYXRpb25cbiAgbWVyZ2UoLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAod3NLZXkgPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMud29ya3NwYWNlcyksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBtYXAocyA9PiBzLmdldCh3c0tleSkpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxIS5ob2lzdEluZm8gPT09IHMyIS5ob2lzdEluZm8gJiYgczEhLmhvaXN0UGVlckRlcEluZm8gPT09IHMyIS5ob2lzdFBlZXJEZXBJbmZvKSxcbiAgICBzY2FuKCh3c09sZCwgd3NOZXcpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqKicsIHdzS2V5KTtcbiAgICAgIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMod3NOZXchKTtcbiAgICAgIHJldHVybiB3c05ldztcbiAgICB9KVxuICApKSkuc3Vic2NyaWJlKCk7XG5cbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGFjdGlvbnMudXBkYXRlV29ya3NwYWNlKHtkaXI6IHdvcmtzcGFjZSwgaXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gIH0gZWxzZSB7XG4gICAgYWN0aW9ucy5pbml0Um9vdERpcih7aXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gICAgc2V0SW1tZWRpYXRlKCgpID0+IGxpc3RQcm9qZWN0KCkpO1xuICB9XG4gIC8vIHNldEltbWVkaWF0ZSgoKSA9PiBwcmludFdvcmtzcGFjZXMoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZXMoKSB7XG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgIGhvcml6b250YWxMaW5lczogZmFsc2UsXG4gICAgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ3JpZ2h0J11cbiAgfSk7XG4gIHRhYmxlLnB1c2goW3tjb2xTcGFuOiA0LCBjb250ZW50OiBjaGFsay5ib2xkKCdXb3JrdHJlZSBTcGFjZSBkaXJlY3RvcmllcyBhbmQgbGlua2VkIGRlcGVuZGVuY2llc1xcbicpLCBoQWxpZ246ICdjZW50ZXInfV0sXG4gICAgWydXb3JrdHJlZSBTcGFjZScsICdEZXBlbmRlbmN5IHBhY2thZ2UnLCAnVmVyc2lvbicsICdzdGF0ZSddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tLS0tLS0tLS0tLS0nLCAnLS0tLS0tLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLS0nXSk7XG5cbiAgZm9yIChjb25zdCByZWxkaXIgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHtuYW1lOiBkZXAsIGpzb246IHt2ZXJzaW9uOiB2ZXJ9LCBpc0luc3RhbGxlZH0gb2YgcGFja2FnZXM0V29ya3NwYWNlKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHJlbGRpcikpKSB7XG4gICAgICB0YWJsZS5wdXNoKFtpID09PSAwID8gY2hhbGsuY3lhbihyZWxkaXIgPyBgICAke3JlbGRpcn0vYCA6ICcgIChyb290IGRpcmVjdG9yeSknKSA6ICcnLCBkZXAsIHZlciwgaXNJbnN0YWxsZWQgPyAnJyA6IGNoYWxrLmdyYXkoJ2xpbmtlZCcpXSk7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG4gIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xufVxuXG5mdW5jdGlvbiBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdvcmtzcGFjZTogV29ya3NwYWNlU3RhdGUpIHtcbiAgY29uc29sZS5sb2coY2hhbGsuYm9sZChgXFxuSG9pc3RlZCBwcm9kdWN0aW9uIGRlcGVuZGVuY3kgYW5kIGNvcnJlc3BvbmRpbmcgZGVwZW5kZW50cyAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICB0YWJsZS5wdXNoKFsnRGVwZW5kZW5jeScsICdEZXBlbmRlbnQnXS5tYXAoaXRlbSA9PiBjaGFsay5ib2xkKGl0ZW0pKSxcbiAgICBbJy0tLScsICctLS0nXSk7XG4gIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0SW5mbyEuZW50cmllcygpKSB7XG4gICAgdGFibGUucHVzaChyZW5kZXJIb2lzdERlcEluZm8oZGVwLCBkZXBlbmRlbnRzKSk7XG4gIH1cbiAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3REZXZJbmZvLnNpemUgPiAwKSB7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydEZXBlbmRlbmN5JywgJ0RlcGVuZGVudCddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddKTtcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ib2xkKGBcXG5Ib2lzdGVkIGRldiBkZXBlbmRlbmN5IGFuZCBjb3JyZXNwb25kaW5nIGRlcGVuZGVudHMgKCR7d29ya3NwYWNlLmlkfSlgKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3REZXZJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICAgIHRhYmxlLnB1c2gocmVuZGVySG9pc3REZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBpZiAod29ya3NwYWNlLmhvaXN0UGVlckRlcEluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3dCcmlnaHQoYFxcbk1pc3NpbmcgUGVlciBEZXBlbmRlbmNpZXMgZm9yIHByb2R1Y3Rpb24gKCR7d29ya3NwYWNlLmlkfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydEZXBlbmRlbmN5JywgJ0RlcGVuZGVudCddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdFBlZXJEZXBJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICAgIHRhYmxlLnB1c2gocmVuZGVySG9pc3RQZWVyRGVwSW5mbyhkZXAsIGRlcGVuZGVudHMpKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cbiAgaWYgKHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvLnNpemUgPiAwKSB7XG4gICAgY29uc29sZS5sb2coY2hhbGsueWVsbG93QnJpZ2h0KGBcXG5NaXNzaW5nIFBlZXIgRGVwZW5kZW5jaWVzIGZvciBkZXYgKCR7d29ya3NwYWNlLmlkfSlgKSk7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydEZXBlbmRlbmN5JywgJ0RlcGVuZGVudCddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICAgIHRhYmxlLnB1c2gocmVuZGVySG9pc3RQZWVyRGVwSW5mbyhkZXAsIGRlcGVuZGVudHMpKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVGFibGUoKSB7XG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe1xuICAgIGhvcml6b250YWxMaW5lczogZmFsc2UsXG4gICAgLy8gc3R5bGU6IHtoZWFkOiBbXX0sXG4gICAgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnXVxuICB9KTtcbiAgcmV0dXJuIHRhYmxlO1xufVxuXG5mdW5jdGlvbiByZW5kZXJIb2lzdERlcEluZm8oZGVwOiBzdHJpbmcsIGRlcGVuZGVudHM6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm8nXSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IHVua25vd24pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBbZGVwZW5kZW50cy5zYW1lVmVyID8gZGVwIDogY2hhbGsuYmdSZWQoZGVwKSwgZGVwZW5kZW50cy5ieS5tYXAoaXRlbSA9PiBgJHtjaGFsay5jeWFuKGl0ZW0udmVyKX06ICR7Y2hhbGsuZ3JleShpdGVtLm5hbWUpfWApLmpvaW4oJ1xcbicpXTtcbn1cbmZ1bmN0aW9uIHJlbmRlckhvaXN0UGVlckRlcEluZm8oZGVwOiBzdHJpbmcsIGRlcGVuZGVudHM6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm8nXSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IHVua25vd24pIHtcbiAgcmV0dXJuIFtkZXBlbmRlbnRzLnNhbWVWZXIgPyBjaGFsay55ZWxsb3coZGVwKSA6IGNoYWxrLnJlZChkZXApLFxuICAgIGRlcGVuZGVudHMuYnkubWFwKGl0ZW0gPT4gYCR7Y2hhbGsuY3lhbihpdGVtLnZlcil9OiAke2NoYWxrLmdyZXkoaXRlbS5uYW1lKX1gKS5qb2luKCdcXG4nKV07XG59XG4iXX0=