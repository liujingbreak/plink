import { PayloadAction } from '@reduxjs/toolkit';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { from, merge, of, defer, throwError} from 'rxjs';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import { distinctUntilChanged, filter, map, switchMap, debounceTime,
  take, concatMap, skip, ignoreElements, scan, catchError } from 'rxjs/operators';
import { writeFile } from '../cmd/utils';
import config from '../config';
import { listCompDependency, PackageJsonInterf, DependentInfo } from '../transitive-dep-hoister';
import { updateTsconfigFileForEditor } from '../editor-helper';
import logConfig from '../log-config';
import { allPackages, packages4WorkspaceKey } from './package-list-helper';
import { spawn } from '../process-utils';
import { exe } from '../process-utils';
import { setProjectList} from '../recipe-manager';
import { stateFactory, ofPayloadAction } from '../store';
import { getRootDir, isDrcpSymlink } from '../utils/misc';
import cleanInvalidSymlinks, { isWin32, listModuleSymlinks, unlinkAsync, _symlinkAsync, symlinkAsync } from '../utils/symlinks';
// import { actions as _cleanActions } from '../cmd/cli-clean';
import {PlinkEnv} from '../node-path';

import { EOL } from 'os';
export interface PackageInfo {
  name: string;
  scope: string;
  shortName: string;
  json: any;
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

const {symlinkDir, distDir} = JSON.parse(process.env.__plink!) as PlinkEnv;

const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

const state: PackagesState = {
  inited: false,
  workspaces: new Map(),
  project2Packages: new Map(),
  srcPackages: new Map(),
  gitIgnores: {},
  linkedDrcp: isDrcpSymlink ?
    createPackageInfo(Path.resolve(
      getRootDir(), 'node_modules/@wfh/plink/package.json'), false, getRootDir())
    : null,
  workspaceUpdateChecksum: 0,
  packagesUpdateChecksum: 0
  // _computed: {
  //   workspaceKeys: []
  // }
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
    // _updatePackageState(d, {payload: jsons}: PayloadAction<any[]>) {
      //   for (const json of jsons) {
      //     const pkg = d.srcPackages.get(json.name);
      //     if (pkg == null) {
      //       console.error(
      //         `[package-mgr.index] package name "${json.name}" in package.json is changed since last time,\n` +
      //         'please do "init" again on workspace root directory');
      //       continue;
      //     }
      //     pkg.json = json;
      //   }
      // },
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
        console.log('[_hoistWorkspaceDeps] @wfh/plink is symlink');
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

      // console.log(installJson)
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
    updateGitIgnores(d, {payload}: PayloadAction<{file: string, lines: string[]}>) {
      d.gitIgnores[payload.file] = payload.lines.map(line => line.startsWith('/') ? line : '/' + line);
    },
    _relatedPackageUpdated(d, {payload: workspaceKey}: PayloadAction<string>) {},
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
    }
  }
});

export const actionDispatcher = stateFactory.bindActionCreators(slice);
export const {updateGitIgnores, onLinkedPackageAdded} = actionDispatcher;

/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
stateFactory.addEpic((action$, state$) => {
  const pkgTsconfigForEditorRequestMap = new Set<string>();
  const packageAddedList = new Array<string>();

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
        if (!isForce) {
          // call initRootDirectory(),
          // only call _hoistWorkspaceDeps when "srcPackages" state is changed by action `_syncLinkedPackages`
          return merge(
            defer(() => of(initRootDirectory(createHook))),
            // wait for _syncLinkedPackages finish
            getStore().pipe(
              distinctUntilChanged((s1, s2) => s1.srcPackages === s2.srcPackages),
              skip(1), take(1),
              map(() => actionDispatcher._hoistWorkspaceDeps({dir}))
            )
          );
        } else {
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
              console.log('force npm install in', wsKey);
            });
          }
          // call initRootDirectory() and wait for it finished by observe action '_syncLinkedPackages',
          // then call _hoistWorkspaceDeps
          return merge(
            defer(() => of(initRootDirectory(createHook))),
            action$.pipe(
              ofPayloadAction(slice.actions._syncLinkedPackages),
              take(1),
              map(() => actionDispatcher._hoistWorkspaceDeps({dir}))
            )
          );
        }
      }),
      ignoreElements()
    ),

    // initRootDir
    action$.pipe(ofPayloadAction(slice.actions.initRootDir),
      map(({payload}) => {
        checkAllWorkspaces();
        if (getState().workspaces.has(workspaceKey(process.cwd()))) {
          actionDispatcher.updateWorkspace({dir: process.cwd(), isForce: payload.isForce, createHook: payload.createHook});
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
        actionDispatcher._relatedPackageUpdated(wsKey);
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
          console.log('New workspace: ', newAdded);
          for (const ws of newAdded) {
            actionDispatcher._installWorkspace({workspaceKey: ws});
          }
        }
        return curr;
      }),
      ignoreElements()
    ),
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
    action$.pipe(ofPayloadAction(slice.actions._relatedPackageUpdated),
      map(action => pkgTsconfigForEditorRequestMap.add(action.payload)),
      debounceTime(800),
      concatMap(() => {
        const dones = Array.from(pkgTsconfigForEditorRequestMap.values()).map(wsKey => {
          updateTsconfigFileForEditor(wsKey);
          return collectDtsFiles(wsKey);
        });
        return from(Promise.all(dones));
      }),
      map(async () => {
        pkgTsconfigForEditorRequestMap.clear();
        await writeConfigFiles();
        actionDispatcher.packagesUpdated();
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
                console.log('modify', file);
              });
            });
          })
        )));
      }),
      ignoreElements()
    ),
    action$.pipe(ofPayloadAction(slice.actions.addProject, slice.actions.deleteProject),
      concatMap(() => from(_scanPackageAndLink())),
      ignoreElements()
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
  actionDispatcher._relatedPackageUpdated(wsKey);
}

