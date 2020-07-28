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
    });
}
exports.default = list;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0IsdURBQStCO0FBQy9CLCtEQUFzQztBQUd0QyxrREFBMEI7QUFDMUIsZ0RBQXdCO0FBQ3hCLDBDQUE0QjtBQU81QixTQUE4QixJQUFJLENBQUMsR0FBa0I7O1FBQ25ELE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztRQUNwQixNQUFNLElBQUksR0FBaUIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFckQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFFL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUUzQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxlQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFaEYsSUFBSSxJQUFJLEdBQXdCLE1BQU0sUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDdEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxlQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFakYsSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkgsQ0FBQztDQUFBO0FBbkJELHVCQW1CQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcblxuaW50ZXJmYWNlIENvbXBvbmVudExpc3RJdGVtIHtcbiAgcGs6IE5vZGVQYWNrYWdlO1xuICBkZXNjOiBzdHJpbmc7XG59XG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBsaXN0KG9wdDogR2xvYmFsT3B0aW9ucykge1xuICBhd2FpdCBjb25maWcuaW5pdChvcHQpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuICBjb25zdCBwbWdyOiB0eXBlb2YgcGtNZ3IgPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpO1xuXG4gIGNvbnN0IHBrUnVubmVyID0gcmVxdWlyZSgnLi4vLi4vbGliL3BhY2thZ2VNZ3IvcGFja2FnZVJ1bm5lcicpO1xuXG4gIGNvbnNvbGUubG9nKCc9PT09PT09PT09PT09PVsgTElOS0VEIFBBQ0tBR0VTIElOIFBST0pFQ1QgXT09PT09PT09PT09PT09XFxuJyk7XG4gIGNvbnNvbGUubG9nKHBtZ3IubGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpKTtcblxuICBjb25zb2xlLmxvZygnXFxuJyArIGNoYWxrLmdyZWVuKF8ucGFkKCdbIFNFUlZFUiBDT01QT05FTlRTIF0nLCA1MCwgJz0nKSkgKyAnXFxuJyk7XG5cbiAgbGV0IGxpc3Q6IENvbXBvbmVudExpc3RJdGVtW10gPSBhd2FpdCBwa1J1bm5lci5saXN0U2VydmVyQ29tcG9uZW50cygpO1xuICBsaXN0LmZvckVhY2gocm93ID0+IGNvbnNvbGUubG9nKCcgJyArIHJvdy5kZXNjICsgJyAgICcgKyBjaGFsay5ibHVlKFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIHJvdy5way5wYXRoKSkpKTtcbiAgY29uc29sZS5sb2coJycpO1xuICBjb25zb2xlLmxvZygnXFxuJyArIGNoYWxrLmdyZWVuKF8ucGFkKCdbIEJVSUxERVIgQ09NUE9ORU5UUyBdJywgNTAsICc9JykpICsgJ1xcbicpO1xuXG4gIGxpc3QgPSBhd2FpdCBwa1J1bm5lci5saXN0QnVpbGRlckNvbXBvbmVudHMoKTtcbiAgbGlzdC5mb3JFYWNoKHJvdyA9PiBjb25zb2xlLmxvZygnICcgKyByb3cuZGVzYyArICcgICAnICsgY2hhbGsuYmx1ZShQYXRoLnJlbGF0aXZlKGNvbmZpZygpLnJvb3RQYXRoLCByb3cucGsucGF0aCkpKSk7XG59XG4iXX0=