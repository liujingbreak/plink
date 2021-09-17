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
const store_1 = require("../store");
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
            store_1.dispatcher.changeActionOnExit('save');
            if (dirs) {
                if (opts.isSrcDir)
                    package_mgr_1.actionDispatcher.addSrcDirs(dirs);
                else
                    package_mgr_1.actionDispatcher.addProject(dirs);
            }
            break;
        case 'remove':
            store_1.dispatcher.changeActionOnExit('save');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOENBQXVFO0FBQ3ZFLGdEQUEwRTtBQUMxRSx3Q0FBc0Q7QUFDdEQsb0NBQThEO0FBQzlELHVDQUF1QztBQUN2QyxrQ0FBa0M7QUFDbEMsTUFBTSxRQUFRLEdBQUcsSUFBQSxpQkFBVSxHQUFFLENBQUM7QUFFOUI7OztHQUdHO0FBQ0gsbUJBQXdCLElBQXlCLEVBQUUsTUFBeUIsRUFBRSxJQUFlO0lBQzNGLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0IsUUFBUSxNQUFNLEVBQUU7UUFDZCxLQUFLLEtBQUs7WUFDUixrQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsRCxJQUFJLElBQUksRUFBRTtnQkFDUixJQUFJLElBQUksQ0FBQyxRQUFRO29CQUNmLDhCQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDOztvQkFFNUIsOEJBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDL0I7WUFDRCxNQUFNO1FBQ1IsS0FBSyxRQUFRO1lBQ1gsa0JBQXNCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsSUFBSSxJQUFJLENBQUMsUUFBUTtvQkFDZiw4QkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7b0JBRS9CLDhCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2xDO1lBQ0QsTUFBTTtRQUNSO1lBQ0UsV0FBVyxFQUFFLENBQUM7S0FDakI7QUFDSCxDQUFDO0FBeEJELDRCQXdCQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxRQUFtQixFQUFFLFdB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QyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEMsR0FBRyxJQUFJLGdCQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDNUMsR0FBRyxJQUFJLElBQUksQ0FBQztRQUNaLENBQUMsRUFBRSxDQUFDO0tBQ0w7SUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDWCxHQUFHLEdBQUcsOEJBQThCLENBQUM7S0FDdEM7SUFDRCxzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGdCQUFTLEVBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBtYXAsIHNraXAsIHRha2UgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ0FjdGlvbnMsIGdldFN0b3JlIH0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgYm94U3RyaW5nLCBnZXRSb290RGlyIH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2Rpc3BhdGNoZXIgYXMgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcn0gZnJvbSAnLi4vc3RvcmUnO1xuLy8gaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5jb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcblxuLyoqXG4gKiBAcGFyYW0gYWN0aW9uIFxuICogQHBhcmFtIGRpcnMgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG9wdHM6IHtpc1NyY0RpcjogYm9vbGVhbn0sIGFjdGlvbj86ICdhZGQnIHwgJ3JlbW92ZScsIGRpcnM/OiBzdHJpbmdbXSkge1xuICBsaXN0UHJvamVjdCh1bmRlZmluZWQsIHRydWUpO1xuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2FkZCc6XG4gICAgICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnc2F2ZScpO1xuICAgICAgaWYgKGRpcnMpIHtcbiAgICAgICAgaWYgKG9wdHMuaXNTcmNEaXIpXG4gICAgICAgICAgcGtnQWN0aW9ucy5hZGRTcmNEaXJzKGRpcnMpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcGtnQWN0aW9ucy5hZGRQcm9qZWN0KGRpcnMpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmVtb3ZlJzpcbiAgICAgIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdzYXZlJyk7XG4gICAgICBpZiAoZGlycykge1xuICAgICAgICBpZiAob3B0cy5pc1NyY0RpcilcbiAgICAgICAgICBwa2dBY3Rpb25zLmRlbGV0ZVNyY0RpcnMoZGlycyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwa2dBY3Rpb25zLmRlbGV0ZVByb2plY3QoZGlycyk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgbGlzdFByb2plY3QoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFByb2plY3QocHJvamVjdHM/OiBzdHJpbmdbXSwgYWZ0ZXJDaGFuZ2UgPSBmYWxzZSkge1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKGEsIGIpID0+IGEucHJvamVjdDJQYWNrYWdlcyA9PT0gYi5wcm9qZWN0MlBhY2thZ2VzICYmXG4gICAgICBhLnNyY0RpcjJQYWNrYWdlcyA9PT0gYi5zcmNEaXIyUGFja2FnZXMpLFxuICAgIG1hcChzID0+ICh7cHJvamVjdDJQYWNrYWdlczogWy4uLnMucHJvamVjdDJQYWNrYWdlcy5rZXlzKCldLCBzcmNEaXIyUGFja2FnZXM6IFsuLi5zLnNyY0RpcjJQYWNrYWdlcy5rZXlzKCldfSkpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChhLCBiKSA9PiB7XG4gICAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGEucHJvamVjdDJQYWNrYWdlcywgYi5wcm9qZWN0MlBhY2thZ2VzKS5sZW5ndGggPT09IDAgJiZcbiAgICAgIF8uZGlmZmVyZW5jZShiLnByb2plY3QyUGFja2FnZXMsIGEucHJvamVjdDJQYWNrYWdlcykubGVuZ3RoID09PSAwICYmXG4gICAgICBfLmRpZmZlcmVuY2UoYS5zcmNEaXIyUGFja2FnZXMsIGIuc3JjRGlyMlBhY2thZ2VzKS5sZW5ndGggPT09IDAgJiZcbiAgICAgIF8uZGlmZmVyZW5jZShiLnNyY0RpcjJQYWNrYWdlcywgYS5zcmNEaXIyUGFja2FnZXMpLmxlbmd0aCA9PT0gMDtcbiAgICB9KSxcbiAgICBhZnRlckNoYW5nZSA/IHNraXAoMSkgOiBtYXAocyA9PiBzKSxcbiAgICBtYXAocyA9PiB7XG4gICAgICBwcmludFByb2plY3RzKHMucHJvamVjdDJQYWNrYWdlcywgcy5zcmNEaXIyUGFja2FnZXMpO1xuICAgIH0pLFxuICAgIHRha2UoMSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9qZWN0cyhwcm9qZWN0czogSXRlcmFibGU8c3RyaW5nPiwgc3JjRGlyczogSXRlcmFibGU8c3RyaW5nPikge1xuXG4gIGxldCBzdHIgPSAnUHJvamVjdCBkaXJlY3RvcmllcycudG9VcHBlckNhc2UoKTtcbiAgc3RyICs9ICdcXG4gXFxuJztcbiAgbGV0IGkgPSAwO1xuICBmb3IgKGxldCBkaXIgb2YgcHJvamVjdHMpIHtcbiAgICBkaXIgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGRpcik7XG4gICAgc3RyICs9IF8ucGFkRW5kKGkgKyAxICsgJy4gJywgNSwgJyAnKSArIGRpcjtcbiAgICBzdHIgKz0gJ1xcbic7XG4gICAgaSsrO1xuICB9XG4gIGlmIChpID09PSAwKSB7XG4gICAgc3RyICs9ICdObyBwcm9qZWN0cyc7XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYm94U3RyaW5nKHN0cikpO1xuICBzdHIgPSAnTGlua2VkIHNvdXJjZSBkaXJlY3RvcmllcycudG9VcHBlckNhc2UoKTtcbiAgc3RyICs9ICdcXG4gXFxuJztcbiAgaSA9IDA7XG5cbiAgZm9yIChsZXQgZGlyIG9mIHNyY0RpcnMpIHtcbiAgICBkaXIgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGRpcik7XG4gICAgc3RyICs9IF8ucGFkRW5kKGkgKyAxICsgJy4gJywgNSwgJyAnKSArIGRpcjtcbiAgICBzdHIgKz0gJ1xcbic7XG4gICAgaSsrO1xuICB9XG4gIGlmIChpID09PSAwKSB7XG4gICAgc3RyID0gJ05vIGxpbmtlZCBzb3VyY2UgZGlyZWN0b3JpZXMnO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGJveFN0cmluZyhzdHIpKTtcbn1cbiJdfQ==