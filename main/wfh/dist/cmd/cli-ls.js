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
const operators_1 = require("rxjs/operators");
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
        pkMgr.getStore().pipe(operators_1.map(s => s.packagesUpdateChecksum), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.take(1), operators_1.map((curr) => {
            console.log('Directory state is updated.');
            return curr;
        })).subscribe();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFFdEMsc0RBQXdDO0FBQ3hDLGtEQUEwQjtBQUMxQixnREFBd0I7QUFDeEIsMENBQTRCO0FBRTVCLHlDQUEyQztBQUMzQyw4Q0FBcUU7QUFNckUsU0FBOEIsSUFBSSxDQUFDLEdBQW9DOztRQUNyRSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsTUFBTSxJQUFJLEdBQWlCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXJELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBRS9ELE9BQU8sQ0FBQyxHQUFHLENBQUMsOERBQThELENBQUMsQ0FBQztRQUM1RSxJQUFJLEdBQUcsQ0FBQyxJQUFJO1lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7O1lBRTFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUU3QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxlQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFaEYsTUFBTSxJQUFJLEdBQXdCLE1BQU0sUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckgsMEJBQWUsRUFBRSxDQUFDO0lBQ3BCLENBQUM7Q0FBQTtBQW5CRCx1QkFtQkM7QUFFRCxTQUFzQixRQUFRLENBQUMsR0FBa0I7O1FBQy9DLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztRQUNwQixLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNuQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxnQ0FBb0IsRUFBRSxFQUMxRCxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ2hCLGVBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0NBQUE7QUFaRCw0QkFZQztBQUVELFNBQVMsOEJBQThCOztJQUNyQyxNQUFNLEdBQUcsR0FBNkMsRUFBRSxDQUFDO0lBQ3pELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDaEQsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUN6RSxNQUFNLEdBQUcsR0FBNEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNuRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUM3QixHQUFHLENBQUMsTUFBTSxDQUFDLFNBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsMENBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztTQUNwRDtLQUNGO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgcGtNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtwcmludFdvcmtzcGFjZXN9IGZyb20gJy4vY2xpLWluaXQnO1xuaW1wb3J0IHt0YWtlLCBtYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBza2lwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmludGVyZmFjZSBDb21wb25lbnRMaXN0SXRlbSB7XG4gIHBrOiBOb2RlUGFja2FnZTtcbiAgZGVzYzogc3RyaW5nO1xufVxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gbGlzdChvcHQ6IEdsb2JhbE9wdGlvbnMgJiB7anNvbjogYm9vbGVhbn0pIHtcbiAgYXdhaXQgY29uZmlnLmluaXQob3B0KTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgY29uc3QgcG1ncjogdHlwZW9mIHBrTWdyID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKTtcblxuICBjb25zdCBwa1J1bm5lciA9IHJlcXVpcmUoJy4uLy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VSdW5uZXInKTtcblxuICBjb25zb2xlLmxvZygnPT09PT09PT09PT09PT1bIExJTktFRCBQQUNLQUdFUyBJTiBQUk9KRUNUIF09PT09PT09PT09PT09PVxcbicpO1xuICBpZiAob3B0Lmpzb24pXG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoanNvbk9mTGlua2VkUGFja2FnZUZvclByb2plY3RzKCksIG51bGwsICcgICcpKTtcbiAgZWxzZVxuICAgIGNvbnNvbGUubG9nKHBtZ3IubGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpKTtcblxuICBjb25zb2xlLmxvZygnXFxuJyArIGNoYWxrLmdyZWVuKF8ucGFkKCdbIFNFUlZFUiBDT01QT05FTlRTIF0nLCA1MCwgJz0nKSkgKyAnXFxuJyk7XG5cbiAgY29uc3QgbGlzdDogQ29tcG9uZW50TGlzdEl0ZW1bXSA9IGF3YWl0IHBrUnVubmVyLmxpc3RTZXJ2ZXJDb21wb25lbnRzKCk7XG4gIGxpc3QuZm9yRWFjaChyb3cgPT4gY29uc29sZS5sb2coJyAnICsgcm93LmRlc2MgKyAnICAgJyArIGNoYWxrLmJsdWUoUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcm93LnBrLnBhdGgpKSkpO1xuXG4gIHByaW50V29ya3NwYWNlcygpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tEaXIob3B0OiBHbG9iYWxPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHBrTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0pLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgbWFwKChjdXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnRGlyZWN0b3J5IHN0YXRlIGlzIHVwZGF0ZWQuJyk7XG4gICAgICByZXR1cm4gY3VycjtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBwa01nci5hY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZURpcigpO1xufVxuXG5mdW5jdGlvbiBqc29uT2ZMaW5rZWRQYWNrYWdlRm9yUHJvamVjdHMoKSB7XG4gIGNvbnN0IGFsbDoge1twcmo6IHN0cmluZ106IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9fSA9IHt9O1xuICBjb25zdCBsaW5rZWRQa2dzID0gcGtNZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgcGtNZ3IuZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGRlcDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBhbGxbcHJqXSA9IHt9O1xuICAgIGZvciAoY29uc3QgcGtOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICBkZXBbcGtOYW1lXSA9IGxpbmtlZFBrZ3MuZ2V0KHBrTmFtZSk/Lmpzb24udmVyc2lvbjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFsbDtcbn1cbiJdfQ==