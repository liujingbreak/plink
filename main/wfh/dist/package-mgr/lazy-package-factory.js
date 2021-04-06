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
                this.packagePathMap.putData(path_1.resolve(misc_1.plinkEnv.workDir, info.path), pk);
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
        path: path_1.resolve(misc_1.plinkEnv.workDir, info.path),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9sYXp5LXBhY2thZ2UtZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSw2REFBdUQ7QUFDdkQsaUZBQXFEO0FBRXJELHdDQUF1QztBQUN2QywrQkFBNkI7QUFDN0I7O0dBRUc7QUFDSCxNQUFxQixrQkFBa0I7SUFHckMsWUFBb0IsZ0JBQXVDO1FBQXZDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBdUI7SUFDM0QsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQVk7UUFDM0IsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksRUFBRTtZQUMvQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksa0JBQU8sRUFBbUIsQ0FBQztZQUNyRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDeEMsTUFBTSxFQUFFLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxjQUFPLENBQUMsZUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDdkU7U0FDRjtRQUNELElBQUksS0FBd0IsQ0FBQztRQUM3QixLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDbEIsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQXJCRCxxQ0FxQkM7QUFFRCxTQUFnQixTQUFTLENBQUMsUUFBZ0I7SUFFeEMsTUFBTSxLQUFLLEdBQUcsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELElBQUksS0FBSyxFQUFFO1FBQ1QsT0FBTztZQUNMLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2YsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDZixDQUFDO0tBQ0g7SUFDRCxPQUFPLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxDQUFDO0FBQzFCLENBQUM7QUFWRCw4QkFVQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQWlCO0lBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksNkJBQWUsQ0FBQztRQUNuQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDbkIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSTtRQUNwQyxJQUFJLEVBQUUsY0FBTyxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztRQUMxQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7UUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0tBQ2hCLENBQUMsQ0FBQztJQUNILDBDQUEwQztJQUMxQyxzQkFBc0I7SUFDdEIsZ0NBQWdDO0lBQ2hDLDhFQUE4RTtJQUM5RSxNQUFNO0lBQ04sMENBQTBDO0lBQzFDLHdGQUF3RjtJQUN4RixNQUFNO0lBQ04sSUFBSTtJQUVKLE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRCwyQ0FBMkM7QUFDM0MsK0JBQStCO0FBQy9CLDhCQUE4QjtBQUM5QiwwQkFBMEI7QUFDMUIsTUFBTTtBQUNOLGNBQWM7QUFDZCxJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQge1BhY2thZ2VJbmZvfSBmcm9tICcuJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICdwYXRoJztcbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGF6eVBhY2thZ2VGYWN0b3J5IHtcbiAgcGFja2FnZVBhdGhNYXA6IERpclRyZWU8UGFja2FnZUluc3RhbmNlPjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBhY2thZ2VzSXRlcmFibGU6IEl0ZXJhYmxlPFBhY2thZ2VJbmZvPikge1xuICB9XG5cbiAgZ2V0UGFja2FnZUJ5UGF0aChmaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5zdGFuY2UgfCBudWxsIHtcbiAgICBpZiAodGhpcy5wYWNrYWdlUGF0aE1hcCA9PSBudWxsKSB7XG4gICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuICAgICAgZm9yIChjb25zdCBpbmZvIG9mIHRoaXMucGFja2FnZXNJdGVyYWJsZSkge1xuICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2UoaW5mbyk7XG4gICAgICAgIHRoaXMucGFja2FnZVBhdGhNYXAucHV0RGF0YShpbmZvLnJlYWxQYXRoLCBwayk7XG4gICAgICAgIHRoaXMucGFja2FnZVBhdGhNYXAucHV0RGF0YShyZXNvbHZlKHBsaW5rRW52LndvcmtEaXIsIGluZm8ucGF0aCksIHBrKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbGV0IGZvdW5kOiBQYWNrYWdlSW5zdGFuY2VbXTtcbiAgICBmb3VuZCA9IHRoaXMucGFja2FnZVBhdGhNYXAuZ2V0QWxsRGF0YShmaWxlKTtcbiAgICBpZiAoZm91bmQubGVuZ3RoID4gMClcbiAgICAgIHJldHVybiBmb3VuZFtmb3VuZC5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VOYW1lKGxvbmdOYW1lOiBzdHJpbmcpOiB7bmFtZTogc3RyaW5nOyBzY29wZT86IHN0cmluZ30ge1xuXG4gIGNvbnN0IG1hdGNoID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLy5leGVjKGxvbmdOYW1lKTtcbiAgaWYgKG1hdGNoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNjb3BlOiBtYXRjaFsxXSxcbiAgICAgIG5hbWU6IG1hdGNoWzJdXG4gICAgfTtcbiAgfVxuICByZXR1cm4ge25hbWU6IGxvbmdOYW1lfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZShpbmZvOiBQYWNrYWdlSW5mbykge1xuICBjb25zdCBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlSW5zdGFuY2Uoe1xuICAgIGxvbmdOYW1lOiBpbmZvLm5hbWUsXG4gICAgc2hvcnROYW1lOiBwYXJzZU5hbWUoaW5mby5uYW1lKS5uYW1lLFxuICAgIHBhdGg6IHJlc29sdmUocGxpbmtFbnYud29ya0RpciwgaW5mby5wYXRoKSxcbiAgICByZWFsUGF0aDogaW5mby5yZWFsUGF0aCxcbiAgICBqc29uOiBpbmZvLmpzb25cbiAgfSk7XG4gIC8vIGxldCBub1BhcnNlRmlsZXM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICAvLyBpZiAoaW5mby5qc29uLmRyKSB7XG4gIC8vICAgaWYgKGluZm8uanNvbi5kci5ub1BhcnNlKSB7XG4gIC8vICAgICBub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQoaW5mby5qc29uLmRyLm5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICAvLyAgIH1cbiAgLy8gICBpZiAoaW5mby5qc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKSB7XG4gIC8vICAgICBub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQoaW5mby5qc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbi8vIGZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcbi8vICAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuLy8gICBpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG4vLyAgICAgcCA9IHAuc3Vic3RyaW5nKDIpO1xuLy8gICB9XG4vLyAgIHJldHVybiBwO1xuLy8gfVxuIl19