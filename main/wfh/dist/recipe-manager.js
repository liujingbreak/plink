"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qjs7R0FFRztBQUNILDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsK0JBQXNDO0FBQ3RDLDZDQUErQjtBQUMvQiw4RUFBeUQ7QUFDekQsb0RBQW9EO0FBQ3BELDhDQUE2QztBQUU3QyxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUM7QUFDL0IsSUFBSSxZQUFZLEdBQWEsRUFBRSxDQUFDO0FBRWhDLFNBQWdCLGNBQWMsQ0FBQyxJQUFjO0lBQzNDLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFDckIsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBZ0IsZUFBZSxDQUFDLElBQXNCO0lBQ3BELFlBQVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFGRCwwQ0FFQztBQVlELFNBQWdCLGFBQWEsQ0FBQyxVQUEwQyxFQUN0RSxRQUFnQztJQUNoQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUNqQyxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQy9ELFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUN4QjthQUFNO1lBQ0wsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQ3pCO0tBQ0Y7SUFFRCxTQUFTLFVBQVUsQ0FBQyxPQUEwQjtRQUMzQyxFQUFlLENBQUMsTUFBTSxDQUFD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SSxDQUM1QixJQUFBLG9CQUFRLEVBQUMsQ0FBQyxFQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUMsRUFBRSxFQUFFLENBQUMsSUFBQSxzQkFBZSxFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQ2pFLElBQUEsZUFBRyxFQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBeUMsQ0FBQyxDQUNyRixDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUM7QUFORCxvQ0FNQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbi8qKlxuICogVG8gYXZvaWQgY3ljbGljIHJlZmVyZWNpbmcsIFRoaXMgZmlsZSBzaG91bGQgbm90IGRlcGVuZHMgb24gcGFja2FnZS1tZ3IvaW5kZXggISEhXG4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2Zyb20sIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGZpbmRQYWNrYWdlSnNvbiBmcm9tICcuL3BhY2thZ2UtbWdyL2ZpbmQtcGFja2FnZSc7XG4vLyBpbXBvcnQgKiBhcyByd1BhY2thZ2VKc29uIGZyb20gJy4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge21hcCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxubGV0IHByb2plY3RMaXN0OiBzdHJpbmdbXSA9IFtdO1xubGV0IGxpbmtQYXR0ZXJuczogc3RyaW5nW10gPSBbXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldFByb2plY3RMaXN0KGxpc3Q6IHN0cmluZ1tdKSB7XG4gIHByb2plY3RMaXN0ID0gbGlzdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldExpbmtQYXR0ZXJucyhsaXN0OiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGxpbmtQYXR0ZXJucyA9IEFycmF5LmZyb20obGlzdCk7XG59XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVTcmNDYWxsYmFjayA9IChzcmNEaXI6IHN0cmluZywgcHJvamVjdERpcjogc3RyaW5nKSA9PiB2b2lkO1xuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICogVXNlIGFsbFNyY0RpcnMoKSBpbnN0ZWFkLlxuICogSXRlcmF0ZSBzcmMgZm9sZGVyIGZvciBjb21wb25lbnQgaXRlbXNcbiAqIEBwYXJhbSB7c3RyaW5nIHwgc3RyaW5nW119IHByb2plY3REaXIgb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IG9yIG51bGwsIGluY2x1ZGVzIGFsbCBwcm9qZWN0IHNyYyBmb2xkZXJzXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZywgY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcgfCBFYWNoUmVjaXBlU3JjQ2FsbGJhY2ssXG4gIGNhbGxiYWNrPzogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZCB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGlmICh0eXBlb2YgcHJvamVjdERpciA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShwcm9qZWN0RGlyKSkge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0RGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9yUHJvamVjdChwcmpEaXJzOiBzdHJpbmdbXSB8IHN0cmluZykge1xuICAgIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHByakRpcnMpLmZvckVhY2gocHJqRGlyID0+IHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnNPZlByb2plY3QocHJqRGlyKSkge1xuICAgICAgICBjYWxsYmFjayEoc3JjRGlyLCBwcmpEaXIpO1xuICAgICAgfVxuICAgICAgLy8gY29uc3QgZTJlRGlyID0gUGF0aC5qb2luKHByakRpciwgJ2UyZXRlc3QnKTtcbiAgICAgIC8vIGlmIChmcy5leGlzdHNTeW5jKGUyZURpcikpXG4gICAgICAvLyAgIGNhbGxiYWNrIShlMmVEaXIsIHByakRpcik7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBhbGxTcmNEaXJzKCkge1xuICBmb3IgKGNvbnN0IHByb2pEaXIgb2YgcHJvamVjdExpc3QpIHtcbiAgICBmb3IgKGNvbnN0IHNyY0RpciBvZiBzcmNEaXJzT2ZQcm9qZWN0KHByb2pEaXIpKSB7XG4gICAgICB5aWVsZCB7c3JjRGlyLCBwcm9qRGlyfTtcbiAgICB9XG4gIH1cbiAgZm9yIChsZXQgcGF0IG9mIGxpbmtQYXR0ZXJucykge1xuICAgIGlmIChwYXQuZW5kc1dpdGgoJy8qKicpKVxuICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcbiAgICBlbHNlIGlmIChwYXQuZW5kc1dpdGgoJy8qJykpXG4gICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTIpO1xuICAgIHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcbiAgICB5aWVsZCB7c3JjRGlyOiBwYXR9O1xuICB9XG59XG5cbmZ1bmN0aW9uKiBzcmNEaXJzT2ZQcm9qZWN0KHByb2plY3REaXI6IHN0cmluZykge1xuICBjb25zdCBzcmNSZWNpcGVNYXBGaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdkci5yZWNpcGVzLmpzb24nKTtcbiAgY29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIGNvbnN0IHJlY2lwZVNyY01hcHBpbmc6IHtbcmVjaXBlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGxldCBuYW1lU3JjU2V0dGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICBsZXQgbm9ybWFsaXplZFByak5hbWUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpcikucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyk7XG4gIG5vcm1hbGl6ZWRQcmpOYW1lID0gXy50cmltKG5vcm1hbGl6ZWRQcmpOYW1lLCAnLicpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSkge1xuICAgIGNvbnN0IHBranNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpO1xuICAgIGlmIChwa2pzb24ucGFja2FnZXMpIHtcbiAgICAgIGZvciAobGV0IHBhdCBvZiAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwa2pzb24ucGFja2FnZXMpKSB7XG4gICAgICAgIGlmIChwYXQuZW5kc1dpdGgoJy8qKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMyk7XG4gICAgICAgIGVsc2UgaWYgKHBhdC5lbmRzV2l0aCgnLyonKSlcbiAgICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTIpO1xuICAgICAgICBwYXQgPSBfLnRyaW1TdGFydChwYXQsICcuJyk7XG4gICAgICAgIHlpZWxkIFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBwYXQpO1xuICAgICAgICAvLyBuYW1lU3JjU2V0dGluZ1tjb25maWcucmVzb2x2ZShcbiAgICAgICAgLy8gICAnZGVzdERpcicsIGByZWNpcGVzLyR7cGtqc29uLm5hbWV9JHtwYXQubGVuZ3RoID4gMCA/ICcuJyA6ICcnfSR7cGF0LnJlcGxhY2UoL1tcXC9cXFxcXS9nLCAnLicpfS5yZWNpcGVgKV0gPVxuICAgICAgICAvLyAgICAgUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHBhdCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGlmIChmcy5leGlzdHNTeW5jKHNyY1JlY2lwZU1hcEZpbGUpKSB7XG4gICAgLy8gbGVnYWN5OiByZWFkIGRyLnJlY2lwZXMuanNvblxuICAgIG5hbWVTcmNTZXR0aW5nID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoc3JjUmVjaXBlTWFwRmlsZSwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpID8gcmVxdWlyZShwa0pzb25GaWxlKS5uYW1lIDogUGF0aC5iYXNlbmFtZShwcm9qZWN0RGlyKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocHJvamVjdERpciwgJ3NyYycpKSkge1xuICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdzcmMnO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZXN0U3JjRGlyID0gUGF0aC5qb2luKHByb2plY3REaXIsICdhcHAnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3RTcmNEaXIpICYmIGZzLnN0YXRTeW5jKHRlc3RTcmNEaXIpLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnYXBwJztcbiAgICAgIGVsc2VcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICcuJztcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBzcmNEaXIgb2YgT2JqZWN0LnZhbHVlcyhuYW1lU3JjU2V0dGluZykpIHtcbiAgICB5aWVsZCBzcmNEaXI7XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5leHBvcnQgdHlwZSBFYWNoUmVjaXBlQ2FsbGJhY2sgPSAocmVjaXBlRGlyOiBzdHJpbmcsXG4gIGlzRnJvbUluc3RhbGxhdGlvbjogYm9vbGVhbixcbiAganNvbkZpbGVOYW1lOiBzdHJpbmcsXG4gIGpzb25GaWxlQ29udGVudDogc3RyaW5nKSA9PiB2b2lkO1xuXG4vKipcbiAqIEByZXR1cm5zIE9ic2VydmFibGUgb2YgdHVwbGUgW3Byb2plY3QsIHBhY2thZ2UuanNvbiBmaWxlXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NhblBhY2thZ2VzKCk6IE9ic2VydmFibGU8W3N0cmluZyB8IHVuZGVmaW5lZCwgc3RyaW5nLCBzdHJpbmddPiB7XG4gIHJldHVybiBmcm9tKGFsbFNyY0RpcnMoKSkucGlwZShcbiAgICBtZXJnZU1hcCgoe3NyY0RpciwgcHJvakRpcn0pID0+IGZpbmRQYWNrYWdlSnNvbihzcmNEaXIsIGZhbHNlKS5waXBlKFxuICAgICAgbWFwKGpzb25GaWxlID0+IFtwcm9qRGlyLCBqc29uRmlsZSwgc3JjRGlyXSBhcyBbc3RyaW5nIHwgdW5kZWZpbmVkLCBzdHJpbmcsIHN0cmluZ10pXG4gICAgKSlcbiAgKTtcbn1cbiJdfQ==