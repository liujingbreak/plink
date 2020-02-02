"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_instance_1 = __importDefault(require("./package-instance"));
class LazyPackageFactory {
    constructor() {
        this.packagePathMap = new dir_tree_1.DirTree();
    }
    getPackageByPath(file) {
        let currPath = file;
        let found;
        found = this.packagePathMap.getAllData(file);
        if (found.length > 0)
            return found[found.length - 1];
        while (true) {
            const dir = Path.dirname(currPath);
            if (dir === currPath)
                break; // Has reached root
            if (fs.existsSync(Path.join(dir, 'package.json'))) {
                const pkjson = require(Path.join(dir, 'package.json'));
                const pk = createPackage(dir, pkjson);
                this.packagePathMap.putData(dir, pk);
                return pk;
            }
            currPath = dir;
        }
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
        bundle: null,
        longName: pkJson.name,
        shortName: parseName(pkJson.name).name,
        packagePath,
        realPackagePath: fs.realpathSync(packagePath)
    });
    let entryViews, entryPages;
    let isEntryServerTemplate = true;
    let noParseFiles;
    if (pkJson.dr) {
        if (pkJson.dr.entryPage) {
            isEntryServerTemplate = false;
            entryPages = [].concat(pkJson.dr.entryPage);
        }
        else if (pkJson.dr.entryView) {
            isEntryServerTemplate = true;
            entryViews = [].concat(pkJson.dr.entryView);
        }
        if (pkJson.dr.noParse) {
            noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
        }
        if (pkJson.dr.browserifyNoParse) {
            noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
        }
    }
    const mainFile = pkJson.browser || pkJson.main;
    instance.init({
        file: mainFile ? fs.realpathSync(Path.resolve(packagePath, mainFile)) : undefined,
        main: pkJson.main,
        // style: pkJson.style ? resolveStyle(name, nodePaths) : null,
        parsedName: parseName(name),
        entryPages,
        entryViews,
        browserifyNoParse: noParseFiles,
        isEntryServerTemplate,
        translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
        dr: pkJson.dr,
        json: pkJson,
        compiler: _.get(pkJson, 'dr.compiler'),
        browser: pkJson.browser,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsMENBQTRCO0FBQzVCLDZEQUF1RDtBQUN2RCwwRUFBd0Q7QUFHeEQsTUFBcUIsa0JBQWtCO0lBQXZDO1FBQ0UsbUJBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQTBCLENBQUM7SUFzQnpELENBQUM7SUFwQkMsZ0JBQWdCLENBQUMsSUFBWTtRQUMzQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxLQUErQixDQUFDO1FBQ3BDLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNsQixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuQyxJQUFJLEdBQUcsS0FBSyxRQUFRO2dCQUNsQixNQUFNLENBQUMsbUJBQW1CO1lBQzVCLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUNqRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsTUFBTSxFQUFFLEdBQUcsYUFBYSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGNBQWMsQ0FB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QUcsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQztRQUNuRixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7UUFDYixJQUFJLEVBQUUsTUFBTTtRQUNaLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUM7UUFDdEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1FBQ3ZCLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSTtRQUN6RCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO0tBQ3JDLENBQUMsQ0FBQztJQUNILE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQVM7SUFDbkMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN0QixDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwQjtJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2UtaW5zdGFuY2UnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhenlQYWNrYWdlRmFjdG9yeSB7XG4gIHBhY2thZ2VQYXRoTWFwID0gbmV3IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oKTtcblxuICBnZXRQYWNrYWdlQnlQYXRoKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCBudWxsIHtcbiAgICBsZXQgY3VyclBhdGggPSBmaWxlO1xuICAgIGxldCBmb3VuZDogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdO1xuICAgIGZvdW5kID0gdGhpcy5wYWNrYWdlUGF0aE1hcC5nZXRBbGxEYXRhKGZpbGUpO1xuICAgIGlmIChmb3VuZC5sZW5ndGggPiAwKVxuICAgICAgcmV0dXJuIGZvdW5kW2ZvdW5kLmxlbmd0aCAtIDFdO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoY3VyclBhdGgpO1xuICAgICAgaWYgKGRpciA9PT0gY3VyclBhdGgpXG4gICAgICAgIGJyZWFrOyAvLyBIYXMgcmVhY2hlZCByb290XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4oZGlyLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgIGNvbnN0IHBranNvbiA9IHJlcXVpcmUoUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlKGRpciwgcGtqc29uKTtcbiAgICAgICAgdGhpcy5wYWNrYWdlUGF0aE1hcC5wdXREYXRhKGRpciwgcGspO1xuICAgICAgICByZXR1cm4gcGs7XG4gICAgICB9XG4gICAgICBjdXJyUGF0aCA9IGRpcjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKToge25hbWU6IHN0cmluZzsgc2NvcGU/OiBzdHJpbmd9IHtcblxuICBjb25zdCBtYXRjaCA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS8uZXhlYyhsb25nTmFtZSk7XG4gIGlmIChtYXRjaCkge1xuICAgIHJldHVybiB7XG4gICAgICBzY29wZTogbWF0Y2hbMV0sXG4gICAgICBuYW1lOiBtYXRjaFsyXVxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtuYW1lOiBsb25nTmFtZX07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2UocGFja2FnZVBhdGg6IHN0cmluZywgcGtKc29uOiBhbnkpIHtcbiAgY29uc3QgbmFtZTogc3RyaW5nID0gcGtKc29uLm5hbWU7XG4gIGNvbnN0IGluc3RhbmNlID0gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe1xuICAgIGlzVmVuZG9yOiBmYWxzZSxcbiAgICBidW5kbGU6IG51bGwsXG4gICAgbG9uZ05hbWU6IHBrSnNvbi5uYW1lLFxuICAgIHNob3J0TmFtZTogcGFyc2VOYW1lKHBrSnNvbi5uYW1lKS5uYW1lLFxuICAgIHBhY2thZ2VQYXRoLFxuICAgIHJlYWxQYWNrYWdlUGF0aDogZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKVxuICB9KTtcbiAgbGV0IGVudHJ5Vmlld3M6IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBlbnRyeVBhZ2VzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgbGV0IGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSA9IHRydWU7XG4gIGxldCBub1BhcnNlRmlsZXM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBpZiAocGtKc29uLmRyKSB7XG4gICAgaWYgKHBrSnNvbi5kci5lbnRyeVBhZ2UpIHtcbiAgICAgIGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSA9IGZhbHNlO1xuICAgICAgZW50cnlQYWdlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuZW50cnlQYWdlKTtcbiAgICB9IGVsc2UgaWYgKHBrSnNvbi5kci5lbnRyeVZpZXcpIHtcbiAgICAgIGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSA9IHRydWU7XG4gICAgICBlbnRyeVZpZXdzID0gW10uY29uY2F0KHBrSnNvbi5kci5lbnRyeVZpZXcpO1xuICAgIH1cbiAgICBpZiAocGtKc29uLmRyLm5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIubm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gICAgfVxuICAgIGlmIChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICAgIH1cbiAgfVxuICBjb25zdCBtYWluRmlsZTogc3RyaW5nID0gcGtKc29uLmJyb3dzZXIgfHwgcGtKc29uLm1haW47XG4gIGluc3RhbmNlLmluaXQoe1xuICAgIGZpbGU6IG1haW5GaWxlID8gZnMucmVhbHBhdGhTeW5jKFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgbWFpbkZpbGUpKSA6IHVuZGVmaW5lZCwgLy8gcGFja2FnZS5qc29uIFwiYnJvd3NlclwiXG4gICAgbWFpbjogcGtKc29uLm1haW4sIC8vIHBhY2thZ2UuanNvbiBcIm1haW5cIlxuICAgIC8vIHN0eWxlOiBwa0pzb24uc3R5bGUgPyByZXNvbHZlU3R5bGUobmFtZSwgbm9kZVBhdGhzKSA6IG51bGwsXG4gICAgcGFyc2VkTmFtZTogcGFyc2VOYW1lKG5hbWUpLFxuICAgIGVudHJ5UGFnZXMsXG4gICAgZW50cnlWaWV3cyxcbiAgICBicm93c2VyaWZ5Tm9QYXJzZTogbm9QYXJzZUZpbGVzLFxuICAgIGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSxcbiAgICB0cmFuc2xhdGFibGU6ICFfLmhhcyhwa0pzb24sICdkci50cmFuc2xhdGFibGUnKSB8fCBfLmdldChwa0pzb24sICdkci50cmFuc2xhdGFibGUnKSxcbiAgICBkcjogcGtKc29uLmRyLFxuICAgIGpzb246IHBrSnNvbixcbiAgICBjb21waWxlcjogXy5nZXQocGtKc29uLCAnZHIuY29tcGlsZXInKSxcbiAgICBicm93c2VyOiBwa0pzb24uYnJvd3NlcixcbiAgICBpMThuOiBwa0pzb24uZHIgJiYgcGtKc29uLmRyLmkxOG4gPyBwa0pzb24uZHIuaTE4biA6IG51bGwsXG4gICAgYXBwVHlwZTogXy5nZXQocGtKc29uLCAnZHIuYXBwVHlwZScpXG4gIH0pO1xuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbmZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcbiAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG4gICAgcCA9IHAuc3Vic3RyaW5nKDIpO1xuICB9XG4gIHJldHVybiBwO1xufVxuIl19