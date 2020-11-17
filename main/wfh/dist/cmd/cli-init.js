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
const lodash_1 = __importDefault(require("lodash"));
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
        // print newly added workspace hoisted dependency information
        package_mgr_1.getStore().pipe(operators_1.map(s => s.workspaces), operators_1.distinctUntilChanged(), operators_1.scan((prev, curr) => {
            const newlyAdded = lodash_1.default.difference(Array.from(curr.keys()), Array.from(prev.keys()));
            for (const key of newlyAdded) {
                printWorkspaceHoistedDeps(package_mgr_1.getState().workspaces.get(key));
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
    console.log('\n' + chalk_1.default.bold('\n[ Workspace directories and linked dependencies ]'));
    for (const reldir of package_mgr_1.getState().workspaces.keys()) {
        console.log(reldir ? `  ${reldir}/` : '  (root directory)');
        console.log('    |- dependencies');
        for (const { name: dep, json: { version: ver }, isInstalled } of package_utils_1.packages4Workspace(path_1.default.resolve(misc_1.getRootDir(), reldir))) {
            console.log(`    |  |- ${dep}  v${ver}  ${isInstalled ? '' : chalk_1.default.gray('(linked)')}`);
        }
        console.log('');
    }
}
exports.printWorkspaces = printWorkspaces;
function printWorkspaceHoistedDeps(workspace) {
    console.log(chalk_1.default.bold(`\n[ Hoisted production dependency and corresponding dependents (${workspace.id}) ]`));
    for (const [dep, dependents] of workspace.hoistInfo.entries()) {
        printHoistDepInfo(dep, dependents);
    }
    if (workspace.hoistDevInfo.size > 0) {
        console.log(chalk_1.default.bold(`\n[ Hoisted dev dependency and corresponding dependents (${workspace.id}) ]`));
        for (const [dep, dependents] of workspace.hoistDevInfo.entries()) {
            printHoistDepInfo(dep, dependents);
        }
    }
    if (workspace.hoistPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright(`\n[ Missing Peer Dependencies for production (${workspace.id}) ]`));
        for (const [dep, dependents] of workspace.hoistPeerDepInfo.entries()) {
            printHoistPeerDepInfo(dep, dependents);
        }
    }
    if (workspace.hoistDevPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright(`\n[ Missing Peer Dependencies for dev (${workspace.id})]`));
        for (const [dep, dependents] of workspace.hoistDevPeerDepInfo.entries()) {
            printHoistPeerDepInfo(dep, dependents);
        }
    }
}
function printHoistDepInfo(dep, dependents) {
    console.log(`  ${dep} <= ` +
        dependents.by.map(item => `${dependents.sameVer ? chalk_1.default.cyan(item.ver) : chalk_1.default.bgRed(item.ver)}: ${chalk_1.default.grey(item.name)}`).join(', ')
        + '');
}
function printHoistPeerDepInfo(dep, dependents) {
    console.log(`  ${chalk_1.default.yellow(dep)} ${chalk_1.default.grey('<=')} ` +
        dependents.by.map(item => `${dependents.sameVer ? chalk_1.default.cyan(item.ver) : chalk_1.default.bgRed(item.ver)}: ${chalk_1.default.grey(item.name)}`).join(', ')
        + '');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUE2RTtBQUM3RSx1REFBK0I7QUFDL0IsZ0RBQWdHO0FBQ2hHLG9EQUFzRDtBQUN0RCx3Q0FBMkM7QUFDM0MsK0NBQTRDO0FBQzVDLG9EQUF1QjtBQUd2QixtQkFBOEIsR0FBMkIsRUFBRSxTQUFrQjs7UUFDM0UsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixnQ0FBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsS0FBSyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFDM0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNoQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7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LEdBQUcsQ0FBQyxLQUFLLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1VBQ3BJLEVBQUUsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHttZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCB0YWtlLCBza2lwLCBzY2FuIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdGF0ZSwgZ2V0U3RvcmUsIFdvcmtzcGFjZVN0YXRlfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBwYWNrYWdlczRXb3Jrc3BhY2UgfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7IGxpc3RQcm9qZWN0IH0gZnJvbSAnLi9jbGktcHJvamVjdCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgb3B0aW9ucyBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0OiBvcHRpb25zLkluaXRDbWRPcHRpb25zLCB3b3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0KTtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtID09PSBzMi53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSksXG4gICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgICAgY29uc3QgcGFrcyA9IEFycmF5LmZyb20oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgICAgY29uc3QgbWF4V2lkdGggPSBwYWtzLnJlZHVjZSgobWF4V2lkdGgsIHBrKSA9PiB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gcGsubmFtZS5sZW5ndGggKyBway5qc29uLnZlcnNpb24ubGVuZ3RoICsgMTtcbiAgICAgICAgcmV0dXJuIHdpZHRoID4gbWF4V2lkdGggPyB3aWR0aCA6IG1heFdpZHRoO1xuICAgICAgfSwgMCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBgXFxuJHtjaGFsay5ib2xkKCdcXG5bIExpbmtlZCBwYWNrYWdlcyBdJyl9XFxuYCArXG4gICAgICAgIHBha3MubWFwKHBrID0+IHtcbiAgICAgICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICAgICAgcmV0dXJuIGAgICR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSR7JyAnLnJlcGVhdChtYXhXaWR0aCAtIHdpZHRoKX1gICtcbiAgICAgICAgICAgIGAgJHtjaGFsay5ncmF5KFBhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCkpfWA7XG4gICAgICAgIH0pLmpvaW4oJ1xcbicpXG4gICAgICApO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VzKCk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICAvLyBwcmludCBuZXdseSBhZGRlZCB3b3Jrc3BhY2UgaG9pc3RlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgc2NhbigocHJldiwgY3VycikgPT4ge1xuICAgICAgY29uc3QgbmV3bHlBZGRlZCA9IF8uZGlmZmVyZW5jZShBcnJheS5mcm9tKGN1cnIua2V5cygpKSwgQXJyYXkuZnJvbShwcmV2LmtleXMoKSkpO1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgbmV3bHlBZGRlZCkge1xuICAgICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQoa2V5KSEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGN1cnI7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICAvLyBwcmludCBleGlzdGluZyB3b3Jrc3BhY2UgQ0hBTkdFRCBob2lzdGVkIGRlcGVuZGVuY3kgaW5mb3JtYXRpb25cbiAgbWVyZ2UoLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAod3NLZXkgPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMud29ya3NwYWNlcyksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBtYXAocyA9PiBzLmdldCh3c0tleSkpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxIS5ob2lzdEluZm8gPT09IHMyIS5ob2lzdEluZm8gJiYgczEhLmhvaXN0UGVlckRlcEluZm8gPT09IHMyIS5ob2lzdFBlZXJEZXBJbmZvKSxcbiAgICBzY2FuKCh3c09sZCwgd3NOZXcpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqKicsIHdzS2V5KTtcbiAgICAgIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMod3NOZXchKTtcbiAgICAgIHJldHVybiB3c05ldztcbiAgICB9KVxuICApKSkuc3Vic2NyaWJlKCk7XG5cbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGFjdGlvbnMudXBkYXRlV29ya3NwYWNlKHtkaXI6IHdvcmtzcGFjZSwgaXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gIH0gZWxzZSB7XG4gICAgYWN0aW9ucy5pbml0Um9vdERpcih7aXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gICAgc2V0SW1tZWRpYXRlKCgpID0+IGxpc3RQcm9qZWN0KCkpO1xuICB9XG4gIC8vIHNldEltbWVkaWF0ZSgoKSA9PiBwcmludFdvcmtzcGFjZXMoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdcXG4nICsgY2hhbGsuYm9sZCgnXFxuWyBXb3Jrc3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXMgXScpKTtcbiAgZm9yIChjb25zdCByZWxkaXIgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnNvbGUubG9nKHJlbGRpciA/IGAgICR7cmVsZGlyfS9gIDogJyAgKHJvb3QgZGlyZWN0b3J5KScpO1xuICAgIGNvbnNvbGUubG9nKCcgICAgfC0gZGVwZW5kZW5jaWVzJyk7XG4gICAgZm9yIChjb25zdCB7bmFtZTogZGVwLCBqc29uOiB7dmVyc2lvbjogdmVyfSwgaXNJbnN0YWxsZWR9IG9mIHBhY2thZ2VzNFdvcmtzcGFjZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCByZWxkaXIpKSkge1xuICAgICAgY29uc29sZS5sb2coYCAgICB8ICB8LSAke2RlcH0gIHYke3Zlcn0gICR7aXNJbnN0YWxsZWQgPyAnJyA6IGNoYWxrLmdyYXkoJyhsaW5rZWQpJyl9YCk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdvcmtzcGFjZTogV29ya3NwYWNlU3RhdGUpIHtcbiAgY29uc29sZS5sb2coY2hhbGsuYm9sZChgXFxuWyBIb2lzdGVkIHByb2R1Y3Rpb24gZGVwZW5kZW5jeSBhbmQgY29ycmVzcG9uZGluZyBkZXBlbmRlbnRzICgke3dvcmtzcGFjZS5pZH0pIF1gKSk7XG4gIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0SW5mbyEuZW50cmllcygpKSB7XG4gICAgcHJpbnRIb2lzdERlcEluZm8oZGVwLCBkZXBlbmRlbnRzKTtcbiAgfVxuICBpZiAod29ya3NwYWNlLmhvaXN0RGV2SW5mby5zaXplID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLmJvbGQoYFxcblsgSG9pc3RlZCBkZXYgZGVwZW5kZW5jeSBhbmQgY29ycmVzcG9uZGluZyBkZXBlbmRlbnRzICgke3dvcmtzcGFjZS5pZH0pIF1gKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3REZXZJbmZvIS5lbnRyaWVzKCkpIHtcbiAgICAgIHByaW50SG9pc3REZXBJbmZvKGRlcCwgZGVwZW5kZW50cyk7XG4gICAgfVxuICB9XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mby5zaXplID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvd0JyaWdodChgXFxuWyBNaXNzaW5nIFBlZXIgRGVwZW5kZW5jaWVzIGZvciBwcm9kdWN0aW9uICgke3dvcmtzcGFjZS5pZH0pIF1gKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mbyEuZW50cmllcygpKSB7XG4gICAgICBwcmludEhvaXN0UGVlckRlcEluZm8oZGVwLCBkZXBlbmRlbnRzKTtcbiAgICB9XG4gIH1cbiAgaWYgKHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvLnNpemUgPiAwKSB7XG4gICAgY29uc29sZS5sb2coY2hhbGsueWVsbG93QnJpZ2h0KGBcXG5bIE1pc3NpbmcgUGVlciBEZXBlbmRlbmNpZXMgZm9yIGRldiAoJHt3b3Jrc3BhY2UuaWR9KV1gKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3REZXZQZWVyRGVwSW5mbyEuZW50cmllcygpKSB7XG4gICAgICBwcmludEhvaXN0UGVlckRlcEluZm8oZGVwLCBkZXBlbmRlbnRzKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJpbnRIb2lzdERlcEluZm8oZGVwOiBzdHJpbmcsIGRlcGVuZGVudHM6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm8nXSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IHVua25vd24pIHtcbiAgY29uc29sZS5sb2coYCAgJHsgZGVwfSA8PSBgICtcbiAgICBkZXBlbmRlbnRzLmJ5Lm1hcChpdGVtID0+IGAke2RlcGVuZGVudHMuc2FtZVZlciA/IGNoYWxrLmN5YW4oaXRlbS52ZXIpIDogY2hhbGsuYmdSZWQoaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YCkuam9pbignLCAnKVxuICAgICsgJycpO1xufVxuZnVuY3Rpb24gcHJpbnRIb2lzdFBlZXJEZXBJbmZvKGRlcDogc3RyaW5nLCBkZXBlbmRlbnRzOiBXb3Jrc3BhY2VTdGF0ZVsnaG9pc3RJbmZvJ10gZXh0ZW5kcyBNYXA8c3RyaW5nLCBpbmZlciBUPiA/IFQgOiB1bmtub3duKSB7XG4gIGNvbnNvbGUubG9nKGAgICR7IGNoYWxrLnllbGxvdyhkZXApIH0gJHtjaGFsay5ncmV5KCc8PScpfSBgICtcbiAgICBkZXBlbmRlbnRzLmJ5Lm1hcChpdGVtID0+IGAke2RlcGVuZGVudHMuc2FtZVZlciA/IGNoYWxrLmN5YW4oaXRlbS52ZXIpIDogY2hhbGsuYmdSZWQoaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YCkuam9pbignLCAnKVxuICAgICsgJycpO1xufVxuIl19