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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPackagesByProjects = exports.checkDir = void 0;
/* eslint-disable no-console */
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
const store_1 = require("../store");
async function list(opt) {
    if (opt.hoist) {
        for (const wsState of pkMgr.getState().workspaces.values()) {
            (0, cli_init_1.printWorkspaceHoistedDeps)(wsState);
        }
    }
    if (opt.json)
        console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
    else
        console.log(listPackagesByProjects(require('../package-mgr').getState()));
    const table = (0, misc_1.createCliTable)({ horizontalLines: false });
    table.push([{ colSpan: 3, hAlign: 'center', content: chalk_1.default.bold('SERVER PACKAGES') }], ['PACKAGE', 'PRIORITY', 'DIRECTORY'].map(item => chalk_1.default.gray(item)), ['------', '-------', '--------'].map(item => chalk_1.default.gray(item)));
    const list = await listServerPackages();
    list.forEach(row => table.push([
        row.name,
        row.priority,
        chalk_1.default.cyan(path_1.default.relative((0, config_1.default)().rootPath, row.dir))
    ]));
    console.log(table.toString());
    (0, cli_init_1.printWorkspaces)();
}
exports.default = list;
function checkDir(opt) {
    store_1.dispatcher.changeActionOnExit('save');
    pkMgr.getStore().pipe((0, operators_1.map)(s => s.packagesUpdateChecksum), (0, operators_1.distinctUntilChanged)(), (0, operators_1.skip)(1), (0, operators_1.take)(1), (0, operators_1.map)((curr) => {
        console.log('Directory state is updated.');
        return curr;
    })).subscribe();
    pkMgr.actionDispatcher.updateDir();
}
exports.checkDir = checkDir;
function listPackagesByProjects(state) {
    const cwd = process.cwd();
    const linkedPkgs = state.srcPackages;
    const table = (0, misc_1.createCliTable)({ horizontalLines: false, colAligns: ['right', 'left', 'left'] });
    table.push([{ colSpan: 3, content: chalk_1.default.bold('LINKED PACKAGES IN PROJECT\n'), hAlign: 'center' }]);
    for (const [prj, pkgNames] of state.project2Packages.entries()) {
        table.push([{
                colSpan: 3, hAlign: 'left',
                content: chalk_1.default.bold('Project: ') + (prj ? chalk_1.default.cyan(prj) : chalk_1.default.cyan('(root directory)'))
            }
        ], ['PACKAGE NAME', 'VERSION', 'PATH'].map(item => chalk_1.default.gray(item)), ['------------', '-------', '----'].map(item => chalk_1.default.gray(item)));
        const pkgs = pkgNames.map(name => linkedPkgs.get(name));
        for (const pk of pkgs) {
            table.push([
                chalk_1.default.cyan(pk.name),
                chalk_1.default.green(pk.json.version),
                path_1.default.relative(cwd, pk.realPath)
            ]);
        }
    }
    for (const [prj, pkgNames] of state.srcDir2Packages.entries()) {
        table.push([{
                colSpan: 3, hAlign: 'left',
                content: chalk_1.default.bold('Source directory: ') + (prj ? chalk_1.default.cyan(prj) : chalk_1.default.cyan('(root directory)'))
            }
        ], ['PACKAGE NAME', 'VERSION', 'PATH'].map(item => chalk_1.default.gray(item)), ['------------', '-------', '----'].map(item => chalk_1.default.gray(item)));
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
exports.listPackagesByProjects = listPackagesByProjects;
function jsonOfLinkedPackageForProjects() {
    const all = {};
    const linkedPkgs = pkMgr.getState().srcPackages;
    for (const [prj, pkgNames] of pkMgr.getState().project2Packages.entries()) {
        const dep = all[prj] = {};
        for (const pkName of pkgNames) {
            const pkg = linkedPkgs.get(pkName);
            if (pkg)
                dep[pkName] = pkg.json.version;
        }
    }
    return all;
}
async function listServerPackages() {
    let wsKey = pkMgr.workspaceKey(misc_1.plinkEnv.workDir);
    wsKey = pkMgr.getState().workspaces.has(wsKey) ? wsKey : pkMgr.getState().currWorkspace;
    if (wsKey == null) {
        return [];
    }
    const pkgs = Array.from((0, package_list_helper_1.packages4WorkspaceKey)(wsKey, true))
        .filter(package_runner_1.isServerPackage)
        .map(pkg => ({
        name: pkg.name,
        priority: (0, package_runner_1.readPriorityProperty)(pkg.json)
    }));
    const list = [];
    await priorityHelper.orderPackages(pkgs, pk => {
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLHVEQUErQjtBQUUvQixzREFBd0M7QUFDeEMsNENBQTRDO0FBQzVDLDRFQUF5RTtBQUN6RSxrREFBMEI7QUFDMUIsZ0RBQXdCO0FBRXhCLHlDQUFzRTtBQUN0RSw4Q0FBcUU7QUFDckUsd0NBQXVEO0FBQ3ZELDJFQUE2RDtBQUM3RCxzREFBd0U7QUFDeEUsb0NBQThEO0FBRS9DLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBb0Q7SUFDckYsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO1FBQ2IsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzFELElBQUEsb0NBQXlCLEVBQUMsT0FBTyxDQUFDLENBQUM7U0FDcEM7S0FDRjtJQUNELElBQUksR0FBRyxDQUFDLElBQUk7UUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzs7UUFFMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBRSxPQUFPLENBQUMsZ0JBQWdCLENBQWtCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRTlGLE1BQU0sS0FBSyxHQUFHLElBQUEscUJBQWMsRUFBQyxFQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0lBQ3ZELEtBQUssQ0FBQyxJQUFJLENBQ1IsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFDLENBQUMsRUFD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QyxDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO0lBQzFELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUU7UUFDOUIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLG1CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUNoRyxPQUFPO1lBQ0wsSUFBSTtZQUNKLFFBQVEsRUFBRSxHQUFHLEdBQUcsRUFBRTtZQUNsQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVE7U0FDbEIsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG4vLyBpbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtwcmludFdvcmtzcGFjZXMsIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHN9IGZyb20gJy4vY2xpLWluaXQnO1xuaW1wb3J0IHt0YWtlLCBtYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBza2lwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2NyZWF0ZUNsaVRhYmxlLCBwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBwcmlvcml0eUhlbHBlciBmcm9tICcuLi9wYWNrYWdlLXByaW9yaXR5LWhlbHBlcic7XG5pbXBvcnQge2lzU2VydmVyUGFja2FnZSwgcmVhZFByaW9yaXR5UHJvcGVydHl9IGZyb20gJy4uL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7ZGlzcGF0Y2hlciBhcyBzdG9yZVNldHRpbmdEaXNwYXRjaGVyfSBmcm9tICcuLi9zdG9yZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGxpc3Qob3B0OiBHbG9iYWxPcHRpb25zICYge2pzb246IGJvb2xlYW47IGhvaXN0OiBib29sZWFufSkge1xuICBpZiAob3B0LmhvaXN0KSB7XG4gICAgZm9yIChjb25zdCB3c1N0YXRlIG9mIHBrTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy52YWx1ZXMoKSkge1xuICAgICAgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwcyh3c1N0YXRlKTtcbiAgICB9XG4gIH1cbiAgaWYgKG9wdC5qc29uKVxuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGpzb25PZkxpbmtlZFBhY2thZ2VGb3JQcm9qZWN0cygpLCBudWxsLCAnICAnKSk7XG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhsaXN0UGFja2FnZXNCeVByb2plY3RzKChyZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa01ncikuZ2V0U3RhdGUoKSkpO1xuXG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgdGFibGUucHVzaChcbiAgICBbe2NvbFNwYW46IDMsIGhBbGlnbjogJ2NlbnRlcicsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ1NFUlZFUiBQQUNLQUdFUycpfV0sXG4gICAgWydQQUNLQUdFJywgJ1BSSU9SSVRZJywgJ0RJUkVDVE9SWSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuICAgIFsnLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLS0tLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKVxuICApO1xuXG4gIGNvbnN0IGxpc3Q6IFNlcnZlclBhY2thZ2VWaWV3W10gPSBhd2FpdCBsaXN0U2VydmVyUGFja2FnZXMoKTtcbiAgbGlzdC5mb3JFYWNoKHJvdyA9PiB0YWJsZS5wdXNoKFtcbiAgICByb3cubmFtZSxcbiAgICByb3cucHJpb3JpdHksXG4gICAgY2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLCByb3cuZGlyKSlcbiAgXSkpO1xuICBjb25zb2xlLmxvZyh0YWJsZS50b1N0cmluZygpKTtcbiAgcHJpbnRXb3Jrc3BhY2VzKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0RpcihvcHQ6IEdsb2JhbE9wdGlvbnMpIHtcbiAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgcGtNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucGFja2FnZXNVcGRhdGVDaGVja3N1bSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICBtYXAoKGN1cnIpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdEaXJlY3Rvcnkgc3RhdGUgaXMgdXBkYXRlZC4nKTtcbiAgICAgIHJldHVybiBjdXJyO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIHBrTWdyLmFjdGlvbkRpc3BhdGNoZXIudXBkYXRlRGlyKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKHN0YXRlOiBwa01nci5QYWNrYWdlc1N0YXRlKSB7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBzdGF0ZS5zcmNQYWNrYWdlcztcblxuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlLCBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCcsICdsZWZ0J119KTtcbiAgdGFibGUucHVzaChbe2NvbFNwYW46IDMsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0xJTktFRCBQQUNLQUdFUyBJTiBQUk9KRUNUXFxuJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHN0YXRlLnByb2plY3QyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMywgaEFsaWduOiAnbGVmdCcsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKCdQcm9qZWN0OiAnKSArIChwcmogPyBjaGFsay5jeWFuKHByaikgOiBjaGFsay5jeWFuKCcocm9vdCBkaXJlY3RvcnkpJykpfVxuICAgIF0sXG4gICAgICBbJ1BBQ0tBR0UgTkFNRScsICdWRVJTSU9OJywgJ1BBVEgnXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpXG4gICAgKTtcbiAgICBjb25zdCBwa2dzID0gcGtnTmFtZXMubWFwKG5hbWUgPT4gbGlua2VkUGtncy5nZXQobmFtZSkhKTtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICAgIHRhYmxlLnB1c2goW1xuICAgICAgICBjaGFsay5jeWFuKHBrLm5hbWUpLFxuICAgICAgICBjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pLFxuICAgICAgICBQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpXSk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHN0YXRlLnNyY0RpcjJQYWNrYWdlcy5lbnRyaWVzKCkpIHtcbiAgICB0YWJsZS5wdXNoKFt7XG4gICAgICBjb2xTcGFuOiAzLCBoQWxpZ246ICdsZWZ0JyxcbiAgICAgIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ1NvdXJjZSBkaXJlY3Rvcnk6ICcpICsgKHByaiA/IGNoYWxrLmN5YW4ocHJqKSA6IGNoYWxrLmN5YW4oJyhyb290IGRpcmVjdG9yeSknKSl9XG4gICAgXSxcbiAgICAgIFsnUEFDS0FHRSBOQU1FJywgJ1ZFUlNJT04nLCAnUEFUSCddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpLFxuICAgICAgWyctLS0tLS0tLS0tLS0nLCAnLS0tLS0tLScsICctLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSlcbiAgICApO1xuICAgIGNvbnN0IHBrZ3MgPSBwa2dOYW1lcy5tYXAobmFtZSA9PiBsaW5rZWRQa2dzLmdldChuYW1lKSEpO1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtncykge1xuICAgICAgdGFibGUucHVzaChbXG4gICAgICAgIGNoYWxrLmN5YW4ocGsubmFtZSksXG4gICAgICAgIGNoYWxrLmdyZWVuKHBrLmpzb24udmVyc2lvbiksXG4gICAgICAgIFBhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhYmxlLnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIGpzb25PZkxpbmtlZFBhY2thZ2VGb3JQcm9qZWN0cygpIHtcbiAgY29uc3QgYWxsOiB7W3Byajogc3RyaW5nXToge1trZXk6IHN0cmluZ106IHN0cmluZ319ID0ge307XG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBwa01nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBwa01nci5nZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgY29uc3QgZGVwOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IGFsbFtwcmpdID0ge307XG4gICAgZm9yIChjb25zdCBwa05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgIGNvbnN0IHBrZyA9IGxpbmtlZFBrZ3MuZ2V0KHBrTmFtZSk7XG4gICAgICBpZiAocGtnKVxuICAgICAgICBkZXBbcGtOYW1lXSA9IHBrZy5qc29uLnZlcnNpb247XG4gICAgfVxuICB9XG4gIHJldHVybiBhbGw7XG59XG5cbmludGVyZmFjZSBTZXJ2ZXJQYWNrYWdlVmlldyB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHJpb3JpdHk6IHN0cmluZztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RTZXJ2ZXJQYWNrYWdlcygpOiBQcm9taXNlPFNlcnZlclBhY2thZ2VWaWV3W10+IHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gcGtNZ3Iud29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICB3c0tleSA9IHBrTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpID8gd3NLZXkgOiBwa01nci5nZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdIGFzIFNlcnZlclBhY2thZ2VWaWV3W107XG4gIH1cblxuICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIHRydWUpKVxuICAuZmlsdGVyKGlzU2VydmVyUGFja2FnZSlcbiAgLm1hcChwa2cgPT4gKHtcbiAgICBuYW1lOiBwa2cubmFtZSxcbiAgICBwcmlvcml0eTogcmVhZFByaW9yaXR5UHJvcGVydHkocGtnLmpzb24pXG4gIH0pKTtcblxuICBjb25zdCBsaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmcgfCBudW1iZXJdPiA9IFtdO1xuXG4gIGF3YWl0IHByaW9yaXR5SGVscGVyLm9yZGVyUGFja2FnZXMocGtncywgcGsgPT4ge1xuICAgIGxpc3QucHVzaChbcGsubmFtZSwgcGsucHJpb3JpdHldKTtcbiAgfSk7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IHBrTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpITtcbiAgcmV0dXJuIGxpc3QubWFwKChbbmFtZSwgcHJpXSkgPT4ge1xuICAgIGNvbnN0IHBrZyA9IHBrTWdyLmdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpIHx8IHdvcmtzcGFjZS5pbnN0YWxsZWRDb21wb25lbnRzIS5nZXQobmFtZSkhO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgcHJpb3JpdHk6IHByaSArICcnLFxuICAgICAgZGlyOiBwa2cucmVhbFBhdGhcbiAgICB9O1xuICB9KTtcbn1cbiJdfQ==