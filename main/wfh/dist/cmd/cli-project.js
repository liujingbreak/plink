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
const rootPath = misc_1.getRootDir();
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
    package_mgr_1.getStore().pipe(operators_1.distinctUntilChanged((a, b) => a.project2Packages === b.project2Packages &&
        a.srcDir2Packages === b.srcDir2Packages), operators_1.map(s => ({ project2Packages: [...s.project2Packages.keys()], srcDir2Packages: [...s.srcDir2Packages.keys()] })), operators_1.distinctUntilChanged((a, b) => {
        return lodash_1.default.difference(a.project2Packages, b.project2Packages).length === 0 &&
            lodash_1.default.difference(b.project2Packages, a.project2Packages).length === 0 &&
            lodash_1.default.difference(a.srcDir2Packages, b.srcDir2Packages).length === 0 &&
            lodash_1.default.difference(b.srcDir2Packages, a.srcDir2Packages).length === 0;
    }), afterChange ? operators_1.skip(1) : operators_1.map(s => s), operators_1.map(s => {
        printProjects(s.project2Packages, s.srcDir2Packages);
    }), operators_1.take(1)).subscribe();
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
    console.log(misc_1.boxString(str));
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
    console.log(misc_1.boxString(str));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOENBQXVFO0FBQ3ZFLGdEQUEwRTtBQUMxRSx3Q0FBc0Q7QUFDdEQsdUNBQXVDO0FBQ3ZDLGtDQUFrQztBQUNsQyxNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFFOUI7OztHQUdHO0FBQ0gsbUJBQXdCLElBQXlCLEVBQUUsTUFBeUIsRUFBRSxJQUFlO0lBQzNGLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsUUFBUSxNQUFNLEVBQUU7UUFDZCxLQUFLLEtBQUs7WUFDUixJQUFJLElBQUksRUFBRTtnQkFDUixJQUFJLElBQUksQ0FBQyxRQUFRO29CQUNmLDhCQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDOztvQkFFNUIsOEJBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDL0I7WUFDRCxNQUFNO1FBQ1IsS0FBSyxRQUFRO1lBQ1gsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsSUFBSSxJQUFJLENBQUMsUUFBUTtvQkFDZiw4QkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7b0JBRS9CLDhCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2xDO1lBQ0QsTUFBTTtRQUNSO1lBQ0UsV0FBVyxFQUFFLENBQUM7S0FDakI7QUFDSCxDQUFDO0FBdEJELDRCQXNCQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxRQUFtQixFQUFFLFdBQVcsR0FBRyxLQUFLO0lBQ2xFLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZ0NBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdC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QztRQUNaLENBQUMsRUFBRSxDQUFDO0tBQ0w7SUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDWCxHQUFHLEdBQUcsOEJBQThCLENBQUM7S0FDdEM7SUFDRCxzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCBza2lwLCB0YWtlIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBwa2dBY3Rpb25zLCBnZXRTdG9yZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGJveFN0cmluZywgZ2V0Um9vdERpciB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5jb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcblxuLyoqXG4gKiBAcGFyYW0gYWN0aW9uIFxuICogQHBhcmFtIGRpcnMgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG9wdHM6IHtpc1NyY0RpcjogYm9vbGVhbn0sIGFjdGlvbj86ICdhZGQnIHwgJ3JlbW92ZScsIGRpcnM/OiBzdHJpbmdbXSkge1xuICBsaXN0UHJvamVjdCh1bmRlZmluZWQsIHRydWUpO1xuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2FkZCc6XG4gICAgICBpZiAoZGlycykge1xuICAgICAgICBpZiAob3B0cy5pc1NyY0RpcilcbiAgICAgICAgICBwa2dBY3Rpb25zLmFkZFNyY0RpcnMoZGlycyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwa2dBY3Rpb25zLmFkZFByb2plY3QoZGlycyk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyZW1vdmUnOlxuICAgICAgaWYgKGRpcnMpIHtcbiAgICAgICAgaWYgKG9wdHMuaXNTcmNEaXIpXG4gICAgICAgICAgcGtnQWN0aW9ucy5kZWxldGVTcmNEaXJzKGRpcnMpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcGtnQWN0aW9ucy5kZWxldGVQcm9qZWN0KGRpcnMpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGxpc3RQcm9qZWN0KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQcm9qZWN0KHByb2plY3RzPzogc3RyaW5nW10sIGFmdGVyQ2hhbmdlID0gZmFsc2UpIHtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChhLCBiKSA9PiBhLnByb2plY3QyUGFja2FnZXMgPT09IGIucHJvamVjdDJQYWNrYWdlcyAmJlxuICAgICAgYS5zcmNEaXIyUGFja2FnZXMgPT09IGIuc3JjRGlyMlBhY2thZ2VzKSxcbiAgICBtYXAocyA9PiAoe3Byb2plY3QyUGFja2FnZXM6IFsuLi5zLnByb2plY3QyUGFja2FnZXMua2V5cygpXSwgc3JjRGlyMlBhY2thZ2VzOiBbLi4ucy5zcmNEaXIyUGFja2FnZXMua2V5cygpXX0pKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoYSwgYikgPT4ge1xuICAgICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhLnByb2plY3QyUGFja2FnZXMsIGIucHJvamVjdDJQYWNrYWdlcykubGVuZ3RoID09PSAwICYmXG4gICAgICBfLmRpZmZlcmVuY2UoYi5wcm9qZWN0MlBhY2thZ2VzLCBhLnByb2plY3QyUGFja2FnZXMpLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgXy5kaWZmZXJlbmNlKGEuc3JjRGlyMlBhY2thZ2VzLCBiLnNyY0RpcjJQYWNrYWdlcykubGVuZ3RoID09PSAwICYmXG4gICAgICBfLmRpZmZlcmVuY2UoYi5zcmNEaXIyUGFja2FnZXMsIGEuc3JjRGlyMlBhY2thZ2VzKS5sZW5ndGggPT09IDA7XG4gICAgfSksXG4gICAgYWZ0ZXJDaGFuZ2UgPyBza2lwKDEpIDogbWFwKHMgPT4gcyksXG4gICAgbWFwKHMgPT4ge1xuICAgICAgcHJpbnRQcm9qZWN0cyhzLnByb2plY3QyUGFja2FnZXMsIHMuc3JjRGlyMlBhY2thZ2VzKTtcbiAgICB9KSxcbiAgICB0YWtlKDEpXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvamVjdHMocHJvamVjdHM6IEl0ZXJhYmxlPHN0cmluZz4sIHNyY0RpcnM6IEl0ZXJhYmxlPHN0cmluZz4pIHtcblxuICBsZXQgc3RyID0gJ1Byb2plY3QgZGlyZWN0b3JpZXMnLnRvVXBwZXJDYXNlKCk7XG4gIHN0ciArPSAnXFxuIFxcbic7XG4gIGxldCBpID0gMDtcbiAgZm9yIChsZXQgZGlyIG9mIHByb2plY3RzKSB7XG4gICAgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkaXIpO1xuICAgIHN0ciArPSBfLnBhZEVuZChpICsgMSArICcuICcsIDUsICcgJykgKyBkaXI7XG4gICAgc3RyICs9ICdcXG4nO1xuICAgIGkrKztcbiAgfVxuICBpZiAoaSA9PT0gMCkge1xuICAgIHN0ciArPSAnTm8gcHJvamVjdHMnO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGJveFN0cmluZyhzdHIpKTtcbiAgc3RyID0gJ0xpbmtlZCBzb3VyY2UgZGlyZWN0b3JpZXMnLnRvVXBwZXJDYXNlKCk7XG4gIHN0ciArPSAnXFxuIFxcbic7XG4gIGkgPSAwO1xuXG4gIGZvciAobGV0IGRpciBvZiBzcmNEaXJzKSB7XG4gICAgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkaXIpO1xuICAgIHN0ciArPSBfLnBhZEVuZChpICsgMSArICcuICcsIDUsICcgJykgKyBkaXI7XG4gICAgc3RyICs9ICdcXG4nO1xuICAgIGkrKztcbiAgfVxuICBpZiAoaSA9PT0gMCkge1xuICAgIHN0ciA9ICdObyBsaW5rZWQgc291cmNlIGRpcmVjdG9yaWVzJztcbiAgfVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhib3hTdHJpbmcoc3RyKSk7XG59XG4iXX0=