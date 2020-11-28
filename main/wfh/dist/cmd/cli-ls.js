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
        table.push([{ colSpan: 2, hAlign: 'center', content: 'SERVER COMPONENTS\n' }]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFFdEMsc0RBQXdDO0FBQ3hDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFHeEIseUNBQTJDO0FBQzNDLDhDQUFxRTtBQUNyRSx3Q0FBNkM7QUFNN0MsU0FBOEIsSUFBSSxDQUFDLEdBQW9DOztRQUNyRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsd0RBQXdEO1FBRXhELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBRS9ELElBQUksR0FBRyxDQUFDLElBQUk7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzs7WUFFMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFeEMsTUFBTSxLQUFLLEdBQUcscUJBQWMsQ0FBQyxFQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUscUJBQXFCLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0UsTUFBTSxJQUFJLEdBQXdCLE1BQU0sUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMs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O2dCQUNuQixlQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUM1QixjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDO2FBQUMsQ0FBQyxDQUFDO1NBQ3JDO0tBQ0Y7SUFDRCxPQUFPLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBRUQsU0FBUyw4QkFBOEI7O0lBQ3JDLE1BQU0sR0FBRyxHQUE2QyxFQUFFLENBQUM7SUFDekQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUNoRCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ3pFLE1BQU0sR0FBRyxHQUE0QixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ25ELEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFO1lBQzdCLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQywwQ0FBRSxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQ3BEO0tBQ0Y7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgTm9kZVBhY2thZ2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQge3ByaW50V29ya3NwYWNlc30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQge3Rha2UsIG1hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIHNraXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlQ2xpVGFibGV9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuXG5pbnRlcmZhY2UgQ29tcG9uZW50TGlzdEl0ZW0ge1xuICBwazogTm9kZVBhY2thZ2U7XG4gIGRlc2M6IHN0cmluZztcbn1cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGxpc3Qob3B0OiBHbG9iYWxPcHRpb25zICYge2pzb246IGJvb2xlYW59KSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIC8vIGNvbnN0IHBtZ3I6IHR5cGVvZiBwa01nciA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJyk7XG5cbiAgY29uc3QgcGtSdW5uZXIgPSByZXF1aXJlKCcuLi8uLi9saWIvcGFja2FnZU1nci9wYWNrYWdlUnVubmVyJyk7XG5cbiAgaWYgKG9wdC5qc29uKVxuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGpzb25PZkxpbmtlZFBhY2thZ2VGb3JQcm9qZWN0cygpLCBudWxsLCAnICAnKSk7XG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhsaXN0UGFja2FnZXNCeVByb2plY3RzKCkpO1xuXG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2V9KTtcbiAgdGFibGUucHVzaChbe2NvbFNwYW46IDIsIGhBbGlnbjogJ2NlbnRlcicsIGNvbnRlbnQ6ICdTRVJWRVIgQ09NUE9ORU5UU1xcbid9XSk7XG5cbiAgY29uc3QgbGlzdDogQ29tcG9uZW50TGlzdEl0ZW1bXSA9IGF3YWl0IHBrUnVubmVyLmxpc3RTZXJ2ZXJDb21wb25lbnRzKCk7XG4gIGxpc3QuZm9yRWFjaChyb3cgPT4gdGFibGUucHVzaChbcm93LmRlc2MsIGNoYWxrLmJsdWUoUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcm93LnBrLnBhdGgpKV0pKTtcbiAgY29uc29sZS5sb2codGFibGUudG9TdHJpbmcoKSk7XG4gIHByaW50V29ya3NwYWNlcygpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tEaXIob3B0OiBHbG9iYWxPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHBrTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0pLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgbWFwKChjdXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnRGlyZWN0b3J5IHN0YXRlIGlzIHVwZGF0ZWQuJyk7XG4gICAgICByZXR1cm4gY3VycjtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBwa01nci5hY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZURpcigpO1xufVxuXG5mdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKCkge1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBwbWdyOiB0eXBlb2YgcGtNZ3IgPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpO1xuICBjb25zdCBsaW5rZWRQa2dzID0gcG1nci5nZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuXG4gIGNvbnN0IHRhYmxlID0gY3JlYXRlQ2xpVGFibGUoe2hvcml6b250YWxMaW5lczogZmFsc2UsIGNvbEFsaWduczogWydyaWdodCcsICdsZWZ0JywgJ2xlZnQnXX0pO1xuICB0YWJsZS5wdXNoKFt7Y29sU3BhbjogMywgY29udGVudDogY2hhbGsuYm9sZCgnTElOS0VEIFBBQ0tBR0VTIElOIFBST0pFQ1RcXG4nKSwgaEFsaWduOiAnY2VudGVyJ31dKTtcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgcG1nci5nZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgdGFibGUucHVzaChbe1xuICAgICAgY29sU3BhbjogMywgaEFsaWduOiAnbGVmdCcsXG4gICAgICBjb250ZW50OiBjaGFsay5ib2xkKCdQcm9qZWN0OiAnKSArIChwcmogPyBjaGFsay5jeWFuKHByaikgOiBjaGFsay5jeWFuKCcocm9vdCBkaXJlY3RvcnkpJykpfVxuICAgIF0sXG4gICAgICBbJ1BhY2thZ2UgbmFtZScsICd2ZXJzaW9uJywgJ1BhdGgnXSxcbiAgICAgIFsnLS0tLS0tLS0tLS0tJywgJy0tLS0tLS0nLCAnLS0tLSddKTtcbiAgICBjb25zdCBwa2dzID0gcGtnTmFtZXMubWFwKG5hbWUgPT4gbGlua2VkUGtncy5nZXQobmFtZSkhKTtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICAgIHRhYmxlLnB1c2goW1xuICAgICAgICBjaGFsay5jeWFuKHBrLm5hbWUpLFxuICAgICAgICBjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pLFxuICAgICAgICBQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0YWJsZS50b1N0cmluZygpO1xufVxuXG5mdW5jdGlvbiBqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSB7XG4gIGNvbnN0IGFsbDoge1twcmo6IHN0cmluZ106IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9fSA9IHt9O1xuICBjb25zdCBsaW5rZWRQa2dzID0gcGtNZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgcGtNZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGRlcDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBhbGxbcHJqXSA9IHt9O1xuICAgIGZvciAoY29uc3QgcGtOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICBkZXBbcGtOYW1lXSA9IGxpbmtlZFBrZ3MuZ2V0KHBrTmFtZSk/Lmpzb24udmVyc2lvbjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFsbDtcbn1cbiJdfQ==