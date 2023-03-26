/* eslint-disable max-len */
import Path, {resolve, join, relative, sep} from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import * as fse from 'fs-extra';
import _ from 'lodash';
import glob from 'glob';
import {default as _ts} from 'typescript';
import {DirTree} from 'require-injector/dist/dir-tree';
import log4js from 'log4js';
import {getTscConfigOfPkg, PackageTsDirs, plinkEnv} from './utils/misc';
import {setTsCompilerOptForNodePath, CompilerOptions as RequiredCompilerOptions, allPackages} from './package-mgr/package-list-helper';
import {findPackagesByNames} from './cmd/utils';
import {getState, workspaceKey, PackageInfo} from './package-mgr';
import * as packageUtils from './package-utils';
import {mergeBaseUrlAndPaths} from './ts-cmd-util';
import {webInjector} from './injector-factory';
import {analyseFiles} from './cmd/cli-analyze';
import {languageServices} from './utils/tsc-util';
import {exitHooks} from './utils/bootstrap-process';
export {RequiredCompilerOptions};

const {symlinkDirName} = plinkEnv;
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
   * "paths" should be relative to `plinkEnv.workDir`
   */
  compilerOptions?: any;
  overridePackgeDirs?: {[pkgName: string]: PackageTsDirs};
}

interface PackageDirInfo extends PackageTsDirs {
  pkgDir: string;
  symlinkDir: string;
}

export async function tsc(argv: TscCmdParam, ts: typeof _ts = _ts ): Promise<string[]> {
  const rootFiles: string[] = [];
  const watchDirs: string[] = [];
  const includePatterns: string[] = [];

  const compDirInfo: Map<string, PackageDirInfo> = new Map(); // {[name: string]: {srcDir: string, destDir: string}}

  const packageDirTree = new DirTree<PackageDirInfo>();
  const workDir = plinkEnv.workDir;
  // const commonRootDir = plinkEnv.rootDir;

  let countPkg = 0;
  let pkgInfos: PackageInfo[] | undefined;
  if (argv.package && argv.package.length > 0)
    pkgInfos = Array.from(findPackagesByNames(argv.package)).filter(pkg => pkg != null) as PackageInfo[];
  else if (argv.project && argv.project.length > 0) {
    pkgInfos = Array.from(allPackages('*', 'src', argv.project));
  } else {
    pkgInfos = Array.from(packageUtils.packages4Workspace(plinkEnv.workDir, false));
  }
  // const commonRootDir = closestCommonParentDir(pkgInfos.map(pkg => pkg.realPath));
  await Promise.all(pkgInfos.map(pkg => onComponent(pkg.name, pkg.path, null, pkg.json, pkg.realPath)));
  for (const info of compDirInfo.values()) {
    const treePath = relative(workDir, info.pkgDir);
    log.debug('treePath', treePath);
    packageDirTree.putData(treePath, info);
  }

  if (countPkg === 0) {
    throw new Error('No available source package found in current workspace');
  }

  // const destDir = Path.relative(process.cwd(), commonRootDir).replace(/\\/g, '/');

  /** set compGlobs */
  async function onComponent(name: string, packagePath: string, _parsedName: any, json: any, realPath: string) {
    countPkg++;
    const tscCfg = argv.overridePackgeDirs && _.has(argv.overridePackgeDirs, name) ?
      argv.overridePackgeDirs[name]
      : getTscConfigOfPkg(json);
    // For workaround https://github.com/microsoft/TypeScript/issues/37960
    // Use a symlink path instead of a real path, so that Typescript compiler will not
    // recognize them as from somewhere with "node_modules", the symlink must be reside
    // in directory which does not contain "node_modules" as part of absolute path.
    const symlinkDir = resolve(plinkEnv.workDir, symlinkDirName, name);
    compDirInfo.set(name, {...tscCfg, pkgDir: realPath, symlinkDir});

    const srcDirs = [tscCfg.srcDir, tscCfg.isomDir].filter(srcDir => {
      if (srcDir == null)
        return false;
      try {
        return fs.statSync(join(realPath, srcDir)).isDirectory();
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
          ` ${[tscCfg.srcDir, tscCfg.isomDir].filter(item => item != null).join(', ')}`);
      }
    }

    if (tscCfg.files) {
      const files = ([] as string[]).concat(tscCfg.files);
      const aRes = await analyseFiles(files.map(file => resolve(symlinkDir, file)), argv.mergeTsconfig, []);
      log.debug('analyzed files:', aRes);
      if (aRes) {
        rootFiles.push(...(aRes.files.filter(file => file.startsWith(symlinkDir + sep) && !/\.(?:jsx?|d\.ts)$/.test(file))
          .map(file => file.replace(/\\/g, '/')))
        );
      }
    }
    if (tscCfg.include) {
      const patterns = ([] as string[]).concat(tscCfg.include);
      for (const pattern of patterns) {
        const globPattern = resolve(symlinkDir, pattern).replace(/\\/g, '/');
        includePatterns.push(globPattern);
        // glob.sync(globPattern).filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
      }
    }
    if (tscCfg.files == null && tscCfg.include == null) {
      for (const srcDir of srcDirs) {
        const relPath = resolve(realPath, srcDir!).replace(/\\/g, '/');
        watchDirs.push(relPath);
        // glob.sync(relPath + '/**/*.ts').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
        // if (argv.jsx) {
        //   glob.sync(relPath + '/**/*.tsx').filter(file => !file.endsWith('.d.ts')).forEach(file => rootFiles.push(file));
        // }
      }
    }
  }

  const {action$, ofType, dispatchFactory} = languageServices(ts, {
    transformSourceFile(file, content) {
      const changed = webInjector.injectToFile(file, content);
      if (changed !== content) {
        log.info(Path.relative(cwd, file) + ' is patched');
      }
      return changed;
    },
    tscOpts: {
      jsx: argv.jsx,
      inlineSourceMap: false,
      emitDeclarationOnly: argv.ed,
      basePath: workDir,
      changeCompilerOptions(co) {
        setupCompilerOptionsWithPackages(co as RequiredCompilerOptions, workDir.replace(/\\/g, '/'), argv, ts);
      }
    }
  });

  const cwd = process.cwd();

  const writtenFile$ = new rx.Subject<string>();
  const emitFailedFile$ = new rx.Subject<string>();

  function dealCommonJob() {
    return rx.merge(
      action$.pipe(
        ofType('onCompilerOptions'),
        op.take(1),
        op.map(({payload: compilerOptions}) => {
          log.info('typescript compilerOptions:', compilerOptions);
        })
      ),
      action$.pipe(
        ofType('emitFile'),
        op.map(async ({payload: [file, content]}) => {
          const destFile = realPathOf(file, workDir, packageDirTree, false);
          if (destFile == null)
            return;
          writtenFile$.next(destFile);
          log.info('emit file', Path.relative(cwd, destFile));
          await fse.mkdirp(Path.dirname(destFile));
          void fs.promises.writeFile(destFile, content);
        })
      ),
      action$.pipe(
        ofType('onEmitFailure'),
        op.map(({payload: [file, msg, type]}) => {
          emitFailedFile$.next(file);
          log.error(`[${type}] ` + msg);
        })
      ),
      action$.pipe(
        ofType('onSuggest'),
        op.map(({payload: [_fileName, msg]}) => {
          log.warn(msg);
        })
      )
    );
  }

  if (argv.watch) {
    log.info('Watch mode');

    rx.merge(
      dealCommonJob()
    ).subscribe();
    exitHooks.push(() => dispatchFactory('stop')());
    dispatchFactory('watch')([...watchDirs, ...includePatterns]);
    // watch(rootFiles, compilerOptions, commonRootDir, packageDirTree, ts);
    return [];
  } else {
    const emitted = [] as string[];
    const failedFiles = [] as string[];
    rx.merge(
      dealCommonJob(),
      writtenFile$.pipe(
        op.map(file => emitted.push(file))
      ),
      emitFailedFile$.pipe(op.map(file => failedFiles.push(file)))
    ).subscribe();

    for (const dir of watchDirs) {
      rootFiles.push(...glob.sync(dir + '/**/*.ts'));
      if (argv.jsx) {
        rootFiles.push(...glob.sync(dir + '/**/*.tsx'));
      }
    }
    for (const pat of includePatterns) {
      rootFiles.push(...pat);
      if (argv.jsx) {
        rootFiles.push(...pat);
      }
    }
    for (const file of rootFiles) {
      dispatchFactory('addSourceFile')(file, true);
    }
    writtenFile$.complete();
    emitFailedFile$.complete();
    // const emitted = compile(rootFiles, compilerOptions, commonRootDir, packageDirTree, ts);
    if (process.send)
      process.send('plink-tsc compiled');
    if (failedFiles.length > 0) {
      throw new Error(`Failed to compile following files:\n${failedFiles.join(',\n')}`);
    }
    return emitted;
  }
}

