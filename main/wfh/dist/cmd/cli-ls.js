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
function list(opt) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const list = yield listServerPackages();
        list.forEach(row => table.push([
            row.name,
            row.priority,
            chalk_1.default.cyan(path_1.default.relative((0, config_1.default)().rootPath, row.dir))
        ]));
        console.log(table.toString());
        (0, cli_init_1.printWorkspaces)();
    });
}
exports.default = list;
function checkDir(opt) {
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
function listServerPackages() {
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQStCO0FBQy9CLHVEQUErQjtBQUUvQixzREFBd0M7QUFDeEMsNENBQTRDO0FBQzVDLDRFQUF5RTtBQUN6RSxrREFBMEI7QUFDMUIsZ0RBQXdCO0FBRXhCLHlDQUFzRTtBQUN0RSw4Q0FBcUU7QUFDckUsd0NBQXVEO0FBQ3ZELDJFQUE2RDtBQUM3RCxzREFBd0U7QUFFeEUsU0FBOEIsSUFBSSxDQUFDLEdBQW9EOztRQUNyRixJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7WUFDYixLQUFLLE1BQU0sT0FBTyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzFELElBQUEsb0NBQXlCLEVBQUMsT0FBTyxDQUFDLENBQUM7YUFDcEM7U0FDRjtRQUNELElBQUksR0FBRyxDQUFDLElBQUk7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzs7WUFFMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFeEMsTUFBTSxLQUFLLEdBQUcsSUFBQSxxQkFBYyxFQUFDLEVBQUMsZUFBZSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7UUFDdkQsS0FBSyxDQUFDLElBQUksQ0FDUixDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxlQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUMsQ0FBQyxFQUN4RSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMsR0FBRyxD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QU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO1FBQzFELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLG1CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztZQUNoRyxPQUFPO2dCQUNMLElBQUk7Z0JBQ0osUUFBUSxFQUFFLEdBQUcsR0FBRyxFQUFFO2dCQUNsQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVE7YUFDbEIsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbi8vIGltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge3ByaW50V29ya3NwYWNlcywgcHJpbnRXb3Jrc3BhY2VIb2lzdGVkRGVwc30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQge3Rha2UsIG1hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIHNraXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGUsIHBsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIHByaW9yaXR5SGVscGVyIGZyb20gJy4uL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCB7aXNTZXJ2ZXJQYWNrYWdlLCByZWFkUHJpb3JpdHlQcm9wZXJ0eX0gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBsaXN0KG9wdDogR2xvYmFsT3B0aW9ucyAmIHtqc29uOiBib29sZWFuOyBob2lzdDogYm9vbGVhbn0pIHtcbiAgaWYgKG9wdC5ob2lzdCkge1xuICAgIGZvciAoY29uc3Qgd3NTdGF0ZSBvZiBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIHByaW50V29ya3NwYWNlSG9pc3RlZERlcHMod3NTdGF0ZSk7XG4gICAgfVxuICB9XG4gIGlmIChvcHQuanNvbilcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSwgbnVsbCwgJyAgJykpO1xuICBlbHNlXG4gICAgY29uc29sZS5sb2cobGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpKTtcblxuICBjb25zdCB0YWJsZSA9IGNyZWF0ZUNsaVRhYmxlKHtob3Jpem9udGFsTGluZXM6IGZhbHNlfSk7XG4gIHRhYmxlLnB1c2goXG4gICAgW3tjb2xTcGFuOiAzLCBoQWxpZ246ICdjZW50ZXInLCBjb250ZW50OiBjaGFsay5ib2xkKCdTRVJWRVIgUEFDS0FHRVMnKX1dLFxuICAgIFsnUEFDS0FHRScsICdQUklPUklUWScsICdESVJFQ1RPUlknXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICBbJy0tLS0tLScsICctLS0tLS0tJywgJy0tLS0tLS0tJ10ubWFwKGl0ZW0gPT4gY2hhbGsuZ3JheShpdGVtKSlcbiAgKTtcblxuICBjb25zdCBsaXN0OiBTZXJ2ZXJQYWNrYWdlVmlld1tdID0gYXdhaXQgbGlzdFNlcnZlclBhY2thZ2VzKCk7XG4gIGxpc3QuZm9yRWFjaChyb3cgPT4gdGFibGUucHVzaChbXG4gICAgcm93Lm5hbWUsXG4gICAgcm93LnByaW9yaXR5LFxuICAgIGNoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcm93LmRpcikpXG4gIF0pKTtcbiAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIHByaW50V29ya3NwYWNlcygpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tEaXIob3B0OiBHbG9iYWxPcHRpb25zKSB7XG4gIHBrTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0pLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgbWFwKChjdXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnRGlyZWN0b3J5IHN0YXRlIGlzIHVwZGF0ZWQuJyk7XG4gICAgICByZXR1cm4gY3VycjtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBwa01nci5hY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZURpcigpO1xufVxuXG5mdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKCkge1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBwbWdyOiB0eXBlb2YgcGtNZ3IgPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpO1xuICBjb25zdCBsaW5rZWRQa2dzID0gcG1nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuXG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2UsIGNvbEFsaWduczogWydyaWdodCcsICdsZWZ0JywgJ2xlZnQnXX0pO1xuICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMywgY29udGVudDogY2hhbGsuYm9sZCgnTElOS0VEIFBBQ0tBR0VTIElOIFBST0pFQ1RcXG4nKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgcG1nci5nZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMywgaEFsaWduOiAnbGVmdCcsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKCdQcm9qZWN0OiAnKSArIChwcmogPyBjaGFsay5jeWFuKHByaikgOiBjaGFsay5jeWFuKCcocm9vdCBkaXJlY3RvcnkpJykpfVxuICAgIF0sXG4gICAgICBbJ1BBQ0tBR0UgTkFNRScsICdWRVJTSU9OJywgJ1BBVEgnXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpXG4gICAgKTtcbiAgICBjb25zdCBwa2dzID0gcGtnTmFtZXMubWFwKG5hbWUgPT4gbGlua2VkUGtncy5nZXQobmFtZSkhKTtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICAgIHRhYmxlLnB1c2goW1xuICAgICAgICBjaGFsay5jeWFuKHBrLm5hbWUpLFxuICAgICAgICBjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pLFxuICAgICAgICBQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpXSk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIHBtZ3IuZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMywgaEFsaWduOiAnbGVmdCcsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKCdTb3VyY2UgZGlyZWN0b3J5OiAnKSArIChwcmogPyBjaGFsay5jeWFuKHByaikgOiBjaGFsay5jeWFuKCcocm9vdCBkaXJlY3RvcnkpJykpfVxuICAgIF0sXG4gICAgICBbJ1BBQ0tBR0UgTkFNRScsICdWRVJTSU9OJywgJ1BBVEgnXS5tYXAoaXRlbSA9PiBjaGFsay5ncmF5KGl0ZW0pKSxcbiAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddLm1hcChpdGVtID0+IGNoYWxrLmdyYXkoaXRlbSkpXG4gICAgKTtcbiAgICBjb25zdCBwa2dzID0gcGtnTmFtZXMubWFwKG5hbWUgPT4gbGlua2VkUGtncy5nZXQobmFtZSkhKTtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICAgIHRhYmxlLnB1c2goW1xuICAgICAgICBjaGFsay5jeWFuKHBrLm5hbWUpLFxuICAgICAgICBjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pLFxuICAgICAgICBQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0YWJsZS50b1N0cmluZygpO1xufVxuXG5mdW5jdGlvbiBqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSB7XG4gIGNvbnN0IGFsbDoge1twcmo6IHN0cmluZ106IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9fSA9IHt9O1xuICBjb25zdCBsaW5rZWRQa2dzID0gcGtNZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgcGtNZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGRlcDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBhbGxbcHJqXSA9IHt9O1xuICAgIGZvciAoY29uc3QgcGtOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICBjb25zdCBwa2cgPSBsaW5rZWRQa2dzLmdldChwa05hbWUpO1xuICAgICAgaWYgKHBrZylcbiAgICAgICAgZGVwW3BrTmFtZV0gPSBwa2cuanNvbi52ZXJzaW9uO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWxsO1xufVxuXG5pbnRlcmZhY2UgU2VydmVyUGFja2FnZVZpZXcge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByaW9yaXR5OiBzdHJpbmc7XG4gIGRpcjogc3RyaW5nO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsaXN0U2VydmVyUGFja2FnZXMoKTogUHJvbWlzZTxTZXJ2ZXJQYWNrYWdlVmlld1tdPiB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHBrTWdyLndvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgd3NLZXkgPSBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSA/IHdzS2V5IDogcGtNZ3IuZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHJldHVybiBbXSBhcyBTZXJ2ZXJQYWNrYWdlVmlld1tdO1xuICB9XG5cbiAgY29uc3QgcGtncyA9IEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCB0cnVlKSlcbiAgLmZpbHRlcihpc1NlcnZlclBhY2thZ2UpXG4gIC5tYXAocGtnID0+ICh7XG4gICAgbmFtZTogcGtnLm5hbWUsXG4gICAgcHJpb3JpdHk6IHJlYWRQcmlvcml0eVByb3BlcnR5KHBrZy5qc29uKVxuICB9KSk7XG5cbiAgY29uc3QgbGlzdDogQXJyYXk8W3N0cmluZywgc3RyaW5nIHwgbnVtYmVyXT4gPSBbXTtcblxuICBhd2FpdCBwcmlvcml0eUhlbHBlci5vcmRlclBhY2thZ2VzKHBrZ3MsIHBrID0+IHtcbiAgICBsaXN0LnB1c2goW3BrLm5hbWUsIHBrLnByaW9yaXR5XSk7XG4gIH0pO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBwa01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gIHJldHVybiBsaXN0Lm1hcCgoW25hbWUsIHByaV0pID0+IHtcbiAgICBjb25zdCBwa2cgPSBwa01nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSB8fCB3b3Jrc3BhY2UuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpITtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHByaW9yaXR5OiBwcmkgKyAnJyxcbiAgICAgIGRpcjogcGtnLnJlYWxQYXRoXG4gICAgfTtcbiAgfSk7XG59XG4iXX0=