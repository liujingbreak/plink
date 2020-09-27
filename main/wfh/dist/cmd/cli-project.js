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
exports.listProject = void 0;
// import fs from 'fs-extra';
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const operators_1 = require("rxjs/operators");
const package_mgr_1 = require("../package-mgr");
const misc_1 = require("../utils/misc");
// import { writeFile } from './utils';
const config_1 = __importDefault(require("../config"));
const rootPath = misc_1.getRootDir();
/**
 * @param action
 * @param dirs
 */
function default_1(action, dirs) {
    return __awaiter(this, void 0, void 0, function* () {
        yield config_1.default.init({ config: [], prop: [], logStat: false });
        package_mgr_1.getStore().pipe(operators_1.pluck('project2Packages'), operators_1.distinctUntilChanged(), operators_1.map(project2Packages => Array.from(project2Packages.keys())), 
        // tap(project2Packages => console.log(project2Packages)),
        operators_1.distinctUntilChanged((keys1, keys2) => keys1.length === keys2.length && keys1.join() === keys2.join()), operators_1.skip(1), operators_1.map(projects => {
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
        printProjects(Array.from(projects2pks.keys()));
    }), operators_1.take(1)).subscribe();
}
exports.listProject = listProject;
function printProjects(projects) {
    // const projects = Object.keys(projects2pks);
    if (projects.length === 0) {
        // tslint:disable-next-line: no-console
        console.log(misc_1.boxString('No project'));
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
        console.log(misc_1.boxString(str));
    }
}
function addProject(dirs) {
    package_mgr_1.actionDispatcher.addProject(dirs);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOENBQThFO0FBQzlFLGdEQUEwRTtBQUMxRSx3Q0FBc0Q7QUFDdEQsdUNBQXVDO0FBQ3ZDLHVEQUErQjtBQUMvQixNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFFOUI7OztHQUdHO0FBQ0gsbUJBQThCLE1BQXlCLEVBQUUsSUFBZTs7UUFDdEUsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztRQUMxRCxzQkFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLGlCQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxnQ0FBb0IsRUFBRSxFQUNqRCxlQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM1RCwwREFBMEQ7UUFDMUQsZ0NBQW9CLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUN0RyxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNiLDBDQUEwQztZQUMxQyxvRkFBb0Y7WUFDcEYsOERBQThEO1lBQzlELGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2QsUUFBUSxNQUFNLEVBQUU7WUFDZCxLQUFLLEtBQUs7Z0JBQ1IsSUFBSSxJQUFJO29CQUNOLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkIsTUFBTTtZQUNSLEtBQUssUUFBUTtnQkFDWCxJQUFJLElBQUk7b0JBQ04sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixNQUFNO1lBQ1I7Z0JBQ0UsV0FBVyxFQUFFLENBQUM7U0FDakI7SUFDSCxDQUFDO0NBQUE7QUEzQkQsNEJBMkJDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBYztJQUNuQyw4QkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQix1RUFBdUU7SUFDdkUsd0NBQXdDO0lBQ3hDLDRDQUE0QztJQUM1QywwREFBMEQ7SUFDMUQsK0VBQStFO0lBQy9FLGlFQUFpRTtJQUNqRSxrREFBa0Q7SUFDbEQscUNBQXFDO0lBQ3JDLDREQUE0RDtJQUM1RCx1QkFBdUI7SUFDdkIsSUFBSTtBQUNOLENBQUM7QUFFRCxTQUFnQixXQUFXLENBQUMsUUFBbUI7SUFDN0Msc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxnQ0FBb0IsRUFBRSxFQUNwRCxlQUFHLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDakIsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUMsRUFDRixnQkFBSSxDQUFDLENBQUMsQ0FBQyxDQUNSLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQVJELGtDQVFDO0FBRUQsU0FBUyxhQUFhLENBQUMsUUFBa0I7SUFDdkMsOENBQThDO0lBQzlDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekIsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU87S0FDUjtTQUFNO1FBQ0wsSUFBSSxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDZixnQkFBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUIsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLEdBQUcsSUFBSSxnQkFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQzVDLEdBQUcsSUFBSSxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3QjtBQUNILENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUFjO0lBQ2hDLDhCQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgc2tpcCwgdGFrZSwgcGx1Y2sgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBhY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ0FjdGlvbnMsIGdldFN0b3JlIH0gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgYm94U3RyaW5nLCBnZXRSb290RGlyIH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG4vLyBpbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmNvbnN0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuXG4vKipcbiAqIEBwYXJhbSBhY3Rpb24gXG4gKiBAcGFyYW0gZGlycyBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oYWN0aW9uPzogJ2FkZCcgfCAncmVtb3ZlJywgZGlycz86IHN0cmluZ1tdKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KHtjb25maWc6IFtdLCBwcm9wOiBbXSwgbG9nU3RhdDogZmFsc2V9KTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIHBsdWNrKCdwcm9qZWN0MlBhY2thZ2VzJyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3QyUGFja2FnZXMgPT4gQXJyYXkuZnJvbShwcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkpLFxuICAgIC8vIHRhcChwcm9qZWN0MlBhY2thZ2VzID0+IGNvbnNvbGUubG9nKHByb2plY3QyUGFja2FnZXMpKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoa2V5czEsIGtleXMyKSA9PiBrZXlzMS5sZW5ndGggPT09IGtleXMyLmxlbmd0aCAmJiBrZXlzMS5qb2luKCkgPT09IGtleXMyLmpvaW4oKSksXG4gICAgc2tpcCgxKSxcbiAgICBtYXAocHJvamVjdHMgPT4ge1xuICAgICAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAvLyBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ1Byb2plY3QgbGlzdCBpcyB1cGRhdGVkLCB5b3UgbmVlZCB0byBydW5cXG5cXHRkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICcgdG8gaW5zdGFsbCBuZXcgZGVwZW5kZW5jaWVzIGZyb20gdGhlIG5ldyBwcm9qZWN0LicsIDYwKSk7XG4gICAgICBwcmludFByb2plY3RzKHByb2plY3RzKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2FkZCc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgYWRkUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JlbW92ZSc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgcmVtb3ZlUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBsaXN0UHJvamVjdCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVByb2plY3QoZGlyczogc3RyaW5nW10pIHtcbiAgcGtnQWN0aW9ucy5kZWxldGVQcm9qZWN0KGRpcnMpO1xuICAvLyBjb25zdCBwcm9qZWN0TGlzdEZpbGUgPSBQYXRoLmpvaW4ocm9vdFBhdGgsICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuICAvLyBpZiAoZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKSB7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgY29uc29sZS5sb2coJ1JlbW92aW5nIHByb2plY3Q6ICVzJywgZGlycy5qb2luKCcsICcpKTtcbiAgLy8gICBsZXQgcHJqczogc3RyaW5nW10gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwcm9qZWN0TGlzdEZpbGUsICd1dGY4JykpO1xuICAvLyAgIHByanMgPSBfLmRpZmZlcmVuY2VCeShwcmpzLCBkaXJzLCBkaXIgPT4gUGF0aC5yZXNvbHZlKGRpcikpO1xuICAvLyAgIGNvbnN0IHN0ciA9IEpTT04uc3RyaW5naWZ5KHByanMsIG51bGwsICcgICcpO1xuICAvLyAgIHdyaXRlRmlsZShwcm9qZWN0TGlzdEZpbGUsIHN0cik7XG4gIC8vICAgZGVsZXRlIHJlcXVpcmUuY2FjaGVbcmVxdWlyZS5yZXNvbHZlKHByb2plY3RMaXN0RmlsZSldO1xuICAvLyAgIGxpc3RQcm9qZWN0KHByanMpO1xuICAvLyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UHJvamVjdChwcm9qZWN0cz86IHN0cmluZ1tdKSB7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnByb2plY3QyUGFja2FnZXMpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChwcm9qZWN0czJwa3MgPT4ge1xuICAgICAgcHJpbnRQcm9qZWN0cyhBcnJheS5mcm9tKHByb2plY3RzMnBrcy5rZXlzKCkpKTtcbiAgICB9KSxcbiAgICB0YWtlKDEpXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIC8vIGNvbnN0IHByb2plY3RzID0gT2JqZWN0LmtleXMocHJvamVjdHMycGtzKTtcbiAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnTm8gcHJvamVjdCcpKTtcbiAgICByZXR1cm47XG4gIH0gZWxzZSB7XG4gICAgbGV0IHN0ciA9IF8ucGFkKCcgUHJvamVjdHMgZGlyZWN0b3J5ICcsIDQwLCAnICcpO1xuICAgIHN0ciArPSAnXFxuIFxcbic7XG4gICAgXy5lYWNoKHByb2plY3RzLCAoZGlyLCBpKSA9PiB7XG4gICAgICBkaXIgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGRpcik7XG4gICAgICBzdHIgKz0gXy5wYWRFbmQoaSArIDEgKyAnLiAnLCA1LCAnICcpICsgZGlyO1xuICAgICAgc3RyICs9ICdcXG4nO1xuICAgIH0pO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhzdHIpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRQcm9qZWN0KGRpcnM6IHN0cmluZ1tdKSB7XG4gIHBrZ0FjdGlvbnMuYWRkUHJvamVjdChkaXJzKTtcbn1cblxuIl19