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
function default_1(opts, action, dirs) {
    return __awaiter(this, void 0, void 0, function* () {
        package_mgr_1.getStore().pipe(operators_1.distinctUntilChanged((x, y) => x.srcDir2Packages === y.srcDir2Packages &&
            x.project2Packages === y.project2Packages), operators_1.skip(1), operators_1.map(s => {
            // // tslint:disable-next-line: no-console
            // console.log(boxString('Project list is updated, you need to run\n\tdrcp init\n' +
            // ' to install new dependencies from the new project.', 60));
            printProjects(s.project2Packages.keys(), s.srcDir2Packages.keys());
        })).subscribe();
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
    });
}
exports.default = default_1;
function listProject(projects) {
    package_mgr_1.getStore().pipe(operators_1.distinctUntilChanged((a, b) => a.project2Packages === b.project2Packages &&
        a.srcDir2Packages === b.srcDir2Packages), operators_1.map(s => {
        printProjects(s.project2Packages.keys(), s.srcDir2Packages.keys());
    }), operators_1.take(1)).subscribe();
}
exports.listProject = listProject;
function printProjects(projects, srcDirs) {
    let list = [...projects];
    if (list.length === 0) {
        // tslint:disable-next-line: no-console
        console.log(misc_1.boxString('No project'));
    }
    else {
        let str = 'Project directories'.toUpperCase();
        str += '\n \n';
        let i = 0;
        for (let dir of list) {
            dir = path_1.default.resolve(rootPath, dir);
            str += lodash_1.default.padEnd(i + 1 + '. ', 5, ' ') + dir;
            str += '\n';
            i++;
        }
        // tslint:disable-next-line: no-console
        console.log(misc_1.boxString(str));
    }
    list = [...srcDirs];
    if (list.length > 0) {
        let str = 'Linked directories'.toUpperCase();
        str += '\n \n';
        let i = 0;
        for (let dir of list) {
            dir = path_1.default.resolve(rootPath, dir);
            str += lodash_1.default.padEnd(i + 1 + '. ', 5, ' ') + dir;
            str += '\n';
            i++;
        }
        // tslint:disable-next-line: no-console
        console.log(misc_1.boxString(str));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsOENBQXVFO0FBQ3ZFLGdEQUEwRTtBQUMxRSx3Q0FBc0Q7QUFDdEQsdUNBQXVDO0FBQ3ZDLGtDQUFrQztBQUNsQyxNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFFOUI7OztHQUdHO0FBQ0gsbUJBQThCLElBQXlCLEVBQUUsTUFBeUIsRUFBRSxJQUFlOztRQUNqRyxzQkFBUSxFQUFFLENBQUMsSUFBSSxDQUNiLGdDQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsS0FBSyxDQUFDLENBQUMsZUFBZTtZQUNwRSxDQUFDLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQzVDLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1AsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ04sMENBQTBDO1lBQzFDLG9GQUFvRjtZQUNwRiw4REFBOEQ7WUFDOUQsYUFBYSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLFFBQVEsTUFBTSxFQUFFO1lBQ2QsS0FBSyxLQUFLO2dCQUNSLElBQUksSUFBSSxFQUFFO29CQUNSLElBQUksSUFBSSxDQUFDLFFBQVE7d0JBQ2YsOEJBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7O3dCQUU1Qiw4QkFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDL0I7Z0JBQ0QsTUFBTTtZQUNSLEtBQUssUUFBUTtnQkFDWCxJQUFJLElBQUksRUFBRTtvQkFDUixJQUFJLElBQUksQ0FBQyxRQUFRO3dCQUNmLDhCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDOzt3QkFFL0IsOEJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2xDO2dCQUNELE1BQU07WUFDUjtnQkFDRSxXQUFXLEVBQUUsQ0FBQztTQUNqQjtJQUNILENBQUM7Q0FBQTtBQWhDRCw0QkFnQ0M7QUFFRCxTQUFnQixXQUFXLENBQUMsUUFBbUI7SUFDN0Msc0JBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixnQ0FBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsS0FBSyxDQUFDLENBQUMsZ0JBQWdCO1FBQ3RFLENBQUMsQ0FBQyxlQUFlLEtBQUssQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUMxQyxlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDTixhQUFhLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsRUFDRixnQkFBSSxDQUFDLENBQUMsQ0FBQyxDQUNSLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQVRELGtDQVNDO0FBRUQsU0FBUyxhQUFhLENBQUMsUUFBMEIsRUFBRSxPQUF5QjtJQUUxRSxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7SUFDekIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUNyQix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7S0FDdEM7U0FBTTtRQUNMLElBQUksR0FBRyxHQUFHLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlDLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDZixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDVixLQUFLLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNwQixHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEMsR0FBRyxJQUFJLGdCQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDNUMsR0FBRyxJQUFJLElBQUksQ0FBQztZQUNaLENBQUMsRUFBRSxDQUFDO1NBQ0w7UUFDRCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDN0I7SUFDRCxJQUFJLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQ3BCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDbkIsSUFBSSxHQUFHLEdBQUcsb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0MsR0FBRyxJQUFJLE9BQU8sQ0FBQztRQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVWLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ3BCLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsQyxHQUFHLElBQUksZ0JBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUM1QyxHQUFHLElBQUksSUFBSSxDQUFDO1lBQ1osQ0FBQyxFQUFFLENBQUM7U0FDTDtRQUNELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUM3QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIG1hcCwgc2tpcCwgdGFrZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGFjdGlvbkRpc3BhdGNoZXIgYXMgcGtnQWN0aW9ucywgZ2V0U3RvcmUgfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBib3hTdHJpbmcsIGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbi8vIGltcG9ydCB7IHdyaXRlRmlsZSB9IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG5cbi8qKlxuICogQHBhcmFtIGFjdGlvbiBcbiAqIEBwYXJhbSBkaXJzIFxuICovXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbihvcHRzOiB7aXNTcmNEaXI6IGJvb2xlYW59LCBhY3Rpb24/OiAnYWRkJyB8ICdyZW1vdmUnLCBkaXJzPzogc3RyaW5nW10pIHtcbiAgZ2V0U3RvcmUoKS5waXBlKFxuICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCh4LCB5KSA9PiB4LnNyY0RpcjJQYWNrYWdlcyA9PT0geS5zcmNEaXIyUGFja2FnZXMgJiZcbiAgICAgIHgucHJvamVjdDJQYWNrYWdlcyA9PT0geS5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICBza2lwKDEpLFxuICAgIG1hcChzID0+IHtcbiAgICAgIC8vIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgLy8gY29uc29sZS5sb2coYm94U3RyaW5nKCdQcm9qZWN0IGxpc3QgaXMgdXBkYXRlZCwgeW91IG5lZWQgdG8gcnVuXFxuXFx0ZHJjcCBpbml0XFxuJyArXG4gICAgICAvLyAnIHRvIGluc3RhbGwgbmV3IGRlcGVuZGVuY2llcyBmcm9tIHRoZSBuZXcgcHJvamVjdC4nLCA2MCkpO1xuICAgICAgcHJpbnRQcm9qZWN0cyhzLnByb2plY3QyUGFja2FnZXMua2V5cygpLCBzLnNyY0RpcjJQYWNrYWdlcy5rZXlzKCkpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG4gIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgY2FzZSAnYWRkJzpcbiAgICAgIGlmIChkaXJzKSB7XG4gICAgICAgIGlmIChvcHRzLmlzU3JjRGlyKVxuICAgICAgICAgIHBrZ0FjdGlvbnMuYWRkU3JjRGlycyhkaXJzKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHBrZ0FjdGlvbnMuYWRkUHJvamVjdChkaXJzKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JlbW92ZSc6XG4gICAgICBpZiAoZGlycykge1xuICAgICAgICBpZiAob3B0cy5pc1NyY0RpcilcbiAgICAgICAgICBwa2dBY3Rpb25zLmRlbGV0ZVNyY0RpcnMoZGlycyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwa2dBY3Rpb25zLmRlbGV0ZVByb2plY3QoZGlycyk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgbGlzdFByb2plY3QoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFByb2plY3QocHJvamVjdHM/OiBzdHJpbmdbXSkge1xuICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKGEsIGIpID0+IGEucHJvamVjdDJQYWNrYWdlcyA9PT0gYi5wcm9qZWN0MlBhY2thZ2VzICYmXG4gICAgICBhLnNyY0RpcjJQYWNrYWdlcyA9PT0gYi5zcmNEaXIyUGFja2FnZXMpLFxuICAgIG1hcChzID0+IHtcbiAgICAgIHByaW50UHJvamVjdHMocy5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSwgcy5zcmNEaXIyUGFja2FnZXMua2V5cygpKTtcbiAgICB9KSxcbiAgICB0YWtlKDEpXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvamVjdHMocHJvamVjdHM6IEl0ZXJhYmxlPHN0cmluZz4sIHNyY0RpcnM6IEl0ZXJhYmxlPHN0cmluZz4pIHtcblxuICBsZXQgbGlzdCA9IFsuLi5wcm9qZWN0c107XG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnTm8gcHJvamVjdCcpKTtcbiAgfSBlbHNlIHtcbiAgICBsZXQgc3RyID0gJ1Byb2plY3QgZGlyZWN0b3JpZXMnLnRvVXBwZXJDYXNlKCk7XG4gICAgc3RyICs9ICdcXG4gXFxuJztcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChsZXQgZGlyIG9mIGxpc3QpIHtcbiAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZGlyKTtcbiAgICAgIHN0ciArPSBfLnBhZEVuZChpICsgMSArICcuICcsIDUsICcgJykgKyBkaXI7XG4gICAgICBzdHIgKz0gJ1xcbic7XG4gICAgICBpKys7XG4gICAgfVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhzdHIpKTtcbiAgfVxuICBsaXN0ID0gWy4uLnNyY0RpcnNdO1xuICBpZiAobGlzdC5sZW5ndGggPiAwKSB7XG4gICAgbGV0IHN0ciA9ICdMaW5rZWQgZGlyZWN0b3JpZXMnLnRvVXBwZXJDYXNlKCk7XG4gICAgc3RyICs9ICdcXG4gXFxuJztcbiAgICBsZXQgaSA9IDA7XG5cbiAgICBmb3IgKGxldCBkaXIgb2YgbGlzdCkge1xuICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkaXIpO1xuICAgICAgc3RyICs9IF8ucGFkRW5kKGkgKyAxICsgJy4gJywgNSwgJyAnKSArIGRpcjtcbiAgICAgIHN0ciArPSAnXFxuJztcbiAgICAgIGkrKztcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYm94U3RyaW5nKHN0cikpO1xuICB9XG59XG4iXX0=