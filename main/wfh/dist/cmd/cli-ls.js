"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.checkDir = void 0;
// tslint:disable: no-console
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
const pkMgr = __importStar(require("../package-mgr"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const cli_init_1 = require("./cli-init");
const operators_1 = require("rxjs/operators");
const misc_1 = require("../utils/misc");
function list(opt) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        log_config_1.default(config_1.default());
        // const pmgr: typeof pkMgr = require('../package-mgr');
        const pkRunner = require('../../lib/packageMgr/packageRunner');
        if (opt.json)
            console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
        else
            console.log(listPackagesByProjects());
        const table = misc_1.createCliTable({ horizontalLines: false });
        table.push([{ colSpan: 2, hAlign: 'center', content: chalk_1.default.bold('SERVER COMPONENTS') }], [chalk_1.default.bold('Package'), chalk_1.default.bold('Directory')], ['------', '-------']);
        const list = yield pkRunner.listServerComponents();
        list.forEach(row => table.push([row.desc, chalk_1.default.blue(path_1.default.relative(config_1.default().rootPath, row.pk.path))]));
        console.log(table.toString());
        cli_init_1.printWorkspaces();
    });
}
exports.default = list;
function checkDir(opt) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        log_config_1.default(config_1.default());
        pkMgr.getStore().pipe(operators_1.map(s => s.packagesUpdateChecksum), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.take(1), operators_1.map((curr) => {
            console.log('Directory state is updated.');
            return curr;
        })).subscribe();
        pkMgr.actionDispatcher.updateDir();
    });
}
exports.checkDir = checkDir;
function listPackagesByProjects() {
    const cwd = process.cwd();
    const pmgr = require('../package-mgr');
    const linkedPkgs = pmgr.getState().srcPackages;
    const table = misc_1.createCliTable({ horizontalLines: false, colAligns: ['right', 'left', 'left'] });
    table.push([{ colSpan: 3, content: chalk_1.default.bold('LINKED PACKAGES IN PROJECT\n'), hAlign: 'center' }]);
    for (const [prj, pkgNames] of pmgr.getState().project2Packages.entries()) {
        table.push([{
                colSpan: 3, hAlign: 'left',
                content: chalk_1.default.bold('Project: ') + (prj ? chalk_1.default.cyan(prj) : chalk_1.default.cyan('(root directory)'))
            }
        ], ['Package name', 'version', 'Path'], ['------------', '-------', '----']);
        const pkgs = pkgNames.map(name => linkedPkgs.get(name));
        for (const pk of pkgs) {
            table.push([
                chalk_1.default.cyan(pk.name),
                chalk_1.default.green(pk.json.version),
                path_1.default.relative(cwd, pk.realPath)
            ]);
        }
    }
    return table.toString();
}
function jsonOfLinkedPackageForProjects() {
    var _a;
    const all = {};
    const linkedPkgs = pkMgr.getState().srcPackages;
    for (const [prj, pkgNames] of pkMgr.getState().project2Packages.entries()) {
        const dep = all[prj] = {};
        for (const pkName of pkgNames) {
            dep[pkName] = (_a = linkedPkgs.get(pkName)) === null || _a === void 0 ? void 0 : _a.json.version;
        }
    }
    return all;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFFdEMsc0RBQXdDO0FBQ3hDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFHeEIseUNBQTJDO0FBQzNDLDhDQUFxRTtBQUNyRSx3Q0FBNkM7QUFNN0MsU0FBOEIsSUFBSSxDQUFDLEdBQW9DOztRQUNyRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsd0RBQXdEO1FBRXhELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBRS9ELElBQUksR0FBRyxDQUFDLElBQUk7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzs7WUFFMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFeEMsTUFBTSxLQUFLLEdBQUcscUJBQWMsQ0FBQyxFQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssQ0FBQyxJQUFJLENBQ1IsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLENBQUMsRUFDMUUsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFDaEQsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUV6QixNQUFNLElBQUksR0FBd0IsTUFBTSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUN4RSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDOUIsMEJBQWUsRUFBRSxDQUFDO0lBQ3BCLENBQUM7Q0FBQTtBQXRCRCx1QkFzQkM7QUFFRCxTQUFzQixRQUFRLENBQUMsR0FBa0I7O1FBQy9DLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztRQUNwQixLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNuQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxnQ0FBb0IsRUFBRSxFQUMxRCxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ2hCLGVBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0NBQUE7QUFaRCw0QkFZQztBQUVELFNBQVMsc0JBQXNCO0lBQzdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixNQUFNLElBQUksR0FBaUIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDckQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUUvQyxNQUFNLEtBQUssR0FBRyxxQkFBYyxDQUFDLEVBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUM3RixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFLLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUMsQ0FBQztJQUNsRyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ3hFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDVixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNO2dCQUMxQixPQUFPLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2FBQUM7U0FDN0YsRUFDQyxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLEVBQ25DLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUM7UUFDekQsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDckIsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVCxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLGVBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQzVCLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUM7YUFBQyxDQUFDLENBQUM7U0FDckM7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzFCLENBQUM7QUFFRCxTQUFTLDhCQUE4Qjs7SUFDckMsTUFBTSxHQUFHLEdBQTZDLEVBQUUsQ0FBQztJQUN6RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ2hELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDekUsTUFBTSxHQUFHLEdBQTRCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbkQsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUU7WUFDN0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLDBDQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDcEQ7S0FDRjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7cHJpbnRXb3Jrc3BhY2VzfSBmcm9tICcuL2NsaS1pbml0JztcbmltcG9ydCB7dGFrZSwgbWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgc2tpcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZX0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5cbmludGVyZmFjZSBDb21wb25lbnRMaXN0SXRlbSB7XG4gIHBrOiBOb2RlUGFja2FnZTtcbiAgZGVzYzogc3RyaW5nO1xufVxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gbGlzdChvcHQ6IEdsb2JhbE9wdGlvbnMgJiB7anNvbjogYm9vbGVhbn0pIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0KTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgLy8gY29uc3QgcG1ncjogdHlwZW9mIHBrTWdyID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKTtcblxuICBjb25zdCBwa1J1bm5lciA9IHJlcXVpcmUoJy4uLy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VSdW5uZXInKTtcblxuICBpZiAob3B0Lmpzb24pXG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoanNvbk9mTGlua2VkUGFja2FnZUZvclByb2plY3RzKCksIG51bGwsICcgICcpKTtcbiAgZWxzZVxuICAgIGNvbnNvbGUubG9nKGxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSk7XG5cbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICB0YWJsZS5wdXNoKFxuICAgIFt7Y29sU3BhbjogMiwgaEFsaWduOiAnY2VudGVyJywgY29udGVudDogY2hhbGsuYm9sZCgnU0VSVkVSIENPTVBPTkVOVFMnKX1dLFxuICAgIFtjaGFsay5ib2xkKCdQYWNrYWdlJyksIGNoYWxrLmJvbGQoJ0RpcmVjdG9yeScpXSxcbiAgICBbJy0tLS0tLScsICctLS0tLS0tJ10pO1xuXG4gIGNvbnN0IGxpc3Q6IENvbXBvbmVudExpc3RJdGVtW10gPSBhd2FpdCBwa1J1bm5lci5saXN0U2VydmVyQ29tcG9uZW50cygpO1xuICBsaXN0LmZvckVhY2gocm93ID0+IHRhYmxlLnB1c2goW3Jvdy5kZXNjLCBjaGFsay5ibHVlKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIHJvdy5way5wYXRoKSldKSk7XG4gIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICBwcmludFdvcmtzcGFjZXMoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRGlyKG9wdDogR2xvYmFsT3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuICBwa01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBza2lwKDEpLCB0YWtlKDEpLFxuICAgIG1hcCgoY3VycikgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ0RpcmVjdG9yeSBzdGF0ZSBpcyB1cGRhdGVkLicpO1xuICAgICAgcmV0dXJuIGN1cnI7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgcGtNZ3IuYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVEaXIoKTtcbn1cblxuZnVuY3Rpb24gbGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpIHtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgcG1ncjogdHlwZW9mIHBrTWdyID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKTtcbiAgY29uc3QgbGlua2VkUGtncyA9IHBtZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcblxuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlLCBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCcsICdsZWZ0J119KTtcbiAgdGFibGUucHVzaChbe2NvbFNwYW46IDMsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0xJTktFRCBQQUNLQUdFUyBJTiBQUk9KRUNUXFxuJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHBtZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDMsIGhBbGlnbjogJ2xlZnQnLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZCgnUHJvamVjdDogJykgKyAocHJqID8gY2hhbGsuY3lhbihwcmopIDogY2hhbGsuY3lhbignKHJvb3QgZGlyZWN0b3J5KScpKX1cbiAgICBdLFxuICAgICAgWydQYWNrYWdlIG5hbWUnLCAndmVyc2lvbicsICdQYXRoJ10sXG4gICAgICBbJy0tLS0tLS0tLS0tLScsICctLS0tLS0tJywgJy0tLS0nXSk7XG4gICAgY29uc3QgcGtncyA9IHBrZ05hbWVzLm1hcChuYW1lID0+IGxpbmtlZFBrZ3MuZ2V0KG5hbWUpISk7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgICB0YWJsZS5wdXNoKFtcbiAgICAgICAgY2hhbGsuY3lhbihway5uYW1lKSxcbiAgICAgICAgY2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKSxcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGFibGUudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24ganNvbk9mTGlua2VkUGFja2FnZUZvclByb2plY3RzKCkge1xuICBjb25zdCBhbGw6IHtbcHJqOiBzdHJpbmddOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfX0gPSB7fTtcbiAgY29uc3QgbGlua2VkUGtncyA9IHBrTWdyLmdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHBrTWdyLmdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCBkZXA6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0gYWxsW3Byal0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHBrTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgZGVwW3BrTmFtZV0gPSBsaW5rZWRQa2dzLmdldChwa05hbWUpPy5qc29uLnZlcnNpb247XG4gICAgfVxuICB9XG4gIHJldHVybiBhbGw7XG59XG4iXX0=