// tslint:disable: max-line-length
import * as fs from 'fs-extra';
// import {map, distinctUntilChanged} from 'rxjs/operators';
// import {Observable} from 'rxjs';
// import {ofPayloadAction} from './store';
// import {PayloadAction} from '@reduxjs/toolkit';
// import {typeRootsFromPackages} from './package-utils';
import _ from 'lodash';
import log4js from 'log4js';
import Path from 'path';
import { setTsCompilerOptForNodePath } from './config-handler';
import { getProjectList, getState, updateGitIgnores } from './package-mgr';
import * as _recp from './recipe-manager';
import { closestCommonParentDir, getRootDir } from './utils/misc';
const log = log4js.getLogger('editor-helper');
const {parse} = require('comment-json');

export function updateTsconfigFileForEditor(wsKey: string) {
  // const srcPackages = getState().srcPackages;
            // const wsKey = workspaceKey(payload.dir);
  const ws = getState().workspaces.get(wsKey);
  if (ws == null)
    return;

  // const wsDir = Path.resolve(getRootDir(), wsKey);
  writeTsconfig4project(getProjectList(), Path.resolve(getRootDir(), wsKey));
  // return writeTsconfigForEachPackage(wsDir, pks,
  //   (file, content) => updateGitIgnores({file, content}));
}

function writeTsconfig4project(projectDirs: string[], workspaceDir: string) {
  const drcpDir = getState().linkedDrcp ? getState().linkedDrcp!.realPath :
    Path.dirname(require.resolve('@wfh/plink/package.json'));

  const recipeManager: typeof _recp = require('./recipe-manager');

  for (const proj of projectDirs) {
    const include: string[] = [];
    recipeManager.eachRecipeSrc(proj, (srcDir: string) => {
      let includeDir = Path.relative(proj, srcDir).replace(/\\/g, '/');
      if (includeDir && includeDir !== '/')
        includeDir += '/';
      include.push(includeDir + '**/*.ts');
      include.push(includeDir + '**/*.tsx');
    });
    const tsconfigFile = createTsConfig(proj, workspaceDir, drcpDir, include );
    const projDir = Path.resolve(proj);
    updateGitIgnores({file: Path.resolve(proj, '.gitignore'),
      lines: [
        Path.relative(projDir, tsconfigFile).replace(/\\/g, '/')
      ]
    });
    updateGitIgnores({
      file: Path.resolve(getRootDir(), '.gitignore'),
      lines: [Path.relative(getRootDir(), Path.resolve(workspaceDir, 'types')).replace(/\\/g, '/')]
    });
    // const gitIgnoreFile = findGitIngoreFile(proj);
    // if (gitIgnoreFile) {
    //   fs.readFile(gitIgnoreFile, 'utf8', (err, data) => {
    //     if (err) {
    //       log.error(err);
    //       return;
    //     }
    //     onGitIgnoreFileUpdate(gitIgnoreFile, data);
    //   });
    // }
  }
}

/**
 * 
 * @param pkgName 
 * @param dir 
 * @param workspace 
 * @param drcpDir 
 * @param include 
 * @return tsconfig file path
 */
function createTsConfig(dir: string, workspace: string | null, drcpDir: string,
  include = ['.']) {
  const tsjson: any = {
    extends: null,
    include
  };
  // tsjson.include = [];
  const proj = dir;
  tsjson.extends = Path.relative(proj, Path.resolve(drcpDir, 'wfh/tsconfig-base.json'));
  if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
    tsjson.extends = './' + tsjson.extends;
  }
  tsjson.extends = tsjson.extends.replace(/\\/g, '/');

  const pathMapping: {[key: string]: string[]} = {};
  const extraNodePath: string[] = [Path.resolve(dir, 'node_modules')];
  const commonDir = closestCommonParentDir(Array.from(getState().srcPackages.values()).map(el => el.realPath));

  for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
    const realDir = Path.relative(proj, realPath).replace(/\\/g, '/');
    pathMapping[name] = [realDir];
    pathMapping[name + '/*'] = [realDir + '/*'];
  }

  // if (pkgName !== '@wfh/plink') {
  drcpDir = Path.relative(proj, drcpDir).replace(/\\/g, '/');
  pathMapping['@wfh/plink'] = [drcpDir];
  pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
  // }

  tsjson.compilerOptions = {
    rootDir: Path.relative(proj, commonDir).replace(/\\/g, '/'),
      // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
    skipLibCheck: false,
    jsx: 'preserve',
    target: 'es2015',
    module: 'commonjs',
    declaration: false, // Important: to avoid https://github.com/microsoft/TypeScript/issues/29808#issuecomment-487811832
    paths: pathMapping
  };
  setTsCompilerOptForNodePath(proj, proj, tsjson.compilerOptions, {
    enableTypeRoots: true,
    workspaceDir: workspace != null ? workspace : undefined,
    // If user execute 'init <workspace>' in root directory, env.NODE_PATH does not contain workspace 
    // directory, in this case we need explicityly add node path 
    extraNodePath
  });
  const tsconfigFile = Path.resolve(proj, 'tsconfig.json');
  writeTsConfigFile(tsconfigFile, tsjson);
  return tsconfigFile;
}

function overrideTsConfig(src: any, target: any) {
  for (const key of Object.keys(src)) {
    if (key === 'compilerOptions') {
      if (target.compilerOptions)
        Object.assign(target.compilerOptions, src.compilerOptions);
    } else {
      target[key] = src[key];
    }
  }
}

function writeTsConfigFile(tsconfigFile: string, tsconfigOverrideSrc: any) {
  if (fs.existsSync(tsconfigFile)) {
    const existing = fs.readFileSync(tsconfigFile, 'utf8');
    const existingJson = parse(existing);
    overrideTsConfig(tsconfigOverrideSrc, existingJson);
    const newJsonStr = JSON.stringify(existingJson, null, '  ');
    if (newJsonStr !== existing) {
      log.info('Write ' + tsconfigFile);
      fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
    } else {
      log.debug(`${tsconfigFile} is not changed.`);
    }
  } else {
    log.info('Create ' + tsconfigFile);
    fs.writeFileSync(tsconfigFile, JSON.stringify(tsconfigOverrideSrc, null, '  '));
  }
}

// async function writeTsconfigForEachPackage(workspaceDir: string, pks: PackageInfo[],
//   onGitIgnoreFileUpdate: (file: string, content: string) => void) {

//   const drcpDir = getState().linkedDrcp ? getState().linkedDrcp!.realPath :
//     Path.dirname(require.resolve('@wfh/plink/package.json'));

//   const igConfigFiles = pks.map(pk => {
//     // commonPaths[0] = Path.resolve(pk.realPath, 'node_modules');
//     return createTsConfig(pk.name, pk.realPath, workspaceDir, drcpDir);
//   });

//   appendGitignore(igConfigFiles, onGitIgnoreFileUpdate);
// }

// function findGitIngoreFile(startDir: string): string | null {
//   let dir = startDir;
//   while (true) {
//     const test = Path.resolve(startDir, '.gitignore');
//     if (fs.existsSync(test)) {
//       return test;
//     }
//     const parent = Path.dirname(dir);
//     if (parent === dir)
//       return null;
//     dir = parent;
//   }
// }
