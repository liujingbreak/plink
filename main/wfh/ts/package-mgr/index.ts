/**
 * Unfortunately, this file is very long, you need to fold by indention for better view of source code in Editor
 */

import { PayloadAction } from '@reduxjs/toolkit';
import chalk from 'chalk';
import fsext from 'fs-extra';
import fs from 'fs';
import _ from 'lodash';
import Path from 'path';
import {from, merge, Observable, of, defer, throwError, EMPTY, concat} from 'rxjs';
import { distinctUntilChanged, filter, map, debounceTime, takeWhile,
  take, concatMap, ignoreElements, scan, catchError, tap, finalize } from 'rxjs/operators';
import { listCompDependency, PackageJsonInterf, DependentInfo } from '../transitive-dep-hoister';
import { exe } from '../process-utils';
import { setProjectList, setLinkPatterns} from '../recipe-manager';
import { stateFactory, ofPayloadAction } from '../store';
import {isActionOfCreator, castByActionType} from '../../../packages/redux-toolkit-observable/dist/helper';
// import { getRootDir } from '../utils/misc';
import cleanInvalidSymlinks, { isWin32, listModuleSymlinks, unlinkAsync } from '../utils/symlinks';
import {symbolicLinkPackages} from '../rwPackageJson';
import { EOL } from 'os';
import {getLogger} from 'log4js';
import { plinkEnv } from '../utils/misc';
const log = getLogger('plink.package-mgr');
export interface PackageInfo {
  name: string;
  scope: string;
  shortName: string;
  json: {
    plink?: PlinkJsonType;
    dr?: PlinkJsonType;
    [p: string]: any;
  } & PackageJsonInterf;
  /** Be aware: If this property is not same as "realPath",
   * then it is a symlink whose path is relative to workspace directory */
  path: string;
  realPath: string;
  isInstalled: boolean;
}

export type PlinkJsonType = {
  typeRoot?: string;
  type?: 'server' | string[] | string;
  serverPriority?: string | number;
  serverEntry?: string;
  setting?: {
    /** In form of "<path>#<export-name>" */
    type: string;
    /** In form of "<module-path>#<export-name>" */
    value: string;
  };
  [p: string]: any;
};

export interface PackagesState {
  npmInstallOpt: NpmOptions;
  inited: boolean;
  srcPackages: Map<string, PackageInfo>;
  /** Key is relative path to root workspace */
  workspaces: Map<string, WorkspaceState>;
  /** key of current "workspaces" */
  currWorkspace?: string | null;
  project2Packages: Map<string, string[]>;
  srcDir2Packages: Map<string, string[]>;
  /** Drcp is the original name of Plink project */
  linkedDrcp?: PackageInfo | null;
  linkedDrcpProject?: string | null;
  installedDrcp?: PackageInfo | null;
  gitIgnores: {[file: string]: string[]};
  isInChina?: boolean;
  /** Everytime a hoist workspace state calculation is basically done, it is increased by 1 */
  workspaceUpdateChecksum: number;
  packagesUpdateChecksum: number;
  /** workspace key */
  lastCreatedWorkspace?: string;
}

const {distDir, rootDir, plinkDir, isDrcpSymlink, symlinkDirName} = plinkEnv;

const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

const state: PackagesState = {
  inited: false,
  workspaces: new Map(),
  project2Packages: new Map(),
  srcDir2Packages: new Map(),
  srcPackages: new Map(),
  gitIgnores: {},
  workspaceUpdateChecksum: 0,
  packagesUpdateChecksum: 0,
  npmInstallOpt: {isForce: false}
};

export interface WorkspaceState {
  id: string;
  originInstallJson: PackageJsonInterf;
  originInstallJsonStr: string;
  installJson: PackageJsonInterf;
  installJsonStr: string;
  /** names of those linked source packages */
  linkedDependencies: [string, string][];
  /** names of those linked source packages */
  linkedDevDependencies: [string, string][];

  /** installed DR component packages [name, version]*/
  installedComponents?: Map<string, PackageInfo>;

  hoistInfo: Map<string, DependentInfo>;
  hoistPeerDepInfo: Map<string, DependentInfo>;

  hoistDevInfo: Map<string, DependentInfo>;
  hoistDevPeerDepInfo: Map<string, DependentInfo>;

  hoistInfoSummary?: {
    /** User should manully add them as dependencies of workspace */
    missingDeps: {[name: string]: string};
    /** User should manully add them as devDependencies of workspace */
    missingDevDeps: {[name: string]: string};
    /** versions are conflict */
    conflictDeps: string[];
  };
}

export interface NpmOptions {
  cache?: string;
  isForce: boolean;
  useNpmCi?: boolean;
  offline?: boolean;
}

