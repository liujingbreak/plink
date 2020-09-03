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
exports.clean = exports.linkComponentsAsync = exports.eachRecipeSrc = exports.setProjectList = void 0;
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
const rwPackageJson = __importStar(require("./rwPackageJson"));
const operators_1 = require("rxjs/operators");
// import {actions as cleanActions} from './cmd/cli-clean';
// const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
// import config from './config';
// import {getRootDir} from './utils';
let projectList = [];
// let workspaceDirs: string[] = [];
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
// function eachDownloadedRecipe(callback: EachRecipeCallback, excludeRecipeSet?: Set<string>) {
//   let srcRecipeSet: Set<string>;
//   if (excludeRecipeSet) {
//     srcRecipeSet = excludeRecipeSet;
//   } else {
//     srcRecipeSet = new Set();
//     eachRecipeSrc((x, y, recipeName) => {
//       if (recipeName) srcRecipeSet.add(recipeName);
//     });
//   }
//   if (config().installedRecipes) {
//     const regexList = (config().installedRecipes as string[]).map(s => new RegExp(s));
//     const pkjson = require(Path.resolve('package.json')); // <workspace>/package.json
//     const deps = Object.assign({}, pkjson.dependencies || {}, pkjson.devDependencies || {});
//     if (!deps)
//       return;
//     const drcpName = require('../../package.json').name;
//     _.each(deps, function(ver, depName) {
//       if (depName !== drcpName && !srcRecipeSet.has(depName) && _.some(regexList, regex => regex.test(depName))) {
//         log.debug('looking for installed recipe: %s', depName);
//         let p;
//         try {
//           p = Path.resolve('node_modules', depName); // <workspace>/node_modules/<depName>
//           callback(p, true, 'package.json');
//         } catch (e) {
//           log.info(`${depName} seems to be not installed`);
//         }
//       }
//     });
//   }
// }
/**
 * @name eachRecipe
 * @param  {Function} callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
 */
// export function eachRecipe(callback: EachRecipeCallback) {
//   // const srcRecipeSet = new Set();
//   eachRecipeSrc((srcDir, proj) => {
//     // srcRecipeSet.add(recipeName);
//     if (recipeDir)
//       callback(recipeDir, false, 'package.json');
//   });
//   eachInstalledRecipe(callback);
// }
/**
 * eachInstalledRecipe
 * @param callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
*/
// export function eachInstalledRecipe(callback: EachRecipeCallback) {
//   // eachDownloadedRecipe(callback);
//   // const rootDir = getRootDir();
//   for (const dir of workspaceDirs)
//     callback(dir, true, 'package.json');
// }
/**
 * @return array of linked package's package.json file path
 */
