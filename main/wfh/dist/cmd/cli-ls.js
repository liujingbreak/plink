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
const pkMgr = __importStar(require("../package-mgr"));
// import {getRootDir} from '../utils/misc';
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const cli_init_1 = require("./cli-init");
const operators_1 = require("rxjs/operators");
const misc_1 = require("../utils/misc");
const priorityHelper = __importStar(require("../package-priority-helper"));
const package_runner_1 = require("../package-runner");
function list(opt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (opt.json)
            console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
        else
            console.log(listPackagesByProjects());
        const table = misc_1.createCliTable({ horizontalLines: false });
        table.push([{ colSpan: 3, hAlign: 'center', content: chalk_1.default.bold('SERVER COMPONENTS') }], [chalk_1.default.bold('Package'), 'Priority', chalk_1.default.bold('Directory')], ['------', '-------', '--------']);
        const list = yield listServerPackages();
        list.forEach(row => table.push([
            row.name,
            row.priority,
            chalk_1.default.cyan(path_1.default.relative(config_1.default().rootPath, row.dir))
        ]));
        console.log(table.toString());
        cli_init_1.printWorkspaces();
    });
}
exports.default = list;
function checkDir(opt) {
    return __awaiter(this, void 0, void 0, function* () {
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
function listServerPackages() {
    return __awaiter(this, void 0, void 0, function* () {
        let wsKey = pkMgr.workspaceKey(process.cwd());
        wsKey = pkMgr.getState().workspaces.has(wsKey) ? wsKey : pkMgr.getState().currWorkspace;
        if (wsKey == null) {
            return [];
        }
        const pkgs = Array.from(package_list_helper_1.packages4WorkspaceKey(wsKey, true))
            .filter(package_runner_1.isServerPackage)
            .map(pkg => ({
            name: pkg.name,
            priority: package_runner_1.readPriorityProperty(pkg.json)
        }));
        const list = [];
        yield priorityHelper.orderPackages(pkgs, pk => {
            list.push([pk.name, pk.priority]);
        });
        const workspace = pkMgr.getState().workspaces.get(wsKey);
        return list.map(([name, pri]) => {
            const pkg = pkMgr.getState().srcPackages.get(name) || workspace.installedComponents.get(name);
            return {
                name,
                priority: pri + '',
                dir: pkg.realPath
            };
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUUvQixzREFBd0M7QUFDeEMsNENBQTRDO0FBQzVDLDRFQUF5RTtBQUN6RSxrREFBMEI7QUFDMUIsZ0RBQXdCO0FBRXhCLHlDQUEwRTtBQUMxRSw4Q0FBcUU7QUFDckUsd0NBQTZDO0FBQzdDLDJFQUE2RDtBQUM3RCxzREFBd0U7QUFFeEUsU0FBOEIsSUFBSSxDQUFDLEdBQW9DOztRQUNyRSxJQUFJLEdBQUcsQ0FBQyxJQUFJO1lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7O1lBRTFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sS0FBSyxHQUFHLHFCQUFjLENBQUMsRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUN2RCxLQUFLLENBQUMsSUFBSSxDQUNSLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBQyxDQUFDLEVBQzFFLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxVQUFVLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUM1RCxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUVyQyxNQUFNLElBQUksR0FBd0IsTUFBTSxrQkFBa0IsRUFBRSxDQUFDO1FBQzdELElBQUksQ0FBQyxPQUFPLENBQUMs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QUksQ0FBQywyQ0FBcUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDMUQsTUFBTSxDQUFDLGdDQUFlLENBQUM7YUFDdkIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNYLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBRSxxQ0FBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1NBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxJQUFJLEdBQXFDLEVBQUUsQ0FBQztRQUVsRCxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7UUFDMUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRTtZQUM5QixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsbUJBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO1lBQ2hHLE9BQU87Z0JBQ0wsSUFBSTtnQkFDSixRQUFRLEVBQUUsR0FBRyxHQUFHLEVBQUU7Z0JBQ2xCLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUTthQUNsQixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbi8vIGltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3ByaW50V29ya3NwYWNlcy8qLCBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKi99IGZyb20gJy4vY2xpLWluaXQnO1xuaW1wb3J0IHt0YWtlLCBtYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBza2lwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIHByaW9yaXR5SGVscGVyIGZyb20gJy4uL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCB7aXNTZXJ2ZXJQYWNrYWdlLCByZWFkUHJpb3JpdHlQcm9wZXJ0eX0gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBsaXN0KG9wdDogR2xvYmFsT3B0aW9ucyAmIHtqc29uOiBib29sZWFufSkge1xuICBpZiAob3B0Lmpzb24pXG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoanNvbk9mTGlua2VkUGFja2FnZUZvclByb2plY3RzKCksIG51bGwsICcgICcpKTtcbiAgZWxzZVxuICAgIGNvbnNvbGUubG9nKGxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSk7XG5cbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICB0YWJsZS5wdXNoKFxuICAgIFt7Y29sU3BhbjogMywgaEFsaWduOiAnY2VudGVyJywgY29udGVudDogY2hhbGsuYm9sZCgnU0VSVkVSIENPTVBPTkVOVFMnKX1dLFxuICAgIFtjaGFsay5ib2xkKCdQYWNrYWdlJyksICdQcmlvcml0eScsIGNoYWxrLmJvbGQoJ0RpcmVjdG9yeScpXSxcbiAgICBbJy0tLS0tLScsICctLS0tLS0tJywgJy0tLS0tLS0tJ10pO1xuXG4gIGNvbnN0IGxpc3Q6IFNlcnZlclBhY2thZ2VWaWV3W10gPSBhd2FpdCBsaXN0U2VydmVyUGFja2FnZXMoKTtcbiAgbGlzdC5mb3JFYWNoKHJvdyA9PiB0YWJsZS5wdXNoKFtcbiAgICByb3cubmFtZSxcbiAgICByb3cucHJpb3JpdHksXG4gICAgY2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLCByb3cuZGlyKSlcbiAgXSkpO1xuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgcHJpbnRXb3Jrc3BhY2VzKCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0RpcihvcHQ6IEdsb2JhbE9wdGlvbnMpIHtcbiAgcGtNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucGFja2FnZXNVcGRhdGVDaGVja3N1bSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICBtYXAoKGN1cnIpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdEaXJlY3Rvcnkgc3RhdGUgaXMgdXBkYXRlZC4nKTtcbiAgICAgIHJldHVybiBjdXJyO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIHBrTWdyLmFjdGlvbkRpc3BhdGNoZXIudXBkYXRlRGlyKCk7XG59XG5cbmZ1bmN0aW9uIGxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSB7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IHBtZ3I6IHR5cGVvZiBwa01nciA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJyk7XG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBwbWdyLmdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG5cbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZSwgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnLCAnbGVmdCddfSk7XG4gIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAzLCBjb250ZW50OiBjaGFsay5ib2xkKCdMSU5LRUQgUEFDS0FHRVMgSU4gUFJPSkVDVFxcbicpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBwbWdyLmdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5lbnRyaWVzKCkpIHtcbiAgICB0YWJsZS5wdXNoKFt7XG4gICAgICBjb2xTcGFuOiAzLCBoQWxpZ246ICdsZWZ0JyxcbiAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ1Byb2plY3Q6ICcpICsgKHByaiA/IGNoYWxrLmN5YW4ocHJqKSA6IGNoYWxrLmN5YW4oJyhyb290IGRpcmVjdG9yeSknKSl9XG4gICAgXSxcbiAgICAgIFsnUGFja2FnZSBuYW1lJywgJ3ZlcnNpb24nLCAnUGF0aCddLFxuICAgICAgWyctLS0tLS0tLS0tLS0nLCAnLS0tLS0tLScsICctLS0tJ11cbiAgICApO1xuICAgIGNvbnN0IHBrZ3MgPSBwa2dOYW1lcy5tYXAobmFtZSA9PiBsaW5rZWRQa2dzLmdldChuYW1lKSEpO1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtncykge1xuICAgICAgdGFibGUucHVzaChbXG4gICAgICAgIGNoYWxrLmN5YW4ocGsubmFtZSksXG4gICAgICAgIGNoYWxrLmdyZWVuKHBrLmpzb24udmVyc2lvbiksXG4gICAgICAgIFBhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhYmxlLnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIGpzb25PZkxpbmtlZFBhY2thZ2VGb3JQcm9qZWN0cygpIHtcbiAgY29uc3QgYWxsOiB7W3Byajogc3RyaW5nXToge1trZXk6IHN0cmluZ106IHN0cmluZ319ID0ge307XG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBwa01nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBwa01nci5nZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgY29uc3QgZGVwOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IGFsbFtwcmpdID0ge307XG4gICAgZm9yIChjb25zdCBwa05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgIGRlcFtwa05hbWVdID0gbGlua2VkUGtncy5nZXQocGtOYW1lKT8uanNvbi52ZXJzaW9uO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWxsO1xufVxuXG5pbnRlcmZhY2UgU2VydmVyUGFja2FnZVZpZXcge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByaW9yaXR5OiBzdHJpbmc7XG4gIGRpcjogc3RyaW5nO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0U2VydmVyUGFja2FnZXMoKTogUHJvbWlzZTxTZXJ2ZXJQYWNrYWdlVmlld1tdPiB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHBrTWdyLndvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgd3NLZXkgPSBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSA/IHdzS2V5IDogcGtNZ3IuZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHJldHVybiBbXSBhcyBTZXJ2ZXJQYWNrYWdlVmlld1tdO1xuICB9XG5cbiAgY29uc3QgcGtncyA9IEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCB0cnVlKSlcbiAgLmZpbHRlcihpc1NlcnZlclBhY2thZ2UpXG4gIC5tYXAocGtnID0+ICh7XG4gICAgbmFtZTogcGtnLm5hbWUsXG4gICAgcHJpb3JpdHk6IHJlYWRQcmlvcml0eVByb3BlcnR5KHBrZy5qc29uKVxuICB9KSk7XG5cbiAgY29uc3QgbGlzdDogQXJyYXk8W3N0cmluZywgc3RyaW5nIHwgbnVtYmVyXT4gPSBbXTtcblxuICBhd2FpdCBwcmlvcml0eUhlbHBlci5vcmRlclBhY2thZ2VzKHBrZ3MsIHBrID0+IHtcbiAgICBsaXN0LnB1c2goW3BrLm5hbWUsIHBrLnByaW9yaXR5XSk7XG4gIH0pO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gIHJldHVybiBsaXN0Lm1hcCgoW25hbWUsIHByaV0pID0+IHtcbiAgICBjb25zdCBwa2cgPSBwa01nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSB8fCB3b3Jrc3BhY2UuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpITtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHByaW9yaXR5OiBwcmkgKyAnJyxcbiAgICAgIGRpcjogcGtnLnJlYWxQYXRoXG4gICAgfTtcbiAgfSk7XG59XG4iXX0=