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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1Qiw2REFBdUQ7QUFDdkQsMEVBQXdEO0FBR3hELE1BQXFCLGtCQUFrQjtJQUF2QztRQUNFLG1CQUFjLEdBQUcsSUFBSSxrQkFBTyxFQUEwQixDQUFDO0lBd0J6RCxDQUFDO0lBdEJDLGdCQUFnQixDQUFDLElBQVk7UUFDM0IsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLElBQUksS0FBK0IsQ0FBQztRQUNwQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDbEIsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqQyxPQUFPLElBQUksRUFBRTtZQUNYLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkMsSUFBSSxHQUFHLEtBQUssUUFBUTtnQkFDbEIsTUFBTSxDQUFDLG1CQUFtQjtZQUM1QixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsRUFBRTtnQkFDakQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7b0JBQ3ZCLE1BQU0s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bkYsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQ2IsSUFBSSxFQUFFLE1BQU07UUFDWixRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDO1FBQ3RDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztRQUN2QixJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUk7UUFDekQsT0FBTyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQztLQUNyQyxDQUFDLENBQUM7SUFDSCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxDQUFTO0lBQ25DLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxQixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDcEI7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYXp5UGFja2FnZUZhY3Rvcnkge1xuICBwYWNrYWdlUGF0aE1hcCA9IG5ldyBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KCk7XG5cbiAgZ2V0UGFja2FnZUJ5UGF0aChmaWxlOiBzdHJpbmcpOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgbnVsbCB7XG4gICAgbGV0IGN1cnJQYXRoID0gZmlsZTtcbiAgICBsZXQgZm91bmQ6IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXTtcbiAgICBmb3VuZCA9IHRoaXMucGFja2FnZVBhdGhNYXAuZ2V0QWxsRGF0YShmaWxlKTtcbiAgICBpZiAoZm91bmQubGVuZ3RoID4gMClcbiAgICAgIHJldHVybiBmb3VuZFtmb3VuZC5sZW5ndGggLSAxXTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKGN1cnJQYXRoKTtcbiAgICAgIGlmIChkaXIgPT09IGN1cnJQYXRoKVxuICAgICAgICBicmVhazsgLy8gSGFzIHJlYWNoZWQgcm9vdFxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICBjb25zdCBwa2pzb24gPSByZXF1aXJlKFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgICAgIGlmIChfLmhhcyhwa2pzb24sICdkcicpKSB7XG4gICAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlKGRpciwgcGtqc29uKTtcbiAgICAgICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwLnB1dERhdGEoZGlyLCBwayk7XG4gICAgICAgICAgcmV0dXJuIHBrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjdXJyUGF0aCA9IGRpcjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKToge25hbWU6IHN0cmluZzsgc2NvcGU/OiBzdHJpbmd9IHtcblxuICBjb25zdCBtYXRjaCA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS8uZXhlYyhsb25nTmFtZSk7XG4gIGlmIChtYXRjaCkge1xuICAgIHJldHVybiB7XG4gICAgICBzY29wZTogbWF0Y2hbMV0sXG4gICAgICBuYW1lOiBtYXRjaFsyXVxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtuYW1lOiBsb25nTmFtZX07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2UocGFja2FnZVBhdGg6IHN0cmluZywgcGtKc29uOiBhbnkpIHtcbiAgY29uc3QgbmFtZTogc3RyaW5nID0gcGtKc29uLm5hbWU7XG4gIGNvbnN0IGluc3RhbmNlID0gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe1xuICAgIGlzVmVuZG9yOiBmYWxzZSxcbiAgICBidW5kbGU6IG51bGwsXG4gICAgbG9uZ05hbWU6IHBrSnNvbi5uYW1lLFxuICAgIHNob3J0TmFtZTogcGFyc2VOYW1lKHBrSnNvbi5uYW1lKS5uYW1lLFxuICAgIHBhY2thZ2VQYXRoLFxuICAgIHJlYWxQYWNrYWdlUGF0aDogZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKVxuICB9KTtcbiAgbGV0IGVudHJ5Vmlld3M6IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBlbnRyeVBhZ2VzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgbGV0IGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSA9IHRydWU7XG4gIGxldCBub1BhcnNlRmlsZXM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBpZiAocGtKc29uLmRyKSB7XG4gICAgaWYgKHBrSnNvbi5kci5lbnRyeVBhZ2UpIHtcbiAgICAgIGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSA9IGZhbHNlO1xuICAgICAgZW50cnlQYWdlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuZW50cnlQYWdlKTtcbiAgICB9IGVsc2UgaWYgKHBrSnNvbi5kci5lbnRyeVZpZXcpIHtcbiAgICAgIGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSA9IHRydWU7XG4gICAgICBlbnRyeVZpZXdzID0gW10uY29uY2F0KHBrSnNvbi5kci5lbnRyeVZpZXcpO1xuICAgIH1cbiAgICBpZiAocGtKc29uLmRyLm5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIubm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gICAgfVxuICAgIGlmIChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgICAgIG5vUGFyc2VGaWxlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICAgIH1cbiAgfVxuICAvLyBjb25zdCBtYWluRmlsZTogc3RyaW5nID0gcGtKc29uLmJyb3dzZXIgfHwgcGtKc29uLm1haW47XG4gIGluc3RhbmNlLmluaXQoe1xuICAgIC8vIGZpbGU6IG1haW5GaWxlID8gUGF0aC5yZXNvbHZlKGluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCwgbWFpbkZpbGUpIDogdW5kZWZpbmVkLCAvLyBwYWNrYWdlLmpzb24gXCJicm93c2VyXCJcbiAgICBtYWluOiBwa0pzb24ubWFpbiwgLy8gcGFja2FnZS5qc29uIFwibWFpblwiXG4gICAgLy8gc3R5bGU6IHBrSnNvbi5zdHlsZSA/IHJlc29sdmVTdHlsZShuYW1lLCBub2RlUGF0aHMpIDogbnVsbCxcbiAgICBwYXJzZWROYW1lOiBwYXJzZU5hbWUobmFtZSksXG4gICAgZW50cnlQYWdlcyxcbiAgICBlbnRyeVZpZXdzLFxuICAgIGJyb3dzZXJpZnlOb1BhcnNlOiBub1BhcnNlRmlsZXMsXG4gICAgaXNFbnRyeVNlcnZlclRlbXBsYXRlLFxuICAgIHRyYW5zbGF0YWJsZTogIV8uaGFzKHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpIHx8IF8uZ2V0KHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpLFxuICAgIGRyOiBwa0pzb24uZHIsXG4gICAganNvbjogcGtKc29uLFxuICAgIGNvbXBpbGVyOiBfLmdldChwa0pzb24sICdkci5jb21waWxlcicpLFxuICAgIGJyb3dzZXI6IHBrSnNvbi5icm93c2VyLFxuICAgIGkxOG46IHBrSnNvbi5kciAmJiBwa0pzb24uZHIuaTE4biA/IHBrSnNvbi5kci5pMThuIDogbnVsbCxcbiAgICBhcHBUeXBlOiBfLmdldChwa0pzb24sICdkci5hcHBUeXBlJylcbiAgfSk7XG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbiAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG4iXX0=