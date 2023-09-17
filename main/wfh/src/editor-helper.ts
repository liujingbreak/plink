/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable max-len */
import Path from 'path';
import * as fs from 'fs-extra';
import _ from 'lodash';
import log4js from 'log4js';
import chalk from 'chalk';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ActionCreatorWithPayload, PayloadAction} from '@reduxjs/toolkit';
import ts from 'typescript';
import {setTsCompilerOptForNodePath, CompilerOptions, packages4WorkspaceKey} from './package-mgr/package-list-helper';
import {getProjectList, pathToProjKey, getState as getPkgState, updateGitIgnores, slice as pkgSlice,
  isCwdWorkspace, workspaceDir} from './package-mgr';
import {stateFactory, ofPayloadAction, action$Of} from './store';
import * as _recp from './recipe-manager';
import {symbolicLinkPackages} from './rwPackageJson';
import {getPackageSettingFiles} from './config';
import {plinkEnv, closestCommonParentDir} from './utils/misc';
// import isp from 'inspector';
// if (process.send)
//   isp.open(9222, '0.0.0.0', true);

const {workDir, rootDir: rootPath} = plinkEnv;


// import Selector from './utils/ts-ast-query';
const log = log4js.getLogger('plink.editor-helper');
// const {parse} = require('comment-json');

interface EditorHelperState {
  /** tsconfig files should be changed according to linked packages state */
  tsconfigByRelPath: Map<string, HookedTsconfig>;
  /** Problematic symlinks which must be removed before running:
   * 
   * When node_modules symlink is under source package directory (if there is only one source package in this project, and its parent directory
   * is root directory directly, then Plink must create a symlink "node_modules" to linked to node_modules which is under current worktree space,
   * and the symlink have to be inside source package), it will not work with "--preserve-symlinks",
   * in which case, Node.js will regard a workspace node_module and its symlink inside source package as
   * two different directory, and causes problem like same 3rd party module is loaded twice for the dependent source package
   */
  nodeModuleSymlinks?: Set<string>;
}

interface HookedTsconfig {
  /** absolute path or path relative to root path, any path that is stored in Redux store, the better it is in form of
   * relative path of Root path
   */
  relPath: string;
  baseUrl: string;
  originJson: any;
}

const initialState: EditorHelperState = {
  tsconfigByRelPath: new Map()
};

const slice = stateFactory.newSlice({
  name: 'editor-helper',
  initialState,
  reducers: {
    clearSymlinks() {},
    hookTsconfig(s, {payload}: PayloadAction<string[]>) {},
    unHookTsconfig(s, {payload}: PayloadAction<string[]>) {
      for (const file of payload) {
        const relPath = relativePath(file);
        s.tsconfigByRelPath.delete(relPath);
      }
    },
    unHookAll() {},
    clearSymlinksDone(S) {}
  }
});

export const dispatcher = stateFactory.bindActionCreators(slice);

