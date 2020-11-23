"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseName = void 0;
// import * as Path from 'path';
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_instance_1 = __importDefault(require("./package-instance"));
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
                const pk = createPackage(info.path, info.json);
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
function createPackage(packagePath, pkJson) {
    const name = pkJson.name;
    const instance = new package_instance_1.default({
        isVendor: false,
        longName: pkJson.name,
        shortName: parseName(pkJson.name).name,
        packagePath,
        realPackagePath: fs.realpathSync(packagePath)
    });
    let noParseFiles;
    if (pkJson.dr) {
        if (pkJson.dr.noParse) {
            noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
        }
        if (pkJson.dr.browserifyNoParse) {
            noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
        }
    }
    // const mainFile: string = pkJson.browser || pkJson.main;
    instance.init({
        // file: mainFile ? Path.resolve(instance.realPackagePath, mainFile) : undefined, // package.json "browser"
        // style: pkJson.style ? resolveStyle(name, nodePaths) : null,
        parsedName: parseName(name),
        browserifyNoParse: noParseFiles,
        translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
        dr: pkJson.dr,
        json: pkJson,
        i18n: pkJson.dr && pkJson.dr.i18n ? pkJson.dr.i18n : null,
        appType: _.get(pkJson, 'dr.appType')
    });
    return instance;
}
function trimNoParseSetting(p) {
    p = p.replace(/\\/g, '/');
    if (p.startsWith('./')) {
        p = p.substring(2);
    }
    return p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9sYXp5LXBhY2thZ2UtZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0NBQWdDO0FBQ2hDLHVDQUF5QjtBQUN6QiwwQ0FBNEI7QUFDNUIsNkRBQXVEO0FBQ3ZELDBFQUF3RDtBQUd4RDs7R0FFRztBQUNILE1BQXFCLGtCQUFrQjtJQUdyQyxZQUFvQixnQkFBdUM7UUFBdkMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF1QjtJQUMzRCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsSUFBWTtRQUMzQixJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxFQUFFO1lBQy9CLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxrQkFBTyxFQUEwQixDQUFDO1lBQzVELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO2dCQUN4QyxNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzNDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsSUFBSTtvQkFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNsRDtTQUNGO1FBQ0QsSUFBSSxLQUErQixDQUFDO1FBQ3BDLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNsQixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBdEJELHFDQXNCQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxRQUFnQjtJQUV4QyxNQUFNLEtBQUssR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQsSUFBSSxLQUFLLEVBQUU7UUFDVCxPQUFPO1lBQ0wsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUNmLENBQUM7S0FDSDtJQUNELE9BQU8sRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLENBQUM7QUFDMUIsQ0FBQztBQVZELDhCQVVDO0FBRUQsU0FBUyxhQUFhLENBQUMsV0FBbUIsRUFBRSxNQUFXO0lBQ3JELE1BQU0sSUFBSSxHQUFXLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDakMsTUFBTSxRQUFRLEdBQUcsSUFBSSwwQkFBc0IsQ0FBQztRQUMxQyxRQUFRLEVBQUUsS0FBSztRQUNmLFFBQVEsRUFBRSxNQUFNLENBQUMsSUFBSTtRQUNyQixTQUFTLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJO1FBQ3RDLFdBQVc7UUFDWCxlQUFlLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUM7S0FDOUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxZQUFrQyxDQUFDO0lBQ3ZDLElBQUksTUFBTSxDQUFDLEVBQUUsRUFBRTtRQUNiLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUU7WUFDckIsWUFBWSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUNyRTtRQUNELElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRTtZQUMvQixZQUFZLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7U0FDL0U7S0FDRjtJQUNELDBEQUEwRDtJQUMxRCxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ1osMkdBQTJHO1FBQzNHLDhEQUE4RDtRQUM5RCxVQUFVLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQztRQUMzQixpQkFBaUIsRUFBRSxZQUFZO1FBQy9CLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUM7UUFDbkYsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQ2IsSUFBSSxFQUFFLE1BQU07UUFDWixJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUk7UUFDekQsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQztLQUNyQyxDQUFDLENBQUM7SUFDSCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxDQUFTO0lBQ25DLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxQixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDcEI7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcbmltcG9ydCB7UGFja2FnZUluZm99IGZyb20gJy4nO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhenlQYWNrYWdlRmFjdG9yeSB7XG4gIHBhY2thZ2VQYXRoTWFwOiBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGFja2FnZXNJdGVyYWJsZTogSXRlcmFibGU8UGFja2FnZUluZm8+KSB7XG4gIH1cblxuICBnZXRQYWNrYWdlQnlQYXRoKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCBudWxsIHtcbiAgICBpZiAodGhpcy5wYWNrYWdlUGF0aE1hcCA9PSBudWxsKSB7XG4gICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwID0gbmV3IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oKTtcbiAgICAgIGZvciAoY29uc3QgaW5mbyBvZiB0aGlzLnBhY2thZ2VzSXRlcmFibGUpIHtcbiAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlKGluZm8ucGF0aCwgaW5mby5qc29uKTtcbiAgICAgICAgdGhpcy5wYWNrYWdlUGF0aE1hcC5wdXREYXRhKGluZm8ucGF0aCwgcGspO1xuICAgICAgICBpZiAoaW5mby5yZWFsUGF0aCAhPT0gaW5mby5wYXRoKVxuICAgICAgICAgIHRoaXMucGFja2FnZVBhdGhNYXAucHV0RGF0YShpbmZvLnJlYWxQYXRoLCBwayk7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBmb3VuZDogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdO1xuICAgIGZvdW5kID0gdGhpcy5wYWNrYWdlUGF0aE1hcC5nZXRBbGxEYXRhKGZpbGUpO1xuICAgIGlmIChmb3VuZC5sZW5ndGggPiAwKVxuICAgICAgcmV0dXJuIGZvdW5kW2ZvdW5kLmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5hbWUobG9uZ05hbWU6IHN0cmluZyk6IHtuYW1lOiBzdHJpbmc7IHNjb3BlPzogc3RyaW5nfSB7XG5cbiAgY29uc3QgbWF0Y2ggPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NvcGU6IG1hdGNoWzFdLFxuICAgICAgbmFtZTogbWF0Y2hbMl1cbiAgICB9O1xuICB9XG4gIHJldHVybiB7bmFtZTogbG9uZ05hbWV9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlKHBhY2thZ2VQYXRoOiBzdHJpbmcsIHBrSnNvbjogYW55KSB7XG4gIGNvbnN0IG5hbWU6IHN0cmluZyA9IHBrSnNvbi5uYW1lO1xuICBjb25zdCBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKHtcbiAgICBpc1ZlbmRvcjogZmFsc2UsXG4gICAgbG9uZ05hbWU6IHBrSnNvbi5uYW1lLFxuICAgIHNob3J0TmFtZTogcGFyc2VOYW1lKHBrSnNvbi5uYW1lKS5uYW1lLFxuICAgIHBhY2thZ2VQYXRoLFxuICAgIHJlYWxQYWNrYWdlUGF0aDogZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKVxuICB9KTtcbiAgbGV0IG5vUGFyc2VGaWxlczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGlmIChwa0pzb24uZHIpIHtcbiAgICBpZiAocGtKc29uLmRyLm5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIubm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gICAgfVxuICAgIGlmIChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICAgIH1cbiAgfVxuICAvLyBjb25zdCBtYWluRmlsZTogc3RyaW5nID0gcGtKc29uLmJyb3dzZXIgfHwgcGtKc29uLm1haW47XG4gIGluc3RhbmNlLmluaXQoe1xuICAgIC8vIGZpbGU6IG1haW5GaWxlID8gUGF0aC5yZXNvbHZlKGluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCwgbWFpbkZpbGUpIDogdW5kZWZpbmVkLCAvLyBwYWNrYWdlLmpzb24gXCJicm93c2VyXCJcbiAgICAvLyBzdHlsZTogcGtKc29uLnN0eWxlID8gcmVzb2x2ZVN0eWxlKG5hbWUsIG5vZGVQYXRocykgOiBudWxsLFxuICAgIHBhcnNlZE5hbWU6IHBhcnNlTmFtZShuYW1lKSxcbiAgICBicm93c2VyaWZ5Tm9QYXJzZTogbm9QYXJzZUZpbGVzLFxuICAgIHRyYW5zbGF0YWJsZTogIV8uaGFzKHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpIHx8IF8uZ2V0KHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpLFxuICAgIGRyOiBwa0pzb24uZHIsXG4gICAganNvbjogcGtKc29uLFxuICAgIGkxOG46IHBrSnNvbi5kciAmJiBwa0pzb24uZHIuaTE4biA/IHBrSnNvbi5kci5pMThuIDogbnVsbCxcbiAgICBhcHBUeXBlOiBfLmdldChwa0pzb24sICdkci5hcHBUeXBlJylcbiAgfSk7XG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbiAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG4iXX0=