const COMPILER_OPTIONS_MERGE_EXCLUDE = new Set(['baseUrl', 'typeRoots', 'paths', 'rootDir']);

function setupCompilerOptionsWithPackages(compilerOptions: RequiredCompilerOptions, basePath: string, opts?: TscCmdParam, ts: typeof _ts = _ts): void {
  let wsKey: string | null | undefined = workspaceKey(plinkEnv.workDir);
  if (!getState().workspaces.has(wsKey))
    wsKey = getState().currWorkspace;
  if (wsKey == null) {
    throw new Error(`Current directory "${plinkEnv.workDir}" is not a work space`);
  }

  if (opts?.mergeTsconfig) {
    const json = mergeBaseUrlAndPaths(ts, opts.mergeTsconfig, basePath, compilerOptions);
    for (const [key, value] of Object.entries(json.compilerOptions)) {
      if (!COMPILER_OPTIONS_MERGE_EXCLUDE.has(key)) {
        compilerOptions[key] = value;
        log.debug('merge compiler options', key, value);
      }
    }
  }

  // appendTypeRoots([], cwd, compilerOptions, {});
  setTsCompilerOptForNodePath(basePath, './', compilerOptions, {
    enableTypeRoots: true,
    workspaceDir: plinkEnv.workDir,
    realPackagePaths: true
  });

  if (opts?.pathsJsons) {
    if (Array.isArray(opts.pathsJsons)) {
      compilerOptions.paths = opts.pathsJsons.reduce((pathMap, jsonStr) => {
        Object.assign(pathMap, JSON.parse(jsonStr));
        return pathMap;
      }, compilerOptions.paths ?? {});
    } else {
      Object.assign(compilerOptions.paths!, opts.pathsJsons);
    }
  }

  // if (compilerOptions.paths == null)
  //   compilerOptions.paths = {};
  // compilerOptions.paths['*'] = ['node_modules/*'];

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
  const {srcDir, destDir, pkgDir, isomDir} = foundPkgInfo;

  const pathWithinPkg = relative(pkgDir, _originPath);

  if (srcDir === '.' || srcDir.length === 0) {
    fileName = join(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg);
  } else if (pathWithinPkg.startsWith(srcDir + sep)) {
    fileName = join(pkgDir, isSrcFile ? srcDir : destDir, pathWithinPkg.slice(srcDir.length + 1));
  } else if (isomDir && pathWithinPkg.startsWith(isomDir + sep)) {
    fileName = join(pkgDir, isomDir, pathWithinPkg.slice(isomDir.length + 1));
  }
  return fileName;
}
