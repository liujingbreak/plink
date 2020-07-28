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
const File = require('vinyl');
const through = require('through2');
const merge = require('merge2');
const config_1 = __importDefault(require("./config"));
// import {getInstance} from './package-json-guarder';
// const packageJsonGuarder = getInstance(config().rootPath);
let linkListFile;
config_1.default.done.then(() => {
    linkListFile = config_1.default.resolve('destDir', 'link-list.json');
});
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
            _.each(recipe2srcDirMapForPrj(prjDir), onEachSrcRecipePair);
            const e2eDir = Path.join(prjDir, 'e2etest');
            if (fs.existsSync(e2eDir))
                callback(e2eDir, null, null);
        });
    }
    function onEachSrcRecipePair(srcDir, recipeDir) {
        let recipeName = null;
        try {
            recipeName = require(Path.resolve(recipeDir, 'package.json')).name;
        }
        catch (e) {
            log.debug(`Can't read ${Path.resolve(recipeDir, 'package.json')}`);
        }
        callback(srcDir, recipeDir, recipeName);
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
    let linkFiles = fs.existsSync(linkListFile) ? JSON.parse(fs.readFileSync(linkListFile, 'utf8')) : [];
    eachRecipeSrc(function (src, recipeDir) {
        // tslint:disable-next-line:no-console
        log.debug('[recipeManager]link recipe', recipeDir);
        streams.push(linkToRecipeFile(src, recipeDir, onPkJsonFile));
    });
    return merge(streams)
        .pipe(through.obj(function (file, enc, next) {
        if (_.isArray(file)) {
            linkFiles.push(...file);
            cli_clean_1.actions.addWorkspaceFile(file);
        }
        else {
            log.debug('out: ' + file.path);
            this.push(file);
        }
        next();
    }, function flush(next) {
        linkFiles = _.uniq(linkFiles);
        const linkFileTrack = new File({
            base: Path.resolve(config_1.default().rootPath),
            path: Path.relative(config_1.default().rootPath, linkListFile),
            contents: new Buffer(JSON.stringify(linkFiles, null, ' '))
        });
        this.push(linkFileTrack);
        log.debug('out: ' + linkFileTrack.path);
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
function linkComponentsAsync() {
    const pkJsonFiles = [];
    return new Promise((resolve, reject) => {
        link(file => pkJsonFiles.push(file))
            .on('end', () => resolve(pkJsonFiles))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUNBQWlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRWpDLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLDZDQUErQjtBQUMvQixnRUFBK0M7QUFDL0MsOEVBQXlEO0FBQ3pELCtEQUFpRDtBQUNqRCwrQ0FBd0Q7QUFDeEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLHNEQUE4QjtBQUc5QixzREFBc0Q7QUFDdEQsNkRBQTZEO0FBRTdELElBQUksWUFBb0IsQ0FBQztBQUV6QixnQkFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ3BCLFlBQVksR0FBRyxnQkFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztBQUMvQixTQUFnQixjQUFjLENBQUMsSUFBYztJQUMzQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQ3JCLENBQUM7QUFGRCx3Q0FFQztBQWFELFNBQWdCLGFBQWEsQ0FBQyxVQUEwQyxFQUN0RSxRQUF3RjtJQUN4RixJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLFFBQVEs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QUEyRDtJQUN0SCxPQUFPLGNBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1NBQ2pCLElBQUksQ0FBQyxzQkFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQVMsRUFBRSxHQUFXLEVBQUUsSUFBNkI7UUFDOUUsR0FBRyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hFLElBQUksWUFBWTtZQUNkLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFDSCxnRkFBZ0Y7U0FDL0UsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1NBQ3BFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzVDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsVUFBUyxHQUFVO1FBQzlCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bWF4LWxpbmUtbGVuZ3RoXG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ3VscCBmcm9tICdndWxwJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBzY2FuTm9kZU1vZHVsZXMgZnJvbSAnLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgZmluZFBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS1tZ3IvZmluZC1wYWNrYWdlJztcbmltcG9ydCAqIGFzIHJ3UGFja2FnZUpzb24gZnJvbSAnLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7YWN0aW9ucyBhcyBjbGVhbkFjdGlvbnN9IGZyb20gJy4vY21kL2NsaS1jbGVhbic7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3dmaC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lKSk7XG5jb25zdCBGaWxlID0gcmVxdWlyZSgndmlueWwnKTtcbmNvbnN0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuY29uc3QgbWVyZ2UgPSByZXF1aXJlKCdtZXJnZTInKTtcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuXG5cbi8vIGltcG9ydCB7Z2V0SW5zdGFuY2V9IGZyb20gJy4vcGFja2FnZS1qc29uLWd1YXJkZXInO1xuLy8gY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0SW5zdGFuY2UoY29uZmlnKCkucm9vdFBhdGgpO1xuXG5sZXQgbGlua0xpc3RGaWxlOiBzdHJpbmc7XG5cbmNvbmZpZy5kb25lLnRoZW4oKCkgPT4ge1xuICBsaW5rTGlzdEZpbGUgPSBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdsaW5rLWxpc3QuanNvbicpO1xufSk7XG5cbmxldCBwcm9qZWN0TGlzdDogc3RyaW5nW10gPSBbXTtcbmV4cG9ydCBmdW5jdGlvbiBzZXRQcm9qZWN0TGlzdChsaXN0OiBzdHJpbmdbXSkge1xuICBwcm9qZWN0TGlzdCA9IGxpc3Q7XG59XG5cbi8vIGxldCBjbGVhbkFjdGlvbnM6IEFjdGlvbnNUeXBlO1xuLy8gY2xlYW5BY3Rpb25zUHJvbS50aGVuKGFjdGlvbnMgPT4gY2xlYW5BY3Rpb25zID0gYWN0aW9ucyk7XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVTcmNDYWxsYmFjayA9IChzcmNEaXI6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcsIHJlY2lwZU5hbWU6IHN0cmluZykgPT4gdm9pZDtcbi8qKlxuICogSXRlcmF0ZSBzcmMgZm9sZGVyIGZvciBjb21wb25lbnQgaXRlbXNcbiAqIEBwYXJhbSB7c3RyaW5nIHwgc3RyaW5nW119IHByb2plY3REaXIgb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IG9yIG51bGwsIGluY2x1ZGVzIGFsbCBwcm9qZWN0IHNyYyBmb2xkZXJzXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZywgY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcgfCBFYWNoUmVjaXBlU3JjQ2FsbGJhY2ssXG4gIGNhbGxiYWNrPzogKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZyB8IG51bGwsIHJlY2lwZU5hbWU6IHN0cmluZyB8IG51bGwpID0+IHZvaWQpOiB2b2lkIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjYWxsYmFjayA9IGFyZ3VtZW50c1swXTtcbiAgICBmb3JQcm9qZWN0KHByb2plY3RMaXN0KTtcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgaWYgKHR5cGVvZiBwcm9qZWN0RGlyID09PSAnc3RyaW5nJyB8fCBBcnJheS5pc0FycmF5KHByb2plY3REaXIpKSB7XG4gICAgICBmb3JQcm9qZWN0KHByb2plY3REaXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3JQcm9qZWN0KHByb2plY3RMaXN0KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBmb3JQcm9qZWN0KHByakRpcnM6IHN0cmluZ1tdIHwgc3RyaW5nKSB7XG4gICAgKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocHJqRGlycykuZm9yRWFjaChwcmpEaXIgPT4ge1xuICAgICAgXy5lYWNoKHJlY2lwZTJzcmNEaXJNYXBGb3JQcmoocHJqRGlyKSwgb25FYWNoU3JjUmVjaXBlUGFpcik7XG4gICAgICBjb25zdCBlMmVEaXIgPSBQYXRoLmpvaW4ocHJqRGlyLCAnZTJldGVzdCcpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZTJlRGlyKSlcbiAgICAgICAgY2FsbGJhY2shKGUyZURpciwgbnVsbCwgbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkVhY2hTcmNSZWNpcGVQYWlyKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZykge1xuICAgIGxldCByZWNpcGVOYW1lOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgcmVjaXBlTmFtZSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpKS5uYW1lO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZy5kZWJ1ZyhgQ2FuJ3QgcmVhZCAke1BhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKX1gKTtcbiAgICB9XG4gICAgY2FsbGJhY2shKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWNpcGUyc3JjRGlyTWFwRm9yUHJqKHByb2plY3REaXI6IHN0cmluZyk6IHtbcmVjaXBlRGlyOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3Qgc3JjUmVjaXBlTWFwRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAnZHIucmVjaXBlcy5qc29uJyk7XG4gIGNvbnN0IHBrSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCByZWNpcGVTcmNNYXBwaW5nOiB7W3JlY2lwZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBsZXQgbmFtZVNyY1NldHRpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgbGV0IG5vcm1hbGl6ZWRQcmpOYW1lID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIpLnJlcGxhY2UoL1tcXC9cXFxcXS9nLCAnLicpO1xuICBub3JtYWxpemVkUHJqTmFtZSA9IF8udHJpbShub3JtYWxpemVkUHJqTmFtZSwgJy4nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkpIHtcbiAgICBjb25zdCBwa2pzb24gPSByZXF1aXJlKHBrSnNvbkZpbGUpO1xuICAgIGlmIChwa2pzb24ucGFja2FnZXMpIHtcbiAgICAgIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBranNvbi5wYWNrYWdlcykuZm9yRWFjaCgocGF0KSA9PiB7XG4gICAgICAgIGlmIChwYXQuZW5kc1dpdGgoJy8qKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMyk7XG4gICAgICAgIGVsc2UgaWYgKHBhdC5lbmRzV2l0aCgnLyonKSlcbiAgICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTIpO1xuICAgICAgICBwYXQgPSBfLnRyaW1TdGFydChwYXQsICcuJyk7XG4gICAgICAgIG5hbWVTcmNTZXR0aW5nW2NvbmZpZy5yZXNvbHZlKFxuICAgICAgICAgICdkZXN0RGlyJywgYHJlY2lwZXMvJHtwa2pzb24ubmFtZX0ke3BhdC5sZW5ndGggPiAwID8gJy4nIDogJyd9JHtwYXQucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyl9LnJlY2lwZWApXSA9XG4gICAgICAgICAgICBQYXRoLnJlc29sdmUocHJvamVjdERpciwgcGF0KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5hbWVTcmNTZXR0aW5nO1xuICAgIH1cbiAgfVxuICBpZiAoZnMuZXhpc3RzU3luYyhzcmNSZWNpcGVNYXBGaWxlKSkge1xuICAgIC8vIGxlZ2FjeTogcmVhZCBkci5yZWNpcGVzLmpzb25cbiAgICBuYW1lU3JjU2V0dGluZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHNyY1JlY2lwZU1hcEZpbGUsICd1dGY4JykpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHByb2plY3ROYW1lID0gZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSA/IHJlcXVpcmUocGtKc29uRmlsZSkubmFtZSA6IFBhdGguYmFzZW5hbWUocHJvamVjdERpcik7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKHByb2plY3REaXIsICdzcmMnKSkpIHtcbiAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnc3JjJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVzdFNyY0RpciA9IFBhdGguam9pbihwcm9qZWN0RGlyLCAnYXBwJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0U3JjRGlyKSAmJiBmcy5zdGF0U3luYyh0ZXN0U3JjRGlyKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ2FwcCc7XG4gICAgICBlbHNlXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnLic7XG4gICAgfVxuICB9XG4gIF8uZWFjaChuYW1lU3JjU2V0dGluZywgKHNyY0RpciwgcmVjaXBlRGlyKSA9PiB7XG4gICAgbGV0IHNyY0RpcnM6IHN0cmluZ1tdO1xuICAgIGlmICghXy5lbmRzV2l0aChyZWNpcGVEaXIsICctcmVjaXBlJykpXG4gICAgICByZWNpcGVEaXIgKz0gJy1yZWNpcGUnO1xuICAgIHNyY0RpcnMgPSBBcnJheS5pc0FycmF5KHNyY0RpcikgPyBzcmNEaXIgOiBbc3JjRGlyXTtcbiAgICBjb25zdCBhYnNSZWNpcGVEaXIgPSBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsIHJlY2lwZURpcik7XG4gICAgc3JjRGlycy5mb3JFYWNoKHNyY0RpciA9PiByZWNpcGVTcmNNYXBwaW5nW2Fic1JlY2lwZURpcl0gPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgc3JjRGlyKSk7XG4gIH0pO1xuICByZXR1cm4gcmVjaXBlU3JjTWFwcGluZztcbn1cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVDYWxsYmFjayA9IChyZWNpcGVEaXI6IHN0cmluZywgaXNGcm9tSW5zdGFsbGF0aW9uOiBib29sZWFuLCBqc29uRmlsZU5hbWU6IHN0cmluZykgPT4gdm9pZDtcblxuZnVuY3Rpb24gZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaywgZXhjbHVkZVJlY2lwZVNldD86IFNldDxzdHJpbmc+KSB7XG4gIGxldCBzcmNSZWNpcGVTZXQ6IFNldDxzdHJpbmc+O1xuICBpZiAoZXhjbHVkZVJlY2lwZVNldCkge1xuICAgIHNyY1JlY2lwZVNldCA9IGV4Y2x1ZGVSZWNpcGVTZXQ7XG4gIH0gZWxzZSB7XG4gICAgc3JjUmVjaXBlU2V0ID0gbmV3IFNldCgpO1xuICAgIGVhY2hSZWNpcGVTcmMoKHgsIHksIHJlY2lwZU5hbWUpID0+IHtcbiAgICAgIGlmIChyZWNpcGVOYW1lKSBzcmNSZWNpcGVTZXQuYWRkKHJlY2lwZU5hbWUpO1xuICAgIH0pO1xuICB9XG4gIGlmIChjb25maWcoKS5pbnN0YWxsZWRSZWNpcGVzKSB7XG4gICAgY29uc3QgcmVnZXhMaXN0ID0gKGNvbmZpZygpLmluc3RhbGxlZFJlY2lwZXMgYXMgc3RyaW5nW10pLm1hcChzID0+IG5ldyBSZWdFeHAocykpO1xuICAgIGNvbnN0IHBranNvbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAncGFja2FnZS5qc29uJykpO1xuICAgIGNvbnN0IGRlcHMgPSBPYmplY3QuYXNzaWduKHt9LCBwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9LCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICBpZiAoIWRlcHMpXG4gICAgICByZXR1cm47XG4gICAgY29uc3QgZHJjcE5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuICAgIF8uZWFjaChkZXBzLCBmdW5jdGlvbih2ZXIsIGRlcE5hbWUpIHtcbiAgICAgIGlmIChkZXBOYW1lICE9PSBkcmNwTmFtZSAmJiAhc3JjUmVjaXBlU2V0LmhhcyhkZXBOYW1lKSAmJiBfLnNvbWUocmVnZXhMaXN0LCByZWdleCA9PiByZWdleC50ZXN0KGRlcE5hbWUpKSkge1xuICAgICAgICBsb2cuZGVidWcoJ2xvb2tpbmcgZm9yIGluc3RhbGxlZCByZWNpcGU6ICVzJywgZGVwTmFtZSk7XG4gICAgICAgIGxldCBwO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHAgPSBQYXRoLnJlc29sdmUoY29uZmlnKCkubm9kZVBhdGgsIGRlcE5hbWUpO1xuICAgICAgICAgIGNhbGxiYWNrKHAsIHRydWUsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKGAke2RlcE5hbWV9IHNlZW1zIHRvIGJlIG5vdCBpbnN0YWxsZWRgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgZWFjaFJlY2lwZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uKHJlY2lwZURpciwgaXNGcm9tSW5zdGFsbGF0aW9uLCBqc29uRmlsZU5hbWUgPSAncGFja2FnZS5qc29uJyk6IHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaykge1xuICAvLyBjb25zdCBzcmNSZWNpcGVTZXQgPSBuZXcgU2V0KCk7XG4gIGVhY2hSZWNpcGVTcmMoKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKSA9PiB7XG4gICAgLy8gc3JjUmVjaXBlU2V0LmFkZChyZWNpcGVOYW1lKTtcbiAgICBpZiAocmVjaXBlRGlyKVxuICAgICAgY2FsbGJhY2socmVjaXBlRGlyLCBmYWxzZSwgJ3BhY2thZ2UuanNvbicpO1xuICB9KTtcbiAgZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2spO1xuICAvLyBlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBlYWNoSW5zdGFsbGVkUmVjaXBlXG4gKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24ocmVjaXBlRGlyLCBpc0Zyb21JbnN0YWxsYXRpb24sIGpzb25GaWxlTmFtZSA9ICdwYWNrYWdlLmpzb24nKTogdm9pZFxuKi9cbi8vIGV4cG9ydCBmdW5jdGlvbiBlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrOiBFYWNoUmVjaXBlQ2FsbGJhY2spIHtcbi8vICAgZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2spO1xuLy8gICBjYWxsYmFjayhjb25maWcoKS5yb290UGF0aCwgdHJ1ZSwgUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcGFja2FnZUpzb25HdWFyZGVyLmdldEpzb25GaWxlKCkpKTtcbi8vIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmsob25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcbiAgbGV0IGxpbmtGaWxlcyA9IGZzLmV4aXN0c1N5bmMobGlua0xpc3RGaWxlKSA/IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxpbmtMaXN0RmlsZSwgJ3V0ZjgnKSkgOiBbXTtcbiAgZWFjaFJlY2lwZVNyYyhmdW5jdGlvbihzcmMsIHJlY2lwZURpcikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgbG9nLmRlYnVnKCdbcmVjaXBlTWFuYWdlcl1saW5rIHJlY2lwZScsIHJlY2lwZURpcik7XG4gICAgc3RyZWFtcy5wdXNoKGxpbmtUb1JlY2lwZUZpbGUoc3JjLCByZWNpcGVEaXIsIG9uUGtKc29uRmlsZSkpO1xuICB9KTtcbiAgcmV0dXJuIG1lcmdlKHN0cmVhbXMpXG4gIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICgpID0+IHZvaWQpIHtcbiAgICBpZiAoXy5pc0FycmF5KGZpbGUpKSB7XG4gICAgICBsaW5rRmlsZXMucHVzaCguLi5maWxlKTtcbiAgICAgIGNsZWFuQWN0aW9ucy5hZGRXb3Jrc3BhY2VGaWxlKGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoJ291dDogJyArIGZpbGUucGF0aCk7XG4gICAgICB0aGlzLnB1c2goZmlsZSk7XG4gICAgfVxuICAgIG5leHQoKTtcbiAgfSwgZnVuY3Rpb24gZmx1c2gobmV4dDogKCkgPT4gdm9pZCkge1xuICAgIGxpbmtGaWxlcyA9IF8udW5pcShsaW5rRmlsZXMpO1xuICAgIGNvbnN0IGxpbmtGaWxlVHJhY2sgPSBuZXcgRmlsZSh7XG4gICAgICBiYXNlOiBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgpLFxuICAgICAgcGF0aDogUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgbGlua0xpc3RGaWxlKSxcbiAgICAgIGNvbnRlbnRzOiBuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KGxpbmtGaWxlcywgbnVsbCwgJyAnKSlcbiAgICB9KTtcbiAgICB0aGlzLnB1c2gobGlua0ZpbGVUcmFjayk7XG4gICAgbG9nLmRlYnVnKCdvdXQ6ICcgKyBsaW5rRmlsZVRyYWNrLnBhdGgpO1xuICAgIG5leHQoKTtcbiAgfSkpXG4gIC5waXBlKGd1bHAuZGVzdChjb25maWcoKS5yb290UGF0aCkpXG4gIC5vbignZXJyb3InLCBmdW5jdGlvbihlcnI6IEVycm9yKSB7XG4gICAgbG9nLmVycm9yKGVycik7XG4gIH0pO1xufVxuXG4vKipcbiAqIEByZXR1cm4gYXJyYXkgb2YgbGlua2VkIHBhY2thZ2UncyBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW5rQ29tcG9uZW50c0FzeW5jKCkge1xuICBjb25zdCBwa0pzb25GaWxlczogc3RyaW5nW10gPSBbXTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZ1tdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGluayhmaWxlID0+IHBrSnNvbkZpbGVzLnB1c2goZmlsZSkpXG4gICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKHBrSnNvbkZpbGVzKSlcbiAgICAub24oJ2Vycm9yJywgcmVqZWN0KVxuICAgIC5yZXN1bWUoKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbigpIHtcbiAgLy8gYXdhaXQgY29uZmlnLmRvbmU7XG4gIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG4gIC8vIGNvbnN0IHJlY2lwZXM6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gZWFjaFJlY2lwZVNyYyhmdW5jdGlvbihzcmM6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpIHtcbiAgLy8gICBpZiAocmVjaXBlRGlyKVxuICAvLyAgICAgcmVjaXBlcy5wdXNoKFBhdGguam9pbihyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSk7XG4gIC8vIH0pO1xuICAvLyByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIGopID0+IHtcbiAgLy8gICBndWxwLnNyYyhyZWNpcGVzLCB7YmFzZTogY29uZmlnKCkucm9vdFBhdGh9KVxuICAvLyAgIC5waXBlKHJ3UGFja2FnZUpzb24ucmVtb3ZlRGVwZW5kZW5jeSgpKVxuICAvLyAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkge1xuICAvLyAgICAgbG9nLmRlYnVnKCdvdXQ6ICcgKyBmaWxlLnBhdGgpO1xuICAvLyAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgLy8gICB9KSlcbiAgLy8gICAucGlwZShndWxwLmRlc3QoY29uZmlnKCkucm9vdFBhdGgpKVxuICAvLyAgIC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZSgpKVxuICAvLyAgIC5vbignZXJyb3InLCBqKTtcbiAgLy8gfSk7XG59XG5cbmZ1bmN0aW9uIGxpbmtUb1JlY2lwZUZpbGUoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLCBvblBrSnNvbkZpbGU6IChmaWxlUGF0aDogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZykgPT4gdm9pZCkge1xuICByZXR1cm4gZ3VscC5zcmMoJy4nKVxuICAgIC5waXBlKGZpbmRQYWNrYWdlSnNvbihzcmNEaXIsIHRydWUpKVxuICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgICBsb2cuZGVidWcoJ0ZvdW5kIHJlY2lwZURpciAlczogZmlsZTogJXMnLCByZWNpcGVEaXIsIGZpbGUucGF0aCk7XG4gICAgICBpZiAob25Qa0pzb25GaWxlKVxuICAgICAgICBvblBrSnNvbkZpbGUoZmlsZS5wYXRoLCByZWNpcGVEaXIpO1xuICAgICAgbmV4dChudWxsLCBmaWxlKTtcbiAgICB9KSlcbiAgICAvLyAucGlwZShyd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2xpbmtzJykpKVxuICAgIC5waXBlKHJ3UGFja2FnZUpzb24uc3ltYm9saWNMaW5rUGFja2FnZXMoY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJykpKVxuICAgIC5waXBlKHJ3UGFja2FnZUpzb24uYWRkRGVwZW5kZW5jeShyZWNpcGVEaXIpKVxuICAgIC5vbignZXJyb3InLCBmdW5jdGlvbihlcnI6IEVycm9yKSB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICB9KTtcbn1cblxuIl19