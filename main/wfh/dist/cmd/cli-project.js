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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0Isb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4Q0FBOEU7QUFDOUUsZ0RBQTBFO0FBQzFFLG9DQUFpRDtBQUNqRCx1Q0FBdUM7QUFDdkMsdURBQStCO0FBQy9CLE1BQU0sUUFBUSxHQUFHLGtCQUFVLEVBQUUsQ0FBQztBQUU5Qjs7O0dBR0c7QUFDSCxtQkFBOEIsTUFBeUIsRUFBRSxJQUFlOztRQUN0RSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQzFELHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsaUJBQUssQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGdDQUFvQixFQUFFLEVBQ2pELGVBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVELDBEQUEwRDtRQUMxRCxnQ0FBb0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQ3RHLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1AsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2IsMENBQTBDO1lBQzFDLG9GQUFvRjtZQUNwRiw4REFBOEQ7WUFDOUQsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFDZCxRQUFRLE1BQU0sRUFBRTtZQUNkLEtBQUssS0FBSztnQkFDUixJQUFJLElBQUk7b0JBQ04sVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQixNQUFNO1lBQ1IsS0FBSyxRQUFRO2dCQUNYLElBQUksSUFBSTtvQkFDTixhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RCLE1BQU07WUFDUjtnQkFDRSxXQUFXLEVBQUUsQ0FBQztTQUNqQjtJQUNILENBQUM7Q0FBQTtBQTNCRCw0QkEyQkM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFjO0lBQ25DLDhCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLHVFQUF1RTtJQUN2RSx3Q0FBd0M7SUFDeEMsNENBQTRDO0lBQzVDLDBEQUEwRDtJQUMxRCwrRUFBK0U7SUFDL0UsaUVBQWlFO0lBQ2pFLGtEQUFrRDtJQUNsRCxxQ0FBcUM7SUFDckMsNERBQTREO0lBQzVELHVCQUF1QjtJQUN2QixJQUFJO0FBQ04sQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLFFBQW1CO0lBQ3RDLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDcEQsZUFBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQ2pCLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLEVBQ0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsQ0FDUixDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxRQUFrQjtJQUN2Qyw4Q0FBOEM7SUFDOUMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN6Qix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTztLQUNSO1NBQU07UUFDTCxJQUFJLEdBQUcsR0FBRyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDakQsR0FBRyxJQUFJLE9BQU8sQ0FBQztRQUNmLGdCQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEMsR0FBRyxJQUFJLGdCQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDNUMsR0FBRyxJQUFJLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzdCO0FBQ0gsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLElBQWM7SUFDaEMsOEJBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCBza2lwLCB0YWtlLCBwbHVjayB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgcGtnQWN0aW9ucywgZ2V0U3RvcmUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBib3hTdHJpbmcsIGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscyc7XG4vLyBpbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmNvbnN0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuXG4vKipcbiAqIEBwYXJhbSBhY3Rpb24gXG4gKiBAcGFyYW0gZGlycyBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oYWN0aW9uPzogJ2FkZCcgfCAncmVtb3ZlJywgZGlycz86IHN0cmluZ1tdKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KHtjb25maWc6IFtdLCBwcm9wOiBbXSwgbG9nU3RhdDogZmFsc2V9KTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIHBsdWNrKCdwcm9qZWN0MlBhY2thZ2VzJyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3QyUGFja2FnZXMgPT4gQXJyYXkuZnJvbShwcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkpLFxuICAgIC8vIHRhcChwcm9qZWN0MlBhY2thZ2VzID0+IGNvbnNvbGUubG9nKHByb2plY3QyUGFja2FnZXMpKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoa2V5czEsIGtleXMyKSA9PiBrZXlzMS5sZW5ndGggPT09IGtleXMyLmxlbmd0aCAmJiBrZXlzMS5qb2luKCkgPT09IGtleXMyLmpvaW4oKSksXG4gICAgc2tpcCgxKSxcbiAgICBtYXAocHJvamVjdHMgPT4ge1xuICAgICAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAvLyBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ1Byb2plY3QgbGlzdCBpcyB1cGRhdGVkLCB5b3UgbmVlZCB0byBydW5cXG5cXHRkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICcgdG8gaW5zdGFsbCBuZXcgZGVwZW5kZW5jaWVzIGZyb20gdGhlIG5ldyBwcm9qZWN0LicsIDYwKSk7XG4gICAgICBwcmludFByb2plY3RzKHByb2plY3RzKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICBzd2l0Y2ggKGFjdGlvbikge1xuICAgIGNhc2UgJ2FkZCc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgYWRkUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JlbW92ZSc6XG4gICAgICBpZiAoZGlycylcbiAgICAgICAgcmVtb3ZlUHJvamVjdChkaXJzKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBsaXN0UHJvamVjdCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVByb2plY3QoZGlyczogc3RyaW5nW10pIHtcbiAgcGtnQWN0aW9ucy5kZWxldGVQcm9qZWN0KGRpcnMpO1xuICAvLyBjb25zdCBwcm9qZWN0TGlzdEZpbGUgPSBQYXRoLmpvaW4ocm9vdFBhdGgsICdkci5wcm9qZWN0Lmxpc3QuanNvbicpO1xuICAvLyBpZiAoZnMuZXhpc3RzU3luYyhwcm9qZWN0TGlzdEZpbGUpKSB7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgY29uc29sZS5sb2coJ1JlbW92aW5nIHByb2plY3Q6ICVzJywgZGlycy5qb2luKCcsICcpKTtcbiAgLy8gICBsZXQgcHJqczogc3RyaW5nW10gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwcm9qZWN0TGlzdEZpbGUsICd1dGY4JykpO1xuICAvLyAgIHByanMgPSBfLmRpZmZlcmVuY2VCeShwcmpzLCBkaXJzLCBkaXIgPT4gUGF0aC5yZXNvbHZlKGRpcikpO1xuICAvLyAgIGNvbnN0IHN0ciA9IEpTT04uc3RyaW5naWZ5KHByanMsIG51bGwsICcgICcpO1xuICAvLyAgIHdyaXRlRmlsZShwcm9qZWN0TGlzdEZpbGUsIHN0cik7XG4gIC8vICAgZGVsZXRlIHJlcXVpcmUuY2FjaGVbcmVxdWlyZS5yZXNvbHZlKHByb2plY3RMaXN0RmlsZSldO1xuICAvLyAgIGxpc3RQcm9qZWN0KHByanMpO1xuICAvLyB9XG59XG5cbmZ1bmN0aW9uIGxpc3RQcm9qZWN0KHByb2plY3RzPzogc3RyaW5nW10pIHtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3RzMnBrcyA9PiB7XG4gICAgICBwcmludFByb2plY3RzKEFycmF5LmZyb20ocHJvamVjdHMycGtzLmtleXMoKSkpO1xuICAgIH0pLFxuICAgIHRha2UoMSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgLy8gY29uc3QgcHJvamVjdHMgPSBPYmplY3Qua2V5cyhwcm9qZWN0czJwa3MpO1xuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKCdObyBwcm9qZWN0JykpO1xuICAgIHJldHVybjtcbiAgfSBlbHNlIHtcbiAgICBsZXQgc3RyID0gXy5wYWQoJyBQcm9qZWN0cyBkaXJlY3RvcnkgJywgNDAsICcgJyk7XG4gICAgc3RyICs9ICdcXG4gXFxuJztcbiAgICBfLmVhY2gocHJvamVjdHMsIChkaXIsIGkpID0+IHtcbiAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZGlyKTtcbiAgICAgIHN0ciArPSBfLnBhZEVuZChpICsgMSArICcuICcsIDUsICcgJykgKyBkaXI7XG4gICAgICBzdHIgKz0gJ1xcbic7XG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKHN0cikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFByb2plY3QoZGlyczogc3RyaW5nW10pIHtcbiAgcGtnQWN0aW9ucy5hZGRQcm9qZWN0KGRpcnMpO1xufVxuXG4iXX0=