export const slice = stateFactory.newSlice({
  name: NS,
  initialState: state,
  reducers: {
    /** Do this action after any linked package is removed or added  */
    initRootDir(d, {payload}: PayloadAction<NpmOptions>) {
      d.npmInstallOpt.cache = payload.cache;
      d.npmInstallOpt.useNpmCi = payload.useNpmCi;
    },

    /** 
     * - Create initial files in root directory
     * - Scan linked packages and install transitive dependency
     * - Switch to different workspace
     * - Delete nonexisting workspace
     * - If "packageJsonFiles" is provided, it should skip step of scanning linked packages
     * - TODO: if there is linked package used in more than one workspace, hoist and install for them all?
     */
    updateWorkspace(d, {payload}: PayloadAction<{
      dir: string;
      // createHook: boolean;
      packageJsonFiles?: string[];
    } & NpmOptions>) {
      d.npmInstallOpt.cache = payload.cache;
      d.npmInstallOpt.useNpmCi = payload.useNpmCi;
    },
    scanAndSyncPackages(d: PackagesState, action: PayloadAction<{packageJsonFiles?: string[]}>) {
    },

    updateDir() {},
    _updatePlinkPackageInfo(d) {
      const plinkPkg = createPackageInfo(Path.resolve(plinkDir, 'package.json'), false);
      if (isDrcpSymlink) {
        d.linkedDrcp = plinkPkg;
        d.installedDrcp = null;
        d.linkedDrcpProject = pathToProjKey(Path.dirname(d.linkedDrcp.realPath));
      } else {
        d.linkedDrcp = null;
        d.installedDrcp = plinkPkg;
        d.linkedDrcpProject = null;
      }
    },
    _syncLinkedPackages(d, {payload}: PayloadAction<[pkgs: PackageInfo[], operator: 'update' | 'clean']>) {
      d.inited = true;
      let map = d.srcPackages;
      if (payload[1] === 'clean') {
        map = d.srcPackages = new Map<string, PackageInfo>();
      }
      for (const pkInfo of payload[0]) {
        map.set(pkInfo.name, pkInfo);
      }
    },
    onLinkedPackageAdded(d, action: PayloadAction<string[]>) {},
    addProject(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathToProjKey(rawDir);
        if (!d.project2Packages.has(dir)) {
          d.project2Packages.set(dir, []);
        }
      }
    },
    deleteProject(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathToProjKey(rawDir);
        d.project2Packages.delete(dir);
      }
    },
    addSrcDirs(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathToProjKey(rawDir);
        if (!d.srcDir2Packages.has(dir)) {
          d.srcDir2Packages.set(dir, []);
        }
      }
    },
    deleteSrcDirs(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathToProjKey(rawDir);
        d.srcDir2Packages.delete(dir);
      }
    },
    /** payload: workspace keys, happens as debounced workspace change event */
    _workspaceBatchChanged(d, action: PayloadAction<string[]>) {},
    /** workspaceChanged is safe for external module to watch, it serialize actions like "_installWorkspace" and "_workspaceBatchChanged" */
    workspaceChanged(d, action: PayloadAction<string[]>) {},
    updateGitIgnores(d, {payload: {file, lines}}: PayloadAction<{file: string; lines: string[]}>) {
      let rel = file, abs = file;
      if (Path.isAbsolute(file)) {
        rel = Path.relative(rootDir, file).replace(/\\/g, '/');
        abs = file;
      } else {
        abs = Path.resolve(rootDir, file);
      }
      if (d.gitIgnores[abs]) {
        delete d.gitIgnores[abs];
      }
      d.gitIgnores[rel] = lines.map(line => line.startsWith('/') ? line : '/' + line);
    },
    packagesUpdated(d) {
      d.packagesUpdateChecksum++;
    },
    setInChina(d, {payload}: PayloadAction<boolean>) {
      d.isInChina = payload;
    },
    _setCurrentWorkspace(d, {payload: dir}: PayloadAction<string | null>) {
      if (dir != null)
        d.currWorkspace = workspaceKey(dir);
      else
        d.currWorkspace = null;
    },
    /** paramter: workspace key */
    workspaceStateUpdated(d, {payload}: PayloadAction<string>) {
      d.workspaceUpdateChecksum += 1;
    },
    // onWorkspacePackageUpdated(d, {payload: workspaceKey}: PayloadAction<string>) {},
    _hoistWorkspaceDeps(state, {payload: {dir}}: PayloadAction<{dir: string}>) {
      if (state.srcPackages == null) {
        throw new Error('"srcPackages" is null, need to run `init` command first');
      }

      let pkjsonStr: string;
      const pkgjsonFile = Path.resolve(dir, 'package.json');
      const lockFile = Path.resolve(dir, 'plink.install.lock');
      if (fs.existsSync(lockFile)) {
        log.warn('Plink init/sync process was interrupted last time, recover content of ' + pkgjsonFile);
        pkjsonStr = fs.readFileSync(lockFile, 'utf8');
        fs.unlinkSync(lockFile);
      } else {
        pkjsonStr = fs.readFileSync(pkgjsonFile, 'utf8');
      }
      const pkjson: PackageJsonInterf = JSON.parse(pkjsonStr);
      // for (const deps of [pkjson.dependencies, pkjson.devDependencies] as {[name: string]: string}[] ) {
      //   Object.entries(deps);
      // }

      const deps = Object.entries<string>(pkjson.dependencies || {});

      // const updatingDeps = {...pkjson.dependencies || {}};
      const linkedDependencies: typeof deps = [];
      deps.forEach(dep => {
        if (state.srcPackages.has(dep[0])) {
          linkedDependencies.push(dep);
        }
      });
      const devDeps = Object.entries<string>(pkjson.devDependencies || {});
      // const updatingDevDeps = {...pkjson.devDependencies || {}};
      const linkedDevDependencies: typeof devDeps = [];
      devDeps.forEach(dep => {
        if (state.srcPackages.has(dep[0])) {
          linkedDevDependencies.push(dep);
        }
      });

      const wsKey = workspaceKey(dir);
      const {hoisted: hoistedDeps, hoistedPeers: hoistPeerDepInfo,
        hoistedDev: hoistedDevDeps, hoistedDevPeers: devHoistPeerDepInfo
      } =
        listCompDependency(
          state.srcPackages, wsKey, pkjson.dependencies || {}, pkjson.devDependencies
      );


      const installJson: PackageJsonInterf = {
        ...pkjson,
        dependencies: Array.from(hoistedDeps.entries())
        .concat(Array.from(hoistPeerDepInfo.entries()).filter(item => !item[1].missing))
        .filter(([name]) => !isDrcpSymlink || name !== '@wfh/plink')
        .reduce((dic, [name, info]) => {
          dic[name] = info.by[0].ver;
          return dic;
        }, {} as {[key: string]: string}),

        devDependencies: Array.from(hoistedDevDeps.entries())
        .concat(Array.from(devHoistPeerDepInfo.entries()).filter(item => !item[1].missing))
        .filter(([name]) => !isDrcpSymlink || name !== '@wfh/plink')
        .reduce((dic, [name, info]) => {
          dic[name] = info.by[0].ver;
          return dic;
        }, {} as {[key: string]: string})
      };

      // log.info(installJson)
      // const installedComp = scanInstalledPackage4Workspace(state.workspaces, state.srcPackages, wsKey);

      const existing = state.workspaces.get(wsKey);

      const hoistInfoSummary: WorkspaceState['hoistInfoSummary'] = {
        conflictDeps: [], missingDeps: {}, missingDevDeps: {}
      };

      for (const depsInfo of [hoistedDeps, hoistPeerDepInfo]) {
        for (const [dep, info] of depsInfo.entries()) {
          if (info.missing) {
            hoistInfoSummary.missingDeps[dep] = info.by[0].ver;
          }
          if (!info.sameVer && !info.direct) {
            hoistInfoSummary.conflictDeps.push(dep);
          }
        }
      }
      for (const depsInfo of [hoistedDevDeps, devHoistPeerDepInfo]) {
        for (const [dep, info] of depsInfo.entries()) {
          if (info.missing) {
            hoistInfoSummary.missingDevDeps[dep] = info.by[0].ver;
          }
          if (!info.sameVer && !info.direct) {
            hoistInfoSummary.conflictDeps.push(dep);
          }
        }
      }

      const wp: WorkspaceState = {
        id: wsKey,
        originInstallJson: pkjson,
        originInstallJsonStr: pkjsonStr,
        installJson,
        installJsonStr: JSON.stringify(installJson, null, '  '),
        linkedDependencies,
        linkedDevDependencies,
        hoistInfo: hoistedDeps,
        hoistPeerDepInfo,
        hoistDevInfo: hoistedDevDeps,
        hoistDevPeerDepInfo: devHoistPeerDepInfo,
        hoistInfoSummary
      };
      state.lastCreatedWorkspace = wsKey;
      state.workspaces.set(wsKey, existing ? Object.assign(existing, wp) : wp);
    },
    _installWorkspace(d, {payload: {workspaceKey}}: PayloadAction<{workspaceKey: string}>) {},
    // _createSymlinksForWorkspace(d, action: PayloadAction<string>) {},
    _associatePackageToPrj(d, {payload: {prj, pkgs}}: PayloadAction<{prj: string; pkgs: {name: string}[]}>) {
      d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
    },
    _associatePackageToSrcDir(d,
      {payload: {pattern, pkgs}}: PayloadAction<{pattern: string; pkgs: {name: string}[]}>) {
      d.srcDir2Packages.set(pathToProjKey(pattern), pkgs.map(pkgs => pkgs.name));
    }
  }
});

