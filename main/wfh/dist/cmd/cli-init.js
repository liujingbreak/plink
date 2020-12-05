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
            table.push([i === 0 ? chalk_1.default.cyan(reldir ? `  ${reldir}/` : '  (root directory)') : '',
                dep, convertVersion(pkJson, dep), ver, isInstalled ? '' : chalk_1.default.gray('linked')]);
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
    console.log(chalk_1.default.underline(`\nHoisted production dependency and corresponding dependents (${workspace.id})`));
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
    for (const [dep, dependents] of workspace.hoistInfo.entries()) {
        table.push(renderHoistDepInfo(dep, dependents));
    }
    console.log(table.toString());
    if (workspace.hoistDevInfo.size > 0) {
        const table = createTable();
        table.push(['Dependency', 'Dependent'].map(item => chalk_1.default.bold(item)), ['---', '---']);
        console.log(chalk_1.default.underline(`\nHoisted dev dependency and corresponding dependents (${workspace.id})`));
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
    const table = misc_1.createCliTable({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUE2RTtBQUM3RSx1REFBK0I7QUFDL0IsZ0RBQWdHO0FBQ2hHLG9EQUF5RDtBQUN6RCw4Q0FBOEM7QUFDOUMsK0NBQTRDO0FBRzVDLHdDQUE2QztBQUU3QyxtQkFBOEIsR0FBMkIsRUFBRSxTQUFrQjs7UUFDM0UsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixnQ0FBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsS0FBSyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFDM0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNoQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRTlDLE1BQU0sS0FBSyxHQUFHLHFCQUFjLENBQUM7Z0JBQzNCLGVBQWUsRUFBRSxLQUFLO2dCQUN0QixTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO2FBQzdCLENBQUMsQ0FBQztZQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxF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QUcsZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xKLENBQUM7QUFDRCxTQUFTLHNCQUFzQixDQUFDLEdBQVcsRUFBRSxVQUFrRjtJQUM3SCxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7UUFDN0QsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMvRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge21lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBtYXAsIHRha2UsIHNraXAsIHNjYW4gfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIGFjdGlvbnMsIGdldFN0YXRlLCBnZXRTdG9yZSwgV29ya3NwYWNlU3RhdGV9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IHBhY2thZ2VzNFdvcmtzcGFjZUtleSB9IGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuLy8gaW1wb3J0IHsgZ2V0Um9vdERpciB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHsgbGlzdFByb2plY3QgfSBmcm9tICcuL2NsaS1wcm9qZWN0JztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBvcHRpb25zIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZX0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdDogb3B0aW9ucy5Jbml0Q21kT3B0aW9ucywgd29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSA9PT0gczIud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0pLFxuICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgIGNvbnN0IHBha3MgPSBBcnJheS5mcm9tKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcblxuICAgICAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7XG4gICAgICAgIGhvcml6b250YWxMaW5lczogZmFsc2UsXG4gICAgICAgIGNvbEFsaWduczogWydyaWdodCcsICdsZWZ0J11cbiAgICAgIH0pO1xuICAgICAgdGFibGUucHVzaChbe2NvbFNwYW46IDMsIGNvbnRlbnQ6ICdMaW5rZWQgcGFja2FnZXMnLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICAgICAgdGFibGUucHVzaChbJ1BhY2thZ2UgbmFtZScsICdWZXJzaW9uJywgJ1BhdGgnXSxcbiAgICAgICAgICAgICAgICAgWyctLS0tLS0tLS0tLS0nLCAnLS0tLS0tLScsICctLS0tJ10pO1xuICAgICAgZm9yIChjb25zdCBwayBvZiBwYWtzKSB7XG4gICAgICAgIHRhYmxlLnB1c2goW2NoYWxrLmN5YW4ocGsubmFtZSksIGNoYWxrLmdyZWVuKHBrLmpzb24udmVyc2lvbiksIGNoYWxrLmdyYXkoUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKSldKTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VzKCk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBjb25zdCBleGlzdGluZ1dzS2V5cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcztcblxuICAvLyBwcmludCBuZXdseSBhZGRlZCB3b3Jrc3BhY2UgaG9pc3RlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLmxhc3RDcmVhdGVkV29ya3NwYWNlKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNjYW4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgIGlmIChjdXJyICYmICFleGlzdGluZ1dzS2V5cy5oYXMoY3VycikpIHtcbiAgICAgICAgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyhnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KGN1cnIpISk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3VycjtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIC8vIHByaW50IGV4aXN0aW5nIHdvcmtzcGFjZSBDSEFOR0VEIGhvaXN0ZWQgZGVwZW5kZW5jeSBpbmZvcm1hdGlvblxuICBtZXJnZSguLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcCh3c0tleSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChzID0+IHMuZ2V0KHdzS2V5KSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEhLmhvaXN0SW5mbyA9PT0gczIhLmhvaXN0SW5mbyAmJiBzMSEuaG9pc3RQZWVyRGVwSW5mbyA9PT0gczIhLmhvaXN0UGVlckRlcEluZm8pLFxuICAgIHNjYW4oKHdzT2xkLCB3c05ldykgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqKioqKioqKioqJywgd3NLZXkpO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyh3c05ldyEpO1xuICAgICAgcmV0dXJuIHdzTmV3O1xuICAgIH0pXG4gICkpKS5zdWJzY3JpYmUoKTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgYWN0aW9ucy51cGRhdGVXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKHtpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gbGlzdFByb2plY3QoKSk7XG4gIH1cbiAgLy8gc2V0SW1tZWRpYXRlKCgpID0+IHByaW50V29ya3NwYWNlcygpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50V29ya3NwYWNlcygpIHtcbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7XG4gICAgaG9yaXpvbnRhbExpbmVzOiBmYWxzZSxcbiAgICBjb2xBbGlnbnM6IFsncmlnaHQnLCAncmlnaHQnXVxuICB9KTtcbiAgY29uc3Qgc2VwID0gWyctLS0tLS0tLS0tLS0tLScsICctLS0tLS0tLS0tLS0tLS0tLS0nLCAnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0tLS0nLCAnLS0tLS0nXTtcbiAgdGFibGUucHVzaChbe2NvbFNwYW46IDUsIGNvbnRlbnQ6IGNoYWxrLnVuZGVybGluZSgnV29ya3RyZWUgU3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXNcXG4nKSwgaEFsaWduOiAnY2VudGVyJ31dLFxuICAgIFsnV29ya3RyZWUgU3BhY2UnLCAnRGVwZW5kZW5jeSBwYWNrYWdlJywgJ0V4cGVjdGVkIHZlcnNpb24nLCAnQWN0dWFsIHZlcnNpb24nLCAnc3RhdGUnXS5tYXAoaXRlbSA9PiBjaGFsay5ib2xkKGl0ZW0pKSxcbiAgICBzZXApO1xuXG4gIGxldCB3c0lkeCA9IDA7XG4gIGZvciAoY29uc3QgcmVsZGlyIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBpZiAod3NJZHggPiAwKSB7XG4gICAgICB0YWJsZS5wdXNoKHNlcCk7XG4gICAgfVxuXG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IHBrSnNvbiA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQocmVsZGlyKSEub3JpZ2luSW5zdGFsbEpzb247XG4gICAgLy8gY29uc29sZS5sb2cocGtKc29uKTtcblxuICAgIGZvciAoY29uc3Qge25hbWU6IGRlcCwganNvbjoge3ZlcnNpb246IHZlcn0sIGlzSW5zdGFsbGVkfSBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkocmVsZGlyKSkge1xuICAgICAgdGFibGUucHVzaChbaSA9PT0gMCA/IGNoYWxrLmN5YW4ocmVsZGlyID8gYCAgJHtyZWxkaXJ9L2AgOiAnICAocm9vdCBkaXJlY3RvcnkpJykgOiAnJyxcbiAgICAgICAgZGVwLCBjb252ZXJ0VmVyc2lvbihwa0pzb24sIGRlcCksIHZlciwgaXNJbnN0YWxsZWQgPyAnJyA6IGNoYWxrLmdyYXkoJ2xpbmtlZCcpXSk7XG4gICAgICBpKys7XG4gICAgfVxuICAgIHdzSWR4Kys7XG4gIH1cbiAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRWZXJzaW9uKHBrZ0pzb246IHtcbiAgZGVwZW5kZW5jaWVzPzoge1trOiBzdHJpbmddOiBzdHJpbmd9LFxuICBkZXZEZXBlbmRlbmNpZXM/OiB7W2s6IHN0cmluZ106IHN0cmluZ31cbn0sIGRlcE5hbWU6IHN0cmluZykge1xuICBsZXQgdmVyID0gcGtnSnNvbi5kZXBlbmRlbmNpZXMgPyBwa2dKc29uLmRlcGVuZGVuY2llc1tkZXBOYW1lXSA6IG51bGw7XG4gIGlmICh2ZXIgPT0gbnVsbCAmJiBwa2dKc29uLmRldkRlcGVuZGVuY2llcykge1xuICAgIHZlciA9IHBrZ0pzb24uZGV2RGVwZW5kZW5jaWVzW2RlcE5hbWVdO1xuICB9XG4gIGlmICh2ZXIgPT0gbnVsbCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuICBpZiAodmVyLnN0YXJ0c1dpdGgoJy4nKSB8fCB2ZXIuc3RhcnRzV2l0aCgnZmlsZTonKSkge1xuICAgIGNvbnN0IG0gPSAvXFwtKFxcZCsoPzpcXC5cXGQrKXsxLDJ9KD86XFwtW15cXC1dKT8pXFwudGd6JC8uZXhlYyh2ZXIpO1xuICAgIGlmIChtKSB7XG4gICAgICByZXR1cm4gbVsxXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZlcjtcbn1cblxuZnVuY3Rpb24gcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyh3b3Jrc3BhY2U6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnNvbGUubG9nKGNoYWxrLnVuZGVybGluZShgXFxuSG9pc3RlZCBwcm9kdWN0aW9uIGRlcGVuZGVuY3kgYW5kIGNvcnJlc3BvbmRpbmcgZGVwZW5kZW50cyAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICB0YWJsZS5wdXNoKFsnRGVwZW5kZW5jeScsICdEZXBlbmRlbnQnXS5tYXAoaXRlbSA9PiBjaGFsay5ib2xkKGl0ZW0pKSxcbiAgICBbJy0tLScsICctLS0nXSk7XG4gIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0SW5mbyEuZW50cmllcygpKSB7XG4gICAgdGFibGUucHVzaChyZW5kZXJIb2lzdERlcEluZm8oZGVwLCBkZXBlbmRlbnRzKSk7XG4gIH1cbiAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3REZXZJbmZvLnNpemUgPiAwKSB7XG4gICAgY29uc3QgdGFibGUgPSBjcmVhdGVUYWJsZSgpO1xuICAgIHRhYmxlLnB1c2goWydEZXBlbmRlbmN5JywgJ0RlcGVuZGVudCddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddKTtcbiAgICBjb25zb2xlLmxvZyhjaGFsay51bmRlcmxpbmUoYFxcbkhvaXN0ZWQgZGV2IGRlcGVuZGVuY3kgYW5kIGNvcnJlc3BvbmRpbmcgZGVwZW5kZW50cyAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdERldkluZm8hLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdERlcEluZm8oZGVwLCBkZXBlbmRlbnRzKSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mby5zaXplID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvd0JyaWdodChgXFxuTWlzc2luZyBQZWVyIERlcGVuZGVuY2llcyBmb3IgcHJvZHVjdGlvbiAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gICAgdGFibGUucHVzaChbJ0RlcGVuZGVuY3knLCAnRGVwZW5kZW50J10ubWFwKGl0ZW0gPT4gY2hhbGsuYm9sZChpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10pO1xuICAgIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0UGVlckRlcEluZm8hLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBpZiAod29ya3NwYWNlLmhvaXN0RGV2UGVlckRlcEluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3dCcmlnaHQoYFxcbk1pc3NpbmcgUGVlciBEZXBlbmRlbmNpZXMgZm9yIGRldiAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gICAgdGFibGUucHVzaChbJ0RlcGVuZGVuY3knLCAnRGVwZW5kZW50J10ubWFwKGl0ZW0gPT4gY2hhbGsuYm9sZChpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10pO1xuICAgIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0RGV2UGVlckRlcEluZm8hLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVUYWJsZSgpIHtcbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7XG4gICAgaG9yaXpvbnRhbExpbmVzOiBmYWxzZSxcbiAgICAvLyBzdHlsZToge2hlYWQ6IFtdfSxcbiAgICBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCddXG4gIH0pO1xuICByZXR1cm4gdGFibGU7XG59XG5cbmZ1bmN0aW9uIHJlbmRlckhvaXN0RGVwSW5mbyhkZXA6IHN0cmluZywgZGVwZW5kZW50czogV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mbyddIGV4dGVuZHMgTWFwPHN0cmluZywgaW5mZXIgVD4gPyBUIDogdW5rbm93bik6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIFtkZXBlbmRlbnRzLnNhbWVWZXIgPyBkZXAgOiBjaGFsay5iZ1JlZChkZXApLCBkZXBlbmRlbnRzLmJ5Lm1hcChpdGVtID0+IGAke2NoYWxrLmN5YW4oaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YCkuam9pbignXFxuJyldO1xufVxuZnVuY3Rpb24gcmVuZGVySG9pc3RQZWVyRGVwSW5mbyhkZXA6IHN0cmluZywgZGVwZW5kZW50czogV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mbyddIGV4dGVuZHMgTWFwPHN0cmluZywgaW5mZXIgVD4gPyBUIDogdW5rbm93bikge1xuICByZXR1cm4gW2RlcGVuZGVudHMuc2FtZVZlciA/IGNoYWxrLnllbGxvdyhkZXApIDogY2hhbGsucmVkKGRlcCksXG4gICAgZGVwZW5kZW50cy5ieS5tYXAoaXRlbSA9PiBgJHtjaGFsay5jeWFuKGl0ZW0udmVyKX06ICR7Y2hhbGsuZ3JleShpdGVtLm5hbWUpfWApLmpvaW4oJ1xcbicpXTtcbn1cbiJdfQ==