stateFactory.addEpic<EditorHelperState>((action$, state$) => {
  let noModuleSymlink: Set<string>;

  function updateNodeModuleSymlinks(wsKey: string) {
    if (noModuleSymlink == null) {
      noModuleSymlink = new Set();
      for (const projDir of getPkgState().project2Packages.keys()) {
        const rootPkgJson = require(Path.resolve(plinkEnv.rootDir, projDir, 'package.json')) as {plink?: {noModuleSymlink?: string[]}};
        for (const dir of (rootPkgJson.plink?.noModuleSymlink || []).map(item => Path.resolve(plinkEnv.rootDir, projDir, item))) {
          noModuleSymlink.add(dir);
        }
      }
    }

    const currWorkspaceDir = workspaceDir(wsKey);
    const srcPkgSet = new Set(Array.from(packages4WorkspaceKey(wsKey, false)).map(pkg => pkg.realPath));
    const srcDirs = Array.from(_recp.allSrcDirs())
      .map(item => item.projDir ? Path.resolve(item.projDir, item.srcDir) : item.srcDir);
    return rx.from(srcDirs).pipe(
      op.filter(dir => !noModuleSymlink.has(dir)),
      op.tap(srcDir => {
        rx.of({name: 'node_modules', realPath: Path.join(currWorkspaceDir, 'node_modules')}).pipe(
          symbolicLinkPackages(srcDir)
        ).subscribe();
      }),
      // only those "node_modules" symlink which are inside source package need to be remove
      // otherwise it will mess up Node.js module lookup algorithm
      op.filter(srcDir => srcPkgSet.has(srcDir)),
      op.reduce<string, string[]>((acc, item) => {
        acc.push(item);
        return acc;
      }, []),
      op.mergeMap(dirs => {
        dispatcher._change(s => {
          s.nodeModuleSymlinks = new Set();
          for (const destDir of dirs) {
            s.nodeModuleSymlinks.add(Path.join(destDir, 'node_modules'));
          }
        });
        return dirs;
      })
    );
  }

  return rx.merge(
    action$.pipe(ofPayloadAction(slice.actions.clearSymlinks),
      op.concatMap(() => {
        return rx.from(_recp.allSrcDirs()).pipe(
          op.map(item => item.projDir ? Path.resolve(item.projDir, item.srcDir, 'node_modules') :
            Path.resolve(item.srcDir, 'node_modules')),
          op.mergeMap(dir => {
            return rx.from(fs.promises.lstat(dir)).pipe(
              op.filter(stat => stat.isSymbolicLink()),
              op.mergeMap(stat => {
                log.info('remove symlink ' + dir);
                return fs.promises.unlink(dir);
              }),
              op.catchError((err, src) => rx.EMPTY)
            );
          }),
          op.finalize(() => dispatcher.clearSymlinksDone())
        );
      })
    ),
    action$.pipe(ofPayloadAction(pkgSlice.actions.workspaceChanged),
      op.concatMap(async ({payload: wsKeys}) => {
        const wsDir = isCwdWorkspace() ?
          workDir :
          getPkgState().currWorkspace ?
            Path.resolve(rootPath, getPkgState().currWorkspace!) :
            undefined;
        await writePackageSettingType();
        const lastWsKey = wsKeys[wsKeys.length - 1];
        updateTsconfigFileForProjects(lastWsKey);
        await Promise.all(Array.from(getState().tsconfigByRelPath.values())
          .map(data => updateHookedTsconfig(data, wsDir)));
        return updateNodeModuleSymlinks(lastWsKey);
      })
    ),
    action$.pipe(ofPayloadAction(slice.actions.hookTsconfig),
      op.mergeMap(action => {
        return action.payload;
      }),
      op.mergeMap((file) => {
        const relPath = Path.relative(rootPath, file).replace(/\\/g, '/');
        const backupFile = backupTsConfigOf(file);
        const isBackupExists = fs.existsSync(backupFile);
        const fileContent = isBackupExists ? fs.readFileSync(backupFile, 'utf8') : fs.readFileSync(file, 'utf8');
        const json = JSON.parse(fileContent) as {compilerOptions: CompilerOptions};
        const data: HookedTsconfig = {
          relPath,
          baseUrl: json.compilerOptions.baseUrl,
          originJson: json
        };
        dispatcher._change(s => {
          s.tsconfigByRelPath.set(relPath, data);
        });

        if (!isBackupExists) {
          fs.writeFileSync(backupFile, fileContent);
        }
        const wsDir = isCwdWorkspace() ? workDir :
          getPkgState().currWorkspace ? Path.resolve(rootPath, getPkgState().currWorkspace!)
          : undefined;
        return updateHookedTsconfig(data, wsDir);
      })
    ),
    action$.pipe(ofPayloadAction(slice.actions.unHookTsconfig),
      op.mergeMap(({payload}) => payload),
      op.mergeMap(file => {
        const absFile = Path.resolve(rootPath, file);
        const backup = backupTsConfigOf(absFile);
        if (fs.existsSync(backup)) {
          log.info('Roll back:', absFile);
          return fs.promises.copyFile(backup, absFile);
        }
        return Promise.resolve();
      })
    ),
    action$.pipe(ofPayloadAction(slice.actions.unHookAll),
      op.tap(() => {
        dispatcher.unHookTsconfig(Array.from(getState().tsconfigByRelPath.keys()));
      })
    )
  ).pipe(
    op.ignoreElements(),
    op.catchError((err, caught) => {
      log.error(err);
      return caught;
    })
  );
});

