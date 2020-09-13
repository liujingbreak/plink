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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0Isb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4Q0FBOEU7QUFDOUUsZ0RBQTBFO0FBQzFFLHdDQUFzRDtBQUN0RCx1Q0FBdUM7QUFDdkMsdURBQStCO0FBQy9CLE1BQU0sUUFBUSxHQUFHLGlCQUFVLEVBQUUsQ0FBQztBQUU5Qjs7O0dBR0c7QUFDSCxtQkFBOEIsTUFBeUIsRUFBRSxJQUFlOztRQUN0RSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQzFELHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsaUJBQUssQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGdDQUFvQixFQUFFLEVBQ2pELGVBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVELDBEQUEwRDtRQUMxRCxnQ0FBb0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQ3RHLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1AsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2IsMENBQTBDO1lBQzFDLG9GQUFvRjtZQUNwRiw4REFBOEQ7WUFDOUQsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFDZCxRQUFRLE1BQU0sRUFBRTtZQUNkLEtBQUssS0FBSztnQkFDUixJQUFJLElBQUk7b0JBQ04sVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQixNQUFNO1lBQ1IsS0FBSyxRQUFRO2dCQUNYLElBQUksSUFBSTtvQkFDTixhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RCLE1BQU07WUFDUjtnQkFDRSxXQUFXLEVBQUUsQ0FBQztTQUNqQjtJQUNILENBQUM7Q0FBQTtBQTNCRCw0QkEyQkM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFjO0lBQ25DLDhCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLHVFQUF1RTtJQUN2RSx3Q0FBd0M7SUFDeEMsNENBQTRDO0lBQzVDLDBEQUEwRDtJQUMxRCwrRUFBK0U7SUFDL0UsaUVBQWlFO0lBQ2pFLGtEQUFrRDtJQUNsRCxxQ0FBcUM7SUFDckMsNERBQTREO0lBQzVELHVCQUF1QjtJQUN2QixJQUFJO0FBQ04sQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLFFBQW1CO0lBQ3RDLHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDcEQsZUFBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQ2pCLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLEVBQ0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsQ0FDUixDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxRQUFrQjtJQUN2Qyw4Q0FBOEM7SUFDOUMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN6Qix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTztLQUNSO1NBQU07UUFDTCxJQUFJLEdBQUcsR0FBRyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDakQsR0FBRyxJQUFJLE9BQU8sQ0FBQztRQUNmLGdCQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEMsR0FBRyxJQUFJLGdCQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDNUMsR0FBRyxJQUFJLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzdCO0FBQ0gsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLElBQWM7SUFDaEMsOEJBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgbWFwLCBza2lwLCB0YWtlLCBwbHVjayB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgcGtnQWN0aW9ucywgZ2V0U3RvcmUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBib3hTdHJpbmcsIGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbi8vIGltcG9ydCB7IHdyaXRlRmlsZSB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG5cbi8qKlxuICogQHBhcmFtIGFjdGlvbiBcbiAqIEBwYXJhbSBkaXJzIFxuICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihhY3Rpb24/OiAnYWRkJyB8ICdyZW1vdmUnLCBkaXJzPzogc3RyaW5nW10pIHtcbiAgYXdhaXQgY29uZmlnLmluaXQoe2NvbmZpZzogW10sIHByb3A6IFtdLCBsb2dTdGF0OiBmYWxzZX0pO1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgcGx1Y2soJ3Byb2plY3QyUGFja2FnZXMnKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBtYXAocHJvamVjdDJQYWNrYWdlcyA9PiBBcnJheS5mcm9tKHByb2plY3QyUGFja2FnZXMua2V5cygpKSksXG4gICAgLy8gdGFwKHByb2plY3QyUGFja2FnZXMgPT4gY29uc29sZS5sb2cocHJvamVjdDJQYWNrYWdlcykpLFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChrZXlzMSwga2V5czIpID0+IGtleXMxLmxlbmd0aCA9PT0ga2V5czIubGVuZ3RoICYmIGtleXMxLmpvaW4oKSA9PT0ga2V5czIuam9pbigpKSxcbiAgICBza2lwKDEpLFxuICAgIG1hcChwcm9qZWN0cyA9PiB7XG4gICAgICAvLyAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIC8vIGNvbnNvbGUubG9nKGJveFN0cmluZygnUHJvamVjdCBsaXN0IGlzIHVwZGF0ZWQsIHlvdSBuZWVkIHRvIHJ1blxcblxcdGRyY3AgaW5pdFxcbicgK1xuICAgICAgLy8gJyB0byBpbnN0YWxsIG5ldyBkZXBlbmRlbmNpZXMgZnJvbSB0aGUgbmV3IHByb2plY3QuJywgNjApKTtcbiAgICAgIHByaW50UHJvamVjdHMocHJvamVjdHMpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgY2FzZSAnYWRkJzpcbiAgICAgIGlmIChkaXJzKVxuICAgICAgICBhZGRQcm9qZWN0KGRpcnMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmVtb3ZlJzpcbiAgICAgIGlmIChkaXJzKVxuICAgICAgICByZW1vdmVQcm9qZWN0KGRpcnMpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGxpc3RQcm9qZWN0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvamVjdChkaXJzOiBzdHJpbmdbXSkge1xuICBwa2dBY3Rpb25zLmRlbGV0ZVByb2plY3QoZGlycyk7XG4gIC8vIGNvbnN0IHByb2plY3RMaXN0RmlsZSA9IFBhdGguam9pbihyb290UGF0aCwgJ2RyLnByb2plY3QubGlzdC5qc29uJyk7XG4gIC8vIGlmIChmcy5leGlzdHNTeW5jKHByb2plY3RMaXN0RmlsZSkpIHtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZygnUmVtb3ZpbmcgcHJvamVjdDogJXMnLCBkaXJzLmpvaW4oJywgJykpO1xuICAvLyAgIGxldCBwcmpzOiBzdHJpbmdbXSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHByb2plY3RMaXN0RmlsZSwgJ3V0ZjgnKSk7XG4gIC8vICAgcHJqcyA9IF8uZGlmZmVyZW5jZUJ5KHByanMsIGRpcnMsIGRpciA9PiBQYXRoLnJlc29sdmUoZGlyKSk7XG4gIC8vICAgY29uc3Qgc3RyID0gSlNPTi5zdHJpbmdpZnkocHJqcywgbnVsbCwgJyAgJyk7XG4gIC8vICAgd3JpdGVGaWxlKHByb2plY3RMaXN0RmlsZSwgc3RyKTtcbiAgLy8gICBkZWxldGUgcmVxdWlyZS5jYWNoZVtyZXF1aXJlLnJlc29sdmUocHJvamVjdExpc3RGaWxlKV07XG4gIC8vICAgbGlzdFByb2plY3QocHJqcyk7XG4gIC8vIH1cbn1cblxuZnVuY3Rpb24gbGlzdFByb2plY3QocHJvamVjdHM/OiBzdHJpbmdbXSkge1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBtYXAocHJvamVjdHMycGtzID0+IHtcbiAgICAgIHByaW50UHJvamVjdHMoQXJyYXkuZnJvbShwcm9qZWN0czJwa3Mua2V5cygpKSk7XG4gICAgfSksXG4gICAgdGFrZSgxKVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5mdW5jdGlvbiBwcmludFByb2plY3RzKHByb2plY3RzOiBzdHJpbmdbXSkge1xuICAvLyBjb25zdCBwcm9qZWN0cyA9IE9iamVjdC5rZXlzKHByb2plY3RzMnBrcyk7XG4gIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ05vIHByb2plY3QnKSk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2Uge1xuICAgIGxldCBzdHIgPSBfLnBhZCgnIFByb2plY3RzIGRpcmVjdG9yeSAnLCA0MCwgJyAnKTtcbiAgICBzdHIgKz0gJ1xcbiBcXG4nO1xuICAgIF8uZWFjaChwcm9qZWN0cywgKGRpciwgaSkgPT4ge1xuICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkaXIpO1xuICAgICAgc3RyICs9IF8ucGFkRW5kKGkgKyAxICsgJy4gJywgNSwgJyAnKSArIGRpcjtcbiAgICAgIHN0ciArPSAnXFxuJztcbiAgICB9KTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoc3RyKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkUHJvamVjdChkaXJzOiBzdHJpbmdbXSkge1xuICBwa2dBY3Rpb25zLmFkZFByb2plY3QoZGlycyk7XG59XG5cbiJdfQ==