// tslint:disable: max-line-length
import chalk from 'chalk';
import * as packageUtils from './package-utils';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import Path, {resolve, join, relative, sep} from 'path';
import ts from 'typescript';
import {getTscConfigOfPkg, PackageTsDirs, plinkEnv} from './utils/misc';
import {CompilerOptions} from 'typescript';
import {setTsCompilerOptForNodePath, CompilerOptions as RequiredCompilerOptions} from './package-mgr/package-list-helper';
import {DirTree} from 'require-injector/dist/dir-tree';
import {getState, workspaceKey} from './package-mgr';
import log4js from 'log4js';
import glob from 'glob';
import {mergeBaseUrlAndPaths} from './ts-cmd-util';
import {webInjector} from './injector-factory';
// import {PlinkEnv} from './node-path';
export {RequiredCompilerOptions};

const {symlinkDirName, rootDir: root} = plinkEnv;
const log = log4js.getLogger('plink.ts-cmd');
export interface TscCmdParam {
  package?: string[];
  project?: string[];
  watch?: boolean;
  sourceMap?: string;
  jsx?: boolean;
  ed?: boolean;
  /** merge compilerOptions "baseUrl" and "paths" from specified tsconfig file */
  mergeTsconfig?: string;
  /** JSON string, to be merged to compilerOptions "paths",
   * be aware that "paths" should be relative to "baseUrl" which is relative to `PlinkEnv.workDir`
   * */
  pathsJsons?: Array<string> | {[path: string]: string[]};
  /**
   * Partial compiler options to be merged, except "baseUrl".
   * "paths" should be relative to `PlinkEnv.workDir`
   */
  compilerOptions?: any;
  overridePackgeDirs?: {[pkgName: string]: PackageTsDirs};
}

interface PackageDirInfo extends PackageTsDirs {
  pkgDir: string;
  symlinkDir: string;
}

