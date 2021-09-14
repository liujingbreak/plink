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
exports.scanPackages = exports.allSrcDirs = exports.eachRecipeSrc = exports.setLinkPatterns = exports.setProjectList = void 0;
/* eslint-disable max-len */
/**
 * To avoid cyclic referecing, This file should not depends on package-mgr/index !!!
 */
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs-extra"));
const find_package_1 = __importDefault(require("./package-mgr/find-package"));
// import * as rwPackageJson from './rwPackageJson';
const operators_1 = require("rxjs/operators");
let projectList = [];
let linkPatterns = [];
function setProjectList(list) {
    projectList = list;
}
exports.setProjectList = setProjectList;
function setLinkPatterns(list) {
    linkPatterns = Array.from(list);
}
exports.setLinkPatterns = setLinkPatterns;
function eachRecipeSrc(projectDir, callback) {
    if (arguments.length === 1) {
        callback = arguments[0];
        forProject(projectList);
    }
    else if (arguments.length === 2) {
        if (typeof projectDir === 'string' || Array.isArray(projectDir)) {
            forProject(projectDir);
        }
        else {
            forProject(projectList);
        }
    }
    function forProject(prjDirs) {
        [].concat(prjDirs).forEach(prjDir => {
            for (const srcDir of srcDirsOfProject(prjDir)) {
                callback(srcDir, prjDir);
            }
            // const e2eDir = Path.join(prjDir, 'e2etest');
            // if (fs.existsSync(e2eDir))
            //   callback!(e2eDir, prjDir);
        });
    }
}
exports.eachRecipeSrc = eachRecipeSrc;
function* allSrcDirs() {
    for (const projDir of projectList) {
        for (const srcDir of srcDirsOfProject(projDir)) {
            yield { srcDir, projDir };
        }
    }
    for (let pat of linkPatterns) {
        if (pat.endsWith('/**'))
            pat = pat.slice(0, -3);
        else if (pat.endsWith('/*'))
            pat = pat.slice(0, -2);
        pat = _.trimStart(pat, '.');
        yield { srcDir: pat };
    }
}
exports.allSrcDirs = allSrcDirs;
function* srcDirsOfProject(projectDir) {
    const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
    const pkJsonFile = Path.resolve(projectDir, 'package.json');
    // const recipeSrcMapping: {[recipe: string]: string} = {};
    let nameSrcSetting = {};
    let normalizedPrjName = Path.resolve(projectDir).replace(/[\/\\]/g, '.');
    normalizedPrjName = _.trim(normalizedPrjName, '.');
    if (fs.existsSync(pkJsonFile)) {
        const pkjson = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8'));
        if (pkjson.packages) {
            for (let pat of [].concat(pkjson.packages)) {
                if (pat.endsWith('/**'))
                    pat = pat.slice(0, -3);
                else if (pat.endsWith('/*'))
                    pat = pat.slice(0, -2);
                pat = _.trimStart(pat, '.');
                yield Path.resolve(projectDir, pat);
                // nameSrcSetting[config.resolve(
                //   'destDir', `recipes/${pkjson.name}${pat.length > 0 ? '.' : ''}${pat.replace(/[\/\\]/g, '.')}.recipe`)] =
                //     Path.resolve(projectDir, pat);
            }
            return;
        }
    }
    if (fs.existsSync(srcRecipeMapFile)) {
        // legacy: read dr.recipes.json
        nameSrcSetting = JSON.parse(fs.readFileSync(srcRecipeMapFile, 'utf8'));
    }
    else {
        const projectName = fs.existsSync(pkJsonFile) ? require(pkJsonFile).name : Path.basename(projectDir);
        if (fs.existsSync(Path.join(projectDir, 'src'))) {
            nameSrcSetting['recipes/' + projectName] = 'src';
        }
        else {
            const testSrcDir = Path.join(projectDir, 'app');
            if (fs.existsSync(testSrcDir) && fs.statSync(testSrcDir).isDirectory())
                nameSrcSetting['recipes/' + projectName] = 'app';
            else
                nameSrcSetting['recipes/' + projectName] = '.';
        }
    }
    for (const srcDir of Object.values(nameSrcSetting)) {
        yield srcDir;
    }
    return;
}
/**
 * @returns Observable of tuple [project, package.json file]
 */
