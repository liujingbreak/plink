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
import {getTsDirsOfPackage, PackageTsDirs, closestCommonParentDir} from './utils/misc';
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

interface ComponentDirInfo {
  tsDirs: PackageTsDirs;
  dir: string;
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
  var compGlobs: string[] = [];
  // var compStream = [];
  const compDirInfo: Map<string, ComponentDirInfo> = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
  const baseTsconfigFile = argv.jsx ? require.resolve('../tsconfig-tsx.json') :
    require.resolve('../tsconfig-base.json');
  const baseTsconfig = ts.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8'));
  if (baseTsconfig.error) {
    console.error(baseTsconfig.error);
    throw new Error('Incorrect tsconfig file: ' + baseTsconfigFile);
  }
  let promCompile = Promise.resolve( [] as EmitList);

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

  const commonRootDir = closestCommonParentDir(Array.from(compDirInfo.values()).map(el => el.dir));
  const destDir = commonRootDir.replace(/\\/g, '/');
  const compilerOptions: RequiredCompilerOptions = {
    ...baseTsconfig.config.compilerOptions,
    // typescript: require('typescript'),
    // Compiler options
    importHelpers: false,
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

  const packageDirTree = new DirTree<ComponentDirInfo>();
  for (const info of compDirInfo.values()) {
    const treePath = relative(commonRootDir, info.dir);
    packageDirTree.putData(treePath, info);
  }
  // console.log(packageDirTree.traverse());
  log.info('typescript compilerOptions:', compilerOptions);

  function onComponent(name: string, packagePath: string, _parsedName: any, json: any, realPath: string) {
    countPkg++;
    // const packagePath = resolve(root, 'node_modules', name);
    const dirs = getTsDirsOfPackage(json);
    const srcDirs = [dirs.srcDir, dirs.isomDir].filter(srcDir => {
      try {
        return fs.statSync(join(realPath, srcDir)).isDirectory();
      } catch (e) {
        return false;
      }
    });
    compDirInfo.set(name, {
      tsDirs: dirs,
      dir: realPath
    });
    srcDirs.forEach(srcDir => {
      const relPath = resolve(realPath, srcDir).replace(/\\/g, '/');
      compGlobs.push(relPath + '/**/*.ts');
      if (argv.jsx) {
        compGlobs.push(relPath + '/**/*.tsx');
      }
    });
  }

  const tsProject = gulpTs.createProject({...compilerOptions, typescript: require('typescript')});

  const delayCompile = _.debounce(() => {
    const toCompile = compGlobs;
    compGlobs = [];
    promCompile = promCompile.catch(() => [] as EmitList)
      .then(() => compile(toCompile, tsProject, argv.sourceMap === 'inline', argv.ed))
      .catch(() => [] as EmitList);
    if (onCompiled)
      promCompile = promCompile.then(emitted => {
        onCompiled(emitted);
        return emitted;
      });
  }, 200);

  if (argv.watch) {
    log.info('Watch mode');
    const watchDirs: string[] = [];
    compGlobs = [];

    for (const info of compDirInfo.values()) {
      [info.tsDirs.srcDir, info.tsDirs.isomDir].forEach(srcDir => {
        const relPath = join(info.dir, srcDir).replace(/\\/g, '/');
        watchDirs.push(relPath + '/**/*.ts');
        if (argv.jsx) {
          watchDirs.push(relPath + '/**/*.tsx');
        }
      });
    }
    const watcher = chokidar.watch(watchDirs, {ignored: /(\.d\.ts|\.js)$/ });
    watcher.on('add', (path: string) => onChangeFile(path, 'added'));
    watcher.on('change', (path: string) => onChangeFile(path, 'changed'));
    watcher.on('unlink', (path: string) => onChangeFile(path, 'removed'));
  } else {
    promCompile = compile(compGlobs, tsProject, argv.sourceMap === 'inline', argv.ed);
  }

  function onChangeFile(path: string, reason: string) {
    if (reason !== 'removed')
      compGlobs.push(path);
    log.info(`File ${chalk.cyan(relative(root, path))} has been ` + chalk.yellow(reason));
    delayCompile();
  }

  function compile(compGlobs: string[], tsProject: any, inlineSourceMap: boolean, emitTdsOnly = false) {
    // const gulpBase = root + SEP;
    const startTime = new Date().getTime();

    function printDuration(isError: boolean) {
      const sec = Math.ceil((new Date().getTime() - startTime) / 1000);
      const min = `${Math.floor(sec / 60)} minutes ${sec % 60} secends`;
      log.info(`Compiled ${isError ? 'with errors ' : ''}in ` + min);
    }

    return new Promise<EmitList>((resolve, reject) => {
      const compileErrors: string[] = [];
      const tsResult = gulp.src(compGlobs)
      .pipe(sourcemaps.init())
      .pipe(tsProject())
      .on('error', (err: Error) => {
        compileErrors.push(err.message);
      });

      // LJ: Let's try to use --sourceMap with --inlineSource, so that I don't need to change file path in source map
      // which is outputed

      const streams: any[] = [];
      if (!emitTdsOnly) {
        streams.push(tsResult.js
          .pipe(changePath())
          // .pipe(changePath())
          // .pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: './'}))
          .pipe(sourcemaps.write('.', {includeContent: true}))
          // .pipe(through.obj(function(file: any, en: string, next: (...arg: any[]) => void) {
          //   if (file.extname === '.map') {
          //     const sm = JSON.parse(file.contents.toString());
          //     let sFileDir;
          //     sm.sources =
          //       sm.sources.map( (spath: string) => {
          //         const realFile = fs.realpathSync(spath);
          //         sFileDir = Path.dirname(realFile);
          //         return relative(file.base, realFile).replace(/\\/g, '/');
          //       });
          //     if (sFileDir)
          //       sm.sourceRoot = relative(sFileDir, file.base).replace(/\\/g, '/');
          //     file.contents = Buffer.from(JSON.stringify(sm), 'utf8');
          //   }
          //   next(null, file);
          // }))
        );
      }
      streams.push(tsResult.dts.pipe(changePath()));

      const emittedList = [] as EmitList;
      const all = merge(streams)
      .pipe(through.obj(function(file: File, en: string, next: (...arg: any[]) => void) {
        const displayPath = relative(process.cwd(), file.path);
        const displaySize = Math.round((file.contents as Buffer).byteLength / 1024 * 10) / 10;

        log.info('%s %s Kb', displayPath, chalk.blueBright(displaySize + ''));
        emittedList.push([displayPath, displaySize]);
        next(null, file);
      }))
      .pipe(gulp.dest(commonRootDir));

      all.on('end', () => {
        if (compileErrors.length > 0) {
          /* tslint:disable no-console */
          console.log('\n---------- Failed to compile Typescript files, check out below error message -------------\n');
          compileErrors.forEach(msg => log.error(msg));
          return reject(new Error('Failed to compile Typescript files'));
        }
        resolve(emittedList);
      });
      all.on('error', reject);
      all.resume();
    })
    .then(emittedList => {
      printDuration(false);
      return emittedList;
    })
    .catch(err => {
      printDuration(true);
      return Promise.reject(err);
    });
  }

  // const cwd = process.cwd();
  function changePath() {
    return through.obj(function(file: File, en: string, next: (...arg: any[]) => void) {
      const treePath = relative(commonRootDir, file.path);
      file._originPath = file.path;
      const {tsDirs, dir} = packageDirTree.getAllData(treePath).pop()!;
      const absFile = resolve(commonRootDir, treePath);
      const pathWithinPkg = relative(dir, absFile);
      // console.log(dir, tsDirs);
      const prefix = tsDirs.srcDir;
      // for (const prefix of [tsDirs.srcDir, tsDirs.isomDir]) {
      if (prefix === '.' || prefix.length === 0) {
        file.path = join(dir, tsDirs.destDir, pathWithinPkg);
        // break;
      } else if (pathWithinPkg.startsWith(prefix + sep)) {
        file.path = join(dir, tsDirs.destDir, pathWithinPkg.slice(prefix.length + 1));
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

  return promCompile.then((list) => {
    if (argv.watch !== true && process.send) {
      process.send('plink-tsc compiled');
    }
    return list;
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
  setTsCompilerOptForNodePath(process.cwd(), compilerOptions, {
    enableTypeRoots: true,
    workspaceDir: resolve(root, wsKey)
  });
}
