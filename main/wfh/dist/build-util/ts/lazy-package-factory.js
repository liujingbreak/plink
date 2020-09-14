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
/**
 * @deprecated
 */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eS1wYWNrYWdlLWZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1Qiw2REFBdUQ7QUFDdkQsMEVBQXdEO0FBRXhEOztHQUVHO0FBQ0gsTUFBcUIsa0JBQWtCO0lBQXZDO1FBQ0UsbUJBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQTBCLENBQUM7SUF3QnpELENBQUM7SUF0QkMsZ0JBQWdCLENBQUMsSUFBWTtRQUMzQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxLQUErQixDQUFDO1FBQ3BDLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNsQixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuQyxJQUFJLEdBQUcsS0FBSyxRQUFRO2dCQUNsQixNQUFNLENBQUMsbUJBQW1CO1lBQzVCLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUNqRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtv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QyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDcEI7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcblxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMYXp5UGFja2FnZUZhY3Rvcnkge1xuICBwYWNrYWdlUGF0aE1hcCA9IG5ldyBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KCk7XG5cbiAgZ2V0UGFja2FnZUJ5UGF0aChmaWxlOiBzdHJpbmcpOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgbnVsbCB7XG4gICAgbGV0IGN1cnJQYXRoID0gZmlsZTtcbiAgICBsZXQgZm91bmQ6IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXTtcbiAgICBmb3VuZCA9IHRoaXMucGFja2FnZVBhdGhNYXAuZ2V0QWxsRGF0YShmaWxlKTtcbiAgICBpZiAoZm91bmQubGVuZ3RoID4gMClcbiAgICAgIHJldHVybiBmb3VuZFtmb3VuZC5sZW5ndGggLSAxXTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKGN1cnJQYXRoKTtcbiAgICAgIGlmIChkaXIgPT09IGN1cnJQYXRoKVxuICAgICAgICBicmVhazsgLy8gSGFzIHJlYWNoZWQgcm9vdFxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICBjb25zdCBwa2pzb24gPSByZXF1aXJlKFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgICAgIGlmIChfLmhhcyhwa2pzb24sICdkcicpKSB7XG4gICAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlKGRpciwgcGtqc29uKTtcbiAgICAgICAgICB0aGlzLnBhY2thZ2VQYXRoTWFwLnB1dERhdGEoZGlyLCBwayk7XG4gICAgICAgICAgcmV0dXJuIHBrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjdXJyUGF0aCA9IGRpcjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTmFtZShsb25nTmFtZTogc3RyaW5nKToge25hbWU6IHN0cmluZzsgc2NvcGU/OiBzdHJpbmd9IHtcblxuICBjb25zdCBtYXRjaCA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS8uZXhlYyhsb25nTmFtZSk7XG4gIGlmIChtYXRjaCkge1xuICAgIHJldHVybiB7XG4gICAgICBzY29wZTogbWF0Y2hbMV0sXG4gICAgICBuYW1lOiBtYXRjaFsyXVxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtuYW1lOiBsb25nTmFtZX07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2UocGFja2FnZVBhdGg6IHN0cmluZywgcGtKc29uOiBhbnkpIHtcbiAgY29uc3QgbmFtZTogc3RyaW5nID0gcGtKc29uLm5hbWU7XG4gIGNvbnN0IGluc3RhbmNlID0gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe1xuICAgIGlzVmVuZG9yOiBmYWxzZSxcbiAgICBsb25nTmFtZTogcGtKc29uLm5hbWUsXG4gICAgc2hvcnROYW1lOiBwYXJzZU5hbWUocGtKc29uLm5hbWUpLm5hbWUsXG4gICAgcGFja2FnZVBhdGgsXG4gICAgcmVhbFBhY2thZ2VQYXRoOiBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpXG4gIH0pO1xuICBsZXQgbm9QYXJzZUZpbGVzOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgaWYgKHBrSnNvbi5kcikge1xuICAgIGlmIChwa0pzb24uZHIubm9QYXJzZSkge1xuICAgICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5ub1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgICB9XG4gICAgaWYgKHBrSnNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkge1xuICAgICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gICAgfVxuICB9XG4gIC8vIGNvbnN0IG1haW5GaWxlOiBzdHJpbmcgPSBwa0pzb24uYnJvd3NlciB8fCBwa0pzb24ubWFpbjtcbiAgaW5zdGFuY2UuaW5pdCh7XG4gICAgLy8gZmlsZTogbWFpbkZpbGUgPyBQYXRoLnJlc29sdmUoaW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoLCBtYWluRmlsZSkgOiB1bmRlZmluZWQsIC8vIHBhY2thZ2UuanNvbiBcImJyb3dzZXJcIlxuICAgIC8vIHN0eWxlOiBwa0pzb24uc3R5bGUgPyByZXNvbHZlU3R5bGUobmFtZSwgbm9kZVBhdGhzKSA6IG51bGwsXG4gICAgcGFyc2VkTmFtZTogcGFyc2VOYW1lKG5hbWUpLFxuICAgIGJyb3dzZXJpZnlOb1BhcnNlOiBub1BhcnNlRmlsZXMsXG4gICAgdHJhbnNsYXRhYmxlOiAhXy5oYXMocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJykgfHwgXy5nZXQocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJyksXG4gICAgZHI6IHBrSnNvbi5kcixcbiAgICBqc29uOiBwa0pzb24sXG4gICAgaTE4bjogcGtKc29uLmRyICYmIHBrSnNvbi5kci5pMThuID8gcGtKc29uLmRyLmkxOG4gOiBudWxsLFxuICAgIGFwcFR5cGU6IF8uZ2V0KHBrSnNvbiwgJ2RyLmFwcFR5cGUnKVxuICB9KTtcbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG5mdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbiAgfVxuICByZXR1cm4gcDtcbn1cbiJdfQ==