// tslint:disable:max-line-length
/**
 * To avoid circle referecing, This file should not depends on package-mgr/index !!!
 */
import * as _ from 'lodash';
import * as Path from 'path';
import {Observable, merge} from 'rxjs';
import * as fs from 'fs-extra';
import scanNodeModules from './utils/symlinks';
import findPackageJson from './package-mgr/find-package';
import * as rwPackageJson from './rwPackageJson';
import {map} from 'rxjs/operators';
// import {actions as cleanActions} from './cmd/cli-clean';
// const log = require('log4js').getLogger('wfh.' + Path.basename(__filename));
// import config from './config';
// import {getRootDir} from './utils';

let projectList: string[] = [];
// let workspaceDirs: string[] = [];

export function setProjectList(list: string[]) {
  projectList = list;
}

// export function setWorkspaceDirs(list: string[]) {
//   workspaceDirs = list;
// }

// let cleanActions: ActionsType;
// cleanActionsProm.then(actions => cleanActions = actions);

export type EachRecipeSrcCallback = (srcDir: string, projectDir: string) => void;
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
      for (const srcDir of srcDirsOfProject(prjDir)) {
        callback!(srcDir, prjDir);
      }
      const e2eDir = Path.join(prjDir, 'e2etest');
      if (fs.existsSync(e2eDir))
        callback!(e2eDir, prjDir);
    });
  }
}

function* srcDirsOfProject(projectDir: string) {
  const srcRecipeMapFile = Path.resolve(projectDir, 'dr.recipes.json');
  const pkJsonFile = Path.resolve(projectDir, 'package.json');
  // const recipeSrcMapping: {[recipe: string]: string} = {};
  let nameSrcSetting: {[key: string]: string} = {};

  let normalizedPrjName = Path.resolve(projectDir).replace(/[\/\\]/g, '.');
  normalizedPrjName = _.trim(normalizedPrjName, '.');
  if (fs.existsSync(pkJsonFile)) {
    const pkjson = require(pkJsonFile);
    if (pkjson.packages) {
      for (let pat of ([] as string[]).concat(pkjson.packages)) {
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
  for (const srcDir of Object.values(nameSrcSetting)) {
    yield srcDir;
  }
  return;
}

export type EachRecipeCallback = (recipeDir: string,
  isFromInstallation: boolean,
  jsonFileName: string,
  jsonFileContent: string) => void;

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
export function linkComponentsAsync(symlinksDir: string) {
  // const pkJsonFiles: string[] = [];
  const obs: Observable<{proj: string, jsonFile: string, json: any}>[] = [];
  eachRecipeSrc((src, proj) => {
    obs.push(
      findPackageJson(src, true).pipe(
        rwPackageJson.symbolicLinkPackages(symlinksDir),
        map(([jsonFile, json]) => {
          return {proj, jsonFile, json};
        })
      ));
  });
  return merge(...obs);
}

export async function clean() {
  await scanNodeModules('all');
}


