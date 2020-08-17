// tslint:disable:max-line-length

import * as _ from 'lodash';
import * as Path from 'path';
import gulp from 'gulp';
import * as fs from 'fs-extra';
import scanNodeModules from './utils/symlinks';
import findPackageJson from './package-mgr/find-package';
import * as rwPackageJson from './rwPackageJson';
import {actions as cleanActions} from './cmd/cli-clean';
const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
// const File = require('vinyl');
const through = require('through2');
const merge = require('merge2');
import config from './config';


// import {getInstance} from './package-json-guarder';
// const packageJsonGuarder = getInstance(config().rootPath);

// let linkListFile: string;

// config.done.then(() => {
//   linkListFile = config.resolve('destDir', 'link-list.json');
// });

let projectList: string[] = [];
export function setProjectList(list: string[]) {
  projectList = list;
}

// let cleanActions: ActionsType;
// cleanActionsProm.then(actions => cleanActions = actions);

export type EachRecipeSrcCallback = (srcDir: string, recipeDir: string | null, recipeName: string | null, projectDir: string) => void;
/**
 * Iterate src folder for component items
 * @param {string | string[]} projectDir optional, if not present or null, includes all project src folders
 * @param  {Function} callback (srcDir, recipeDir, recipeName): void
 */
export function eachRecipeSrc(callback: EachRecipeSrcCallback): void;
export function eachRecipeSrc(projectDir: string, callback: EachRecipeSrcCallback): void;
export function eachRecipeSrc(projectDir: string | EachRecipeSrcCallback,
  callback?: EachRecipeSrcCallback): void {
  if (arguments.length === 1) {
    callback = arguments[0];
    forProject(projectList);
  } else if (arguments.length === 2) {
    if (typeof projectDir === 'string' || Array.isArray(projectDir)) {
      forProject(projectDir);
    } else {
      forProject(projectList);
    }
  }

  function forProject(prjDirs: string[] | string) {
    ([] as string[]).concat(prjDirs).forEach(prjDir => {
      _.each(recipe2srcDirMapForPrj(prjDir), (srcDir, recipe) => onEachSrcRecipePair(prjDir, srcDir, recipe));
      const e2eDir = Path.join(prjDir, 'e2etest');
      if (fs.existsSync(e2eDir))
        callback!(e2eDir, null, null, prjDir);
    });
  }

  function onEachSrcRecipePair(prjDir: string, srcDir: string, recipeDir: string) {
    let recipeName: string | null = null;
    try {
      recipeName = require(Path.resolve(recipeDir, 'package.json')).name;
    } catch (e) {
      log.debug(`Can't read ${Path.resolve(recipeDir, 'package.json')}`);
    }
    callback!(srcDir, recipeDir, recipeName, prjDir);
  }
}

function recipe2srcDirMapForPrj(projectDir: string): {[recipeDir: string]: string} {
  const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
  const pkJsonFile = Path.resolve(projectDir, 'package.json');
  const recipeSrcMapping: {[recipe: string]: string} = {};
  let nameSrcSetting: {[key: string]: string} = {};

  let normalizedPrjName = Path.resolve(projectDir).replace(/[\/\\]/g, '.');
  normalizedPrjName = _.trim(normalizedPrjName, '.');
  if (fs.existsSync(pkJsonFile)) {
    const pkjson = require(pkJsonFile);
    if (pkjson.packages) {
      ([] as string[]).concat(pkjson.packages).forEach((pat) => {
        if (pat.endsWith('/**'))
          pat = pat.slice(0, -3);
        else if (pat.endsWith('/*'))
          pat = pat.slice(0, -2);
        pat = _.trimStart(pat, '.');
        nameSrcSetting[config.resolve(
          'destDir', `recipes/${pkjson.name}${pat.length > 0 ? '.' : ''}${pat.replace(/[\/\\]/g, '.')}.recipe`)] =
            Path.resolve(projectDir, pat);
      });
      return nameSrcSetting;
    }
  }
  if (fs.existsSync(srcRecipeMapFile)) {
    // legacy: read dr.recipes.json
    nameSrcSetting = JSON.parse(fs.readFileSync(srcRecipeMapFile, 'utf8'));
  } else {
    const projectName = fs.existsSync(pkJsonFile) ? require(pkJsonFile).name : Path.basename(projectDir);
    if (fs.existsSync(Path.join(projectDir, 'src'))) {
      nameSrcSetting['recipes/' + projectName] = 'src';
    } else {
      const testSrcDir = Path.join(projectDir, 'app');
      if (fs.existsSync(testSrcDir) && fs.statSync(testSrcDir).isDirectory())
        nameSrcSetting['recipes/' + projectName] = 'app';
      else
        nameSrcSetting['recipes/' + projectName] = '.';
    }
  }
  _.each(nameSrcSetting, (srcDir, recipeDir) => {
    let srcDirs: string[];
    if (!_.endsWith(recipeDir, '-recipe'))
      recipeDir += '-recipe';
    srcDirs = Array.isArray(srcDir) ? srcDir : [srcDir];
    const absRecipeDir = config.resolve('destDir', recipeDir);
    srcDirs.forEach(srcDir => recipeSrcMapping[absRecipeDir] = Path.resolve(projectDir, srcDir));
  });
  return recipeSrcMapping;
}
export type EachRecipeCallback = (recipeDir: string, isFromInstallation: boolean, jsonFileName: string) => void;

