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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const _ = __importStar(require("lodash"));
const cli_init_1 = require("./cli-init");
function list(opt) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        log_config_1.default(config_1.default());
        const pmgr = require('../package-mgr');
        const pkRunner = require('../../lib/packageMgr/packageRunner');
        console.log('==============[ LINKED PACKAGES IN PROJECT ]==============\n');
        if (opt.json)
            console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
        else
            console.log(pmgr.listPackagesByProjects());
        console.log('\n' + chalk_1.default.green(_.pad('[ SERVER COMPONENTS ]', 50, '=')) + '\n');
        const list = yield pkRunner.listServerComponents();
        list.forEach(row => console.log(' ' + row.desc + '   ' + chalk_1.default.blue(path_1.default.relative(config_1.default().rootPath, row.pk.path))));
        cli_init_1.printWorkspaces();
    });
}
exports.default = list;
function checkDir(opt) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init(opt);
        log_config_1.default(config_1.default());
        pkMgr.actionDispatcher.updateDir();
    });
}
exports.checkDir = checkDir;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFFdEMsc0RBQXdDO0FBQ3hDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsMENBQTRCO0FBRTVCLHlDQUEyQztBQU0zQyxTQUE4QixJQUFJLENBQUMsR0FBb0M7O1FBQ3JFLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztRQUNwQixNQUFNLElBQUksR0FBaUIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFckQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFFL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBQzVFLElBQUksR0FBRyxDQUFDLElBQUk7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzs7WUFFMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLGVBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUVoRixNQUFNLElBQUksR0FBd0IsTUFBTSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUN4RSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVySCwwQkFBZSxFQUFFLENBQUM7SUFDcEIsQ0FBQztDQUFBO0FBbkJELHVCQW1CQztBQUVELFNBQXNCLFFBQVEsQ0FBQyxHQUFrQjs7UUFDL0MsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0NBQUE7QUFKRCw0QkFJQztBQUVELFNBQVMsOEJBQThCOztJQUNyQyxNQUFNLEdBQUcsR0FBNkMsRUFBRSxDQUFDO0lBQ3pELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDaEQsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUN6RSxNQUFNLEdBQUcsR0FBNEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNuRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUM3QixHQUFHLENBQUMsTUFBTSxDQUFDLFNBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsMENBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztTQUNwRDtLQUNGO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgcGtNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtwcmludFdvcmtzcGFjZXN9IGZyb20gJy4vY2xpLWluaXQnO1xuXG5pbnRlcmZhY2UgQ29tcG9uZW50TGlzdEl0ZW0ge1xuICBwazogTm9kZVBhY2thZ2U7XG4gIGRlc2M6IHN0cmluZztcbn1cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGxpc3Qob3B0OiBHbG9iYWxPcHRpb25zICYge2pzb246IGJvb2xlYW59KSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIGNvbnN0IHBtZ3I6IHR5cGVvZiBwa01nciA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJyk7XG5cbiAgY29uc3QgcGtSdW5uZXIgPSByZXF1aXJlKCcuLi8uLi9saWIvcGFja2FnZU1nci9wYWNrYWdlUnVubmVyJyk7XG5cbiAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09WyBMSU5LRUQgUEFDS0FHRVMgSU4gUFJPSkVDVCBdPT09PT09PT09PT09PT1cXG4nKTtcbiAgaWYgKG9wdC5qc29uKVxuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGpzb25PZkxpbmtlZFBhY2thZ2VGb3JQcm9qZWN0cygpLCBudWxsLCAnICAnKSk7XG4gIGVsc2VcbiAgICBjb25zb2xlLmxvZyhwbWdyLmxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSk7XG5cbiAgY29uc29sZS5sb2coJ1xcbicgKyBjaGFsay5ncmVlbihfLnBhZCgnWyBTRVJWRVIgQ09NUE9ORU5UUyBdJywgNTAsICc9JykpICsgJ1xcbicpO1xuXG4gIGNvbnN0IGxpc3Q6IENvbXBvbmVudExpc3RJdGVtW10gPSBhd2FpdCBwa1J1bm5lci5saXN0U2VydmVyQ29tcG9uZW50cygpO1xuICBsaXN0LmZvckVhY2gocm93ID0+IGNvbnNvbGUubG9nKCcgJyArIHJvdy5kZXNjICsgJyAgICcgKyBjaGFsay5ibHVlKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIHJvdy5way5wYXRoKSkpKTtcblxuICBwcmludFdvcmtzcGFjZXMoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRGlyKG9wdDogR2xvYmFsT3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuICBwa01nci5hY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZURpcigpO1xufVxuXG5mdW5jdGlvbiBqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSB7XG4gIGNvbnN0IGFsbDoge1twcmo6IHN0cmluZ106IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9fSA9IHt9O1xuICBjb25zdCBsaW5rZWRQa2dzID0gcGtNZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgcGtNZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGRlcDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBhbGxbcHJqXSA9IHt9O1xuICAgIGZvciAoY29uc3QgcGtOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICBkZXBbcGtOYW1lXSA9IGxpbmtlZFBrZ3MuZ2V0KHBrTmFtZSk/Lmpzb24udmVyc2lvbjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFsbDtcbn1cbiJdfQ==