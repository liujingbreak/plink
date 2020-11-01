// tslint:disable: max-line-length
const gulpTs = require('gulp-typescript');
import chalk from 'chalk';
/// <reference path="types.d.ts" />
import * as packageUtils from './package-utils';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import {sep, resolve, join, relative} from 'path';
import ts from 'typescript';
import File from 'vinyl';
import {getTscConfigOfPkg, PackageTsDirs, closestCommonParentDir} from './utils/misc';
import {CompilerOptions} from 'typescript';
import config from './config';
import {setTsCompilerOptForNodePath, CompilerOptions as RequiredCompilerOptions} from './config-handler';
import {DirTree} from 'require-injector/dist/dir-tree';
import {getState, workspaceKey} from './package-mgr';
import log4js from 'log4js';
import * as sourcemaps from 'gulp-sourcemaps';

// import Path from 'path';
const gulp = require('gulp');
const through = require('through2');
const chokidar = require('chokidar');
const merge = require('merge2');
// const sourcemaps = require('gulp-sourcemaps');

const log = log4js.getLogger('wfh.typescript');
// exports.init = init;
const root = config().rootPath;
// const nodeModules = join(root, 'node_modules');

export interface TscCmdParam {
  package?: string[];
  project?: string[];
  watch?: boolean;
  sourceMap?: string;
  jsx?: boolean;
  ed?: boolean;
  compileOptions?: {[key in keyof CompilerOptions]?: any};
}

interface ComponentDirInfo extends PackageTsDirs {
  pkgDir: string;
}

type EmitList = Array<[string, number]>;

/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
export function tsc(argv: TscCmdParam, onCompiled?: (emitted: EmitList) => void) {
  // const possibleSrcDirs = ['isom', 'ts'];
  const compGlobs: string[] = [];
  // var compStream = [];
  const compDirInfo: Map<string, ComponentDirInfo> = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
  const baseTsconfigFile = require.resolve('../tsconfig-base.json');
  const baseTsconfig = ts.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'));
  if (baseTsconfig.error) {
    console.error(baseTsconfig.error);
    throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile);
  }

  let baseCompilerOptions = baseTsconfig.config.compilerOptions;

  if (argv.jsx) {
    const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
    const tsxTsconfig = ts.parseConfigFileTextToJson(baseTsconfigFile2, fs.readFileSync(baseTsconfigFile2, 'utf8'));
    if (tsxTsconfig.error) {
      console.error(tsxTsconfig.error);
      throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile2);
    }
    baseCompilerOptions = {...baseCompilerOptions, ...tsxTsconfig.config.compilerOptions};
  }

  let promCompile = Promise.resolve( [] as EmitList);
  const packageDirTree = new DirTree<ComponentDirInfo>();

  let countPkg = 0;
  if (argv.package && argv.package.length > 0)
    packageUtils.findAllPackages(argv.package, onComponent, 'src');
  else if (argv.project && argv.project.length > 0) {
    packageUtils.findAllPackages(onComponent, 'src', argv.project);
  } else {
    for (const pkg of packageUtils.packages4Workspace(process.cwd(), false)) {
      onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath);
    }
  }

  if (countPkg === 0) {
    throw new Error('No available srouce package found in current workspace');
  }
  const commonRootDir = closestCommonParentDir(Array.from(compDirInfo.values()).map(el => el.pkgDir));
  for (const info of compDirInfo.values()) {
    const treePath = relative(commonRootDir, info.pkgDir);
    packageDirTree.putData(treePath, info);
  }
  const destDir = commonRootDir.replace(/\\/g, '/');
  const compilerOptions: RequiredCompilerOptions = {
    ...baseCompilerOptions,
    // typescript: require('typescript'),
    // Compiler options
    importHelpers: false,
    declaration: true,
    /**
     * for gulp-sourcemaps usage:
     *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
     */
    outDir: destDir,
    rootDir: destDir,
    skipLibCheck: true,
    inlineSourceMap: argv.sourceMap === 'inline',
    sourceMap: true,
    inlineSources: argv.sourceMap === 'inline',
    emitDeclarationOnly: argv.ed
    // preserveSymlinks: true
  };
  setupCompilerOptionsWithPackages(compilerOptions);

  log.info('typescript compilerOptions:', compilerOptions);

  const tsProject = gulpTs.createProject({...compilerOptions, typescript: require('typescript')});

  if (argv.watch) {
    log.info('Watch mode');
    watch(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed, argv.jsx, onCompiled);
  } else {
    promCompile = compile(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed);
  }

  function onComponent(name: string, packagePath: string, _parsedName: any, json: any, realPath: string) {
    countPkg++;
    const tscCfg = getTscConfigOfPkg(json);

    compDirInfo.set(name, {...tscCfg, pkgDir: realPath});

    if (tscCfg.globs) {
      compGlobs.push(...tscCfg.globs.map(file => resolve(realPath, file).replace(/\\/g, '/')));
      return;
    }

    const srcDirs = [tscCfg.srcDir, tscCfg.isomDir].filter(srcDir => {
      if (srcDir == null)
        return false;
      try {
        return fs.statSync(join(realPath, srcDir)).isDirectory();
      } catch (e) {
        return false;
      }
    });

    srcDirs.forEach(srcDir => {
      const relPath = resolve(realPath, srcDir!).replace(/\\/g, '/');

      compGlobs.push(relPath + '/**/*.ts');
      if (argv.jsx) {
        compGlobs.push(relPath + '/**/*.tsx');
      }
    });
  }


  return promCompile.then((list) => {
    if (argv.watch !== true && process.send) {
      process.send('plink-tsc compiled');
    }
    return list;
  });
}