export const actionDispatcher = stateFactory.bindActionCreators(slice);
export const {updateGitIgnores, onLinkedPackageAdded} = actionDispatcher;

/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
stateFactory.addEpic((action$, state$) => {
  const updatedWorkspaceSet = new Set<string>();
  const packageAddedList = new Array<string>();

  const gitIgnoreFilesWaiting = new Set<string>();

  if (getState().srcDir2Packages == null) {
    // Because srcDir2Packages is newly added, to avoid existing project
    // being broken for missing it in previously stored state file
    actionDispatcher._change(s => s.srcDir2Packages = new Map());
  }
  const actionByTypes = castByActionType(slice.actions, action$);
  return merge(
    // To override stored state. 
    // Do not put following logic in initialState! It will be overridden by previously saved state

    defer(() => {
      process.nextTick(() => actionDispatcher._updatePlinkPackageInfo());
      return EMPTY;
    }),
    getStore().pipe(map(s => s.project2Packages),
      distinctUntilChanged(),
      map(pks => {
        setProjectList(getProjectList());
        return pks;
      }),
      ignoreElements()
    ),

    getStore().pipe(map(s => s.srcDir2Packages),
      distinctUntilChanged(),
      filter(v => v != null),
      map((linkPatternMap) => {
        setLinkPatterns(linkPatternMap.keys());
      })),

    getStore().pipe(map(s => s.srcPackages),
      distinctUntilChanged(),
      scan<PackagesState['srcPackages']>((prevMap, currMap) => {
        packageAddedList.splice(0);
        for (const nm of currMap.keys()) {
          if (!prevMap.has(nm)) {
            packageAddedList.push(nm);
          }
        }
        if (packageAddedList.length > 0)
          onLinkedPackageAdded(packageAddedList);
        return currMap;
      })
    ),
    //  updateWorkspace
    actionByTypes.updateWorkspace.pipe(
      concatMap(({payload: {dir, isForce, useNpmCi, packageJsonFiles}}) => {
        dir = Path.resolve(dir);
        actionDispatcher._setCurrentWorkspace(dir);
        maybeCopyTemplate(Path.resolve(__dirname, '../../templates/app-template.js'), Path.resolve(dir, 'app.js'));
        checkAllWorkspaces();
        const lockFile = Path.resolve(dir, 'plink.install.lock');
        if (fs.existsSync(lockFile) || isForce || useNpmCi) {
          // Chaning installJsonStr to force action _installWorkspace being dispatched later
          const wsKey = workspaceKey(dir);
          if (getState().workspaces.has(wsKey)) {
            actionDispatcher._change(d => {
              // clean to trigger install action
              const ws = d.workspaces.get(wsKey)!;
              ws.installJsonStr = '';
              ws.installJson.dependencies = {};
              ws.installJson.devDependencies = {};
              // eslint-disable-next-line no-console
              log.debug('force npm install in', wsKey);
            });
          }
        }
        // call initRootDirectory() and wait for it finished by observing action '_syncLinkedPackages',
        // then call _hoistWorkspaceDeps
        return merge(
          packageJsonFiles != null ? scanAndSyncPackages(packageJsonFiles) :
            defer(() => of(initRootDirectory())),
          action$.pipe(
            ofPayloadAction(slice.actions._syncLinkedPackages),
            take(1),
            map(() => actionDispatcher._hoistWorkspaceDeps({dir}))
          )
        );
      })
    ),
    actionByTypes.scanAndSyncPackages.pipe(
      concatMap(({payload}) => {
        return merge(
          scanAndSyncPackages(payload.packageJsonFiles),
          action$.pipe(
            ofPayloadAction(slice.actions._syncLinkedPackages),
            take(1),
            tap(() => {
              const currWs = getState().currWorkspace;
              for (const wsKey of getState().workspaces.keys()) {
                if (wsKey !== currWs)
                  actionDispatcher._hoistWorkspaceDeps({dir: Path.resolve(rootDir, wsKey)});
              }
              if (currWs != null) {
                // Make sure "current workspace" is the last one being updated, so that it remains "current"
                actionDispatcher._hoistWorkspaceDeps({dir: Path.resolve(rootDir, currWs)});
              }
            })
          )
        );
      })
    ),

    // initRootDir
    actionByTypes.initRootDir.pipe(
      map(({payload}) => {
        checkAllWorkspaces();
        if (getState().workspaces.has(workspaceKey(plinkEnv.workDir))) {
          actionDispatcher.updateWorkspace({dir: plinkEnv.workDir,
            ...payload});
        } else {
          const curr = getState().currWorkspace;
          if (curr != null) {
            if (getState().workspaces.has(curr)) {
              const path = Path.resolve(rootDir, curr);
              actionDispatcher.updateWorkspace({dir: path, ...payload});
            } else {
              actionDispatcher._setCurrentWorkspace(null);
            }
          }
        }
      })
    ),

    actionByTypes._hoistWorkspaceDeps.pipe(
      map(({payload}) => {
        const wsKey = workspaceKey(payload.dir);
        // actionDispatcher.onWorkspacePackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => actionDispatcher.workspaceStateUpdated(wsKey));
      })
    ),

    actionByTypes.updateDir.pipe(
      tap(() => actionDispatcher._updatePlinkPackageInfo()),
      concatMap(() => scanAndSyncPackages()),
      tap(() => {
        for (const key of getState().workspaces.keys()) {
          updateInstalledPackageForWorkspace(key);
        }
      })
    ),
    // Handle newly added workspace
    getStore().pipe(map(s => s.workspaces),
      distinctUntilChanged(),
      map(ws => {
        const keys = Array.from(ws.keys());
        return keys;
      }),
      scan<string[]>((prev, curr) => {
        if (prev.length < curr.length) {
          const newAdded = _.difference(curr, prev);
          // eslint-disable-next-line no-console
          log.info('New workspace: ', newAdded);
          for (const ws of newAdded) {
            actionDispatcher._installWorkspace({workspaceKey: ws});
          }
        }
        return curr;
      })
    ),
    // observe all existing Workspaces for dependency hoisting result 
    ...Array.from(getState().workspaces.keys()).map(key => {
      return getStore().pipe(
        // filter(s => s.workspaces.has(key)),
        takeWhile(s => s.workspaces.has(key)),
        map(s => s.workspaces.get(key)!),
        distinctUntilChanged((s1, s2) => s1.installJson === s2.installJson),
        scan<WorkspaceState>((old, newWs) => {
          /* eslint-disable max-len */
          const newDeps = Object.entries(newWs.installJson.dependencies || [])
            .concat(Object.entries(newWs.installJson.devDependencies || []))
            .map(entry => entry.join(': '));
          if (newDeps.length === 0) {
            // forcing install workspace, therefore dependencies is cleared at this moment
            return newWs;
          }
          const oldDeps = Object.entries(old.installJson.dependencies || [])
            .concat(Object.entries(old.installJson.devDependencies || []))
            .map(entry => entry.join(': '));

          if (newDeps.length !== oldDeps.length) {
            log.info('newDeps.length', newDeps.length, ' !== oldDeps.length', oldDeps.length);
            actionDispatcher._installWorkspace({workspaceKey: key});
            return newWs;
          }
          newDeps.sort();
          oldDeps.sort();
          for (let i = 0, l = newDeps.length; i < l; i++) {
            if (newDeps[i] !== oldDeps[i]) {
              actionDispatcher._installWorkspace({workspaceKey: key});
              break;
            }
          }
          return newWs;
        })
      );
    }),
    // _workspaceBatchChanged will trigger creating symlinks, but meanwhile _installWorkspace will delete symlinks
    // I don't want to seem them running simultaneously.
    merge(actionByTypes._workspaceBatchChanged, actionByTypes._installWorkspace).pipe(
      concatMap(action => {
        if (isActionOfCreator(action, slice.actions._installWorkspace)) {
          const wsKey = action.payload.workspaceKey;
          return getStore().pipe(
            map(s => s.workspaces.get(wsKey)),
            distinctUntilChanged(),
            filter(ws => ws != null),
            take(1),
            concatMap(ws => {
              return installWorkspace(ws!, getState().npmInstallOpt);
            }),
            map(() => {
              updateInstalledPackageForWorkspace(wsKey);
            }),
            ignoreElements()
          );
        } else if (isActionOfCreator(action, slice.actions._workspaceBatchChanged)) {
          const wsKeys = action.payload;
          return merge(...wsKeys.map(_createSymlinksForWorkspace)).pipe(
            finalize(() => actionDispatcher.workspaceChanged(wsKeys))
          );
        } else {
          return EMPTY;
        }
      })
    ),

    actionByTypes.workspaceStateUpdated.pipe(
      map(action => updatedWorkspaceSet.add(action.payload)),
      debounceTime(800),
      tap(() => {
        actionDispatcher._workspaceBatchChanged(Array.from(updatedWorkspaceSet.values()));
        updatedWorkspaceSet.clear();
        // return from(writeConfigFiles());
      }),
      map(() => {
        actionDispatcher.packagesUpdated();
      })
    ),
    actionByTypes.updateGitIgnores.pipe(
      tap(action => {
        let rel = action.payload.file;
        if (Path.isAbsolute(rel)) {
          rel = Path.relative(rootDir, rel).replace(/\\/g, '/');
        }
        gitIgnoreFilesWaiting.add(rel);
      }),
      debounceTime(500),
      map(() => {
        const changedFiles = [...gitIgnoreFilesWaiting.values()];
        gitIgnoreFilesWaiting.clear();
        return changedFiles;
      }),
      concatMap((changedFiles) => {
        return merge(...changedFiles.map(async rel => {
          const file = Path.resolve(rootDir, rel);
          const lines = getState().gitIgnores[file];
          if (fs.existsSync(file)) {
            const data = await fs.promises.readFile(file, 'utf8');
            const existingLines = data.split(/\n\r?/).map(line => line.trim());
            const newLines = _.difference(lines, existingLines);
            if (newLines.length === 0)
              return;
            fs.writeFile(file, data + EOL + newLines.join(EOL), () => {
              // eslint-disable-next-line no-console
              log.info('Modify', file);
            });
          }
        }));
      }),
      ignoreElements()
    ),
    action$.pipe(ofPayloadAction(slice.actions.addProject, slice.actions.deleteProject),
      concatMap(() => scanAndSyncPackages())
    )
  ).pipe(
    ignoreElements(),
    catchError(err => {
      log.error(err.stack ? err.stack : err);
      return throwError(err);
    })
  );
});

