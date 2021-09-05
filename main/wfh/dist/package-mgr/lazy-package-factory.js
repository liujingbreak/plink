"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseName = void 0;
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = __importDefault(require("../packageNodeInstance"));
const misc_1 = require("../utils/misc");
const path_1 = require("path");
/**
 * @deprecated
 */
class LazyPackageFactory {
    constructor(packagesIterable) {
        this.packagesIterable = packagesIterable;
    }
    getPackageByPath(file) {
        if (this.packagePathMap == null) {
            this.packagePathMap = new dir_tree_1.DirTree();
            for (const info of this.packagesIterable) {
                const pk = createPackage(info);
                this.packagePathMap.putData(info.realPath, pk);
                this.packagePathMap.putData((0, path_1.resolve)(misc_1.plinkEnv.workDir, info.path), pk);
            }
        }
        let found;
        found = this.packagePathMap.getAllData(file);
        if (found.length > 0)
            return found[found.length - 1];
        return null;
    }
}
exports.default = LazyPackageFactory;
function parseName(longName) {
    const match = /^(?:@([^/]+)\/)?(\S+)/.exec(longName);
    if (match) {
        return {
            scope: match[1],
            name: match[2]
        };
    }
    return { name: longName };
}
exports.parseName = parseName;
function createPackage(info) {
    const instance = new packageNodeInstance_1.default({
        longName: info.name,
        shortName: parseName(info.name).name,
        path: (0, path_1.resolve)(misc_1.plinkEnv.workDir, info.path),
        realPath: info.realPath,
        json: info.json
    });
    // let noParseFiles: string[] | undefined;
    // if (info.json.dr) {
    //   if (info.json.dr.noParse) {
    //     noParseFiles = [].concat(info.json.dr.noParse).map(trimNoParseSetting);
    //   }
    //   if (info.json.dr.browserifyNoParse) {
    //     noParseFiles = [].concat(info.json.dr.browserifyNoParse).map(trimNoParseSetting);
    //   }
    // }
    return instance;
}
// function trimNoParseSetting(p: string) {
//   p = p.replace(/\\/g, '/');
//   if (p.startsWith('./')) {
//     p = p.substring(2);
//   }
//   return p;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9sYXp5LXBhY2thZ2UtZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSw2REFBdUQ7QUFDdkQsaUZBQXFEO0FBRXJELHdDQUF1QztBQUN2QywrQkFBNkI7QUFDN0I7O0dBRUc7QUFDSCxNQUFxQixrQkFBa0I7SUFHckMsWUFBb0IsZ0JBQXVDO1FBQXZDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBdUI7SUFDM0QsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQVk7UUFDM0IsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtZQUMvQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksa0JBQU8sRUFBbUIsQ0FBQztZQUNyRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDeEMsTUFBTSxFQUFFLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFBLGNBQU8sRUFBQyxlQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN2RTtTQUNGO1FBQ0QsSUFBSSxLQUF3QixDQUFDO1FBQzdCLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNsQixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBckJELHFDQXFCQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxRQUFnQjtJQUV4QyxNQUFNLEtBQUssR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQsSUFBSSxLQUFLLEVBQUU7UUFDVCxPQUFPO1lBQ0wsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUNmLENBQUM7S0FDSDtJQUNELE9BQU8sRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLENBQUM7QUFDMUIsQ0FBQztBQVZELDhCQVVDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBaUI7SUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSw2QkFBZSxDQUFDO1FBQ25DLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtRQUNuQixTQUFTLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJO1FBQ3BDLElBQUksRUFBRSxJQUFBLGNBQU8sRUFBQyxlQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDMUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1FBQ3ZCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtLQUNoQixDQUFDLENBQUM7SUFDSCwwQ0FBMEM7SUFDMUMsc0JBQXNCO0lBQ3RCLGdDQUFnQztJQUNoQyw4RUFBOEU7SUFDOUUsTUFBTTtJQUNOLDBDQUEwQztJQUMxQyx3RkFBd0Y7SUFDeEYsTUFBTTtJQUNOLElBQUk7SUFFSixPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsMkNBQTJDO0FBQzNDLCtCQUErQjtBQUMvQiw4QkFBOEI7QUFDOUIsMEJBQTBCO0FBQzFCLE1BQU07QUFDTixjQUFjO0FBQ2QsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnLic7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhenlQYWNrYWdlRmFjdG9yeSB7XG4gIHBhY2thZ2VQYXRoTWFwOiBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4gfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBwYWNrYWdlc0l0ZXJhYmxlOiBJdGVyYWJsZTxQYWNrYWdlSW5mbz4pIHtcbiAgfVxuXG4gIGdldFBhY2thZ2VCeVBhdGgoZmlsZTogc3RyaW5nKTogUGFja2FnZUluc3RhbmNlIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMucGFja2FnZVBhdGhNYXAgPT0gbnVsbCkge1xuICAgICAgdGhpcy5wYWNrYWdlUGF0aE1hcCA9IG5ldyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4oKTtcbiAgICAgIGZvciAoY29uc3QgaW5mbyBvZiB0aGlzLnBhY2thZ2VzSXRlcmFibGUpIHtcbiAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlKGluZm8pO1xuICAgICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwLnB1dERhdGEoaW5mby5yZWFsUGF0aCwgcGspO1xuICAgICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwLnB1dERhdGEocmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBpbmZvLnBhdGgpLCBwayk7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBmb3VuZDogUGFja2FnZUluc3RhbmNlW107XG4gICAgZm91bmQgPSB0aGlzLnBhY2thZ2VQYXRoTWFwLmdldEFsbERhdGEoZmlsZSk7XG4gICAgaWYgKGZvdW5kLmxlbmd0aCA+IDApXG4gICAgICByZXR1cm4gZm91bmRbZm91bmQubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKToge25hbWU6IHN0cmluZzsgc2NvcGU/OiBzdHJpbmd9IHtcblxuICBjb25zdCBtYXRjaCA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS8uZXhlYyhsb25nTmFtZSk7XG4gIGlmIChtYXRjaCkge1xuICAgIHJldHVybiB7XG4gICAgICBzY29wZTogbWF0Y2hbMV0sXG4gICAgICBuYW1lOiBtYXRjaFsyXVxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtuYW1lOiBsb25nTmFtZX07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2UoaW5mbzogUGFja2FnZUluZm8pIHtcbiAgY29uc3QgaW5zdGFuY2UgPSBuZXcgUGFja2FnZUluc3RhbmNlKHtcbiAgICBsb25nTmFtZTogaW5mby5uYW1lLFxuICAgIHNob3J0TmFtZTogcGFyc2VOYW1lKGluZm8ubmFtZSkubmFtZSxcbiAgICBwYXRoOiByZXNvbHZlKHBsaW5rRW52LndvcmtEaXIsIGluZm8ucGF0aCksXG4gICAgcmVhbFBhdGg6IGluZm8ucmVhbFBhdGgsXG4gICAganNvbjogaW5mby5qc29uXG4gIH0pO1xuICAvLyBsZXQgbm9QYXJzZUZpbGVzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgLy8gaWYgKGluZm8uanNvbi5kcikge1xuICAvLyAgIGlmIChpbmZvLmpzb24uZHIubm9QYXJzZSkge1xuICAvLyAgICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KGluZm8uanNvbi5kci5ub1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgLy8gICB9XG4gIC8vICAgaWYgKGluZm8uanNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkge1xuICAvLyAgICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KGluZm8uanNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG4vLyBmdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4vLyAgIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbi8vICAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuLy8gICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbi8vICAgfVxuLy8gICByZXR1cm4gcDtcbi8vIH1cbiJdfQ==