function eachDownloadedRecipe(callback: EachRecipeCallback, excludeRecipeSet?: Set<string>) {
  let srcRecipeSet: Set<string>;
  if (excludeRecipeSet) {
    srcRecipeSet = excludeRecipeSet;
  } else {
    srcRecipeSet = new Set();
    eachRecipeSrc((x, y, recipeName) => {
      if (recipeName) srcRecipeSet.add(recipeName);
    });
  }
  if (config().installedRecipes) {
    const regexList = (config().installedRecipes as string[]).map(s => new RegExp(s));
    const pkjson = require(Path.resolve(config().rootPath, 'package.json'));
    const deps = Object.assign({}, pkjson.dependencies || {}, pkjson.devDependencies || {});
    if (!deps)
      return;
    const drcpName = require('../../package.json').name;
    _.each(deps, function(ver, depName) {
      if (depName !== drcpName && !srcRecipeSet.has(depName) && _.some(regexList, regex => regex.test(depName))) {
        log.debug('looking for installed recipe: %s', depName);
        let p;
        try {
          p = Path.resolve(config().nodePath, depName);
          callback(p, true, 'package.json');
        } catch (e) {
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
export function eachRecipe(callback: EachRecipeCallback) {
  // const srcRecipeSet = new Set();
  eachRecipeSrc((srcDir, recipeDir, recipeName) => {
    // srcRecipeSet.add(recipeName);
    if (recipeDir)
      callback(recipeDir, false, 'package.json');
  });
  eachDownloadedRecipe(callback);
  // eachInstalledRecipe(callback);
}

/**
 * eachInstalledRecipe
 * @param callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
*/
// export function eachInstalledRecipe(callback: EachRecipeCallback) {
//   eachDownloadedRecipe(callback);
//   callback(config().rootPath, true, Path.relative(config().rootPath, packageJsonGuarder.getJsonFile()));
// }

export function link(onPkJsonFile: (filePath: string, recipeDir: string, proj: string) => void) {
  const streams: any[] = [];
  eachRecipeSrc(function(src, recipeDir, recipeName, proj) {
    // tslint:disable-next-line:no-console
    log.debug('[recipeManager]link recipe', recipeDir);
    streams.push(linkToRecipeFile(src, recipeDir!, (file, recipeDir) => onPkJsonFile(file, recipeDir, proj)));
  });
  return merge(streams)
  .pipe(through.obj(function(file: any, enc: string, next: () => void) {
    if (_.isArray(file)) {
      // linkFiles.push(...file);
      cleanActions.addWorkspaceFile(file);
    } else {
      log.debug('out: ' + file.path);
      this.push(file);
    }
    next();
  }, function flush(next: () => void) {
    next();
  }))
  .pipe(gulp.dest(config().rootPath))
  .on('error', function(err: Error) {
    log.error(err);
  });
}

/**
 * @return array of linked package's package.json file path
 */
export function linkComponentsAsync(cb: (prj: string, pkgJsonFile: string) => void) {
  // const pkJsonFiles: string[] = [];
  return new Promise<string[]>((resolve, reject) => {
    link((file, recipeDir, proj) => {
      // pkJsonFiles.push(file);
      cb(proj, file);
    })
    .on('end', () => resolve())
    .on('error', reject)
    .resume();
  });
}

export async function clean() {
  // await config.done;
  await scanNodeModules('all');
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
}

function linkToRecipeFile(srcDir: string, recipeDir: string,
  onPkJsonFile: (filePath: string, recipeDir: string) => void) {
  return gulp.src('.')
    .pipe(findPackageJson(srcDir, true))
    .pipe(through.obj(function(file: any, enc: string, next: (...arg: any[]) => void) {
      log.debug('Found recipeDir %s: file: %s', recipeDir, file.path);
      if (onPkJsonFile)
        onPkJsonFile(file.path, recipeDir);
      next(null, file);
    }))
    // .pipe(rwPackageJson.symbolicLinkPackages(config.resolve('destDir', 'links')))
    .pipe(rwPackageJson.symbolicLinkPackages(config.resolve('rootPath')))
    .pipe(rwPackageJson.addDependency(recipeDir))
    .on('error', function(err: Error) {
      log.error(err);
    });
}
