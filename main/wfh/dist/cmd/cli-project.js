"use strict";
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
// import fs from 'fs-extra';
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const operators_1 = require("rxjs/operators");
const package_mgr_1 = require("../package-mgr");
const utils_1 = require("../utils");
// import { writeFile } from './utils';
const config_1 = __importDefault(require("../config"));
const rootPath = utils_1.getRootDir();
/**
 * @param action
 * @param dirs
 */
function default_1(action, dirs) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init({ config: [], prop: [], logStat: false });
        package_mgr_1.getStore().pipe(operators_1.pluck('project2Packages'), operators_1.distinctUntilChanged(), operators_1.map(project2Packages => Object.keys(project2Packages)), operators_1.distinctUntilChanged((keys1, keys2) => keys1.join() === keys2.join()), operators_1.skip(1), operators_1.map(projects => {
            // // tslint:disable-next-line: no-console
            // console.log(boxString('Project list is updated, you need to run\n\tdrcp init\n' +
            // ' to install new dependencies from the new project.', 60));
            printProjects(projects);
        })).subscribe();
        switch (action) {
            case 'add':
                if (dirs)
                    addProject(dirs);
                break;
            case 'remove':
                if (dirs)
                    removeProject(dirs);
                break;
            default:
                listProject();
        }
    });
}
exports.default = default_1;
function removeProject(dirs) {
    package_mgr_1.actionDispatcher.deleteProject(dirs);
    // const projectListFile = Path.join(rootPath, 'dr.project.list.json');
    // if (fs.existsSync(projectListFile)) {
    //   // tslint:disable-next-line: no-console
    //   console.log('Removing project: %s', dirs.join(', '));
    //   let prjs: string[] = JSON.parse(fs.readFileSync(projectListFile, 'utf8'));
    //   prjs = _.differenceBy(prjs, dirs, dir => Path.resolve(dir));
    //   const str = JSON.stringify(prjs, null, '  ');
    //   writeFile(projectListFile, str);
    //   delete require.cache[require.resolve(projectListFile)];
    //   listProject(prjs);
    // }
}
function listProject(projects) {
    package_mgr_1.getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.map(projects2pks => {
        printProjects(Object.keys(projects2pks));
    }), operators_1.take(1)).subscribe();
}
function printProjects(projects) {
    // const projects = Object.keys(projects2pks);
    if (projects.length === 0) {
        // tslint:disable-next-line: no-console
        console.log(utils_1.boxString('No project'));
        return;
    }
    else {
        let str = lodash_1.default.pad(' Projects directory ', 40, ' ');
        str += '\n \n';
        lodash_1.default.each(projects, (dir, i) => {
            dir = path_1.default.resolve(rootPath, dir);
            str += lodash_1.default.padEnd(i + 1 + '. ', 5, ' ') + dir;
            str += '\n';
        });
        // tslint:disable-next-line: no-console
        console.log(utils_1.boxString(str));
    }
}
function addProject(dirs) {
    package_mgr_1.actionDispatcher.addProject(dirs);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0Isb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4Q0FBOEU7QUFDOUUsZ0RBQTBFO0FBQzFFLG9DQUFpRDtBQUNqRCx1Q0FBdUM7QUFDdkMsdURBQStCO0FBQy9CLE1BQU0sUUFBUSxHQUFHLGtCQUFVLEVBQUUsQ0FBQztBQUU5Qjs7O0dBR0c7QUFDSCxtQkFBOEIsTUFBeUIsRUFBRSxJQUFlOztRQUN0RSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQzFELHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsaUJBQUssQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGdDQUFvQixFQUFFLEVBQ2pELGVBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQ3RELGdDQUFvQixDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUNyRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNiLDBDQUEwQztZQUMxQyxvRkFBb0Y7WUFDcEYsOERBQThEO1lBQzlELGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2QsUUFBUSxNQUFNLEVBQUU7WUFDZCxLQUFLLEtBQUs7Z0JBQ1IsSUFBSSxJQUFJO29CQUNOLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkIsTUFBTTtZQUNSLEtBQUssUUFBUTtnQkFDWCxJQUFJLElBQUk7b0JBQ04sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixNQUFNO1lBQ1I7Z0JBQ0UsV0FBVyxFQUFFLENBQUM7U0FDakI7SUFDSCxDQUFDO0NBQUE7QUExQkQsNEJBMEJDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBYztJQUNuQyw4QkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQix1RUFBdUU7SUFDdkUsd0NBQXdDO0lBQ3hDLDRDQUE0QztJQUM1QywwREFBMEQ7SUFDMUQsK0VBQStFO0lBQy9FLGlFQUFpRTtJQUNqRSxrREFBa0Q7SUFDbEQscUNBQXFDO0lBQ3JDLDREQUE0RDtJQUM1RCx1QkFBdUI7SUFDdkIsSUFBSTtBQUNOLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxRQUFtQjtJQUN0QyxzQkFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGdDQUFvQixFQUFFLEVBQ3BELGVBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUNqQixhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxFQUNGLGdCQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsUUFBa0I7SUFDdkMsOENBQThDO0lBQzlDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekIsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU87S0FDUjtTQUFNO1FBQ0wsSUFBSSxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDZixnQkFBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUIsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLEdBQUcsSUFBSSxnQkFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQzVDLEdBQUcsSUFBSSxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3QjtBQUNILENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUFjO0lBQ2hDLDhCQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgc2tpcCwgdGFrZSwgcGx1Y2sgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ0FjdGlvbnMsIGdldFN0b3JlIH0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgYm94U3RyaW5nLCBnZXRSb290RGlyIH0gZnJvbSAnLi4vdXRpbHMnO1xuLy8gaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5jb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcblxuLyoqXG4gKiBAcGFyYW0gYWN0aW9uIFxuICogQHBhcmFtIGRpcnMgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKGFjdGlvbj86ICdhZGQnIHwgJ3JlbW92ZScsIGRpcnM/OiBzdHJpbmdbXSkge1xuICBhd2FpdCBjb25maWcuaW5pdCh7Y29uZmlnOiBbXSwgcHJvcDogW10sIGxvZ1N0YXQ6IGZhbHNlfSk7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBwbHVjaygncHJvamVjdDJQYWNrYWdlcycpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChwcm9qZWN0MlBhY2thZ2VzID0+IE9iamVjdC5rZXlzKHByb2plY3QyUGFja2FnZXMpKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoa2V5czEsIGtleXMyKSA9PiBrZXlzMS5qb2luKCkgPT09IGtleXMyLmpvaW4oKSksXG4gICAgc2tpcCgxKSxcbiAgICBtYXAocHJvamVjdHMgPT4ge1xuICAgICAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAvLyBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ1Byb2plY3QgbGlzdCBpcyB1cGRhdGVkLCB5b3UgbmVlZCB0byBydW5cXG5cXHRkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICcgdG8gaW5zdGFsbCBuZXcgZGVwZW5kZW5jaWVzIGZyb20gdGhlIG5ldyBwcm9qZWN0LicsIDYwKSk7XG4gICAgICBwcmludFByb2plY3RzKHByb2plY3RzKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2FkZCc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgYWRkUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JlbW92ZSc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgcmVtb3ZlUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBsaXN0UHJvamVjdCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVByb2plY3QoZGlyczogc3RyaW5nW10pIHtcbiAgcGtnQWN0aW9ucy5kZWxldGVQcm9qZWN0KGRpcnMpO1xuICAvLyBjb25zdCBwcm9qZWN0TGlzdEZpbGUgPSBQYXRoLmpvaW4ocm9vdFBhdGgsICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuICAvLyBpZiAoZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKSB7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgY29uc29sZS5sb2coJ1JlbW92aW5nIHByb2plY3Q6ICVzJywgZGlycy5qb2luKCcsICcpKTtcbiAgLy8gICBsZXQgcHJqczogc3RyaW5nW10gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwcm9qZWN0TGlzdEZpbGUsICd1dGY4JykpO1xuICAvLyAgIHByanMgPSBfLmRpZmZlcmVuY2VCeShwcmpzLCBkaXJzLCBkaXIgPT4gUGF0aC5yZXNvbHZlKGRpcikpO1xuICAvLyAgIGNvbnN0IHN0ciA9IEpTT04uc3RyaW5naWZ5KHByanMsIG51bGwsICcgICcpO1xuICAvLyAgIHdyaXRlRmlsZShwcm9qZWN0TGlzdEZpbGUsIHN0cik7XG4gIC8vICAgZGVsZXRlIHJlcXVpcmUuY2FjaGVbcmVxdWlyZS5yZXNvbHZlKHByb2plY3RMaXN0RmlsZSldO1xuICAvLyAgIGxpc3RQcm9qZWN0KHByanMpO1xuICAvLyB9XG59XG5cbmZ1bmN0aW9uIGxpc3RQcm9qZWN0KHByb2plY3RzPzogc3RyaW5nW10pIHtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3RzMnBrcyA9PiB7XG4gICAgICBwcmludFByb2plY3RzKE9iamVjdC5rZXlzKHByb2plY3RzMnBrcykpO1xuICAgIH0pLFxuICAgIHRha2UoMSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgLy8gY29uc3QgcHJvamVjdHMgPSBPYmplY3Qua2V5cyhwcm9qZWN0czJwa3MpO1xuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKCdObyBwcm9qZWN0JykpO1xuICAgIHJldHVybjtcbiAgfSBlbHNlIHtcbiAgICBsZXQgc3RyID0gXy5wYWQoJyBQcm9qZWN0cyBkaXJlY3RvcnkgJywgNDAsICcgJyk7XG4gICAgc3RyICs9ICdcXG4gXFxuJztcbiAgICBfLmVhY2gocHJvamVjdHMsIChkaXIsIGkpID0+IHtcbiAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZGlyKTtcbiAgICAgIHN0ciArPSBfLnBhZEVuZChpICsgMSArICcuICcsIDUsICcgJykgKyBkaXI7XG4gICAgICBzdHIgKz0gJ1xcbic7XG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKHN0cikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFByb2plY3QoZGlyczogc3RyaW5nW10pIHtcbiAgcGtnQWN0aW9ucy5hZGRQcm9qZWN0KGRpcnMpO1xufVxuXG4iXX0=