export function getState() {
  return stateFactory.sliceState(slice);
}

export function getStore(): Observable<PackagesState> {
  return stateFactory.sliceStore(slice);
}

export function pathToProjKey(path: string) {
  const relPath = Path.relative(rootDir, path);
  return relPath.startsWith('..') ? Path.resolve(path) : relPath;
}
export function projKeyToPath(key: string) {
  return Path.isAbsolute(key) ? key : Path.resolve(rootDir, key);
}

export function workspaceKey(path: string) {
  let rel = Path.relative(rootDir, Path.resolve(path));
  if (Path.sep === '\\')
    rel = rel.replace(/\\/g, '/');
  return rel;
}

export function workspaceDir(key: string) {
  return Path.resolve(rootDir, key);
}

export function* getPackagesOfProjects(projects: string[]) {
  for (const prj of projects) {
    const pkgNames = getState().project2Packages.get(pathToProjKey(prj));
    if (pkgNames) {
      for (const pkgName of pkgNames) {
        const pk = getState().srcPackages.get(pkgName);
        if (pk)
          yield pk;
      }
    }
  }
}

export function getProjectList() {
  return Array.from(getState().project2Packages.keys()).map(pj => Path.resolve(rootDir, pj));
}

export function isCwdWorkspace() {
  const wsKey = workspaceKey(plinkEnv.workDir);
  const ws = getState().workspaces.get(wsKey);
  if (ws == null)
    return false;
  return true;
}

