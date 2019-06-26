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
                nameSrcSetting[config.resolve('destDir', `recipes/${pkjson.name}${pat.length > 0 ? '.' : ''}${pat.replace(/[\/\\]/g, '.')}.recipe`)] =
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUNBQWlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdqQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLGdEQUF3QjtBQUN4Qiw2Q0FBK0I7QUFDL0IsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDL0QsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sTUFBTSxHQUFlLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUVwRCxpRUFBbUQ7QUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxrQ0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBRXRELElBQUksWUFBb0IsQ0FBQztBQUV6QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDckIsWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUM7QUFVSCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdkUsUUFBd0Y7SUFDeEYsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMzQixRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUNqQztTQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDbEMsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNoRSxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDdkI7YUFBTTtZQUNOLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNqQztLQUNEO0lBRUQsU0FBUyxVQUFVLENBQUMsT0FBMEI7UUFDNUMsRUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakQsQ0FBQyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQzVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLFFBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUMsTUFBYyxFQUFFLFNBQWlCO1FBQzdELElBQUksVUFBVSxHQUFrQixJQUFJLENBQUM7UUFDckMsSUFBSTtZQUNILFVBQVUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7U0FDbkU7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNYLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDbkU7UUFDRCxRQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMxQyxDQUFDO0FBQ0YsQ0FBQztBQS9CRCxzQ0ErQkM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLFVBQWtCO0lBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNyRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUM1RCxNQUFNLGdCQUFnQixHQUErQixFQUFFLENBQUM7SUFDeEQsSUFBSSxjQUFjLEdBQTRCLEVBQUUsQ0FBQztJQUVqRCxJQUFJLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN6RSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ25ELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUM5QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbkMsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ25CLEVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUN4RCxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO29CQUN0QixHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDbkIsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztvQkFDMUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLEdBQUcsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDNUIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQzVCLFNBQVMsRUFBRSxXQUFXLE1BQU0sQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDckcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDakMsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLGNBQWMsQ0FBQztTQUN0QjtLQUNEO0lBQ0QsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7UUFDcEMsK0JBQStCO1FBQy9CLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUN2RTtTQUFNO1FBQ04sTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNoRCxjQUFjLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUNqRDthQUFNO1lBQ04sTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxFQUFFO2dCQUNyRSxjQUFjLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEtBQUssQ0FBQzs7Z0JBRWpELGNBQWMsQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDO1NBQ2hEO0tBQ0Q7SUFDRCxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUM1QyxJQUFJLE9BQWlCLENBQUM7UUFDdEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztZQUNwQyxTQUFTLElBQUksU0FBUyxDQUFDO1FBQ3hCLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDOUYsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLGdCQUFnQixDQUFDO0FBQ3pCLENBQUM7QUFHRCxTQUFTLG9CQUFvQixDQUFDLFFBQTRCLEVBQUUsZ0JBQThCO0lBQ3pGLElBQUksWUFBeUIsQ0FBQztJQUM5QixJQUFJLGdCQUFnQixFQUFFO1FBQ3JCLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQztLQUNoQztTQUFNO1FBQ04sWUFBWSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDekIsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRTtZQUNsQyxJQUFJLFVBQVU7Z0JBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztLQUNIO0lBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRTtRQUM5QixNQUFNLFNBQVMsR0FBSSxNQUFNLEVBQUUsQ0FBQyxnQkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxZQUFZLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEYsSUFBSSxDQUFDLElBQUk7WUFDUixPQUFPO1FBQ1IsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3BELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVMsR0FBRyxFQUFFLE9BQU87WUFDakMsSUFBSSxPQUFPLEtBQUssUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtnQkFDMUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxDQUFDLENBQUM7Z0JBQ04sSUFBSTtvQkFDSCxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzdDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2lCQUNsQztnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyw0QkFBNEIsQ0FBQyxDQUFDO2lCQUNqRDthQUNEO1FBQ0YsQ0FBQyxDQUFDLENBQUM7S0FDSDtBQUNGLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENBQUMsUUFBNEI7SUFDdEQsa0NBQWtDO0lBQ2xDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEVBQUU7UUFDL0MsZ0NBQWdDO1FBQ2hDLElBQUksU0FBUztZQUNaLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQVJELGdDQVFDO0FBRUQ7OztFQUdFO0FBQ0YsU0FBZ0IsbUJBQW1CLENBQUMsUUFBNEI7SUFDL0Qsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0IsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3ZHLENBQUM7QUFIRCxrREFHQztBQUVELFNBQWdCLElBQUksQ0FBQyxZQUEyRDtJQUMvRSxNQUFNLE9BQU8sR0FBVSxFQUFFLENBQUM7SUFDMUIsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDckcsYUFBYSxDQUFDLFVBQVMsR0FBRyxFQUFFLFNBQVM7UUFDcEMsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbkQsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7U0FDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBUyxJQUFTLEVBQUUsR0FBVyxFQUFFLElBQWdCO1FBQ2xFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNwQixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDeEI7YUFBTTtZQUNOLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2hCO1FBQ0QsSUFBSSxFQUFFLENBQUM7SUFDUixDQUFDLEVBQUUsU0FBUyxLQUFLLENBQUMsSUFBZ0I7UUFDakMsU0FBUyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxJQUFJLENBQUM7WUFDOUIsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQ3JDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUM7WUFDcEQsUUFBUSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztTQUMxRCxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLEVBQUUsQ0FBQztJQUNSLENBQUMsQ0FBQyxDQUFDO1NBQ0YsSUFBSSxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDbEMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFTLEdBQVU7UUFDL0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFoQ0Qsb0JBZ0NDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixtQkFBbUI7SUFDbEMsTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO0lBQ2pDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNuQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUNyQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQzthQUNuQixNQUFNLEVBQUUsQ0FBQztJQUNYLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQVJELGtEQVFDO0FBRUQsU0FBc0IsS0FBSzs7UUFDMUIsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2xCLFlBQVksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztRQUM3QixJQUFJLFlBQVksR0FBb0IsRUFBRSxDQUFDO1FBQ3ZDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUNoQyxNQUFNLElBQUksR0FBYSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDekUsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3JELE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzdELENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFaEMsYUFBYSxDQUFDLFVBQVMsR0FBVyxFQUFFLFNBQWlCO1lBQ3BELElBQUksU0FBUztnQkFDWixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2pDLGNBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBQyxDQUFDO2lCQUMzQyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7aUJBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBUyxFQUFFLEdBQVcsRUFBRSxJQUE4QjtnQkFDaEYsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxDQUFDO2lCQUNGLElBQUksQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUNsQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO2lCQUMxQixFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBN0JELHNCQTZCQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsTUFBYyxFQUFFLFNBQWlCLEVBQUUsWUFBMkQ7SUFDdkgsT0FBTyxjQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztTQUNqQixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQVMsRUFBRSxHQUFXLEVBQUUsSUFBNkI7UUFDL0UsR0FBRyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hFLElBQUksWUFBWTtZQUNmLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxnRkFBZ0Y7U0FDL0UsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7U0FDcEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDNUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFTLEdBQVU7UUFDL0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTptYXgtbGluZS1sZW5ndGhcblxuaW1wb3J0IHtEcmNwQ29uZmlnfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ3VscCBmcm9tICdndWxwJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmNvbnN0IGZpbmRQYWNrYWdlSnNvbiA9IHJlcXVpcmUoJy4uL2xpYi9ndWxwL2ZpbmRQYWNrYWdlSnNvbicpO1xuY29uc3QgcndQYWNrYWdlSnNvbiA9IHJlcXVpcmUoJy4vcndQYWNrYWdlSnNvbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd3ZmguJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSkpO1xuY29uc3QgRmlsZSA9IHJlcXVpcmUoJ3ZpbnlsJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBjb25maWc6IERyY3BDb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5cbmltcG9ydCB7Z2V0SW5zdGFuY2V9IGZyb20gJy4vcGFja2FnZS1qc29uLWd1YXJkZXInO1xuY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0SW5zdGFuY2UocHJvY2Vzcy5jd2QoKSk7XG5cbmxldCBsaW5rTGlzdEZpbGU6IHN0cmluZztcblxuY29uZmlnLmRvbmUudGhlbigoKSA9PiB7XG5cdGxpbmtMaXN0RmlsZSA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2xpbmstbGlzdC5qc29uJyk7XG59KTtcblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZVNyY0NhbGxiYWNrID0gKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZywgcmVjaXBlTmFtZTogc3RyaW5nKSA9PiB2b2lkO1xuLyoqXG4gKiBJdGVyYXRlIHNyYyBmb2xkZXIgZm9yIGNvbXBvbmVudCBpdGVtc1xuICogQHBhcmFtIHtzdHJpbmcgfCBzdHJpbmdbXX0gcHJvamVjdERpciBvcHRpb25hbCwgaWYgbm90IHByZXNlbnQgb3IgbnVsbCwgaW5jbHVkZXMgYWxsIHByb2plY3Qgc3JjIGZvbGRlcnNcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayAoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpOiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nLCBjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZyB8IEVhY2hSZWNpcGVTcmNDYWxsYmFjayxcblx0Y2FsbGJhY2s/OiAoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nIHwgbnVsbCwgcmVjaXBlTmFtZTogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCk6IHZvaWQge1xuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuXHRcdGZvclByb2plY3QoY29uZmlnKCkucHJvamVjdExpc3QpO1xuXHR9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcblx0XHRpZiAodHlwZW9mIHByb2plY3REaXIgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocHJvamVjdERpcikpIHtcblx0XHRcdGZvclByb2plY3QocHJvamVjdERpcik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvclByb2plY3QoY29uZmlnKCkucHJvamVjdExpc3QpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZvclByb2plY3QocHJqRGlyczogc3RyaW5nW10gfCBzdHJpbmcpIHtcblx0XHQoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwcmpEaXJzKS5mb3JFYWNoKHByakRpciA9PiB7XG5cdFx0XHRfLmVhY2gocmVjaXBlMnNyY0Rpck1hcEZvclByaihwcmpEaXIpLCBvbkVhY2hTcmNSZWNpcGVQYWlyKTtcblx0XHRcdGNvbnN0IGUyZURpciA9IFBhdGguam9pbihwcmpEaXIsICdlMmV0ZXN0Jyk7XG5cdFx0XHRpZiAoZnMuZXhpc3RzU3luYyhlMmVEaXIpKVxuXHRcdFx0XHRjYWxsYmFjayEoZTJlRGlyLCBudWxsLCBudWxsKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uRWFjaFNyY1JlY2lwZVBhaXIoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG5cdFx0bGV0IHJlY2lwZU5hbWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXHRcdHRyeSB7XG5cdFx0XHRyZWNpcGVOYW1lID0gcmVxdWlyZShQYXRoLnJlc29sdmUocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpLm5hbWU7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0bG9nLmRlYnVnKGBDYW4ndCByZWFkICR7UGF0aC5yZXNvbHZlKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpfWApO1xuXHRcdH1cblx0XHRjYWxsYmFjayEoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHJlY2lwZTJzcmNEaXJNYXBGb3JQcmoocHJvamVjdERpcjogc3RyaW5nKToge1tyZWNpcGVEaXI6IHN0cmluZ106IHN0cmluZ30ge1xuXHRjb25zdCBzcmNSZWNpcGVNYXBGaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdkci5yZWNpcGVzLmpzb24nKTtcblx0Y29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAncGFja2FnZS5qc29uJyk7XG5cdGNvbnN0IHJlY2lwZVNyY01hcHBpbmc6IHtbcmVjaXBlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cdGxldCBuYW1lU3JjU2V0dGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuXHRsZXQgbm9ybWFsaXplZFByak5hbWUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpcikucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyk7XG5cdG5vcm1hbGl6ZWRQcmpOYW1lID0gXy50cmltKG5vcm1hbGl6ZWRQcmpOYW1lLCAnLicpO1xuXHRpZiAoZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSkge1xuXHRcdGNvbnN0IHBranNvbiA9IHJlcXVpcmUocGtKc29uRmlsZSk7XG5cdFx0aWYgKHBranNvbi5wYWNrYWdlcykge1xuXHRcdFx0KFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocGtqc29uLnBhY2thZ2VzKS5mb3JFYWNoKChwYXQpID0+IHtcblx0XHRcdFx0aWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG5cdFx0XHRcdFx0cGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcblx0XHRcdFx0ZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuXHRcdFx0XHRcdHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG5cdFx0XHRcdHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcblx0XHRcdFx0bmFtZVNyY1NldHRpbmdbY29uZmlnLnJlc29sdmUoXG5cdFx0XHRcdFx0J2Rlc3REaXInLCBgcmVjaXBlcy8ke3BranNvbi5uYW1lfSR7cGF0Lmxlbmd0aCA+IDAgPyAnLicgOiAnJ30ke3BhdC5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKX0ucmVjaXBlYCldID1cblx0XHRcdFx0XHRcdFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBwYXQpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gbmFtZVNyY1NldHRpbmc7XG5cdFx0fVxuXHR9XG5cdGlmIChmcy5leGlzdHNTeW5jKHNyY1JlY2lwZU1hcEZpbGUpKSB7XG5cdFx0Ly8gbGVnYWN5OiByZWFkIGRyLnJlY2lwZXMuanNvblxuXHRcdG5hbWVTcmNTZXR0aW5nID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoc3JjUmVjaXBlTWFwRmlsZSwgJ3V0ZjgnKSk7XG5cdH0gZWxzZSB7XG5cdFx0Y29uc3QgcHJvamVjdE5hbWUgPSBmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpID8gcmVxdWlyZShwa0pzb25GaWxlKS5uYW1lIDogUGF0aC5iYXNlbmFtZShwcm9qZWN0RGlyKTtcblx0XHRpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocHJvamVjdERpciwgJ3NyYycpKSkge1xuXHRcdFx0bmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdzcmMnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCB0ZXN0U3JjRGlyID0gUGF0aC5qb2luKHByb2plY3REaXIsICdhcHAnKTtcblx0XHRcdGlmIChmcy5leGlzdHNTeW5jKHRlc3RTcmNEaXIpICYmIGZzLnN0YXRTeW5jKHRlc3RTcmNEaXIpLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHRcdG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnYXBwJztcblx0XHRcdGVsc2Vcblx0XHRcdFx0bmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICcuJztcblx0XHR9XG5cdH1cblx0Xy5lYWNoKG5hbWVTcmNTZXR0aW5nLCAoc3JjRGlyLCByZWNpcGVEaXIpID0+IHtcblx0XHRsZXQgc3JjRGlyczogc3RyaW5nW107XG5cdFx0aWYgKCFfLmVuZHNXaXRoKHJlY2lwZURpciwgJy1yZWNpcGUnKSlcblx0XHRcdHJlY2lwZURpciArPSAnLXJlY2lwZSc7XG5cdFx0c3JjRGlycyA9IEFycmF5LmlzQXJyYXkoc3JjRGlyKSA/IHNyY0RpciA6IFtzcmNEaXJdO1xuXHRcdGNvbnN0IGFic1JlY2lwZURpciA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgcmVjaXBlRGlyKTtcblx0XHRzcmNEaXJzLmZvckVhY2goc3JjRGlyID0+IHJlY2lwZVNyY01hcHBpbmdbYWJzUmVjaXBlRGlyXSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBzcmNEaXIpKTtcblx0fSk7XG5cdHJldHVybiByZWNpcGVTcmNNYXBwaW5nO1xufVxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZUNhbGxiYWNrID0gKHJlY2lwZURpcjogc3RyaW5nLCBpc0Zyb21JbnN0YWxsYXRpb246IGJvb2xlYW4sIGpzb25GaWxlTmFtZTogc3RyaW5nKSA9PiB2b2lkO1xuXG5mdW5jdGlvbiBlYWNoRG93bmxvYWRlZFJlY2lwZShjYWxsYmFjazogRWFjaFJlY2lwZUNhbGxiYWNrLCBleGNsdWRlUmVjaXBlU2V0PzogU2V0PHN0cmluZz4pIHtcblx0bGV0IHNyY1JlY2lwZVNldDogU2V0PHN0cmluZz47XG5cdGlmIChleGNsdWRlUmVjaXBlU2V0KSB7XG5cdFx0c3JjUmVjaXBlU2V0ID0gZXhjbHVkZVJlY2lwZVNldDtcblx0fSBlbHNlIHtcblx0XHRzcmNSZWNpcGVTZXQgPSBuZXcgU2V0KCk7XG5cdFx0ZWFjaFJlY2lwZVNyYygoeCwgeSwgcmVjaXBlTmFtZSkgPT4ge1xuXHRcdFx0aWYgKHJlY2lwZU5hbWUpIHNyY1JlY2lwZVNldC5hZGQocmVjaXBlTmFtZSk7XG5cdFx0fSk7XG5cdH1cblx0aWYgKGNvbmZpZygpLmluc3RhbGxlZFJlY2lwZXMpIHtcblx0XHRjb25zdCByZWdleExpc3QgPSAoY29uZmlnKCkuaW5zdGFsbGVkUmVjaXBlcyBhcyBzdHJpbmdbXSkubWFwKHMgPT4gbmV3IFJlZ0V4cChzKSk7XG5cdFx0Y29uc3QgcGtqc29uID0gcmVxdWlyZShQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG5cdFx0Y29uc3QgZGVwcyA9IE9iamVjdC5hc3NpZ24oe30sIHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30sIHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuXHRcdGlmICghZGVwcylcblx0XHRcdHJldHVybjtcblx0XHRjb25zdCBkcmNwTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5cdFx0Xy5lYWNoKGRlcHMsIGZ1bmN0aW9uKHZlciwgZGVwTmFtZSkge1xuXHRcdFx0aWYgKGRlcE5hbWUgIT09IGRyY3BOYW1lICYmICFzcmNSZWNpcGVTZXQuaGFzKGRlcE5hbWUpICYmIF8uc29tZShyZWdleExpc3QsIHJlZ2V4ID0+IHJlZ2V4LnRlc3QoZGVwTmFtZSkpKSB7XG5cdFx0XHRcdGxvZy5kZWJ1ZygnbG9va2luZyBmb3IgaW5zdGFsbGVkIHJlY2lwZTogJXMnLCBkZXBOYW1lKTtcblx0XHRcdFx0bGV0IHA7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0cCA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5ub2RlUGF0aCwgZGVwTmFtZSk7XG5cdFx0XHRcdFx0Y2FsbGJhY2socCwgdHJ1ZSwgJ3BhY2thZ2UuanNvbicpO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0bG9nLmluZm8oYCR7ZGVwTmFtZX0gc2VlbXMgdG8gYmUgbm90IGluc3RhbGxlZGApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn1cblxuLyoqXG4gKiBAbmFtZSBlYWNoUmVjaXBlXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24ocmVjaXBlRGlyLCBpc0Zyb21JbnN0YWxsYXRpb24sIGpzb25GaWxlTmFtZSA9ICdwYWNrYWdlLmpzb24nKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZShjYWxsYmFjazogRWFjaFJlY2lwZUNhbGxiYWNrKSB7XG5cdC8vIGNvbnN0IHNyY1JlY2lwZVNldCA9IG5ldyBTZXQoKTtcblx0ZWFjaFJlY2lwZVNyYygoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpID0+IHtcblx0XHQvLyBzcmNSZWNpcGVTZXQuYWRkKHJlY2lwZU5hbWUpO1xuXHRcdGlmIChyZWNpcGVEaXIpXG5cdFx0XHRjYWxsYmFjayhyZWNpcGVEaXIsIGZhbHNlLCAncGFja2FnZS5qc29uJyk7XG5cdH0pO1xuXHRlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBlYWNoSW5zdGFsbGVkUmVjaXBlXG4gKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24ocmVjaXBlRGlyLCBpc0Zyb21JbnN0YWxsYXRpb24sIGpzb25GaWxlTmFtZSA9ICdwYWNrYWdlLmpzb24nKTogdm9pZFxuKi9cbmV4cG9ydCBmdW5jdGlvbiBlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrOiBFYWNoUmVjaXBlQ2FsbGJhY2spIHtcblx0ZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2spO1xuXHRjYWxsYmFjayhjb25maWcoKS5yb290UGF0aCwgdHJ1ZSwgUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcGFja2FnZUpzb25HdWFyZGVyLmdldEpzb25GaWxlKCkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmsob25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcblx0Y29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcblx0bGV0IGxpbmtGaWxlcyA9IGZzLmV4aXN0c1N5bmMobGlua0xpc3RGaWxlKSA/IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxpbmtMaXN0RmlsZSwgJ3V0ZjgnKSkgOiBbXTtcblx0ZWFjaFJlY2lwZVNyYyhmdW5jdGlvbihzcmMsIHJlY2lwZURpcikge1xuXHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG5cdFx0bG9nLmRlYnVnKCdbcmVjaXBlTWFuYWdlcl1saW5rIHJlY2lwZScsIHJlY2lwZURpcik7XG5cdFx0c3RyZWFtcy5wdXNoKGxpbmtUb1JlY2lwZUZpbGUoc3JjLCByZWNpcGVEaXIsIG9uUGtKc29uRmlsZSkpO1xuXHR9KTtcblx0cmV0dXJuIG1lcmdlKHN0cmVhbXMpXG5cdC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICgpID0+IHZvaWQpIHtcblx0XHRpZiAoXy5pc0FycmF5KGZpbGUpKSB7XG5cdFx0XHRsaW5rRmlsZXMucHVzaCguLi5maWxlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nLmRlYnVnKCdvdXQ6ICcgKyBmaWxlLnBhdGgpO1xuXHRcdFx0dGhpcy5wdXNoKGZpbGUpO1xuXHRcdH1cblx0XHRuZXh0KCk7XG5cdH0sIGZ1bmN0aW9uIGZsdXNoKG5leHQ6ICgpID0+IHZvaWQpIHtcblx0XHRsaW5rRmlsZXMgPSBfLnVuaXEobGlua0ZpbGVzKTtcblx0XHRjb25zdCBsaW5rRmlsZVRyYWNrID0gbmV3IEZpbGUoe1xuXHRcdFx0YmFzZTogUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoKSxcblx0XHRcdHBhdGg6IFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIGxpbmtMaXN0RmlsZSksXG5cdFx0XHRjb250ZW50czogbmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShsaW5rRmlsZXMsIG51bGwsICcgJykpXG5cdFx0fSk7XG5cdFx0dGhpcy5wdXNoKGxpbmtGaWxlVHJhY2spO1xuXHRcdGxvZy5kZWJ1Zygnb3V0OiAnICsgbGlua0ZpbGVUcmFjay5wYXRoKTtcblx0XHRuZXh0KCk7XG5cdH0pKVxuXHQucGlwZShndWxwLmRlc3QoY29uZmlnKCkucm9vdFBhdGgpKVxuXHQub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyOiBFcnJvcikge1xuXHRcdGxvZy5lcnJvcihlcnIpO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIGFycmF5IG9mIGxpbmtlZCBwYWNrYWdlJ3MgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICovXG5leHBvcnQgZnVuY3Rpb24gbGlua0NvbXBvbmVudHNBc3luYygpIHtcblx0Y29uc3QgcGtKc29uRmlsZXM6IHN0cmluZ1tdID0gW107XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0bGluayhmaWxlID0+IHBrSnNvbkZpbGVzLnB1c2goZmlsZSkpXG5cdFx0Lm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKHBrSnNvbkZpbGVzKSlcblx0XHQub24oJ2Vycm9yJywgcmVqZWN0KVxuXHRcdC5yZXN1bWUoKTtcblx0fSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbigpIHtcblx0YXdhaXQgY29uZmlnLmRvbmU7XG5cdGxpbmtMaXN0RmlsZSA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2xpbmstbGlzdC5qc29uJyk7XG5cdGNvbnN0IHJlY2lwZXM6IHN0cmluZ1tdID0gW107XG5cdGxldCByZW1vdmFsUHJvbXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXHRpZiAoZnMuZXhpc3RzU3luYyhsaW5rTGlzdEZpbGUpKSB7XG5cdFx0Y29uc3QgbGlzdDogc3RyaW5nW10gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsaW5rTGlzdEZpbGUsICd1dGY4JykpO1xuXHRcdHJlbW92YWxQcm9tcyA9IGxpc3QubWFwKGxpbmtQYXRoID0+IHtcblx0XHRcdGxvZy5pbmZvKCdSZW1vdmluZyBzeW1ib2xpYyBsaW5rIGZpbGUgJXMnLCBsaW5rUGF0aCk7XG5cdFx0XHRyZXR1cm4gZnMucmVtb3ZlKFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgbGlua1BhdGgpKTtcblx0XHR9KTtcblx0fVxuXHRhd2FpdCBQcm9taXNlLmFsbChyZW1vdmFsUHJvbXMpO1xuXG5cdGVhY2hSZWNpcGVTcmMoZnVuY3Rpb24oc3JjOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG5cdFx0aWYgKHJlY2lwZURpcilcblx0XHRcdHJlY2lwZXMucHVzaChQYXRoLmpvaW4ocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpO1xuXHR9KTtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCBqKSA9PiB7XG5cdFx0Z3VscC5zcmMocmVjaXBlcywge2Jhc2U6IGNvbmZpZygpLnJvb3RQYXRofSlcblx0XHQucGlwZShyd1BhY2thZ2VKc29uLnJlbW92ZURlcGVuZGVuY3koKSlcblx0XHQucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuYzogc3RyaW5nLCBuZXh0OiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcblx0XHRcdGxvZy5kZWJ1Zygnb3V0OiAnICsgZmlsZS5wYXRoKTtcblx0XHRcdG5leHQobnVsbCwgZmlsZSk7XG5cdFx0fSkpXG5cdFx0LnBpcGUoZ3VscC5kZXN0KGNvbmZpZygpLnJvb3RQYXRoKSlcblx0XHQub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcblx0XHQub24oJ2Vycm9yJywgaik7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBsaW5rVG9SZWNpcGVGaWxlKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZywgb25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcblx0cmV0dXJuIGd1bHAuc3JjKCcnKVxuXHRcdC5waXBlKGZpbmRQYWNrYWdlSnNvbihzcmNEaXIsIHRydWUpKVxuXHRcdC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICguLi5hcmc6IGFueVtdKSA9PiB2b2lkKSB7XG5cdFx0XHRsb2cuZGVidWcoJ0ZvdW5kIHJlY2lwZURpciAlczogZmlsZTogJXMnLCByZWNpcGVEaXIsIGZpbGUucGF0aCk7XG5cdFx0XHRpZiAob25Qa0pzb25GaWxlKVxuXHRcdFx0XHRvblBrSnNvbkZpbGUoZmlsZS5wYXRoLCByZWNpcGVEaXIpO1xuXHRcdFx0bmV4dChudWxsLCBmaWxlKTtcblx0XHR9KSlcblx0XHQvLyAucGlwZShyd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2xpbmtzJykpKVxuXHRcdC5waXBlKHJ3UGFja2FnZUpzb24uc3ltYm9saWNMaW5rUGFja2FnZXMoY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJykpKVxuXHRcdC5waXBlKHJ3UGFja2FnZUpzb24uYWRkRGVwZW5kZW5jeShyZWNpcGVEaXIpKVxuXHRcdC5vbignZXJyb3InLCBmdW5jdGlvbihlcnI6IEVycm9yKSB7XG5cdFx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHR9KTtcbn1cblxuIl19