async function compile(compGlobs: string[], tsProject: any, commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>, emitTdsOnly = false) {
  // const gulpBase = root + SEP;
  const startTime = new Date().getTime();

  function printDuration(isError: boolean) {
    const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
    const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
    log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
  }


  const compileErrors: string[] = [];
  log.info('tsc compiles: ', compGlobs.join(', '));
  const tsResult = gulp.src(compGlobs)
  .pipe(sourcemaps.init())
  .pipe(tsProject())
  .on('error', (err: Error) => {
    compileErrors.push(err.message);
  });

  // LJ: Let's try to use --sourceMap with --inlineSource, so that I don't need to change file path in source map
  // which is outputed

  const streams: any[] = [];

  // if (!emitTdsOnly) {
  //   const jsStream = tsResult.js
  //     .pipe(changePath(commonRootDir, packageDirTree))
  //     .pipe(sourcemaps.write('.', {includeContent: true}));
  //   streams.push(jsStream);
  // }
  const jsStream = tsResult.js
    .pipe(changePath(commonRootDir, packageDirTree))
    .pipe(sourcemaps.write('.', {includeContent: true}));
  streams.push(jsStream);
  streams.push(tsResult.dts.pipe(changePath(commonRootDir, packageDirTree)));

  const emittedList = [] as EmitList;
  const all = merge(streams)
  .pipe(through.obj(function(file: File, en: string, next: (...arg: any[]) => void) {

    // if (emitTdsOnly && !file.path.endsWith('.d.ts'))
    //   return next();
    const displayPath = relative(process.cwd(), file.path);
    const displaySize = Math.round((file.contents as Buffer).byteLength / 1024 * 10) / 10;

    log.info('%s %s Kb', displayPath, chalk.blueBright(displaySize + ''));
    emittedList.push([displayPath, displaySize]);
    next(null, file);
  }))
  .pipe(gulp.dest(commonRootDir));

  try {
    await new Promise<EmitList>((resolve, reject) => {
      all.on('end', () => {
        if (compileErrors.length > 0) {
          log.error('\n---------- Failed to compile Typescript files, check out below error message -------------\n');
          compileErrors.forEach(msg => log.error(msg));
          return reject(new Error('Failed to compile Typescript files'));
        }
        resolve();
      });
      all.on('error', reject);
      all.resume();
    });
    return emittedList;
  } finally {
    printDuration(false);
  }
}

function watch(compGlobs: string[], tsProject: any, commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>,
  emitTdsOnly = false, hasTsx = false, onCompiled?: (emitted: EmitList) => void) {
  const compileFiles: string[] = [];
  let promCompile = Promise.resolve( [] as EmitList);

  const delayCompile = _.debounce((globs: string[]) => {
    const globsCopy = globs.slice(0, globs.length);
    globs.splice(0);
    promCompile = promCompile.catch(() => [] as EmitList)
      .then(() => compile(globsCopy, tsProject, commonRootDir, packageDirTree, emitTdsOnly))
      .catch(() => [] as EmitList);
    if (onCompiled)
      promCompile = promCompile.then(emitted => {
        onCompiled(emitted);
        return emitted;
      });
  }, 200);

  const watcher = chokidar.watch(compGlobs, {ignored: /(\.d\.ts|\.js)$/ });
  watcher.on('add', (path: string) => onChangeFile(path, 'added'));
  watcher.on('change', (path: string) => onChangeFile(path, 'changed'));
  watcher.on('unlink', (path: string) => onChangeFile(path, 'removed'));

  function onChangeFile(path: string, reason: string) {
    if (reason !== 'removed')
      compileFiles.push(path);
    log.info(`File ${chalk.cyan(relative(root, path))} has been ` + chalk.yellow(reason));
    delayCompile(compileFiles);
  }
}


function changePath(commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>) {
  return through.obj(function(file: File, en: string, next: (...arg: any[]) => void) {
    const treePath = relative(commonRootDir, file.path);
    file._originPath = file.path;
    const {srcDir, destDir, pkgDir: dir} = packageDirTree.getAllData(treePath).pop()!;
    const absFile = resolve(commonRootDir, treePath);
    const pathWithinPkg = relative(dir, absFile);
    // console.log(dir, tsDirs);
    const prefix = srcDir;
    // for (const prefix of [tsDirs.srcDir, tsDirs.isomDir]) {
    if (prefix === '.' || prefix.length === 0) {
      file.path = join(dir, destDir, pathWithinPkg);
      // break;
    } else if (pathWithinPkg.startsWith(prefix + sep)) {
      file.path = join(dir, destDir, pathWithinPkg.slice(prefix.length + 1));
      // break;
    }
    // }
    // console.log('pathWithinPkg', pathWithinPkg);
    // console.log('file.path', file.path);
    file.base = commonRootDir;
    // console.log('file.base', file.base);
    // console.log('file.relative', file.relative);
    next(null, file);
  });
}

function setupCompilerOptionsWithPackages(compilerOptions: RequiredCompilerOptions) {
  let wsKey: string | null | undefined = workspaceKey(process.cwd());
  if (!getState().workspaces.has(wsKey))
    wsKey = getState().currWorkspace;
  if (wsKey == null) {
    throw new Error('Current directory is not a work space');
  }
  // const typeRoots = Array.from(packageUtils.typeRootsFromPackages(wsKey));
  setTsCompilerOptForNodePath(process.cwd(), './', compilerOptions, {
    enableTypeRoots: true,
    workspaceDir: resolve(root, wsKey)
  });
}
