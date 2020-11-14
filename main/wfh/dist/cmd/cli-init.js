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
        package_mgr_1.getStore().pipe(operators_1.map(s => s._computed.workspaceKeys), operators_1.distinctUntilChanged(), operators_1.scan((prev, curr) => {
            const newlyAdded = lodash_1.default.difference(curr, prev);
            for (const key of newlyAdded) {
                printWorkspaceHoistedDeps(package_mgr_1.getState().workspaces.get(key));
            }
            return curr;
        })).subscribe();
        // print existing workspace CHANGED hoisted dependency information
        rxjs_1.merge(...Array.from(package_mgr_1.getState()._computed.workspaceKeys).map(wsKey => package_mgr_1.getStore().pipe(operators_1.map(s => s.workspaces.get(wsKey)), operators_1.distinctUntilChanged((s1, s2) => s1.hoistInfo === s2.hoistInfo && s1.hoistPeerDepInfo === s2.hoistPeerDepInfo), operators_1.scan((wsOld, wsNew) => {
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
        console.log('  ' + chalk_1.default.cyan(dep));
        console.log('    ' + dependents.by.map(item => `${dependents.sameVer ? item.ver : chalk_1.default.bgRed(item.ver)}: ${chalk_1.default.grey(item.name)}`).join(', '));
    }
    if (workspace.hoistDevInfo.size > 0) {
        console.log(chalk_1.default.bold(`\n[ Hoisted dev dependency and corresponding dependents (${workspace.id}) ]`));
        for (const [dep, dependents] of workspace.hoistDevInfo.entries()) {
            console.log('  ' + chalk_1.default.cyan(dep));
            console.log('    ' + dependents.by.map(item => `${dependents.sameVer ? item.ver : chalk_1.default.bgRed(item.ver)}: ${chalk_1.default.grey(item.name)}`).join(', '));
        }
    }
    if (workspace.hoistPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright('\n[Missing production Peer Dependencies]'));
        for (const [dep, dependents] of workspace.hoistPeerDepInfo.entries()) {
            console.log('  ' + chalk_1.default.cyanBright(dep));
            console.log('    ' + dependents.by.map(item => `${item.ver}: ${chalk_1.default.grey(item.name)}`).join(', '));
        }
    }
    if (workspace.hoistDevPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright('\n[Missing dev Peer Dependencies]'));
        for (const [dep, dependents] of workspace.hoistDevPeerDepInfo.entries()) {
            console.log('  ' + chalk_1.default.cyanBright(dep));
            console.log('    ' + dependents.by.map(item => `${item.ver}: ${chalk_1.default.grey(item.name)}`).join(', '));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsK0JBQTJCO0FBQzNCLDhDQUE2RTtBQUM3RSx1REFBK0I7QUFDL0IsZ0RBQWdHO0FBQ2hHLG9EQUFzRDtBQUN0RCx3Q0FBMkM7QUFDM0MsK0NBQTRDO0FBQzVDLG9EQUF1QjtBQUd2QixtQkFBOEIsR0FBMkIsRUFBRSxTQUFrQjs7UUFDM0UsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixnQ0FBb0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsS0FBSyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFDM0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNoQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7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QUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsS0FBSyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDckc7S0FDRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7bWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgdGFrZSwgc2tpcCwgc2NhbiB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgYWN0aW9ucywgZ2V0U3RhdGUsIGdldFN0b3JlLCBXb3Jrc3BhY2VTdGF0ZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgcGFja2FnZXM0V29ya3NwYWNlIH0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgeyBnZXRSb290RGlyIH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgeyBsaXN0UHJvamVjdCB9IGZyb20gJy4vY2xpLXByb2plY3QnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIG9wdGlvbnMgZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdDogb3B0aW9ucy5Jbml0Q21kT3B0aW9ucywgd29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSA9PT0gczIud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0pLFxuICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgIGNvbnN0IHBha3MgPSBBcnJheS5mcm9tKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcbiAgICAgIGNvbnN0IG1heFdpZHRoID0gcGFrcy5yZWR1Y2UoKG1heFdpZHRoLCBwaykgPT4ge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICAgIHJldHVybiB3aWR0aCA+IG1heFdpZHRoID8gd2lkdGggOiBtYXhXaWR0aDtcbiAgICAgIH0sIDApO1xuXG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgYFxcbiR7Y2hhbGsuYm9sZCgnXFxuWyBMaW5rZWQgcGFja2FnZXMgXScpfVxcbmAgK1xuICAgICAgICBwYWtzLm1hcChwayA9PiB7XG4gICAgICAgICAgY29uc3Qgd2lkdGggPSBway5uYW1lLmxlbmd0aCArIHBrLmpzb24udmVyc2lvbi5sZW5ndGggKyAxO1xuICAgICAgICAgIHJldHVybiBgICAke2NoYWxrLmN5YW4ocGsubmFtZSl9QCR7Y2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKX0keycgJy5yZXBlYXQobWF4V2lkdGggLSB3aWR0aCl9YCArXG4gICAgICAgICAgICBgICR7Y2hhbGsuZ3JheShQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpKX1gO1xuICAgICAgICB9KS5qb2luKCdcXG4nKVxuICAgICAgKTtcbiAgICAgIHByaW50V29ya3NwYWNlcygpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgLy8gcHJpbnQgbmV3bHkgYWRkZWQgd29ya3NwYWNlIGhvaXN0ZWQgZGVwZW5kZW5jeSBpbmZvcm1hdGlvblxuICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5fY29tcHV0ZWQud29ya3NwYWNlS2V5cyksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBzY2FuKChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICBjb25zdCBuZXdseUFkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgbmV3bHlBZGRlZCkge1xuICAgICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQoa2V5KSEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGN1cnI7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICAvLyBwcmludCBleGlzdGluZyB3b3Jrc3BhY2UgQ0hBTkdFRCBob2lzdGVkIGRlcGVuZGVuY3kgaW5mb3JtYXRpb25cbiAgbWVyZ2UoLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLl9jb21wdXRlZC53b3Jrc3BhY2VLZXlzKS5tYXAod3NLZXkgPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3NLZXkpISksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEuaG9pc3RJbmZvID09PSBzMi5ob2lzdEluZm8gJiYgczEuaG9pc3RQZWVyRGVwSW5mbyA9PT0gczIuaG9pc3RQZWVyRGVwSW5mbyksXG4gICAgc2Nhbigod3NPbGQsIHdzTmV3KSA9PiB7XG4gICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdzTmV3KTtcbiAgICAgIHJldHVybiB3c05ldztcbiAgICB9KVxuICApKSkuc3Vic2NyaWJlKCk7XG5cbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGFjdGlvbnMudXBkYXRlV29ya3NwYWNlKHtkaXI6IHdvcmtzcGFjZSwgaXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gIH0gZWxzZSB7XG4gICAgYWN0aW9ucy5pbml0Um9vdERpcih7aXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gICAgc2V0SW1tZWRpYXRlKCgpID0+IGxpc3RQcm9qZWN0KCkpO1xuICB9XG4gIC8vIHNldEltbWVkaWF0ZSgoKSA9PiBwcmludFdvcmtzcGFjZXMoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdcXG4nICsgY2hhbGsuYm9sZCgnXFxuWyBXb3Jrc3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXMgXScpKTtcbiAgZm9yIChjb25zdCByZWxkaXIgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnNvbGUubG9nKHJlbGRpciA/IGAgICR7cmVsZGlyfS9gIDogJyAgKHJvb3QgZGlyZWN0b3J5KScpO1xuICAgIGNvbnNvbGUubG9nKCcgICAgfC0gZGVwZW5kZW5jaWVzJyk7XG4gICAgZm9yIChjb25zdCB7bmFtZTogZGVwLCBqc29uOiB7dmVyc2lvbjogdmVyfSwgaXNJbnN0YWxsZWR9IG9mIHBhY2thZ2VzNFdvcmtzcGFjZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCByZWxkaXIpKSkge1xuICAgICAgY29uc29sZS5sb2coYCAgICB8ICB8LSAke2RlcH0gIHYke3Zlcn0gICR7aXNJbnN0YWxsZWQgPyAnJyA6IGNoYWxrLmdyYXkoJyhsaW5rZWQpJyl9YCk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdvcmtzcGFjZTogV29ya3NwYWNlU3RhdGUpIHtcbiAgY29uc29sZS5sb2coY2hhbGsuYm9sZChgXFxuWyBIb2lzdGVkIHByb2R1Y3Rpb24gZGVwZW5kZW5jeSBhbmQgY29ycmVzcG9uZGluZyBkZXBlbmRlbnRzICgke3dvcmtzcGFjZS5pZH0pIF1gKSk7XG4gIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0SW5mbyEuZW50cmllcygpKSB7XG4gICAgY29uc29sZS5sb2coJyAgJyArIGNoYWxrLmN5YW4oZGVwKSk7XG4gICAgY29uc29sZS5sb2coJyAgICAnICsgZGVwZW5kZW50cy5ieS5tYXAoaXRlbSA9PiBgJHtkZXBlbmRlbnRzLnNhbWVWZXIgPyBpdGVtLnZlciA6IGNoYWxrLmJnUmVkKGl0ZW0udmVyKX06ICR7Y2hhbGsuZ3JleShpdGVtLm5hbWUpfWApLmpvaW4oJywgJykpO1xuICB9XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3REZXZJbmZvLnNpemUgPiAwKSB7XG4gICAgY29uc29sZS5sb2coY2hhbGsuYm9sZChgXFxuWyBIb2lzdGVkIGRldiBkZXBlbmRlbmN5IGFuZCBjb3JyZXNwb25kaW5nIGRlcGVuZGVudHMgKCR7d29ya3NwYWNlLmlkfSkgXWApKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIGRlcGVuZGVudHNdIG9mIHdvcmtzcGFjZS5ob2lzdERldkluZm8hLmVudHJpZXMoKSkge1xuICAgICAgY29uc29sZS5sb2coJyAgJyArIGNoYWxrLmN5YW4oZGVwKSk7XG4gICAgICBjb25zb2xlLmxvZygnICAgICcgKyBkZXBlbmRlbnRzLmJ5Lm1hcChpdGVtID0+IGAke2RlcGVuZGVudHMuc2FtZVZlciA/IGl0ZW0udmVyIDogY2hhbGsuYmdSZWQoaXRlbS52ZXIpfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YCkuam9pbignLCAnKSk7XG4gICAgfVxuICB9XG4gIGlmICh3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mby5zaXplID4gMCkge1xuICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvd0JyaWdodCgnXFxuW01pc3NpbmcgcHJvZHVjdGlvbiBQZWVyIERlcGVuZGVuY2llc10nKSk7XG4gICAgZm9yIChjb25zdCBbZGVwLCBkZXBlbmRlbnRzXSBvZiB3b3Jrc3BhY2UuaG9pc3RQZWVyRGVwSW5mbyEuZW50cmllcygpKSB7XG4gICAgICBjb25zb2xlLmxvZygnICAnICsgY2hhbGsuY3lhbkJyaWdodChkZXApKTtcbiAgICAgIGNvbnNvbGUubG9nKCcgICAgJyArIGRlcGVuZGVudHMuYnkubWFwKGl0ZW0gPT4gYCR7aXRlbS52ZXJ9OiAke2NoYWxrLmdyZXkoaXRlbS5uYW1lKX1gKS5qb2luKCcsICcpKTtcbiAgICB9XG4gIH1cbiAgaWYgKHdvcmtzcGFjZS5ob2lzdERldlBlZXJEZXBJbmZvLnNpemUgPiAwKSB7XG4gICAgY29uc29sZS5sb2coY2hhbGsueWVsbG93QnJpZ2h0KCdcXG5bTWlzc2luZyBkZXYgUGVlciBEZXBlbmRlbmNpZXNdJykpO1xuICAgIGZvciAoY29uc3QgW2RlcCwgZGVwZW5kZW50c10gb2Ygd29ya3NwYWNlLmhvaXN0RGV2UGVlckRlcEluZm8hLmVudHJpZXMoKSkge1xuICAgICAgY29uc29sZS5sb2coJyAgJyArIGNoYWxrLmN5YW5CcmlnaHQoZGVwKSk7XG4gICAgICBjb25zb2xlLmxvZygnICAgICcgKyBkZXBlbmRlbnRzLmJ5Lm1hcChpdGVtID0+IGAke2l0ZW0udmVyfTogJHtjaGFsay5ncmV5KGl0ZW0ubmFtZSl9YCkuam9pbignLCAnKSk7XG4gICAgfVxuICB9XG59XG4iXX0=