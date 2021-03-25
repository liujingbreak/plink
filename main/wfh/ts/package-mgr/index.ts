/**
 * Unfortunately, this file is very long, you need to fold by indention for better view of source code in Editor
 */

import { PayloadAction } from '@reduxjs/toolkit';
import chalk from 'chalk';
import fsext from 'fs-extra';
import fs from 'fs';
import _ from 'lodash';
import Path from 'path';
import { from, merge, Observable, of, defer, throwError} from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, debounceTime,
  take, concatMap, skip, ignoreElements, scan, catchError, tap } from 'rxjs/operators';
import { listCompDependency, PackageJsonInterf, DependentInfo } from '../transitive-dep-hoister';
import { spawn } from '../process-utils';
import { exe } from '../process-utils';
import { setProjectList} from '../recipe-manager';
import { stateFactory, ofPayloadAction } from '../store';
// import { getRootDir } from '../utils/misc';
import cleanInvalidSymlinks, { isWin32, listModuleSymlinks, unlinkAsync, _symlinkAsync } from '../utils/symlinks';
import {symbolicLinkPackages} from '../rwPackageJson';
import {PlinkEnv} from '../node-path';
import { EOL } from 'os';
import {getLogger} from 'log4js';
const log = getLogger('plink.package-mgr');
export interface PackageInfo {
  name: string;
  scope: string;
  shortName: string;
  json: any;
  /** If this property is not same as "realPath", then it is a symlink */
  path: string;
  realPath: string;
  isInstalled: boolean;
}