export function getAction$(type: keyof (typeof slice)['caseReducers']) {
  return action$Of(stateFactory, slice.actions[type] as ActionCreatorWithPayload<any, any>);
}

export function getState() {
  return stateFactory.sliceState(slice);
}

export function getStore() {
  return stateFactory.sliceStore(slice);
}

function relativePath(file: string) {
  return Path.relative(rootPath, file).replace(/\\/g, '/');
}

function updateTsconfigFileForProjects(wsKey: string, includeProject?: string) {
  const ws = getPkgState().workspaces.get(wsKey);
  if (ws == null)
    return;

  const projectDirs = getProjectList();
  const workspaceDir = Path.resolve(rootPath, wsKey);

  const recipeManager = require('./recipe-manager') as typeof _recp;

  const srcRootDir = closestCommonParentDir(projectDirs);

  if (includeProject) {
    writeTsConfigForProj(includeProject);
  } else {
    for (const proj of projectDirs) {
      writeTsConfigForProj(proj);
    }
  }

  function writeTsConfigForProj(proj: string) {
    const include: string[] = [];
    recipeManager.eachRecipeSrc(proj, (srcDir: string) => {
      let includeDir = Path.relative(proj, srcDir).replace(/\\/g, '/');
      if (includeDir && includeDir !== '/')
        includeDir += '/';
      include.push(includeDir + '**/*.ts');
      include.push(includeDir + '**/*.tsx');
    });

    if (pathToProjKey(proj) === getPkgState().linkedDrcpProject) {
      include.push('main/wfh/**/*.ts');
    }
    // include.push('dist/*.package-settings.d.ts');
    const tsconfigFile = createTsConfig(proj, srcRootDir, workspaceDir, {},
      // {'_package-settings': [Path.relative(proj, packageSettingDtsFileOf(workspaceDir))
      //   .replace(/\\/g, '/')
      //   .replace(/\.d\.ts$/, '')]
      // },
      include
    );
    const projDir = Path.resolve(proj);
    updateGitIgnores({file: Path.resolve(proj, '.gitignore'),
      lines: [
        Path.relative(projDir, tsconfigFile).replace(/\\/g, '/')
      ]
    });
    updateGitIgnores({
      file: Path.resolve(rootPath, '.gitignore'),
      lines: [Path.relative(rootPath, Path.resolve(workspaceDir, 'types')).replace(/\\/g, '/')]
    });
  }
}

