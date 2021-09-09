/* eslint-disable max-len */
/**
 * To avoid cyclic referecing, This file should not depends on package-mgr/index !!!
 */
import * as _ from 'lodash';
import * as Path from 'path';
import {from, Observable} from 'rxjs';
import * as fs from 'fs-extra';
import findPackageJson from './package-mgr/find-package';
// import * as rwPackageJson from './rwPackageJson';
import {map, mergeMap} from 'rxjs/operators';

let projectList: string[] = [];
let linkPatterns: Iterable<string> | undefined;

export function setProjectList(list: string[]) {
  projectList = list;
}

export function setLinkPatterns(list: Iterable<string>) {
  linkPatterns = list;
}

export type EachRecipeSrcCallback = (srcDir: string, projectDir: string) => void;
/**
 * @deprecated
 * Use allSrcDirs() instead.
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
      // const e2eDir = Path.join(prjDir, 'e2etest');
      // if (fs.existsSync(e2eDir))
      //   callback!(e2eDir, prjDir);
    });
  }
}

export function* allSrcDirs() {
  for (const projDir of projectList) {
    for (const srcDir of srcDirsOfProject(projDir)) {
      yield {srcDir, projDir};
    }
  }
  if (linkPatterns) {
    for (let pat of linkPatterns) {
      if (pat.endsWith('/**'))
        pat = pat.slice(0, -3);
      else if (pat.endsWith('/*'))
        pat = pat.slice(0, -2);
      pat = _.trimStart(pat, '.');
      yield {srcDir: pat};
    }
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
    const pkjson = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8'));
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

/**
 * @returns Observable of tuple [project, package.json file]
 */
export function scanPackages(): Observable<[string | undefined, string, string]> {
  return from(allSrcDirs()).pipe(
    mergeMap(({srcDir, projDir}) => findPackageJson(srcDir, false).pipe(
      map(jsonFile => [projDir, jsonFile, srcDir] as [string | undefined, string, string])
    ))
  );
}
