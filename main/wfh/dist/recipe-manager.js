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
exports.clean = exports.linkComponentsAsync = exports.link = exports.eachInstalledRecipe = exports.eachRecipe = exports.eachRecipeSrc = exports.setWorkspaceDirs = exports.setProjectList = void 0;
// tslint:disable:max-line-length
/**
 * To avoid circle referecing, This file should not depends on package-mgr/index !!!
 */
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
// import {getRootDir} from './utils';
let projectList = [];
let workspaceDirs = [];
function setProjectList(list) {
    projectList = list;
}
exports.setProjectList = setProjectList;
function setWorkspaceDirs(list) {
    workspaceDirs = list;
}
exports.setWorkspaceDirs = setWorkspaceDirs;
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
            _.each(recipe2srcDirMapForPrj(prjDir), (srcDir, recipeDir) => {
                let recipeName = null;
                try {
                    recipeName = require(Path.resolve(recipeDir, 'package.json')).name;
                }
                catch (e) {
                    log.debug(`Can't read ${Path.resolve(recipeDir, 'package.json')}`);
                }
                callback(srcDir, recipeDir, recipeName, prjDir);
            });
            const e2eDir = Path.join(prjDir, 'e2etest');
            if (fs.existsSync(e2eDir))
                callback(e2eDir, null, null, prjDir);
        });
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
        const pkjson = require(Path.resolve('package.json')); // <workspace>/package.json
        const deps = Object.assign({}, pkjson.dependencies || {}, pkjson.devDependencies || {});
        if (!deps)
            return;
        const drcpName = require('../../package.json').name;
        _.each(deps, function (ver, depName) {
            if (depName !== drcpName && !srcRecipeSet.has(depName) && _.some(regexList, regex => regex.test(depName))) {
                log.debug('looking for installed recipe: %s', depName);
                let p;
                try {
                    p = Path.resolve('node_modules', depName); // <workspace>/node_modules/<depName>
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
    eachInstalledRecipe(callback);
}
exports.eachRecipe = eachRecipe;
/**
 * eachInstalledRecipe
 * @param callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
*/
function eachInstalledRecipe(callback) {
    eachDownloadedRecipe(callback);
    // const rootDir = getRootDir();
    for (const dir of workspaceDirs)
        callback(dir, true, 'package.json');
}
exports.eachInstalledRecipe = eachInstalledRecipe;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QixnREFBd0I7QUFDeEIsNkNBQStCO0FBQy9CLGdFQUErQztBQUMvQyw4RUFBeUQ7QUFDekQsK0RBQWlEO0FBQ2pELCtDQUF3RDtBQUN4RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDNUUsaUNBQWlDO0FBQ2pDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEMsc0RBQThCO0FBQzlCLHNDQUFzQztBQUV0QyxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUM7QUFDL0IsSUFBSSxhQUFhLEdBQWEsRUFBRSxDQUFDO0FBRWpDLFNBQWdCLGNBQWMsQ0FBQyxJQUFjO0lBQzNDLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFDckIsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBYztJQUM3QyxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLENBQUM7QUFGRCw0Q0FFQztBQWFELFNBQWdCLGFBQWEsQ0FBQyxVQUEwQyxFQUN0RSxRQUFnQztJQUNoQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxTQUFT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Q0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzVDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsVUFBUyxHQUFVO1FBQzlCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bWF4LWxpbmUtbGVuZ3RoXG4vKipcbiAqIFRvIGF2b2lkIGNpcmNsZSByZWZlcmVjaW5nLCBUaGlzIGZpbGUgc2hvdWxkIG5vdCBkZXBlbmRzIG9uIHBhY2thZ2UtbWdyL2luZGV4ICEhIVxuICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGd1bHAgZnJvbSAnZ3VscCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgc2Nhbk5vZGVNb2R1bGVzIGZyb20gJy4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IGZpbmRQYWNrYWdlSnNvbiBmcm9tICcuL3BhY2thZ2UtbWdyL2ZpbmQtcGFja2FnZSc7XG5pbXBvcnQgKiBhcyByd1BhY2thZ2VKc29uIGZyb20gJy4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge2FjdGlvbnMgYXMgY2xlYW5BY3Rpb25zfSBmcm9tICcuL2NtZC9jbGktY2xlYW4nO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd3ZmguJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSkpO1xuLy8gY29uc3QgRmlsZSA9IHJlcXVpcmUoJ3ZpbnlsJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbi8vIGltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBwcm9qZWN0TGlzdDogc3RyaW5nW10gPSBbXTtcbmxldCB3b3Jrc3BhY2VEaXJzOiBzdHJpbmdbXSA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJvamVjdExpc3QobGlzdDogc3RyaW5nW10pIHtcbiAgcHJvamVjdExpc3QgPSBsaXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0V29ya3NwYWNlRGlycyhsaXN0OiBzdHJpbmdbXSkge1xuICB3b3Jrc3BhY2VEaXJzID0gbGlzdDtcbn1cblxuLy8gbGV0IGNsZWFuQWN0aW9uczogQWN0aW9uc1R5cGU7XG4vLyBjbGVhbkFjdGlvbnNQcm9tLnRoZW4oYWN0aW9ucyA9PiBjbGVhbkFjdGlvbnMgPSBhY3Rpb25zKTtcblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZVNyY0NhbGxiYWNrID0gKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZyB8IG51bGwsIHJlY2lwZU5hbWU6IHN0cmluZyB8IG51bGwsIHByb2plY3REaXI6IHN0cmluZykgPT4gdm9pZDtcbi8qKlxuICogSXRlcmF0ZSBzcmMgZm9sZGVyIGZvciBjb21wb25lbnQgaXRlbXNcbiAqIEBwYXJhbSB7c3RyaW5nIHwgc3RyaW5nW119IHByb2plY3REaXIgb3B0aW9uYWwsIGlmIG5vdCBwcmVzZW50IG9yIG51bGwsIGluY2x1ZGVzIGFsbCBwcm9qZWN0IHNyYyBmb2xkZXJzXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZywgY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcgfCBFYWNoUmVjaXBlU3JjQ2FsbGJhY2ssXG4gIGNhbGxiYWNrPzogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZCB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGlmICh0eXBlb2YgcHJvamVjdERpciA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShwcm9qZWN0RGlyKSkge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0RGlyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yUHJvamVjdChwcm9qZWN0TGlzdCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9yUHJvamVjdChwcmpEaXJzOiBzdHJpbmdbXSB8IHN0cmluZykge1xuICAgIChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHByakRpcnMpLmZvckVhY2gocHJqRGlyID0+IHtcbiAgICAgIF8uZWFjaChyZWNpcGUyc3JjRGlyTWFwRm9yUHJqKHByakRpciksIChzcmNEaXIsIHJlY2lwZURpcikgPT4ge1xuICAgICAgICBsZXQgcmVjaXBlTmFtZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVjaXBlTmFtZSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpKS5uYW1lO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLmRlYnVnKGBDYW4ndCByZWFkICR7UGF0aC5yZXNvbHZlKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrIShzcmNEaXIsIHJlY2lwZURpciwgcmVjaXBlTmFtZSwgcHJqRGlyKTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZTJlRGlyID0gUGF0aC5qb2luKHByakRpciwgJ2UyZXRlc3QnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGUyZURpcikpXG4gICAgICAgIGNhbGxiYWNrIShlMmVEaXIsIG51bGwsIG51bGwsIHByakRpcik7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVjaXBlMnNyY0Rpck1hcEZvclByaihwcm9qZWN0RGlyOiBzdHJpbmcpOiB7W3JlY2lwZURpcjogc3RyaW5nXTogc3RyaW5nfSB7XG4gIGNvbnN0IHNyY1JlY2lwZU1hcEZpbGUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpciwgJ2RyLnJlY2lwZXMuanNvbicpO1xuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcmVjaXBlU3JjTWFwcGluZzoge1tyZWNpcGU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgbGV0IG5hbWVTcmNTZXR0aW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gIGxldCBub3JtYWxpemVkUHJqTmFtZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyKS5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKTtcbiAgbm9ybWFsaXplZFByak5hbWUgPSBfLnRyaW0obm9ybWFsaXplZFByak5hbWUsICcuJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpKSB7XG4gICAgY29uc3QgcGtqc29uID0gcmVxdWlyZShwa0pzb25GaWxlKTtcbiAgICBpZiAocGtqc29uLnBhY2thZ2VzKSB7XG4gICAgICAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwa2pzb24ucGFja2FnZXMpLmZvckVhY2goKHBhdCkgPT4ge1xuICAgICAgICBpZiAocGF0LmVuZHNXaXRoKCcvKionKSlcbiAgICAgICAgICBwYXQgPSBwYXQuc2xpY2UoMCwgLTMpO1xuICAgICAgICBlbHNlIGlmIChwYXQuZW5kc1dpdGgoJy8qJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0yKTtcbiAgICAgICAgcGF0ID0gXy50cmltU3RhcnQocGF0LCAnLicpO1xuICAgICAgICBuYW1lU3JjU2V0dGluZ1tjb25maWcucmVzb2x2ZShcbiAgICAgICAgICAnZGVzdERpcicsIGByZWNpcGVzLyR7cGtqc29uLm5hbWV9JHtwYXQubGVuZ3RoID4gMCA/ICcuJyA6ICcnfSR7cGF0LnJlcGxhY2UoL1tcXC9cXFxcXS9nLCAnLicpfS5yZWNpcGVgKV0gPVxuICAgICAgICAgICAgUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHBhdCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuYW1lU3JjU2V0dGluZztcbiAgICB9XG4gIH1cbiAgaWYgKGZzLmV4aXN0c1N5bmMoc3JjUmVjaXBlTWFwRmlsZSkpIHtcbiAgICAvLyBsZWdhY3k6IHJlYWQgZHIucmVjaXBlcy5qc29uXG4gICAgbmFtZVNyY1NldHRpbmcgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhzcmNSZWNpcGVNYXBGaWxlLCAndXRmOCcpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGZzLmV4aXN0c1N5bmMocGtKc29uRmlsZSkgPyByZXF1aXJlKHBrSnNvbkZpbGUpLm5hbWUgOiBQYXRoLmJhc2VuYW1lKHByb2plY3REaXIpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihwcm9qZWN0RGlyLCAnc3JjJykpKSB7XG4gICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJ3NyYyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlc3RTcmNEaXIgPSBQYXRoLmpvaW4ocHJvamVjdERpciwgJ2FwcCcpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFNyY0RpcikgJiYgZnMuc3RhdFN5bmModGVzdFNyY0RpcikuaXNEaXJlY3RvcnkoKSlcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdhcHAnO1xuICAgICAgZWxzZVxuICAgICAgICBuYW1lU3JjU2V0dGluZ1sncmVjaXBlcy8nICsgcHJvamVjdE5hbWVdID0gJy4nO1xuICAgIH1cbiAgfVxuICBfLmVhY2gobmFtZVNyY1NldHRpbmcsIChzcmNEaXIsIHJlY2lwZURpcikgPT4ge1xuICAgIGxldCBzcmNEaXJzOiBzdHJpbmdbXTtcbiAgICBpZiAoIV8uZW5kc1dpdGgocmVjaXBlRGlyLCAnLXJlY2lwZScpKVxuICAgICAgcmVjaXBlRGlyICs9ICctcmVjaXBlJztcbiAgICBzcmNEaXJzID0gQXJyYXkuaXNBcnJheShzcmNEaXIpID8gc3JjRGlyIDogW3NyY0Rpcl07XG4gICAgY29uc3QgYWJzUmVjaXBlRGlyID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCByZWNpcGVEaXIpO1xuICAgIHNyY0RpcnMuZm9yRWFjaChzcmNEaXIgPT4gcmVjaXBlU3JjTWFwcGluZ1thYnNSZWNpcGVEaXJdID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsIHNyY0RpcikpO1xuICB9KTtcbiAgcmV0dXJuIHJlY2lwZVNyY01hcHBpbmc7XG59XG5leHBvcnQgdHlwZSBFYWNoUmVjaXBlQ2FsbGJhY2sgPSAocmVjaXBlRGlyOiBzdHJpbmcsIGlzRnJvbUluc3RhbGxhdGlvbjogYm9vbGVhbiwganNvbkZpbGVOYW1lOiBzdHJpbmcpID0+IHZvaWQ7XG5cbmZ1bmN0aW9uIGVhY2hEb3dubG9hZGVkUmVjaXBlKGNhbGxiYWNrOiBFYWNoUmVjaXBlQ2FsbGJhY2ssIGV4Y2x1ZGVSZWNpcGVTZXQ/OiBTZXQ8c3RyaW5nPikge1xuICBsZXQgc3JjUmVjaXBlU2V0OiBTZXQ8c3RyaW5nPjtcbiAgaWYgKGV4Y2x1ZGVSZWNpcGVTZXQpIHtcbiAgICBzcmNSZWNpcGVTZXQgPSBleGNsdWRlUmVjaXBlU2V0O1xuICB9IGVsc2Uge1xuICAgIHNyY1JlY2lwZVNldCA9IG5ldyBTZXQoKTtcbiAgICBlYWNoUmVjaXBlU3JjKCh4LCB5LCByZWNpcGVOYW1lKSA9PiB7XG4gICAgICBpZiAocmVjaXBlTmFtZSkgc3JjUmVjaXBlU2V0LmFkZChyZWNpcGVOYW1lKTtcbiAgICB9KTtcbiAgfVxuICBpZiAoY29uZmlnKCkuaW5zdGFsbGVkUmVjaXBlcykge1xuICAgIGNvbnN0IHJlZ2V4TGlzdCA9IChjb25maWcoKS5pbnN0YWxsZWRSZWNpcGVzIGFzIHN0cmluZ1tdKS5tYXAocyA9PiBuZXcgUmVnRXhwKHMpKTtcbiAgICBjb25zdCBwa2pzb24gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpOyAvLyA8d29ya3NwYWNlPi9wYWNrYWdlLmpzb25cbiAgICBjb25zdCBkZXBzID0gT2JqZWN0LmFzc2lnbih7fSwgcGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSwgcGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4gICAgaWYgKCFkZXBzKVxuICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IGRyY3BOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcbiAgICBfLmVhY2goZGVwcywgZnVuY3Rpb24odmVyLCBkZXBOYW1lKSB7XG4gICAgICBpZiAoZGVwTmFtZSAhPT0gZHJjcE5hbWUgJiYgIXNyY1JlY2lwZVNldC5oYXMoZGVwTmFtZSkgJiYgXy5zb21lKHJlZ2V4TGlzdCwgcmVnZXggPT4gcmVnZXgudGVzdChkZXBOYW1lKSkpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdsb29raW5nIGZvciBpbnN0YWxsZWQgcmVjaXBlOiAlcycsIGRlcE5hbWUpO1xuICAgICAgICBsZXQgcDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwID0gUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMnLCBkZXBOYW1lKTsgLy8gPHdvcmtzcGFjZT4vbm9kZV9tb2R1bGVzLzxkZXBOYW1lPlxuICAgICAgICAgIGNhbGxiYWNrKHAsIHRydWUsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKGAke2RlcE5hbWV9IHNlZW1zIHRvIGJlIG5vdCBpbnN0YWxsZWRgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgZWFjaFJlY2lwZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uKHJlY2lwZURpciwgaXNGcm9tSW5zdGFsbGF0aW9uLCBqc29uRmlsZU5hbWUgPSAncGFja2FnZS5qc29uJyk6IHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaykge1xuICAvLyBjb25zdCBzcmNSZWNpcGVTZXQgPSBuZXcgU2V0KCk7XG4gIGVhY2hSZWNpcGVTcmMoKHNyY0RpciwgcmVjaXBlRGlyLCByZWNpcGVOYW1lKSA9PiB7XG4gICAgLy8gc3JjUmVjaXBlU2V0LmFkZChyZWNpcGVOYW1lKTtcbiAgICBpZiAocmVjaXBlRGlyKVxuICAgICAgY2FsbGJhY2socmVjaXBlRGlyLCBmYWxzZSwgJ3BhY2thZ2UuanNvbicpO1xuICB9KTtcbiAgZWFjaEluc3RhbGxlZFJlY2lwZShjYWxsYmFjayk7XG59XG5cbi8qKlxuICogZWFjaEluc3RhbGxlZFJlY2lwZVxuICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uKHJlY2lwZURpciwgaXNGcm9tSW5zdGFsbGF0aW9uLCBqc29uRmlsZU5hbWUgPSAncGFja2FnZS5qc29uJyk6IHZvaWRcbiovXG5leHBvcnQgZnVuY3Rpb24gZWFjaEluc3RhbGxlZFJlY2lwZShjYWxsYmFjazogRWFjaFJlY2lwZUNhbGxiYWNrKSB7XG4gIGVhY2hEb3dubG9hZGVkUmVjaXBlKGNhbGxiYWNrKTtcbiAgLy8gY29uc3Qgcm9vdERpciA9IGdldFJvb3REaXIoKTtcbiAgZm9yIChjb25zdCBkaXIgb2Ygd29ya3NwYWNlRGlycylcbiAgICBjYWxsYmFjayhkaXIsIHRydWUsICdwYWNrYWdlLmpzb24nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmsob25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcsIHByb2o6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuICBlYWNoUmVjaXBlU3JjKGZ1bmN0aW9uKHNyYywgcmVjaXBlRGlyLCByZWNpcGVOYW1lLCBwcm9qKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBsb2cuZGVidWcoJ1tyZWNpcGVNYW5hZ2VyXWxpbmsgcmVjaXBlJywgcmVjaXBlRGlyKTtcbiAgICBzdHJlYW1zLnB1c2gobGlua1RvUmVjaXBlRmlsZShzcmMsIHJlY2lwZURpciEsIChmaWxlLCByZWNpcGVEaXIpID0+IG9uUGtKc29uRmlsZShmaWxlLCByZWNpcGVEaXIsIHByb2opKSk7XG4gIH0pO1xuICByZXR1cm4gbWVyZ2Uoc3RyZWFtcylcbiAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZTogYW55LCBlbmM6IHN0cmluZywgbmV4dDogKCkgPT4gdm9pZCkge1xuICAgIGlmIChfLmlzQXJyYXkoZmlsZSkpIHtcbiAgICAgIGNsZWFuQWN0aW9ucy5hZGRXb3Jrc3BhY2VGaWxlKGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoJ291dDogJyArIGZpbGUucGF0aCk7XG4gICAgICB0aGlzLnB1c2goZmlsZSk7XG4gICAgfVxuICAgIG5leHQoKTtcbiAgfSwgZnVuY3Rpb24gZmx1c2gobmV4dDogKCkgPT4gdm9pZCkge1xuICAgIG5leHQoKTtcbiAgfSkpXG4gIC5waXBlKGd1bHAuZGVzdChjb25maWcoKS5yb290UGF0aCkpXG4gIC5vbignZXJyb3InLCBmdW5jdGlvbihlcnI6IEVycm9yKSB7XG4gICAgbG9nLmVycm9yKGVycik7XG4gIH0pO1xufVxuXG4vKipcbiAqIEByZXR1cm4gYXJyYXkgb2YgbGlua2VkIHBhY2thZ2UncyBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW5rQ29tcG9uZW50c0FzeW5jKGNiOiAocHJqOiBzdHJpbmcsIHBrZ0pzb25GaWxlOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcGtKc29uRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxpbmsoKGZpbGUsIHJlY2lwZURpciwgcHJvaikgPT4ge1xuICAgICAgLy8gcGtKc29uRmlsZXMucHVzaChmaWxlKTtcbiAgICAgIGNiKHByb2osIGZpbGUpO1xuICAgIH0pXG4gICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKCkpXG4gICAgLm9uKCdlcnJvcicsIHJlamVjdClcbiAgICAucmVzdW1lKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW4oKSB7XG4gIC8vIGF3YWl0IGNvbmZpZy5kb25lO1xuICBhd2FpdCBzY2FuTm9kZU1vZHVsZXMoJ2FsbCcpO1xuICAvLyBjb25zdCByZWNpcGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIGVhY2hSZWNpcGVTcmMoZnVuY3Rpb24oc3JjOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG4gIC8vICAgaWYgKHJlY2lwZURpcilcbiAgLy8gICAgIHJlY2lwZXMucHVzaChQYXRoLmpvaW4ocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpO1xuICAvLyB9KTtcbiAgLy8gcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCBqKSA9PiB7XG4gIC8vICAgZ3VscC5zcmMocmVjaXBlcywge2Jhc2U6IGNvbmZpZygpLnJvb3RQYXRofSlcbiAgLy8gICAucGlwZShyd1BhY2thZ2VKc29uLnJlbW92ZURlcGVuZGVuY3koKSlcbiAgLy8gICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuYzogc3RyaW5nLCBuZXh0OiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcbiAgLy8gICAgIGxvZy5kZWJ1Zygnb3V0OiAnICsgZmlsZS5wYXRoKTtcbiAgLy8gICAgIG5leHQobnVsbCwgZmlsZSk7XG4gIC8vICAgfSkpXG4gIC8vICAgLnBpcGUoZ3VscC5kZXN0KGNvbmZpZygpLnJvb3RQYXRoKSlcbiAgLy8gICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcbiAgLy8gICAub24oJ2Vycm9yJywgaik7XG4gIC8vIH0pO1xufVxuXG5mdW5jdGlvbiBsaW5rVG9SZWNpcGVGaWxlKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZyxcbiAgb25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgcmV0dXJuIGd1bHAuc3JjKCcuJylcbiAgICAucGlwZShmaW5kUGFja2FnZUpzb24oc3JjRGlyLCB0cnVlKSlcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuYzogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgbG9nLmRlYnVnKCdGb3VuZCByZWNpcGVEaXIgJXM6IGZpbGU6ICVzJywgcmVjaXBlRGlyLCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKG9uUGtKc29uRmlsZSlcbiAgICAgICAgb25Qa0pzb25GaWxlKGZpbGUucGF0aCwgcmVjaXBlRGlyKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLy8gLnBpcGUocndQYWNrYWdlSnNvbi5zeW1ib2xpY0xpbmtQYWNrYWdlcyhjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdsaW5rcycpKSlcbiAgICAucGlwZShyd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKGNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcpKSlcbiAgICAucGlwZShyd1BhY2thZ2VKc29uLmFkZERlcGVuZGVuY3kocmVjaXBlRGlyKSlcbiAgICAub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyOiBFcnJvcikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfSk7XG59XG5cbiJdfQ==