/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
export function tsc(argv: TscCmdParam/*, onCompiled?: (emitted: EmitList) => void*/): string[] {
  const compGlobs: string[] = [];
  const compDirInfo: Map<string, PackageDirInfo> = new Map(); // {[name: string]: {srcDir: string, destDir: string}}
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

  // const promCompile = Promise.resolve( [] as EmitList);
  const packageDirTree = new DirTree<PackageDirInfo>();
  const commonRootDir = plinkEnv.workDir;

  let countPkg = 0;
  if (argv.package && argv.package.length > 0)
    packageUtils.findAllPackages(argv.package, onComponent, 'src');
  else if (argv.project && argv.project.length > 0) {
    packageUtils.findAllPackages(onComponent, 'src', argv.project);
  } else {
    for (const pkg of packageUtils.packages4Workspace(plinkEnv.workDir, false)) {
      onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath);
    }
  }
  for (const info of compDirInfo.values()) {
    const treePath = relative(commonRootDir, info.symlinkDir);
    log.debug('treePath', treePath);
    packageDirTree.putData(treePath, info);
  }

  if (countPkg === 0) {
    throw new Error('No available source package found in current workspace');
  }

  const destDir = commonRootDir.replace(/\\/g, '/');
  const compilerOptions: RequiredCompilerOptions = {
    ...baseCompilerOptions,
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
    sourceMap: argv.sourceMap !== 'inline',
    inlineSources: argv.sourceMap === 'inline',
    emitDeclarationOnly: argv.ed
    // preserveSymlinks: true
  };

  setupCompilerOptionsWithPackages(compilerOptions, argv);

  log.info('typescript compilerOptions:', compilerOptions);

  /** set compGlobs */
  function onComponent(name: string, _packagePath: string, _parsedName: any, json: any, realPath: string) {
    countPkg++;
    const tscCfg: PackageTsDirs = argv.overridePackgeDirs && _.has(argv.overridePackgeDirs, name) ?
      argv.overridePackgeDirs[name] : getTscConfigOfPkg(json);
    // For workaround https://github.com/microsoft/TypeScript/issues/37960
    // Use a symlink path instead of a real path, so that Typescript compiler will not
    // recognize them as from somewhere with "node_modules", the symlink must be reside
    // in directory which does not contain "node_modules" as part of absolute path.
    const symlinkDir = resolve(plinkEnv.workDir, symlinkDirName, name);
    compDirInfo.set(name, {...tscCfg, pkgDir: realPath, symlinkDir});

    // if (tscCfg.globs) {
    //   compGlobs.push(...tscCfg.globs.map(file => resolve(symlinkDir, file).replace(/\\/g, '/')));
    //   return;
    // }

    const srcDirs = [tscCfg.srcDir, tscCfg.isomDir].filter(srcDir => {
      if (srcDir == null)
        return false;
      try {
        return fs.statSync(join(symlinkDir, srcDir)).isDirectory();
      } catch (e) {
        return false;
      }
    });

    if (srcDirs.length === 0) {
      if (!fs.existsSync(symlinkDir)) {
        log.error(`There is no existing directory ${chalk.red(symlinkDir)},` +
        ` it is possible that package ${name} is yet not added to current worktree space's package.json file,` +
        ' current worktree space is not synced yet, try "sync"/"init" command please');
      } else {
        log.error(`There is no existing ts source directory found for package ${chalk.red(name)}:` +
          ` ${[tscCfg.srcDir, tscCfg.isomDir].filter(item => item != null)}`);
      }
    }

    if (tscCfg.include) {
      tscCfg.include = ([] as string[]).concat(tscCfg.include);
    }
    if (tscCfg.include && tscCfg.include.length > 0) {
      compGlobs.push(...(tscCfg.include as string[]).map(pattern => resolve(symlinkDir, pattern).replace(/\\/g, '/')));
    } else {
      srcDirs.forEach(srcDir => {
        const relPath = resolve(symlinkDir, srcDir!).replace(/\\/g, '/');
        compGlobs.push(relPath + '/**/*.ts');
        if (argv.jsx) {
          compGlobs.push(relPath + '/**/*.tsx');
        }
      });
    }
  }

  if (argv.watch) {
    log.info('Watch mode');
    watch(compGlobs, compilerOptions, commonRootDir, packageDirTree);
    return [];
    // watch(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed, argv.jsx, onCompiled);
  } else {
    const emitted = compile(compGlobs, compilerOptions, commonRootDir, packageDirTree);
    if (process.send)
      process.send('plink-tsc compiled');
    return emitted;
    // promCompile = compile(compGlobs, tsProject, commonRootDir, packageDirTree, argv.ed);
  }
}

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
};

function watch(globPatterns: string[], jsonCompilerOpt: any, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>) {
  const rootFiles: string[] = _.flatten(
    globPatterns.map(pattern => glob.sync(pattern).filter(file => !file.endsWith('.d.ts')))
  );
  const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys,
    plinkEnv.workDir.replace(/\\/g, '/'),
    undefined, 'tsconfig.json').options;

  function _reportDiagnostic(diagnostic: ts.Diagnostic) {
    return reportDiagnostic(diagnostic, commonRootDir, packageDirTree);
  }
  const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys,
    ts.createEmitAndSemanticDiagnosticsBuilderProgram, _reportDiagnostic, reportWatchStatusChanged);
  patchWatchCompilerHost(programHost);

  const origCreateProgram = programHost.createProgram;
  // Ts's createWatchProgram will call WatchCompilerHost.createProgram(), this is where we patch "CompilerHost"
  programHost.createProgram = function(rootNames: readonly string[] | undefined, options: CompilerOptions | undefined,
    host?: ts.CompilerHost) {
    if (host && (host as any)._overrided == null) {
      patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
    }
    const program: ReturnType<typeof origCreateProgram> = origCreateProgram.apply(this, arguments);
    return program;
  };

  ts.createWatchProgram(programHost);
}

