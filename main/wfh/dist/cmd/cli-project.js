"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProject = void 0;
// import fs from 'fs-extra';
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const operators_1 = require("rxjs/operators");
const package_mgr_1 = require("../package-mgr");
const misc_1 = require("../utils/misc");
// import { writeFile } from './utils';
// import config from '../config';
const rootPath = (0, misc_1.getRootDir)();
/**
 * @param action
 * @param dirs
 */
function default_1(opts, action, dirs) {
    listProject(undefined, true);
    switch (action) {
        case 'add':
            if (dirs) {
                if (opts.isSrcDir)
                    package_mgr_1.actionDispatcher.addSrcDirs(dirs);
                else
                    package_mgr_1.actionDispatcher.addProject(dirs);
            }
            break;
        case 'remove':
            if (dirs) {
                if (opts.isSrcDir)
                    package_mgr_1.actionDispatcher.deleteSrcDirs(dirs);
                else
                    package_mgr_1.actionDispatcher.deleteProject(dirs);
            }
            break;
        default:
            listProject();
    }
}
exports.default = default_1;
function listProject(projects, afterChange = false) {
    (0, package_mgr_1.getStore)().pipe((0, operators_1.distinctUntilChanged)((a, b) => a.project2Packages === b.project2Packages &&
        a.srcDir2Packages === b.srcDir2Packages), (0, operators_1.map)(s => ({ project2Packages: [...s.project2Packages.keys()], srcDir2Packages: [...s.srcDir2Packages.keys()] })), (0, operators_1.distinctUntilChanged)((a, b) => {
        return lodash_1.default.difference(a.project2Packages, b.project2Packages).length === 0 &&
            lodash_1.default.difference(b.project2Packages, a.project2Packages).length === 0 &&
            lodash_1.default.difference(a.srcDir2Packages, b.srcDir2Packages).length === 0 &&
            lodash_1.default.difference(b.srcDir2Packages, a.srcDir2Packages).length === 0;
    }), afterChange ? (0, operators_1.skip)(1) : (0, operators_1.map)(s => s), (0, operators_1.map)(s => {
        printProjects(s.project2Packages, s.srcDir2Packages);
    }), (0, operators_1.take)(1)).subscribe();
}
exports.listProject = listProject;
function printProjects(projects, srcDirs) {
    let str = 'Project directories'.toUpperCase();
    str += '\n \n';
    let i = 0;
    for (let dir of projects) {
        dir = path_1.default.resolve(rootPath, dir);
        str += lodash_1.default.padEnd(i + 1 + '. ', 5, ' ') + dir;
        str += '\n';
        i++;
    }
    if (i === 0) {
        str += 'No projects';
    }
    // eslint-disable-next-line no-console
    console.log((0, misc_1.boxString)(str));
    str = 'Linked source directories'.toUpperCase();
    str += '\n \n';
    i = 0;
    for (let dir of srcDirs) {
        dir = path_1.default.resolve(rootPath, dir);
        str += lodash_1.default.padEnd(i + 1 + '. ', 5, ' ') + dir;
        str += '\n';
        i++;
    }
    if (i === 0) {
        str = 'No linked source directories';
    }
    // eslint-disable-next-line no-console
    console.log((0, misc_1.boxString)(str));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOENBQXVFO0FBQ3ZFLGdEQUEwRTtBQUMxRSx3Q0FBc0Q7QUFDdEQsdUNBQXVDO0FBQ3ZDLGtDQUFrQztBQUNsQyxNQUFNLFFBQVEsR0FBRyxJQUFBLGlCQUFVLEdBQUUsQ0FBQztBQUU5Qjs7O0dBR0c7QUFDSCxtQkFBd0IsSUFBeUIsRUFBRSxNQUF5QixFQUFFLElBQWU7SUFDM0YsV0FBVyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QixRQUFRLE1BQU0sRUFBRTtRQUNkLEtBQUssS0FBSztZQUNSLElBQUksSUFBSSxFQUFFO2dCQUNSLElBQUksSUFBSSxDQUFDLFFBQVE7b0JBQ2YsOEJBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQUU1Qiw4QkFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMvQjtZQUNELE1BQU07UUFDUixLQUFLLFFBQVE7WUFDWCxJQUFJLElBQUksRUFBRTtnQkFDUixJQUFJLElBQUksQ0FBQyxRQUFRO29CQUNmLDhCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDOztvQkFFL0IsOEJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbEM7WUFDRCxNQUFNO1FBQ1I7WUFDRSxXQUFXLEVBQUUsQ0FBQztLQUNqQjtBQUNILENBQUM7QUF0QkQsNEJBc0JDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLFFBQW1CLEVBQUUsV0FBVyxHQUFHLEtBQUs7SUFDbEUsSUFBQSxzQkFBUSxHQUFFLENBQUMsSUFBSSxDQUNiLElBQUEsZ0NBQW9CLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxD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LEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUM1QyxHQUFHLElBQUksSUFBSSxDQUFDO1FBQ1osQ0FBQyxFQUFFLENBQUM7S0FDTDtJQUNELElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNYLEdBQUcsR0FBRyw4QkFBOEIsQ0FBQztLQUN0QztJQUNELHNDQUFzQztJQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUEsZ0JBQVMsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgc2tpcCwgdGFrZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgcGtnQWN0aW9ucywgZ2V0U3RvcmUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBib3hTdHJpbmcsIGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbi8vIGltcG9ydCB7IHdyaXRlRmlsZSB9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG5cbi8qKlxuICogQHBhcmFtIGFjdGlvbiBcbiAqIEBwYXJhbSBkaXJzIFxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihvcHRzOiB7aXNTcmNEaXI6IGJvb2xlYW59LCBhY3Rpb24/OiAnYWRkJyB8ICdyZW1vdmUnLCBkaXJzPzogc3RyaW5nW10pIHtcbiAgbGlzdFByb2plY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICBjYXNlICdhZGQnOlxuICAgICAgaWYgKGRpcnMpIHtcbiAgICAgICAgaWYgKG9wdHMuaXNTcmNEaXIpXG4gICAgICAgICAgcGtnQWN0aW9ucy5hZGRTcmNEaXJzKGRpcnMpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcGtnQWN0aW9ucy5hZGRQcm9qZWN0KGRpcnMpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmVtb3ZlJzpcbiAgICAgIGlmIChkaXJzKSB7XG4gICAgICAgIGlmIChvcHRzLmlzU3JjRGlyKVxuICAgICAgICAgIHBrZ0FjdGlvbnMuZGVsZXRlU3JjRGlycyhkaXJzKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHBrZ0FjdGlvbnMuZGVsZXRlUHJvamVjdChkaXJzKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBsaXN0UHJvamVjdCgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UHJvamVjdChwcm9qZWN0cz86IHN0cmluZ1tdLCBhZnRlckNoYW5nZSA9IGZhbHNlKSB7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoYSwgYikgPT4gYS5wcm9qZWN0MlBhY2thZ2VzID09PSBiLnByb2plY3QyUGFja2FnZXMgJiZcbiAgICAgIGEuc3JjRGlyMlBhY2thZ2VzID09PSBiLnNyY0RpcjJQYWNrYWdlcyksXG4gICAgbWFwKHMgPT4gKHtwcm9qZWN0MlBhY2thZ2VzOiBbLi4ucy5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKV0sIHNyY0RpcjJQYWNrYWdlczogWy4uLnMuc3JjRGlyMlBhY2thZ2VzLmtleXMoKV19KSksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKGEsIGIpID0+IHtcbiAgICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYS5wcm9qZWN0MlBhY2thZ2VzLCBiLnByb2plY3QyUGFja2FnZXMpLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgXy5kaWZmZXJlbmNlKGIucHJvamVjdDJQYWNrYWdlcywgYS5wcm9qZWN0MlBhY2thZ2VzKS5sZW5ndGggPT09IDAgJiZcbiAgICAgIF8uZGlmZmVyZW5jZShhLnNyY0RpcjJQYWNrYWdlcywgYi5zcmNEaXIyUGFja2FnZXMpLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgXy5kaWZmZXJlbmNlKGIuc3JjRGlyMlBhY2thZ2VzLCBhLnNyY0RpcjJQYWNrYWdlcykubGVuZ3RoID09PSAwO1xuICAgIH0pLFxuICAgIGFmdGVyQ2hhbmdlID8gc2tpcCgxKSA6IG1hcChzID0+IHMpLFxuICAgIG1hcChzID0+IHtcbiAgICAgIHByaW50UHJvamVjdHMocy5wcm9qZWN0MlBhY2thZ2VzLCBzLnNyY0RpcjJQYWNrYWdlcyk7XG4gICAgfSksXG4gICAgdGFrZSgxKVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5mdW5jdGlvbiBwcmludFByb2plY3RzKHByb2plY3RzOiBJdGVyYWJsZTxzdHJpbmc+LCBzcmNEaXJzOiBJdGVyYWJsZTxzdHJpbmc+KSB7XG5cbiAgbGV0IHN0ciA9ICdQcm9qZWN0IGRpcmVjdG9yaWVzJy50b1VwcGVyQ2FzZSgpO1xuICBzdHIgKz0gJ1xcbiBcXG4nO1xuICBsZXQgaSA9IDA7XG4gIGZvciAobGV0IGRpciBvZiBwcm9qZWN0cykge1xuICAgIGRpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZGlyKTtcbiAgICBzdHIgKz0gXy5wYWRFbmQoaSArIDEgKyAnLiAnLCA1LCAnICcpICsgZGlyO1xuICAgIHN0ciArPSAnXFxuJztcbiAgICBpKys7XG4gIH1cbiAgaWYgKGkgPT09IDApIHtcbiAgICBzdHIgKz0gJ05vIHByb2plY3RzJztcbiAgfVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhib3hTdHJpbmcoc3RyKSk7XG4gIHN0ciA9ICdMaW5rZWQgc291cmNlIGRpcmVjdG9yaWVzJy50b1VwcGVyQ2FzZSgpO1xuICBzdHIgKz0gJ1xcbiBcXG4nO1xuICBpID0gMDtcblxuICBmb3IgKGxldCBkaXIgb2Ygc3JjRGlycykge1xuICAgIGRpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZGlyKTtcbiAgICBzdHIgKz0gXy5wYWRFbmQoaSArIDEgKyAnLiAnLCA1LCAnICcpICsgZGlyO1xuICAgIHN0ciArPSAnXFxuJztcbiAgICBpKys7XG4gIH1cbiAgaWYgKGkgPT09IDApIHtcbiAgICBzdHIgPSAnTm8gbGlua2VkIHNvdXJjZSBkaXJlY3Rvcmllcyc7XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYm94U3RyaW5nKHN0cikpO1xufVxuIl19