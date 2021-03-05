// tslint:disable: max-line-length
import * as fs from 'fs-extra';
import _ from 'lodash';
import log4js from 'log4js';
import Path from 'path';
import { setTsCompilerOptForNodePath, packages4WorkspaceKey, CompilerOptions } from './package-mgr/package-list-helper';
import { getProjectList, pathToProjKey, getState as getPkgState, updateGitIgnores, slice as pkgSlice,
  isCwdWorkspace } from './package-mgr';
import { stateFactory, ofPayloadAction } from './store';
import * as _recp from './recipe-manager';
import { closestCommonParentDir, getRootDir } from './utils/misc';
import {getPackageSettingFiles} from './config';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import { PayloadAction } from '@reduxjs/toolkit';

// import Selector from './utils/ts-ast-query';
const log = log4js.getLogger('plink.editor-helper');
const {parse} = require('comment-json');

interface EditorHelperState {
  /** tsconfig files should be changed according to linked packages state */
  tsconfigByRelPath: Map<string, HookedTsconfig>;
}

interface HookedTsconfig {
  /** absolute path or path relative to root path, any path that is stored in Redux store, the better it is in form of
   * relative path of Root path
   */
  relPath: string;
  baseUrl: string;
  originJson: any;
}

const initialState: EditorHelperState = {tsconfigByRelPath: new Map()};

const slice = stateFactory.newSlice({
  name: 'editor-helper',
  initialState,
  reducers: {
    hookTsconfig(s, {payload}: PayloadAction<string[]>) {},
    unHookTsconfig(s, {payload}: PayloadAction<string[]>) {
      const rootPath = getRootDir();
      for (const file of payload) {
        const relPath = Path.relative(rootPath, file).replace(/\\/g, '/');
        s.tsconfigByRelPath.delete(relPath);
      }
    },
    unHookAll() {}
  }
});

