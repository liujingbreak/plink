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
// import config from '../config';
const rootPath = misc_1.getRootDir();
/**
 * @param action
 * @param dirs
 */
function default_1(action, dirs) {
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOENBQThFO0FBQzlFLGdEQUEwRTtBQUMxRSx3Q0FBc0Q7QUFDdEQsdUNBQXVDO0FBQ3ZDLGtDQUFrQztBQUNsQyxNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFFOUI7OztHQUdHO0FBQ0gsbUJBQThCLE1BQXlCLEVBQUUsSUFBZTs7UUFDdEUsc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixpQkFBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDakQsZUFBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDNUQsMERBQTBEO1FBQzFELGdDQUFvQixDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFDdEcsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDYiwwQ0FBMEM7WUFDMUMsb0ZBQW9GO1lBQ3BGLDhEQUE4RDtZQUM5RCxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLFFBQVEsTUFBTSxFQUFFO1lBQ2QsS0FBSyxLQUFLO2dCQUNSLElBQUksSUFBSTtvQkFDTixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25CLE1BQU07WUFDUixLQUFLLFFBQVE7Z0JBQ1gsSUFBSSxJQUFJO29CQUNOLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEIsTUFBTTtZQUNSO2dCQUNFLFdBQVcsRUFBRSxDQUFDO1NBQ2pCO0lBQ0gsQ0FBQztDQUFBO0FBMUJELDRCQTBCQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQWM7SUFDbkMsOEJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsdUVBQXVFO0lBQ3ZFLHdDQUF3QztJQUN4Qyw0Q0FBNEM7SUFDNUMsMERBQTBEO0lBQzFELCtFQUErRTtJQUMvRSxpRUFBaUU7SUFDakUsa0RBQWtEO0lBQ2xELHFDQUFxQztJQUNyQyw0REFBNEQ7SUFDNUQsdUJBQXVCO0lBQ3ZCLElBQUk7QUFDTixDQUFDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLFFBQW1CO0lBQzdDLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDcEQsZUFBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQ2pCLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLEVBQ0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsQ0FDUixDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFSRCxrQ0FRQztBQUVELFNBQVMsYUFBYSxDQUFDLFFBQWtCO0lBQ3ZDLDhDQUE4QztJQUM5QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3pCLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNyQyxPQUFPO0tBQ1I7U0FBTTtRQUNMLElBQUksR0FBRyxHQUFHLGdCQUFDLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqRCxHQUFHLElBQUksT0FBTyxDQUFDO1FBQ2YsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFCLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsQyxHQUFHLElBQUksZ0JBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUM1QyxHQUFHLElBQUksSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDN0I7QUFDSCxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsSUFBYztJQUNoQyw4QkFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBtYXAsIHNraXAsIHRha2UsIHBsdWNrIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgYWN0aW9uRGlzcGF0Y2hlciBhcyBwa2dBY3Rpb25zLCBnZXRTdG9yZSB9IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IGJveFN0cmluZywgZ2V0Um9vdERpciB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5jb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcblxuLyoqXG4gKiBAcGFyYW0gYWN0aW9uIFxuICogQHBhcmFtIGRpcnMgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uKGFjdGlvbj86ICdhZGQnIHwgJ3JlbW92ZScsIGRpcnM/OiBzdHJpbmdbXSkge1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgcGx1Y2soJ3Byb2plY3QyUGFja2FnZXMnKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBtYXAocHJvamVjdDJQYWNrYWdlcyA9PiBBcnJheS5mcm9tKHByb2plY3QyUGFja2FnZXMua2V5cygpKSksXG4gICAgLy8gdGFwKHByb2plY3QyUGFja2FnZXMgPT4gY29uc29sZS5sb2cocHJvamVjdDJQYWNrYWdlcykpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChrZXlzMSwga2V5czIpID0+IGtleXMxLmxlbmd0aCA9PT0ga2V5czIubGVuZ3RoICYmIGtleXMxLmpvaW4oKSA9PT0ga2V5czIuam9pbigpKSxcbiAgICBza2lwKDEpLFxuICAgIG1hcChwcm9qZWN0cyA9PiB7XG4gICAgICAvLyAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIC8vIGNvbnNvbGUubG9nKGJveFN0cmluZygnUHJvamVjdCBsaXN0IGlzIHVwZGF0ZWQsIHlvdSBuZWVkIHRvIHJ1blxcblxcdGRyY3AgaW5pdFxcbicgK1xuICAgICAgLy8gJyB0byBpbnN0YWxsIG5ldyBkZXBlbmRlbmNpZXMgZnJvbSB0aGUgbmV3IHByb2plY3QuJywgNjApKTtcbiAgICAgIHByaW50UHJvamVjdHMocHJvamVjdHMpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgY2FzZSAnYWRkJzpcbiAgICAgIGlmIChkaXJzKVxuICAgICAgICBhZGRQcm9qZWN0KGRpcnMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmVtb3ZlJzpcbiAgICAgIGlmIChkaXJzKVxuICAgICAgICByZW1vdmVQcm9qZWN0KGRpcnMpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGxpc3RQcm9qZWN0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvamVjdChkaXJzOiBzdHJpbmdbXSkge1xuICBwa2dBY3Rpb25zLmRlbGV0ZVByb2plY3QoZGlycyk7XG4gIC8vIGNvbnN0IHByb2plY3RMaXN0RmlsZSA9IFBhdGguam9pbihyb290UGF0aCwgJ2RyLnByb2plY3QubGlzdC5qc29uJyk7XG4gIC8vIGlmIChmcy5leGlzdHNTeW5jKHByb2plY3RMaXN0RmlsZSkpIHtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZygnUmVtb3ZpbmcgcHJvamVjdDogJXMnLCBkaXJzLmpvaW4oJywgJykpO1xuICAvLyAgIGxldCBwcmpzOiBzdHJpbmdbXSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHByb2plY3RMaXN0RmlsZSwgJ3V0ZjgnKSk7XG4gIC8vICAgcHJqcyA9IF8uZGlmZmVyZW5jZUJ5KHByanMsIGRpcnMsIGRpciA9PiBQYXRoLnJlc29sdmUoZGlyKSk7XG4gIC8vICAgY29uc3Qgc3RyID0gSlNPTi5zdHJpbmdpZnkocHJqcywgbnVsbCwgJyAgJyk7XG4gIC8vICAgd3JpdGVGaWxlKHByb2plY3RMaXN0RmlsZSwgc3RyKTtcbiAgLy8gICBkZWxldGUgcmVxdWlyZS5jYWNoZVtyZXF1aXJlLnJlc29sdmUocHJvamVjdExpc3RGaWxlKV07XG4gIC8vICAgbGlzdFByb2plY3QocHJqcyk7XG4gIC8vIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQcm9qZWN0KHByb2plY3RzPzogc3RyaW5nW10pIHtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3RzMnBrcyA9PiB7XG4gICAgICBwcmludFByb2plY3RzKEFycmF5LmZyb20ocHJvamVjdHMycGtzLmtleXMoKSkpO1xuICAgIH0pLFxuICAgIHRha2UoMSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgLy8gY29uc3QgcHJvamVjdHMgPSBPYmplY3Qua2V5cyhwcm9qZWN0czJwa3MpO1xuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKCdObyBwcm9qZWN0JykpO1xuICAgIHJldHVybjtcbiAgfSBlbHNlIHtcbiAgICBsZXQgc3RyID0gXy5wYWQoJyBQcm9qZWN0cyBkaXJlY3RvcnkgJywgNDAsICcgJyk7XG4gICAgc3RyICs9ICdcXG4gXFxuJztcbiAgICBfLmVhY2gocHJvamVjdHMsIChkaXIsIGkpID0+IHtcbiAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZGlyKTtcbiAgICAgIHN0ciArPSBfLnBhZEVuZChpICsgMSArICcuICcsIDUsICcgJykgKyBkaXI7XG4gICAgICBzdHIgKz0gJ1xcbic7XG4gICAgfSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKHN0cikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFByb2plY3QoZGlyczogc3RyaW5nW10pIHtcbiAgcGtnQWN0aW9ucy5hZGRQcm9qZWN0KGRpcnMpO1xufVxuXG4iXX0=