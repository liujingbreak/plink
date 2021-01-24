// tslint:disable: max-line-length
import chalk from 'chalk';
import * as packageUtils from './package-utils';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import {resolve, join, relative, sep} from 'path';
import ts from 'typescript';
import {getTscConfigOfPkg, PackageTsDirs, closestCommonParentDir} from './utils/misc';
import {CompilerOptions} from 'typescript';
import config from './config';
import {setTsCompilerOptForNodePath, CompilerOptions as RequiredCompilerOptions} from './config-handler';
import {DirTree} from 'require-injector/dist/dir-tree';
import {getState, workspaceKey} from './package-mgr';
import log4js from 'log4js';
import glob from 'glob';


const log = log4js.getLogger('wfh.typescript');
const root = config().rootPath;

export interface TscCmdParam {
  include?: string[];
  package?: string[];
  project?: string[];
  watch?: boolean;
  sourceMap?: string;
  jsx?: boolean;
  ed?: boolean;
  pathsJsons: string[];
  compileOptions?: {[key in keyof CompilerOptions]?: any};
}

interface ComponentDirInfo extends PackageTsDirs {
  pkgDir: string;
}

/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
export function tsc(argv: TscCmdParam/*, onCompiled?: (emitted: EmitList) => void*/): string[] {
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

  // const promCompile = Promise.resolve( [] as EmitList);
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
    sourceMap: argv.sourceMap !== 'inline',
    inlineSources: argv.sourceMap === 'inline',
    emitDeclarationOnly: argv.ed
    // preserveSymlinks: true
  };
  setupCompilerOptionsWithPackages(compilerOptions, argv.pathsJsons);

  log.info('typescript compilerOptions:', compilerOptions);
  // const tsProject = gulpTs.createProject({...compilerOptions, typescript: require('typescript')});


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

    if (tscCfg.include) {
      tscCfg.include = ([] as string[]).concat(tscCfg.include);
    }
    if (tscCfg.include && tscCfg.include.length > 0) {
      for (const pattern of tscCfg.include) {
        const includePath = resolve(realPath, pattern).replace(/\\/g, '/');
        compGlobs.push(includePath);
      }
    } else {
      srcDirs.forEach(srcDir => {
        const relPath = resolve(realPath, srcDir!).replace(/\\/g, '/');
        compGlobs.push(relPath + '/**/*.ts');
        if (argv.jsx) {
          compGlobs.push(relPath + '/**/*.tsx');
        }
      });
    }
  }

  // return promCompile.then((list) => {
  //   if (argv.watch !== true && process.send) {
  //     process.send('plink-tsc compiled');
  //   }
  //   return list;
  // });

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

function watch(globPatterns: string[], jsonCompilerOpt: any, commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>) {
  const rootFiles: string[] = _.flatten(
    globPatterns.map(pattern => glob.sync(pattern).filter(file => !file.endsWith('.d.ts')))
  );
  const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys, process.cwd().replace(/\\/g, '/'),
    undefined, 'tsconfig.json').options;
  const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys, ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    reportDiagnostic, reportWatchStatusChanged);

  const origCreateProgram = programHost.createProgram;
  programHost.createProgram = function(rootNames: readonly string[] | undefined, options: CompilerOptions | undefined,
    host?: ts.CompilerHost) {
    if (host) {
      overrideCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
    }
    return origCreateProgram.apply(this, arguments);
  };
  ts.createWatchProgram(programHost);
}

function compile(globPatterns: string[], jsonCompilerOpt: any, commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>) {
  const rootFiles: string[] = _.flatten(
    globPatterns.map(pattern => glob.sync(pattern).filter(file => !file.endsWith('.d.ts')))
  );
  // console.log(rootFiles);
  const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys, process.cwd().replace(/\\/g, '/'),
    undefined, 'tsconfig.json').options;
  const host = ts.createCompilerHost(compilerOptions);
  const emitted = overrideCompilerHost(host, commonRootDir, packageDirTree, compilerOptions);
  const program = ts.createProgram(rootFiles, compilerOptions, host);
  const emitResult = program.emit();
  const allDiagnostics = ts.getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    reportDiagnostic(diagnostic);
  });
  if (emitResult.emitSkipped) {
    throw new Error('Compile failed');
  }
  return emitted;
}

