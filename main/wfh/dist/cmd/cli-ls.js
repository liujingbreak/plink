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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFFdEMsc0RBQXdDO0FBQ3hDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFHeEIseUNBQTBFO0FBQzFFLDhDQUFxRTtBQUNyRSx3Q0FBNkM7QUFNN0MsU0FBOEIsSUFBSSxDQUFDLEdBQW9DOztRQUNyRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsd0RBQXdEO1FBRXhELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBRS9ELElBQUksR0FBRyxDQUFDLElBQUk7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzs7WUFFMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFeEMsTUFBTSxLQUFLLEdBQUcscUJBQWMsQ0FBQyxFQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssQ0FBQyxJQUFJLENBQ1IsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLENBQUMsRUFDMUUsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFDaEQsQ0FBQyxRQUFRLEVBQUUsU0FB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R0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUM7UUFDekQsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDckIsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVCxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLGVBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQzVCLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUM7YUFBQyxDQUFDLENBQUM7U0FDckM7S0FDRjtJQUNELE9BQU8sS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzFCLENBQUM7QUFFRCxTQUFTLDhCQUE4Qjs7SUFDckMsTUFBTSxHQUFHLEdBQTZDLEVBQUUsQ0FBQztJQUN6RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ2hELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDekUsTUFBTSxHQUFHLEdBQTRCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbkQsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUU7WUFDN0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLDBDQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDcEQ7S0FDRjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7cHJpbnRXb3Jrc3BhY2VzLyosIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMqL30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQge3Rha2UsIG1hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIHNraXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5pbnRlcmZhY2UgQ29tcG9uZW50TGlzdEl0ZW0ge1xuICBwazogTm9kZVBhY2thZ2U7XG4gIGRlc2M6IHN0cmluZztcbn1cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGxpc3Qob3B0OiBHbG9iYWxPcHRpb25zICYge2pzb246IGJvb2xlYW59KSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIC8vIGNvbnN0IHBtZ3I6IHR5cGVvZiBwa01nciA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJyk7XG5cbiAgY29uc3QgcGtSdW5uZXIgPSByZXF1aXJlKCcuLi8uLi9saWIvcGFja2FnZU1nci9wYWNrYWdlUnVubmVyJyk7XG5cbiAgaWYgKG9wdC5qc29uKVxuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGpzb25PZkxpbmtlZFBhY2thZ2VGb3JQcm9qZWN0cygpLCBudWxsLCAnICAnKSk7XG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhsaXN0UGFja2FnZXNCeVByb2plY3RzKCkpO1xuXG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgdGFibGUucHVzaChcbiAgICBbe2NvbFNwYW46IDIsIGhBbGlnbjogJ2NlbnRlcicsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ1NFUlZFUiBDT01QT05FTlRTJyl9XSxcbiAgICBbY2hhbGsuYm9sZCgnUGFja2FnZScpLCBjaGFsay5ib2xkKCdEaXJlY3RvcnknKV0sXG4gICAgWyctLS0tLS0nLCAnLS0tLS0tLSddKTtcblxuICBjb25zdCBsaXN0OiBDb21wb25lbnRMaXN0SXRlbVtdID0gYXdhaXQgcGtSdW5uZXIubGlzdFNlcnZlckNvbXBvbmVudHMoKTtcbiAgbGlzdC5mb3JFYWNoKHJvdyA9PiB0YWJsZS5wdXNoKFtyb3cuZGVzYywgY2hhbGsuYmx1ZShQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLCByb3cucGsucGF0aCkpXSkpO1xuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgcHJpbnRXb3Jrc3BhY2VzKCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0RpcihvcHQ6IEdsb2JhbE9wdGlvbnMpIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0KTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcGtNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucGFja2FnZXNVcGRhdGVDaGVja3N1bSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICBtYXAoKGN1cnIpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdEaXJlY3Rvcnkgc3RhdGUgaXMgdXBkYXRlZC4nKTtcbiAgICAgIHJldHVybiBjdXJyO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIHBrTWdyLmFjdGlvbkRpc3BhdGNoZXIudXBkYXRlRGlyKCk7XG59XG5cbmZ1bmN0aW9uIGxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSB7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IHBtZ3I6IHR5cGVvZiBwa01nciA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJyk7XG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBwbWdyLmdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG5cbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZSwgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnLCAnbGVmdCddfSk7XG4gIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAzLCBjb250ZW50OiBjaGFsay5ib2xkKCdMSU5LRUQgUEFDS0FHRVMgSU4gUFJPSkVDVFxcbicpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBwbWdyLmdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5lbnRyaWVzKCkpIHtcbiAgICB0YWJsZS5wdXNoKFt7XG4gICAgICBjb2xTcGFuOiAzLCBoQWxpZ246ICdsZWZ0JyxcbiAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ1Byb2plY3Q6ICcpICsgKHByaiA/IGNoYWxrLmN5YW4ocHJqKSA6IGNoYWxrLmN5YW4oJyhyb290IGRpcmVjdG9yeSknKSl9XG4gICAgXSxcbiAgICAgIFsnUGFja2FnZSBuYW1lJywgJ3ZlcnNpb24nLCAnUGF0aCddLFxuICAgICAgWyctLS0tLS0tLS0tLS0nLCAnLS0tLS0tLScsICctLS0tJ10pO1xuICAgIGNvbnN0IHBrZ3MgPSBwa2dOYW1lcy5tYXAobmFtZSA9PiBsaW5rZWRQa2dzLmdldChuYW1lKSEpO1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtncykge1xuICAgICAgdGFibGUucHVzaChbXG4gICAgICAgIGNoYWxrLmN5YW4ocGsubmFtZSksXG4gICAgICAgIGNoYWxrLmdyZWVuKHBrLmpzb24udmVyc2lvbiksXG4gICAgICAgIFBhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhYmxlLnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIGpzb25PZkxpbmtlZFBhY2thZ2VGb3JQcm9qZWN0cygpIHtcbiAgY29uc3QgYWxsOiB7W3Byajogc3RyaW5nXToge1trZXk6IHN0cmluZ106IHN0cmluZ319ID0ge307XG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBwa01nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBwa01nci5nZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgY29uc3QgZGVwOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IGFsbFtwcmpdID0ge307XG4gICAgZm9yIChjb25zdCBwa05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgIGRlcFtwa05hbWVdID0gbGlua2VkUGtncy5nZXQocGtOYW1lKT8uanNvbi52ZXJzaW9uO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWxsO1xufVxuIl19