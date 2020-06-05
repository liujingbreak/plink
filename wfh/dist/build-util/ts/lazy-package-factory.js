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
                if (_.has(pkjson, 'dr')) {
                    const pk = createPackage(dir, pkjson);
                    this.packagePathMap.putData(dir, pk);
                    return pk;
                }
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
    // const mainFile: string = pkJson.browser || pkJson.main;
    instance.init({
        // file: mainFile ? Path.resolve(instance.realPackagePath, mainFile) : undefined, // package.json "browser"
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsMENBQTRCO0FBQzVCLDZEQUF1RDtBQUN2RCwwRUFBd0Q7QUFHeEQsTUFBcUIsa0JBQWtCO0lBQXZDO1FBQ0UsbUJBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQTBCLENBQUM7SUF3QnpELENBQUM7SUF0QkMsZ0JBQWdCLENBQUMsSUFBWTtRQUMzQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxLQUErQixDQUFDO1FBQ3BDLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNsQixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuQyxJQUFJLEdBQUcsS0FBSyxRQUFRO2dCQUNsQixNQUFNLENBQUMsbUJBQW1CO1lBQzVCLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUNqRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtvQkFDdkIsTUFBTSxFQUFFLEdBQUcsYUFB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TUFBTSxDQUFDLEVBQUU7UUFDYixJQUFJLEVBQUUsTUFBTTtRQUNaLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUM7UUFDdEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1FBQ3ZCLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSTtRQUN6RCxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO0tBQ3JDLENBQUMsQ0FBQztJQUNILE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQVM7SUFDbkMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN0QixDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwQjtJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2UtaW5zdGFuY2UnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExhenlQYWNrYWdlRmFjdG9yeSB7XG4gIHBhY2thZ2VQYXRoTWFwID0gbmV3IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oKTtcblxuICBnZXRQYWNrYWdlQnlQYXRoKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCBudWxsIHtcbiAgICBsZXQgY3VyclBhdGggPSBmaWxlO1xuICAgIGxldCBmb3VuZDogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdO1xuICAgIGZvdW5kID0gdGhpcy5wYWNrYWdlUGF0aE1hcC5nZXRBbGxEYXRhKGZpbGUpO1xuICAgIGlmIChmb3VuZC5sZW5ndGggPiAwKVxuICAgICAgcmV0dXJuIGZvdW5kW2ZvdW5kLmxlbmd0aCAtIDFdO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoY3VyclBhdGgpO1xuICAgICAgaWYgKGRpciA9PT0gY3VyclBhdGgpXG4gICAgICAgIGJyZWFrOyAvLyBIYXMgcmVhY2hlZCByb290XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4oZGlyLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgIGNvbnN0IHBranNvbiA9IHJlcXVpcmUoUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICAgICAgaWYgKF8uaGFzKHBranNvbiwgJ2RyJykpIHtcbiAgICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2UoZGlyLCBwa2pzb24pO1xuICAgICAgICAgIHRoaXMucGFja2FnZVBhdGhNYXAucHV0RGF0YShkaXIsIHBrKTtcbiAgICAgICAgICByZXR1cm4gcGs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGN1cnJQYXRoID0gZGlyO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VOYW1lKGxvbmdOYW1lOiBzdHJpbmcpOiB7bmFtZTogc3RyaW5nOyBzY29wZT86IHN0cmluZ30ge1xuXG4gIGNvbnN0IG1hdGNoID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLy5leGVjKGxvbmdOYW1lKTtcbiAgaWYgKG1hdGNoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNjb3BlOiBtYXRjaFsxXSxcbiAgICAgIG5hbWU6IG1hdGNoWzJdXG4gICAgfTtcbiAgfVxuICByZXR1cm4ge25hbWU6IGxvbmdOYW1lfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZShwYWNrYWdlUGF0aDogc3RyaW5nLCBwa0pzb246IGFueSkge1xuICBjb25zdCBuYW1lOiBzdHJpbmcgPSBwa0pzb24ubmFtZTtcbiAgY29uc3QgaW5zdGFuY2UgPSBuZXcgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSh7XG4gICAgaXNWZW5kb3I6IGZhbHNlLFxuICAgIGJ1bmRsZTogbnVsbCxcbiAgICBsb25nTmFtZTogcGtKc29uLm5hbWUsXG4gICAgc2hvcnROYW1lOiBwYXJzZU5hbWUocGtKc29uLm5hbWUpLm5hbWUsXG4gICAgcGFja2FnZVBhdGgsXG4gICAgcmVhbFBhY2thZ2VQYXRoOiBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpXG4gIH0pO1xuICBsZXQgZW50cnlWaWV3czogc3RyaW5nW10gfCB1bmRlZmluZWQsIGVudHJ5UGFnZXM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBsZXQgaXNFbnRyeVNlcnZlclRlbXBsYXRlID0gdHJ1ZTtcbiAgbGV0IG5vUGFyc2VGaWxlczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGlmIChwa0pzb24uZHIpIHtcbiAgICBpZiAocGtKc29uLmRyLmVudHJ5UGFnZSkge1xuICAgICAgaXNFbnRyeVNlcnZlclRlbXBsYXRlID0gZmFsc2U7XG4gICAgICBlbnRyeVBhZ2VzID0gW10uY29uY2F0KHBrSnNvbi5kci5lbnRyeVBhZ2UpO1xuICAgIH0gZWxzZSBpZiAocGtKc29uLmRyLmVudHJ5Vmlldykge1xuICAgICAgaXNFbnRyeVNlcnZlclRlbXBsYXRlID0gdHJ1ZTtcbiAgICAgIGVudHJ5Vmlld3MgPSBbXS5jb25jYXQocGtKc29uLmRyLmVudHJ5Vmlldyk7XG4gICAgfVxuICAgIGlmIChwa0pzb24uZHIubm9QYXJzZSkge1xuICAgICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5ub1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgICB9XG4gICAgaWYgKHBrSnNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkge1xuICAgICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gICAgfVxuICB9XG4gIC8vIGNvbnN0IG1haW5GaWxlOiBzdHJpbmcgPSBwa0pzb24uYnJvd3NlciB8fCBwa0pzb24ubWFpbjtcbiAgaW5zdGFuY2UuaW5pdCh7XG4gICAgLy8gZmlsZTogbWFpbkZpbGUgPyBQYXRoLnJlc29sdmUoaW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoLCBtYWluRmlsZSkgOiB1bmRlZmluZWQsIC8vIHBhY2thZ2UuanNvbiBcImJyb3dzZXJcIlxuICAgIG1haW46IHBrSnNvbi5tYWluLCAvLyBwYWNrYWdlLmpzb24gXCJtYWluXCJcbiAgICAvLyBzdHlsZTogcGtKc29uLnN0eWxlID8gcmVzb2x2ZVN0eWxlKG5hbWUsIG5vZGVQYXRocykgOiBudWxsLFxuICAgIHBhcnNlZE5hbWU6IHBhcnNlTmFtZShuYW1lKSxcbiAgICBlbnRyeVBhZ2VzLFxuICAgIGVudHJ5Vmlld3MsXG4gICAgYnJvd3NlcmlmeU5vUGFyc2U6IG5vUGFyc2VGaWxlcyxcbiAgICBpc0VudHJ5U2VydmVyVGVtcGxhdGUsXG4gICAgdHJhbnNsYXRhYmxlOiAhXy5oYXMocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJykgfHwgXy5nZXQocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJyksXG4gICAgZHI6IHBrSnNvbi5kcixcbiAgICBqc29uOiBwa0pzb24sXG4gICAgY29tcGlsZXI6IF8uZ2V0KHBrSnNvbiwgJ2RyLmNvbXBpbGVyJyksXG4gICAgYnJvd3NlcjogcGtKc29uLmJyb3dzZXIsXG4gICAgaTE4bjogcGtKc29uLmRyICYmIHBrSnNvbi5kci5pMThuID8gcGtKc29uLmRyLmkxOG4gOiBudWxsLFxuICAgIGFwcFR5cGU6IF8uZ2V0KHBrSnNvbiwgJ2RyLmFwcFR5cGUnKVxuICB9KTtcbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG5mdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbiAgfVxuICByZXR1cm4gcDtcbn1cbiJdfQ==