function writePackageSettingType() {
  const done = new Array<Promise<unknown>>(getPkgState().workspaces.size);
  let i = 0;
  for (const wsKey of getPkgState().workspaces.keys()) {
    let header = '';
    // let body = 'export interface PackagesConfig {\n';
    let interfaceBody = 'declare module \'@wfh/plink\' {\n';
    interfaceBody += '  interface PlinkSettings {\n';
    for (const [typeFile, typeExport, _defaultFile, _defaultExport, pkg] of getPackageSettingFiles(wsKey)) {
      const varName = pkg.shortName.replace(/-([^])/g, (match, g1: string) => g1.toUpperCase());
      const typeName = varName.charAt(0).toUpperCase() + varName.slice(1);
      header += `import {${typeExport} as ${typeName}} from '${pkg.name}/${typeFile}';\n`;
      // body += `  '${pkg.name}': ${typeName};\n`;
      interfaceBody += `    '${pkg.name}': ${typeName};\n`;
    }
    // body += '}\n';
    interfaceBody += '  }\n}\n';
    const typeFile = Path.resolve(rootPath, wsKey, 'node_modules/@types/plink-settings/index.d.ts');
    const typeFileContent = header + interfaceBody;
    fs.mkdirpSync(Path.dirname(typeFile));
    if (!fs.existsSync(typeFile) || fs.readFileSync(typeFile, 'utf8') !== typeFileContent) {
      done[i++] = fs.promises.writeFile(typeFile, typeFileContent);
      log.info('write package setting definition file', chalk.blue(typeFile));
    }

    // const file = Path.join(distDir, wsKey + '.package-settings.d.ts');
    // log.info(`write setting file: ${chalk.blue(file)}`);
    // done[i++] = fs.promises.writeFile(file, header + body);
  }
  return Promise.all(done);
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
function createTsConfig(proj: string, srcRootDir: string, workspace: string,
  extraPathMapping: {[path: string]: string[]},
  include = ['**/*.ts']) {
  const tsjson: {extends?: string; include: string[]; exclude: string[]; compilerOptions?: Partial<CompilerOptions>} = {
    extends: undefined,
    include,
    exclude: ['**/node_modules', '**/node_modules.*']
  };
  const drcpDir = (getPkgState().linkedDrcp || getPkgState().installedDrcp)!.realPath;
  // tsjson.include = [];
  tsjson.extends = Path.relative(proj, Path.resolve(drcpDir, 'wfh/tsconfig-base.json'));
  if (!Path.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
    tsjson.extends = './' + tsjson.extends;
  }
  tsjson.extends = tsjson.extends.replace(/\\/g, '/');

  const rootDir = Path.relative(proj, srcRootDir).replace(/\\/g, '/') || '.';
  tsjson.compilerOptions = {
    rootDir,
    // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
    skipLibCheck: false,
    jsx: 'preserve',
    target: 'es2015',
    module: 'nodenext',
    strict: true,
    declaration: false, // Important: to avoid https://github.com/microsoft/TypeScript/issues/29808#issuecomment-487811832
    paths: extraPathMapping
  };
  setTsCompilerOptForNodePath(proj, proj, tsjson.compilerOptions, {
    workspaceDir: workspace,
    enableTypeRoots: true,
    realPackagePaths: true
  });
  const tsconfigFile = Path.resolve(proj, 'tsconfig.json');
  writeTsConfigFile(tsconfigFile, tsjson);
  return tsconfigFile;
}

function backupTsConfigOf(file: string) {
  // const tsconfigDir = Path.dirname(file);
  const m = /([^/\\.]+)(\.[^/\\.]+)?$/.exec(file);
  const backupFile = Path.resolve(file.slice(0, file.length - m![0].length) + m![1] + '.orig' + m![2]);
  return backupFile;
}


async function updateHookedTsconfig(data: HookedTsconfig, workspaceDir?: string) {
  const file = Path.isAbsolute(data.relPath)
    ? data.relPath :
    Path.resolve(rootPath, data.relPath);
  const tsconfigDir = Path.dirname(file);
  const backup = backupTsConfigOf(file);

  const json = (fs.existsSync(backup) ?
    JSON.parse(await fs.promises.readFile(backup, 'utf8'))
    : _.cloneDeep(data.originJson) ) as  {compilerOptions?: CompilerOptions};

  // if (json.compilerOptions?.paths && json.compilerOptions.paths['_package-settings'] != null) {
  //   delete json.compilerOptions.paths['_package-settings'];
  // }
  const newCo = setTsCompilerOptForNodePath(tsconfigDir, data.baseUrl,
    json.compilerOptions as any, {
      workspaceDir, enableTypeRoots: true, realPackagePaths: true
    });
  json.compilerOptions = newCo;
  log.info('update:', chalk.blue(file));
  return fs.promises.writeFile(file, JSON.stringify(json, null, '  '));
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existingJson = ts.readConfigFile(tsconfigFile,
      (file) => {
        if (Path.resolve(file) === tsconfigFile)
          return existing;
        else
          return fs.readFileSync(file, 'utf-8');
      }).config;
    overrideTsConfig(tsconfigOverrideSrc, existingJson);
    const newJsonStr = JSON.stringify(existingJson, null, '  ');
    if (newJsonStr !== existing) {
      log.info('Write tsconfig: ' + chalk.blue(tsconfigFile));
      fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
    } else {
      log.debug(`${tsconfigFile} is not changed.`);
    }
  } else {
    log.info('Create tsconfig: ' + chalk.blue(tsconfigFile));
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