/**
 * This method is meant to trigger editor-helper to update tsconfig files, so
 * editor-helper must be import at first
 * @param dir 
 */
export function switchCurrentWorkspace(dir: string) {
  actionDispatcher._setCurrentWorkspace(dir);
  actionDispatcher._workspaceBatchChanged([workspaceKey(dir)]);
}

function updateInstalledPackageForWorkspace(wsKey: string) {
  const pkgEntry = scanInstalledPackage4Workspace(getState(), wsKey);

  const installed = new Map((function*(): Generator<[string, PackageInfo]> {
    for (const pk of pkgEntry) {
      yield [pk.name, pk];
    }
  })());
  actionDispatcher._change(d => d.workspaces.get(wsKey)!.installedComponents = installed);
  actionDispatcher.workspaceStateUpdated(wsKey);
}

/**
 * Delete workspace state if its directory does not exist
 */
function checkAllWorkspaces() {
  for (const key of getState().workspaces.keys()) {
    const dir = Path.resolve(rootDir, key);
    if (!fs.existsSync(dir)) {
      // eslint-disable-next-line no-console
      log.info(`Workspace ${key} does not exist anymore.`);
      actionDispatcher._change(d => d.workspaces.delete(key));
    }
  }
}

async function initRootDirectory() {
  log.debug('initRootDirectory');
  const rootPath = rootDir;
  fsext.mkdirpSync(distDir);
  // maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates',
      'gitignore.txt'), rootDir + '/.gitignore');
  await cleanInvalidSymlinks();
  await scanAndSyncPackages();
  // await _deleteUselessSymlink(Path.resolve(rootDir, 'node_modules'), new Set<string>());
}