function scanPackages() {
    return (0, rxjs_1.from)(allSrcDirs()).pipe((0, operators_1.mergeMap)(({ srcDir, projDir }) => (0, find_package_1.default)(srcDir, false).pipe((0, operators_1.map)(jsonFile => [projDir, jsonFile, srcDir]))));
}
exports.scanPackages = scanPackages;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QiwrQkFBc0M7QUFDdEMsNkNBQStCO0FBQy9CLDhFQUF5RDtBQUN6RCxvREFBb0Q7QUFDcEQsOENBQTZDO0FBRTdDLElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztBQUMvQixJQUFJLFlBQVksR0FBYSxFQUFFLENBQUM7QUFFaEMsU0FBZ0IsY0FBYyxDQUFDLElBQWM7SUFDM0MsV0FBVyxHQUFHLElBQUksQ0FBQztBQUNyQixDQUFDO0FBRkQsd0NBRUM7QUFFRCxTQUFnQixlQUFlLENBQUMsSUFBc0I7SUFDcEQsWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQUZELDBDQUVDO0FBWUQsU0FBZ0IsYUFBYSxDQUFDLFVBQTBDLEVBQ3RFLFFBQWdDO0lBQ2hDLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDMUIsUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDekI7U0FBTSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ2pDLElBQUksT0FBTyxVQUFVLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDL0QsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3hCO2FBQU07WUFDTCxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDekI7S0FDRjtJQUVELFNBQVMsVUFBVSxDQUFDLE9BQTBCO1FBQzNDLEVBQWUsQ0FBQyxNQUFNLENBQUMsT0FB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QzVCLElBQUEsb0JBQVEsRUFBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFBLHNCQUFlLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FDakUsSUFBQSxlQUFHLEVBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUF5QyxDQUFDLENBQ3JGLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQztBQU5ELG9DQU1DIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuLyoqXG4gKiBUbyBhdm9pZCBjeWNsaWMgcmVmZXJlY2luZywgVGhpcyBmaWxlIHNob3VsZCBub3QgZGVwZW5kcyBvbiBwYWNrYWdlLW1nci9pbmRleCAhISFcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgZmluZFBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlJztcbi8vIGltcG9ydCAqIGFzIHJ3UGFja2FnZUpzb24gZnJvbSAnLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7bWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5sZXQgcHJvamVjdExpc3Q6IHN0cmluZ1tdID0gW107XG5sZXQgbGlua1BhdHRlcm5zOiBzdHJpbmdbXSA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJvamVjdExpc3QobGlzdDogc3RyaW5nW10pIHtcbiAgcHJvamVjdExpc3QgPSBsaXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0TGlua1BhdHRlcm5zKGxpc3Q6IEl0ZXJhYmxlPHN0cmluZz4pIHtcbiAgbGlua1BhdHRlcm5zID0gQXJyYXkuZnJvbShsaXN0KTtcbn1cblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZVNyY0NhbGxiYWNrID0gKHNyY0Rpcjogc3RyaW5nLCBwcm9qZWN0RGlyOiBzdHJpbmcpID0+IHZvaWQ7XG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKiBVc2UgYWxsU3JjRGlycygpIGluc3RlYWQuXG4gKiBJdGVyYXRlIHNyYyBmb2xkZXIgZm9yIGNvbXBvbmVudCBpdGVtc1xuICogQHBhcmFtIHtzdHJpbmcgfCBzdHJpbmdbXX0gcHJvamVjdERpciBvcHRpb25hbCwgaWYgbm90IHByZXNlbnQgb3IgbnVsbCwgaW5jbHVkZXMgYWxsIHByb2plY3Qgc3JjIGZvbGRlcnNcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayAoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpOiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nLCBjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZyB8IEVhY2hSZWNpcGVTcmNDYWxsYmFjayxcbiAgY2FsbGJhY2s/OiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjYWxsYmFjayA9IGFyZ3VtZW50c1swXTtcbiAgICBmb3JQcm9qZWN0KHByb2plY3RMaXN0KTtcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgaWYgKHR5cGVvZiBwcm9qZWN0RGlyID09PSAnc3RyaW5nJyB8fCBBcnJheS5pc0FycmF5KHByb2plY3REaXIpKSB7XG4gICAgICBmb3JQcm9qZWN0KHByb2plY3REaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3JQcm9qZWN0KHByb2plY3RMaXN0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmb3JQcm9qZWN0KHByakRpcnM6IHN0cmluZ1tdIHwgc3RyaW5nKSB7XG4gICAgKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocHJqRGlycykuZm9yRWFjaChwcmpEaXIgPT4ge1xuICAgICAgZm9yIChjb25zdCBzcmNEaXIgb2Ygc3JjRGlyc09mUHJvamVjdChwcmpEaXIpKSB7XG4gICAgICAgIGNhbGxiYWNrIShzcmNEaXIsIHByakRpcik7XG4gICAgICB9XG4gICAgICAvLyBjb25zdCBlMmVEaXIgPSBQYXRoLmpvaW4ocHJqRGlyLCAnZTJldGVzdCcpO1xuICAgICAgLy8gaWYgKGZzLmV4aXN0c1N5bmMoZTJlRGlyKSlcbiAgICAgIC8vICAgY2FsbGJhY2shKGUyZURpciwgcHJqRGlyKTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIGFsbFNyY0RpcnMoKSB7XG4gIGZvciAoY29uc3QgcHJvakRpciBvZiBwcm9qZWN0TGlzdCkge1xuICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnNPZlByb2plY3QocHJvakRpcikpIHtcbiAgICAgIHlpZWxkIHtzcmNEaXIsIHByb2pEaXJ9O1xuICAgIH1cbiAgfVxuICBmb3IgKGxldCBwYXQgb2YgbGlua1BhdHRlcm5zKSB7XG4gICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTMpO1xuICAgIGVsc2UgaWYgKHBhdC5lbmRzV2l0aCgnLyonKSlcbiAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgcGF0ID0gXy50cmltU3RhcnQocGF0LCAnLicpO1xuICAgIHlpZWxkIHtzcmNEaXI6IHBhdH07XG4gIH1cbn1cblxuZnVuY3Rpb24qIHNyY0RpcnNPZlByb2plY3QocHJvamVjdERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHNyY1JlY2lwZU1hcEZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ2RyLnJlY2lwZXMuanNvbicpO1xuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gY29uc3QgcmVjaXBlU3JjTWFwcGluZzoge1tyZWNpcGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgbGV0IG5hbWVTcmNTZXR0aW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gIGxldCBub3JtYWxpemVkUHJqTmFtZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyKS5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKTtcbiAgbm9ybWFsaXplZFByak5hbWUgPSBfLnRyaW0obm9ybWFsaXplZFByak5hbWUsICcuJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpKSB7XG4gICAgY29uc3QgcGtqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKSk7XG4gICAgaWYgKHBranNvbi5wYWNrYWdlcykge1xuICAgICAgZm9yIChsZXQgcGF0IG9mIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBranNvbi5wYWNrYWdlcykpIHtcbiAgICAgICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcbiAgICAgICAgZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgICAgIHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcbiAgICAgICAgeWllbGQgUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHBhdCk7XG4gICAgICAgIC8vIG5hbWVTcmNTZXR0aW5nW2NvbmZpZy5yZXNvbHZlKFxuICAgICAgICAvLyAgICdkZXN0RGlyJywgYHJlY2lwZXMvJHtwa2pzb24ubmFtZX0ke3BhdC5sZW5ndGggPiAwID8gJy4nIDogJyd9JHtwYXQucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyl9LnJlY2lwZWApXSA9XG4gICAgICAgIC8vICAgICBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgaWYgKGZzLmV4aXN0c1N5bmMoc3JjUmVjaXBlTWFwRmlsZSkpIHtcbiAgICAvLyBsZWdhY3k6IHJlYWQgZHIucmVjaXBlcy5qc29uXG4gICAgbmFtZVNyY1NldHRpbmcgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhzcmNSZWNpcGVNYXBGaWxlLCAndXRmOCcpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkgPyByZXF1aXJlKHBrSnNvbkZpbGUpLm5hbWUgOiBQYXRoLmJhc2VuYW1lKHByb2plY3REaXIpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihwcm9qZWN0RGlyLCAnc3JjJykpKSB7XG4gICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ3NyYyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlc3RTcmNEaXIgPSBQYXRoLmpvaW4ocHJvamVjdERpciwgJ2FwcCcpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFNyY0RpcikgJiYgZnMuc3RhdFN5bmModGVzdFNyY0RpcikuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdhcHAnO1xuICAgICAgZWxzZVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJy4nO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IHNyY0RpciBvZiBPYmplY3QudmFsdWVzKG5hbWVTcmNTZXR0aW5nKSkge1xuICAgIHlpZWxkIHNyY0RpcjtcbiAgfVxuICByZXR1cm47XG59XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVDYWxsYmFjayA9IChyZWNpcGVEaXI6IHN0cmluZyxcbiAgaXNGcm9tSW5zdGFsbGF0aW9uOiBib29sZWFuLFxuICBqc29uRmlsZU5hbWU6IHN0cmluZyxcbiAganNvbkZpbGVDb250ZW50OiBzdHJpbmcpID0+IHZvaWQ7XG5cbi8qKlxuICogQHJldHVybnMgT2JzZXJ2YWJsZSBvZiB0dXBsZSBbcHJvamVjdCwgcGFja2FnZS5qc29uIGZpbGVdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2FuUGFja2FnZXMoKTogT2JzZXJ2YWJsZTxbc3RyaW5nIHwgdW5kZWZpbmVkLCBzdHJpbmcsIHN0cmluZ10+IHtcbiAgcmV0dXJuIGZyb20oYWxsU3JjRGlycygpKS5waXBlKFxuICAgIG1lcmdlTWFwKCh7c3JjRGlyLCBwcm9qRGlyfSkgPT4gZmluZFBhY2thZ2VKc29uKHNyY0RpciwgZmFsc2UpLnBpcGUoXG4gICAgICBtYXAoanNvbkZpbGUgPT4gW3Byb2pEaXIsIGpzb25GaWxlLCBzcmNEaXJdIGFzIFtzdHJpbmcgfCB1bmRlZmluZWQsIHN0cmluZywgc3RyaW5nXSlcbiAgICApKVxuICApO1xufVxuIl19