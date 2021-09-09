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
let linkPatterns;
function setProjectList(list) {
    projectList = list;
}
exports.setProjectList = setProjectList;
function setLinkPatterns(list) {
    linkPatterns = list;
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
    if (linkPatterns) {
        for (let pat of linkPatterns) {
            if (pat.endsWith('/**'))
                pat = pat.slice(0, -3);
            else if (pat.endsWith('/*'))
                pat = pat.slice(0, -2);
            pat = _.trimStart(pat, '.');
            yield { srcDir: pat };
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QiwrQkFBc0M7QUFDdEMsNkNBQStCO0FBQy9CLDhFQUF5RDtBQUN6RCxvREFBb0Q7QUFDcEQsOENBQTZDO0FBRTdDLElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztBQUMvQixJQUFJLFlBQTBDLENBQUM7QUFFL0MsU0FBZ0IsY0FBYyxDQUFDLElBQWM7SUFDM0MsV0FBVyxHQUFHLElBQUksQ0FBQztBQUNyQixDQUFDO0FBRkQsd0NBRUM7QUFFRCxTQUFnQixlQUFlLENBQUMsSUFBc0I7SUFDcEQsWUFBWSxHQUFHLElBQUksQ0FBQztBQUN0QixDQUFDO0FBRkQsMENBRUM7QUFZRCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdEUsUUFBZ0M7SUFDaEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQixRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN6QjtTQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDakMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMvRCxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDeEI7YUFBTTtZQUNMLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUN6QjtLQUNGO0lBRUQsU0FBUyxVQUFVLENBQUMsT0FBMEI7UUFDM0MsRUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVB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LElBQUEsb0JBQVEsRUFBQyxDQUFDLEVBQUMsTUFBTSxFQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUUsQ0FBQyxJQUFBLHNCQUFlLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FDakUsSUFBQSxlQUFHLEVBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUF5QyxDQUFDLENBQ3JGLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQztBQU5ELG9DQU1DIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuLyoqXG4gKiBUbyBhdm9pZCBjeWNsaWMgcmVmZXJlY2luZywgVGhpcyBmaWxlIHNob3VsZCBub3QgZGVwZW5kcyBvbiBwYWNrYWdlLW1nci9pbmRleCAhISFcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgZmluZFBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlJztcbi8vIGltcG9ydCAqIGFzIHJ3UGFja2FnZUpzb24gZnJvbSAnLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7bWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5sZXQgcHJvamVjdExpc3Q6IHN0cmluZ1tdID0gW107XG5sZXQgbGlua1BhdHRlcm5zOiBJdGVyYWJsZTxzdHJpbmc+IHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJvamVjdExpc3QobGlzdDogc3RyaW5nW10pIHtcbiAgcHJvamVjdExpc3QgPSBsaXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0TGlua1BhdHRlcm5zKGxpc3Q6IEl0ZXJhYmxlPHN0cmluZz4pIHtcbiAgbGlua1BhdHRlcm5zID0gbGlzdDtcbn1cblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZVNyY0NhbGxiYWNrID0gKHNyY0Rpcjogc3RyaW5nLCBwcm9qZWN0RGlyOiBzdHJpbmcpID0+IHZvaWQ7XG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKiBVc2UgYWxsU3JjRGlycygpIGluc3RlYWQuXG4gKiBJdGVyYXRlIHNyYyBmb2xkZXIgZm9yIGNvbXBvbmVudCBpdGVtc1xuICogQHBhcmFtIHtzdHJpbmcgfCBzdHJpbmdbXX0gcHJvamVjdERpciBvcHRpb25hbCwgaWYgbm90IHByZXNlbnQgb3IgbnVsbCwgaW5jbHVkZXMgYWxsIHByb2plY3Qgc3JjIGZvbGRlcnNcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayAoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpOiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nLCBjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZyB8IEVhY2hSZWNpcGVTcmNDYWxsYmFjayxcbiAgY2FsbGJhY2s/OiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjYWxsYmFjayA9IGFyZ3VtZW50c1swXTtcbiAgICBmb3JQcm9qZWN0KHByb2plY3RMaXN0KTtcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgaWYgKHR5cGVvZiBwcm9qZWN0RGlyID09PSAnc3RyaW5nJyB8fCBBcnJheS5pc0FycmF5KHByb2plY3REaXIpKSB7XG4gICAgICBmb3JQcm9qZWN0KHByb2plY3REaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3JQcm9qZWN0KHByb2plY3RMaXN0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmb3JQcm9qZWN0KHByakRpcnM6IHN0cmluZ1tdIHwgc3RyaW5nKSB7XG4gICAgKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocHJqRGlycykuZm9yRWFjaChwcmpEaXIgPT4ge1xuICAgICAgZm9yIChjb25zdCBzcmNEaXIgb2Ygc3JjRGlyc09mUHJvamVjdChwcmpEaXIpKSB7XG4gICAgICAgIGNhbGxiYWNrIShzcmNEaXIsIHByakRpcik7XG4gICAgICB9XG4gICAgICAvLyBjb25zdCBlMmVEaXIgPSBQYXRoLmpvaW4ocHJqRGlyLCAnZTJldGVzdCcpO1xuICAgICAgLy8gaWYgKGZzLmV4aXN0c1N5bmMoZTJlRGlyKSlcbiAgICAgIC8vICAgY2FsbGJhY2shKGUyZURpciwgcHJqRGlyKTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIGFsbFNyY0RpcnMoKSB7XG4gIGZvciAoY29uc3QgcHJvakRpciBvZiBwcm9qZWN0TGlzdCkge1xuICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnNPZlByb2plY3QocHJvakRpcikpIHtcbiAgICAgIHlpZWxkIHtzcmNEaXIsIHByb2pEaXJ9O1xuICAgIH1cbiAgfVxuICBpZiAobGlua1BhdHRlcm5zKSB7XG4gICAgZm9yIChsZXQgcGF0IG9mIGxpbmtQYXR0ZXJucykge1xuICAgICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMyk7XG4gICAgICBlbHNlIGlmIChwYXQuZW5kc1dpdGgoJy8qJykpXG4gICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgICBwYXQgPSBfLnRyaW1TdGFydChwYXQsICcuJyk7XG4gICAgICB5aWVsZCB7c3JjRGlyOiBwYXR9O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiogc3JjRGlyc09mUHJvamVjdChwcm9qZWN0RGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgc3JjUmVjaXBlTWFwRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAnZHIucmVjaXBlcy5qc29uJyk7XG4gIGNvbnN0IHBrSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyBjb25zdCByZWNpcGVTcmNNYXBwaW5nOiB7W3JlY2lwZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBsZXQgbmFtZVNyY1NldHRpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgbGV0IG5vcm1hbGl6ZWRQcmpOYW1lID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIpLnJlcGxhY2UoL1tcXC9cXFxcXS9nLCAnLicpO1xuICBub3JtYWxpemVkUHJqTmFtZSA9IF8udHJpbShub3JtYWxpemVkUHJqTmFtZSwgJy4nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkpIHtcbiAgICBjb25zdCBwa2pzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgICBpZiAocGtqc29uLnBhY2thZ2VzKSB7XG4gICAgICBmb3IgKGxldCBwYXQgb2YgKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocGtqc29uLnBhY2thZ2VzKSkge1xuICAgICAgICBpZiAocGF0LmVuZHNXaXRoKCcvKionKSlcbiAgICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTMpO1xuICAgICAgICBlbHNlIGlmIChwYXQuZW5kc1dpdGgoJy8qJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0yKTtcbiAgICAgICAgcGF0ID0gXy50cmltU3RhcnQocGF0LCAnLicpO1xuICAgICAgICB5aWVsZCBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgICAgLy8gbmFtZVNyY1NldHRpbmdbY29uZmlnLnJlc29sdmUoXG4gICAgICAgIC8vICAgJ2Rlc3REaXInLCBgcmVjaXBlcy8ke3BranNvbi5uYW1lfSR7cGF0Lmxlbmd0aCA+IDAgPyAnLicgOiAnJ30ke3BhdC5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKX0ucmVjaXBlYCldID1cbiAgICAgICAgLy8gICAgIFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBwYXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICBpZiAoZnMuZXhpc3RzU3luYyhzcmNSZWNpcGVNYXBGaWxlKSkge1xuICAgIC8vIGxlZ2FjeTogcmVhZCBkci5yZWNpcGVzLmpzb25cbiAgICBuYW1lU3JjU2V0dGluZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHNyY1JlY2lwZU1hcEZpbGUsICd1dGY4JykpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHByb2plY3ROYW1lID0gZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSA/IHJlcXVpcmUocGtKc29uRmlsZSkubmFtZSA6IFBhdGguYmFzZW5hbWUocHJvamVjdERpcik7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKHByb2plY3REaXIsICdzcmMnKSkpIHtcbiAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnc3JjJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVzdFNyY0RpciA9IFBhdGguam9pbihwcm9qZWN0RGlyLCAnYXBwJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0U3JjRGlyKSAmJiBmcy5zdGF0U3luYyh0ZXN0U3JjRGlyKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ2FwcCc7XG4gICAgICBlbHNlXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnLic7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qgc3JjRGlyIG9mIE9iamVjdC52YWx1ZXMobmFtZVNyY1NldHRpbmcpKSB7XG4gICAgeWllbGQgc3JjRGlyO1xuICB9XG4gIHJldHVybjtcbn1cblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZUNhbGxiYWNrID0gKHJlY2lwZURpcjogc3RyaW5nLFxuICBpc0Zyb21JbnN0YWxsYXRpb246IGJvb2xlYW4sXG4gIGpzb25GaWxlTmFtZTogc3RyaW5nLFxuICBqc29uRmlsZUNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZDtcblxuLyoqXG4gKiBAcmV0dXJucyBPYnNlcnZhYmxlIG9mIHR1cGxlIFtwcm9qZWN0LCBwYWNrYWdlLmpzb24gZmlsZV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjYW5QYWNrYWdlcygpOiBPYnNlcnZhYmxlPFtzdHJpbmcgfCB1bmRlZmluZWQsIHN0cmluZywgc3RyaW5nXT4ge1xuICByZXR1cm4gZnJvbShhbGxTcmNEaXJzKCkpLnBpcGUoXG4gICAgbWVyZ2VNYXAoKHtzcmNEaXIsIHByb2pEaXJ9KSA9PiBmaW5kUGFja2FnZUpzb24oc3JjRGlyLCBmYWxzZSkucGlwZShcbiAgICAgIG1hcChqc29uRmlsZSA9PiBbcHJvakRpciwganNvbkZpbGUsIHNyY0Rpcl0gYXMgW3N0cmluZyB8IHVuZGVmaW5lZCwgc3RyaW5nLCBzdHJpbmddKVxuICAgICkpXG4gICk7XG59XG4iXX0=