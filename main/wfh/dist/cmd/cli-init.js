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
const cli_table3_1 = __importDefault(require("cli-table3"));
function default_1(opt, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        const cwd = process.cwd();
        package_mgr_1.getStore().pipe(operators_1.distinctUntilChanged((s1, s2) => s1.workspaceUpdateChecksum === s2.workspaceUpdateChecksum), operators_1.skip(1), operators_1.take(1), operators_1.map(s => s.srcPackages), operators_1.map(srcPackages => {
            const paks = Array.from(srcPackages.values());
            const maxWidth = paks.reduce((maxWidth, pk) => {
                const width = pk.name.length + pk.json.version.length + 1;
                return width > maxWidth ? width : maxWidth;
            }, 0);
            console.log(`\n${chalk_1.default.bold('\n[ Linked packages ]')}\n` +
                paks.map(pk => {
                    const width = pk.name.length + pk.json.version.length + 1;
                    return `  ${chalk_1.default.cyan(pk.name)}@${chalk_1.default.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
                        ` ${chalk_1.default.gray(path_1.default.relative(cwd, pk.realPath))}`;
                }).join('\n'));
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
    console.log('\n' + chalk_1.default.bold('\nWorkspace directories and linked dependencies'));
    const table = createTable();
    table.push(['Workspace', 'Dependency package', 'Version', ''].map(item => chalk_1.default.bold(item)));
    table.push(['---', '---', '---', '---']);
    for (const reldir of package_mgr_1.getState().workspaces.keys()) {
        // console.log(reldir ? `  ${reldir}/` : '  (root directory)');
        // console.log('    |- dependencies');
        const lines = [];
        for (const { name: dep, json: { version: ver }, isInstalled } of package_utils_1.packages4Workspace(path_1.default.resolve(misc_1.getRootDir(), reldir))) {
            // console.log(`    |  |- ${dep}  v${ver}  ${isInstalled ? '' : chalk.gray('(linked)')}`);
            lines.push(['', dep, ver, isInstalled ? '' : chalk_1.default.gray('linked')]);
        }
        // table.push([reldir ? `  ${reldir}/` : '  (root directory)', ...lines.shift()!]);
        lines[0][0] = chalk_1.default.cyan(reldir ? `  ${reldir}/` : '  (root directory)');
        lines.forEach(line => table.push(line));
        table.push(['', '', '', '']);
        // console.log('');
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
    const table = new cli_table3_1.default({
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        style: { head: [] },
        colAligns: ['right', 'left']
    });
    return table;
}
function renderHoistDepInfo(dep, dependents) {
    return [dep, dependents.by.map(item => `${dependents.sameVer ? chalk_1.default.cyan(item.ver) : chalk_1.default.bgRed(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')];
}
function renderHoistPeerDepInfo(dep, dependents) {
    return [chalk_1.default.yellow(dep),
        dependents.by.map(item => `${dependents.sameVer ? chalk_1.default.cyan(item.ver) : chalk_1.default.bgRed(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUE2RTtBQUM3RSx1REFBK0I7QUFDL0IsZ0RBQWdHO0FBQ2hHLG9EQUFzRDtBQUN0RCx3Q0FBMkM7QUFDM0MsK0NBQTRDO0FBRzVDLDREQUErQjtBQUUvQixtQkFBOEIsR0FBMkIsRUFBRSxTQUFrQjs7UUFDM0UsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixnQ0FBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsS0FBSyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFDM0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNoQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7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LENBQUMsS0FBSyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDNUksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCB0YWtlLCBza2lwLCBzY2FuIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdGF0ZSwgZ2V0U3RvcmUsIFdvcmtzcGFjZVN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBwYWNrYWdlczRXb3Jrc3BhY2UgfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7IGxpc3RQcm9qZWN0IH0gZnJvbSAnLi9jbGktcHJvamVjdCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgb3B0aW9ucyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBUYWJsZSBmcm9tICdjbGktdGFibGUzJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0OiBvcHRpb25zLkluaXRDbWRPcHRpb25zLCB3b3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0KTtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtID09PSBzMi53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSksXG4gICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgICAgY29uc3QgcGFrcyA9IEFycmF5LmZyb20oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgICAgY29uc3QgbWF4V2lkdGggPSBwYWtzLnJlZHVjZSgobWF4V2lkdGgsIHBrKSA9PiB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gcGsubmFtZS5sZW5ndGggKyBway5qc29uLnZlcnNpb24ubGVuZ3RoICsgMTtcbiAgICAgICAgcmV0dXJuIHdpZHRoID4gbWF4V2lkdGggPyB3aWR0aCA6IG1heFdpZHRoO1xuICAgICAgfSwgMCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBgXFxuJHtjaGFsay5ib2xkKCdcXG5bIExpbmtlZCBwYWNrYWdlcyBdJyl9XFxuYCArXG4gICAgICAgIHBha3MubWFwKHBrID0+IHtcbiAgICAgICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICAgICAgcmV0dXJuIGAgICR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSR7JyAnLnJlcGVhdChtYXhXaWR0aCAtIHdpZHRoKX1gICtcbiAgICAgICAgICAgIGAgJHtjaGFsay5ncmF5KFBhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCkpfWA7XG4gICAgICAgIH0pLmpvaW4oJ1xcbicpXG4gICAgICApO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VzKCk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBjb25zdCBleGlzdGluZ1dzS2V5cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcztcblxuICAvLyBwcmludCBuZXdseSBhZGRlZCB3b3Jrc3BhY2UgaG9pc3RlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLmxhc3RDcmVhdGVkV29ya3NwYWNlKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNjYW4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgIGlmIChjdXJyICYmICFleGlzdGluZ1dzS2V5cy5oYXMoY3VycikpIHtcbiAgICAgICAgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyhnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KGN1cnIpISk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3VycjtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIC8vIHByaW50IGV4aXN0aW5nIHdvcmtzcGFjZSBDSEFOR0VEIGhvaXN0ZWQgZGVwZW5kZW5jeSBpbmZvcm1hdGlvblxuICBtZXJnZSguLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcCh3c0tleSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChzID0+IHMuZ2V0KHdzS2V5KSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEhLmhvaXN0SW5mbyA9PT0gczIhLmhvaXN0SW5mbyAmJiBzMSEuaG9pc3RQZWVyRGVwSW5mbyA9PT0gczIhLmhvaXN0UGVlckRlcEluZm8pLFxuICAgIHNjYW4oKHdzT2xkLCB3c05ldykgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqKioqKioqKioqJywgd3NLZXkpO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyh3c05ldyEpO1xuICAgICAgcmV0dXJuIHdzTmV3O1xuICAgIH0pXG4gICkpKS5zdWJzY3JpYmUoKTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgYWN0aW9ucy51cGRhdGVXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKHtpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gbGlzdFByb2plY3QoKSk7XG4gIH1cbiAgLy8gc2V0SW1tZWRpYXRlKCgpID0+IHByaW50V29ya3NwYWNlcygpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50V29ya3NwYWNlcygpIHtcbiAgY29uc29sZS5sb2coJ1xcbicgKyBjaGFsay5ib2xkKCdcXG5Xb3Jrc3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXMnKSk7XG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlVGFibGUoKTtcbiAgdGFibGUucHVzaChbJ1dvcmtzcGFjZScsICdEZXBlbmRlbmN5IHBhY2thZ2UnLCAnVmVyc2lvbicsICcnXS5tYXAoaXRlbSA9PiBjaGFsay5ib2xkKGl0ZW0pKSk7XG4gIHRhYmxlLnB1c2goWyctLS0nLCAnLS0tJywgJy0tLScsICctLS0nXSk7XG4gIGZvciAoY29uc3QgcmVsZGlyIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhyZWxkaXIgPyBgICAke3JlbGRpcn0vYCA6ICcgIChyb290IGRpcmVjdG9yeSknKTtcbiAgICAvLyBjb25zb2xlLmxvZygnICAgIHwtIGRlcGVuZGVuY2llcycpO1xuICAgIGNvbnN0IGxpbmVzOiBzdHJpbmdbXVtdID0gW107XG4gICAgZm9yIChjb25zdCB7bmFtZTogZGVwLCBqc29uOiB7dmVyc2lvbjogdmVyfSwgaXNJbnN0YWxsZWR9IG9mIHBhY2thZ2VzNFdvcmtzcGFjZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCByZWxkaXIpKSkge1xuICAgICAgLy8gY29uc29sZS5sb2coYCAgICB8ICB8LSAke2RlcH0gIHYke3Zlcn0gICR7aXNJbnN0YWxsZWQgPyAnJyA6IGNoYWxrLmdyYXkoJyhsaW5rZWQpJyl9YCk7XG4gICAgICBsaW5lcy5wdXNoKFsnJywgZGVwLCB2ZXIsIGlzSW5zdGFsbGVkID8gJycgOiBjaGFsay5ncmF5KCdsaW5rZWQnKV0pO1xuICAgIH1cbiAgICAvLyB0YWJsZS5wdXNoKFtyZWxkaXIgPyBgICAke3JlbGRpcn0vYCA6ICcgIChyb290IGRpcmVjdG9yeSknLCAuLi5saW5lcy5zaGlmdCgpIV0pO1xuICAgIGxpbmVzWzBdWzBdID0gY2hhbGsuY3lhbihyZWxkaXIgPyBgICAke3JlbGRpcn0vYCA6ICcgIChyb290IGRpcmVjdG9yeSknKTtcbiAgICBsaW5lcy5mb3JFYWNoKGxpbmUgPT4gdGFibGUucHVzaChsaW5lKSk7XG4gICAgdGFibGUucHVzaChbJycsICcnLCAnJywgJyddKTtcbiAgICAvLyBjb25zb2xlLmxvZygnJyk7XG4gIH1cbiAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG59XG5cbmZ1bmN0aW9uIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMod29ya3NwYWNlOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICBjb25zb2xlLmxvZyhjaGFsay5ib2xkKGBcXG5Ib2lzdGVkIHByb2R1Y3Rpb24gZGVwZW5kZW5jeSBhbmQgY29ycmVzcG9uZGluZyBkZXBlbmRlbnRzICgke3dvcmtzcGFjZS5pZH0pYCkpO1xuICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gIHRhYmxlLnB1c2goWydEZXBlbmRlbmN5JywgJ0RlcGVuZGVudCddLm1hcChpdGVtID0+IGNoYWxrLmJvbGQoaXRlbSkpLFxuICAgIFsnLS0tJywgJy0tLSddKTtcbiAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3RJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICB0YWJsZS5wdXNoKHJlbmRlckhvaXN0RGVwSW5mbyhkZXAsIGRlcGVuZGVudHMpKTtcbiAgfVxuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgaWYgKHdvcmtzcGFjZS5ob2lzdERldkluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gICAgdGFibGUucHVzaChbJ0RlcGVuZGVuY3knLCAnRGVwZW5kZW50J10ubWFwKGl0ZW0gPT4gY2hhbGsuYm9sZChpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10pO1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLmJvbGQoYFxcbkhvaXN0ZWQgZGV2IGRlcGVuZGVuY3kgYW5kIGNvcnJlc3BvbmRpbmcgZGVwZW5kZW50cyAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdERldkluZm8hLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdERlcEluZm8oZGVwLCBkZXBlbmRlbnRzKSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICB9XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mby5zaXplID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvd0JyaWdodChgXFxuTWlzc2luZyBQZWVyIERlcGVuZGVuY2llcyBmb3IgcHJvZHVjdGlvbiAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gICAgdGFibGUucHVzaChbJ0RlcGVuZGVuY3knLCAnRGVwZW5kZW50J10ubWFwKGl0ZW0gPT4gY2hhbGsuYm9sZChpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10pO1xuICAgIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0UGVlckRlcEluZm8hLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxuICBpZiAod29ya3NwYWNlLmhvaXN0RGV2UGVlckRlcEluZm8uc2l6ZSA+IDApIHtcbiAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3dCcmlnaHQoYFxcbk1pc3NpbmcgUGVlciBEZXBlbmRlbmNpZXMgZm9yIGRldiAoJHt3b3Jrc3BhY2UuaWR9KWApKTtcbiAgICBjb25zdCB0YWJsZSA9IGNyZWF0ZVRhYmxlKCk7XG4gICAgdGFibGUucHVzaChbJ0RlcGVuZGVuY3knLCAnRGVwZW5kZW50J10ubWFwKGl0ZW0gPT4gY2hhbGsuYm9sZChpdGVtKSksXG4gICAgWyctLS0nLCAnLS0tJ10pO1xuICAgIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0RGV2UGVlckRlcEluZm8hLmVudHJpZXMoKSkge1xuICAgICAgdGFibGUucHVzaChyZW5kZXJIb2lzdFBlZXJEZXBJbmZvKGRlcCwgZGVwZW5kZW50cykpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVUYWJsZSgpIHtcbiAgY29uc3QgdGFibGUgPSBuZXcgVGFibGUoe1xuICAgIGNoYXJzOiB7bWlkOiAnJywgJ2xlZnQtbWlkJzogJycsICdtaWQtbWlkJzogJycsICdyaWdodC1taWQnOiAnJ30sXG4gICAgc3R5bGU6IHtoZWFkOiBbXX0sXG4gICAgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnXVxuICB9KTtcbiAgcmV0dXJuIHRhYmxlO1xufVxuXG5mdW5jdGlvbiByZW5kZXJIb2lzdERlcEluZm8oZGVwOiBzdHJpbmcsIGRlcGVuZGVudHM6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm8nXSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IHVua25vd24pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBbZGVwLCBkZXBlbmRlbnRzLmJ5Lm1hcChpdGVtID0+IGAke2RlcGVuZGVudHMuc2FtZVZlciA/IGNoYWxrLmN5YW4oaXRlbS52ZXIpIDogY2hhbGsuYmdSZWQoaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YCkuam9pbignXFxuJyldO1xufVxuZnVuY3Rpb24gcmVuZGVySG9pc3RQZWVyRGVwSW5mbyhkZXA6IHN0cmluZywgZGVwZW5kZW50czogV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mbyddIGV4dGVuZHMgTWFwPHN0cmluZywgaW5mZXIgVD4gPyBUIDogdW5rbm93bikge1xuICByZXR1cm4gW2NoYWxrLnllbGxvdyhkZXApLFxuICAgIGRlcGVuZGVudHMuYnkubWFwKGl0ZW0gPT4gYCR7ZGVwZW5kZW50cy5zYW1lVmVyID8gY2hhbGsuY3lhbihpdGVtLnZlcikgOiBjaGFsay5iZ1JlZChpdGVtLnZlcil9OiAke2NoYWxrLmdyZXkoaXRlbS5uYW1lKX1gKS5qb2luKCdcXG4nKV07XG59XG4iXX0=