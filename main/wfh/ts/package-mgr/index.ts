import { PayloadAction } from '@reduxjs/toolkit';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { from, merge, Observable, of, defer, throwError} from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, debounceTime,
  take, concatMap, skip, ignoreElements, scan, catchError, tap } from 'rxjs/operators';
import { listCompDependency, PackageJsonInterf, DependentInfo } from '../transitive-dep-hoister';
import { updateTsconfigFileForEditor } from '../editor-helper';
import { allPackages } from './package-list-helper';
import { spawn } from '../process-utils';
import { exe } from '../process-utils';
import { setProjectList} from '../recipe-manager';
import { stateFactory, ofPayloadAction } from '../store';
import { getRootDir, isDrcpSymlink } from '../utils/misc';
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
  linkedDrcp: PackageInfo | null;
  gitIgnores: {[file: string]: string[]};
  isInChina?: boolean;
  /** Everytime a hoist workspace state calculation is basically done, it is increased by 1 */
  workspaceUpdateChecksum: number;
  packagesUpdateChecksum: number;
  /** workspace key */
  lastCreatedWorkspace?: string;
}

const {distDir} = JSON.parse(process.env.__plink!) as PlinkEnv;

const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

const state: PackagesState = {
  inited: false,
  workspaces: new Map(),
  project2Packages: new Map(),
  srcPackages: new Map(),
  gitIgnores: {},
  linkedDrcp: null,
  workspaceUpdateChecksum: 0,
  packagesUpdateChecksum: 0
};

export interface WorkspaceState {
  id: string;
  originInstallJson: PackageJsonInterf;
  originInstallJsonStr: string;
  installJson: PackageJsonInterf;
  installJsonStr: string;
  /** names of those symlink packages */
  linkedDependencies: [string, string][];
  // /** names of those symlink packages */
  linkedDevDependencies: [string, string][];

  /** installed DR component packages [name, version]*/
  installedComponents?: Map<string, PackageInfo>;

  hoistInfo: Map<string, DependentInfo>;
  hoistPeerDepInfo: Map<string, DependentInfo>;

  hoistDevInfo: Map<string, DependentInfo>;
  hoistDevPeerDepInfo: Map<string, DependentInfo>;
}