stateFactory.addEpic<EditorHelperState>((action$, state$) => {
  let plinkInteralTsconfigJson: any;
  return rx.merge(
    action$.pipe(ofPayloadAction(pkgSlice.actions.createSymlinksForWorkspace),
      op.tap(({payload: wsKeys}) => {
        const wsDir = isCwdWorkspace() ? process.cwd() :
          getPkgState().currWorkspace ? Path.resolve(getRootDir(), getPkgState().currWorkspace!)
          : undefined;
        writePackageSettingType();
        if (getPkgState().linkedDrcp) {
          const relPath = Path.resolve(getPkgState().linkedDrcp!.realPath, 'wfh/tsconfig.json');
          if (plinkInteralTsconfigJson == null) {
            plinkInteralTsconfigJson = JSON.parse(fs.readFileSync(relPath, 'utf8'));
          }
          updateHookedTsconfig({
            relPath,
            baseUrl: '.',
            originJson: plinkInteralTsconfigJson
          }, wsDir);
        }
        for (const wsKey of wsKeys) {
          updateTsconfigFileForProjects(wsKey);
        }
        for (const data of getState().tsconfigByRelPath.values()) {
          updateHookedTsconfig(data, wsDir);
        }
      })
    ),
    action$.pipe(ofPayloadAction(slice.actions.hookTsconfig),
      op.mergeMap(action => {
        const rootDir = getRootDir();
        return action.payload.map(file => [file, rootDir]);
      }),
      op.mergeMap(([file, rootPath]) => {
        const relPath = Path.relative(rootPath, file).replace(/\\/g, '/');
        const fileContent = fs.readFileSync(file, 'utf8');
        const json: {compilerOptions: CompilerOptions} = JSON.parse(fileContent);

        const data: HookedTsconfig = {
          relPath,
          baseUrl: json.compilerOptions.baseUrl,
          originJson: json
        };
        dispatcher._change(s => {
          s.tsconfigByRelPath.set(relPath, data);
        });

        const tsconfigDir = Path.dirname(file);
        const backupFile = Path.resolve(tsconfigDir, 'tsconfig.orig.json');
        if (!fs.existsSync(backupFile)) {
          fs.writeFileSync(backupFile, fileContent);
        }
        const wsDir = isCwdWorkspace() ? process.cwd() :
          getPkgState().currWorkspace ? Path.resolve(getRootDir(), getPkgState().currWorkspace!)
          : undefined;
        return updateHookedTsconfig(data, wsDir);
      })
    ),
    action$.pipe(ofPayloadAction(slice.actions.unHookTsconfig),
      op.mergeMap(({payload}) => payload),
      op.mergeMap(file => {
        const tsconfigDir = Path.dirname(file);
        const backupFile = Path.resolve(tsconfigDir, 'tsconfig.orig.json');
        if (fs.existsSync(backupFile)) {
          const fileContent = fs.readFileSync(backupFile, 'utf8');
          return fs.promises.writeFile(file, fileContent);
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
export const dispatcher = stateFactory.bindActionCreators(slice);

export function getState() {
  return stateFactory.sliceState(slice);
}

export function getStore() {
  return stateFactory.sliceStore(slice);
}

export function updateTsconfigFileForProjects(wsKey: string, includeProject?: string) {
  const ws = getPkgState().workspaces.get(wsKey);
  if (ws == null)
    return;

  const projectDirs = getProjectList();
  const workspaceDir = Path.resolve(getRootDir(), wsKey);

  const recipeManager: typeof _recp = require('./recipe-manager');

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
    include.push('dist/*.d.ts');
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
      file: Path.resolve(getRootDir(), '.gitignore'),
      lines: [Path.relative(getRootDir(), Path.resolve(workspaceDir, 'types')).replace(/\\/g, '/')]
    });
  }
}

function writePackageSettingType() {
  const done = new Array(getPkgState().workspaces.size);
  let i = 0;
  for (const wsKey of getPkgState().workspaces.keys()) {
    let header = '';
    let body = 'export interface PackagesConfig {\n';
    for (const [typeFile, typeExport, _defaultFile, _defaultExport, pkg] of getPackageSettingFiles(wsKey)) {
      const varName = pkg.shortName.replace(/-([^])/g, (match, g1) => g1.toUpperCase());
      const typeName = varName.charAt(0).toUpperCase() + varName.slice(1);
      header += `import {${typeExport} as ${typeName}} from '${pkg.name}/${typeFile}';\n`;
      body += `  '${pkg.name}': ${typeName};\n`;
    }
    body += '}\n';
    // log.info(header + body);
    const workspaceDir = Path.resolve(getRootDir(), wsKey);
    const file = packageSettingDtsFileOf(workspaceDir);
    log.info(`write file: ${file}`);
    done[i++] = fs.promises.writeFile(file, header + body);
    const dir = Path.dirname(file);
    const srcRootDir = closestCommonParentDir([
      dir,
      closestCommonParentDir(Array.from(packages4WorkspaceKey(wsKey)).map(pkg => pkg.realPath))
    ]);
    createTsConfig(dir, srcRootDir, workspaceDir, {}, ['*.ts']);
  }
}

function packageSettingDtsFileOf(workspaceDir: string) {
  return Path.resolve(workspaceDir, '.links/_package-settings.d.ts');
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
function createTsConfig(proj: string, srcRootDir: string, workspace: string | null,
  extraPathMapping: {[path: string]: string[]},
  include = ['**/*.ts']) {
  const tsjson: any = {
    extends: null,
    include
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
    module: 'commonjs',
    declaration: false, // Important: to avoid https://github.com/microsoft/TypeScript/issues/29808#issuecomment-487811832
    paths: extraPathMapping
  };
  setTsCompilerOptForNodePath(proj, proj, tsjson.compilerOptions, {
    workspaceDir: workspace != null ? workspace : undefined,
    enableTypeRoots: true,
    realPackagePaths: true
  });
  const tsconfigFile = Path.resolve(proj, 'tsconfig.json');
  writeTsConfigFile(tsconfigFile, tsjson);
  return tsconfigFile;
}


function updateHookedTsconfig(data: HookedTsconfig, workspaceDir?: string) {
  const file = Path.isAbsolute(data.relPath) ? data.relPath :
    Path.resolve(getRootDir(), data.relPath);
  const tsconfigDir = Path.dirname(file);

  const json = _.cloneDeep(data.originJson);
  const newCo = setTsCompilerOptForNodePath(tsconfigDir, data.baseUrl,
    json.compilerOptions, {
      workspaceDir, enableTypeRoots: true, realPackagePaths: true
    });
  json.compilerOptions = newCo;
  log.info(file, 'is updated');
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