function compile(globPatterns: string[], jsonCompilerOpt: any, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>) {
  const rootFiles: string[] = _.flatten(
    globPatterns.map(pattern => glob.sync(pattern, {cwd: plinkEnv.workDir}).filter(file => !file.endsWith('.d.ts')))
  );
  // log.info('rootFiles:\n', rootFiles.join('\n'));
  const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys,
    plinkEnv.workDir.replace(/\\/g, '/'),
    undefined, 'tsconfig.json').options;
  const host = ts.createCompilerHost(compilerOptions);
  patchWatchCompilerHost(host);
  const emitted = patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
  const program = ts.createProgram(rootFiles, compilerOptions, host);
  const emitResult = program.emit();
  const allDiagnostics = ts.getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  function _reportDiagnostic(diagnostic: ts.Diagnostic) {
    return reportDiagnostic(diagnostic, commonRootDir, packageDirTree);
  }
  allDiagnostics.forEach(diagnostic => {
    _reportDiagnostic(diagnostic);
  });
  if (emitResult.emitSkipped) {
    throw new Error('Compile failed');
  }
  return emitted;
}

/** Overriding WriteFile() */
function patchCompilerHost(host: ts.CompilerHost, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>, co: ts.CompilerOptions): string[] {
  const emittedList: string[] = [];
  // It seems to not able to write file through symlink in Windows
  // const _writeFile = host.writeFile;
  const writeFile: ts.WriteFileCallback = function(fileName, data, writeByteOrderMark, onError, sourceFiles) {
    const destFile = realPathOf(fileName, commonRootDir, packageDirTree);
    if (destFile == null) {
      log.debug('skip', fileName);
      return;
    }
    emittedList.push(destFile);
    log.info('write file', Path.relative(process.cwd(), destFile));
    // Typescript's writeFile() function performs weird with symlinks under watch mode in Windows:
    // Every time a ts file is changed, it triggers the symlink being compiled and to be written which is
    // as expected by me,
    // but late on it triggers the same real file also being written immediately, this is not what I expect,
    // and it does not actually write out any changes to final JS file.
    // So I decide to use original Node.js file system API
    fs.mkdirpSync(Path.dirname(destFile));
    fs.writeFileSync(destFile, data);
    // It seems Typescript compiler always uses slash instead of back slash in file path, even in Windows
    // return _writeFile.call(this, destFile.replace(/\\/g, '/'), ...Array.prototype.slice.call(arguments, 1));
  };
  host.writeFile = writeFile;

  // const _getSourceFile = host.getSourceFile;
  // const getSourceFile: typeof _getSourceFile = function(fileName) {
  //   // console.log('getSourceFile', fileName);
  //   return _getSourceFile.apply(this, arguments);
  // };
  // host.getSourceFile = getSourceFile;
  return emittedList;
}

function patchWatchCompilerHost(host: ts.WatchCompilerHostOfFilesAndCompilerOptions<ts.EmitAndSemanticDiagnosticsBuilderProgram> | ts.CompilerHost) {
  const readFile = host.readFile;
  const cwd = process.cwd();
  host.readFile = function(path: string, encoding?: string) {
    const content = readFile.apply(this, arguments);
    if (!path.endsWith('.d.ts') && !path.endsWith('.json')) {
      // console.log('WatchCompilerHost.readFile', path);
      const changed = webInjector.injectToFile(path, content);
      if (changed !== content) {
        log.info(Path.relative(cwd, path) + ' is patched');
        return changed;
      }
    }
    return content;
  };
}

// Customer Transformer solution is not feasible: in some case like a WatchCompiler, it throws error like
// "can not reference '.flags' of undefined" when a customer transformer return a newly created SourceFile

// export function overrideTsProgramEmitFn(emit: ts.Program['emit']): ts.Program['emit'] {
//   // TODO: allow adding transformer
//   function hackedEmit(...args: Parameters<ts.Program['emit']>) {
//     let [,,,,transformers] = args;
//     // log.info('emit', src?.fileName);
//     if (transformers == null) {
//       transformers = {} as ts.CustomTransformers;
//       args[4] = transformers;
//     }
//     if (transformers.before == null)
//       transformers.before = [];
//     transformers.before.push(ctx => ({
//       transformSourceFile(src) {
//         log.debug('transformSourceFile', src.fileName);
//         return src;
//       },
//       transformBundle(node) {return node;}
//     }));
//     // console.log(require('util').inspect(args[4]));
//     return emit.apply(this, args);
//   };
//   return hackedEmit;
// }

