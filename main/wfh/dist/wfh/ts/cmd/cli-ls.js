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
// tslint:disable: no-console
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
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
        console.log(pmgr.listPackagesByProjects());
        console.log('\n' + chalk_1.default.green(_.pad('[ SERVER COMPONENTS ]', 50, '=')) + '\n');
        let list = yield pkRunner.listServerComponents();
        list.forEach(row => console.log(' ' + row.desc + '   ' + chalk_1.default.blue(path_1.default.relative(config_1.default().rootPath, row.pk.path))));
        console.log('');
        console.log('\n' + chalk_1.default.green(_.pad('[ BUILDER COMPONENTS ]', 50, '=')) + '\n');
        list = yield pkRunner.listBuilderComponents();
        list.forEach(row => console.log(' ' + row.desc + '   ' + chalk_1.default.blue(path_1.default.relative(config_1.default().rootPath, row.pk.path))));
        cli_init_1.printWorkspaces();
    });
}
exports.default = list;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0IsdURBQStCO0FBQy9CLCtEQUFzQztBQUd0QyxrREFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDBDQUE0QjtBQUU1Qix5Q0FBMkM7QUFNM0MsU0FBOEIsSUFBSSxDQUFDLEdBQWtCOztRQUNuRCxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7UUFDcEIsTUFBTSxJQUFJLEdBQWlCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXJELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBRS9ELE9BQU8sQ0FBQyxHQUFHLENBQUMsOERBQThELENBQUMsQ0FBQztRQUM1RSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBRWhGLElBQUksSUFBSSxHQUF3QixNQUFNLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ3RFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLEtBQUssR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JILE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsZUFBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBRWpGLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLEtBQUssR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJILDBCQUFlLEVBQUUsQ0FBQztJQUNwQixDQUFDO0NBQUE7QUFyQkQsdUJBcUJDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgcGtNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtwcmludFdvcmtzcGFjZXN9IGZyb20gJy4vY2xpLWluaXQnO1xuXG5pbnRlcmZhY2UgQ29tcG9uZW50TGlzdEl0ZW0ge1xuICBwazogTm9kZVBhY2thZ2U7XG4gIGRlc2M6IHN0cmluZztcbn1cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGxpc3Qob3B0OiBHbG9iYWxPcHRpb25zKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdCk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIGNvbnN0IHBtZ3I6IHR5cGVvZiBwa01nciA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJyk7XG5cbiAgY29uc3QgcGtSdW5uZXIgPSByZXF1aXJlKCcuLi8uLi9saWIvcGFja2FnZU1nci9wYWNrYWdlUnVubmVyJyk7XG5cbiAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09WyBMSU5LRUQgUEFDS0FHRVMgSU4gUFJPSkVDVCBdPT09PT09PT09PT09PT1cXG4nKTtcbiAgY29uc29sZS5sb2cocG1nci5saXN0UGFja2FnZXNCeVByb2plY3RzKCkpO1xuXG4gIGNvbnNvbGUubG9nKCdcXG4nICsgY2hhbGsuZ3JlZW4oXy5wYWQoJ1sgU0VSVkVSIENPTVBPTkVOVFMgXScsIDUwLCAnPScpKSArICdcXG4nKTtcblxuICBsZXQgbGlzdDogQ29tcG9uZW50TGlzdEl0ZW1bXSA9IGF3YWl0IHBrUnVubmVyLmxpc3RTZXJ2ZXJDb21wb25lbnRzKCk7XG4gIGxpc3QuZm9yRWFjaChyb3cgPT4gY29uc29sZS5sb2coJyAnICsgcm93LmRlc2MgKyAnICAgJyArIGNoYWxrLmJsdWUoUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcm93LnBrLnBhdGgpKSkpO1xuICBjb25zb2xlLmxvZygnJyk7XG4gIGNvbnNvbGUubG9nKCdcXG4nICsgY2hhbGsuZ3JlZW4oXy5wYWQoJ1sgQlVJTERFUiBDT01QT05FTlRTIF0nLCA1MCwgJz0nKSkgKyAnXFxuJyk7XG5cbiAgbGlzdCA9IGF3YWl0IHBrUnVubmVyLmxpc3RCdWlsZGVyQ29tcG9uZW50cygpO1xuICBsaXN0LmZvckVhY2gocm93ID0+IGNvbnNvbGUubG9nKCcgJyArIHJvdy5kZXNjICsgJyAgICcgKyBjaGFsay5ibHVlKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIHJvdy5way5wYXRoKSkpKTtcblxuICBwcmludFdvcmtzcGFjZXMoKTtcbn1cbiJdfQ==