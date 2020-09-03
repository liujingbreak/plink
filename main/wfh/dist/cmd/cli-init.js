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
    for (const [reldir, ws] of package_mgr_1.getState().workspaces.entries()) {
        console.log(reldir ? reldir + '/' : '(root directory)');
        console.log('  |- dependencies');
        if (ws.linkedDependencies.length === 0)
            console.log('  |    (Empty)');
        for (const [dep, ver] of ws.linkedDependencies) {
            console.log(`  |  |- ${dep} ${ver}`);
        }
        console.log('  |');
        console.log('  |- devDependencies');
        if (ws.linkedDevDependencies.length === 0)
            console.log('       (Empty)');
        for (const [dep, ver] of ws.linkedDevDependencies) {
            console.log(`     |- ${dep} ${ver}`);
        }
        console.log('');
    }
}
exports.printWorkspaces = printWorkspaces;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQiw4Q0FBMkU7QUFDM0UsdURBQStCO0FBQy9CLGdEQUF3QjtBQUN4QixnREFBaUY7QUFFakYsbUJBQThCLEdBQTJCLEVBQUUsU0FBa0I7O1FBQzNFLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFdkIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzFCLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUN2QixnQ0FBb0IsRUFBRSxFQUN0QixnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLG9CQUFRLENBQUMsQ0FBQyxDQUFDLEVBQ1gsZUFBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsRUFBRTtnQkFDNUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDMUQsT0FBTyxLQUFLLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUM3QyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFTixPQUFPLENBQUMsR0FBRyxDQUNULEtBQUssZUFBSyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO2dCQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUNaLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQzFELE9BQU8sS0FBSyxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxlQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLEVBQUU7d0JBQzlGLElBQUksY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDZCxDQUFDO1lBQ0YsZUFBZSxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLElBQUksU0FBUyxFQUFFO1lBQ2IsOEJBQU8sQ0FBQyxhQUFhLENBQUMsRUFBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1NBQ3BGO2FBQU07WUFDTCw4QkFBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtJQUNILENBQUM7Q0FBQTtBQWpDRCw0QkFpQ0M7QUFFRCxTQUFnQixlQUFlO0lBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLGVBQUssQ0FBQyxXQUFXLENBQUMsZ0RBQWdELENBQUMsQ0FBQyxDQUFDO0lBQ3hGLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzFELE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNqQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDaEMsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRTtZQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDdEM7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDaEMsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRTtZQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDdEM7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ2pCO0FBQ0gsQ0FBQztBQW5CRCwwQ0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCB0YWtlLCB0YWtlTGFzdCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdG9yZSwgZ2V0U3RhdGUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBvcHRpb25zIGZyb20gJy4vdHlwZXMnO1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24ob3B0OiBvcHRpb25zLkluaXRDbWRPcHRpb25zLCB3b3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0KTtcblxuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICB0YWtlKDIpLFxuICAgIHRha2VMYXN0KDEpLFxuICAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgICBjb25zdCBwYWtzID0gQXJyYXkuZnJvbShzcmNQYWNrYWdlcy52YWx1ZXMoKSk7XG4gICAgICBjb25zdCBtYXhXaWR0aCA9IHBha3MucmVkdWNlKChtYXhXaWR0aCwgcGspID0+IHtcbiAgICAgICAgY29uc3Qgd2lkdGggPSBway5uYW1lLmxlbmd0aCArIHBrLmpzb24udmVyc2lvbi5sZW5ndGggKyAxO1xuICAgICAgICByZXR1cm4gd2lkdGggPiBtYXhXaWR0aCA/IHdpZHRoIDogbWF4V2lkdGg7XG4gICAgICB9LCAwKTtcblxuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgIGBcXG4ke2NoYWxrLmdyZWVuQnJpZ2h0KCdMaW5rZWQgcGFja2FnZXMnKX1cXG5gICtcbiAgICAgICAgcGFrcy5tYXAocGsgPT4ge1xuICAgICAgICAgIGNvbnN0IHdpZHRoID0gcGsubmFtZS5sZW5ndGggKyBway5qc29uLnZlcnNpb24ubGVuZ3RoICsgMTtcbiAgICAgICAgICByZXR1cm4gYCAgJHtjaGFsay5jeWFuKHBrLm5hbWUpfUAke2NoYWxrLmdyZWVuKHBrLmpzb24udmVyc2lvbil9JHsnICcucmVwZWF0KG1heFdpZHRoIC0gd2lkdGgpfWAgK1xuICAgICAgICAgICAgYCAke1BhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCl9YDtcbiAgICAgICAgfSkuam9pbignXFxuJylcbiAgICAgICk7XG4gICAgICBwcmludFdvcmtzcGFjZXMoKTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBhY3Rpb25zLmluaXRXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBpc0ZvcmNlOiBvcHQuZm9yY2UsIGxvZ0hhc0NvbmZpZ2VkOiBmYWxzZX0pO1xuICB9IGVsc2Uge1xuICAgIGFjdGlvbnMuaW5pdFJvb3REaXIobnVsbCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50V29ya3NwYWNlcygpIHtcbiAgY29uc29sZS5sb2coJ1xcbicgKyBjaGFsay5ncmVlbkJyaWdodCgnV29ya3NwYWNlIGRpcmVjdG9yaWVzIGFuZCBsaW5rZWQgZGVwZW5kZW5jaWVzOicpKTtcbiAgZm9yIChjb25zdCBbcmVsZGlyLCB3c10gb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmVudHJpZXMoKSkge1xuICAgIGNvbnNvbGUubG9nKHJlbGRpciA/IHJlbGRpciArICcvJyA6ICcocm9vdCBkaXJlY3RvcnkpJyk7XG4gICAgY29uc29sZS5sb2coJyAgfC0gZGVwZW5kZW5jaWVzJyk7XG4gICAgaWYgKHdzLmxpbmtlZERlcGVuZGVuY2llcy5sZW5ndGggPT09IDApXG4gICAgICBjb25zb2xlLmxvZygnICB8ICAgIChFbXB0eSknKTtcbiAgICBmb3IgKGNvbnN0IFtkZXAsIHZlcl0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgICBjb25zb2xlLmxvZyhgICB8ICB8LSAke2RlcH0gJHt2ZXJ9YCk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCcgIHwnKTtcbiAgICBjb25zb2xlLmxvZygnICB8LSBkZXZEZXBlbmRlbmNpZXMnKTtcbiAgICBpZiAod3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLmxlbmd0aCA9PT0gMClcbiAgICAgIGNvbnNvbGUubG9nKCcgICAgICAgKEVtcHR5KScpO1xuICAgIGZvciAoY29uc3QgW2RlcCwgdmVyXSBvZiB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAgICAgIHwtICR7ZGVwfSAke3Zlcn1gKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJycpO1xuICB9XG59XG4iXX0=