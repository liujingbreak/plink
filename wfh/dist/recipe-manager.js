"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:max-line-length
const through = require('through2');
const merge = require('merge2');
const config = require('../lib/config');
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const gulp_1 = tslib_1.__importDefault(require("gulp"));
const fs = tslib_1.__importStar(require("fs-extra"));
const findPackageJson = require('../lib/gulp/findPackageJson');
const rwPackageJson = require('./rwPackageJson');
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
const File = require('vinyl');
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
            _.each(_projectSrcRecipeMap(prjDir), onEachSrcRecipePair);
            const e2eDir = Path.join(prjDir, 'e2etest');
            if (fs.existsSync(e2eDir))
                callback(e2eDir, null, null);
        });
    }
    function onEachSrcRecipePair(srcDir, recipeDir) {
        let recipeName;
        try {
            recipeName = require(Path.resolve(recipeDir, 'package.json')).name;
        }
        catch (e) {
            log.error(`Can't read ${Path.resolve(recipeDir, 'package.json')}`);
        }
        callback(srcDir, recipeDir, recipeName);
    }
}
exports.eachRecipeSrc = eachRecipeSrc;
function _projectSrcRecipeMap(projectDir) {
    const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
    const recipeSrcMapping = {};
    let nameSrcSetting = {};
    if (fs.existsSync(srcRecipeMapFile)) {
        nameSrcSetting = JSON.parse(fs.readFileSync(srcRecipeMapFile, 'utf8'));
    }
    else {
        const pkJsonFile = Path.resolve(projectDir, 'package.json');
        const projectName = fs.existsSync(pkJsonFile) ? require(pkJsonFile).name : Path.basename(projectDir);
        if (fs.existsSync(Path.join(projectDir, 'src'))) {
            nameSrcSetting['recipes/' + projectName] = 'src';
        }
        else {
            const testSrcDir = Path.join(projectDir, 'app');
            if (fs.existsSync(testSrcDir) && fs.statSync(testSrcDir))
                nameSrcSetting['recipes/' + projectName] = 'app';
            else
                nameSrcSetting['recipes/' + projectName] = '.';
        }
    }
    _.each(nameSrcSetting, (srcDir, recipeName) => {
        let srcDirs;
        if (!_.endsWith(recipeName, '-recipe'))
            recipeName += '-recipe';
        srcDirs = Array.isArray(srcDir) ? srcDir : [srcDir];
        const recipeDir = Path.join(projectDir, recipeName);
        srcDirs.forEach(srcDir => recipeSrcMapping[recipeDir] = Path.resolve(projectDir, srcDir));
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
        // let deps = require(Path.resolve(config().rootPath, 'package.json')).dependencies;
        // log.warn('delete ', require('../../../package.json').name);
        if (!deps)
            return;
        const drcpName = require('../../package.json').name;
        // delete deps[require('../../../package.json').name];
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
                    // 					log.error(`Weird things happened, I can't detect ${depName}, has it been installed?
                    // Please run command "drcp init" one more time, let me try again.`, e);
                    // throw e;
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
        console.log('[recipeManager]link recipe', recipeDir);
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpQ0FBaUM7QUFDakMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEMsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3Qix3REFBd0I7QUFDeEIscURBQStCO0FBQy9CLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQy9ELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2pELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUM1RSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsaUVBQW1EO0FBQ25ELE1BQU0sa0JBQWtCLEdBQUcsa0NBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUV0RCxJQUFJLFlBQW9CLENBQUM7QUFFekIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ3JCLFlBQVksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDO0FBVUgsU0FBZ0IsYUFBYSxDQUFDLFVBQTBDLEVBQ3ZFLFFBQTBFO0lBQzFFLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDM0IsUUFBUSxHQUFHLFNBQVMs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