function linkComponentsAsync(symlinksDir) {
    // const pkJsonFiles: string[] = [];
    const obs = [];
    eachRecipeSrc((src, proj) => {
        obs.push(find_package_1.default(src, true).pipe(rwPackageJson.symbolicLinkPackages(symlinksDir), operators_1.map(([jsonFile, json]) => {
            return { proj, jsonFile, json };
        })));
    });
    return rxjs_1.merge(...obs);
}
exports.linkComponentsAsync = linkComponentsAsync;
function clean() {
    return __awaiter(this, void 0, void 0, function* () {
        yield symlinks_1.default('all');
    });
}
exports.clean = clean;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QiwrQkFBdUM7QUFDdkMsNkNBQStCO0FBQy9CLGdFQUErQztBQUMvQyw4RUFBeUQ7QUFDekQsK0RBQWlEO0FBQ2pELDhDQUFtQztBQUNuQywyREFBMkQ7QUFDM0QsK0VBQStFO0FBQy9FLGlDQUFpQztBQUNqQyxzQ0FBc0M7QUFFdEMsSUFBSSxXQUFXLEdBQWEsRUFBRSxDQUFDO0FBQy9CLG9DQUFvQztBQUVwQyxTQUFnQixjQUFjLENBQUMsSUFBYztJQUMzQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQ3JCLENBQUM7QUFGRCx3Q0FFQztBQWlCRCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdEUsUUFBZ0M7SUFDaEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQixRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN6QjtTQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDakMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMvRCxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDeEI7YUFBTTtZQUNMLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUN6QjtLQUNGO0lBRUQsU0FBUyxVQUFVLENBQUMsT0FBMEI7UUFDM0MsRUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEQs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Q0gsU0FBZ0IsbUJBQW1CLENBQUMsV0FBbUI7SUFDckQsb0NBQW9DO0lBQ3BDLE1BQU0sR0FBRyxHQUE4RCxFQUFFLENBQUM7SUFDMUUsYUFBYSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQ04sc0JBQWUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUM3QixhQUFhLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLEVBQy9DLGVBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDdkIsT0FBTyxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFlBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFiRCxrREFhQztBQUVELFNBQXNCLEtBQUs7O1FBQ3pCLE1BQU0sa0JBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixDQUFDO0NBQUE7QUFGRCxzQkFFQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm1heC1saW5lLWxlbmd0aFxuLyoqXG4gKiBUbyBhdm9pZCBjaXJjbGUgcmVmZXJlY2luZywgVGhpcyBmaWxlIHNob3VsZCBub3QgZGVwZW5kcyBvbiBwYWNrYWdlLW1nci9pbmRleCAhISFcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgbWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHNjYW5Ob2RlTW9kdWxlcyBmcm9tICcuL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCBmaW5kUGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLW1nci9maW5kLXBhY2thZ2UnO1xuaW1wb3J0ICogYXMgcndQYWNrYWdlSnNvbiBmcm9tICcuL3J3UGFja2FnZUpzb24nO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCB7YWN0aW9ucyBhcyBjbGVhbkFjdGlvbnN9IGZyb20gJy4vY21kL2NsaS1jbGVhbic7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lKSk7XG4vLyBpbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbi8vIGltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBwcm9qZWN0TGlzdDogc3RyaW5nW10gPSBbXTtcbi8vIGxldCB3b3Jrc3BhY2VEaXJzOiBzdHJpbmdbXSA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJvamVjdExpc3QobGlzdDogc3RyaW5nW10pIHtcbiAgcHJvamVjdExpc3QgPSBsaXN0O1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gc2V0V29ya3NwYWNlRGlycyhsaXN0OiBzdHJpbmdbXSkge1xuLy8gICB3b3Jrc3BhY2VEaXJzID0gbGlzdDtcbi8vIH1cblxuLy8gbGV0IGNsZWFuQWN0aW9uczogQWN0aW9uc1R5cGU7XG4vLyBjbGVhbkFjdGlvbnNQcm9tLnRoZW4oYWN0aW9ucyA9PiBjbGVhbkFjdGlvbnMgPSBhY3Rpb25zKTtcblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZVNyY0NhbGxiYWNrID0gKHNyY0Rpcjogc3RyaW5nLCBwcm9qZWN0RGlyOiBzdHJpbmcpID0+IHZvaWQ7XG4vKipcbiAqIEl0ZXJhdGUgc3JjIGZvbGRlciBmb3IgY29tcG9uZW50IGl0ZW1zXG4gKiBAcGFyYW0ge3N0cmluZyB8IHN0cmluZ1tdfSBwcm9qZWN0RGlyIG9wdGlvbmFsLCBpZiBub3QgcHJlc2VudCBvciBudWxsLCBpbmNsdWRlcyBhbGwgcHJvamVjdCBzcmMgZm9sZGVyc1xuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChzcmNEaXIsIHJlY2lwZURpciwgcmVjaXBlTmFtZSk6IHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMoY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcsIGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nIHwgRWFjaFJlY2lwZVNyY0NhbGxiYWNrLFxuICBjYWxsYmFjaz86IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBpZiAodHlwZW9mIHByb2plY3REaXIgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocHJvamVjdERpcikpIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdERpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZvclByb2plY3QocHJqRGlyczogc3RyaW5nW10gfCBzdHJpbmcpIHtcbiAgICAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwcmpEaXJzKS5mb3JFYWNoKHByakRpciA9PiB7XG4gICAgICBmb3IgKGNvbnN0IHNyY0RpciBvZiBzcmNEaXJzT2ZQcm9qZWN0KHByakRpcikpIHtcbiAgICAgICAgY2FsbGJhY2shKHNyY0RpciwgcHJqRGlyKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGUyZURpciA9IFBhdGguam9pbihwcmpEaXIsICdlMmV0ZXN0Jyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhlMmVEaXIpKVxuICAgICAgICBjYWxsYmFjayEoZTJlRGlyLCBwcmpEaXIpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uKiBzcmNEaXJzT2ZQcm9qZWN0KHByb2plY3REaXI6IHN0cmluZykge1xuICBjb25zdCBzcmNSZWNpcGVNYXBGaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdkci5yZWNpcGVzLmpzb24nKTtcbiAgY29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIGNvbnN0IHJlY2lwZVNyY01hcHBpbmc6IHtbcmVjaXBlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGxldCBuYW1lU3JjU2V0dGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICBsZXQgbm9ybWFsaXplZFByak5hbWUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpcikucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyk7XG4gIG5vcm1hbGl6ZWRQcmpOYW1lID0gXy50cmltKG5vcm1hbGl6ZWRQcmpOYW1lLCAnLicpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSkge1xuICAgIGNvbnN0IHBranNvbiA9IHJlcXVpcmUocGtKc29uRmlsZSk7XG4gICAgaWYgKHBranNvbi5wYWNrYWdlcykge1xuICAgICAgZm9yIChsZXQgcGF0IG9mIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBranNvbi5wYWNrYWdlcykpIHtcbiAgICAgICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcbiAgICAgICAgZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgICAgIHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcbiAgICAgICAgeWllbGQgUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHBhdCk7XG4gICAgICAgIC8vIG5hbWVTcmNTZXR0aW5nW2NvbmZpZy5yZXNvbHZlKFxuICAgICAgICAvLyAgICdkZXN0RGlyJywgYHJlY2lwZXMvJHtwa2pzb24ubmFtZX0ke3BhdC5sZW5ndGggPiAwID8gJy4nIDogJyd9JHtwYXQucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyl9LnJlY2lwZWApXSA9XG4gICAgICAgIC8vICAgICBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgaWYgKGZzLmV4aXN0c1N5bmMoc3JjUmVjaXBlTWFwRmlsZSkpIHtcbiAgICAvLyBsZWdhY3k6IHJlYWQgZHIucmVjaXBlcy5qc29uXG4gICAgbmFtZVNyY1NldHRpbmcgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhzcmNSZWNpcGVNYXBGaWxlLCAndXRmOCcpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkgPyByZXF1aXJlKHBrSnNvbkZpbGUpLm5hbWUgOiBQYXRoLmJhc2VuYW1lKHByb2plY3REaXIpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihwcm9qZWN0RGlyLCAnc3JjJykpKSB7XG4gICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ3NyYyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlc3RTcmNEaXIgPSBQYXRoLmpvaW4ocHJvamVjdERpciwgJ2FwcCcpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFNyY0RpcikgJiYgZnMuc3RhdFN5bmModGVzdFNyY0RpcikuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdhcHAnO1xuICAgICAgZWxzZVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJy4nO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IHNyY0RpciBvZiBPYmplY3QudmFsdWVzKG5hbWVTcmNTZXR0aW5nKSkge1xuICAgIHlpZWxkIHNyY0RpcjtcbiAgfVxuICByZXR1cm47XG59XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVDYWxsYmFjayA9IChyZWNpcGVEaXI6IHN0cmluZyxcbiAgaXNGcm9tSW5zdGFsbGF0aW9uOiBib29sZWFuLFxuICBqc29uRmlsZU5hbWU6IHN0cmluZyxcbiAganNvbkZpbGVDb250ZW50OiBzdHJpbmcpID0+IHZvaWQ7XG5cbi8vIGZ1bmN0aW9uIGVhY2hEb3dubG9hZGVkUmVjaXBlKGNhbGxiYWNrOiBFYWNoUmVjaXBlQ2FsbGJhY2ssIGV4Y2x1ZGVSZWNpcGVTZXQ/OiBTZXQ8c3RyaW5nPikge1xuLy8gICBsZXQgc3JjUmVjaXBlU2V0OiBTZXQ8c3RyaW5nPjtcbi8vICAgaWYgKGV4Y2x1ZGVSZWNpcGVTZXQpIHtcbi8vICAgICBzcmNSZWNpcGVTZXQgPSBleGNsdWRlUmVjaXBlU2V0O1xuLy8gICB9IGVsc2Uge1xuLy8gICAgIHNyY1JlY2lwZVNldCA9IG5ldyBTZXQoKTtcbi8vICAgICBlYWNoUmVjaXBlU3JjKCh4LCB5LCByZWNpcGVOYW1lKSA9PiB7XG4vLyAgICAgICBpZiAocmVjaXBlTmFtZSkgc3JjUmVjaXBlU2V0LmFkZChyZWNpcGVOYW1lKTtcbi8vICAgICB9KTtcbi8vICAgfVxuLy8gICBpZiAoY29uZmlnKCkuaW5zdGFsbGVkUmVjaXBlcykge1xuLy8gICAgIGNvbnN0IHJlZ2V4TGlzdCA9IChjb25maWcoKS5pbnN0YWxsZWRSZWNpcGVzIGFzIHN0cmluZ1tdKS5tYXAocyA9PiBuZXcgUmVnRXhwKHMpKTtcbi8vICAgICBjb25zdCBwa2pzb24gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpOyAvLyA8d29ya3NwYWNlPi9wYWNrYWdlLmpzb25cbi8vICAgICBjb25zdCBkZXBzID0gT2JqZWN0LmFzc2lnbih7fSwgcGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSwgcGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4vLyAgICAgaWYgKCFkZXBzKVxuLy8gICAgICAgcmV0dXJuO1xuLy8gICAgIGNvbnN0IGRyY3BOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcbi8vICAgICBfLmVhY2goZGVwcywgZnVuY3Rpb24odmVyLCBkZXBOYW1lKSB7XG4vLyAgICAgICBpZiAoZGVwTmFtZSAhPT0gZHJjcE5hbWUgJiYgIXNyY1JlY2lwZVNldC5oYXMoZGVwTmFtZSkgJiYgXy5zb21lKHJlZ2V4TGlzdCwgcmVnZXggPT4gcmVnZXgudGVzdChkZXBOYW1lKSkpIHtcbi8vICAgICAgICAgbG9nLmRlYnVnKCdsb29raW5nIGZvciBpbnN0YWxsZWQgcmVjaXBlOiAlcycsIGRlcE5hbWUpO1xuLy8gICAgICAgICBsZXQgcDtcbi8vICAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICBwID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCBkZXBOYW1lKTsgLy8gPHdvcmtzcGFjZT4vbm9kZV9tb2R1bGVzLzxkZXBOYW1lPlxuLy8gICAgICAgICAgIGNhbGxiYWNrKHAsIHRydWUsICdwYWNrYWdlLmpzb24nKTtcbi8vICAgICAgICAgfSBjYXRjaCAoZSkge1xuLy8gICAgICAgICAgIGxvZy5pbmZvKGAke2RlcE5hbWV9IHNlZW1zIHRvIGJlIG5vdCBpbnN0YWxsZWRgKTtcbi8vICAgICAgICAgfVxuLy8gICAgICAgfVxuLy8gICAgIH0pO1xuLy8gICB9XG4vLyB9XG5cbi8qKlxuICogQG5hbWUgZWFjaFJlY2lwZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uKHJlY2lwZURpciwgaXNGcm9tSW5zdGFsbGF0aW9uLCBqc29uRmlsZU5hbWUgPSAncGFja2FnZS5qc29uJyk6IHZvaWRcbiAqL1xuLy8gZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaykge1xuLy8gICAvLyBjb25zdCBzcmNSZWNpcGVTZXQgPSBuZXcgU2V0KCk7XG4vLyAgIGVhY2hSZWNpcGVTcmMoKHNyY0RpciwgcHJvaikgPT4ge1xuLy8gICAgIC8vIHNyY1JlY2lwZVNldC5hZGQocmVjaXBlTmFtZSk7XG4vLyAgICAgaWYgKHJlY2lwZURpcilcbi8vICAgICAgIGNhbGxiYWNrKHJlY2lwZURpciwgZmFsc2UsICdwYWNrYWdlLmpzb24nKTtcbi8vICAgfSk7XG4vLyAgIGVhY2hJbnN0YWxsZWRSZWNpcGUoY2FsbGJhY2spO1xuLy8gfVxuXG4vKipcbiAqIGVhY2hJbnN0YWxsZWRSZWNpcGVcbiAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvbihyZWNpcGVEaXIsIGlzRnJvbUluc3RhbGxhdGlvbiwganNvbkZpbGVOYW1lID0gJ3BhY2thZ2UuanNvbicpOiB2b2lkXG4qL1xuLy8gZXhwb3J0IGZ1bmN0aW9uIGVhY2hJbnN0YWxsZWRSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaykge1xuLy8gICAvLyBlYWNoRG93bmxvYWRlZFJlY2lwZShjYWxsYmFjayk7XG4vLyAgIC8vIGNvbnN0IHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG4vLyAgIGZvciAoY29uc3QgZGlyIG9mIHdvcmtzcGFjZURpcnMpXG4vLyAgICAgY2FsbGJhY2soZGlyLCB0cnVlLCAncGFja2FnZS5qc29uJyk7XG4vLyB9XG5cbi8qKlxuICogQHJldHVybiBhcnJheSBvZiBsaW5rZWQgcGFja2FnZSdzIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbmtDb21wb25lbnRzQXN5bmMoc3ltbGlua3NEaXI6IHN0cmluZykge1xuICAvLyBjb25zdCBwa0pzb25GaWxlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgb2JzOiBPYnNlcnZhYmxlPHtwcm9qOiBzdHJpbmcsIGpzb25GaWxlOiBzdHJpbmcsIGpzb246IGFueX0+W10gPSBbXTtcbiAgZWFjaFJlY2lwZVNyYygoc3JjLCBwcm9qKSA9PiB7XG4gICAgb2JzLnB1c2goXG4gICAgICBmaW5kUGFja2FnZUpzb24oc3JjLCB0cnVlKS5waXBlKFxuICAgICAgICByd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKHN5bWxpbmtzRGlyKSxcbiAgICAgICAgbWFwKChbanNvbkZpbGUsIGpzb25dKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtwcm9qLCBqc29uRmlsZSwganNvbn07XG4gICAgICAgIH0pXG4gICAgICApKTtcbiAgfSk7XG4gIHJldHVybiBtZXJnZSguLi5vYnMpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW4oKSB7XG4gIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG59XG5cblxuIl19