function reportDiagnostic(diagnostic: ts.Diagnostic, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>) {
  let fileInfo = '';
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
    const realFile = realPathOf(diagnostic.file.fileName, commonRootDir, packageDirTree, true) || diagnostic.file.fileName;
    fileInfo = `${realFile}, line: ${line + 1}, column: ${character + 1}`;
  }
  console.error(chalk.red(`Error ${diagnostic.code} ${fileInfo} :`), ts.flattenDiagnosticMessageText( diagnostic.messageText, formatHost.getNewLine()));
}

function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
  console.info(chalk.cyan(ts.formatDiagnostic(diagnostic, formatHost)));
}

const COMPILER_OPTIONS_MERGE_EXCLUDE = new Set(['baseUrl', 'typeRoots', 'paths', 'rootDir']);

function setupCompilerOptionsWithPackages(compilerOptions: RequiredCompilerOptions, opts?: TscCmdParam) {
  const cwd = plinkEnv.workDir;
  let wsKey: string | null | undefined = workspaceKey(cwd);
  if (!getState().workspaces.has(wsKey))
    wsKey = getState().currWorkspace;
  if (wsKey == null) {
    throw new Error(`Current directory "${cwd}" is not a work space`);
  }

  if (opts?.mergeTsconfig) {
    const json = mergeBaseUrlAndPaths(ts, opts.mergeTsconfig, cwd, compilerOptions);
    for (const [key, value] of Object.entries(json.compilerOptions)) {
      if (!COMPILER_OPTIONS_MERGE_EXCLUDE.has(key)) {
        compilerOptions[key] = value;
        log.debug('merge compiler options', key, value);
      }
    }
  }

  setTsCompilerOptForNodePath(cwd, './', compilerOptions, {
    enableTypeRoots: true,
    workspaceDir: resolve(root, wsKey)
  });

  if (opts?.pathsJsons) {
    if (Array.isArray(opts.pathsJsons)) {
      compilerOptions.paths = opts.pathsJsons.reduce((pathMap, jsonStr) => {
        Object.assign(pathMap, JSON.parse(jsonStr));
        return pathMap;
      }, compilerOptions.paths);
    } else {
      Object.assign(compilerOptions.paths, opts.pathsJsons);
    }
  }

  if (opts?.compilerOptions) {
    for (const [prop, value] of Object.entries(opts.compilerOptions)) {
      if (prop === 'baseUrl') {
        continue;
      }
      if (prop === 'paths') {
        if (compilerOptions.paths)
          Object.assign(compilerOptions.paths, value);
        else
          compilerOptions.paths = value as any;
      } else {
        compilerOptions[prop] = value as any;
      }
    }
  }
}

/**
 * Return real path of targeting file, return null if targeting file is not in our compiliation scope
 * @param fileName 
 * @param commonRootDir 
 * @param packageDirTree 
 */
function realPathOf(fileName: string, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>, isSrcFile = false): string | null {
  const treePath = relative(commonRootDir, fileName);
  const _originPath = fileName; // absolute path
  const foundPkgInfo = packageDirTree.getAllData(treePath).pop();
  if (foundPkgInfo == null) {
    // this file is not part of source package.
    // log.info('Not part of entry files', fileName);
    return null;
  }
  const {srcDir, destDir, pkgDir, isomDir, symlinkDir} = foundPkgInfo;

  const pathWithinPkg = relative(symlinkDir, _originPath);

  if (srcDir === '.' || srcDir.length === 0) {
    fileName = join(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg);
  } else if (pathWithinPkg.startsWith(srcDir + sep)) {
    fileName = join(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg.slice(srcDir.length + 1));
  } else if (isomDir && pathWithinPkg.startsWith(isomDir + sep)) {
    fileName = join(pkgDir, isomDir, pathWithinPkg.slice(isomDir.length + 1));
  }
  return fileName;
}