export interface PackagesState {
  inited: boolean;
  srcPackages: Map<string, PackageInfo>;
  /** Key is relative path to root workspace */
  workspaces: Map<string, WorkspaceState>;
  /** key of current "workspaces" */
  currWorkspace?: string | null;
  project2Packages: Map<string, string[]>;
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

const {distDir, rootDir, plinkDir, isDrcpSymlink, symlinkDirName} = JSON.parse(process.env.__plink!) as PlinkEnv;

const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

const state: PackagesState = {
  inited: false,
  workspaces: new Map(),
  project2Packages: new Map(),
  srcPackages: new Map(),
  gitIgnores: {},
  workspaceUpdateChecksum: 0,
  packagesUpdateChecksum: 0
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

  hoistInfoSummary: {
    /** User should manully add them as dependencies of workspace */
    missingDeps: {[name: string]: string};
    /** User should manully add them as devDependencies of workspace */
    missingDevDeps: {[name: string]: string};
    /** versions are conflict */
    conflictDeps: string[];
  };
}

export const slice = stateFactory.newSlice({
  name: NS,
  initialState: state,
  reducers: {
    /** Do this action after any linked package is removed or added  */
    initRootDir(d, action: PayloadAction<{isForce: boolean, createHook: boolean}>) {},

    /** 
     * - Create initial files in root directory
     * - Scan linked packages and install transitive dependency
     * - Switch to different workspace
     * - Delete nonexisting workspace
     * - If "packageJsonFiles" is provided, it should skip step of scanning linked packages
     * - TODO: if there is linked package used in more than one workspace, hoist and install for them all?
     */
    updateWorkspace(d, action: PayloadAction<{dir: string,
      isForce: boolean, createHook: boolean, packageJsonFiles?: string[]}>) {
    },
    scanAndSyncPackages(d, action: PayloadAction<{packageJsonFiles?: string[]}>) {},

    updateDir() {},
    _updatePlinkPackageInfo(d) {
      const plinkPkg = createPackageInfo(Path.resolve(plinkDir, 'package.json'), false);
      if (isDrcpSymlink) {
        d.linkedDrcp = plinkPkg;
        d.installedDrcp = null;
        d.linkedDrcpProject = pathToProjKey(Path.dirname(d.linkedDrcp!.realPath));
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
        map = d.srcPackages = new Map();
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
    /** payload: workspace keys, happens as debounced workspace change event */
    workspaceBatchChanged(d, action: PayloadAction<string[]>) {},
    updateGitIgnores(d, {payload}: PayloadAction<{file: string, lines: string[]}>) {
      d.gitIgnores[payload.file] = payload.lines.map(line => line.startsWith('/') ? line : '/' + line);
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

      const updatingDeps = {...pkjson.dependencies || {}};
      const linkedDependencies: typeof deps = [];
      deps.filter(dep => {
        if (state.srcPackages.has(dep[0])) {
          linkedDependencies.push(dep);
          delete updatingDeps[dep[0]];
          return false;
        }
        return true;
      });
      const devDeps = Object.entries<string>(pkjson.devDependencies || {});
      const updatingDevDeps = {...pkjson.devDependencies || {}};
      const linkedDevDependencies: typeof devDeps = [];
      devDeps.filter(dep => {
        if (state.srcPackages.has(dep[0])) {
          linkedDevDependencies.push(dep);
          delete updatingDevDeps[dep[0]];
          return false;
        }
        return true;
      });

      if (isDrcpSymlink) {
        // tslint:disable-next-line: no-console
        log.debug('[_hoistWorkspaceDeps] @wfh/plink is symlink');
        delete updatingDeps['@wfh/plink'];
        delete updatingDevDeps['@wfh/plink'];
      }

      const wsKey = workspaceKey(dir);
      const {hoisted: hoistedDeps, hoistedPeers: hoistPeerDepInfo} = listCompDependency(
        linkedDependencies.map(entry => state.srcPackages.get(entry[0])!.json),
          // .concat(plinkApiRequiredDeps()),
        wsKey, updatingDeps, state.srcPackages
      );

      const {hoisted: hoistedDevDeps, hoistedPeers: devHoistPeerDepInfo} = listCompDependency(
        linkedDevDependencies.map(entry => state.srcPackages.get(entry[0])!.json),
        wsKey, updatingDevDeps, state.srcPackages
      );

      const installJson: PackageJsonInterf = {
        ...pkjson,
        dependencies: Array.from(hoistedDeps.entries())
        .concat(Array.from(hoistPeerDepInfo.entries()).filter(item => !item[1].missing))
        .reduce((dic, [name, info]) => {
          dic[name] = info.by[0].ver;
          return dic;
        }, {} as {[key: string]: string}),

        devDependencies: Array.from(hoistedDevDeps.entries())
        .concat(Array.from(devHoistPeerDepInfo.entries()).filter(item => !item[1].missing))
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

  return merge(
    // To override stored state. 
    // Do not put following logic in initialState! It will be overridden by previously saved state

    of(1).pipe(tap(() => process.nextTick(() => actionDispatcher._updatePlinkPackageInfo())),
      ignoreElements()
    ),
    getStore().pipe(map(s => s.project2Packages),
      distinctUntilChanged(),
      map(pks => {
        setProjectList(getProjectList());
        return pks;
      }),
      ignoreElements()
    ),

    getStore().pipe(map(s => s.srcPackages),
      distinctUntilChanged(),
      scan((prevMap, currMap) => {
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
    action$.pipe(ofPayloadAction(slice.actions.updateWorkspace),
      concatMap(({payload: {dir, isForce, createHook, packageJsonFiles}}) => {
        dir = Path.resolve(dir);
        actionDispatcher._setCurrentWorkspace(dir);
        maybeCopyTemplate(Path.resolve(__dirname, '../../templates/app-template.js'), Path.resolve(dir, 'app.js'));
        checkAllWorkspaces();
        if (isForce) {
          // Chaning installJsonStr to force action _installWorkspace being dispatched later
          const wsKey = workspaceKey(dir);
          if (getState().workspaces.has(wsKey)) {
            actionDispatcher._change(d => {
              // clean to trigger install action
              const ws = d.workspaces.get(wsKey)!;
              ws.installJsonStr = '';
              ws.installJson.dependencies = {};
              ws.installJson.devDependencies = {};
              // tslint:disable-next-line: no-console
              log.debug('force npm install in', wsKey);
            });
          }
        }
        // call initRootDirectory() and wait for it finished by observing action '_syncLinkedPackages',
        // then call _hoistWorkspaceDeps
        return merge(
          packageJsonFiles != null ? scanAndSyncPackages(packageJsonFiles):
            defer(() => of(initRootDirectory(createHook))),
          action$.pipe(
            ofPayloadAction(slice.actions._syncLinkedPackages),
            take(1),
            map(() => actionDispatcher._hoistWorkspaceDeps({dir}))
          )
        );
      }),
      ignoreElements()
    ),
    action$.pipe(ofPayloadAction(slice.actions.scanAndSyncPackages),
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
    action$.pipe(ofPayloadAction(slice.actions.initRootDir),
      map(({payload}) => {
        checkAllWorkspaces();
        if (getState().workspaces.has(workspaceKey(process.cwd()))) {
          actionDispatcher.updateWorkspace({dir: process.cwd(),
            isForce: payload.isForce,
            createHook: payload.createHook});
        } else {
          const curr = getState().currWorkspace;
          if (curr != null) {
            if (getState().workspaces.has(curr)) {
              const path = Path.resolve(rootDir, curr);
              actionDispatcher.updateWorkspace({dir: path, isForce: payload.isForce, createHook: payload.createHook});
            } else {
              actionDispatcher._setCurrentWorkspace(null);
            }
          }
        }
      }),
      ignoreElements()
    ),

    action$.pipe(ofPayloadAction(slice.actions._hoistWorkspaceDeps),
      map(({payload}) => {
        const wsKey = workspaceKey(payload.dir);
        // actionDispatcher.onWorkspacePackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => actionDispatcher.workspaceStateUpdated(wsKey));
      }),
      ignoreElements()
    ),

    action$.pipe(ofPayloadAction(slice.actions.updateDir),
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
          // tslint:disable-next-line: no-console
          log.info('New workspace: ', newAdded);
          for (const ws of newAdded) {
            actionDispatcher._installWorkspace({workspaceKey: ws});
          }
        }
        return curr;
      }),
      ignoreElements()
    ),
    // observe all existing Workspaces for dependency hoisting result 
    ...Array.from(getState().workspaces.keys()).map(key => {
      return getStore().pipe(
        filter(s => s.workspaces.has(key)),
        map(s => s.workspaces.get(key)!),
        distinctUntilChanged((s1, s2) => s1.installJson === s2.installJson),
        scan<WorkspaceState>((old, newWs) => {
          // tslint:disable: max-line-length
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
        }),
        ignoreElements()
      );
    }),
    action$.pipe(ofPayloadAction(slice.actions._installWorkspace, slice.actions.workspaceBatchChanged),
      concatMap(action => {
        if (action.type === slice.actions._installWorkspace.type) {
          const wsKey = (action.payload as Parameters<typeof slice.actions._installWorkspace>[0]).workspaceKey;
          return getStore().pipe(
            map(s => s.workspaces.get(wsKey)),
            distinctUntilChanged(),
            filter(ws => ws != null),
            take(1),
            concatMap(ws => installWorkspace(ws!)),
            map(() => {
              updateInstalledPackageForWorkspace(wsKey);
            })
          );
        } else {
          const wsKeys = action.payload as Parameters<typeof slice.actions.workspaceBatchChanged>[0];
          return merge(...wsKeys.map(_createSymlinksForWorkspace)); 
        }
      }),
      ignoreElements()
    ),
    action$.pipe(ofPayloadAction(slice.actions.workspaceStateUpdated),
      map(action => updatedWorkspaceSet.add(action.payload)),
      debounceTime(800),
      tap(() => {
        actionDispatcher.workspaceBatchChanged(Array.from(updatedWorkspaceSet.values()));
        updatedWorkspaceSet.clear();
        // return from(writeConfigFiles());
      }),
      map(async () => {
        actionDispatcher.packagesUpdated();
      })
    ),
    // action$.pipe(ofPayloadAction(slice.actions.workspaceBatchChanged),
    //   concatMap(({payload: wsKeys}) => {
    //     return merge(...wsKeys.map(_createSymlinksForWorkspace));
    //   })
    // ),
    getStore().pipe(map(s => s.gitIgnores),
      distinctUntilChanged(),
      map(gitIgnores => Object.keys(gitIgnores).join(',')),
      distinctUntilChanged(),
      debounceTime(500),
      switchMap(() => {
        return merge(...Object.keys(getState().gitIgnores).map(file => getStore().pipe(
          map(s => s.gitIgnores[file]),
          distinctUntilChanged(),
          skip(1),
          map(lines => {
            fs.readFile(file, 'utf8', (err, data) => {
              if (err) {
                console.error('Failed to read gitignore file', file);
                throw err;
              }
              const existingLines = data.split(/\n\r?/).map(line => line.trim());
              const newLines = _.difference(lines, existingLines);
              if (newLines.length === 0)
                return;
              fs.writeFile(file, data + EOL + newLines.join(EOL), () => {
                // tslint:disable-next-line: no-console
                log.info('Modify', file);
              });
            });
          })
        )));
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
  const wsKey = workspaceKey(process.cwd());
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
  actionDispatcher.workspaceBatchChanged([workspaceKey(dir)]);
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
      // tslint:disable-next-line: no-console
      log.info(`Workspace ${key} does not exist anymore.`);
      actionDispatcher._change(d => d.workspaces.delete(key));
    }
  }
}

async function initRootDirectory(createHook = false) {
  log.debug('initRootDirectory');
  const rootPath = rootDir;
  fsext.mkdirpSync(distDir);
  // maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates',
      'gitignore.txt'), rootDir + '/.gitignore');
  await cleanInvalidSymlinks();

  const projectDirs = getProjectList();

  if (createHook) {
    projectDirs.forEach(prjdir => {
      _writeGitHook(prjdir);
      maybeCopyTemplate(Path.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
    });
  }

  await scanAndSyncPackages();
  // await _deleteUselessSymlink(Path.resolve(rootDir, 'node_modules'), new Set<string>());
}

// async function writeConfigFiles() {
//   return (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
//     // tslint:disable-next-line: no-console
//     log.info('write config file:', file);
//     writeFile(Path.join(distDir, file),
//       '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
//   });
// }

async function installWorkspace(ws: WorkspaceState) {
  const dir = Path.resolve(rootDir, ws.id);
  try {
    await installInDir(dir, ws.originInstallJsonStr, ws.installJsonStr);
  } catch (ex) {
    actionDispatcher._change(d => {
      const wsd = d.workspaces.get(ws.id)!;
      wsd.installJsonStr = '';
      wsd.installJson.dependencies = {};
      wsd.installJson.devDependencies = {};
      const lockFile = Path.resolve(dir, 'package-lock.json');
      if (fs.existsSync(lockFile)) {
        // tslint:disable-next-line: no-console
        log.info(`Problematic ${lockFile} is deleted, please try again`);
        fs.unlinkSync(lockFile);
      }
    });
    throw ex;
  }
}

export async function installInDir(dir: string, originPkgJsonStr: string, toInstallPkgJsonStr: string) {
  // tslint:disable-next-line: no-console
  log.info('Install dependencies in ' + dir);
  try {
    await copyNpmrcToWorkspace(dir);
  } catch (e) {
    console.error(e);
  }
  const symlinksInModuleDir = [] as {content: string, link: string}[];

  const target = Path.resolve(dir, 'node_modules');
  if (!fs.existsSync(target)) {
    fsext.mkdirpSync(target);
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
  // tslint:disable-next-line: no-console
  log.info('write', installJsonFile);
  fs.writeFileSync(installJsonFile, toInstallPkgJsonStr, 'utf8');
  // save a lock file to indicate in-process of installing, once installation is completed without interruption, delete it.
  // check if there is existing lock file, meaning a previous installation is interrupted.
  const lockFile = Path.resolve(dir, 'plink.install.lock');
  fs.promises.writeFile(lockFile, originPkgJsonStr);

  await new Promise(resolve => setImmediate(resolve));
  // await new Promise(resolve => setTimeout(resolve, 5000));
  try {
    const env = {...process.env, NODE_ENV: 'development'} as NodeJS.ProcessEnv;
    await exe('npm', 'install', {
      cwd: dir,
      env // Force development mode, otherwise "devDependencies" will not be installed
    }).promise;
    await new Promise(resolve => setImmediate(resolve));
    await exe('npm', 'prune', {cwd: dir, env}).promise;
    // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
    // why, I have to add a setImmediate() between them to workaround
    await new Promise(resolve => setImmediate(resolve));
    await exe('npm', 'ddp', {cwd: dir, env}).promise;
  } catch (e) {
    // tslint:disable-next-line: no-console
    log.error('Failed to install dependencies', e.stack);
    throw e;
  } finally {
    // tslint:disable-next-line: no-console
    log.info('Recover ' + installJsonFile);
    // 3. Recover package.json and symlinks deleted in Step.1.
    fs.writeFileSync(installJsonFile, originPkgJsonStr, 'utf8');
    fs.promises.unlink(lockFile);
    await recoverSymlinks();
  }

  function recoverSymlinks() {
    return Promise.all(symlinksInModuleDir.map(({content, link}) => {
      return _symlinkAsync(content, link, isWin32 ? 'junction' : 'dir');
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
    // tslint:disable-next-line: no-console
    log.info('create .npmrc to', target);
    fs.copyFileSync(Path.resolve(__dirname, '../../templates/npmrc-for-cn.txt'), target);
  }
}

async function scanAndSyncPackages(includePackageJsonFiles?: string[]) {
  const projPkgMap: Map<string, PackageInfo[]> = new Map();
  let pkgList: PackageInfo[];

  if (includePackageJsonFiles) {
    const prjKeys = Array.from(getState().project2Packages.keys());
    const prjDirs = Array.from(getState().project2Packages.keys()).map(prjKey => projKeyToPath(prjKey));
    pkgList = includePackageJsonFiles.map(jsonFile => {
      const info = createPackageInfo(jsonFile, false);
      const prjIdx = prjDirs.findIndex(dir => info.realPath.startsWith(dir + Path.sep));
      if (prjIdx < 0) {
        throw new Error(`${jsonFile} is not under any known Project directorys: ${prjDirs.join(', ')}`);
      }
      const prjPackageNames = getState().project2Packages.get(prjKeys[prjIdx])!;
      if (!prjPackageNames.includes(info.name)) {
        actionDispatcher._associatePackageToPrj({
          prj: prjKeys[prjIdx],
          pkgs: [...prjPackageNames.map(name => ({name})), info]
        });
      }
      return info;
    });
    actionDispatcher._syncLinkedPackages([pkgList, 'update']);
  } else {
    const rm = (await import('../recipe-manager'));
    pkgList = [];
    await rm.scanPackages().pipe(
      tap(([proj, jsonFile]) => {
        if (!projPkgMap.has(proj))
          projPkgMap.set(proj, []);
        const info = createPackageInfo(jsonFile, false);
        if (info.json.dr || info.json.plink) {
          pkgList.push(info);
          projPkgMap.get(proj)!.push(info);
        } else {
          log.debug(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`);
        }
      })
    ).toPromise();
    for (const [prj, pkgs] of projPkgMap.entries()) {
      actionDispatcher._associatePackageToPrj({prj, pkgs});
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
  }

  if (symlinkDirName !== 'node_modules') {
    actionDispatcher.updateGitIgnores({
      file: Path.resolve(rootDir, '.gitignore'),
      lines: [Path.relative(rootDir, symlinkDir).replace(/\\/g, '/')]});
  }

  return merge(
    from(pkgNameSet.values()).pipe(
      map(name => getState().srcPackages.get(name) || ws.installedComponents!.get(name)!),
      symbolicLinkPackages(symlinkDir)
    ),
    _deleteUselessSymlink(symlinkDir, pkgNameSet)
  );
}

async function _deleteUselessSymlink(checkDir: string, excludeSet: Set<string>) {
  const dones: Promise<void>[] = [];
  const drcpName = getState().linkedDrcp ? getState().linkedDrcp!.name : null;
  const done1 = listModuleSymlinks(checkDir, async link => {
    const pkgName = Path.relative(checkDir, link).replace(/\\/g, '/');
    if ( drcpName !== pkgName && !excludeSet.has(pkgName)) {
      // tslint:disable-next-line: no-console
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
  return createPackageInfoWithJson(pkJsonFile, json, isInstalled, symlinkDirName);
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
function createPackageInfoWithJson(pkJsonFile: string, json: any, isInstalled = false,
  symLinkParentDir?: string): PackageInfo {
  const m = moduleNameReg.exec(json.name);
  const pkInfo: PackageInfo = {
    shortName: m![2],
    name: json.name,
    scope: m![1],
    path: symLinkParentDir ? Path.resolve(symLinkParentDir, json.name) : Path.dirname(pkJsonFile),
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
    to = Path.relative(process.cwd(), to);
  // tslint:disable-next-line: no-console
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

function _writeGitHook(project: string) {
  // if (!isWin32) {
  const gitPath = Path.resolve(project, '.git/hooks');
  if (fs.existsSync(gitPath)) {
    const hookStr = '#!/bin/sh\n' +
      `cd "${rootDir}"\n` +
      // 'drcp init\n' +
      // 'npx pretty-quick --staged\n' + // Use `tslint --fix` instead.
      `plink lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
    if (fs.existsSync(gitPath + '/pre-commit'))
      fs.unlinkSync(gitPath + '/pre-commit');
    fs.writeFileSync(gitPath + '/pre-push', hookStr);
    // tslint:disable-next-line: no-console
    log.info('Write ' + gitPath + '/pre-push');
    if (!isWin32) {
      spawn('chmod', '-R', '+x', project + '/.git/hooks/pre-push');
    }
  }
  // }
}

function deleteDuplicatedInstalledPkg(workspaceKey: string) {
  const wsState = getState().workspaces.get(workspaceKey)!;
  const doNothing = () => {};
  wsState.linkedDependencies.concat(wsState.linkedDevDependencies).map(([pkgName]) => {
    const dir = Path.resolve(rootDir, workspaceKey, 'node_modules', pkgName);
    return fs.promises.lstat(dir)
    .then((stat) => {
      if (!stat.isSymbolicLink()) {
        // tslint:disable-next-line: no-console
        log.info(`Previous installed ${Path.relative(rootDir,dir)} is deleted, due to linked package ${pkgName}`);
        return fs.promises.unlink(dir);
      }
    })
    .catch(doNothing);
  });
}

// /**
//    * If a source code package uses Plink's __plink API ( like `.logger`) or extends Plink's command line,
//    * they need ensure some Plink's dependencies are installed as 1st level dependency in their workspace,
//    * otherwise Visual Code Editor can not find correct type definitions while referencing Plink's logger or
//    * Command interface.
//    * 
//    * So I need to make sure these dependencies are installed in each workspace
//    */

// function plinkApiRequiredDeps(): PackageJsonInterf {
//   const plinkJson: PackageJsonInterf = require('@wfh/plink/package.json');
//   const fakeJson: PackageJsonInterf = {
//     version: plinkJson.version,
//     name: plinkJson.name,
//     dependencies: {}
//   };
//   for (const dep of ['commander', 'log4js']) {
//     const version = plinkJson.dependencies![dep];
//     fakeJson.dependencies![dep] = version;
//   }
//   return fakeJson;
// }
