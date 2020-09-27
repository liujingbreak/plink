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
const operators_1 = require("rxjs/operators");
const config_1 = __importDefault(require("../config"));
const path_1 = __importDefault(require("path"));
const package_mgr_1 = require("../package-mgr");
const package_utils_1 = require("../package-utils");
const misc_1 = require("../utils/misc");
const cli_project_1 = require("./cli-project");
function default_1(opt, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        const cwd = process.cwd();
        package_mgr_1.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.take(2), operators_1.takeLast(1), operators_1.map(srcPackages => {
            const paks = Array.from(srcPackages.values());
            const maxWidth = paks.reduce((maxWidth, pk) => {
                const width = pk.name.length + pk.json.version.length + 1;
                return width > maxWidth ? width : maxWidth;
            }, 0);
            console.log(`\n${chalk_1.default.greenBright('Linked packages')}\n` +
                paks.map(pk => {
                    const width = pk.name.length + pk.json.version.length + 1;
                    return `  ${chalk_1.default.cyan(pk.name)}@${chalk_1.default.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
                        ` ${path_1.default.relative(cwd, pk.realPath)}`;
                }).join('\n'));
            printWorkspaces();
        })).toPromise();
        if (workspace) {
            package_mgr_1.actionDispatcher.updateWorkspace({ dir: workspace, isForce: opt.force });
        }
        else {
            package_mgr_1.actionDispatcher.initRootDir(null);
            cli_project_1.listProject();
        }
    });
}
exports.default = default_1;
function printWorkspaces() {
    console.log('\n' + chalk_1.default.greenBright('Workspace directories and linked dependencies:'));
    for (const reldir of package_mgr_1.getState().workspaces.keys()) {
        console.log(reldir ? reldir + '/' : '(root directory)');
        console.log('  |- dependencies');
        for (const { name: dep, json: { version: ver }, isInstalled } of package_utils_1.packages4Workspace(path_1.default.resolve(misc_1.getRootDir(), reldir))) {
            console.log(`  |  |- ${dep}  v${ver}  ${isInstalled ? '' : '(linked)'}`);
        }
        // if (ws.linkedDependencies.length === 0)
        //   console.log('  |    (Empty)');
        // for (const [dep, ver] of ws.linkedDependencies) {
        //   console.log(`  |  |- ${dep} ${ver}`);
        // }
        // console.log('  |');
        // console.log('  |- devDependencies');
        // if (ws.linkedDevDependencies.length === 0)
        //   console.log('       (Empty)');
        // for (const [dep, ver] of ws.linkedDevDependencies) {
        //   console.log(`     |- ${dep} ${ver}`);
        // }
        console.log('');
    }
}
exports.printWorkspaces = printWorkspaces;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQiw4Q0FBMkU7QUFDM0UsdURBQStCO0FBQy9CLGdEQUF3QjtBQUN4QixnREFBaUY7QUFFakYsb0RBQW9EO0FBQ3BELHdDQUF5QztBQUN6QywrQ0FBMEM7QUFFMUMsbUJBQThCLEdBQTJCLEVBQUUsU0FBa0I7O1FBQzNFLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFdkIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUN2QixnQ0FBb0IsRUFBRSxFQUN0QixnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLG9CQUFRLENBQUMsQ0FBQyxDQUFDLEVBQ1gsZUFBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDNUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDMUQsT0FBTyxLQUFLLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUM3QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFTixPQUFPLENBQUMsR0FBRyxDQUNULEtBQUssZUFBSyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO2dCQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUNaLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQzFELE9BQU8sS0FBSyxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxlQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLEVBQUU7d0JBQzlGLElBQUksY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDZCxDQUFDO1lBQ0YsZUFBZSxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLElBQUksU0FBUyxFQUFFO1lBQ2IsOEJBQU8sQ0FBQyxlQUFlLENBQUMsRUFBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQztTQUMvRDthQUFNO1lBQ0wsOEJBQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIseUJBQVcsRUFBRSxDQUFDO1NBQ2Y7SUFDSCxDQUFDO0NBQUE7QUFsQ0QsNEJBa0NDO0FBRUQsU0FBZ0IsZUFBZTtJQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxlQUFLLENBQUMsV0FBVyxDQUFDLGdEQUFnRCxDQUFDLENBQUMsQ0FBQztJQUN4RixLQUFLLE1BQU0sTUFBTSxJQUFJLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pDLEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBQyxFQUFFLFdBQVcsRUFBQyxJQUFJLGtDQUFrQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUU7WUFDbkgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsTUFBTSxHQUFHLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7U0FDMUU7UUFDRCwwQ0FBMEM7UUFDMUMsbUNBQW1DO1FBQ25DLG9EQUFvRDtRQUNwRCwwQ0FBMEM7UUFDMUMsSUFBSTtRQUNKLHNCQUFzQjtRQUN0Qix1Q0FBdUM7UUFDdkMsNkNBQTZDO1FBQzdDLG1DQUFtQztRQUNuQyx1REFBdUQ7UUFDdkQsMENBQTBDO1FBQzFDLElBQUk7UUFDSixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ2pCO0FBQ0gsQ0FBQztBQXRCRCwwQ0FzQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCB0YWtlLCB0YWtlTGFzdCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdG9yZSwgZ2V0U3RhdGUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBvcHRpb25zIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7bGlzdFByb2plY3R9IGZyb20gJy4vY2xpLXByb2plY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHQ6IG9wdGlvbnMuSW5pdENtZE9wdGlvbnMsIHdvcmtzcGFjZT86IHN0cmluZykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuXG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHRha2UoMiksXG4gICAgdGFrZUxhc3QoMSksXG4gICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgIGNvbnN0IHBha3MgPSBBcnJheS5mcm9tKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcbiAgICAgIGNvbnN0IG1heFdpZHRoID0gcGFrcy5yZWR1Y2UoKG1heFdpZHRoLCBwaykgPT4ge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICAgIHJldHVybiB3aWR0aCA+IG1heFdpZHRoID8gd2lkdGggOiBtYXhXaWR0aDtcbiAgICAgIH0sIDApO1xuXG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgYFxcbiR7Y2hhbGsuZ3JlZW5CcmlnaHQoJ0xpbmtlZCBwYWNrYWdlcycpfVxcbmAgK1xuICAgICAgICBwYWtzLm1hcChwayA9PiB7XG4gICAgICAgICAgY29uc3Qgd2lkdGggPSBway5uYW1lLmxlbmd0aCArIHBrLmpzb24udmVyc2lvbi5sZW5ndGggKyAxO1xuICAgICAgICAgIHJldHVybiBgICAke2NoYWxrLmN5YW4ocGsubmFtZSl9QCR7Y2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKX0keycgJy5yZXBlYXQobWF4V2lkdGggLSB3aWR0aCl9YCArXG4gICAgICAgICAgICBgICR7UGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKX1gO1xuICAgICAgICB9KS5qb2luKCdcXG4nKVxuICAgICAgKTtcbiAgICAgIHByaW50V29ya3NwYWNlcygpO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgaWYgKHdvcmtzcGFjZSkge1xuICAgIGFjdGlvbnMudXBkYXRlV29ya3NwYWNlKHtkaXI6IHdvcmtzcGFjZSwgaXNGb3JjZTogb3B0LmZvcmNlfSk7XG4gIH0gZWxzZSB7XG4gICAgYWN0aW9ucy5pbml0Um9vdERpcihudWxsKTtcbiAgICBsaXN0UHJvamVjdCgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdcXG4nICsgY2hhbGsuZ3JlZW5CcmlnaHQoJ1dvcmtzcGFjZSBkaXJlY3RvcmllcyBhbmQgbGlua2VkIGRlcGVuZGVuY2llczonKSk7XG4gIGZvciAoY29uc3QgcmVsZGlyIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zb2xlLmxvZyhyZWxkaXIgPyByZWxkaXIgKyAnLycgOiAnKHJvb3QgZGlyZWN0b3J5KScpO1xuICAgIGNvbnNvbGUubG9nKCcgIHwtIGRlcGVuZGVuY2llcycpO1xuICAgIGZvciAoY29uc3Qge25hbWU6IGRlcCwganNvbjoge3ZlcnNpb246IHZlcn0sIGlzSW5zdGFsbGVkfSBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgcmVsZGlyKSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAgIHwgIHwtICR7ZGVwfSAgdiR7dmVyfSAgJHtpc0luc3RhbGxlZCA/ICcnIDogJyhsaW5rZWQpJ31gKTtcbiAgICB9XG4gICAgLy8gaWYgKHdzLmxpbmtlZERlcGVuZGVuY2llcy5sZW5ndGggPT09IDApXG4gICAgLy8gICBjb25zb2xlLmxvZygnICB8ICAgIChFbXB0eSknKTtcbiAgICAvLyBmb3IgKGNvbnN0IFtkZXAsIHZlcl0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgLy8gICBjb25zb2xlLmxvZyhgICB8ICB8LSAke2RlcH0gJHt2ZXJ9YCk7XG4gICAgLy8gfVxuICAgIC8vIGNvbnNvbGUubG9nKCcgIHwnKTtcbiAgICAvLyBjb25zb2xlLmxvZygnICB8LSBkZXZEZXBlbmRlbmNpZXMnKTtcbiAgICAvLyBpZiAod3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLmxlbmd0aCA9PT0gMClcbiAgICAvLyAgIGNvbnNvbGUubG9nKCcgICAgICAgKEVtcHR5KScpO1xuICAgIC8vIGZvciAoY29uc3QgW2RlcCwgdmVyXSBvZiB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKGAgICAgIHwtICR7ZGVwfSAke3Zlcn1gKTtcbiAgICAvLyB9XG4gICAgY29uc29sZS5sb2coJycpO1xuICB9XG59XG4iXX0=