function overrideCompilerHost(host: ts.CompilerHost, commonRootDir: string, packageDirTree: DirTree<ComponentDirInfo>, co: ts.CompilerOptions): string[] {
  const emittedList: string[] = [];

  const _writeFile = host.writeFile;
  const writeFile: ts.WriteFileCallback = function(fileName, data, writeByteOrderMark, onError, sourceFiles) {
    const treePath = relative(commonRootDir, fileName);
    const _originPath = fileName; // absolute path
    const {srcDir, destDir, pkgDir: dir} = packageDirTree.getAllData(treePath).pop()!;
    const pathWithinPkg = relative(dir, _originPath);
    const prefix = srcDir;
    if (prefix === '.' || prefix.length === 0) {
      fileName = join(dir, destDir, pathWithinPkg);
    } else if (pathWithinPkg.startsWith(prefix + sep)) {
      fileName = join(dir, destDir, pathWithinPkg.slice(prefix.length + 1));
    }
    emittedList.push(fileName);
    // tslint:disable-next-line: no-console
    console.log('write file', fileName);
    // await fs.mkdirp(dirname(file.path));
    // await fs.promises.writeFile(file.path, file.contents as Buffer);

    // It seems Typescript compiler always uses slash instead of back slash in file path, even in Windows
    return _writeFile.call(this, fileName.replace(/\\/g, '/'), ...Array.prototype.slice.call(arguments, 1));
  };
  host.writeFile = writeFile;

  const _getSourceFile = host.getSourceFile;
  const getSourceFile: typeof _getSourceFile = function(fileName) {
    // console.log('getSourceFile', fileName);
    return _getSourceFile.apply(this, arguments);
  };
  host.getSourceFile = getSourceFile;

  const _resolveModuleNames = host.resolveModuleNames;

  host.resolveModuleNames = function(moduleNames, containingFile, reusedNames, redirectedRef, opt) {
    if (containingFile.indexOf('testSlice.ts') >= 0)
      console.log('resolving %j from %j', moduleNames, containingFile);
    let result: ReturnType<NonNullable<typeof _resolveModuleNames>>;
    if (_resolveModuleNames) {
      result = _resolveModuleNames.apply(this, arguments) as ReturnType<typeof _resolveModuleNames>;
    } else {
      result = moduleNames.map(moduleName => {
        const resolved = ts.resolveModuleName(moduleName, containingFile, co, host,  ts.createModuleResolutionCache(
          ts.sys.getCurrentDirectory(), path => path, co
        ));
        return resolved.resolvedModule;
      });
    }
    if (containingFile.indexOf('testSlice.ts') >= 0)
      console.log('resolved:', result.map(item => item ? `${item.isExternalLibraryImport ? '[external]': '          '} ${item.resolvedFileName}, ` : item));
    return result;
  };

  return emittedList;
}

function reportDiagnostic(diagnostic: ts.Diagnostic) {
  let fileInfo = '';
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
    fileInfo = `${diagnostic.file.fileName}, line: ${line + 1}, column: ${character + 1}`;
  }
  console.error(chalk.red(`Error ${diagnostic.code} ${fileInfo} :`), ts.flattenDiagnosticMessageText( diagnostic.messageText, formatHost.getNewLine()));
}

function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
  console.info(chalk.cyan(ts.formatDiagnostic(diagnostic, formatHost)));
}

function setupCompilerOptionsWithPackages(compilerOptions: RequiredCompilerOptions, pathsJsons: string[]) {
  const cwd = process.cwd();
  let wsKey: string | null | undefined = workspaceKey(cwd);
  if (!getState().workspaces.has(wsKey))
    wsKey = getState().currWorkspace;
  if (wsKey == null) {
    throw new Error('Current directory is not a work space');
  }

  // if (compilerOptions.paths == null)
  //   compilerOptions.paths = {};

  // for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
  //   const realDir = relative(cwd, realPath).replace(/\\/g, '/');
  //   compilerOptions.paths[name] = [realDir];
  //   compilerOptions.paths[name + '/*'] = [realDir + '/*'];
  // }
  setTsCompilerOptForNodePath(cwd, './', compilerOptions, {
    enableTypeRoots: true,
    workspaceDir: resolve(root, wsKey)
  });

  pathsJsons.reduce((pathMap, jsonStr) => {
    return {...pathMap, ...JSON.parse(jsonStr)};
  }, compilerOptions.paths);
}