/**
 * Create sub directory "types" under current workspace
 * @param wsKey 
 */
function collectDtsFiles(wsKey: string) {
  const wsTypesDir = Path.resolve(getRootDir(), wsKey, 'types');
  fs.mkdirpSync(wsTypesDir);
  const mergeTds: Map<string, string> = new Map();
  for (const pkg of packages4WorkspaceKey(wsKey)) {
    if (pkg.json.dr.mergeTds) {
      const file = pkg.json.dr.mergeTds;
      if (typeof file === 'string') {
        mergeTds.set(pkg.shortName + '-' + Path.basename(file), Path.resolve(pkg.realPath, file));
      } else if (Array.isArray(file)) {
        for (const f of file as string[])
          mergeTds.set(pkg.shortName + '-' + Path.basename(f), Path.resolve(pkg.realPath,f));
      }
    }
  }
  // console.log(mergeTds);
  for (const chrFileName of fs.readdirSync(wsTypesDir)) {
    if (!mergeTds.has(chrFileName)) {
    //   mergeTds.delete(chrFileName);
    // } else {
      const useless = Path.resolve(wsTypesDir, chrFileName);
      fs.unlink(useless);
      // tslint:disable-next-line: no-console
      console.log('Delete', useless);
    }
  }
  const done: Promise<any>[] = new Array(mergeTds.size);
  let i = 0;
  for (const dts of mergeTds.keys()) {
    const target = mergeTds.get(dts)!;
    const absDts = Path.resolve(wsTypesDir, dts);
    // tslint:disable-next-line: no-console
    // console.log(`Create symlink ${absDts} --> ${target}`);
    done[i++] = symlinkAsync(target, absDts);
  }
  return Promise.all(done);
}

/**
 * Delete workspace state if its directory does not exist
 */
function checkAllWorkspaces() {
  for (const key of getState().workspaces.keys()) {
    const dir = Path.resolve(getRootDir(), key);
    if (!fs.existsSync(dir)) {
      // tslint:disable-next-line: no-console
      console.log(`Workspace ${key} does not exist anymore.`);
      actionDispatcher._change(d => d.workspaces.delete(key));
    }
  }
}

// async function updateLinkedPackageState() {
//   const jsonStrs = await Promise.all(
//     Array.from(getState().srcPackages.entries())
//     .map(([name, pkInfo]) => {
//       return readFileAsync(Path.resolve(pkInfo.realPath, 'package.json'), 'utf8');
//     })
//   );

//   deleteUselessSymlink();
//   actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
// }

async function deleteUselessSymlink() {
  const dones: Promise<void>[] = [];
  const checkDir = Path.resolve(getRootDir(), 'node_modules');
  const srcPackages = getState().srcPackages;
  const drcpName = getState().linkedDrcp ? getState().linkedDrcp!.name : null;
  const done1 = listModuleSymlinks(checkDir, async link => {
    const pkgName = Path.relative(checkDir, link).replace(/\\/g, '/');
    if ( drcpName !== pkgName && !srcPackages.has(pkgName)) {
      // tslint:disable-next-line: no-console
      console.log(chalk.yellow(`Delete extraneous symlink: ${link}`));
      const done = new Promise<void>((res, rej) => {
        fs.unlink(link, (err) => { if (err) return rej(err); else res();});
      });
      dones.push(done);
    }
  });
  await done1;
  await Promise.all(dones);
  // const pwd = process.cwd();
  // const forbidDir = Path.join(getRootDir(), 'node_modules');
  // if (symlinkDir !== forbidDir) {
  //   const removed: Promise<any>[] = [];
  //   const done2 = listModuleSymlinks(forbidDir, async link => {
  //     const pkgName = Path.relative(forbidDir, link).replace(/\\/g, '/');
  //     if (srcPackages.has(pkgName)) {
  //       removed.push(unlinkAsync(link));
  //       // tslint:disable-next-line: no-console
  //       console.log(`Redundant symlink "${Path.relative(pwd, link)}" removed.`);
  //     }
  //   });
  //   return Promise.all([done1, done2, ...removed]);
  // }
}

