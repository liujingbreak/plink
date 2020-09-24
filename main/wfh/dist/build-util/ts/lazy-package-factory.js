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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnQ0FBZ0M7QUFDaEMsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1Qiw2REFBdUQ7QUFDdkQsMEVBQXdEO0FBR3hEOztHQUVHO0FBQ0gsTUFBcUIsa0JBQWtCO0lBR3JDLFlBQW9CLGdCQUF1QztRQUF2QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXVCO0lBQzNELENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUFZO1FBQzNCLElBQUksSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQTBCLENBQUM7WUFDNUQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ3hDLE1BQU0sRUFBRSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxJQUFJO29CQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ2xEO1NBQ0Y7UUFDRCxJQUFJLEtBQStCLENBQUM7UUFDcEMsS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ2xCLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUF0QkQscUNBc0JDO0FBRUQsU0FBZ0IsU0FBUyxDQUFDLFFBQWdCO0lBRXhDLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxJQUFJLEtBQUssRUFBRTtRQUNULE9BQU87WUFDTCxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ2YsQ0FBQztLQUNIO0lBQ0QsT0FBTyxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsQ0FBQztBQUMxQixDQUFDO0FBVkQsOEJBVUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxXQUFtQixFQUFFLE1BQVc7SUFDckQsTUFBTSxJQUFJLEdBQVcsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNqQyxNQUFNLFFBQVEsR0FBRyxJQUFJLDBCQUFzQixDQUFDO1FBQzFDLFFBQVEsRUFBRSxLQUFLO1FBQ2YsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJO1FBQ3JCLFNBQVMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUk7UUFDdEMsV0FBVztRQUNYLGVBQWUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztLQUM5QyxDQUFDLENBQUM7SUFDSCxJQUFJLFlBQWtDLENBQUM7SUFDdkMsSUFBSSxNQUFNLENBQUMsRUFBRSxFQUFFO1FBQ2IsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRTtZQUNyQixZQUFZLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ3JFO1FBQ0QsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFFO1lBQy9CLFlBQVksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUMvRTtLQUNGO0lBQ0QsMERBQTBEO0lBQzFELFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDWiwyR0FBMkc7UUFDM0csOERBQThEO1FBQzlELFVBQVUsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQzNCLGlCQUFpQixFQUFFLFlBQVk7UUFDL0IsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQztRQUNuRixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7UUFDYixJQUFJLEVBQUUsTUFBTTtRQUNaLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSTtRQUN6RCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO0tBQ3JDLENBQUMsQ0FBQztJQUNILE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQVM7SUFDbkMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN0QixDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwQjtJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2UtaW5zdGFuY2UnO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnLi4vLi4vcGFja2FnZS1tZ3InO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhenlQYWNrYWdlRmFjdG9yeSB7XG4gIHBhY2thZ2VQYXRoTWFwOiBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcGFja2FnZXNJdGVyYWJsZTogSXRlcmFibGU8UGFja2FnZUluZm8+KSB7XG4gIH1cblxuICBnZXRQYWNrYWdlQnlQYXRoKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCBudWxsIHtcbiAgICBpZiAodGhpcy5wYWNrYWdlUGF0aE1hcCA9PSBudWxsKSB7XG4gICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwID0gbmV3IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oKTtcbiAgICAgIGZvciAoY29uc3QgaW5mbyBvZiB0aGlzLnBhY2thZ2VzSXRlcmFibGUpIHtcbiAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlKGluZm8ucGF0aCwgaW5mby5qc29uKTtcbiAgICAgICAgdGhpcy5wYWNrYWdlUGF0aE1hcC5wdXREYXRhKGluZm8ucGF0aCwgcGspO1xuICAgICAgICBpZiAoaW5mby5yZWFsUGF0aCAhPT0gaW5mby5wYXRoKVxuICAgICAgICAgIHRoaXMucGFja2FnZVBhdGhNYXAucHV0RGF0YShpbmZvLnJlYWxQYXRoLCBwayk7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBmb3VuZDogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdO1xuICAgIGZvdW5kID0gdGhpcy5wYWNrYWdlUGF0aE1hcC5nZXRBbGxEYXRhKGZpbGUpO1xuICAgIGlmIChmb3VuZC5sZW5ndGggPiAwKVxuICAgICAgcmV0dXJuIGZvdW5kW2ZvdW5kLmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5hbWUobG9uZ05hbWU6IHN0cmluZyk6IHtuYW1lOiBzdHJpbmc7IHNjb3BlPzogc3RyaW5nfSB7XG5cbiAgY29uc3QgbWF0Y2ggPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NvcGU6IG1hdGNoWzFdLFxuICAgICAgbmFtZTogbWF0Y2hbMl1cbiAgICB9O1xuICB9XG4gIHJldHVybiB7bmFtZTogbG9uZ05hbWV9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlKHBhY2thZ2VQYXRoOiBzdHJpbmcsIHBrSnNvbjogYW55KSB7XG4gIGNvbnN0IG5hbWU6IHN0cmluZyA9IHBrSnNvbi5uYW1lO1xuICBjb25zdCBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKHtcbiAgICBpc1ZlbmRvcjogZmFsc2UsXG4gICAgbG9uZ05hbWU6IHBrSnNvbi5uYW1lLFxuICAgIHNob3J0TmFtZTogcGFyc2VOYW1lKHBrSnNvbi5uYW1lKS5uYW1lLFxuICAgIHBhY2thZ2VQYXRoLFxuICAgIHJlYWxQYWNrYWdlUGF0aDogZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKVxuICB9KTtcbiAgbGV0IG5vUGFyc2VGaWxlczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGlmIChwa0pzb24uZHIpIHtcbiAgICBpZiAocGtKc29uLmRyLm5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIubm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gICAgfVxuICAgIGlmIChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICAgIH1cbiAgfVxuICAvLyBjb25zdCBtYWluRmlsZTogc3RyaW5nID0gcGtKc29uLmJyb3dzZXIgfHwgcGtKc29uLm1haW47XG4gIGluc3RhbmNlLmluaXQoe1xuICAgIC8vIGZpbGU6IG1haW5GaWxlID8gUGF0aC5yZXNvbHZlKGluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCwgbWFpbkZpbGUpIDogdW5kZWZpbmVkLCAvLyBwYWNrYWdlLmpzb24gXCJicm93c2VyXCJcbiAgICAvLyBzdHlsZTogcGtKc29uLnN0eWxlID8gcmVzb2x2ZVN0eWxlKG5hbWUsIG5vZGVQYXRocykgOiBudWxsLFxuICAgIHBhcnNlZE5hbWU6IHBhcnNlTmFtZShuYW1lKSxcbiAgICBicm93c2VyaWZ5Tm9QYXJzZTogbm9QYXJzZUZpbGVzLFxuICAgIHRyYW5zbGF0YWJsZTogIV8uaGFzKHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpIHx8IF8uZ2V0KHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpLFxuICAgIGRyOiBwa0pzb24uZHIsXG4gICAganNvbjogcGtKc29uLFxuICAgIGkxOG46IHBrSnNvbi5kciAmJiBwa0pzb24uZHIuaTE4biA/IHBrSnNvbi5kci5pMThuIDogbnVsbCxcbiAgICBhcHBUeXBlOiBfLmdldChwa0pzb24sICdkci5hcHBUeXBlJylcbiAgfSk7XG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbiAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG4iXX0=