async function installWorkspace(ws: WorkspaceState, npmOpt: NpmOptions) {
  const dir = Path.resolve(rootDir, ws.id);
  try {
    await installInDir(dir, npmOpt, ws.originInstallJsonStr, ws.installJsonStr);
  } catch (ex) {
    actionDispatcher._change(d => {
      const wsd = d.workspaces.get(ws.id)!;
      wsd.installJsonStr = '';
      wsd.installJson.dependencies = {};
      wsd.installJson.devDependencies = {};
      const lockFile = Path.resolve(dir, 'package-lock.json');
      if (fs.existsSync(lockFile)) {
        // eslint-disable-next-line no-console
        log.info(`Problematic ${lockFile} is deleted, please try again`);
        fs.unlinkSync(lockFile);
      }
    });
    throw ex;
  }
}

export async function installInDir(dir: string, npmOpt: NpmOptions, originPkgJsonStr: string, toInstallPkgJsonStr: string) {
  // eslint-disable-next-line no-console
  log.info('Install dependencies in ' + dir);
  try {
    await copyNpmrcToWorkspace(dir);
  } catch (e) {
    console.error(e);
  }
  const symlinksInModuleDir = [] as {content: string; link: string}[];

  const target = Path.resolve(dir, 'node_modules');
  if (!fs.existsSync(target)) {
    fsext.mkdirpSync(target);
  }

  // NPM v7.20.x can not install dependencies if there is any file with name prefix '_' exists in directory node_modules
  const legacyPkgSettingFile = Path.resolve(dir, 'node_modules', '_package-settings.d.ts');
  if (fs.existsSync(legacyPkgSettingFile)) {
    fs.unlinkSync(legacyPkgSettingFile);
  }

  // 1. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
  // backup them for late recovery
  await listModuleSymlinks(target, link => {
    log.debug('Remove symlink', link);
    const linkContent = fs.readlinkSync(link);
    symlinksInModuleDir.push({content: linkContent, link});
    return unlinkAsync(link);
  });
  // 2. Run `npm install`
  const installJsonFile = Path.resolve(dir, 'package.json');
  // eslint-disable-next-line no-console
  log.info('write', installJsonFile);
  fs.writeFileSync(installJsonFile, toInstallPkgJsonStr, 'utf8');
  // save a lock file to indicate in-process of installing, once installation is completed without interruption, delete it.
  // check if there is existing lock file, meaning a previous installation is interrupted.
  const lockFile = Path.resolve(dir, 'plink.install.lock');
  void fs.promises.writeFile(lockFile, originPkgJsonStr);

  await new Promise(resolve => setImmediate(resolve));
  // await new Promise(resolve => setTimeout(resolve, 5000));
  try {
    const env = {
      ...process.env,
      NODE_ENV: 'development'
    } as NodeJS.ProcessEnv;

    if (npmOpt.cache)
      env.npm_config_cache = npmOpt.cache;
    if (npmOpt.offline)
      env.npm_config_offline = 'true';

    const cmdArgs = [npmOpt.useNpmCi ? 'ci' : 'install'];

    await exe('npm', ...cmdArgs, {cwd: dir, env}).done;
    await new Promise(resolve => setImmediate(resolve));
    await exe('npm', 'prune', {cwd: dir, env}).done;
    // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
    // why, I have to add a setImmediate() between them to workaround
    await new Promise(resolve => setImmediate(resolve));
    try {
      await exe('npm', 'ddp', {cwd: dir, env}).promise;
    } catch (ddpErr) {
      log.warn('Failed to dedupe dependencies, but it is OK', ddpErr);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    log.error('Failed to install dependencies', (e as Error).stack);
    throw e;
  } finally {
    // eslint-disable-next-line no-console
    log.info('Recover ' + installJsonFile);
    // 3. Recover package.json and symlinks deleted in Step.1.
    fs.writeFileSync(installJsonFile, originPkgJsonStr, 'utf8');
    await recoverSymlinks();
    if (fs.existsSync(lockFile))
      await fs.promises.unlink(lockFile);
  }

  function recoverSymlinks() {
    return Promise.all(symlinksInModuleDir.map(({content, link}) => {
      if (!fs.existsSync(link)) {
        fsext.mkdirpSync(Path.dirname(link));
        return fs.promises.symlink(content, link, isWin32 ? 'junction' : 'dir');
      }
      return Promise.resolve();
    }));
  }
}

async function copyNpmrcToWorkspace(workspaceDir: string) {
  const target = Path.resolve(workspaceDir, '.npmrc');
  if (fs.existsSync(target))
    return;
  const isChina = await getStore().pipe(
    map(s => s.isInChina), distinctUntilChanged(),
      filter(cn => cn != null),
      take(1)
    ).toPromise();

  if (isChina) {
    // eslint-disable-next-line no-console
    log.info('create .npmrc to', target);
    fs.copyFileSync(Path.resolve(__dirname, '../../templates/npmrc-for-cn.txt'), target);
  }
}

async function scanAndSyncPackages(includePackageJsonFiles?: string[]) {
  const projPkgMap: Map<string, PackageInfo[]> = new Map();
  const srcPkgMap: Map<string, PackageInfo[]> = new Map();
  let pkgList: PackageInfo[];

  if (includePackageJsonFiles) {
    const prjKeys = Array.from(getState().project2Packages.keys());
    const prjDirs = prjKeys.map(prjKey => projKeyToPath(prjKey));
    pkgList = includePackageJsonFiles.map(jsonFile => {
      const info = createPackageInfo(jsonFile, false);
      const prjIdx = prjDirs.findIndex(dir => info.realPath.startsWith(dir + Path.sep));
      if (prjIdx >= 0) {
        const prjPackageNames = getState().project2Packages.get(prjKeys[prjIdx])!;
        if (!prjPackageNames.includes(info.name)) {
          actionDispatcher._associatePackageToPrj({
            prj: prjKeys[prjIdx],
            pkgs: [...prjPackageNames.map(name => ({name})), info]
          });
        }
      } else {
        const keys = [...getState().srcDir2Packages.keys()];
        const linkedSrcDirs = keys.map(key => projKeyToPath(key));
        const idx = linkedSrcDirs.findIndex(dir => info.realPath === dir ||  info.realPath.startsWith(dir + Path.sep));
        if (idx >= 0) {
          const pkgs = getState().srcDir2Packages.get(keys[idx])!;
          if (!pkgs.includes(info.name)) {
            actionDispatcher._associatePackageToSrcDir({
              pattern: keys[idx],
              pkgs: [...pkgs.map(name => ({name})), info]
            });
          }
        } else {
          throw new Error(`${info.realPath} is not under any known Project directorys: ${prjDirs.concat(linkedSrcDirs).join(', ')}`);
        }
      }
      return info;
    });
    actionDispatcher._syncLinkedPackages([pkgList, 'update']);
  } else {
    const rm = (await import('../recipe-manager'));
    pkgList = [];
    await rm.scanPackages().pipe(
      tap(([proj, jsonFile, srcDir]) => {
        if (proj && !projPkgMap.has(proj))
          projPkgMap.set(proj, []);
        if (proj == null && srcDir && !srcPkgMap.has(srcDir))
          srcPkgMap.set(srcDir, []);

        const info = createPackageInfo(jsonFile, false);
        if (info.json.dr || info.json.plink) {
          pkgList.push(info);
          if (proj)
            projPkgMap.get(proj)!.push(info);
          else if (srcDir)
            srcPkgMap.get(srcDir)!.push(info);
          else
            log.error(`Orphan ${jsonFile}`);
        } else {
          log.debug(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`);
        }
      })
    ).toPromise();
    for (const [prj, pkgs] of projPkgMap.entries()) {
      actionDispatcher._associatePackageToPrj({prj, pkgs});
    }
    for (const [srcDir, pkgs] of srcPkgMap.entries()) {
      actionDispatcher._associatePackageToSrcDir({pattern: srcDir, pkgs});
    }

    actionDispatcher._syncLinkedPackages([pkgList, 'clean']);
  }
}

function _createSymlinksForWorkspace(wsKey: string) {
  if (symlinkDirName !== '.links' && fs.existsSync(Path.resolve(rootDir, wsKey, '.links'))) {
    fsext.remove(Path.resolve(rootDir, wsKey, '.links'))
    .catch(ex => log.info(ex));
  }
  const symlinkDir = Path.resolve(rootDir, wsKey, symlinkDirName || 'node_modules');
  fsext.mkdirpSync(symlinkDir);
  const ws = getState().workspaces.get(wsKey)!;

  const pkgNames = ws.linkedDependencies.map(item => item[0])
  .concat(ws.linkedDevDependencies.map(item => item[0]));

  const pkgNameSet = new Set(pkgNames);

  if (symlinkDirName !== 'node_modules') {
    if (ws.installedComponents) {
      for (const pname of ws.installedComponents.keys())
        pkgNameSet.add(pname);
    }
    actionDispatcher.updateGitIgnores({
      file: Path.resolve(rootDir, '.gitignore'),
      lines: [Path.relative(rootDir, symlinkDir).replace(/\\/g, '/')]});
  }

  let symlinksToCreate = from(pkgNameSet.values())
  .pipe(
    map(name => getState().srcPackages.get(name) || ws.installedComponents!.get(name)!)
  );
  const workDir = workspaceDir(wsKey);
  if (workDir !== plinkEnv.rootDir) {
    symlinksToCreate = concat(symlinksToCreate, of(getState().linkedDrcp! || getState().installedDrcp));
  }

  return merge(
    symlinksToCreate.pipe(
      symbolicLinkPackages(symlinkDir)
    ),
    _deleteUselessSymlink(symlinkDir, pkgNameSet)
  );
}

async function _deleteUselessSymlink(checkDir: string, excludeSet: Set<string>) {
  const dones: Promise<void>[] = [];
  const plinkPkg = getState().linkedDrcp || getState().installedDrcp;
  const drcpName = plinkPkg?.name;
  const done1 = listModuleSymlinks(checkDir, link => {
    const pkgName = Path.relative(checkDir, link).replace(/\\/g, '/');
    if ( (drcpName == null || drcpName !== pkgName) && !excludeSet.has(pkgName)) {
      // eslint-disable-next-line no-console
      log.info(`Delete extraneous symlink: ${link}`);
      dones.push(fs.promises.unlink(link));
    }
  });
  await done1;
  await Promise.all(dones);
}

/**
 * 
 * @param pkJsonFile package.json file path
 * @param isInstalled 
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
export function createPackageInfo(pkJsonFile: string, isInstalled = false): PackageInfo {
  const json = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8'));
  return createPackageInfoWithJson(pkJsonFile, json, isInstalled);
}
/**
 * List those installed packages which are referenced by workspace package.json file,
 * those packages must have "dr" property in package.json 
 * @param workspaceKey 
 */
function* scanInstalledPackage4Workspace(state: PackagesState, workspaceKey: string) {
  const originInstallJson = state.workspaces.get(workspaceKey)!.originInstallJson;
  // const depJson = process.env.NODE_ENV === 'production' ? [originInstallJson.dependencies] :
  //   [originInstallJson.dependencies, originInstallJson.devDependencies];
  for (const deps of [originInstallJson.dependencies, originInstallJson.devDependencies]) {
    if (deps == null)
      continue;
    for (const dep of Object.keys(deps)) {
      if (!state.srcPackages.has(dep) && dep !== '@wfh/plink') {
        const pkjsonFile = Path.resolve(rootDir, workspaceKey, 'node_modules', dep, 'package.json');
        if (fs.existsSync(pkjsonFile)) {
          const pk = createPackageInfo(
            Path.resolve(rootDir, workspaceKey, 'node_modules', dep, 'package.json'), true
          );
          if (pk.json.dr || pk.json.plink) {
            yield pk;
          }
        }
      }
    }
  }
}

/**
 * 
 * @param pkJsonFile package.json file path
 * @param isInstalled 
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
function createPackageInfoWithJson(pkJsonFile: string, json: any, isInstalled = false): PackageInfo {
  const m = moduleNameReg.exec(json.name);
  const pkInfo: PackageInfo = {
    shortName: m![2],
    name: json.name,
    scope: m![1],
    path: Path.join(symlinkDirName, json.name),
    json,
    realPath: fs.realpathSync(Path.dirname(pkJsonFile)),
    isInstalled
  };
  return pkInfo;
}

function cp(from: string, to: string) {
  if (_.startsWith(from, '-')) {
    from = arguments[1];
    to = arguments[2];
  }
  fsext.copySync(from, to);
  // shell.cp(...arguments);
  if (/[/\\]$/.test(to))
    to = Path.basename(from); // to is a folder
  else
    to = Path.relative(plinkEnv.workDir, to);
  // eslint-disable-next-line no-console
  log.info('Copy to %s', chalk.cyan(to));
}

/**
 * 
 * @param from absolute path
 * @param {string} to relative to rootPath 
 */
function maybeCopyTemplate(from: string, to: string) {
  if (!fs.existsSync(Path.resolve(rootDir, to)))
    cp(Path.resolve(__dirname, from), to);
}

function deleteDuplicatedInstalledPkg(workspaceKey: string) {
  const wsState = getState().workspaces.get(workspaceKey)!;
  const doNothing = () => {};
  wsState.linkedDependencies.concat(wsState.linkedDevDependencies).map(([pkgName]) => {
    const dir = Path.resolve(rootDir, workspaceKey, 'node_modules', pkgName);
    return fs.promises.lstat(dir)
    .then((stat) => {
      if (!stat.isSymbolicLink()) {
        // eslint-disable-next-line no-console
        log.info(`Previous installed ${Path.relative(rootDir, dir)} is deleted, due to linked package ${pkgName}`);
        return fs.promises.unlink(dir);
      }
    })
    .catch(doNothing);
  });
}

