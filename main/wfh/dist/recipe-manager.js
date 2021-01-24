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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clean = exports.scanPackages = exports.eachRecipeSrc = exports.setProjectList = void 0;
// tslint:disable:max-line-length
/**
 * To avoid circle referecing, This file should not depends on package-mgr/index !!!
 */
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const fs = __importStar(require("fs-extra"));
const symlinks_1 = __importDefault(require("./utils/symlinks"));
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
            const e2eDir = Path.join(prjDir, 'e2etest');
            if (fs.existsSync(e2eDir))
                callback(e2eDir, prjDir);
        });
    }
}
exports.eachRecipeSrc = eachRecipeSrc;
function* srcDirsOfProject(projectDir) {
    const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
    const pkJsonFile = Path.resolve(projectDir, 'package.json');
    // const recipeSrcMapping: {[recipe: string]: string} = {};
    let nameSrcSetting = {};
    let normalizedPrjName = Path.resolve(projectDir).replace(/[\/\\]/g, '.');
    normalizedPrjName = _.trim(normalizedPrjName, '.');
    if (fs.existsSync(pkJsonFile)) {
        const pkjson = require(pkJsonFile);
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
function clean() {
    return __awaiter(this, void 0, void 0, function* () {
        yield symlinks_1.default('all');
    });
}
exports.clean = clean;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QiwrQkFBdUM7QUFDdkMsNkNBQStCO0FBQy9CLGdFQUErQztBQUMvQyw4RUFBeUQ7QUFDekQsb0RBQW9EO0FBQ3BELDhDQUFtQztBQUVuQyxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUM7QUFFL0IsU0FBZ0IsY0FBYyxDQUFDLElBQWM7SUFDM0MsV0FBVyxHQUFHLElBQUksQ0FBQztBQUNyQixDQUFDO0FBRkQsd0NBRUM7QUFVRCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdEUsUUFBZ0M7SUFDaEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQixRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN6QjtTQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDakMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMvRCxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDeEI7YUFBTTtZQUNMLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUN6QjtLQUNGO0lBRUQsU0FBUyxVQUFVLENBQUMsT0FBMEI7UUFDM0MsRUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDN0MsUUFBUyxDQUFDLE1B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V0FBVyxFQUFFO2dCQUNwRSxjQUFjLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEtBQUssQ0FBQzs7Z0JBRWpELGNBQWMsQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDO1NBQ2xEO0tBQ0Y7SUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDbEQsTUFBTSxNQUFNLENBQUM7S0FDZDtJQUNELE9BQU87QUFDVCxDQUFDO0FBT0Q7O0dBRUc7QUFDSCxTQUFnQixZQUFZO0lBQzFCLE1BQU0sR0FBRyxHQUFtQyxFQUFFLENBQUM7SUFDL0MsYUFBYSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQWUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDO2FBQ25DLElBQUksQ0FDSCxlQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUNsQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sWUFBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQVRELG9DQVNDO0FBRUQ7O0dBRUc7QUFDSCw2REFBNkQ7QUFDN0QseUNBQXlDO0FBQ3pDLCtFQUErRTtBQUMvRSxtQ0FBbUM7QUFDbkMsZ0JBQWdCO0FBQ2hCLDBDQUEwQztBQUMxQywyREFBMkQ7QUFDM0Qsc0NBQXNDO0FBQ3RDLDJDQUEyQztBQUMzQyxhQUFhO0FBQ2IsWUFBWTtBQUNaLFFBQVE7QUFDUiwwQkFBMEI7QUFDMUIsSUFBSTtBQUVKLFNBQXNCLEtBQUs7O1FBQ3pCLE1BQU0sa0JBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixDQUFDO0NBQUE7QUFGRCxzQkFFQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm1heC1saW5lLWxlbmd0aFxuLyoqXG4gKiBUbyBhdm9pZCBjaXJjbGUgcmVmZXJlY2luZywgVGhpcyBmaWxlIHNob3VsZCBub3QgZGVwZW5kcyBvbiBwYWNrYWdlLW1nci9pbmRleCAhISFcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgbWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHNjYW5Ob2RlTW9kdWxlcyBmcm9tICcuL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCBmaW5kUGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLW1nci9maW5kLXBhY2thZ2UnO1xuLy8gaW1wb3J0ICogYXMgcndQYWNrYWdlSnNvbiBmcm9tICcuL3J3UGFja2FnZUpzb24nO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxubGV0IHByb2plY3RMaXN0OiBzdHJpbmdbXSA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJvamVjdExpc3QobGlzdDogc3RyaW5nW10pIHtcbiAgcHJvamVjdExpc3QgPSBsaXN0O1xufVxuXG5leHBvcnQgdHlwZSBFYWNoUmVjaXBlU3JjQ2FsbGJhY2sgPSAoc3JjRGlyOiBzdHJpbmcsIHByb2plY3REaXI6IHN0cmluZykgPT4gdm9pZDtcbi8qKlxuICogSXRlcmF0ZSBzcmMgZm9sZGVyIGZvciBjb21wb25lbnQgaXRlbXNcbiAqIEBwYXJhbSB7c3RyaW5nIHwgc3RyaW5nW119IHByb2plY3REaXIgb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IG9yIG51bGwsIGluY2x1ZGVzIGFsbCBwcm9qZWN0IHNyYyBmb2xkZXJzXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZywgY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcgfCBFYWNoUmVjaXBlU3JjQ2FsbGJhY2ssXG4gIGNhbGxiYWNrPzogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZCB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGlmICh0eXBlb2YgcHJvamVjdERpciA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShwcm9qZWN0RGlyKSkge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0RGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9yUHJvamVjdChwcmpEaXJzOiBzdHJpbmdbXSB8IHN0cmluZykge1xuICAgIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHByakRpcnMpLmZvckVhY2gocHJqRGlyID0+IHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnNPZlByb2plY3QocHJqRGlyKSkge1xuICAgICAgICBjYWxsYmFjayEoc3JjRGlyLCBwcmpEaXIpO1xuICAgICAgfVxuICAgICAgY29uc3QgZTJlRGlyID0gUGF0aC5qb2luKHByakRpciwgJ2UyZXRlc3QnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGUyZURpcikpXG4gICAgICAgIGNhbGxiYWNrIShlMmVEaXIsIHByakRpcik7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24qIHNyY0RpcnNPZlByb2plY3QocHJvamVjdERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHNyY1JlY2lwZU1hcEZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ2RyLnJlY2lwZXMuanNvbicpO1xuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gY29uc3QgcmVjaXBlU3JjTWFwcGluZzoge1tyZWNpcGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgbGV0IG5hbWVTcmNTZXR0aW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gIGxldCBub3JtYWxpemVkUHJqTmFtZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyKS5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKTtcbiAgbm9ybWFsaXplZFByak5hbWUgPSBfLnRyaW0obm9ybWFsaXplZFByak5hbWUsICcuJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpKSB7XG4gICAgY29uc3QgcGtqc29uID0gcmVxdWlyZShwa0pzb25GaWxlKTtcbiAgICBpZiAocGtqc29uLnBhY2thZ2VzKSB7XG4gICAgICBmb3IgKGxldCBwYXQgb2YgKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocGtqc29uLnBhY2thZ2VzKSkge1xuICAgICAgICBpZiAocGF0LmVuZHNXaXRoKCcvKionKSlcbiAgICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTMpO1xuICAgICAgICBlbHNlIGlmIChwYXQuZW5kc1dpdGgoJy8qJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0yKTtcbiAgICAgICAgcGF0ID0gXy50cmltU3RhcnQocGF0LCAnLicpO1xuICAgICAgICB5aWVsZCBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgICAgLy8gbmFtZVNyY1NldHRpbmdbY29uZmlnLnJlc29sdmUoXG4gICAgICAgIC8vICAgJ2Rlc3REaXInLCBgcmVjaXBlcy8ke3BranNvbi5uYW1lfSR7cGF0Lmxlbmd0aCA+IDAgPyAnLicgOiAnJ30ke3BhdC5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKX0ucmVjaXBlYCldID1cbiAgICAgICAgLy8gICAgIFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBwYXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICBpZiAoZnMuZXhpc3RzU3luYyhzcmNSZWNpcGVNYXBGaWxlKSkge1xuICAgIC8vIGxlZ2FjeTogcmVhZCBkci5yZWNpcGVzLmpzb25cbiAgICBuYW1lU3JjU2V0dGluZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHNyY1JlY2lwZU1hcEZpbGUsICd1dGY4JykpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHByb2plY3ROYW1lID0gZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSA/IHJlcXVpcmUocGtKc29uRmlsZSkubmFtZSA6IFBhdGguYmFzZW5hbWUocHJvamVjdERpcik7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKHByb2plY3REaXIsICdzcmMnKSkpIHtcbiAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnc3JjJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVzdFNyY0RpciA9IFBhdGguam9pbihwcm9qZWN0RGlyLCAnYXBwJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0U3JjRGlyKSAmJiBmcy5zdGF0U3luYyh0ZXN0U3JjRGlyKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ2FwcCc7XG4gICAgICBlbHNlXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnLic7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qgc3JjRGlyIG9mIE9iamVjdC52YWx1ZXMobmFtZVNyY1NldHRpbmcpKSB7XG4gICAgeWllbGQgc3JjRGlyO1xuICB9XG4gIHJldHVybjtcbn1cblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZUNhbGxiYWNrID0gKHJlY2lwZURpcjogc3RyaW5nLFxuICBpc0Zyb21JbnN0YWxsYXRpb246IGJvb2xlYW4sXG4gIGpzb25GaWxlTmFtZTogc3RyaW5nLFxuICBqc29uRmlsZUNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZDtcblxuLyoqXG4gKiBAcmV0dXJucyBPYnNlcnZhYmxlIG9mIHR1cGxlIFtwcm9qZWN0LCBwYWNrYWdlLmpzb24gZmlsZV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjYW5QYWNrYWdlcygpIHtcbiAgY29uc3Qgb2JzOiBPYnNlcnZhYmxlPFtzdHJpbmcsIHN0cmluZ10+W10gPSBbXTtcbiAgZWFjaFJlY2lwZVNyYygoc3JjLCBwcm9qKSA9PiB7XG4gICAgb2JzLnB1c2goZmluZFBhY2thZ2VKc29uKHNyYywgZmFsc2UpXG4gICAgLnBpcGUoXG4gICAgICBtYXAoanNvbkZpbGUgPT4gW3Byb2osIGpzb25GaWxlXSlcbiAgICApKTtcbiAgfSk7XG4gIHJldHVybiBtZXJnZSguLi5vYnMpO1xufVxuXG4vKipcbiAqIEByZXR1cm4gYXJyYXkgb2YgbGlua2VkIHBhY2thZ2UncyBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKi9cbi8vIGV4cG9ydCBmdW5jdGlvbiBsaW5rQ29tcG9uZW50c0FzeW5jKHN5bWxpbmtzRGlyOiBzdHJpbmcpIHtcbi8vICAgLy8gY29uc3QgcGtKc29uRmlsZXM6IHN0cmluZ1tdID0gW107XG4vLyAgIGNvbnN0IG9iczogT2JzZXJ2YWJsZTx7cHJvajogc3RyaW5nLCBqc29uRmlsZTogc3RyaW5nLCBqc29uOiBhbnl9PltdID0gW107XG4vLyAgIGVhY2hSZWNpcGVTcmMoKHNyYywgcHJvaikgPT4ge1xuLy8gICAgIG9icy5wdXNoKFxuLy8gICAgICAgZmluZFBhY2thZ2VKc29uKHNyYywgZmFsc2UpLnBpcGUoXG4vLyAgICAgICAgIHJ3UGFja2FnZUpzb24uc3ltYm9saWNMaW5rUGFja2FnZXMoc3ltbGlua3NEaXIpLFxuLy8gICAgICAgICBtYXAoKFtqc29uRmlsZSwganNvbl0pID0+IHtcbi8vICAgICAgICAgICByZXR1cm4ge3Byb2osIGpzb25GaWxlLCBqc29ufTtcbi8vICAgICAgICAgfSlcbi8vICAgICAgICkpO1xuLy8gICB9KTtcbi8vICAgcmV0dXJuIG1lcmdlKC4uLm9icyk7XG4vLyB9XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbigpIHtcbiAgYXdhaXQgc2Nhbk5vZGVNb2R1bGVzKCdhbGwnKTtcbn1cblxuXG4iXX0=