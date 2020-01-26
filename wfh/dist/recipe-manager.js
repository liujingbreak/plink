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
    return gulp_1.default.src('.')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZWNpcGUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaUNBQWlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdqQywwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLGdEQUF3QjtBQUN4Qiw2Q0FBK0I7QUFDL0IsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDL0QsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hDLE1BQU0sTUFBTSxHQUFlLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUVwRCxpRUFBbUQ7QUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxrQ0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBRXRELElBQUksWUFBb0IsQ0FBQztBQUV6QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDcEIsWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUM7QUFVSCxTQUFnQixhQUFhLENBQUMsVUFBMEMsRUFDdEUsUUFBd0Y7SUFDeEYsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMx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LyB0c2xpbnQ6ZGlzYWJsZTptYXgtbGluZS1sZW5ndGhcblxuaW1wb3J0IHtEcmNwQ29uZmlnfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ3VscCBmcm9tICdndWxwJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmNvbnN0IGZpbmRQYWNrYWdlSnNvbiA9IHJlcXVpcmUoJy4uL2xpYi9ndWxwL2ZpbmRQYWNrYWdlSnNvbicpO1xuY29uc3QgcndQYWNrYWdlSnNvbiA9IHJlcXVpcmUoJy4vcndQYWNrYWdlSnNvbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCd3ZmguJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSkpO1xuY29uc3QgRmlsZSA9IHJlcXVpcmUoJ3ZpbnlsJyk7XG5jb25zdCB0aHJvdWdoID0gcmVxdWlyZSgndGhyb3VnaDInKTtcbmNvbnN0IG1lcmdlID0gcmVxdWlyZSgnbWVyZ2UyJyk7XG5jb25zdCBjb25maWc6IERyY3BDb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5cbmltcG9ydCB7Z2V0SW5zdGFuY2V9IGZyb20gJy4vcGFja2FnZS1qc29uLWd1YXJkZXInO1xuY29uc3QgcGFja2FnZUpzb25HdWFyZGVyID0gZ2V0SW5zdGFuY2UocHJvY2Vzcy5jd2QoKSk7XG5cbmxldCBsaW5rTGlzdEZpbGU6IHN0cmluZztcblxuY29uZmlnLmRvbmUudGhlbigoKSA9PiB7XG4gIGxpbmtMaXN0RmlsZSA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2xpbmstbGlzdC5qc29uJyk7XG59KTtcblxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZVNyY0NhbGxiYWNrID0gKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZywgcmVjaXBlTmFtZTogc3RyaW5nKSA9PiB2b2lkO1xuLyoqXG4gKiBJdGVyYXRlIHNyYyBmb2xkZXIgZm9yIGNvbXBvbmVudCBpdGVtc1xuICogQHBhcmFtIHtzdHJpbmcgfCBzdHJpbmdbXX0gcHJvamVjdERpciBvcHRpb25hbCwgaWYgbm90IHByZXNlbnQgb3IgbnVsbCwgaW5jbHVkZXMgYWxsIHByb2plY3Qgc3JjIGZvbGRlcnNcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYWxsYmFjayAoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpOiB2b2lkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKGNhbGxiYWNrOiBFYWNoUmVjaXBlU3JjQ2FsbGJhY2spOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGVhY2hSZWNpcGVTcmMocHJvamVjdERpcjogc3RyaW5nLCBjYWxsYmFjazogRWFjaFJlY2lwZVNyY0NhbGxiYWNrKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBlYWNoUmVjaXBlU3JjKHByb2plY3REaXI6IHN0cmluZyB8IEVhY2hSZWNpcGVTcmNDYWxsYmFjayxcbiAgY2FsbGJhY2s/OiAoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nIHwgbnVsbCwgcmVjaXBlTmFtZTogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZCk6IHZvaWQge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICAgIGZvclByb2plY3QoY29uZmlnKCkucHJvamVjdExpc3QpO1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBpZiAodHlwZW9mIHByb2plY3REaXIgPT09ICdzdHJpbmcnIHx8IEFycmF5LmlzQXJyYXkocHJvamVjdERpcikpIHtcbiAgICAgIGZvclByb2plY3QocHJvamVjdERpcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvclByb2plY3QoY29uZmlnKCkucHJvamVjdExpc3QpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZvclByb2plY3QocHJqRGlyczogc3RyaW5nW10gfCBzdHJpbmcpIHtcbiAgICAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChwcmpEaXJzKS5mb3JFYWNoKHByakRpciA9PiB7XG4gICAgICBfLmVhY2gocmVjaXBlMnNyY0Rpck1hcEZvclByaihwcmpEaXIpLCBvbkVhY2hTcmNSZWNpcGVQYWlyKTtcbiAgICAgIGNvbnN0IGUyZURpciA9IFBhdGguam9pbihwcmpEaXIsICdlMmV0ZXN0Jyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhlMmVEaXIpKVxuICAgICAgICBjYWxsYmFjayEoZTJlRGlyLCBudWxsLCBudWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uRWFjaFNyY1JlY2lwZVBhaXIoc3JjRGlyOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG4gICAgbGV0IHJlY2lwZU5hbWU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICByZWNpcGVOYW1lID0gcmVxdWlyZShQYXRoLnJlc29sdmUocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpLm5hbWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmRlYnVnKGBDYW4ndCByZWFkICR7UGF0aC5yZXNvbHZlKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpfWApO1xuICAgIH1cbiAgICBjYWxsYmFjayEoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlY2lwZTJzcmNEaXJNYXBGb3JQcmoocHJvamVjdERpcjogc3RyaW5nKToge1tyZWNpcGVEaXI6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCBzcmNSZWNpcGVNYXBGaWxlID0gUGF0aC5yZXNvbHZlKHByb2plY3REaXIsICdkci5yZWNpcGVzLmpzb24nKTtcbiAgY29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHJlY2lwZVNyY01hcHBpbmc6IHtbcmVjaXBlOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGxldCBuYW1lU3JjU2V0dGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICBsZXQgbm9ybWFsaXplZFByak5hbWUgPSBQYXRoLnJlc29sdmUocHJvamVjdERpcikucmVwbGFjZSgvW1xcL1xcXFxdL2csICcuJyk7XG4gIG5vcm1hbGl6ZWRQcmpOYW1lID0gXy50cmltKG5vcm1hbGl6ZWRQcmpOYW1lLCAnLicpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhwa0pzb25GaWxlKSkge1xuICAgIGNvbnN0IHBranNvbiA9IHJlcXVpcmUocGtKc29uRmlsZSk7XG4gICAgaWYgKHBranNvbi5wYWNrYWdlcykge1xuICAgICAgKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocGtqc29uLnBhY2thZ2VzKS5mb3JFYWNoKChwYXQpID0+IHtcbiAgICAgICAgaWYgKHBhdC5lbmRzV2l0aCgnLyoqJykpXG4gICAgICAgICAgcGF0ID0gcGF0LnNsaWNlKDAsIC0zKTtcbiAgICAgICAgZWxzZSBpZiAocGF0LmVuZHNXaXRoKCcvKicpKVxuICAgICAgICAgIHBhdCA9IHBhdC5zbGljZSgwLCAtMik7XG4gICAgICAgIHBhdCA9IF8udHJpbVN0YXJ0KHBhdCwgJy4nKTtcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbY29uZmlnLnJlc29sdmUoXG4gICAgICAgICAgJ2Rlc3REaXInLCBgcmVjaXBlcy8ke3BranNvbi5uYW1lfSR7cGF0Lmxlbmd0aCA+IDAgPyAnLicgOiAnJ30ke3BhdC5yZXBsYWNlKC9bXFwvXFxcXF0vZywgJy4nKX0ucmVjaXBlYCldID1cbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBwYXQpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmFtZVNyY1NldHRpbmc7XG4gICAgfVxuICB9XG4gIGlmIChmcy5leGlzdHNTeW5jKHNyY1JlY2lwZU1hcEZpbGUpKSB7XG4gICAgLy8gbGVnYWN5OiByZWFkIGRyLnJlY2lwZXMuanNvblxuICAgIG5hbWVTcmNTZXR0aW5nID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoc3JjUmVjaXBlTWFwRmlsZSwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBmcy5leGlzdHNTeW5jKHBrSnNvbkZpbGUpID8gcmVxdWlyZShwa0pzb25GaWxlKS5uYW1lIDogUGF0aC5iYXNlbmFtZShwcm9qZWN0RGlyKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocHJvamVjdERpciwgJ3NyYycpKSkge1xuICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICdzcmMnO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZXN0U3JjRGlyID0gUGF0aC5qb2luKHByb2plY3REaXIsICdhcHAnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3RTcmNEaXIpICYmIGZzLnN0YXRTeW5jKHRlc3RTcmNEaXIpLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgIG5hbWVTcmNTZXR0aW5nWydyZWNpcGVzLycgKyBwcm9qZWN0TmFtZV0gPSAnYXBwJztcbiAgICAgIGVsc2VcbiAgICAgICAgbmFtZVNyY1NldHRpbmdbJ3JlY2lwZXMvJyArIHByb2plY3ROYW1lXSA9ICcuJztcbiAgICB9XG4gIH1cbiAgXy5lYWNoKG5hbWVTcmNTZXR0aW5nLCAoc3JjRGlyLCByZWNpcGVEaXIpID0+IHtcbiAgICBsZXQgc3JjRGlyczogc3RyaW5nW107XG4gICAgaWYgKCFfLmVuZHNXaXRoKHJlY2lwZURpciwgJy1yZWNpcGUnKSlcbiAgICAgIHJlY2lwZURpciArPSAnLXJlY2lwZSc7XG4gICAgc3JjRGlycyA9IEFycmF5LmlzQXJyYXkoc3JjRGlyKSA/IHNyY0RpciA6IFtzcmNEaXJdO1xuICAgIGNvbnN0IGFic1JlY2lwZURpciA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgcmVjaXBlRGlyKTtcbiAgICBzcmNEaXJzLmZvckVhY2goc3JjRGlyID0+IHJlY2lwZVNyY01hcHBpbmdbYWJzUmVjaXBlRGlyXSA9IFBhdGgucmVzb2x2ZShwcm9qZWN0RGlyLCBzcmNEaXIpKTtcbiAgfSk7XG4gIHJldHVybiByZWNpcGVTcmNNYXBwaW5nO1xufVxuZXhwb3J0IHR5cGUgRWFjaFJlY2lwZUNhbGxiYWNrID0gKHJlY2lwZURpcjogc3RyaW5nLCBpc0Zyb21JbnN0YWxsYXRpb246IGJvb2xlYW4sIGpzb25GaWxlTmFtZTogc3RyaW5nKSA9PiB2b2lkO1xuXG5mdW5jdGlvbiBlYWNoRG93bmxvYWRlZFJlY2lwZShjYWxsYmFjazogRWFjaFJlY2lwZUNhbGxiYWNrLCBleGNsdWRlUmVjaXBlU2V0PzogU2V0PHN0cmluZz4pIHtcbiAgbGV0IHNyY1JlY2lwZVNldDogU2V0PHN0cmluZz47XG4gIGlmIChleGNsdWRlUmVjaXBlU2V0KSB7XG4gICAgc3JjUmVjaXBlU2V0ID0gZXhjbHVkZVJlY2lwZVNldDtcbiAgfSBlbHNlIHtcbiAgICBzcmNSZWNpcGVTZXQgPSBuZXcgU2V0KCk7XG4gICAgZWFjaFJlY2lwZVNyYygoeCwgeSwgcmVjaXBlTmFtZSkgPT4ge1xuICAgICAgaWYgKHJlY2lwZU5hbWUpIHNyY1JlY2lwZVNldC5hZGQocmVjaXBlTmFtZSk7XG4gICAgfSk7XG4gIH1cbiAgaWYgKGNvbmZpZygpLmluc3RhbGxlZFJlY2lwZXMpIHtcbiAgICBjb25zdCByZWdleExpc3QgPSAoY29uZmlnKCkuaW5zdGFsbGVkUmVjaXBlcyBhcyBzdHJpbmdbXSkubWFwKHMgPT4gbmV3IFJlZ0V4cChzKSk7XG4gICAgY29uc3QgcGtqc29uID0gcmVxdWlyZShQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgY29uc3QgZGVwcyA9IE9iamVjdC5hc3NpZ24oe30sIHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30sIHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuICAgIGlmICghZGVwcylcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBkcmNwTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG4gICAgXy5lYWNoKGRlcHMsIGZ1bmN0aW9uKHZlciwgZGVwTmFtZSkge1xuICAgICAgaWYgKGRlcE5hbWUgIT09IGRyY3BOYW1lICYmICFzcmNSZWNpcGVTZXQuaGFzKGRlcE5hbWUpICYmIF8uc29tZShyZWdleExpc3QsIHJlZ2V4ID0+IHJlZ2V4LnRlc3QoZGVwTmFtZSkpKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnbG9va2luZyBmb3IgaW5zdGFsbGVkIHJlY2lwZTogJXMnLCBkZXBOYW1lKTtcbiAgICAgICAgbGV0IHA7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcCA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5ub2RlUGF0aCwgZGVwTmFtZSk7XG4gICAgICAgICAgY2FsbGJhY2socCwgdHJ1ZSwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLmluZm8oYCR7ZGVwTmFtZX0gc2VlbXMgdG8gYmUgbm90IGluc3RhbGxlZGApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAbmFtZSBlYWNoUmVjaXBlXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24ocmVjaXBlRGlyLCBpc0Zyb21JbnN0YWxsYXRpb24sIGpzb25GaWxlTmFtZSA9ICdwYWNrYWdlLmpzb24nKTogdm9pZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWFjaFJlY2lwZShjYWxsYmFjazogRWFjaFJlY2lwZUNhbGxiYWNrKSB7XG4gIC8vIGNvbnN0IHNyY1JlY2lwZVNldCA9IG5ldyBTZXQoKTtcbiAgZWFjaFJlY2lwZVNyYygoc3JjRGlyLCByZWNpcGVEaXIsIHJlY2lwZU5hbWUpID0+IHtcbiAgICAvLyBzcmNSZWNpcGVTZXQuYWRkKHJlY2lwZU5hbWUpO1xuICAgIGlmIChyZWNpcGVEaXIpXG4gICAgICBjYWxsYmFjayhyZWNpcGVEaXIsIGZhbHNlLCAncGFja2FnZS5qc29uJyk7XG4gIH0pO1xuICBlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrKTtcbn1cblxuLyoqXG4gKiBlYWNoSW5zdGFsbGVkUmVjaXBlXG4gKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24ocmVjaXBlRGlyLCBpc0Zyb21JbnN0YWxsYXRpb24sIGpzb25GaWxlTmFtZSA9ICdwYWNrYWdlLmpzb24nKTogdm9pZFxuKi9cbmV4cG9ydCBmdW5jdGlvbiBlYWNoSW5zdGFsbGVkUmVjaXBlKGNhbGxiYWNrOiBFYWNoUmVjaXBlQ2FsbGJhY2spIHtcbiAgZWFjaERvd25sb2FkZWRSZWNpcGUoY2FsbGJhY2spO1xuICBjYWxsYmFjayhjb25maWcoKS5yb290UGF0aCwgdHJ1ZSwgUGF0aC5yZWxhdGl2ZShjb25maWcoKS5yb290UGF0aCwgcGFja2FnZUpzb25HdWFyZGVyLmdldEpzb25GaWxlKCkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmsob25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3Qgc3RyZWFtczogYW55W10gPSBbXTtcbiAgbGV0IGxpbmtGaWxlcyA9IGZzLmV4aXN0c1N5bmMobGlua0xpc3RGaWxlKSA/IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxpbmtMaXN0RmlsZSwgJ3V0ZjgnKSkgOiBbXTtcbiAgZWFjaFJlY2lwZVNyYyhmdW5jdGlvbihzcmMsIHJlY2lwZURpcikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgbG9nLmRlYnVnKCdbcmVjaXBlTWFuYWdlcl1saW5rIHJlY2lwZScsIHJlY2lwZURpcik7XG4gICAgc3RyZWFtcy5wdXNoKGxpbmtUb1JlY2lwZUZpbGUoc3JjLCByZWNpcGVEaXIsIG9uUGtKc29uRmlsZSkpO1xuICB9KTtcbiAgcmV0dXJuIG1lcmdlKHN0cmVhbXMpXG4gIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGU6IGFueSwgZW5jOiBzdHJpbmcsIG5leHQ6ICgpID0+IHZvaWQpIHtcbiAgICBpZiAoXy5pc0FycmF5KGZpbGUpKSB7XG4gICAgICBsaW5rRmlsZXMucHVzaCguLi5maWxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKCdvdXQ6ICcgKyBmaWxlLnBhdGgpO1xuICAgICAgdGhpcy5wdXNoKGZpbGUpO1xuICAgIH1cbiAgICBuZXh0KCk7XG4gIH0sIGZ1bmN0aW9uIGZsdXNoKG5leHQ6ICgpID0+IHZvaWQpIHtcbiAgICBsaW5rRmlsZXMgPSBfLnVuaXEobGlua0ZpbGVzKTtcbiAgICBjb25zdCBsaW5rRmlsZVRyYWNrID0gbmV3IEZpbGUoe1xuICAgICAgYmFzZTogUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoKSxcbiAgICAgIHBhdGg6IFBhdGgucmVsYXRpdmUoY29uZmlnKCkucm9vdFBhdGgsIGxpbmtMaXN0RmlsZSksXG4gICAgICBjb250ZW50czogbmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShsaW5rRmlsZXMsIG51bGwsICcgJykpXG4gICAgfSk7XG4gICAgdGhpcy5wdXNoKGxpbmtGaWxlVHJhY2spO1xuICAgIGxvZy5kZWJ1Zygnb3V0OiAnICsgbGlua0ZpbGVUcmFjay5wYXRoKTtcbiAgICBuZXh0KCk7XG4gIH0pKVxuICAucGlwZShndWxwLmRlc3QoY29uZmlnKCkucm9vdFBhdGgpKVxuICAub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyOiBFcnJvcikge1xuICAgIGxvZy5lcnJvcihlcnIpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBAcmV0dXJuIGFycmF5IG9mIGxpbmtlZCBwYWNrYWdlJ3MgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICovXG5leHBvcnQgZnVuY3Rpb24gbGlua0NvbXBvbmVudHNBc3luYygpIHtcbiAgY29uc3QgcGtKc29uRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGluayhmaWxlID0+IHBrSnNvbkZpbGVzLnB1c2goZmlsZSkpXG4gICAgLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKHBrSnNvbkZpbGVzKSlcbiAgICAub24oJ2Vycm9yJywgcmVqZWN0KVxuICAgIC5yZXN1bWUoKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbigpIHtcbiAgYXdhaXQgY29uZmlnLmRvbmU7XG4gIGxpbmtMaXN0RmlsZSA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ2xpbmstbGlzdC5qc29uJyk7XG4gIGNvbnN0IHJlY2lwZXM6IHN0cmluZ1tdID0gW107XG4gIGxldCByZW1vdmFsUHJvbXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICBpZiAoZnMuZXhpc3RzU3luYyhsaW5rTGlzdEZpbGUpKSB7XG4gICAgY29uc3QgbGlzdDogc3RyaW5nW10gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsaW5rTGlzdEZpbGUsICd1dGY4JykpO1xuICAgIHJlbW92YWxQcm9tcyA9IGxpc3QubWFwKGxpbmtQYXRoID0+IHtcbiAgICAgIGxvZy5pbmZvKCdSZW1vdmluZyBzeW1ib2xpYyBsaW5rIGZpbGUgJXMnLCBsaW5rUGF0aCk7XG4gICAgICByZXR1cm4gZnMucmVtb3ZlKFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgbGlua1BhdGgpKTtcbiAgICB9KTtcbiAgfVxuICBhd2FpdCBQcm9taXNlLmFsbChyZW1vdmFsUHJvbXMpO1xuXG4gIGVhY2hSZWNpcGVTcmMoZnVuY3Rpb24oc3JjOiBzdHJpbmcsIHJlY2lwZURpcjogc3RyaW5nKSB7XG4gICAgaWYgKHJlY2lwZURpcilcbiAgICAgIHJlY2lwZXMucHVzaChQYXRoLmpvaW4ocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpO1xuICB9KTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCBqKSA9PiB7XG4gICAgZ3VscC5zcmMocmVjaXBlcywge2Jhc2U6IGNvbmZpZygpLnJvb3RQYXRofSlcbiAgICAucGlwZShyd1BhY2thZ2VKc29uLnJlbW92ZURlcGVuZGVuY3koKSlcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuYzogc3RyaW5nLCBuZXh0OiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcbiAgICAgIGxvZy5kZWJ1Zygnb3V0OiAnICsgZmlsZS5wYXRoKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLnBpcGUoZ3VscC5kZXN0KGNvbmZpZygpLnJvb3RQYXRoKSlcbiAgICAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSlcbiAgICAub24oJ2Vycm9yJywgaik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBsaW5rVG9SZWNpcGVGaWxlKHNyY0Rpcjogc3RyaW5nLCByZWNpcGVEaXI6IHN0cmluZywgb25Qa0pzb25GaWxlOiAoZmlsZVBhdGg6IHN0cmluZywgcmVjaXBlRGlyOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgcmV0dXJuIGd1bHAuc3JjKCcuJylcbiAgICAucGlwZShmaW5kUGFja2FnZUpzb24oc3JjRGlyLCB0cnVlKSlcbiAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlOiBhbnksIGVuYzogc3RyaW5nLCBuZXh0OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZCkge1xuICAgICAgbG9nLmRlYnVnKCdGb3VuZCByZWNpcGVEaXIgJXM6IGZpbGU6ICVzJywgcmVjaXBlRGlyLCBmaWxlLnBhdGgpO1xuICAgICAgaWYgKG9uUGtKc29uRmlsZSlcbiAgICAgICAgb25Qa0pzb25GaWxlKGZpbGUucGF0aCwgcmVjaXBlRGlyKTtcbiAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgfSkpXG4gICAgLy8gLnBpcGUocndQYWNrYWdlSnNvbi5zeW1ib2xpY0xpbmtQYWNrYWdlcyhjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICdsaW5rcycpKSlcbiAgICAucGlwZShyd1BhY2thZ2VKc29uLnN5bWJvbGljTGlua1BhY2thZ2VzKGNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcpKSlcbiAgICAucGlwZShyd1BhY2thZ2VKc29uLmFkZERlcGVuZGVuY3kocmVjaXBlRGlyKSlcbiAgICAub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyOiBFcnJvcikge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgfSk7XG59XG5cbiJdfQ==