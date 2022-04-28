"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQix1REFBK0I7QUFFL0Isc0RBQXdDO0FBQ3hDLDRDQUE0QztBQUM1Qyw0RUFBeUU7QUFDekUsa0RBQTBCO0FBQzFCLGdEQUF3QjtBQUV4Qix5Q0FBc0U7QUFDdEUsOENBQXFFO0FBQ3JFLHdDQUF1RDtBQUN2RCwyRUFBNkQ7QUFDN0Qsc0RBQXdFO0FBQ3hFLG9DQUE4RDtBQUUvQyxLQUFLLFVBQVUsSUFBSSxDQUFDLEdBQW9EO0lBQ3JGLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtRQUNiLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMxRCxJQUFBLG9DQUF5QixFQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3BDO0tBQ0Y7SUFDRCxJQUFJLEdBQUcsQ0FBQyxJQUFJO1FBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7O1FBRTFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUUsT0FBTyxDQUFDLGdCQUFnQixDQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUU5RixNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFjLEVBQUMsRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztJQUN2RCxLQUFLLENBQUMsSUFBSSxDQUNSLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBQyxDQUFD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SUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUsQ0FBQztJQUMxRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFO1FBQzlCLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxtQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7UUFDaEcsT0FBTztZQUNMLElBQUk7WUFDSixRQUFRLEVBQUUsR0FBRyxHQUFHLEVBQUU7WUFDbEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRO1NBQ2xCLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgcGtNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7cHJpbnRXb3Jrc3BhY2VzLCBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzfSBmcm9tICcuL2NsaS1pbml0JztcbmltcG9ydCB7dGFrZSwgbWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgc2tpcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtjcmVhdGVDbGlUYWJsZSwgcGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0ICogYXMgcHJpb3JpdHlIZWxwZXIgZnJvbSAnLi4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IHtpc1NlcnZlclBhY2thZ2UsIHJlYWRQcmlvcml0eVByb3BlcnR5fSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge2Rpc3BhdGNoZXIgYXMgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcn0gZnJvbSAnLi4vc3RvcmUnO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBsaXN0KG9wdDogR2xvYmFsT3B0aW9ucyAmIHtqc29uOiBib29sZWFuOyBob2lzdDogYm9vbGVhbn0pIHtcbiAgaWYgKG9wdC5ob2lzdCkge1xuICAgIGZvciAoY29uc3Qgd3NTdGF0ZSBvZiBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMod3NTdGF0ZSk7XG4gICAgfVxuICB9XG4gIGlmIChvcHQuanNvbilcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSwgbnVsbCwgJyAgJykpO1xuICBlbHNlXG4gICAgY29uc29sZS5sb2cobGlzdFBhY2thZ2VzQnlQcm9qZWN0cygocmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtNZ3IpLmdldFN0YXRlKCkpKTtcblxuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gIHRhYmxlLnB1c2goXG4gICAgW3tjb2xTcGFuOiAzLCBoQWxpZ246ICdjZW50ZXInLCBjb250ZW50OiBjaGFsay5ib2xkKCdTRVJWRVIgUEFDS0FHRVMnKX1dLFxuICAgIFsnUEFDS0FHRScsICdQUklPUklUWScsICdESVJFQ1RPUlknXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICBbJy0tLS0tLScsICctLS0tLS0tJywgJy0tLS0tLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSlcbiAgKTtcblxuICBjb25zdCBsaXN0OiBTZXJ2ZXJQYWNrYWdlVmlld1tdID0gYXdhaXQgbGlzdFNlcnZlclBhY2thZ2VzKCk7XG4gIGxpc3QuZm9yRWFjaChyb3cgPT4gdGFibGUucHVzaChbXG4gICAgcm93Lm5hbWUsXG4gICAgcm93LnByaW9yaXR5LFxuICAgIGNoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcm93LmRpcikpXG4gIF0pKTtcbiAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIHByaW50V29ya3NwYWNlcygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tEaXIob3B0OiBHbG9iYWxPcHRpb25zKSB7XG4gIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdzYXZlJyk7XG4gIHBrTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0pLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgbWFwKChjdXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnRGlyZWN0b3J5IHN0YXRlIGlzIHVwZGF0ZWQuJyk7XG4gICAgICByZXR1cm4gY3VycjtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBwa01nci5hY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZURpcigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFBhY2thZ2VzQnlQcm9qZWN0cyhzdGF0ZTogcGtNZ3IuUGFja2FnZXNTdGF0ZSkge1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBsaW5rZWRQa2dzID0gc3RhdGUuc3JjUGFja2FnZXM7XG5cbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZSwgY29sQWxpZ25zOiBbJ3JpZ2h0JywgJ2xlZnQnLCAnbGVmdCddfSk7XG4gIHRhYmxlLnB1c2goW3tjb2xTcGFuOiAzLCBjb250ZW50OiBjaGFsay5ib2xkKCdMSU5LRUQgUEFDS0FHRVMgSU4gUFJPSkVDVFxcbicpLCBoQWxpZ246ICdjZW50ZXInfV0pO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBzdGF0ZS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDMsIGhBbGlnbjogJ2xlZnQnLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZCgnUHJvamVjdDogJykgKyAocHJqID8gY2hhbGsuY3lhbihwcmopIDogY2hhbGsuY3lhbignKHJvb3QgZGlyZWN0b3J5KScpKX1cbiAgICBdLFxuICAgICAgWydQQUNLQUdFIE5BTUUnLCAnVkVSU0lPTicsICdQQVRIJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgICBbJy0tLS0tLS0tLS0tLScsICctLS0tLS0tJywgJy0tLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKVxuICAgICk7XG4gICAgY29uc3QgcGtncyA9IHBrZ05hbWVzLm1hcChuYW1lID0+IGxpbmtlZFBrZ3MuZ2V0KG5hbWUpISk7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgICB0YWJsZS5wdXNoKFtcbiAgICAgICAgY2hhbGsuY3lhbihway5uYW1lKSxcbiAgICAgICAgY2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKSxcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKV0pO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBzdGF0ZS5zcmNEaXIyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMywgaEFsaWduOiAnbGVmdCcsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKCdTb3VyY2UgZGlyZWN0b3J5OiAnKSArIChwcmogPyBjaGFsay5jeWFuKHByaikgOiBjaGFsay5jeWFuKCcocm9vdCBkaXJlY3RvcnkpJykpfVxuICAgIF0sXG4gICAgICBbJ1BBQ0tBR0UgTkFNRScsICdWRVJTSU9OJywgJ1BBVEgnXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpXG4gICAgKTtcbiAgICBjb25zdCBwa2dzID0gcGtnTmFtZXMubWFwKG5hbWUgPT4gbGlua2VkUGtncy5nZXQobmFtZSkhKTtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICAgIHRhYmxlLnB1c2goW1xuICAgICAgICBjaGFsay5jeWFuKHBrLm5hbWUpLFxuICAgICAgICBjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pLFxuICAgICAgICBQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0YWJsZS50b1N0cmluZygpO1xufVxuXG5mdW5jdGlvbiBqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSB7XG4gIGNvbnN0IGFsbDoge1twcmo6IHN0cmluZ106IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9fSA9IHt9O1xuICBjb25zdCBsaW5rZWRQa2dzID0gcGtNZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgcGtNZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGRlcDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBhbGxbcHJqXSA9IHt9O1xuICAgIGZvciAoY29uc3QgcGtOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICBjb25zdCBwa2cgPSBsaW5rZWRQa2dzLmdldChwa05hbWUpO1xuICAgICAgaWYgKHBrZylcbiAgICAgICAgZGVwW3BrTmFtZV0gPSBwa2cuanNvbi52ZXJzaW9uO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWxsO1xufVxuXG5pbnRlcmZhY2UgU2VydmVyUGFja2FnZVZpZXcge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByaW9yaXR5OiBzdHJpbmc7XG4gIGRpcjogc3RyaW5nO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0U2VydmVyUGFja2FnZXMoKTogUHJvbWlzZTxTZXJ2ZXJQYWNrYWdlVmlld1tdPiB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHBrTWdyLndvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgd3NLZXkgPSBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSA/IHdzS2V5IDogcGtNZ3IuZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHJldHVybiBbXSBhcyBTZXJ2ZXJQYWNrYWdlVmlld1tdO1xuICB9XG5cbiAgY29uc3QgcGtncyA9IEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCB0cnVlKSlcbiAgLmZpbHRlcihpc1NlcnZlclBhY2thZ2UpXG4gIC5tYXAocGtnID0+ICh7XG4gICAgbmFtZTogcGtnLm5hbWUsXG4gICAgcHJpb3JpdHk6IHJlYWRQcmlvcml0eVByb3BlcnR5KHBrZy5qc29uKVxuICB9KSk7XG5cbiAgY29uc3QgbGlzdDogQXJyYXk8W3N0cmluZywgc3RyaW5nIHwgbnVtYmVyXT4gPSBbXTtcblxuICBhd2FpdCBwcmlvcml0eUhlbHBlci5vcmRlclBhY2thZ2VzKHBrZ3MsIHBrID0+IHtcbiAgICBsaXN0LnB1c2goW3BrLm5hbWUsIHBrLnByaW9yaXR5XSk7XG4gIH0pO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gIHJldHVybiBsaXN0Lm1hcCgoW25hbWUsIHByaV0pID0+IHtcbiAgICBjb25zdCBwa2cgPSBwa01nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSB8fCB3b3Jrc3BhY2UuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpITtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHByaW9yaXR5OiBwcmkgKyAnJyxcbiAgICAgIGRpcjogcGtnLnJlYWxQYXRoXG4gICAgfTtcbiAgfSk7XG59XG4iXX0=