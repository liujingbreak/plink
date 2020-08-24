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
// import logConfig from '../log-config';
const package_mgr_1 = require("../package-mgr");
function default_1(opt, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        const done = package_mgr_1.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.take(2), operators_1.takeLast(1), operators_1.map(srcPackages => {
            console.log(' *** Linked packages ***\n\n' +
                Array.from(srcPackages.values()).map(pk => `${chalk_1.default.cyan(pk.name)}@${chalk_1.default.green(pk.json.version)}  (${pk.realPath})`).join('\n'));
        })).toPromise();
        if (workspace) {
            package_mgr_1.actionDispatcher.initWorkspace({ dir: workspace, opt });
        }
        else {
            package_mgr_1.actionDispatcher.initRootDir(null);
        }
        yield done;
        printWorkspaces();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQTZDO0FBQzdDLGtEQUEwQjtBQUMxQiw4Q0FBMkU7QUFDM0UsdURBQStCO0FBRS9CLHlDQUF5QztBQUN6QyxnREFBaUY7QUFHakYsbUJBQThCLEdBQTJCLEVBQUUsU0FBa0I7O1FBQzNFLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFdkIsTUFBTSxJQUFJLEdBQUcsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDMUIsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUN2QixnQ0FBb0IsRUFBRSxFQUN0QixnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLG9CQUFRLENBQUMsQ0FBQyxDQUFDLEVBQ1gsZUFBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQ1QsOEJBQThCO2dCQUM5QixLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksZUFBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEdBQUcsQ0FBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDbkksQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxJQUFJLFNBQVMsRUFBRTtZQUNiLDhCQUFPLENBQUMsYUFBYSxDQUFDLEVBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO1NBQzlDO2FBQU07WUFDTCw4QkFBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzQjtRQUNELE1BQU0sSUFBSSxDQUFDO1FBQ1gsZUFBZSxFQUFFLENBQUM7SUFDcEIsQ0FBQztDQUFBO0FBdkJELDRCQXVCQztBQUVELFNBQWdCLGVBQWU7SUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLFdBQVcsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDLENBQUM7SUFDeEYsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDMUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pDLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO1lBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztTQUN0QztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BDLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLHFCQUFxQixFQUFFO1lBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztTQUN0QztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDakI7QUFDSCxDQUFDO0FBbkJELDBDQW1CQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBtYXAsIHRha2UsIHRha2VMYXN0IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuXG4vLyBpbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBhY3Rpb25zLCBnZXRTdG9yZSwgZ2V0U3RhdGUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBvcHRpb25zIGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHQ6IG9wdGlvbnMuSW5pdENtZE9wdGlvbnMsIHdvcmtzcGFjZT86IHN0cmluZykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuXG4gIGNvbnN0IGRvbmUgPSBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICB0YWtlKDIpLFxuICAgIHRha2VMYXN0KDEpLFxuICAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgJyAqKiogTGlua2VkIHBhY2thZ2VzICoqKlxcblxcbicgK1xuICAgICAgICBBcnJheS5mcm9tKHNyY1BhY2thZ2VzLnZhbHVlcygpKS5tYXAocGsgPT4gYCR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSAgKCR7cGsucmVhbFBhdGh9KWAgKS5qb2luKCdcXG4nKVxuICAgICAgKTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmICh3b3Jrc3BhY2UpIHtcbiAgICBhY3Rpb25zLmluaXRXb3Jrc3BhY2Uoe2Rpcjogd29ya3NwYWNlLCBvcHR9KTtcbiAgfSBlbHNlIHtcbiAgICBhY3Rpb25zLmluaXRSb290RGlyKG51bGwpO1xuICB9XG4gIGF3YWl0IGRvbmU7XG4gIHByaW50V29ya3NwYWNlcygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRXb3Jrc3BhY2VzKCkge1xuICBjb25zb2xlLmxvZygnXFxuJyArIGNoYWxrLmdyZWVuQnJpZ2h0KCdXb3Jrc3BhY2UgZGlyZWN0b3JpZXMgYW5kIGxpbmtlZCBkZXBlbmRlbmNpZXM6JykpO1xuICBmb3IgKGNvbnN0IFtyZWxkaXIsIHdzXSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZW50cmllcygpKSB7XG4gICAgY29uc29sZS5sb2cocmVsZGlyID8gcmVsZGlyICsgJy8nIDogJyhyb290IGRpcmVjdG9yeSknKTtcbiAgICBjb25zb2xlLmxvZygnICB8LSBkZXBlbmRlbmNpZXMnKTtcbiAgICBpZiAod3MubGlua2VkRGVwZW5kZW5jaWVzLmxlbmd0aCA9PT0gMClcbiAgICAgIGNvbnNvbGUubG9nKCcgIHwgICAgKEVtcHR5KScpO1xuICAgIGZvciAoY29uc3QgW2RlcCwgdmVyXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAgIHwgIHwtICR7ZGVwfSAke3Zlcn1gKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJyAgfCcpO1xuICAgIGNvbnNvbGUubG9nKCcgIHwtIGRldkRlcGVuZGVuY2llcycpO1xuICAgIGlmICh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubGVuZ3RoID09PSAwKVxuICAgICAgY29uc29sZS5sb2coJyAgICAgICAoRW1wdHkpJyk7XG4gICAgZm9yIChjb25zdCBbZGVwLCB2ZXJdIG9mIHdzLmxpbmtlZERldkRlcGVuZGVuY2llcykge1xuICAgICAgY29uc29sZS5sb2coYCAgICAgfC0gJHtkZXB9ICR7dmVyfWApO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnJyk7XG4gIH1cbn1cbiJdfQ==