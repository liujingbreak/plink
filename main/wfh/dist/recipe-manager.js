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
    const obs = [];
    for (const { srcDir, projDir } of allSrcDirs()) {
        obs.push((0, find_package_1.default)(srcDir, false)
            .pipe((0, operators_1.map)(jsonFile => [projDir, jsonFile, srcDir])));
    }
    return (0, rxjs_1.merge)(...obs);
}
exports.scanPackages = scanPackages;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QiwrQkFBdUM7QUFDdkMsNkNBQStCO0FBQy9CLDhFQUF5RDtBQUN6RCxvREFBb0Q7QUFDcEQsOENBQW1DO0FBRW5DLElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztBQUMvQixJQUFJLFlBQTBDLENBQUM7QUFFL0MsU0FBZ0IsY0FBYyxDQUFDLElBQWM7SUFDM0MsV0FBVyxHQUFHLElBQUksQ0FBQztBQUNyQixDQUFDO0FBRkQsd0NBRUM7QUFFRCxTQUFnQixlQUFlLENBQUMsSUFBc0I7SUFDcEQsWUFBWSxHQUFHLElBQUksQ0FBQztBQUN0QixDQUFDO0FBRkQsMENBRUM7QUFZRCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdEUsUUFBZ0M7SUFDaEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQixRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN6QjtTQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDakMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMvRCxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDeEI7YUFBTTtZQUNMLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUN6QjtLQUNGO0lBRUQsU0FBUyxVQUFVLENBQUMsT0FBMEI7UUFDM0MsRUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVB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TSxFQUFFLE9BQU8sRUFBQyxJQUFJLFVBQVUsRUFBRSxFQUFFO1FBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBQSxzQkFBZSxFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUM7YUFDdEMsSUFBSSxDQUNILElBQUEsZUFBRyxFQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQzdDLENBQUMsQ0FBQztLQUNKO0lBQ0QsT0FBTyxJQUFBLFlBQUssRUFBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFURCxvQ0FTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbi8qKlxuICogVG8gYXZvaWQgY3ljbGljIHJlZmVyZWNpbmcsIFRoaXMgZmlsZSBzaG91bGQgbm90IGRlcGVuZHMgb24gcGFja2FnZS1tZ3IvaW5kZXggISEhXG4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge09ic2VydmFibGUsIG1lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBmaW5kUGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLW1nci9maW5kLXBhY2thZ2UnO1xuLy8gaW1wb3J0ICogYXMgcndQYWNrYWdlSnNvbiBmcm9tICcuL3J3UGFja2FnZUpzb24nO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxubGV0IHByb2plY3RMaXN0OiBzdHJpbmdbXSA9IFtdO1xubGV0IGxpbmtQYXR0ZXJuczogSXRlcmFibGU8c3RyaW5nPiB8IHVuZGVmaW5lZDtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldFByb2plY3RMaXN0KGxpc3Q6IHN0cmluZ1tdKSB7XG4gIHByb2plY3RMaXN0ID0gbGlzdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldExpbmtQYXR0ZXJucyhsaXN0OiBJdGVyYWJsZTxzdHJpbmc+KSB7XG4gIGxpbmtQYXR0ZXJucyA9IGxpc3Q7XG59XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVTcmNDYWxsYmFjayA9IChzcmNEaXI6IHN0cmluZywgcHJvamVjdERpcjogc3RyaW5nKSA9PiB2b2lkO1xuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICogVXNlIGFsbFNyY0RpcnMoKSBpbnN0ZWFkLlxuICogSXRlcmF0ZSBzcmMgZm9sZGVyIGZvciBjb21wb25lbnQgaXRlbXNcbiAqIEBwYXJhbSB7c3RyaW5nIHwgc3RyaW5nW119IHByb2plY3REaXIgb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IG9yIG51bGwsIGluY2x1ZGVzIGFsbCBwcm9qZWN0IHNyYyBmb2xkZXJzXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZywgY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcgfCBFYWNoUmVjaXBlU3JjQ2FsbGJhY2ssXG4gIGNhbGxiYWNrPzogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZCB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGlmICh0eXBlb2YgcHJvamVjdERpciA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShwcm9qZWN0RGlyKSkge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0RGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9yUHJvamVjdChwcmpEaXJzOiBzdHJpbmdbXSB8IHN0cmluZykge1xuICAgIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHByakRpcnMpLmZvckVhY2gocHJqRGlyID0+IHtcbiAgICAgIGZvciAoY29uc3Qgc3JjRGlyIG9mIHNyY0RpcnNPZlByb2plY3QocHJqRGlyKSkge1xuICAgICAgICBjYWxsYmFjayEoc3JjRGlyLCBwcmpEaXIpO1xuICAgICAgfVxuICAgICAgLy8gY29uc3QgZTJlRGlyID0gUGF0aC5qb2luKHByakRpciwgJ2UyZXRlc3QnKTtcbiAgICAgIC8vIGlmIChmcy5leGlzdHNTeW5jKGUyZURpcikpXG4gICAgICAvLyAgIGNhbGxiYWNrIShlMmVEaXIsIHByakRpcik7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBhbGxTcmNEaXJzKCkge1xuICBmb3IgKGNvbnN0IHByb2pEaXIgb2YgcHJvamVjdExpc3QpIHtcbiAgICBmb3IgKGNvbnN0IHNyY0RpciBvZiBzcmNEaXJzT2ZQcm9qZWN0KHByb2pEaXIpKSB7XG4gICAgICB5aWVsZCB7c3JjRGlyLCBwcm9qRGlyfTtcbiAgICB9XG4gIH1cbiAgaWYgKGxpbmtQYXR0ZXJucykge1xuICAgIGZvciAobGV0IHBhdCBvZiBsaW5rUGF0dGVybnMpIHtcbiAgICAgIGlmIChwYXQuZW5kc1dpdGgoJy8qKicpKVxuICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTMpO1xuICAgICAgZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTIpO1xuICAgICAgcGF0ID0gXy50cmltU3RhcnQocGF0LCAnLicpO1xuICAgICAgeWllbGQge3NyY0RpcjogcGF0fTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24qIHNyY0RpcnNPZlByb2plY3QocHJvamVjdERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHNyY1JlY2lwZU1hcEZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ2RyLnJlY2lwZXMuanNvbicpO1xuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gY29uc3QgcmVjaXBlU3JjTWFwcGluZzoge1tyZWNpcGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgbGV0IG5hbWVTcmNTZXR0aW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gIGxldCBub3JtYWxpemVkUHJqTmFtZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyKS5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKTtcbiAgbm9ybWFsaXplZFByak5hbWUgPSBfLnRyaW0obm9ybWFsaXplZFByak5hbWUsICcuJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpKSB7XG4gICAgY29uc3QgcGtqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKSk7XG4gICAgaWYgKHBranNvbi5wYWNrYWdlcykge1xuICAgICAgZm9yIChsZXQgcGF0IG9mIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBranNvbi5wYWNrYWdlcykpIHtcbiAgICAgICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcbiAgICAgICAgZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgICAgIHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcbiAgICAgICAgeWllbGQgUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHBhdCk7XG4gICAgICAgIC8vIG5hbWVTcmNTZXR0aW5nW2NvbmZpZy5yZXNvbHZlKFxuICAgICAgICAvLyAgICdkZXN0RGlyJywgYHJlY2lwZXMvJHtwa2pzb24ubmFtZX0ke3BhdC5sZW5ndGggPiAwID8gJy4nIDogJyd9JHtwYXQucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyl9LnJlY2lwZWApXSA9XG4gICAgICAgIC8vICAgICBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgaWYgKGZzLmV4aXN0c1N5bmMoc3JjUmVjaXBlTWFwRmlsZSkpIHtcbiAgICAvLyBsZWdhY3k6IHJlYWQgZHIucmVjaXBlcy5qc29uXG4gICAgbmFtZVNyY1NldHRpbmcgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhzcmNSZWNpcGVNYXBGaWxlLCAndXRmOCcpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkgPyByZXF1aXJlKHBrSnNvbkZpbGUpLm5hbWUgOiBQYXRoLmJhc2VuYW1lKHByb2plY3REaXIpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihwcm9qZWN0RGlyLCAnc3JjJykpKSB7XG4gICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ3NyYyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlc3RTcmNEaXIgPSBQYXRoLmpvaW4ocHJvamVjdERpciwgJ2FwcCcpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFNyY0RpcikgJiYgZnMuc3RhdFN5bmModGVzdFNyY0RpcikuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdhcHAnO1xuICAgICAgZWxzZVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJy4nO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IHNyY0RpciBvZiBPYmplY3QudmFsdWVzKG5hbWVTcmNTZXR0aW5nKSkge1xuICAgIHlpZWxkIHNyY0RpcjtcbiAgfVxuICByZXR1cm47XG59XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVDYWxsYmFjayA9IChyZWNpcGVEaXI6IHN0cmluZyxcbiAgaXNGcm9tSW5zdGFsbGF0aW9uOiBib29sZWFuLFxuICBqc29uRmlsZU5hbWU6IHN0cmluZyxcbiAganNvbkZpbGVDb250ZW50OiBzdHJpbmcpID0+IHZvaWQ7XG5cbi8qKlxuICogQHJldHVybnMgT2JzZXJ2YWJsZSBvZiB0dXBsZSBbcHJvamVjdCwgcGFja2FnZS5qc29uIGZpbGVdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2FuUGFja2FnZXMoKSB7XG4gIGNvbnN0IG9iczogT2JzZXJ2YWJsZTxbc3RyaW5nIHwgdW5kZWZpbmVkLCBzdHJpbmcsIHN0cmluZ10+W10gPSBbXTtcbiAgZm9yIChjb25zdCB7c3JjRGlyLCBwcm9qRGlyfSBvZiBhbGxTcmNEaXJzKCkpIHtcbiAgICBvYnMucHVzaChmaW5kUGFja2FnZUpzb24oc3JjRGlyLCBmYWxzZSlcbiAgICAucGlwZShcbiAgICAgIG1hcChqc29uRmlsZSA9PiBbcHJvakRpciwganNvbkZpbGUsIHNyY0Rpcl0pXG4gICAgKSk7XG4gIH1cbiAgcmV0dXJuIG1lcmdlKC4uLm9icyk7XG59XG4iXX0=