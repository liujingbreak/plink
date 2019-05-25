"use strict";
// tslint:disable:max-line-length
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const gulp_1 = __importDefault(require("gulp"));
const fs = __importStar(require("fs-extra"));
const findPackageJson = require('../lib/gulp/findPackageJson');
const rwPackageJson = require('./rwPackageJson');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
const File = require('vinyl');
const through = require('through2');
const merge = require('merge2');
const config = require('../lib/config');
const package_json_guarder_1 = require("./package-json-guarder");
const packageJsonGuarder = package_json_guarder_1.getInstance(process.cwd());
let linkListFile;
config.done.then(() => {
    linkListFile = config.resolve('destDir', 'link-list.json');
});
function eachRecipeSrc(projectDir, callback) {
    if (arguments.length === 1) {
        callback = arguments[0];
        forProject(config().projectList);
    }
    else if (arguments.length === 2) {
        if (typeof projectDir === 'string' || Array.isArray(projectDir)) {
            forProject(projectDir);
        }
        else {
            forProject(config().projectList);
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
                if (pat.length > 0)
                    pat = '_' + pat;
                nameSrcSetting[config.resolve('destDir', `recipes/${pkjson.name}${pat.replace(/[\/\\]/g, '_')}-recipe`)] =
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
        const absRecipeDir = config.resolve('destDir', recipeDir);
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
    if (config().installedRecipes) {
        const regexList = config().installedRecipes.map(s => new RegExp(s));
        const pkjson = require(Path.resolve(config().rootPath, 'package.json'));
        const deps = Object.assign({}, pkjson.dependencies || {}, pkjson.devDependencies || {});
        if (!deps)
            return;
        const drcpName = require('../../package.json').name;
        _.each(deps, function (ver, depName) {
            if (depName !== drcpName && !srcRecipeSet.has(depName) && _.some(regexList, regex => regex.test(depName))) {
                log.debug('looking for installed recipe: %s', depName);
                let p;
                try {
                    p = Path.resolve(config().nodePath, depName);
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
    callback(config().rootPath, true, Path.relative(config().rootPath, packageJsonGuarder.getJsonFile()));
}
exports.eachInstalledRecipe = eachInstalledRecipe;
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
        }
        else {
            log.debug('out: ' + file.path);
            this.push(file);
        }
        next();
    }, function flush(next) {
        linkFiles = _.uniq(linkFiles);
        const linkFileTrack = new File({
            base: Path.resolve(config().rootPath),
            path: Path.relative(config().rootPath, linkListFile),
            contents: new Buffer(JSON.stringify(linkFiles, null, ' '))
        });
        this.push(linkFileTrack);
        log.debug('out: ' + linkFileTrack.path);
        next();
    }))
        .pipe(gulp_1.default.dest(config().rootPath))
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
        yield config.done;
        linkListFile = config.resolve('destDir', 'link-list.json');
        const recipes = [];
        let removalProms = [];
        if (fs.existsSync(linkListFile)) {
            const list = JSON.parse(fs.readFileSync(linkListFile, 'utf8'));
            removalProms = list.map(linkPath => {
                log.info('Removing symbolic link file %s', linkPath);
                return fs.remove(Path.resolve(config().rootPath, linkPath));
            });
        }
        yield Promise.all(removalProms);
        eachRecipeSrc(function (src, recipeDir) {
            if (recipeDir)
                recipes.push(Path.join(recipeDir, 'package.json'));
        });
        return new Promise((resolve, j) => {
            gulp_1.default.src(recipes, { base: config().rootPath })
                .pipe(rwPackageJson.removeDependency())
                .pipe(through.obj(function (file, enc, next) {
                log.debug('out: ' + file.path);
                next(null, file);
            }))
                .pipe(gulp_1.default.dest(config().rootPath))
                .on('end', () => resolve())
                .on('error', j);
        });
    });
}
exports.clean = clean;
function linkToRecipeFile(srcDir, recipeDir, onPkJsonFile) {
    return gulp_1.default.src('')
        .pipe(findPackageJson(srcDir, true))
        .pipe(through.obj(function (file, enc, next) {
        log.debug('Found recipeDir %s: file: %s', recipeDir, file.path);
        if (onPkJsonFile)
            onPkJsonFile(file.path, recipeDir);
        next(null, file);
    }))
        // .pipe(rwPackageJson.symbolicLinkPackages(config.resolve('destDir', 'links')))
        .pipe(rwPackageJson.symbolicLinkPackages(config.resolve('rootPath')))
        .pipe(rwPackageJson.addDependency(recipeDir))
        .on('error', function (err) {
        log.error(err);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUNBQWlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdqQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLGdEQUF3QjtBQUN4Qiw2Q0FBK0I7QUFDL0IsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDL0QsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sTUFBTSxHQUFlLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUVwRCxpRUFBbUQ7QUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxrQ0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBRXRELElBQUksWUFBb0IsQ0FBQztBQUV6QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDckIsWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUM7QUFVSCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdkUsUUFBaUY7SUFDakYsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMz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