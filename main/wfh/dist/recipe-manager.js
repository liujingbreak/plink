"use strict";
// tslint:disable:max-line-length
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
exports.clean = exports.linkComponentsAsync = exports.link = exports.eachRecipe = exports.eachRecipeSrc = exports.setProjectList = void 0;
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const gulp_1 = __importDefault(require("gulp"));
const fs = __importStar(require("fs-extra"));
const symlinks_1 = __importDefault(require("./utils/symlinks"));
const find_package_1 = __importDefault(require("./package-mgr/find-package"));
const rwPackageJson = __importStar(require("./rwPackageJson"));
const cli_clean_1 = require("./cmd/cli-clean");
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
// const File = require('vinyl');
const through = require('through2');
const merge = require('merge2');
const config_1 = __importDefault(require("./config"));
// import {getInstance} from './package-json-guarder';
// const packageJsonGuarder = getInstance(config().rootPath);
// let linkListFile: string;
// config.done.then(() => {
//   linkListFile = config.resolve('destDir', 'link-list.json');
// });
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
            _.each(recipe2srcDirMapForPrj(prjDir), (srcDir, recipe) => onEachSrcRecipePair(prjDir, srcDir, recipe));
            const e2eDir = Path.join(prjDir, 'e2etest');
            if (fs.existsSync(e2eDir))
                callback(e2eDir, null, null, prjDir);
        });
    }
    function onEachSrcRecipePair(prjDir, srcDir, recipeDir) {
        let recipeName = null;
        try {
            recipeName = require(Path.resolve(recipeDir, 'package.json')).name;
        }
        catch (e) {
            log.debug(`Can't read ${Path.resolve(recipeDir, 'package.json')}`);
        }
        callback(srcDir, recipeDir, recipeName, prjDir);
    }
}
exports.eachRecipeSrc = eachRecipeSrc;
function recipe2srcDirMapForPrj(projectDir) {
    const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
    const pkJsonFile = Path.resolve(projectDir, 'package.json');
    const recipeSrcMapping = {};
    let nameSrcSetting = {};
    let normalizedPrjName = Path.resolve(projectDir).replace(/[\/\\]/g, '.');
    normalizedPrjName = _.trim(normalizedPrjName, '.');
    if (fs.existsSync(pkJsonFile)) {
        const pkjson = require(pkJsonFile);
        if (pkjson.packages) {
            [].concat(pkjson.packages).forEach((pat) => {
                if (pat.endsWith('/**'))
                    pat = pat.slice(0, -3);
                else if (pat.endsWith('/*'))
                    pat = pat.slice(0, -2);
                pat = _.trimStart(pat, '.');
                nameSrcSetting[config_1.default.resolve('destDir', `recipes/${pkjson.name}${pat.length > 0 ? '.' : ''}${pat.replace(/[\/\\]/g, '.')}.recipe`)] =
                    Path.resolve(projectDir, pat);
            });
            return nameSrcSetting;
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
    _.each(nameSrcSetting, (srcDir, recipeDir) => {
        let srcDirs;
        if (!_.endsWith(recipeDir, '-recipe'))
            recipeDir += '-recipe';
        srcDirs = Array.isArray(srcDir) ? srcDir : [srcDir];
        const absRecipeDir = config_1.default.resolve('destDir', recipeDir);
        srcDirs.forEach(srcDir => recipeSrcMapping[absRecipeDir] = Path.resolve(projectDir, srcDir));
    });
    return recipeSrcMapping;
}
function eachDownloadedRecipe(callback, excludeRecipeSet) {
    let srcRecipeSet;
    if (excludeRecipeSet) {
        srcRecipeSet = excludeRecipeSet;
    }
    else {
        srcRecipeSet = new Set();
        eachRecipeSrc((x, y, recipeName) => {
            if (recipeName)
                srcRecipeSet.add(recipeName);
        });
    }
    if (config_1.default().installedRecipes) {
        const regexList = config_1.default().installedRecipes.map(s => new RegExp(s));
        const pkjson = require(Path.resolve(config_1.default().rootPath, 'package.json'));
        const deps = Object.assign({}, pkjson.dependencies || {}, pkjson.devDependencies || {});
        if (!deps)
            return;
        const drcpName = require('../../package.json').name;
        _.each(deps, function (ver, depName) {
            if (depName !== drcpName && !srcRecipeSet.has(depName) && _.some(regexList, regex => regex.test(depName))) {
                log.debug('looking for installed recipe: %s', depName);
                let p;
                try {
                    p = Path.resolve(config_1.default().nodePath, depName);
                    callback(p, true, 'package.json');
                }
                catch (e) {
                    log.info(`${depName} seems to be not installed`);
                }
            }
        });
    }
}
/**
 * @name eachRecipe
 * @param  {Function} callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
 */
function eachRecipe(callback) {
    // const srcRecipeSet = new Set();
    eachRecipeSrc((srcDir, recipeDir, recipeName) => {
        // srcRecipeSet.add(recipeName);
        if (recipeDir)
            callback(recipeDir, false, 'package.json');
    });
    eachDownloadedRecipe(callback);
    // eachInstalledRecipe(callback);
}
exports.eachRecipe = eachRecipe;
/**
 * eachInstalledRecipe
 * @param callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
*/
// export function eachInstalledRecipe(callback: EachRecipeCallback) {
//   eachDownloadedRecipe(callback);
//   callback(config().rootPath, true, Path.relative(config().rootPath, packageJsonGuarder.getJsonFile()));
// }
function link(onPkJsonFile) {
    const streams = [];
    eachRecipeSrc(function (src, recipeDir, recipeName, proj) {
        // tslint:disable-next-line:no-console
        log.debug('[recipeManager]link recipe', recipeDir);
        streams.push(linkToRecipeFile(src, recipeDir, (file, recipeDir) => onPkJsonFile(file, recipeDir, proj)));
    });
    return merge(streams)
        .pipe(through.obj(function (file, enc, next) {
        if (_.isArray(file)) {
            // linkFiles.push(...file);
            cli_clean_1.actions.addWorkspaceFile(file);
        }
        else {
            log.debug('out: ' + file.path);
            this.push(file);
        }
        next();
    }, function flush(next) {
        next();
    }))
        .pipe(gulp_1.default.dest(config_1.default().rootPath))
        .on('error', function (err) {
        log.error(err);
    });
}
exports.link = link;
/**
 * @return array of linked package's package.json file path
 */
function linkComponentsAsync(cb) {
    // const pkJsonFiles: string[] = [];
    return new Promise((resolve, reject) => {
        link((file, recipeDir, proj) => {
            // pkJsonFiles.push(file);
            cb(proj, file);
        })
            .on('end', () => resolve())
            .on('error', reject)
            .resume();
    });
}
exports.linkComponentsAsync = linkComponentsAsync;
function clean() {
    return __awaiter(this, void 0, void 0, function* () {
        // await config.done;
        yield symlinks_1.default('all');
        // const recipes: string[] = [];
        // eachRecipeSrc(function(src: string, recipeDir: string) {
        //   if (recipeDir)
        //     recipes.push(Path.join(recipeDir, 'package.json'));
        // });
        // return new Promise((resolve, j) => {
        //   gulp.src(recipes, {base: config().rootPath})
        //   .pipe(rwPackageJson.removeDependency())
        //   .pipe(through.obj(function(file: any, enc: string, next: (...args: any[]) => void) {
        //     log.debug('out: ' + file.path);
        //     next(null, file);
        //   }))
        //   .pipe(gulp.dest(config().rootPath))
        //   .on('end', () => resolve())
        //   .on('error', j);
        // });
    });
}
exports.clean = clean;
function linkToRecipeFile(srcDir, recipeDir, onPkJsonFile) {
    return gulp_1.default.src('.')
        .pipe(find_package_1.default(srcDir, true))
        .pipe(through.obj(function (file, enc, next) {
        log.debug('Found recipeDir %s: file: %s', recipeDir, file.path);
        if (onPkJsonFile)
            onPkJsonFile(file.path, recipeDir);
        next(null, file);
    }))
        // .pipe(rwPackageJson.symbolicLinkPackages(config.resolve('destDir', 'links')))
        .pipe(rwPackageJson.symbolicLinkPackages(config_1.default.resolve('rootPath')))
        .pipe(rwPackageJson.addDependency(recipeDir))
        .on('error', function (err) {
        log.error(err);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUNBQWlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRWpDLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLDZDQUErQjtBQUMvQixnRUFBK0M7QUFDL0MsOEVBQXlEO0FBQ3pELCtEQUFpRDtBQUNqRCwrQ0FBd0Q7QUFDeEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVFLGlDQUFpQztBQUNqQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLHNEQUE4QjtBQUc5QixzREFBc0Q7QUFDdEQsNkRBQTZEO0FBRTdELDRCQUE0QjtBQUU1QiwyQkFBMkI7QUFDM0IsZ0VBQWdFO0FBQ2hFLE1BQU07QUFFTixJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUM7QUFDL0IsU0FBZ0IsY0FBYyxDQUFDLElBQWM7SUFDM0MsV0FBVyxHQUFHLElBQUksQ0FBQztBQUNyQixDQUFDO0FBRkQsd0NBRUM7QUFhRCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdEUsUUFBZ0M7SUFDaEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMxQixRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUN6QjtTQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDakMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFR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QyxPQUFPLEVBQUUsVUFBUyxHQUFVO1FBQzlCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bWF4LWxpbmUtbGVuZ3RoXG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ3VscCBmcm9tICdndWxwJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBzY2FuTm9kZU1vZHVsZXMgZnJvbSAnLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgZmluZFBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlJztcbmltcG9ydCAqIGFzIHJ3UGFja2FnZUpzb24gZnJvbSAnLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7YWN0aW9ucyBhcyBjbGVhbkFjdGlvbnN9IGZyb20gJy4vY21kL2NsaS1jbGVhbic7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lKSk7XG4vLyBjb25zdCBGaWxlID0gcmVxdWlyZSgndmlueWwnKTtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuY29uc3QgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZTInKTtcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuXG5cbi8vIGltcG9ydCB7Z2V0SW5zdGFuY2V9IGZyb20gJy4vcGFja2FnZS1qc29uLWd1YXJkZXInO1xuLy8gY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0SW5zdGFuY2UoY29uZmlnKCkucm9vdFBhdGgpO1xuXG4vLyBsZXQgbGlua0xpc3RGaWxlOiBzdHJpbmc7XG5cbi8vIGNvbmZpZy5kb25lLnRoZW4oKCkgPT4ge1xuLy8gICBsaW5rTGlzdEZpbGUgPSBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdsaW5rLWxpc3QuanNvbicpO1xuLy8gfSk7XG5cbmxldCBwcm9qZWN0TGlzdDogc3RyaW5nW10gPSBbXTtcbmV4cG9ydCBmdW5jdGlvbiBzZXRQcm9qZWN0TGlzdChsaXN0OiBzdHJpbmdbXSkge1xuICBwcm9qZWN0TGlzdCA9IGxpc3Q7XG59XG5cbi8vIGxldCBjbGVhbkFjdGlvbnM6IEFjdGlvbnNUeXBlO1xuLy8gY2xlYW5BY3Rpb25zUHJvbS50aGVuKGFjdGlvbnMgPT4gY2xlYW5BY3Rpb25zID0gYWN0aW9ucyk7XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVTcmNDYWxsYmFjayA9IChzcmNEaXI6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcgfCBudWxsLCByZWNpcGVOYW1lOiBzdHJpbmcgfCBudWxsLCBwcm9qZWN0RGlyOiBzdHJpbmcpID0+IHZvaWQ7XG4vKipcbiAqIEl0ZXJhdGUgc3JjIGZvbGRlciBmb3IgY29tcG9uZW50IGl0ZW1zXG4gKiBAcGFyYW0ge3N0cmluZyB8IHN0cmluZ1tdfSBwcm9qZWN0RGlyIG9wdGlvbmFsLCBpZiBub3QgcHJlc2VudCBvciBudWxsLCBpbmNsdWRlcyBhbGwgcHJvamVjdCBzcmMgZm9sZGVyc1xuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChzcmNEaXIsIHJlY2lwZURpciwgcmVjaXBlTmFtZSk6IHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMoY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcsIGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nIHwgRWFjaFJlY2lwZVNyY0NhbGxiYWNrLFxuICBjYWxsYmFjaz86IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBpZiAodHlwZW9mIHByb2plY3REaXIgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocHJvamVjdERpcikpIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdERpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZvclByb2plY3QocHJqRGlyczogc3RyaW5nW10gfCBzdHJpbmcpIHtcbiAgICAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwcmpEaXJzKS5mb3JFYWNoKHByakRpciA9PiB7XG4gICAgICBfLmVhY2gocmVjaXBlMnNyY0Rpck1hcEZvclByaihwcmpEaXIpLCAoc3JjRGlyLCByZWNpcGUpID0+IG9uRWFjaFNyY1JlY2lwZVBhaXIocHJqRGlyLCBzcmNEaXIsIHJlY2lwZSkpO1xuICAgICAgY29uc3QgZTJlRGlyID0gUGF0aC5qb2luKHByakRpciwgJ2UyZXRlc3QnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGUyZURpcikpXG4gICAgICAgIGNhbGxiYWNrIShlMmVEaXIsIG51bGwsIG51bGwsIHByakRpcik7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkVhY2hTcmNSZWNpcGVQYWlyKHByakRpcjogc3RyaW5nLCBzcmNEaXI6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpIHtcbiAgICBsZXQgcmVjaXBlTmFtZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHJlY2lwZU5hbWUgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSkubmFtZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cuZGVidWcoYENhbid0IHJlYWQgJHtQYXRoLnJlc29sdmUocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJyl9YCk7XG4gICAgfVxuICAgIGNhbGxiYWNrIShzcmNEaXIsIHJlY2lwZURpciwgcmVjaXBlTmFtZSwgcHJqRGlyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWNpcGUyc3JjRGlyTWFwRm9yUHJqKHByb2plY3REaXI6IHN0cmluZyk6IHtbcmVjaXBlRGlyOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3Qgc3JjUmVjaXBlTWFwRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAnZHIucmVjaXBlcy5qc29uJyk7XG4gIGNvbnN0IHBrSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCByZWNpcGVTcmNNYXBwaW5nOiB7W3JlY2lwZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBsZXQgbmFtZVNyY1NldHRpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgbGV0IG5vcm1hbGl6ZWRQcmpOYW1lID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIpLnJlcGxhY2UoL1tcXC9cXFxcXS9nLCAnLicpO1xuICBub3JtYWxpemVkUHJqTmFtZSA9IF8udHJpbShub3JtYWxpemVkUHJqTmFtZSwgJy4nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkpIHtcbiAgICBjb25zdCBwa2pzb24gPSByZXF1aXJlKHBrSnNvbkZpbGUpO1xuICAgIGlmIChwa2pzb24ucGFja2FnZXMpIHtcbiAgICAgIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBranNvbi5wYWNrYWdlcykuZm9yRWFjaCgocGF0KSA9PiB7XG4gICAgICAgIGlmIChwYXQuZW5kc1dpdGgoJy8qKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMyk7XG4gICAgICAgIGVsc2UgaWYgKHBhdC5lbmRzV2l0aCgnLyonKSlcbiAgICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTIpO1xuICAgICAgICBwYXQgPSBfLnRyaW1TdGFydChwYXQsICcuJyk7XG4gICAgICAgIG5hbWVTcmNTZXR0aW5nW2NvbmZpZy5yZXNvbHZlKFxuICAgICAgICAgICdkZXN0RGlyJywgYHJlY2lwZXMvJHtwa2pzb24ubmFtZX0ke3BhdC5sZW5ndGggPiAwID8gJy4nIDogJyd9JHtwYXQucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyl9LnJlY2lwZWApXSA9XG4gICAgICAgICAgICBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5hbWVTcmNTZXR0aW5nO1xuICAgIH1cbiAgfVxuICBpZiAoZnMuZXhpc3RzU3luYyhzcmNSZWNpcGVNYXBGaWxlKSkge1xuICAgIC8vIGxlZ2FjeTogcmVhZCBkci5yZWNpcGVzLmpzb25cbiAgICBuYW1lU3JjU2V0dGluZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHNyY1JlY2lwZU1hcEZpbGUsICd1dGY4JykpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHByb2plY3ROYW1lID0gZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSA/IHJlcXVpcmUocGtKc29uRmlsZSkubmFtZSA6IFBhdGguYmFzZW5hbWUocHJvamVjdERpcik7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKHByb2plY3REaXIsICdzcmMnKSkpIHtcbiAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnc3JjJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVzdFNyY0RpciA9IFBhdGguam9pbihwcm9qZWN0RGlyLCAnYXBwJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0U3JjRGlyKSAmJiBmcy5zdGF0U3luYyh0ZXN0U3JjRGlyKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ2FwcCc7XG4gICAgICBlbHNlXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnLic7XG4gICAgfVxuICB9XG4gIF8uZWFjaChuYW1lU3JjU2V0dGluZywgKHNyY0RpciwgcmVjaXBlRGlyKSA9PiB7XG4gICAgbGV0IHNyY0RpcnM6IHN0cmluZ1tdO1xuICAgIGlmICghXy5lbmRzV2l0aChyZWNpcGVEaXIsICctcmVjaXBlJykpXG4gICAgICByZWNpcGVEaXIgKz0gJy1yZWNpcGUnO1xuICAgIHNyY0RpcnMgPSBBcnJheS5pc0FycmF5KHNyY0RpcikgPyBzcmNEaXIgOiBbc3JjRGlyXTtcbiAgICBjb25zdCBhYnNSZWNpcGVEaXIgPSBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsIHJlY2lwZURpcik7XG4gICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiByZWNpcGVTcmNNYXBwaW5nW2Fic1JlY2lwZURpcl0gPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgc3JjRGlyKSk7XG4gIH0pO1xuICByZXR1cm4gcmVjaXBlU3JjTWFwcGluZztcbn1cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVDYWxsYmFjayA9IChyZWNpcGVEaXI6IHN0cmluZywgaXNGcm9tSW5zdGFsbGF0aW9uOiBib29sZWFuLCBqc29uRmlsZU5hbWU6IHN0cmluZykgPT4gdm9pZDtcblxuZnVuY3Rpb24gZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaywgZXhjbHVkZVJlY2lwZVNldD86IFNldDxzdHJpbmc+KSB7XG4gIGxldCBzcmNSZWNpcGVTZXQ6IFNldDxzdHJpbmc+O1xuICBpZiAoZXhjbHVkZVJlY2lwZVNldCkge1xuICAgIHNyY1JlY2lwZVNldCA9IGV4Y2x1ZGVSZWNpcGVTZXQ7XG4gIH0gZWxzZSB7XG4gICAgc3JjUmVjaXBlU2V0ID0gbmV3IFNldCgpO1xuICAgIGVhY2hSZWNpcGVTcmMoKHgsIHksIHJlY2lwZU5hbWUpID0+IHtcbiAgICAgIGlmIChyZWNpcGVOYW1lKSBzcmNSZWNpcGVTZXQuYWRkKHJlY2lwZU5hbWUpO1xuICAgIH0pO1xuICB9XG4gIGlmIChjb25maWcoKS5pbnN0YWxsZWRSZWNpcGVzKSB7XG4gICAgY29uc3QgcmVnZXhMaXN0ID0gKGNvbmZpZygpLmluc3RhbGxlZFJlY2lwZXMgYXMgc3RyaW5nW10pLm1hcChzID0+IG5ldyBSZWdFeHAocykpO1xuICAgIGNvbnN0IHBranNvbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJykpO1xuICAgIGNvbnN0IGRlcHMgPSBPYmplY3QuYXNzaWduKHt9LCBwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9LCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICBpZiAoIWRlcHMpXG4gICAgICByZXR1cm47XG4gICAgY29uc3QgZHJjcE5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuICAgIF8uZWFjaChkZXBzLCBmdW5jdGlvbih2ZXIsIGRlcE5hbWUpIHtcbiAgICAgIGlmIChkZXBOYW1lICE9PSBkcmNwTmFtZSAmJiAhc3JjUmVjaXBlU2V0LmhhcyhkZXBOYW1lKSAmJiBfLnNvbWUocmVnZXhMaXN0LCByZWdleCA9PiByZWdleC50ZXN0KGRlcE5hbWUpKSkge1xuICAgICAgICBsb2cuZGVidWcoJ2xvb2tpbmcgZm9yIGluc3RhbGxlZCByZWNpcGU6ICVzJywgZGVwTmFtZSk7XG4gICAgICAgIGxldCBwO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHAgPSBQYXRoLnJlc29sdmUoY29uZmlnKCkubm9kZVBhdGgsIGRlcE5hbWUpO1xuICAgICAgICAgIGNhbGxiYWNrKHAsIHRydWUsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKGAke2RlcE5hbWV9IHNlZW1zIHRvIGJlIG5vdCBpbnN0YWxsZWRgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgZWFjaFJlY2lwZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uKHJlY2lwZURpciwgaXNGcm9tSW5zdGFsbGF0aW9uLCBqc29uRmlsZU5hbWUgPSAncGFja2FnZS5qc29uJyk6IHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaykge1xuICAvLyBjb25zdCBzcmNSZWNpcGVTZXQgPSBuZXcgU2V0KCk7XG4gIGVhY2hSZWNpcGVTcmMoKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKSA9PiB7XG4gICAgLy8gc3JjUmVjaXBlU2V0LmFkZChyZWNpcGVOYW1lKTtcbiAgICBpZiAocmVjaXBlRGlyKVxuICAgICAgY2FsbGJhY2socmVjaXBlRGlyLCBmYWxzZSwgJ3BhY2thZ2UuanNvbicpO1xuICB9KTtcbiAgZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2spO1xuICAvLyBlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBlYWNoSW5zdGFsbGVkUmVjaXBlXG4gKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24ocmVjaXBlRGlyLCBpc0Zyb21JbnN0YWxsYXRpb24sIGpzb25GaWxlTmFtZSA9ICdwYWNrYWdlLmpzb24nKTogdm9pZFxuKi9cbi8vIGV4cG9ydCBmdW5jdGlvbiBlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrOiBFYWNoUmVjaXBlQ2FsbGJhY2spIHtcbi8vICAgZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2spO1xuLy8gICBjYWxsYmFjayhjb25maWcoKS5yb290UGF0aCwgdHJ1ZSwgUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcGFja2FnZUpzb25HdWFyZGVyLmdldEpzb25GaWxlKCkpKTtcbi8vIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmsob25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcsIHByb2o6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICBlYWNoUmVjaXBlU3JjKGZ1bmN0aW9uKHNyYywgcmVjaXBlRGlyLCByZWNpcGVOYW1lLCBwcm9qKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBsb2cuZGVidWcoJ1tyZWNpcGVNYW5hZ2VyXWxpbmsgcmVjaXBlJywgcmVjaXBlRGlyKTtcbiAgICBzdHJlYW1zLnB1c2gobGlua1RvUmVjaXBlRmlsZShzcmMsIHJlY2lwZURpciEsIChmaWxlLCByZWNpcGVEaXIpID0+IG9uUGtKc29uRmlsZShmaWxlLCByZWNpcGVEaXIsIHByb2opKSk7XG4gIH0pO1xuICByZXR1cm4gbWVyZ2Uoc3RyZWFtcylcbiAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmM6IHN0cmluZywgbmV4dDogKCkgPT4gdm9pZCkge1xuICAgIGlmIChfLmlzQXJyYXkoZmlsZSkpIHtcbiAgICAgIC8vIGxpbmtGaWxlcy5wdXNoKC4uLmZpbGUpO1xuICAgICAgY2xlYW5BY3Rpb25zLmFkZFdvcmtzcGFjZUZpbGUoZmlsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1Zygnb3V0OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgIHRoaXMucHVzaChmaWxlKTtcbiAgICB9XG4gICAgbmV4dCgpO1xuICB9LCBmdW5jdGlvbiBmbHVzaChuZXh0OiAoKSA9PiB2b2lkKSB7XG4gICAgbmV4dCgpO1xuICB9KSlcbiAgLnBpcGUoZ3VscC5kZXN0KGNvbmZpZygpLnJvb3RQYXRoKSlcbiAgLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycjogRXJyb3IpIHtcbiAgICBsb2cuZXJyb3IoZXJyKTtcbiAgfSk7XG59XG5cbi8qKlxuICogQHJldHVybiBhcnJheSBvZiBsaW5rZWQgcGFja2FnZSdzIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbmtDb21wb25lbnRzQXN5bmMoY2I6IChwcmo6IHN0cmluZywgcGtnSnNvbkZpbGU6IHN0cmluZykgPT4gdm9pZCkge1xuICAvLyBjb25zdCBwa0pzb25GaWxlczogc3RyaW5nW10gPSBbXTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGluaygoZmlsZSwgcmVjaXBlRGlyLCBwcm9qKSA9PiB7XG4gICAgICAvLyBwa0pzb25GaWxlcy5wdXNoKGZpbGUpO1xuICAgICAgY2IocHJvaiwgZmlsZSk7XG4gICAgfSlcbiAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcbiAgICAub24oJ2Vycm9yJywgcmVqZWN0KVxuICAgIC5yZXN1bWUoKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbigpIHtcbiAgLy8gYXdhaXQgY29uZmlnLmRvbmU7XG4gIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG4gIC8vIGNvbnN0IHJlY2lwZXM6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gZWFjaFJlY2lwZVNyYyhmdW5jdGlvbihzcmM6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpIHtcbiAgLy8gICBpZiAocmVjaXBlRGlyKVxuICAvLyAgICAgcmVjaXBlcy5wdXNoKFBhdGguam9pbihyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSk7XG4gIC8vIH0pO1xuICAvLyByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIGopID0+IHtcbiAgLy8gICBndWxwLnNyYyhyZWNpcGVzLCB7YmFzZTogY29uZmlnKCkucm9vdFBhdGh9KVxuICAvLyAgIC5waXBlKHJ3UGFja2FnZUpzb24ucmVtb3ZlRGVwZW5kZW5jeSgpKVxuICAvLyAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkge1xuICAvLyAgICAgbG9nLmRlYnVnKCdvdXQ6ICcgKyBmaWxlLnBhdGgpO1xuICAvLyAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgLy8gICB9KSlcbiAgLy8gICAucGlwZShndWxwLmRlc3QoY29uZmlnKCkucm9vdFBhdGgpKVxuICAvLyAgIC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKVxuICAvLyAgIC5vbignZXJyb3InLCBqKTtcbiAgLy8gfSk7XG59XG5cbmZ1bmN0aW9uIGxpbmtUb1JlY2lwZUZpbGUoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLFxuICBvblBrSnNvbkZpbGU6IChmaWxlUGF0aDogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZykgPT4gdm9pZCkge1xuICByZXR1cm4gZ3VscC5zcmMoJy4nKVxuICAgIC5waXBlKGZpbmRQYWNrYWdlSnNvbihzcmNEaXIsIHRydWUpKVxuICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBsb2cuZGVidWcoJ0ZvdW5kIHJlY2lwZURpciAlczogZmlsZTogJXMnLCByZWNpcGVEaXIsIGZpbGUucGF0aCk7XG4gICAgICBpZiAob25Qa0pzb25GaWxlKVxuICAgICAgICBvblBrSnNvbkZpbGUoZmlsZS5wYXRoLCByZWNpcGVEaXIpO1xuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KSlcbiAgICAvLyAucGlwZShyd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2xpbmtzJykpKVxuICAgIC5waXBlKHJ3UGFja2FnZUpzb24uc3ltYm9saWNMaW5rUGFja2FnZXMoY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJykpKVxuICAgIC5waXBlKHJ3UGFja2FnZUpzb24uYWRkRGVwZW5kZW5jeShyZWNpcGVEaXIpKVxuICAgIC5vbignZXJyb3InLCBmdW5jdGlvbihlcnI6IEVycm9yKSB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICB9KTtcbn1cblxuIl19