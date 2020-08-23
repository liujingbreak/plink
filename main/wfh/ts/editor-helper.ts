// tslint:disable: max-line-length
import Path from 'path';
import * as _fs from 'fs-extra';
import * as _recp from './recipe-manager';
import {getState, PackageInfo} from './package-mgr';
import {EOL} from 'os';
import {setTsCompilerOpt} from './config-handler';
import log4js from 'log4js';
// import {map, distinctUntilChanged} from 'rxjs/operators';
import _ from 'lodash';
const log = log4js.getLogger('editor-helper');
const {parse} = require('comment-json');

export function writeTsconfig4project(projectDirs: string[], onGitIgnoreFileUpdate: (file: string, content: string) => void) {
  const drcpDir = getState().linkedDrcp ? getState().linkedDrcp!.realPath :
    Path.dirname(require.resolve('dr-comp-package/package.json'));

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
    createTsConfig(
      {name: '', realPath: proj},
      null,
      drcpDir,
      include
    );

    const gitIgnoreFile = findGitIngoreFile(proj);
    if (gitIgnoreFile) {
      _fs.readFile(gitIgnoreFile, 'utf8', (err, data) => {
        if (err) {
          log.error(err);
          return;
        }
        onGitIgnoreFileUpdate(gitIgnoreFile, data);
      });
    }
  }
}

export async function writeTsconfigForEachPackage(workspaceDir: string, pks: PackageInfo[],
  onGitIgnoreFileUpdate: (file: string, content: string) => void) {
  // const commonPaths = [
  //   '',
  //   Path.resolve(workspaceDir, 'node_modules'),
  //   Path.resolve(getRootDir(), 'node_modules')
  // ];

  const drcpDir = getState().linkedDrcp ? getState().linkedDrcp!.realPath :
    Path.dirname(require.resolve('dr-comp-package/package.json'));

  const igConfigFiles = pks.map(pk => {
    // commonPaths[0] = Path.resolve(pk.realPath, 'node_modules');
    return createTsConfig(pk, workspaceDir, drcpDir);
  });

  appendGitIgnoreFiles(igConfigFiles, onGitIgnoreFileUpdate);
}


function appendGitIgnoreFiles(ignoreTsConfigFiles: string[],
  onGitIgnoreFileUpdate: Parameters<typeof writeTsconfigForEachPackage>[2]) {
  const gitFolderToIngoreFile: {dir: string; ignoreFile: string, ignoreItems: string[]} [] =
    Object.entries(getState().gitIgnores).map(([file, content]) => {
      return {
        dir: Path.dirname(file) + Path.sep,
        ignoreFile: file,
        ignoreItems: []
      };
    });

  for (const tsconfigFile of ignoreTsConfigFiles) {
    gitFolderToIngoreFile.some(({dir, ignoreFile, ignoreItems}) => {
      if (tsconfigFile.startsWith(dir)) {
        ignoreItems.push(Path.relative(dir, tsconfigFile).replace(/\\/g, '/'));
        return true;
      }
      return false;
    });
  }

  for (const {ignoreFile, ignoreItems} of gitFolderToIngoreFile) {
    const origContent = getState().gitIgnores[ignoreFile];
    const itemsToAppend = _.difference(ignoreItems,
      origContent.split(/(?:\n\r?)+/).filter(line => line.trim().length > 0));
    if (itemsToAppend.length > 0)
      onGitIgnoreFileUpdate(ignoreFile, origContent + EOL + itemsToAppend.join(EOL));
  }
}

function findGitIngoreFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const test = Path.resolve(startDir, '.gitignore');
    if (_fs.existsSync(test)) {
      return test;
    }
    const parent = Path.dirname(dir);
    if (parent === dir)
      return null;
    dir = parent;
  }
}

function createTsConfig(pkg: {name: string, realPath: string}, workspace: string | null, drcpDir: string, include = ['.']) {
  const tsjson: any = {
    extends: null,
    include
  };
  // tsjson.include = [];
  const proj = pkg.realPath;
  tsjson.extends = Path.relative(proj, Path.resolve(drcpDir, 'wfh/tsconfig-base.json'));
  if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
    tsjson.extends = './' + tsjson.extends;
  }
  tsjson.extends = tsjson.extends.replace(/\\/g, '/');

  const pathMapping: {[key: string]: string[]} = {};
  for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
    if (pkg.name === name)
      continue;
    const realDir = Path.relative(proj, realPath).replace(/\\/g, '/');
    pathMapping[name] = [realDir];
    pathMapping[name + '/*'] = [realDir + '/*'];
  }

  if (pkg.name !== 'dr-comp-package') {
    drcpDir = Path.relative(proj, drcpDir).replace(/\\/g, '/');
    pathMapping['dr-comp-package'] = [drcpDir];
    pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
  }

  tsjson.compilerOptions = {
    rootDir: '.',
      // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
    skipLibCheck: false,
    jsx: 'preserve',
    noImplicitAny: true,
    target: 'es2015',
    module: 'commonjs',
    paths: pathMapping
  };
  setTsCompilerOpt(proj, tsjson.compilerOptions, {
    setTypeRoots: true,
    // If user execute 'init <workspace>' in root directory, env.NODE_PATH does not contain workspace 
    // directory, in this case we need explicityly add node path 
    extraNodePath: workspace ? [Path.resolve(workspace, 'node_modules')] : undefined
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
  if (_fs.existsSync(tsconfigFile)) {
    const existing = _fs.readFileSync(tsconfigFile, 'utf8');
    const existingJson = parse(existing);
    overrideTsConfig(tsconfigOverrideSrc, existingJson);
    const newJsonStr = JSON.stringify(existingJson, null, '  ');
    if (newJsonStr !== existing) {
      log.info('Write ' + tsconfigFile);
      _fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
    } else {
      log.info(`${tsconfigFile} is not changed.`);
    }
  } else {
    log.info('Create ' + tsconfigFile);
    _fs.writeFileSync(tsconfigFile, JSON.stringify(tsconfigOverrideSrc, null, '  '));
  }
}

