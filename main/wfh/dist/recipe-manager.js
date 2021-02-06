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
exports.clean = exports.scanPackages = exports.allSrcDirs = exports.eachRecipeSrc = exports.setProjectList = void 0;
// tslint:disable:max-line-length
/**
 * To avoid cyclic referecing, This file should not depends on package-mgr/index !!!
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
function clean() {
    return __awaiter(this, void 0, void 0, function* () {
        yield symlinks_1.default('all');
    });
}
exports.clean = clean;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QiwrQkFBdUM7QUFDdkMsNkNBQStCO0FBQy9CLGdFQUErQztBQUMvQyw4RUFBeUQ7QUFDekQsb0RBQW9EO0FBQ3BELDhDQUFtQztBQUVuQyxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUM7QUFFL0IsU0FBZ0IsY0FBYyxDQUFDLElBQWM7SUFDM0MsV0FBVyxHQUFHLElBQUksQ0FBQztBQUNyQixDQUFDO0FBRkQsd0NBRUM7QUFZRCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdEUsUUFBZ0M7SUFDaEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQixRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN6QjtTQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDakMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMvRCxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDeEI7YUFBTTtZQUNMLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUN6QjtLQUNGO0lBRUQsU0FBUyxVQUFVLENBQUMsT0FBMEI7UUFDM0MsRUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDN0MsUUFBUyxDQUFDLE1B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QkFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7Q0FBQTtBQUZELHNCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bWF4LWxpbmUtbGVuZ3RoXG4vKipcbiAqIFRvIGF2b2lkIGN5Y2xpYyByZWZlcmVjaW5nLCBUaGlzIGZpbGUgc2hvdWxkIG5vdCBkZXBlbmRzIG9uIHBhY2thZ2UtbWdyL2luZGV4ICEhIVxuICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBtZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgc2Nhbk5vZGVNb2R1bGVzIGZyb20gJy4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IGZpbmRQYWNrYWdlSnNvbiBmcm9tICcuL3BhY2thZ2UtbWdyL2ZpbmQtcGFja2FnZSc7XG4vLyBpbXBvcnQgKiBhcyByd1BhY2thZ2VKc29uIGZyb20gJy4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5sZXQgcHJvamVjdExpc3Q6IHN0cmluZ1tdID0gW107XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRQcm9qZWN0TGlzdChsaXN0OiBzdHJpbmdbXSkge1xuICBwcm9qZWN0TGlzdCA9IGxpc3Q7XG59XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVTcmNDYWxsYmFjayA9IChzcmNEaXI6IHN0cmluZywgcHJvamVjdERpcjogc3RyaW5nKSA9PiB2b2lkO1xuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICogVXNlIGFsbFNyY0RpcnMoKSBpbnN0ZWFkLlxuICogSXRlcmF0ZSBzcmMgZm9sZGVyIGZvciBjb21wb25lbnQgaXRlbXNcbiAqIEBwYXJhbSB7c3RyaW5nIHwgc3RyaW5nW119IHByb2plY3REaXIgb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IG9yIG51bGwsIGluY2x1ZGVzIGFsbCBwcm9qZWN0IHNyYyBmb2xkZXJzXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZywgY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcgfCBFYWNoUmVjaXBlU3JjQ2FsbGJhY2ssXG4gIGNhbGxiYWNrPzogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZCB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGlmICh0eXBlb2YgcHJvamVjdERpciA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShwcm9qZWN0RGlyKSkge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0RGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9yUHJvamVjdChwcmpEaXJzOiBzdHJpbmdbXSB8IHN0cmluZykge1xuICAgIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHByakRpcnMpLmZvckVhY2gocHJqRGlyID0+IHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnNPZlByb2plY3QocHJqRGlyKSkge1xuICAgICAgICBjYWxsYmFjayEoc3JjRGlyLCBwcmpEaXIpO1xuICAgICAgfVxuICAgICAgLy8gY29uc3QgZTJlRGlyID0gUGF0aC5qb2luKHByakRpciwgJ2UyZXRlc3QnKTtcbiAgICAgIC8vIGlmIChmcy5leGlzdHNTeW5jKGUyZURpcikpXG4gICAgICAvLyAgIGNhbGxiYWNrIShlMmVEaXIsIHByakRpcik7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBhbGxTcmNEaXJzKCkge1xuICBmb3IgKGNvbnN0IHByb2pEaXIgb2YgcHJvamVjdExpc3QpIHtcbiAgICBmb3IgKGNvbnN0IHNyY0RpciBvZiBzcmNEaXJzT2ZQcm9qZWN0KHByb2pEaXIpKSB7XG4gICAgICB5aWVsZCB7c3JjRGlyLCBwcm9qRGlyfTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24qIHNyY0RpcnNPZlByb2plY3QocHJvamVjdERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHNyY1JlY2lwZU1hcEZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ2RyLnJlY2lwZXMuanNvbicpO1xuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gY29uc3QgcmVjaXBlU3JjTWFwcGluZzoge1tyZWNpcGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgbGV0IG5hbWVTcmNTZXR0aW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gIGxldCBub3JtYWxpemVkUHJqTmFtZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyKS5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKTtcbiAgbm9ybWFsaXplZFByak5hbWUgPSBfLnRyaW0obm9ybWFsaXplZFByak5hbWUsICcuJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpKSB7XG4gICAgY29uc3QgcGtqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKSk7XG4gICAgaWYgKHBranNvbi5wYWNrYWdlcykge1xuICAgICAgZm9yIChsZXQgcGF0IG9mIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBranNvbi5wYWNrYWdlcykpIHtcbiAgICAgICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcbiAgICAgICAgZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgICAgIHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcbiAgICAgICAgeWllbGQgUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHBhdCk7XG4gICAgICAgIC8vIG5hbWVTcmNTZXR0aW5nW2NvbmZpZy5yZXNvbHZlKFxuICAgICAgICAvLyAgICdkZXN0RGlyJywgYHJlY2lwZXMvJHtwa2pzb24ubmFtZX0ke3BhdC5sZW5ndGggPiAwID8gJy4nIDogJyd9JHtwYXQucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyl9LnJlY2lwZWApXSA9XG4gICAgICAgIC8vICAgICBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgaWYgKGZzLmV4aXN0c1N5bmMoc3JjUmVjaXBlTWFwRmlsZSkpIHtcbiAgICAvLyBsZWdhY3k6IHJlYWQgZHIucmVjaXBlcy5qc29uXG4gICAgbmFtZVNyY1NldHRpbmcgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhzcmNSZWNpcGVNYXBGaWxlLCAndXRmOCcpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkgPyByZXF1aXJlKHBrSnNvbkZpbGUpLm5hbWUgOiBQYXRoLmJhc2VuYW1lKHByb2plY3REaXIpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihwcm9qZWN0RGlyLCAnc3JjJykpKSB7XG4gICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ3NyYyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlc3RTcmNEaXIgPSBQYXRoLmpvaW4ocHJvamVjdERpciwgJ2FwcCcpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFNyY0RpcikgJiYgZnMuc3RhdFN5bmModGVzdFNyY0RpcikuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdhcHAnO1xuICAgICAgZWxzZVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJy4nO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IHNyY0RpciBvZiBPYmplY3QudmFsdWVzKG5hbWVTcmNTZXR0aW5nKSkge1xuICAgIHlpZWxkIHNyY0RpcjtcbiAgfVxuICByZXR1cm47XG59XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVDYWxsYmFjayA9IChyZWNpcGVEaXI6IHN0cmluZyxcbiAgaXNGcm9tSW5zdGFsbGF0aW9uOiBib29sZWFuLFxuICBqc29uRmlsZU5hbWU6IHN0cmluZyxcbiAganNvbkZpbGVDb250ZW50OiBzdHJpbmcpID0+IHZvaWQ7XG5cbi8qKlxuICogQHJldHVybnMgT2JzZXJ2YWJsZSBvZiB0dXBsZSBbcHJvamVjdCwgcGFja2FnZS5qc29uIGZpbGVdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2FuUGFja2FnZXMoKSB7XG4gIGNvbnN0IG9iczogT2JzZXJ2YWJsZTxbc3RyaW5nLCBzdHJpbmddPltdID0gW107XG4gIGVhY2hSZWNpcGVTcmMoKHNyYywgcHJvaikgPT4ge1xuICAgIG9icy5wdXNoKGZpbmRQYWNrYWdlSnNvbihzcmMsIGZhbHNlKVxuICAgIC5waXBlKFxuICAgICAgbWFwKGpzb25GaWxlID0+IFtwcm9qLCBqc29uRmlsZV0pXG4gICAgKSk7XG4gIH0pO1xuICByZXR1cm4gbWVyZ2UoLi4ub2JzKTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIGFycmF5IG9mIGxpbmtlZCBwYWNrYWdlJ3MgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICovXG4vLyBleHBvcnQgZnVuY3Rpb24gbGlua0NvbXBvbmVudHNBc3luYyhzeW1saW5rc0Rpcjogc3RyaW5nKSB7XG4vLyAgIC8vIGNvbnN0IHBrSnNvbkZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuLy8gICBjb25zdCBvYnM6IE9ic2VydmFibGU8e3Byb2o6IHN0cmluZywganNvbkZpbGU6IHN0cmluZywganNvbjogYW55fT5bXSA9IFtdO1xuLy8gICBlYWNoUmVjaXBlU3JjKChzcmMsIHByb2opID0+IHtcbi8vICAgICBvYnMucHVzaChcbi8vICAgICAgIGZpbmRQYWNrYWdlSnNvbihzcmMsIGZhbHNlKS5waXBlKFxuLy8gICAgICAgICByd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKHN5bWxpbmtzRGlyKSxcbi8vICAgICAgICAgbWFwKChbanNvbkZpbGUsIGpzb25dKSA9PiB7XG4vLyAgICAgICAgICAgcmV0dXJuIHtwcm9qLCBqc29uRmlsZSwganNvbn07XG4vLyAgICAgICAgIH0pXG4vLyAgICAgICApKTtcbi8vICAgfSk7XG4vLyAgIHJldHVybiBtZXJnZSguLi5vYnMpO1xuLy8gfVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW4oKSB7XG4gIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG59XG5cblxuIl19