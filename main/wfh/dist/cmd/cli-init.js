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
            package_mgr_1.actionDispatcher.initWorkspace({ dir: workspace, isForce: opt.force, logHasConfiged: false });
        }
        else {
            package_mgr_1.actionDispatcher.initRootDir(null);
        }
    });
}
exports.default = default_1;
function printWorkspaces() {
    console.log('\n' + chalk_1.default.greenBright('Workspace directories and linked dependencies:'));
    for (const reldir of package_mgr_1.getState().workspaces.keys()) {
        console.log(reldir ? reldir + '/' : '(root directory)');
        console.log('  |- dependencies');
        for (const { name: dep, json: { version: ver }, isInstalled } of package_utils_1.packages4Workspace(reldir)) {
            console.log(`  |  |- ${dep}  v${ver}  (${isInstalled ? '' : 'linked'})`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQiw4Q0FBMkU7QUFDM0UsdURBQStCO0FBQy9CLGdEQUF3QjtBQUN4QixnREFBaUY7QUFFakYsb0RBQW9EO0FBQ3BELG1CQUE4QixHQUEyQixFQUFFLFNBQWtCOztRQUMzRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUMxQixzQkFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDdkIsZ0NBQW9CLEVBQUUsRUFDdEIsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxvQkFBUSxDQUFDLENBQUMsQ0FBQyxFQUNYLGVBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQzFELE9BQU8sS0FBSyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDN0MsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRU4sT0FBTyxDQUFDLEdBQUcsQ0FDVCxLQUFLLGVBQUssQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSTtnQkFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDWixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUMxRCxPQUFPLEtBQUssZUFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksZUFBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxFQUFFO3dCQUM5RixJQUFJLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ2QsQ0FBQztZQUNGLGVBQWUsRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxJQUFJLFNBQVMsRUFBRTtZQUNiLDhCQUFPLENBQUMsYUFBYSxDQUFDLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztTQUNwRjthQUFNO1lBQ0wsOEJBQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7SUFDSCxDQUFDO0NBQUE7QUFqQ0QsNEJBaUNDO0FBRUQsU0FBZ0IsZUFBZTtJQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxlQUFLLENBQUMsV0FBVyxDQUFDLGdEQUFnRCxDQUFDLENBQUMsQ0FBQztJQUN4RixLQUFLLE1BQU0sTUFBTSxJQUFJLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pDLEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBQyxFQUFFLFdBQVcsRUFBQyxJQUFJLGtDQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZGLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsMENBQTBDO1FBQzFDLG1DQUFtQztRQUNuQyxvREFBb0Q7UUFDcEQsMENBQTBDO1FBQzFDLElBQUk7UUFDSixzQkFBc0I7UUFDdEIsdUNBQXVDO1FBQ3ZDLDZDQUE2QztRQUM3QyxtQ0FBbUM7UUFDbkMsdURBQXVEO1FBQ3ZELDBDQUEwQztRQUMxQyxJQUFJO1FBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNqQjtBQUNILENBQUM7QUF0QkQsMENBc0JDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgdGFrZSwgdGFrZUxhc3QgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgYWN0aW9ucywgZ2V0U3RvcmUsIGdldFN0YXRlIH0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0ICogYXMgb3B0aW9ucyBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKG9wdDogb3B0aW9ucy5Jbml0Q21kT3B0aW9ucywgd29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG5cbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgdGFrZSgyKSxcbiAgICB0YWtlTGFzdCgxKSxcbiAgICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgICAgY29uc3QgcGFrcyA9IEFycmF5LmZyb20oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgICAgY29uc3QgbWF4V2lkdGggPSBwYWtzLnJlZHVjZSgobWF4V2lkdGgsIHBrKSA9PiB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gcGsubmFtZS5sZW5ndGggKyBway5qc29uLnZlcnNpb24ubGVuZ3RoICsgMTtcbiAgICAgICAgcmV0dXJuIHdpZHRoID4gbWF4V2lkdGggPyB3aWR0aCA6IG1heFdpZHRoO1xuICAgICAgfSwgMCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBgXFxuJHtjaGFsay5ncmVlbkJyaWdodCgnTGlua2VkIHBhY2thZ2VzJyl9XFxuYCArXG4gICAgICAgIHBha3MubWFwKHBrID0+IHtcbiAgICAgICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICAgICAgcmV0dXJuIGAgICR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSR7JyAnLnJlcGVhdChtYXhXaWR0aCAtIHdpZHRoKX1gICtcbiAgICAgICAgICAgIGAgJHtQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpfWA7XG4gICAgICAgIH0pLmpvaW4oJ1xcbicpXG4gICAgICApO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VzKCk7XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgYWN0aW9ucy5pbml0V29ya3NwYWNlKHtkaXI6IHdvcmtzcGFjZSwgaXNGb3JjZTogb3B0LmZvcmNlLCBsb2dIYXNDb25maWdlZDogZmFsc2V9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKG51bGwpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludFdvcmtzcGFjZXMoKSB7XG4gIGNvbnNvbGUubG9nKCdcXG4nICsgY2hhbGsuZ3JlZW5CcmlnaHQoJ1dvcmtzcGFjZSBkaXJlY3RvcmllcyBhbmQgbGlua2VkIGRlcGVuZGVuY2llczonKSk7XG4gIGZvciAoY29uc3QgcmVsZGlyIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zb2xlLmxvZyhyZWxkaXIgPyByZWxkaXIgKyAnLycgOiAnKHJvb3QgZGlyZWN0b3J5KScpO1xuICAgIGNvbnNvbGUubG9nKCcgIHwtIGRlcGVuZGVuY2llcycpO1xuICAgIGZvciAoY29uc3Qge25hbWU6IGRlcCwganNvbjoge3ZlcnNpb246IHZlcn0sIGlzSW5zdGFsbGVkfSBvZiBwYWNrYWdlczRXb3Jrc3BhY2UocmVsZGlyKSkge1xuICAgICAgY29uc29sZS5sb2coYCAgfCAgfC0gJHtkZXB9ICB2JHt2ZXJ9ICAoJHtpc0luc3RhbGxlZCA/ICcnIDogJ2xpbmtlZCd9KWApO1xuICAgIH1cbiAgICAvLyBpZiAod3MubGlua2VkRGVwZW5kZW5jaWVzLmxlbmd0aCA9PT0gMClcbiAgICAvLyAgIGNvbnNvbGUubG9nKCcgIHwgICAgKEVtcHR5KScpO1xuICAgIC8vIGZvciAoY29uc3QgW2RlcCwgdmVyXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKGAgIHwgIHwtICR7ZGVwfSAke3Zlcn1gKTtcbiAgICAvLyB9XG4gICAgLy8gY29uc29sZS5sb2coJyAgfCcpO1xuICAgIC8vIGNvbnNvbGUubG9nKCcgIHwtIGRldkRlcGVuZGVuY2llcycpO1xuICAgIC8vIGlmICh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubGVuZ3RoID09PSAwKVxuICAgIC8vICAgY29uc29sZS5sb2coJyAgICAgICAoRW1wdHkpJyk7XG4gICAgLy8gZm9yIChjb25zdCBbZGVwLCB2ZXJdIG9mIHdzLmxpbmtlZERldkRlcGVuZGVuY2llcykge1xuICAgIC8vICAgY29uc29sZS5sb2coYCAgICAgfC0gJHtkZXB9ICR7dmVyfWApO1xuICAgIC8vIH1cbiAgICBjb25zb2xlLmxvZygnJyk7XG4gIH1cbn1cbiJdfQ==