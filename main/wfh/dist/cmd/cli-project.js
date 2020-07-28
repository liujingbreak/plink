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
        package_mgr_1.getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.map(project2Packages => {
            // tslint:disable-next-line: no-console
            console.log(utils_1.boxString('Project list is updated, you need to run\n\tdrcp init\n' +
                ' to install new dependencies from the new project.', 60));
            printProjects(project2Packages);
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
        printProjects(projects2pks);
    }), operators_1.take(1)).subscribe();
}
function printProjects(projects2pks) {
    const projects = Object.keys(projects2pks);
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
    // const changed = writeProjectListFile(dirs);
    // if (changed) {
    //   // tslint:disable-next-line: no-console
    //   console.log(boxString('Project list is updated, you need to run\n\tdrcp init\n' +
    //     ' or other offline init command to install new dependencies from the new project.', 60));
    // } else {
    //   // tslint:disable-next-line: no-console
    //   console.log(boxString('No new project is added.', 60));
    // }
}
// function writeProjectListFile(dirs: string[]) {
//   let changed = false;
//   const projectListFile = Path.join(rootPath, 'dr.project.list.json');
//   let prj: string[];
//   if (fs.existsSync(projectListFile)) {
//     fs.copySync(Path.join(rootPath, 'dr.project.list.json'), Path.join(rootPath, 'dr.project.list.json.bak'));
//     prj = JSON.parse(fs.readFileSync(projectListFile, 'utf8'));
//     const toAdd = _.differenceBy(dirs, prj, dir => fs.realpathSync(dir).replace(/[/\\]$/, ''));
//     if (toAdd.length > 0) {
//       prj.push(...toAdd);
//       writeFile(projectListFile, JSON.stringify(_.uniqBy(prj, p => fs.realpathSync(p)), null, '  '));
//       changed = true;
//     }
//   } else {
//     prj = [...dirs];
//     writeFile(projectListFile, JSON.stringify(_.uniqBy(prj, p => fs.realpathSync(p)), null, '  '));
//     changed = true;
//   }
//   delete require.cache[require.resolve(projectListFile)];
//   return changed;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNkI7QUFDN0Isb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4Q0FBdUU7QUFDdkUsZ0RBQXlGO0FBQ3pGLG9DQUFpRDtBQUNqRCx1Q0FBdUM7QUFDdkMsdURBQStCO0FBQy9CLE1BQU0sUUFBUSxHQUFHLGtCQUFVLEVBQUUsQ0FBQztBQUU5Qjs7O0dBR0c7QUFDSCxtQkFBOEIsTUFBeUIsRUFBRSxJQUFlOztRQUN0RSxNQUFNLGdCQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQzFELHNCQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDcEQsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxlQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUNyQix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBUyxDQUFDLHlEQUF5RDtnQkFDL0Usb0RBQW9ELEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzRCxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2QsUUFBUSxNQUFNLEVBQUU7WUFDZCxLQUFLLEtBQUs7Z0JBQ1IsSUFBSSxJQUFJO29CQUNOLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkIsTUFBTTtZQUNSLEtBQUssUUFBUTtnQkFDWCxJQUFJLElBQUk7b0JBQ04sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixNQUFNO1lBQ1I7Z0JBQ0UsV0FBVyxFQUFFLENBQUM7U0FDakI7SUFDSCxDQUFDO0NBQUE7QUF4QkQsNEJBd0JDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBYztJQUNuQyw4QkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQix1RUFBdUU7SUFDdkUsd0NBQXdDO0lBQ3hDLDRDQUE0QztJQUM1QywwREFBMEQ7SUFDMUQsK0VBQStFO0lBQy9FLGlFQUFpRTtJQUNqRSxrREFBa0Q7SUFDbEQscUNBQXFDO0lBQ3JDLDREQUE0RDtJQUM1RCx1QkFBdUI7SUFDdkIsSUFBSTtBQUNOLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxRQUFtQjtJQUN0QyxzQkFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGdDQUFvQixFQUFFLEVBQ3BELGVBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUNqQixhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDLEVBQ0YsZ0JBQUksQ0FBQyxDQUFDLENBQUMsQ0FDUixDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxZQUErQztJQUNwRSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzNDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekIsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE9BQU87S0FDUjtTQUFNO1FBQ0wsSUFBSSxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDZixnQkFBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUIsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLEdBQUcsSUFBSSxnQkFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQzVDLEdBQUcsSUFBSSxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3QjtBQUNILENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUFjO0lBQ2hDLDhCQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLDhDQUE4QztJQUU5QyxpQkFBaUI7SUFDakIsNENBQTRDO0lBQzVDLHNGQUFzRjtJQUN0RixnR0FBZ0c7SUFDaEcsV0FBVztJQUNYLDRDQUE0QztJQUM1Qyw0REFBNEQ7SUFDNUQsSUFBSTtBQUNOLENBQUM7QUFFRCxrREFBa0Q7QUFDbEQseUJBQXlCO0FBQ3pCLHlFQUF5RTtBQUN6RSx1QkFBdUI7QUFDdkIsMENBQTBDO0FBQzFDLGlIQUFpSDtBQUNqSCxrRUFBa0U7QUFDbEUsa0dBQWtHO0FBQ2xHLDhCQUE4QjtBQUM5Qiw0QkFBNEI7QUFDNUIsd0dBQXdHO0FBQ3hHLHdCQUF3QjtBQUN4QixRQUFRO0FBQ1IsYUFBYTtBQUNiLHVCQUF1QjtBQUN2QixzR0FBc0c7QUFDdEcsc0JBQXNCO0FBQ3RCLE1BQU07QUFDTiw0REFBNEQ7QUFDNUQsb0JBQW9CO0FBQ3BCLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgc2tpcCwgdGFrZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgcGtnQWN0aW9ucywgZ2V0U3RvcmUsIFBhY2thZ2VzU3RhdGUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBib3hTdHJpbmcsIGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscyc7XG4vLyBpbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmNvbnN0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuXG4vKipcbiAqIEBwYXJhbSBhY3Rpb24gXG4gKiBAcGFyYW0gZGlycyBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24oYWN0aW9uPzogJ2FkZCcgfCAncmVtb3ZlJywgZGlycz86IHN0cmluZ1tdKSB7XG4gIGF3YWl0IGNvbmZpZy5pbml0KHtjb25maWc6IFtdLCBwcm9wOiBbXSwgbG9nU3RhdDogZmFsc2V9KTtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgc2tpcCgxKSxcbiAgICBtYXAocHJvamVjdDJQYWNrYWdlcyA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnUHJvamVjdCBsaXN0IGlzIHVwZGF0ZWQsIHlvdSBuZWVkIHRvIHJ1blxcblxcdGRyY3AgaW5pdFxcbicgK1xuICAgICAgJyB0byBpbnN0YWxsIG5ldyBkZXBlbmRlbmNpZXMgZnJvbSB0aGUgbmV3IHByb2plY3QuJywgNjApKTtcbiAgICAgIHByaW50UHJvamVjdHMocHJvamVjdDJQYWNrYWdlcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICBjYXNlICdhZGQnOlxuICAgICAgaWYgKGRpcnMpXG4gICAgICAgIGFkZFByb2plY3QoZGlycyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyZW1vdmUnOlxuICAgICAgaWYgKGRpcnMpXG4gICAgICAgIHJlbW92ZVByb2plY3QoZGlycyk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgbGlzdFByb2plY3QoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVQcm9qZWN0KGRpcnM6IHN0cmluZ1tdKSB7XG4gIHBrZ0FjdGlvbnMuZGVsZXRlUHJvamVjdChkaXJzKTtcbiAgLy8gY29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKHJvb3RQYXRoLCAnZHIucHJvamVjdC5saXN0Lmpzb24nKTtcbiAgLy8gaWYgKGZzLmV4aXN0c1N5bmMocHJvamVjdExpc3RGaWxlKSkge1xuICAvLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyAgIGNvbnNvbGUubG9nKCdSZW1vdmluZyBwcm9qZWN0OiAlcycsIGRpcnMuam9pbignLCAnKSk7XG4gIC8vICAgbGV0IHByanM6IHN0cmluZ1tdID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocHJvamVjdExpc3RGaWxlLCAndXRmOCcpKTtcbiAgLy8gICBwcmpzID0gXy5kaWZmZXJlbmNlQnkocHJqcywgZGlycywgZGlyID0+IFBhdGgucmVzb2x2ZShkaXIpKTtcbiAgLy8gICBjb25zdCBzdHIgPSBKU09OLnN0cmluZ2lmeShwcmpzLCBudWxsLCAnICAnKTtcbiAgLy8gICB3cml0ZUZpbGUocHJvamVjdExpc3RGaWxlLCBzdHIpO1xuICAvLyAgIGRlbGV0ZSByZXF1aXJlLmNhY2hlW3JlcXVpcmUucmVzb2x2ZShwcm9qZWN0TGlzdEZpbGUpXTtcbiAgLy8gICBsaXN0UHJvamVjdChwcmpzKTtcbiAgLy8gfVxufVxuXG5mdW5jdGlvbiBsaXN0UHJvamVjdChwcm9qZWN0cz86IHN0cmluZ1tdKSB7XG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLnByb2plY3QyUGFja2FnZXMpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChwcm9qZWN0czJwa3MgPT4ge1xuICAgICAgcHJpbnRQcm9qZWN0cyhwcm9qZWN0czJwa3MpO1xuICAgIH0pLFxuICAgIHRha2UoMSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZnVuY3Rpb24gcHJpbnRQcm9qZWN0cyhwcm9qZWN0czJwa3M6IFBhY2thZ2VzU3RhdGVbJ3Byb2plY3QyUGFja2FnZXMnXSkge1xuICBjb25zdCBwcm9qZWN0cyA9IE9iamVjdC5rZXlzKHByb2plY3RzMnBrcyk7XG4gIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ05vIHByb2plY3QnKSk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2Uge1xuICAgIGxldCBzdHIgPSBfLnBhZCgnIFByb2plY3RzIGRpcmVjdG9yeSAnLCA0MCwgJyAnKTtcbiAgICBzdHIgKz0gJ1xcbiBcXG4nO1xuICAgIF8uZWFjaChwcm9qZWN0cywgKGRpciwgaSkgPT4ge1xuICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkaXIpO1xuICAgICAgc3RyICs9IF8ucGFkRW5kKGkgKyAxICsgJy4gJywgNSwgJyAnKSArIGRpcjtcbiAgICAgIHN0ciArPSAnXFxuJztcbiAgICB9KTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoc3RyKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkUHJvamVjdChkaXJzOiBzdHJpbmdbXSkge1xuICBwa2dBY3Rpb25zLmFkZFByb2plY3QoZGlycyk7XG4gIC8vIGNvbnN0IGNoYW5nZWQgPSB3cml0ZVByb2plY3RMaXN0RmlsZShkaXJzKTtcblxuICAvLyBpZiAoY2hhbmdlZCkge1xuICAvLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnUHJvamVjdCBsaXN0IGlzIHVwZGF0ZWQsIHlvdSBuZWVkIHRvIHJ1blxcblxcdGRyY3AgaW5pdFxcbicgK1xuICAvLyAgICAgJyBvciBvdGhlciBvZmZsaW5lIGluaXQgY29tbWFuZCB0byBpbnN0YWxsIG5ldyBkZXBlbmRlbmNpZXMgZnJvbSB0aGUgbmV3IHByb2plY3QuJywgNjApKTtcbiAgLy8gfSBlbHNlIHtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ05vIG5ldyBwcm9qZWN0IGlzIGFkZGVkLicsIDYwKSk7XG4gIC8vIH1cbn1cblxuLy8gZnVuY3Rpb24gd3JpdGVQcm9qZWN0TGlzdEZpbGUoZGlyczogc3RyaW5nW10pIHtcbi8vICAgbGV0IGNoYW5nZWQgPSBmYWxzZTtcbi8vICAgY29uc3QgcHJvamVjdExpc3RGaWxlID0gUGF0aC5qb2luKHJvb3RQYXRoLCAnZHIucHJvamVjdC5saXN0Lmpzb24nKTtcbi8vICAgbGV0IHByajogc3RyaW5nW107XG4vLyAgIGlmIChmcy5leGlzdHNTeW5jKHByb2plY3RMaXN0RmlsZSkpIHtcbi8vICAgICBmcy5jb3B5U3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdkci5wcm9qZWN0Lmxpc3QuanNvbicpLCBQYXRoLmpvaW4ocm9vdFBhdGgsICdkci5wcm9qZWN0Lmxpc3QuanNvbi5iYWsnKSk7XG4vLyAgICAgcHJqID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocHJvamVjdExpc3RGaWxlLCAndXRmOCcpKTtcbi8vICAgICBjb25zdCB0b0FkZCA9IF8uZGlmZmVyZW5jZUJ5KGRpcnMsIHByaiwgZGlyID0+IGZzLnJlYWxwYXRoU3luYyhkaXIpLnJlcGxhY2UoL1svXFxcXF0kLywgJycpKTtcbi8vICAgICBpZiAodG9BZGQubGVuZ3RoID4gMCkge1xuLy8gICAgICAgcHJqLnB1c2goLi4udG9BZGQpO1xuLy8gICAgICAgd3JpdGVGaWxlKHByb2plY3RMaXN0RmlsZSwgSlNPTi5zdHJpbmdpZnkoXy51bmlxQnkocHJqLCBwID0+IGZzLnJlYWxwYXRoU3luYyhwKSksIG51bGwsICcgICcpKTtcbi8vICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuLy8gICAgIH1cbi8vICAgfSBlbHNlIHtcbi8vICAgICBwcmogPSBbLi4uZGlyc107XG4vLyAgICAgd3JpdGVGaWxlKHByb2plY3RMaXN0RmlsZSwgSlNPTi5zdHJpbmdpZnkoXy51bmlxQnkocHJqLCBwID0+IGZzLnJlYWxwYXRoU3luYyhwKSksIG51bGwsICcgICcpKTtcbi8vICAgICBjaGFuZ2VkID0gdHJ1ZTtcbi8vICAgfVxuLy8gICBkZWxldGUgcmVxdWlyZS5jYWNoZVtyZXF1aXJlLnJlc29sdmUocHJvamVjdExpc3RGaWxlKV07XG4vLyAgIHJldHVybiBjaGFuZ2VkO1xuLy8gfVxuXG4iXX0=