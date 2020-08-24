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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDOztHQUVHO0FBQ0gsMENBQTRCO0FBQzVCLDJDQUE2QjtBQUM3QixnREFBd0I7QUFDeEIsNkNBQStCO0FBQy9CLGdFQUErQztBQUMvQyw4RUFBeUQ7QUFDekQsK0RBQWlEO0FBQ2pELCtDQUF3RDtBQUN4RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDNUUsaUNBQWlDO0FBQ2pDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEMsc0RBQThCO0FBQzlCLHNDQUFzQztBQUV0QyxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUM7QUFDL0IsSUFBSSxhQUFhLEdBQWEsRUFBRSxDQUFDO0FBRWpDLFNBQWdCLGNBQWMsQ0FBQyxJQUFjO0lBQzNDLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFDckIsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBYztJQUM3QyxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLENBQUM7QUFGRCw0Q0FFQztBQWFELFNBQWdCLGFBQWEsQ0FBQyxVQUEwQyxFQUN0RSxRQUFnQztJQUNoQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxTQUFT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QztTQUNwRSxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM1QyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVMsR0FBVTtRQUM5QixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm1heC1saW5lLWxlbmd0aFxuLyoqXG4gKiBUbyBhdm9pZCBjaXJjbGUgcmVmZXJlY2luZywgVGhpcyBmaWxlIHNob3VsZCBub3QgZGVwZW5kcyBvbiBwYWNrYWdlLW1nci9pbmRleCAhISFcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBndWxwIGZyb20gJ2d1bHAnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHNjYW5Ob2RlTW9kdWxlcyBmcm9tICcuL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCBmaW5kUGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLW1nci9maW5kLXBhY2thZ2UnO1xuaW1wb3J0ICogYXMgcndQYWNrYWdlSnNvbiBmcm9tICcuL3J3UGFja2FnZUpzb24nO1xuaW1wb3J0IHthY3Rpb25zIGFzIGNsZWFuQWN0aW9uc30gZnJvbSAnLi9jbWQvY2xpLWNsZWFuJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignd2ZoLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUpKTtcbi8vIGNvbnN0IEZpbGUgPSByZXF1aXJlKCd2aW55bCcpO1xuY29uc3QgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG5jb25zdCBtZXJnZSA9IHJlcXVpcmUoJ21lcmdlMicpO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG4vLyBpbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4vdXRpbHMnO1xuXG5sZXQgcHJvamVjdExpc3Q6IHN0cmluZ1tdID0gW107XG5sZXQgd29ya3NwYWNlRGlyczogc3RyaW5nW10gPSBbXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldFByb2plY3RMaXN0KGxpc3Q6IHN0cmluZ1tdKSB7XG4gIHByb2plY3RMaXN0ID0gbGlzdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFdvcmtzcGFjZURpcnMobGlzdDogc3RyaW5nW10pIHtcbiAgd29ya3NwYWNlRGlycyA9IGxpc3Q7XG59XG5cbi8vIGxldCBjbGVhbkFjdGlvbnM6IEFjdGlvbnNUeXBlO1xuLy8gY2xlYW5BY3Rpb25zUHJvbS50aGVuKGFjdGlvbnMgPT4gY2xlYW5BY3Rpb25zID0gYWN0aW9ucyk7XG5cbmV4cG9ydCB0eXBlIEVhY2hSZWNpcGVTcmNDYWxsYmFjayA9IChzcmNEaXI6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcgfCBudWxsLCByZWNpcGVOYW1lOiBzdHJpbmcgfCBudWxsLCBwcm9qZWN0RGlyOiBzdHJpbmcpID0+IHZvaWQ7XG4vKipcbiAqIEl0ZXJhdGUgc3JjIGZvbGRlciBmb3IgY29tcG9uZW50IGl0ZW1zXG4gKiBAcGFyYW0ge3N0cmluZyB8IHN0cmluZ1tdfSBwcm9qZWN0RGlyIG9wdGlvbmFsLCBpZiBub3QgcHJlc2VudCBvciBudWxsLCBpbmNsdWRlcyBhbGwgcHJvamVjdCBzcmMgZm9sZGVyc1xuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIChzcmNEaXIsIHJlY2lwZURpciwgcmVjaXBlTmFtZSk6IHZvaWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMoY2FsbGJhY2s6IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZVNyYyhwcm9qZWN0RGlyOiBzdHJpbmcsIGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nIHwgRWFjaFJlY2lwZVNyY0NhbGxiYWNrLFxuICBjYWxsYmFjaz86IEVhY2hSZWNpcGVTcmNDYWxsYmFjayk6IHZvaWQge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBpZiAodHlwZW9mIHByb2plY3REaXIgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocHJvamVjdERpcikpIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdERpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdExpc3QpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZvclByb2plY3QocHJqRGlyczogc3RyaW5nW10gfCBzdHJpbmcpIHtcbiAgICAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwcmpEaXJzKS5mb3JFYWNoKHByakRpciA9PiB7XG4gICAgICBfLmVhY2gocmVjaXBlMnNyY0Rpck1hcEZvclByaihwcmpEaXIpLCAoc3JjRGlyLCByZWNpcGVEaXIpID0+IHtcbiAgICAgICAgbGV0IHJlY2lwZU5hbWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlY2lwZU5hbWUgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSkubmFtZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgQ2FuJ3QgcmVhZCAke1BhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayEoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUsIHByakRpcik7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGUyZURpciA9IFBhdGguam9pbihwcmpEaXIsICdlMmV0ZXN0Jyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhlMmVEaXIpKVxuICAgICAgICBjYWxsYmFjayEoZTJlRGlyLCBudWxsLCBudWxsLCBwcmpEaXIpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlY2lwZTJzcmNEaXJNYXBGb3JQcmoocHJvamVjdERpcjogc3RyaW5nKToge1tyZWNpcGVEaXI6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCBzcmNSZWNpcGVNYXBGaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdkci5yZWNpcGVzLmpzb24nKTtcbiAgY29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHJlY2lwZVNyY01hcHBpbmc6IHtbcmVjaXBlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGxldCBuYW1lU3JjU2V0dGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICBsZXQgbm9ybWFsaXplZFByak5hbWUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpcikucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyk7XG4gIG5vcm1hbGl6ZWRQcmpOYW1lID0gXy50cmltKG5vcm1hbGl6ZWRQcmpOYW1lLCAnLicpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSkge1xuICAgIGNvbnN0IHBranNvbiA9IHJlcXVpcmUocGtKc29uRmlsZSk7XG4gICAgaWYgKHBranNvbi5wYWNrYWdlcykge1xuICAgICAgKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocGtqc29uLnBhY2thZ2VzKS5mb3JFYWNoKChwYXQpID0+IHtcbiAgICAgICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcbiAgICAgICAgZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgICAgIHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbY29uZmlnLnJlc29sdmUoXG4gICAgICAgICAgJ2Rlc3REaXInLCBgcmVjaXBlcy8ke3BranNvbi5uYW1lfSR7cGF0Lmxlbmd0aCA+IDAgPyAnLicgOiAnJ30ke3BhdC5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKX0ucmVjaXBlYCldID1cbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBwYXQpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmFtZVNyY1NldHRpbmc7XG4gICAgfVxuICB9XG4gIGlmIChmcy5leGlzdHNTeW5jKHNyY1JlY2lwZU1hcEZpbGUpKSB7XG4gICAgLy8gbGVnYWN5OiByZWFkIGRyLnJlY2lwZXMuanNvblxuICAgIG5hbWVTcmNTZXR0aW5nID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoc3JjUmVjaXBlTWFwRmlsZSwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpID8gcmVxdWlyZShwa0pzb25GaWxlKS5uYW1lIDogUGF0aC5iYXNlbmFtZShwcm9qZWN0RGlyKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocHJvamVjdERpciwgJ3NyYycpKSkge1xuICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdzcmMnO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZXN0U3JjRGlyID0gUGF0aC5qb2luKHByb2plY3REaXIsICdhcHAnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3RTcmNEaXIpICYmIGZzLnN0YXRTeW5jKHRlc3RTcmNEaXIpLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnYXBwJztcbiAgICAgIGVsc2VcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICcuJztcbiAgICB9XG4gIH1cbiAgXy5lYWNoKG5hbWVTcmNTZXR0aW5nLCAoc3JjRGlyLCByZWNpcGVEaXIpID0+IHtcbiAgICBsZXQgc3JjRGlyczogc3RyaW5nW107XG4gICAgaWYgKCFfLmVuZHNXaXRoKHJlY2lwZURpciwgJy1yZWNpcGUnKSlcbiAgICAgIHJlY2lwZURpciArPSAnLXJlY2lwZSc7XG4gICAgc3JjRGlycyA9IEFycmF5LmlzQXJyYXkoc3JjRGlyKSA/IHNyY0RpciA6IFtzcmNEaXJdO1xuICAgIGNvbnN0IGFic1JlY2lwZURpciA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgcmVjaXBlRGlyKTtcbiAgICBzcmNEaXJzLmZvckVhY2goc3JjRGlyID0+IHJlY2lwZVNyY01hcHBpbmdbYWJzUmVjaXBlRGlyXSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBzcmNEaXIpKTtcbiAgfSk7XG4gIHJldHVybiByZWNpcGVTcmNNYXBwaW5nO1xufVxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZUNhbGxiYWNrID0gKHJlY2lwZURpcjogc3RyaW5nLCBpc0Zyb21JbnN0YWxsYXRpb246IGJvb2xlYW4sIGpzb25GaWxlTmFtZTogc3RyaW5nKSA9PiB2b2lkO1xuXG5mdW5jdGlvbiBlYWNoRG93bmxvYWRlZFJlY2lwZShjYWxsYmFjazogRWFjaFJlY2lwZUNhbGxiYWNrLCBleGNsdWRlUmVjaXBlU2V0PzogU2V0PHN0cmluZz4pIHtcbiAgbGV0IHNyY1JlY2lwZVNldDogU2V0PHN0cmluZz47XG4gIGlmIChleGNsdWRlUmVjaXBlU2V0KSB7XG4gICAgc3JjUmVjaXBlU2V0ID0gZXhjbHVkZVJlY2lwZVNldDtcbiAgfSBlbHNlIHtcbiAgICBzcmNSZWNpcGVTZXQgPSBuZXcgU2V0KCk7XG4gICAgZWFjaFJlY2lwZVNyYygoeCwgeSwgcmVjaXBlTmFtZSkgPT4ge1xuICAgICAgaWYgKHJlY2lwZU5hbWUpIHNyY1JlY2lwZVNldC5hZGQocmVjaXBlTmFtZSk7XG4gICAgfSk7XG4gIH1cbiAgaWYgKGNvbmZpZygpLmluc3RhbGxlZFJlY2lwZXMpIHtcbiAgICBjb25zdCByZWdleExpc3QgPSAoY29uZmlnKCkuaW5zdGFsbGVkUmVjaXBlcyBhcyBzdHJpbmdbXSkubWFwKHMgPT4gbmV3IFJlZ0V4cChzKSk7XG4gICAgY29uc3QgcGtqc29uID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ3BhY2thZ2UuanNvbicpKTsgLy8gPHdvcmtzcGFjZT4vcGFja2FnZS5qc29uXG4gICAgY29uc3QgZGVwcyA9IE9iamVjdC5hc3NpZ24oe30sIHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30sIHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuICAgIGlmICghZGVwcylcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBkcmNwTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG4gICAgXy5lYWNoKGRlcHMsIGZ1bmN0aW9uKHZlciwgZGVwTmFtZSkge1xuICAgICAgaWYgKGRlcE5hbWUgIT09IGRyY3BOYW1lICYmICFzcmNSZWNpcGVTZXQuaGFzKGRlcE5hbWUpICYmIF8uc29tZShyZWdleExpc3QsIHJlZ2V4ID0+IHJlZ2V4LnRlc3QoZGVwTmFtZSkpKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnbG9va2luZyBmb3IgaW5zdGFsbGVkIHJlY2lwZTogJXMnLCBkZXBOYW1lKTtcbiAgICAgICAgbGV0IHA7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcCA9IFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzJywgZGVwTmFtZSk7IC8vIDx3b3Jrc3BhY2U+L25vZGVfbW9kdWxlcy88ZGVwTmFtZT5cbiAgICAgICAgICBjYWxsYmFjayhwLCB0cnVlLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cuaW5mbyhgJHtkZXBOYW1lfSBzZWVtcyB0byBiZSBub3QgaW5zdGFsbGVkYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEBuYW1lIGVhY2hSZWNpcGVcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayBmdW5jdGlvbihyZWNpcGVEaXIsIGlzRnJvbUluc3RhbGxhdGlvbiwganNvbkZpbGVOYW1lID0gJ3BhY2thZ2UuanNvbicpOiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlKGNhbGxiYWNrOiBFYWNoUmVjaXBlQ2FsbGJhY2spIHtcbiAgLy8gY29uc3Qgc3JjUmVjaXBlU2V0ID0gbmV3IFNldCgpO1xuICBlYWNoUmVjaXBlU3JjKChzcmNEaXIsIHJlY2lwZURpciwgcmVjaXBlTmFtZSkgPT4ge1xuICAgIC8vIHNyY1JlY2lwZVNldC5hZGQocmVjaXBlTmFtZSk7XG4gICAgaWYgKHJlY2lwZURpcilcbiAgICAgIGNhbGxiYWNrKHJlY2lwZURpciwgZmFsc2UsICdwYWNrYWdlLmpzb24nKTtcbiAgfSk7XG4gIGVhY2hJbnN0YWxsZWRSZWNpcGUoY2FsbGJhY2spO1xufVxuXG4vKipcbiAqIGVhY2hJbnN0YWxsZWRSZWNpcGVcbiAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvbihyZWNpcGVEaXIsIGlzRnJvbUluc3RhbGxhdGlvbiwganNvbkZpbGVOYW1lID0gJ3BhY2thZ2UuanNvbicpOiB2b2lkXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hJbnN0YWxsZWRSZWNpcGUoY2FsbGJhY2s6IEVhY2hSZWNpcGVDYWxsYmFjaykge1xuICBlYWNoRG93bmxvYWRlZFJlY2lwZShjYWxsYmFjayk7XG4gIC8vIGNvbnN0IHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG4gIGZvciAoY29uc3QgZGlyIG9mIHdvcmtzcGFjZURpcnMpXG4gICAgY2FsbGJhY2soZGlyLCB0cnVlLCAncGFja2FnZS5qc29uJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5rKG9uUGtKc29uRmlsZTogKGZpbGVQYXRoOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nLCBwcm9qOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcbiAgZWFjaFJlY2lwZVNyYyhmdW5jdGlvbihzcmMsIHJlY2lwZURpciwgcmVjaXBlTmFtZSwgcHJvaikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgbG9nLmRlYnVnKCdbcmVjaXBlTWFuYWdlcl1saW5rIHJlY2lwZScsIHJlY2lwZURpcik7XG4gICAgc3RyZWFtcy5wdXNoKGxpbmtUb1JlY2lwZUZpbGUoc3JjLCByZWNpcGVEaXIhLCAoZmlsZSwgcmVjaXBlRGlyKSA9PiBvblBrSnNvbkZpbGUoZmlsZSwgcmVjaXBlRGlyLCBwcm9qKSkpO1xuICB9KTtcbiAgcmV0dXJuIG1lcmdlKHN0cmVhbXMpXG4gIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICgpID0+IHZvaWQpIHtcbiAgICBpZiAoXy5pc0FycmF5KGZpbGUpKSB7XG4gICAgICAvLyBsaW5rRmlsZXMucHVzaCguLi5maWxlKTtcbiAgICAgIGNsZWFuQWN0aW9ucy5hZGRXb3Jrc3BhY2VGaWxlKGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoJ291dDogJyArIGZpbGUucGF0aCk7XG4gICAgICB0aGlzLnB1c2goZmlsZSk7XG4gICAgfVxuICAgIG5leHQoKTtcbiAgfSwgZnVuY3Rpb24gZmx1c2gobmV4dDogKCkgPT4gdm9pZCkge1xuICAgIG5leHQoKTtcbiAgfSkpXG4gIC5waXBlKGd1bHAuZGVzdChjb25maWcoKS5yb290UGF0aCkpXG4gIC5vbignZXJyb3InLCBmdW5jdGlvbihlcnI6IEVycm9yKSB7XG4gICAgbG9nLmVycm9yKGVycik7XG4gIH0pO1xufVxuXG4vKipcbiAqIEByZXR1cm4gYXJyYXkgb2YgbGlua2VkIHBhY2thZ2UncyBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW5rQ29tcG9uZW50c0FzeW5jKGNiOiAocHJqOiBzdHJpbmcsIHBrZ0pzb25GaWxlOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgLy8gY29uc3QgcGtKc29uRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmdbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxpbmsoKGZpbGUsIHJlY2lwZURpciwgcHJvaikgPT4ge1xuICAgICAgLy8gcGtKc29uRmlsZXMucHVzaChmaWxlKTtcbiAgICAgIGNiKHByb2osIGZpbGUpO1xuICAgIH0pXG4gICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKCkpXG4gICAgLm9uKCdlcnJvcicsIHJlamVjdClcbiAgICAucmVzdW1lKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW4oKSB7XG4gIC8vIGF3YWl0IGNvbmZpZy5kb25lO1xuICBhd2FpdCBzY2FuTm9kZU1vZHVsZXMoJ2FsbCcpO1xuICAvLyBjb25zdCByZWNpcGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIGVhY2hSZWNpcGVTcmMoZnVuY3Rpb24oc3JjOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG4gIC8vICAgaWYgKHJlY2lwZURpcilcbiAgLy8gICAgIHJlY2lwZXMucHVzaChQYXRoLmpvaW4ocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpO1xuICAvLyB9KTtcbiAgLy8gcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCBqKSA9PiB7XG4gIC8vICAgZ3VscC5zcmMocmVjaXBlcywge2Jhc2U6IGNvbmZpZygpLnJvb3RQYXRofSlcbiAgLy8gICAucGlwZShyd1BhY2thZ2VKc29uLnJlbW92ZURlcGVuZGVuY3koKSlcbiAgLy8gICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuYzogc3RyaW5nLCBuZXh0OiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcbiAgLy8gICAgIGxvZy5kZWJ1Zygnb3V0OiAnICsgZmlsZS5wYXRoKTtcbiAgLy8gICAgIG5leHQobnVsbCwgZmlsZSk7XG4gIC8vICAgfSkpXG4gIC8vICAgLnBpcGUoZ3VscC5kZXN0KGNvbmZpZygpLnJvb3RQYXRoKSlcbiAgLy8gICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcbiAgLy8gICAub24oJ2Vycm9yJywgaik7XG4gIC8vIH0pO1xufVxuXG5mdW5jdGlvbiBsaW5rVG9SZWNpcGVGaWxlKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZyxcbiAgb25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgcmV0dXJuIGd1bHAuc3JjKCcuJylcbiAgICAucGlwZShmaW5kUGFja2FnZUpzb24oc3JjRGlyLCB0cnVlKSlcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuYzogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgbG9nLmRlYnVnKCdGb3VuZCByZWNpcGVEaXIgJXM6IGZpbGU6ICVzJywgcmVjaXBlRGlyLCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKG9uUGtKc29uRmlsZSlcbiAgICAgICAgb25Qa0pzb25GaWxlKGZpbGUucGF0aCwgcmVjaXBlRGlyKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLy8gLnBpcGUocndQYWNrYWdlSnNvbi5zeW1ib2xpY0xpbmtQYWNrYWdlcyhjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdsaW5rcycpKSlcbiAgICAucGlwZShyd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKGNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcpKSlcbiAgICAucGlwZShyd1BhY2thZ2VKc29uLmFkZERlcGVuZGVuY3kocmVjaXBlRGlyKSlcbiAgICAub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyOiBFcnJvcikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfSk7XG59XG5cbiJdfQ==