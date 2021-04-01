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
exports.scanPackages = exports.allSrcDirs = exports.eachRecipeSrc = exports.setProjectList = void 0;
// tslint:disable:max-line-length
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
function setProjectList(list) {
    projectList = list;
}
exports.setProjectList = setProjectList;
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
    const obs = [];
    eachRecipeSrc((src, proj) => {
        obs.push(find_package_1.default(src, false)
            .pipe(operators_1.map(jsonFile => [proj, jsonFile])));
    });
    return rxjs_1.merge(...obs);
}
exports.scanPackages = scanPackages;
/**
 * @return array of linked package's package.json file path
 */
// export function linkComponentsAsync(symlinksDir: string) {
//   // const pkJsonFiles: string[] = [];
//   const obs: Observable<{proj: string, jsonFile: string, json: any}>[] = [];
//   eachRecipeSrc((src, proj) => {
//     obs.push(
//       findPackageJson(src, false).pipe(
//         rwPackageJson.symbolicLinkPackages(symlinksDir),
//         map(([jsonFile, json]) => {
//           return {proj, jsonFile, json};
//         })
//       ));
//   });
//   return merge(...obs);
// }
// export async function clean() {
//   await scanNodeModules('all');
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QiwrQkFBdUM7QUFDdkMsNkNBQStCO0FBQy9CLDhFQUF5RDtBQUN6RCxvREFBb0Q7QUFDcEQsOENBQW1DO0FBRW5DLElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztBQUUvQixTQUFnQixjQUFjLENBQUMsSUFBYztJQUMzQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQ3JCLENBQUM7QUFGRCx3Q0FFQztBQVlELFNBQWdCLGFBQWEsQ0FBQyxVQUEwQyxFQUN0RSxRQUFnQztJQUNoQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUNqQyxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQy9ELFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUN4QjthQUFNO1lBQ0wsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQ3pCO0tBQ0Y7SUFFRCxTQUFTLFVBQVUsQ0FBQyxPQUEwQjtRQUMzQyxFQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNoRCxLQUFLLE1BQU0sTUFBTSxJQUFJLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM3QyxRQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFD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dCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTptYXgtbGluZS1sZW5ndGhcbi8qKlxuICogVG8gYXZvaWQgY3ljbGljIHJlZmVyZWNpbmcsIFRoaXMgZmlsZSBzaG91bGQgbm90IGRlcGVuZHMgb24gcGFja2FnZS1tZ3IvaW5kZXggISEhXG4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge09ic2VydmFibGUsIG1lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBmaW5kUGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLW1nci9maW5kLXBhY2thZ2UnO1xuLy8gaW1wb3J0ICogYXMgcndQYWNrYWdlSnNvbiBmcm9tICcuL3J3UGFja2FnZUpzb24nO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxubGV0IHByb2plY3RMaXN0OiBzdHJpbmdbXSA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJvamVjdExpc3QobGlzdDogc3RyaW5nW10pIHtcbiAgcHJvamVjdExpc3QgPSBsaXN0O1xufVxuXG5leHBvcnQgdHlwZSBFYWNoUmVjaXBlU3JjQ2FsbGJhY2sgPSAoc3JjRGlyOiBzdHJpbmcsIHByb2plY3REaXI6IHN0cmluZykgPT4gdm9pZDtcbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqIFVzZSBhbGxTcmNEaXJzKCkgaW5zdGVhZC5cbiAqIEl0ZXJhdGUgc3JjIGZvbGRlciBmb3IgY29tcG9uZW50IGl0ZW1zXG4gKiBAcGFyYW0ge3N0cmluZyB8IHN0cmluZ1tdfSBwcm9qZWN0RGlyIG9wdGlvbmFsLCBpZiBub3QgcHJlc2VudCBvciBudWxsLCBpbmNsdWRlcyBhbGwgcHJvamVjdCBzcmMgZm9sZGVyc1xuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChzcmNEaXIsIHJlY2lwZURpciwgcmVjaXBlTmFtZSk6IHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMoY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcsIGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nIHwgRWFjaFJlY2lwZVNyY0NhbGxiYWNrLFxuICBjYWxsYmFjaz86IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBpZiAodHlwZW9mIHByb2plY3REaXIgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocHJvamVjdERpcikpIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdERpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZvclByb2plY3QocHJqRGlyczogc3RyaW5nW10gfCBzdHJpbmcpIHtcbiAgICAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwcmpEaXJzKS5mb3JFYWNoKHByakRpciA9PiB7XG4gICAgICBmb3IgKGNvbnN0IHNyY0RpciBvZiBzcmNEaXJzT2ZQcm9qZWN0KHByakRpcikpIHtcbiAgICAgICAgY2FsbGJhY2shKHNyY0RpciwgcHJqRGlyKTtcbiAgICAgIH1cbiAgICAgIC8vIGNvbnN0IGUyZURpciA9IFBhdGguam9pbihwcmpEaXIsICdlMmV0ZXN0Jyk7XG4gICAgICAvLyBpZiAoZnMuZXhpc3RzU3luYyhlMmVEaXIpKVxuICAgICAgLy8gICBjYWxsYmFjayEoZTJlRGlyLCBwcmpEaXIpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogYWxsU3JjRGlycygpIHtcbiAgZm9yIChjb25zdCBwcm9qRGlyIG9mIHByb2plY3RMaXN0KSB7XG4gICAgZm9yIChjb25zdCBzcmNEaXIgb2Ygc3JjRGlyc09mUHJvamVjdChwcm9qRGlyKSkge1xuICAgICAgeWllbGQge3NyY0RpciwgcHJvakRpcn07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uKiBzcmNEaXJzT2ZQcm9qZWN0KHByb2plY3REaXI6IHN0cmluZykge1xuICBjb25zdCBzcmNSZWNpcGVNYXBGaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdkci5yZWNpcGVzLmpzb24nKTtcbiAgY29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIGNvbnN0IHJlY2lwZVNyY01hcHBpbmc6IHtbcmVjaXBlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGxldCBuYW1lU3JjU2V0dGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICBsZXQgbm9ybWFsaXplZFByak5hbWUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpcikucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyk7XG4gIG5vcm1hbGl6ZWRQcmpOYW1lID0gXy50cmltKG5vcm1hbGl6ZWRQcmpOYW1lLCAnLicpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSkge1xuICAgIGNvbnN0IHBranNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpO1xuICAgIGlmIChwa2pzb24ucGFja2FnZXMpIHtcbiAgICAgIGZvciAobGV0IHBhdCBvZiAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwa2pzb24ucGFja2FnZXMpKSB7XG4gICAgICAgIGlmIChwYXQuZW5kc1dpdGgoJy8qKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMyk7XG4gICAgICAgIGVsc2UgaWYgKHBhdC5lbmRzV2l0aCgnLyonKSlcbiAgICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTIpO1xuICAgICAgICBwYXQgPSBfLnRyaW1TdGFydChwYXQsICcuJyk7XG4gICAgICAgIHlpZWxkIFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBwYXQpO1xuICAgICAgICAvLyBuYW1lU3JjU2V0dGluZ1tjb25maWcucmVzb2x2ZShcbiAgICAgICAgLy8gICAnZGVzdERpcicsIGByZWNpcGVzLyR7cGtqc29uLm5hbWV9JHtwYXQubGVuZ3RoID4gMCA/ICcuJyA6ICcnfSR7cGF0LnJlcGxhY2UoL1tcXC9cXFxcXS9nLCAnLicpfS5yZWNpcGVgKV0gPVxuICAgICAgICAvLyAgICAgUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHBhdCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGlmIChmcy5leGlzdHNTeW5jKHNyY1JlY2lwZU1hcEZpbGUpKSB7XG4gICAgLy8gbGVnYWN5OiByZWFkIGRyLnJlY2lwZXMuanNvblxuICAgIG5hbWVTcmNTZXR0aW5nID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoc3JjUmVjaXBlTWFwRmlsZSwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpID8gcmVxdWlyZShwa0pzb25GaWxlKS5uYW1lIDogUGF0aC5iYXNlbmFtZShwcm9qZWN0RGlyKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocHJvamVjdERpciwgJ3NyYycpKSkge1xuICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdzcmMnO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZXN0U3JjRGlyID0gUGF0aC5qb2luKHByb2plY3REaXIsICdhcHAnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3RTcmNEaXIpICYmIGZzLnN0YXRTeW5jKHRlc3RTcmNEaXIpLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnYXBwJztcbiAgICAgIGVsc2VcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICcuJztcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBzcmNEaXIgb2YgT2JqZWN0LnZhbHVlcyhuYW1lU3JjU2V0dGluZykpIHtcbiAgICB5aWVsZCBzcmNEaXI7XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5leHBvcnQgdHlwZSBFYWNoUmVjaXBlQ2FsbGJhY2sgPSAocmVjaXBlRGlyOiBzdHJpbmcsXG4gIGlzRnJvbUluc3RhbGxhdGlvbjogYm9vbGVhbixcbiAganNvbkZpbGVOYW1lOiBzdHJpbmcsXG4gIGpzb25GaWxlQ29udGVudDogc3RyaW5nKSA9PiB2b2lkO1xuXG4vKipcbiAqIEByZXR1cm5zIE9ic2VydmFibGUgb2YgdHVwbGUgW3Byb2plY3QsIHBhY2thZ2UuanNvbiBmaWxlXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NhblBhY2thZ2VzKCkge1xuICBjb25zdCBvYnM6IE9ic2VydmFibGU8W3N0cmluZywgc3RyaW5nXT5bXSA9IFtdO1xuICBlYWNoUmVjaXBlU3JjKChzcmMsIHByb2opID0+IHtcbiAgICBvYnMucHVzaChmaW5kUGFja2FnZUpzb24oc3JjLCBmYWxzZSlcbiAgICAucGlwZShcbiAgICAgIG1hcChqc29uRmlsZSA9PiBbcHJvaiwganNvbkZpbGVdKVxuICAgICkpO1xuICB9KTtcbiAgcmV0dXJuIG1lcmdlKC4uLm9icyk7XG59XG5cbi8qKlxuICogQHJldHVybiBhcnJheSBvZiBsaW5rZWQgcGFja2FnZSdzIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqL1xuLy8gZXhwb3J0IGZ1bmN0aW9uIGxpbmtDb21wb25lbnRzQXN5bmMoc3ltbGlua3NEaXI6IHN0cmluZykge1xuLy8gICAvLyBjb25zdCBwa0pzb25GaWxlczogc3RyaW5nW10gPSBbXTtcbi8vICAgY29uc3Qgb2JzOiBPYnNlcnZhYmxlPHtwcm9qOiBzdHJpbmcsIGpzb25GaWxlOiBzdHJpbmcsIGpzb246IGFueX0+W10gPSBbXTtcbi8vICAgZWFjaFJlY2lwZVNyYygoc3JjLCBwcm9qKSA9PiB7XG4vLyAgICAgb2JzLnB1c2goXG4vLyAgICAgICBmaW5kUGFja2FnZUpzb24oc3JjLCBmYWxzZSkucGlwZShcbi8vICAgICAgICAgcndQYWNrYWdlSnNvbi5zeW1ib2xpY0xpbmtQYWNrYWdlcyhzeW1saW5rc0RpciksXG4vLyAgICAgICAgIG1hcCgoW2pzb25GaWxlLCBqc29uXSkgPT4ge1xuLy8gICAgICAgICAgIHJldHVybiB7cHJvaiwganNvbkZpbGUsIGpzb259O1xuLy8gICAgICAgICB9KVxuLy8gICAgICAgKSk7XG4vLyAgIH0pO1xuLy8gICByZXR1cm4gbWVyZ2UoLi4ub2JzKTtcbi8vIH1cblxuLy8gZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFuKCkge1xuLy8gICBhd2FpdCBzY2FuTm9kZU1vZHVsZXMoJ2FsbCcpO1xuLy8gfVxuXG5cbiJdfQ==