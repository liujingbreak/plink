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
const operators_1 = require("rxjs/operators");
const config_1 = __importDefault(require("../config"));
const package_mgr_1 = require("../package-mgr");
const package_utils_1 = require("../package-utils");
const misc_1 = require("../utils/misc");
const cli_project_1 = require("./cli-project");
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
            package_mgr_1.actionDispatcher.initRootDir({ isForce: opt.force });
            setImmediate(() => cli_project_1.listProject());
        }
        // setImmediate(() => printWorkspaces());
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
        console.log('');
    }
}
exports.printWorkspaces = printWorkspaces;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsOENBQXVFO0FBQ3ZFLHVEQUErQjtBQUMvQixnREFBaUY7QUFDakYsb0RBQXNEO0FBQ3RELHdDQUEyQztBQUMzQywrQ0FBNEM7QUFHNUMsbUJBQThCLEdBQTJCLEVBQUUsU0FBa0I7O1FBQzNFLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZ0NBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLEtBQUssRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQzNGLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDaEIsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUN2QixlQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDaEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM5QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUM1QyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRCxPQUFPLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQzdDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVOLE9BQU8sQ0FBQyxHQUFHLENBQ1QsS0FBSyxlQUFLLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUk7Z0JBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ1osTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxLQUFLLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLGVBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsRUFBRTt3QkFDOUYsSUFBSSxjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNkLENBQUM7WUFDRixlQUFlLEVBQUUsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsSUFBSSxTQUFTLEVBQUU7WUFDYiw4QkFBTyxDQUFDLGVBQWUsQ0FBQyxFQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1NBQy9EO2FBQU07WUFDTCw4QkFBTyxDQUFDLFdBQVcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQztZQUMxQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMseUJBQVcsRUFBRSxDQUFDLENBQUM7U0FDbkM7UUFDRCx5Q0FBeUM7SUFDM0MsQ0FBQztDQUFBO0FBakNELDRCQWlDQztBQUVELFNBQWdCLGVBQWU7SUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLFdBQVcsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDLENBQUM7SUFDeEYsS0FBSyxNQUFNLE1BQU0sSUFBSSxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNqQyxLQUFLLE1BQU0sRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUMsRUFBRSxXQUFXLEVBQUMsSUFBSSxrQ0FBa0IsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO1lBQ25ILE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLE1BQU0sR0FBRyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1NBQzFFO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNqQjtBQUNILENBQUM7QUFWRCwwQ0FVQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgdGFrZSwgc2tpcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgYWN0aW9ucywgZ2V0U3RhdGUsIGdldFN0b3JlIH0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgcGFja2FnZXM0V29ya3NwYWNlIH0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgeyBnZXRSb290RGlyIH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgeyBsaXN0UHJvamVjdCB9IGZyb20gJy4vY2xpLXByb2plY3QnO1xuaW1wb3J0ICogYXMgb3B0aW9ucyBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0OiBvcHRpb25zLkluaXRDbWRPcHRpb25zLCB3b3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0KTtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtID09PSBzMi53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSksXG4gICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgICAgY29uc3QgcGFrcyA9IEFycmF5LmZyb20oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgICAgY29uc3QgbWF4V2lkdGggPSBwYWtzLnJlZHVjZSgobWF4V2lkdGgsIHBrKSA9PiB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gcGsubmFtZS5sZW5ndGggKyBway5qc29uLnZlcnNpb24ubGVuZ3RoICsgMTtcbiAgICAgICAgcmV0dXJuIHdpZHRoID4gbWF4V2lkdGggPyB3aWR0aCA6IG1heFdpZHRoO1xuICAgICAgfSwgMCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICBgXFxuJHtjaGFsay5ncmVlbkJyaWdodCgnTGlua2VkIHBhY2thZ2VzJyl9XFxuYCArXG4gICAgICAgIHBha3MubWFwKHBrID0+IHtcbiAgICAgICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICAgICAgcmV0dXJuIGAgICR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSR7JyAnLnJlcGVhdChtYXhXaWR0aCAtIHdpZHRoKX1gICtcbiAgICAgICAgICAgIGAgJHtQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpfWA7XG4gICAgICAgIH0pLmpvaW4oJ1xcbicpXG4gICAgICApO1xuICAgICAgcHJpbnRXb3Jrc3BhY2VzKCk7XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcblxuICBpZiAod29ya3NwYWNlKSB7XG4gICAgYWN0aW9ucy51cGRhdGVXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKHtpc0ZvcmNlOiBvcHQuZm9yY2V9KTtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gbGlzdFByb2plY3QoKSk7XG4gIH1cbiAgLy8gc2V0SW1tZWRpYXRlKCgpID0+IHByaW50V29ya3NwYWNlcygpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50V29ya3NwYWNlcygpIHtcbiAgY29uc29sZS5sb2coJ1xcbicgKyBjaGFsay5ncmVlbkJyaWdodCgnV29ya3NwYWNlIGRpcmVjdG9yaWVzIGFuZCBsaW5rZWQgZGVwZW5kZW5jaWVzOicpKTtcbiAgZm9yIChjb25zdCByZWxkaXIgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnNvbGUubG9nKHJlbGRpciA/IHJlbGRpciArICcvJyA6ICcocm9vdCBkaXJlY3RvcnkpJyk7XG4gICAgY29uc29sZS5sb2coJyAgfC0gZGVwZW5kZW5jaWVzJyk7XG4gICAgZm9yIChjb25zdCB7bmFtZTogZGVwLCBqc29uOiB7dmVyc2lvbjogdmVyfSwgaXNJbnN0YWxsZWR9IG9mIHBhY2thZ2VzNFdvcmtzcGFjZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCByZWxkaXIpKSkge1xuICAgICAgY29uc29sZS5sb2coYCAgfCAgfC0gJHtkZXB9ICB2JHt2ZXJ9ICAke2lzSW5zdGFsbGVkID8gJycgOiAnKGxpbmtlZCknfWApO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnJyk7XG4gIH1cbn1cbiJdfQ==