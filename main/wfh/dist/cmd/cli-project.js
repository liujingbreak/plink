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
        yield config_1.default.init({ config: [], prop: [] });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOENBQThFO0FBQzlFLGdEQUEwRTtBQUMxRSx3Q0FBc0Q7QUFDdEQsdUNBQXVDO0FBQ3ZDLHVEQUErQjtBQUMvQixNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFFOUI7OztHQUdHO0FBQ0gsbUJBQThCLE1BQXlCLEVBQUUsSUFBZTs7UUFDdEUsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFDMUMsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixpQkFBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDakQsZUFBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDNUQsMERBQTBEO1FBQzFELGdDQUFvQixDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFDdEcsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDYiwwQ0FBMEM7WUFDMUMsb0ZBQW9GO1lBQ3BGLDhEQUE4RDtZQUM5RCxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLFFBQVEsTUFBTSxFQUFFO1lBQ2QsS0FBSyxLQUFLO2dCQUNSLElBQUksSUFBSTtvQkFDTixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25CLE1BQU07WUFDUixLQUFLLFFBQVE7Z0JBQ1gsSUFBSSxJQUFJO29CQUNOLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEIsTUFBTTtZQUNSO2dCQUNFLFdBQVcsRUFBRSxDQUFDO1NBQ2pCO0lBQ0gsQ0FBQztDQUFBO0FBM0JELDRCQTJCQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQWM7SUFDbkMsOEJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsdUVBQXVFO0lBQ3ZFLHdDQUF3QztJQUN4Qyw0Q0FBNEM7SUFDNUMsMERBQTBEO0lBQzFELCtFQUErRTtJQUMvRSxpRUFBaUU7SUFDakUsa0RBQWtEO0lBQ2xELHFDQUFxQztJQUNyQyw0REFBNEQ7SUFDNUQsdUJBQXVCO0lBQ3ZCLElBQUk7QUFDTixDQUFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLFFBQW1CO0lBQzdDLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDcEQsZUFBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQ2pCLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLEVBQ0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsQ0FDUixDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFSRCxrQ0FRQztBQUVELFNBQVMsYUFBYSxDQUFDLFFBQWtCO0lBQ3ZDLDhDQUE4QztJQUM5QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3pCLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNyQyxPQUFPO0tBQ1I7U0FBTTtRQUNMLElBQUksR0FBRyxHQUFHLGdCQUFDLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqRCxHQUFHLElBQUksT0FBTyxDQUFDO1FBQ2YsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFCLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsQyxHQUFHLElBQUksZ0JBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUM1QyxHQUFHLElBQUksSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDN0I7QUFDSCxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsSUFBYztJQUNoQyw4QkFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBtYXAsIHNraXAsIHRha2UsIHBsdWNrIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBwa2dBY3Rpb25zLCBnZXRTdG9yZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGJveFN0cmluZywgZ2V0Um9vdERpciB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5jb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcblxuLyoqXG4gKiBAcGFyYW0gYWN0aW9uIFxuICogQHBhcmFtIGRpcnMgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKGFjdGlvbj86ICdhZGQnIHwgJ3JlbW92ZScsIGRpcnM/OiBzdHJpbmdbXSkge1xuICBhd2FpdCBjb25maWcuaW5pdCh7Y29uZmlnOiBbXSwgcHJvcDogW119KTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIHBsdWNrKCdwcm9qZWN0MlBhY2thZ2VzJyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3QyUGFja2FnZXMgPT4gQXJyYXkuZnJvbShwcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkpLFxuICAgIC8vIHRhcChwcm9qZWN0MlBhY2thZ2VzID0+IGNvbnNvbGUubG9nKHByb2plY3QyUGFja2FnZXMpKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoa2V5czEsIGtleXMyKSA9PiBrZXlzMS5sZW5ndGggPT09IGtleXMyLmxlbmd0aCAmJiBrZXlzMS5qb2luKCkgPT09IGtleXMyLmpvaW4oKSksXG4gICAgc2tpcCgxKSxcbiAgICBtYXAocHJvamVjdHMgPT4ge1xuICAgICAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAvLyBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ1Byb2plY3QgbGlzdCBpcyB1cGRhdGVkLCB5b3UgbmVlZCB0byBydW5cXG5cXHRkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICcgdG8gaW5zdGFsbCBuZXcgZGVwZW5kZW5jaWVzIGZyb20gdGhlIG5ldyBwcm9qZWN0LicsIDYwKSk7XG4gICAgICBwcmludFByb2plY3RzKHByb2plY3RzKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2FkZCc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgYWRkUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JlbW92ZSc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgcmVtb3ZlUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBsaXN0UHJvamVjdCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVByb2plY3QoZGlyczogc3RyaW5nW10pIHtcbiAgcGtnQWN0aW9ucy5kZWxldGVQcm9qZWN0KGRpcnMpO1xuICAvLyBjb25zdCBwcm9qZWN0TGlzdEZpbGUgPSBQYXRoLmpvaW4ocm9vdFBhdGgsICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuICAvLyBpZiAoZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKSB7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgY29uc29sZS5sb2coJ1JlbW92aW5nIHByb2plY3Q6ICVzJywgZGlycy5qb2luKCcsICcpKTtcbiAgLy8gICBsZXQgcHJqczogc3RyaW5nW10gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwcm9qZWN0TGlzdEZpbGUsICd1dGY4JykpO1xuICAvLyAgIHByanMgPSBfLmRpZmZlcmVuY2VCeShwcmpzLCBkaXJzLCBkaXIgPT4gUGF0aC5yZXNvbHZlKGRpcikpO1xuICAvLyAgIGNvbnN0IHN0ciA9IEpTT04uc3RyaW5naWZ5KHByanMsIG51bGwsICcgICcpO1xuICAvLyAgIHdyaXRlRmlsZShwcm9qZWN0TGlzdEZpbGUsIHN0cik7XG4gIC8vICAgZGVsZXRlIHJlcXVpcmUuY2FjaGVbcmVxdWlyZS5yZXNvbHZlKHByb2plY3RMaXN0RmlsZSldO1xuICAvLyAgIGxpc3RQcm9qZWN0KHByanMpO1xuICAvLyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UHJvamVjdChwcm9qZWN0cz86IHN0cmluZ1tdKSB7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnByb2plY3QyUGFja2FnZXMpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChwcm9qZWN0czJwa3MgPT4ge1xuICAgICAgcHJpbnRQcm9qZWN0cyhBcnJheS5mcm9tKHByb2plY3RzMnBrcy5rZXlzKCkpKTtcbiAgICB9KSxcbiAgICB0YWtlKDEpXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIC8vIGNvbnN0IHByb2plY3RzID0gT2JqZWN0LmtleXMocHJvamVjdHMycGtzKTtcbiAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnTm8gcHJvamVjdCcpKTtcbiAgICByZXR1cm47XG4gIH0gZWxzZSB7XG4gICAgbGV0IHN0ciA9IF8ucGFkKCcgUHJvamVjdHMgZGlyZWN0b3J5ICcsIDQwLCAnICcpO1xuICAgIHN0ciArPSAnXFxuIFxcbic7XG4gICAgXy5lYWNoKHByb2plY3RzLCAoZGlyLCBpKSA9PiB7XG4gICAgICBkaXIgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGRpcik7XG4gICAgICBzdHIgKz0gXy5wYWRFbmQoaSArIDEgKyAnLiAnLCA1LCAnICcpICsgZGlyO1xuICAgICAgc3RyICs9ICdcXG4nO1xuICAgIH0pO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhzdHIpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRQcm9qZWN0KGRpcnM6IHN0cmluZ1tdKSB7XG4gIHBrZ0FjdGlvbnMuYWRkUHJvamVjdChkaXJzKTtcbn1cblxuIl19