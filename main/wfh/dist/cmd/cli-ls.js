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
exports.checkDir = void 0;
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
        console.log(listPackagesByProjects());
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
function listPackagesByProjects() {
    const cwd = process.cwd();
    const pmgr = require('../package-mgr');
    const linkedPkgs = pmgr.getState().srcPackages;
    const table = (0, misc_1.createCliTable)({ horizontalLines: false, colAligns: ['right', 'left', 'left'] });
    table.push([{ colSpan: 3, content: chalk_1.default.bold('LINKED PACKAGES IN PROJECT\n'), hAlign: 'center' }]);
    for (const [prj, pkgNames] of pmgr.getState().project2Packages.entries()) {
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
    for (const [prj, pkgNames] of pmgr.getState().srcDir2Packages.entries()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLHVEQUErQjtBQUUvQixzREFBd0M7QUFDeEMsNENBQTRDO0FBQzVDLDRFQUF5RTtBQUN6RSxrREFBMEI7QUFDMUIsZ0RBQXdCO0FBRXhCLHlDQUFzRTtBQUN0RSw4Q0FBcUU7QUFDckUsd0NBQXVEO0FBQ3ZELDJFQUE2RDtBQUM3RCxzREFBd0U7QUFDeEUsb0NBQThEO0FBRS9DLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBb0Q7SUFDckYsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO1FBQ2IsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzFELElBQUEsb0NBQXlCLEVBQUMsT0FBTyxDQUFDLENBQUM7U0FDcEM7S0FDRjtJQUNELElBQUksR0FBRyxDQUFDLElBQUk7UUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzs7UUFFMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7SUFFeEMsTUFBTSxLQUFLLEdBQUcsSUFBQSxxQkFBYyxFQUFDLEVBQUMsZUFBZSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7SUFDdkQsS0FBSyxDQUFDLElBQUksQ0FDUixDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxlQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUMsQ0FBQyxFQUN4RSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMs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QyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7SUFDMUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRTtRQUM5QixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsbUJBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO1FBQ2hHLE9BQU87WUFDTCxJQUFJO1lBQ0osUUFBUSxFQUFFLEdBQUcsR0FBRyxFQUFFO1lBQ2xCLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUTtTQUNsQixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbi8vIGltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3ByaW50V29ya3NwYWNlcywgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwc30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQge3Rha2UsIG1hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIHNraXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGUsIHBsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIHByaW9yaXR5SGVscGVyIGZyb20gJy4uL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCB7aXNTZXJ2ZXJQYWNrYWdlLCByZWFkUHJpb3JpdHlQcm9wZXJ0eX0gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtkaXNwYXRjaGVyIGFzIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXJ9IGZyb20gJy4uL3N0b3JlJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gbGlzdChvcHQ6IEdsb2JhbE9wdGlvbnMgJiB7anNvbjogYm9vbGVhbjsgaG9pc3Q6IGJvb2xlYW59KSB7XG4gIGlmIChvcHQuaG9pc3QpIHtcbiAgICBmb3IgKGNvbnN0IHdzU3RhdGUgb2YgcGtNZ3IuZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLnZhbHVlcygpKSB7XG4gICAgICBwcmludFdvcmtzcGFjZUhvaXN0ZWREZXBzKHdzU3RhdGUpO1xuICAgIH1cbiAgfVxuICBpZiAob3B0Lmpzb24pXG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoanNvbk9mTGlua2VkUGFja2FnZUZvclByb2plY3RzKCksIG51bGwsICcgICcpKTtcbiAgZWxzZVxuICAgIGNvbnNvbGUubG9nKGxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSk7XG5cbiAgY29uc3QgdGFibGUgPSBjcmVhdGVDbGlUYWJsZSh7aG9yaXpvbnRhbExpbmVzOiBmYWxzZX0pO1xuICB0YWJsZS5wdXNoKFxuICAgIFt7Y29sU3BhbjogMywgaEFsaWduOiAnY2VudGVyJywgY29udGVudDogY2hhbGsuYm9sZCgnU0VSVkVSIFBBQ0tBR0VTJyl9XSxcbiAgICBbJ1BBQ0tBR0UnLCAnUFJJT1JJVFknLCAnRElSRUNUT1JZJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgWyctLS0tLS0nLCAnLS0tLS0tLScsICctLS0tLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpXG4gICk7XG5cbiAgY29uc3QgbGlzdDogU2VydmVyUGFja2FnZVZpZXdbXSA9IGF3YWl0IGxpc3RTZXJ2ZXJQYWNrYWdlcygpO1xuICBsaXN0LmZvckVhY2gocm93ID0+IHRhYmxlLnB1c2goW1xuICAgIHJvdy5uYW1lLFxuICAgIHJvdy5wcmlvcml0eSxcbiAgICBjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIHJvdy5kaXIpKVxuICBdKSk7XG4gIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICBwcmludFdvcmtzcGFjZXMoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrRGlyKG9wdDogR2xvYmFsT3B0aW9ucykge1xuICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnc2F2ZScpO1xuICBwa01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBza2lwKDEpLCB0YWtlKDEpLFxuICAgIG1hcCgoY3VycikgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ0RpcmVjdG9yeSBzdGF0ZSBpcyB1cGRhdGVkLicpO1xuICAgICAgcmV0dXJuIGN1cnI7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgcGtNZ3IuYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVEaXIoKTtcbn1cblxuZnVuY3Rpb24gbGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpIHtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgcG1ncjogdHlwZW9mIHBrTWdyID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKTtcbiAgY29uc3QgbGlua2VkUGtncyA9IHBtZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcblxuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlLCBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCcsICdsZWZ0J119KTtcbiAgdGFibGUucHVzaChbe2NvbFNwYW46IDMsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0xJTktFRCBQQUNLQUdFUyBJTiBQUk9KRUNUXFxuJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHBtZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDMsIGhBbGlnbjogJ2xlZnQnLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZCgnUHJvamVjdDogJykgKyAocHJqID8gY2hhbGsuY3lhbihwcmopIDogY2hhbGsuY3lhbignKHJvb3QgZGlyZWN0b3J5KScpKX1cbiAgICBdLFxuICAgICAgWydQQUNLQUdFIE5BTUUnLCAnVkVSU0lPTicsICdQQVRIJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgICBbJy0tLS0tLS0tLS0tLScsICctLS0tLS0tJywgJy0tLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKVxuICAgICk7XG4gICAgY29uc3QgcGtncyA9IHBrZ05hbWVzLm1hcChuYW1lID0+IGxpbmtlZFBrZ3MuZ2V0KG5hbWUpISk7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgICB0YWJsZS5wdXNoKFtcbiAgICAgICAgY2hhbGsuY3lhbihway5uYW1lKSxcbiAgICAgICAgY2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKSxcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKV0pO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBwbWdyLmdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDMsIGhBbGlnbjogJ2xlZnQnLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZCgnU291cmNlIGRpcmVjdG9yeTogJykgKyAocHJqID8gY2hhbGsuY3lhbihwcmopIDogY2hhbGsuY3lhbignKHJvb3QgZGlyZWN0b3J5KScpKX1cbiAgICBdLFxuICAgICAgWydQQUNLQUdFIE5BTUUnLCAnVkVSU0lPTicsICdQQVRIJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSksXG4gICAgICBbJy0tLS0tLS0tLS0tLScsICctLS0tLS0tJywgJy0tLS0nXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKVxuICAgICk7XG4gICAgY29uc3QgcGtncyA9IHBrZ05hbWVzLm1hcChuYW1lID0+IGxpbmtlZFBrZ3MuZ2V0KG5hbWUpISk7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgICB0YWJsZS5wdXNoKFtcbiAgICAgICAgY2hhbGsuY3lhbihway5uYW1lKSxcbiAgICAgICAgY2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKSxcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGFibGUudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24ganNvbk9mTGlua2VkUGFja2FnZUZvclByb2plY3RzKCkge1xuICBjb25zdCBhbGw6IHtbcHJqOiBzdHJpbmddOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfX0gPSB7fTtcbiAgY29uc3QgbGlua2VkUGtncyA9IHBrTWdyLmdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHBrTWdyLmdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCBkZXA6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0gYWxsW3Byal0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHBrTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgY29uc3QgcGtnID0gbGlua2VkUGtncy5nZXQocGtOYW1lKTtcbiAgICAgIGlmIChwa2cpXG4gICAgICAgIGRlcFtwa05hbWVdID0gcGtnLmpzb24udmVyc2lvbjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFsbDtcbn1cblxuaW50ZXJmYWNlIFNlcnZlclBhY2thZ2VWaWV3IHtcbiAgbmFtZTogc3RyaW5nO1xuICBwcmlvcml0eTogc3RyaW5nO1xuICBkaXI6IHN0cmluZztcbn1cblxuYXN5bmMgZnVuY3Rpb24gbGlzdFNlcnZlclBhY2thZ2VzKCk6IFByb21pc2U8U2VydmVyUGFja2FnZVZpZXdbXT4ge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSBwa01nci53b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0Rpcik7XG4gIHdzS2V5ID0gcGtNZ3IuZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkgPyB3c0tleSA6IHBrTWdyLmdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICByZXR1cm4gW10gYXMgU2VydmVyUGFja2FnZVZpZXdbXTtcbiAgfVxuXG4gIGNvbnN0IHBrZ3MgPSBBcnJheS5mcm9tKHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgdHJ1ZSkpXG4gIC5maWx0ZXIoaXNTZXJ2ZXJQYWNrYWdlKVxuICAubWFwKHBrZyA9PiAoe1xuICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgIHByaW9yaXR5OiByZWFkUHJpb3JpdHlQcm9wZXJ0eShwa2cuanNvbilcbiAgfSkpO1xuXG4gIGNvbnN0IGxpc3Q6IEFycmF5PFtzdHJpbmcsIHN0cmluZyB8IG51bWJlcl0+ID0gW107XG5cbiAgYXdhaXQgcHJpb3JpdHlIZWxwZXIub3JkZXJQYWNrYWdlcyhwa2dzLCBwayA9PiB7XG4gICAgbGlzdC5wdXNoKFtway5uYW1lLCBway5wcmlvcml0eV0pO1xuICB9KTtcbiAgY29uc3Qgd29ya3NwYWNlID0gcGtNZ3IuZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSkhO1xuICByZXR1cm4gbGlzdC5tYXAoKFtuYW1lLCBwcmldKSA9PiB7XG4gICAgY29uc3QgcGtnID0gcGtNZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkgfHwgd29ya3NwYWNlLmluc3RhbGxlZENvbXBvbmVudHMhLmdldChuYW1lKSE7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBwcmlvcml0eTogcHJpICsgJycsXG4gICAgICBkaXI6IHBrZy5yZWFsUGF0aFxuICAgIH07XG4gIH0pO1xufVxuIl19