async function initRootDirectory(createHook = false) {
  const rootPath = getRootDir();
  fs.mkdirpSync(distDir);
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates', 'module-resolve.server.tmpl.ts'), rootPath + '/module-resolve.server.ts');
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates',
      'gitignore.txt'), getRootDir() + '/.gitignore');
  await cleanInvalidSymlinks();
  if (!fs.existsSync(Path.join(rootPath, 'logs')))
    fs.mkdirpSync(Path.join(rootPath, 'logs'));

  fs.mkdirpSync(symlinkDir);

  logConfig(config());

  const projectDirs = getProjectList();

  if (createHook) {
    projectDirs.forEach(prjdir => {
      _writeGitHook(prjdir);
      maybeCopyTemplate(Path.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
    });
  }

  await _scanPackageAndLink();
  await deleteUselessSymlink();

  // await writeConfigFiles();
}

async function writeConfigFiles() {
  return (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
    // tslint:disable-next-line: no-console
    console.log('write config file:', file);
    writeFile(Path.join(distDir, file),
      '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
  });
}

async function installWorkspace(ws: WorkspaceState) {
  const dir = Path.resolve(getRootDir(), ws.id);
  // tslint:disable-next-line: no-console
  console.log('Install dependencies in ' + dir);
  try {
    await copyNpmrcToWorkspace();
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
  console.log('[init] write', installJsonFile);
  fs.writeFileSync(installJsonFile, ws.installJsonStr, 'utf8');
  await new Promise(resolve => setTimeout(resolve, 5000));
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
    console.log('Failed to install dependencies', e.stack);
    throw e;
  } finally {
    // tslint:disable-next-line: no-console
    console.log('Recover ' + installJsonFile);
    // 3. Recover package.json and symlinks deleted in Step.1.
    fs.writeFileSync(installJsonFile, ws.originInstallJsonStr, 'utf8');
    await recoverSymlinks();
  }

  function recoverSymlinks() {
    return Promise.all(symlinksInModuleDir.map(({content, link}) => {
      return _symlinkAsync(content, link, isWin32 ? 'junction' : 'dir');
    }));
  }
}

async function copyNpmrcToWorkspace() {
  const target = Path.resolve(getRootDir(), '.npmrc');
  if (fs.existsSync(target))
    return;
  const isChina = await getStore().pipe(
    map(s => s.isInChina), distinctUntilChanged(),
      filter(cn => cn != null),
      take(1)
    ).toPromise();

  if (isChina) {
    // tslint:disable-next-line: no-console
    console.log('create .npmrc to', target);
    fs.copyFileSync(Path.resolve(__dirname, '../../../.npmrc'), target);
  }
}

async function _scanPackageAndLink() {
  const rm = (await import('../recipe-manager'));

  const projPkgMap: Map<string, PackageInfo[]> = new Map();
  const pkgList: PackageInfo[] = [];
  // const symlinksDir = Path.resolve(getRootDir(), 'node_modules');
  await rm.linkComponentsAsync(symlinkDir).pipe(
    tap(({proj, jsonFile, json}) => {
      if (!projPkgMap.has(proj))
        projPkgMap.set(proj, []);
      const info = createPackageInfoWithJson(jsonFile, json, false, symlinkDir);
      pkgList.push(info);
      projPkgMap.get(proj)!.push(info);
    })
  ).toPromise();

  for (const [prj, pkgs] of projPkgMap.entries()) {
    actionDispatcher._associatePackageToPrj({prj, pkgs});
  }
  actionDispatcher._syncLinkedPackages(pkgList);
}

/**
 * 
 * @param pkJsonFile package.json file path
 * @param isInstalled 
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
export function createPackageInfo(pkJsonFile: string, isInstalled = false,
  symLinkParentDir?: string): PackageInfo {
  const json = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8'));
  return createPackageInfoWithJson(pkJsonFile, json, isInstalled, symLinkParentDir);
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
            Path.resolve(getRootDir(), workspaceKey, 'node_modules', dep, 'package.json'), true);
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
  console.log('copy to %s', chalk.cyan(to));
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
    console.log('Write ' + gitPath + '/pre-push');
    if (!isWin32) {
      spawn('chmod', '-R', '+x', project + '/.git/hooks/pre-push');
    }
  }
  // }
}
