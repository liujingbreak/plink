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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1Qiw2REFBdUQ7QUFDdkQsMEVBQXdEO0FBR3hELE1BQXFCLGtCQUFrQjtJQUF2QztRQUNFLG1CQUFjLEdBQUcsSUFBSSxrQkFBTyxFQUEwQixDQUFDO0lBd0J6RCxDQUFDO0lBdEJDLGdCQUFnQixDQUFDLElBQVk7UUFDM0IsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLElBQUksS0FBK0IsQ0FBQztRQUNwQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDbEIsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqQyxPQUFPLElBQUksRUFBRTtZQUNYLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkMsSUFBSSxHQUFHLEtBQUssUUFBUTtnQkFDbEIsTUFBTSxDQUFDLG1CQUFtQjtZQUM1QixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsRUFBRTtnQkFDakQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQ3ZCLE1BQU0s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LENBQUMsQ0FBQyxDQUFDO0tBQ3BCO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJy4vcGFja2FnZS1pbnN0YW5jZSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGF6eVBhY2thZ2VGYWN0b3J5IHtcbiAgcGFja2FnZVBhdGhNYXAgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuXG4gIGdldFBhY2thZ2VCeVBhdGgoZmlsZTogc3RyaW5nKTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IG51bGwge1xuICAgIGxldCBjdXJyUGF0aCA9IGZpbGU7XG4gICAgbGV0IGZvdW5kOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW107XG4gICAgZm91bmQgPSB0aGlzLnBhY2thZ2VQYXRoTWFwLmdldEFsbERhdGEoZmlsZSk7XG4gICAgaWYgKGZvdW5kLmxlbmd0aCA+IDApXG4gICAgICByZXR1cm4gZm91bmRbZm91bmQubGVuZ3RoIC0gMV07XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShjdXJyUGF0aCk7XG4gICAgICBpZiAoZGlyID09PSBjdXJyUGF0aClcbiAgICAgICAgYnJlYWs7IC8vIEhhcyByZWFjaGVkIHJvb3RcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgY29uc3QgcGtqc29uID0gcmVxdWlyZShQYXRoLmpvaW4oZGlyLCAncGFja2FnZS5qc29uJykpO1xuICAgICAgICBpZiAoXy5oYXMocGtqc29uLCAnZHInKSkge1xuICAgICAgICAgIGNvbnN0IHBrID0gY3JlYXRlUGFja2FnZShkaXIsIHBranNvbik7XG4gICAgICAgICAgdGhpcy5wYWNrYWdlUGF0aE1hcC5wdXREYXRhKGRpciwgcGspO1xuICAgICAgICAgIHJldHVybiBwaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY3VyclBhdGggPSBkaXI7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5hbWUobG9uZ05hbWU6IHN0cmluZyk6IHtuYW1lOiBzdHJpbmc7IHNjb3BlPzogc3RyaW5nfSB7XG5cbiAgY29uc3QgbWF0Y2ggPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvLmV4ZWMobG9uZ05hbWUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2NvcGU6IG1hdGNoWzFdLFxuICAgICAgbmFtZTogbWF0Y2hbMl1cbiAgICB9O1xuICB9XG4gIHJldHVybiB7bmFtZTogbG9uZ05hbWV9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlKHBhY2thZ2VQYXRoOiBzdHJpbmcsIHBrSnNvbjogYW55KSB7XG4gIGNvbnN0IG5hbWU6IHN0cmluZyA9IHBrSnNvbi5uYW1lO1xuICBjb25zdCBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKHtcbiAgICBpc1ZlbmRvcjogZmFsc2UsXG4gICAgbG9uZ05hbWU6IHBrSnNvbi5uYW1lLFxuICAgIHNob3J0TmFtZTogcGFyc2VOYW1lKHBrSnNvbi5uYW1lKS5uYW1lLFxuICAgIHBhY2thZ2VQYXRoLFxuICAgIHJlYWxQYWNrYWdlUGF0aDogZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKVxuICB9KTtcbiAgbGV0IG5vUGFyc2VGaWxlczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGlmIChwa0pzb24uZHIpIHtcbiAgICBpZiAocGtKc29uLmRyLm5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIubm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gICAgfVxuICAgIGlmIChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICAgIH1cbiAgfVxuICAvLyBjb25zdCBtYWluRmlsZTogc3RyaW5nID0gcGtKc29uLmJyb3dzZXIgfHwgcGtKc29uLm1haW47XG4gIGluc3RhbmNlLmluaXQoe1xuICAgIC8vIGZpbGU6IG1haW5GaWxlID8gUGF0aC5yZXNvbHZlKGluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCwgbWFpbkZpbGUpIDogdW5kZWZpbmVkLCAvLyBwYWNrYWdlLmpzb24gXCJicm93c2VyXCJcbiAgICAvLyBzdHlsZTogcGtKc29uLnN0eWxlID8gcmVzb2x2ZVN0eWxlKG5hbWUsIG5vZGVQYXRocykgOiBudWxsLFxuICAgIHBhcnNlZE5hbWU6IHBhcnNlTmFtZShuYW1lKSxcbiAgICBicm93c2VyaWZ5Tm9QYXJzZTogbm9QYXJzZUZpbGVzLFxuICAgIHRyYW5zbGF0YWJsZTogIV8uaGFzKHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpIHx8IF8uZ2V0KHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpLFxuICAgIGRyOiBwa0pzb24uZHIsXG4gICAganNvbjogcGtKc29uLFxuICAgIGkxOG46IHBrSnNvbi5kciAmJiBwa0pzb24uZHIuaTE4biA/IHBrSnNvbi5kci5pMThuIDogbnVsbCxcbiAgICBhcHBUeXBlOiBfLmdldChwa0pzb24sICdkci5hcHBUeXBlJylcbiAgfSk7XG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbiAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG4iXX0=