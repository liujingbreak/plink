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
        yield config_1.default.init(opt);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUUvQixzREFBd0M7QUFDeEMsNENBQTRDO0FBQzVDLDRFQUF5RTtBQUN6RSxrREFBMEI7QUFDMUIsZ0RBQXdCO0FBRXhCLHlDQUEwRTtBQUMxRSw4Q0FBcUU7QUFDckUsd0NBQTZDO0FBQzdDLDJFQUE2RDtBQUM3RCxzREFBd0U7QUFFeEUsU0FBOEIsSUFBSSxDQUFDLEdBQW9DOztRQUNyRSxJQUFJLEdBQUcsQ0FBQyxJQUFJO1lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7O1lBRTFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sS0FBSyxHQUFHLHFCQUFjLENBQUMsRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUN2RCxLQUFLLENBQUMsSUFBSSxDQUNSLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGVBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBQyxDQUFDLEVBQzFFLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxVQUFVLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUM1RCxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUVyQyxNQUFNLElBQUksR0FBd0IsTUFBTSxrQkFBa0IsRUFBRSxDQUFDO1FBQzdELElBQUksQ0FBQyxPQUFPLENBQUMs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b25zb2xlXG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgcGtNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7cHJpbnRXb3Jrc3BhY2VzLyosIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMqL30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQge3Rha2UsIG1hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIHNraXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0ICogYXMgcHJpb3JpdHlIZWxwZXIgZnJvbSAnLi4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IHtpc1NlcnZlclBhY2thZ2UsIHJlYWRQcmlvcml0eVByb3BlcnR5fSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGxpc3Qob3B0OiBHbG9iYWxPcHRpb25zICYge2pzb246IGJvb2xlYW59KSB7XG4gIGlmIChvcHQuanNvbilcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSwgbnVsbCwgJyAgJykpO1xuICBlbHNlXG4gICAgY29uc29sZS5sb2cobGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpKTtcblxuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gIHRhYmxlLnB1c2goXG4gICAgW3tjb2xTcGFuOiAzLCBoQWxpZ246ICdjZW50ZXInLCBjb250ZW50OiBjaGFsay5ib2xkKCdTRVJWRVIgQ09NUE9ORU5UUycpfV0sXG4gICAgW2NoYWxrLmJvbGQoJ1BhY2thZ2UnKSwgJ1ByaW9yaXR5JywgY2hhbGsuYm9sZCgnRGlyZWN0b3J5JyldLFxuICAgIFsnLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLS0tLS0nXSk7XG5cbiAgY29uc3QgbGlzdDogU2VydmVyUGFja2FnZVZpZXdbXSA9IGF3YWl0IGxpc3RTZXJ2ZXJQYWNrYWdlcygpO1xuICBsaXN0LmZvckVhY2gocm93ID0+IHRhYmxlLnB1c2goW1xuICAgIHJvdy5uYW1lLFxuICAgIHJvdy5wcmlvcml0eSxcbiAgICBjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIHJvdy5kaXIpKVxuICBdKSk7XG4gIGNvbnNvbGUubG9nKHRhYmxlLnRvU3RyaW5nKCkpO1xuICBwcmludFdvcmtzcGFjZXMoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRGlyKG9wdDogR2xvYmFsT3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuICBwa01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBza2lwKDEpLCB0YWtlKDEpLFxuICAgIG1hcCgoY3VycikgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ0RpcmVjdG9yeSBzdGF0ZSBpcyB1cGRhdGVkLicpO1xuICAgICAgcmV0dXJuIGN1cnI7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgcGtNZ3IuYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVEaXIoKTtcbn1cblxuZnVuY3Rpb24gbGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpIHtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgcG1ncjogdHlwZW9mIHBrTWdyID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKTtcbiAgY29uc3QgbGlua2VkUGtncyA9IHBtZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcblxuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlLCBjb2xBbGlnbnM6IFsncmlnaHQnLCAnbGVmdCcsICdsZWZ0J119KTtcbiAgdGFibGUucHVzaChbe2NvbFNwYW46IDMsIGNvbnRlbnQ6IGNoYWxrLmJvbGQoJ0xJTktFRCBQQUNLQUdFUyBJTiBQUk9KRUNUXFxuJyksIGhBbGlnbjogJ2NlbnRlcid9XSk7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHBtZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIHRhYmxlLnB1c2goW3tcbiAgICAgIGNvbFNwYW46IDMsIGhBbGlnbjogJ2xlZnQnLFxuICAgICAgY29udGVudDogY2hhbGsuYm9sZCgnUHJvamVjdDogJykgKyAocHJqID8gY2hhbGsuY3lhbihwcmopIDogY2hhbGsuY3lhbignKHJvb3QgZGlyZWN0b3J5KScpKX1cbiAgICBdLFxuICAgICAgWydQYWNrYWdlIG5hbWUnLCAndmVyc2lvbicsICdQYXRoJ10sXG4gICAgICBbJy0tLS0tLS0tLS0tLScsICctLS0tLS0tJywgJy0tLS0nXVxuICAgICk7XG4gICAgY29uc3QgcGtncyA9IHBrZ05hbWVzLm1hcChuYW1lID0+IGxpbmtlZFBrZ3MuZ2V0KG5hbWUpISk7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgICB0YWJsZS5wdXNoKFtcbiAgICAgICAgY2hhbGsuY3lhbihway5uYW1lKSxcbiAgICAgICAgY2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKSxcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGFibGUudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24ganNvbk9mTGlua2VkUGFja2FnZUZvclByb2plY3RzKCkge1xuICBjb25zdCBhbGw6IHtbcHJqOiBzdHJpbmddOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfX0gPSB7fTtcbiAgY29uc3QgbGlua2VkUGtncyA9IHBrTWdyLmdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHBrTWdyLmdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5lbnRyaWVzKCkpIHtcbiAgICBjb25zdCBkZXA6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0gYWxsW3Byal0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHBrTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgZGVwW3BrTmFtZV0gPSBsaW5rZWRQa2dzLmdldChwa05hbWUpPy5qc29uLnZlcnNpb247XG4gICAgfVxuICB9XG4gIHJldHVybiBhbGw7XG59XG5cbmludGVyZmFjZSBTZXJ2ZXJQYWNrYWdlVmlldyB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHJpb3JpdHk6IHN0cmluZztcbiAgZGlyOiBzdHJpbmc7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RTZXJ2ZXJQYWNrYWdlcygpOiBQcm9taXNlPFNlcnZlclBhY2thZ2VWaWV3W10+IHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gcGtNZ3Iud29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpO1xuICB3c0tleSA9IHBrTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpID8gd3NLZXkgOiBwa01nci5nZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdIGFzIFNlcnZlclBhY2thZ2VWaWV3W107XG4gIH1cblxuICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIHRydWUpKVxuICAuZmlsdGVyKGlzU2VydmVyUGFja2FnZSlcbiAgLm1hcChwa2cgPT4gKHtcbiAgICBuYW1lOiBwa2cubmFtZSxcbiAgICBwcmlvcml0eTogcmVhZFByaW9yaXR5UHJvcGVydHkocGtnLmpzb24pXG4gIH0pKTtcblxuICBjb25zdCBsaXN0OiBBcnJheTxbc3RyaW5nLCBzdHJpbmcgfCBudW1iZXJdPiA9IFtdO1xuXG4gIGF3YWl0IHByaW9yaXR5SGVscGVyLm9yZGVyUGFja2FnZXMocGtncywgcGsgPT4ge1xuICAgIGxpc3QucHVzaChbcGsubmFtZSwgcGsucHJpb3JpdHldKTtcbiAgfSk7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IHBrTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpITtcbiAgcmV0dXJuIGxpc3QubWFwKChbbmFtZSwgcHJpXSkgPT4ge1xuICAgIGNvbnN0IHBrZyA9IHBrTWdyLmdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpIHx8IHdvcmtzcGFjZS5pbnN0YWxsZWRDb21wb25lbnRzIS5nZXQobmFtZSkhO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgcHJpb3JpdHk6IHByaSArICcnLFxuICAgICAgZGlyOiBwa2cucmVhbFBhdGhcbiAgICB9O1xuICB9KTtcbn1cbiJdfQ==