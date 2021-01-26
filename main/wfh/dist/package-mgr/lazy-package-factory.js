"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseName = void 0;
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = __importDefault(require("../packageNodeInstance"));
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
                this.packagePathMap.putData(info.path, pk);
                if (info.realPath !== info.path)
                    this.packagePathMap.putData(info.realPath, pk);
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
        path: info.path,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9sYXp5LXBhY2thZ2UtZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSw2REFBdUQ7QUFDdkQsaUZBQXFEO0FBR3JEOztHQUVHO0FBQ0gsTUFBcUIsa0JBQWtCO0lBR3JDLFlBQW9CLGdCQUF1QztRQUF2QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXVCO0lBQzNELENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUFZO1FBQzNCLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQW1CLENBQUM7WUFDckQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ3hDLE1BQU0sRUFBRSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxJQUFJO29CQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ2xEO1NBQ0Y7UUFDRCxJQUFJLEtBQXdCLENBQUM7UUFDN0IsS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ2xCLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUF0QkQscUNBc0JDO0FBRUQsU0FBZ0IsU0FBUyxDQUFDLFFBQWdCO0lBRXhDLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxJQUFJLEtBQUssRUFBRTtRQUNULE9BQU87WUFDTCxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ2YsQ0FBQztLQUNIO0lBQ0QsT0FBTyxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsQ0FBQztBQUMxQixDQUFDO0FBVkQsOEJBVUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFpQjtJQUN0QyxNQUFNLFFBQVEsR0FBRyxJQUFJLDZCQUFlLENBQUM7UUFDbkMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO1FBQ25CLFNBQVMsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUk7UUFDcEMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1FBQ2YsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1FBQ3ZCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtLQUNoQixDQUFDLENBQUM7SUFDSCwwQ0FBMEM7SUFDMUMsc0JBQXNCO0lBQ3RCLGdDQUFnQztJQUNoQyw4RUFBOEU7SUFDOUUsTUFBTTtJQUNOLDBDQUEwQztJQUMxQyx3RkFBd0Y7SUFDeEYsTUFBTTtJQUNOLElBQUk7SUFFSixPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsMkNBQTJDO0FBQzNDLCtCQUErQjtBQUMvQiw4QkFBOEI7QUFDOUIsMEJBQTBCO0FBQzFCLE1BQU07QUFDTixjQUFjO0FBQ2QsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnLic7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGF6eVBhY2thZ2VGYWN0b3J5IHtcbiAgcGFja2FnZVBhdGhNYXA6IERpclRyZWU8UGFja2FnZUluc3RhbmNlPjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBhY2thZ2VzSXRlcmFibGU6IEl0ZXJhYmxlPFBhY2thZ2VJbmZvPikge1xuICB9XG5cbiAgZ2V0UGFja2FnZUJ5UGF0aChmaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5zdGFuY2UgfCBudWxsIHtcbiAgICBpZiAodGhpcy5wYWNrYWdlUGF0aE1hcCA9PSBudWxsKSB7XG4gICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuICAgICAgZm9yIChjb25zdCBpbmZvIG9mIHRoaXMucGFja2FnZXNJdGVyYWJsZSkge1xuICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2UoaW5mbyk7XG4gICAgICAgIHRoaXMucGFja2FnZVBhdGhNYXAucHV0RGF0YShpbmZvLnBhdGgsIHBrKTtcbiAgICAgICAgaWYgKGluZm8ucmVhbFBhdGggIT09IGluZm8ucGF0aClcbiAgICAgICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwLnB1dERhdGEoaW5mby5yZWFsUGF0aCwgcGspO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgZm91bmQ6IFBhY2thZ2VJbnN0YW5jZVtdO1xuICAgIGZvdW5kID0gdGhpcy5wYWNrYWdlUGF0aE1hcC5nZXRBbGxEYXRhKGZpbGUpO1xuICAgIGlmIChmb3VuZC5sZW5ndGggPiAwKVxuICAgICAgcmV0dXJuIGZvdW5kW2ZvdW5kLmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5hbWUobG9uZ05hbWU6IHN0cmluZyk6IHtuYW1lOiBzdHJpbmc7IHNjb3BlPzogc3RyaW5nfSB7XG5cbiAgY29uc3QgbWF0Y2ggPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NvcGU6IG1hdGNoWzFdLFxuICAgICAgbmFtZTogbWF0Y2hbMl1cbiAgICB9O1xuICB9XG4gIHJldHVybiB7bmFtZTogbG9uZ05hbWV9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlKGluZm86IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IGluc3RhbmNlID0gbmV3IFBhY2thZ2VJbnN0YW5jZSh7XG4gICAgbG9uZ05hbWU6IGluZm8ubmFtZSxcbiAgICBzaG9ydE5hbWU6IHBhcnNlTmFtZShpbmZvLm5hbWUpLm5hbWUsXG4gICAgcGF0aDogaW5mby5wYXRoLFxuICAgIHJlYWxQYXRoOiBpbmZvLnJlYWxQYXRoLFxuICAgIGpzb246IGluZm8uanNvblxuICB9KTtcbiAgLy8gbGV0IG5vUGFyc2VGaWxlczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIC8vIGlmIChpbmZvLmpzb24uZHIpIHtcbiAgLy8gICBpZiAoaW5mby5qc29uLmRyLm5vUGFyc2UpIHtcbiAgLy8gICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChpbmZvLmpzb24uZHIubm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gIC8vICAgfVxuICAvLyAgIGlmIChpbmZvLmpzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgLy8gICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChpbmZvLmpzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuLy8gZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuLy8gICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyAgIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbi8vICAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4vLyAgIH1cbi8vICAgcmV0dXJuIHA7XG4vLyB9XG4iXX0=