export const slice = stateFactory.newSlice({
  name: NS,
  initialState: state,
  reducers: {
    /** Do this action after any linked package is removed or added  */
    initRootDir(d, action: PayloadAction<{isForce: boolean, createHook: boolean}>) {},

    /** Check and install dependency, if there is linked package used in more than one workspace, 
     * to switch between different workspace */
    updateWorkspace(d, action: PayloadAction<{dir: string, isForce: boolean, createHook: boolean}>) {
    },
    updateDir() {},
    _syncLinkedPackages(d, {payload}: PayloadAction<PackageInfo[]>) {
      d.inited = true;
      d.srcPackages = new Map();
      for (const pkInfo of payload) {
        d.srcPackages.set(pkInfo.name, pkInfo);
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
    /** payload: workspace keys  */
    createSymlinksForWorkspace(d, action: PayloadAction<string[]>) {},
    updateGitIgnores(d, {payload}: PayloadAction<{file: string, lines: string[]}>) {
      d.gitIgnores[payload.file] = payload.lines.map(line => line.startsWith('/') ? line : '/' + line);
    },
    packagesUpdated(d) {
      d.packagesUpdateChecksum++;
    },
    setInChina(d, {payload}: PayloadAction<boolean>) {
      d.isInChina = payload;
    },
    setCurrentWorkspace(d, {payload: dir}: PayloadAction<string | null>) {
      if (dir != null)
        d.currWorkspace = workspaceKey(dir);
      else
        d.currWorkspace = null;
    },
    workspaceStateUpdated(d, {payload}: PayloadAction<void>) {
      d.workspaceUpdateChecksum += 1;
    },
    _hoistWorkspaceDeps(state, {payload: {dir}}: PayloadAction<{dir: string}>) {
      if (state.srcPackages == null) {
        throw new Error('"srcPackages" is null, need to run `init` command first');
      }

      const pkjsonStr = fs.readFileSync(Path.resolve(dir, 'package.json'), 'utf8');
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
      // const installedComp = doListInstalledComp4Workspace(state.workspaces, state.srcPackages, wsKey);

      const existing = state.workspaces.get(wsKey);

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
        hoistDevPeerDepInfo: devHoistPeerDepInfo
      };
      state.lastCreatedWorkspace = wsKey;
      state.workspaces.set(wsKey, existing ? Object.assign(existing, wp) : wp);
    },
    _installWorkspace(d, {payload: {workspaceKey}}: PayloadAction<{workspaceKey: string}>) {
      // d._computed.workspaceKeys.push(workspaceKey);
    },
    _associatePackageToPrj(d, {payload: {prj, pkgs}}: PayloadAction<{prj: string; pkgs: PackageInfo[]}>) {
      d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
    },
    _onRelatedPackageUpdated(d, {payload: workspaceKey}: PayloadAction<string>) {}
  }
});

export const actionDispatcher = stateFactory.bindActionCreators(slice);
export const {updateGitIgnores, onLinkedPackageAdded} = actionDispatcher;
const {_onRelatedPackageUpdated} = actionDispatcher;

/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
stateFactory.addEpic((action$, state$) => {
  const updatedWorkspaceSet = new Set<string>();
  const packageAddedList = new Array<string>();

  actionDispatcher._change(d => {
    d.linkedDrcp = isDrcpSymlink ?
    createPackageInfo(Path.resolve(
      getRootDir(), 'node_modules/@wfh/plink/package.json'), false)
    : null;
  });

  return merge(
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
      switchMap(({payload: {dir, isForce, createHook}}) => {
        dir = Path.resolve(dir);
        actionDispatcher.setCurrentWorkspace(dir);
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
              const path = Path.resolve(getRootDir(), curr);
              actionDispatcher.updateWorkspace({dir: path, isForce: payload.isForce, createHook: payload.createHook});
            } else {
              actionDispatcher.setCurrentWorkspace(null);
            }
          }
        }
      }),
      ignoreElements()
    ),

    action$.pipe(ofPayloadAction(slice.actions._hoistWorkspaceDeps),
      map(({payload}) => {
        const wsKey = workspaceKey(payload.dir);
        _onRelatedPackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => actionDispatcher.workspaceStateUpdated());
      }),
      ignoreElements()
    ),

    action$.pipe(ofPayloadAction(slice.actions.updateDir),
      concatMap(() => defer(() => from(
        _scanPackageAndLink().then(() => {
          for (const key of getState().workspaces.keys()) {
            updateInstalledPackageForWorkspace(key);
          }
        })
      )))
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
    action$.pipe(ofPayloadAction(slice.actions._installWorkspace),
      concatMap(action => {
        const wsKey = action.payload.workspaceKey;
        return getStore().pipe(
          map(s => s.workspaces.get(wsKey)),
          distinctUntilChanged(),
          filter(ws => ws != null),
          take(1),
          concatMap(ws => from(installWorkspace(ws!))),
          map(() => {
            updateInstalledPackageForWorkspace(wsKey);
          })
        );
      }),
      ignoreElements()
    ),
    action$.pipe(ofPayloadAction(slice.actions._onRelatedPackageUpdated),
      map(action => updatedWorkspaceSet.add(action.payload)),
      debounceTime(800),
      concatMap(() => {
        const keys = Array.from(updatedWorkspaceSet.values()).map(wsKey => {
          updateTsconfigFileForEditor(wsKey);
          return wsKey;
        });
        actionDispatcher.createSymlinksForWorkspace(keys);
        updatedWorkspaceSet.clear();
        return from(writeConfigFiles());
      }),
      map(async () => {
        actionDispatcher.packagesUpdated();
      })
    ),
    action$.pipe(ofPayloadAction(slice.actions.createSymlinksForWorkspace),
      concatMap(({payload: wsKeys}) => {
        return merge(...wsKeys.map(_createSymlinksForWorkspace));
      })
    ),
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
      concatMap(() => from(_scanPackageAndLink()))
    )
  ).pipe(
    ignoreElements(),
    catchError(err => {
      console.error('[package-mgr.index]', err.stack ? err.stack : err);
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
  const relPath = Path.relative(getRootDir(), path);
  return relPath.startsWith('..') ? Path.resolve(path) : relPath;
}

export function workspaceKey(path: string) {
  let rel = Path.relative(getRootDir(), Path.resolve(path));
  if (Path.sep === '\\')
    rel = rel.replace(/\\/g, '/');
  return rel;
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

/**
 * List linked packages
 */
export function listPackages(): string {
  let out = '';
  let i = 0;
  for (const {name} of allPackages('*', 'src')) {
    out += `${i++}. ${name}`;
    out += '\n';
  }

  return out;
}

export function getProjectList() {
  return Array.from(getState().project2Packages.keys()).map(pj => Path.resolve(getRootDir(), pj));
}

export function isCwdWorkspace() {
  const wsKey = workspaceKey(process.cwd());
  const ws = getState().workspaces.get(wsKey);
  if (ws == null)
    return false;
  return true;
}

function updateInstalledPackageForWorkspace(wsKey: string) {
  const pkgEntry = doListInstalledComp4Workspace(getState(), wsKey);

  const installed = new Map((function*(): Generator<[string, PackageInfo]> {
    for (const pk of pkgEntry) {
      yield [pk.name, pk];
    }
  })());
  actionDispatcher._change(d => d.workspaces.get(wsKey)!.installedComponents = installed);
  _onRelatedPackageUpdated(wsKey);
}

/**
 * Delete workspace state if its directory does not exist
 */
function checkAllWorkspaces() {
  for (const key of getState().workspaces.keys()) {
    const dir = Path.resolve(getRootDir(), key);
    if (!fs.existsSync(dir)) {
      // tslint:disable-next-line: no-console
      log.info(`Workspace ${key} does not exist anymore.`);
      actionDispatcher._change(d => d.workspaces.delete(key));
    }
  }
}

async function initRootDirectory(createHook = false) {
  const rootPath = getRootDir();
  fs.mkdirpSync(distDir);
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates',
      'gitignore.txt'), getRootDir() + '/.gitignore');
  await cleanInvalidSymlinks();

  const projectDirs = getProjectList();

  if (createHook) {
    projectDirs.forEach(prjdir => {
      _writeGitHook(prjdir);
      maybeCopyTemplate(Path.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
    });
  }

  await _scanPackageAndLink();
  await _deleteUselessSymlink(Path.resolve(getRootDir(), 'node_modules'), new Set<string>());
}

async function writeConfigFiles() {
  return (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
    // tslint:disable-next-line: no-console
    log.info('write config file:', file);
    writeFile(Path.join(distDir, file),
      '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
  });
}

async function installWorkspace(ws: WorkspaceState) {
  const dir = Path.resolve(getRootDir(), ws.id);
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
    fs.mkdirpSync(target);
  }

  // 1. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
  // backup them for late recovery
  await listModuleSymlinks(target, link => {
    const linkContent = fs.readlinkSync(link);
    symlinksInModuleDir.push({content: linkContent, link});
    return unlinkAsync(link);
  });

  // 2. Run `npm install`
  const installJsonFile = Path.resolve(dir, 'package.json');
  // tslint:disable-next-line: no-console
  log.info('write', installJsonFile);
  fs.writeFileSync(installJsonFile, toInstallPkgJsonStr, 'utf8');
  await new Promise(resolve => process.nextTick(resolve));
  // await new Promise(resolve => setTimeout(resolve, 5000));
  try {
    const env = {...process.env, NODE_ENV: 'development'};
    await exe('npm', 'install', {
      cwd: dir,
      env // Force development mode, otherwise "devDependencies" will not be installed
    }).promise;
    // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
    // why, I have to add a process.nextTick() between them to workaround
    await new Promise(resolve => process.nextTick(resolve));
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

async function _scanPackageAndLink() {
  const rm = (await import('../recipe-manager'));

  const projPkgMap: Map<string, PackageInfo[]> = new Map();
  const pkgList: PackageInfo[] = [];
  await rm.scanPackages().pipe(
    tap(([proj, jsonFile]) => {
      if (!projPkgMap.has(proj))
        projPkgMap.set(proj, []);
      const info = createPackageInfo(jsonFile, false);
      pkgList.push(info);
      projPkgMap.get(proj)!.push(info);
    })
  ).toPromise();

  for (const [prj, pkgs] of projPkgMap.entries()) {
    actionDispatcher._associatePackageToPrj({prj, pkgs});
  }
  actionDispatcher._syncLinkedPackages(pkgList);
  // _createSymlinks();
}

function _createSymlinksForWorkspace(wsKey: string) {
  const symlinkDir = Path.resolve(getRootDir(), wsKey, '.links');
  fs.mkdirpSync(symlinkDir);
  const ws = getState().workspaces.get(wsKey)!;

  const pkgNames = ws.linkedDependencies.map(item => item[0])
  .concat(ws.linkedDevDependencies.map(item => item[0]));

  const pkgNameSet = new Set(pkgNames);
  if (ws.installedComponents) {
    for (const pname of ws.installedComponents.keys())
      pkgNameSet.add(pname);
  }

  actionDispatcher.updateGitIgnores({
    file: Path.resolve(getRootDir(), '.gitignore'),
    lines: [Path.relative(getRootDir(), symlinkDir).replace(/\\/g, '/')]});
  return merge(
    from(pkgNames.map(
        name => getState().srcPackages.get(name) || ws.installedComponents!.get(name)!)
      ).pipe(
        symbolicLinkPackages(symlinkDir)
      ),
    from(_deleteUselessSymlink(symlinkDir, pkgNameSet))
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
      const done = new Promise<void>((res, rej) => {
        fs.unlink(link, (err) => { if (err) return rej(err); else res();});
      });
      dones.push(done);
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
function* doListInstalledComp4Workspace(state: PackagesState, workspaceKey: string) {
  const originInstallJson = state.workspaces.get(workspaceKey)!.originInstallJson;
  // const depJson = process.env.NODE_ENV === 'production' ? [originInstallJson.dependencies] :
  //   [originInstallJson.dependencies, originInstallJson.devDependencies];
  for (const deps of [originInstallJson.dependencies, originInstallJson.devDependencies]) {
    if (deps == null)
      continue;
    for (const dep of Object.keys(deps)) {
      if (!state.srcPackages.has(dep) && dep !== '@wfh/plink') {
        const pkjsonFile = Path.resolve(getRootDir(), workspaceKey, 'node_modules', dep, 'package.json');
        if (fs.existsSync(pkjsonFile)) {
          const pk = createPackageInfo(
            Path.resolve(getRootDir(), workspaceKey, 'node_modules', dep, 'package.json'), true
          );
          if (pk.json.dr) {
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
  fs.copySync(from, to);
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
  if (!fs.existsSync(Path.resolve(getRootDir(), to)))
    cp(Path.resolve(__dirname, from), to);
}

function _writeGitHook(project: string) {
  // if (!isWin32) {
  const gitPath = Path.resolve(project, '.git/hooks');
  if (fs.existsSync(gitPath)) {
    const hookStr = '#!/bin/sh\n' +
      `cd "${getRootDir()}"\n` +
      // 'drcp init\n' +
      // 'npx pretty-quick --staged\n' + // Use `tslint --fix` instead.
      `plink lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
    if (fs.existsSync(gitPath + '/pre-commit'))
      fs.unlink(gitPath + '/pre-commit');
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
    const dir = Path.resolve(getRootDir(), workspaceKey, 'node_modules', pkgName);
    return fs.promises.lstat(dir)
    .then((stat) => {
      if (!stat.isSymbolicLink()) {
        // tslint:disable-next-line: no-console
        log.info(`Previous installed ${Path.relative(getRootDir(),dir)} is deleted, due to linked package ${pkgName}`);
        return fs.promises.unlink(dir);
      }
    })
    .catch(doNothing);
  });
}
function writeFile(file: string, content: string) {
  fs.writeFileSync(file, content);
  // tslint:disable-next-line: no-console
  log.info('%s is written', chalk.cyan(Path.relative(process.cwd(), file)));
}
