import { PayloadAction } from '@reduxjs/toolkit';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { from, merge, of} from 'rxjs';
import type {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import { distinctUntilChanged, filter, map, switchMap,
  take, concatMap, skip, ignoreElements, scan, catchError } from 'rxjs/operators';
import { writeFile } from '../cmd/utils';
import config from '../config';
import { listCompDependency, PackageJsonInterf } from '../dependency-hoister';
import { writeTsconfig4project, writeTsconfigForEachPackage } from '../editor-helper';
import logConfig from '../log-config';
import { findAllPackages } from '../package-utils';
import { spawn } from '../process-utils';
import { exe } from '../process-utils';
import { setProjectList} from '../recipe-manager';
import { stateFactory, ofPayloadAction } from '../store';
import { getRootDir, isDrcpSymlink } from '../utils/misc';
import cleanInvalidSymlinks, { isWin32, listModuleSymlinks, unlinkAsync, _symlinkAsync } from '../utils/symlinks';
import { actions as _cleanActions } from '../cmd/cli-clean';
import type {PlinkEnv} from '../node-path';

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
  srcPackages: Map<string, PackageInfo>;
  /** Key is relative path to root workspace */
  workspaces: Map<string, WorkspaceState>;
  project2Packages: Map<string, string[]>;
  linkedDrcp: PackageInfo | null;
  gitIgnores: {[file: string]: string};
}

const {symlinkDir} = JSON.parse(process.env.__plink!) as PlinkEnv;

const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

const state: PackagesState = {
  workspaces: new Map(),
  project2Packages: new Map(),
  srcPackages: new Map(),
  gitIgnores: {},
  linkedDrcp: isDrcpSymlink ?
    createPackageInfo(Path.resolve(
      getRootDir(), 'node_modules/dr-comp-package/package.json'), false, getRootDir())
    : null
};

interface WorkspaceState {
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
  // /** other 3rd party dependencies in tuple of name and version pair */
  // dependencies: [string, string][];
  // devDependencies: [string, string][];

  // hoistedDeps: {[dep: string]: string};
  // hoistedDevDeps: {[dep: string]: string};
}

export const slice = stateFactory.newSlice({
  name: NS,
  initialState: state,
  reducers: {
    /** Do this action after any linked package is removed or added  */
    initRootDir(d, action: PayloadAction<{hoistedDir: string} | undefined | null>) {
    },

    /** Check and install dependency, if there is linked package used in more than one workspace, 
     * to switch between different workspace */
    initWorkspace(d, action: PayloadAction<{dir: string, isForce: boolean, logHasConfiged: boolean}>) {
    },
    _syncPackagesState(d, {payload}: PayloadAction<PackageInfo[]>) {
      d.srcPackages = new Map();
      for (const pkInfo of payload) {
        d.srcPackages.set(pkInfo.name, pkInfo);
      }
    },
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
        console.log('[_hoistWorkspaceDeps] dr-comp-package is symlink');
        delete updatingDeps['dr-comp-package'];
        delete updatingDevDeps['dr-comp-package'];
      }

      // pkjsonList.push(updatingJson);
      const {hoisted: hoistedDeps, msg} = listCompDependency(
        linkedDependencies.map(entry => state.srcPackages.get(entry[0])!.json),
        dir, updatingDeps
      );

      const {hoisted: hoistedDevDeps, msg: msgDev} = listCompDependency(
        linkedDevDependencies.map(entry => state.srcPackages.get(entry[0])!.json),
        dir, updatingDevDeps
      );
      // tslint:disable-next-line: no-console
      if (msg()) console.log(`Workspace "${dir}" dependencies:\n`, msg());
      // tslint:disable-next-line: no-console
      if (msgDev()) console.log(`Workspace "${dir}" devDependencies:\n`, msgDev());
      // In case some packages have peer dependencies of other packages
      // remove them from dependencies
      for (const key of hoistedDeps.keys()) {
        if (state.srcPackages.has(key))
          hoistedDeps.delete(key);
      }

      for (const key of hoistedDevDeps.keys()) {
        if (state.srcPackages.has(key))
          hoistedDevDeps.delete(key);
      }

      const installJson: PackageJsonInterf = {
        ...pkjson,
        dependencies: Array.from(hoistedDeps.entries()).reduce((dic, [name, info]) => {
          dic[name] = info.by[0].ver;
          return dic;
        }, {} as {[key: string]: string}),
        devDependencies: Array.from(hoistedDevDeps.entries()).reduce((dic, [name, info]) => {
          dic[name] = info.by[0].ver;
          return dic;
        }, {} as {[key: string]: string})
      };

      // console.log(installJson)

      const wsKey = workspaceKey(dir);
      // const installedComp = listInstalledComp4Workspace(state.workspaces, state.srcPackages, wsKey);

      const wp: WorkspaceState = {
        id: wsKey,
        originInstallJson: pkjson,
        originInstallJsonStr: pkjsonStr,
        installJson,
        installJsonStr: JSON.stringify(installJson, null, '  '),
        linkedDependencies,
        linkedDevDependencies
        // installedComponents: new Map(installedComp.map(pkg => [pkg.name, pkg]))
        // dependencies,
        // devDependencies,
        // hoistedDeps,
        // hoistedDevDeps
      };
      state.workspaces.set(wsKey, wp);
      // console.log('-----------------', dir);
    },
    _installWorkspace(state, {payload: {workspaceKey}}: PayloadAction<{workspaceKey: string}>) {
    },
    _associatePackageToPrj(d, {payload: {prj, pkgs}}: PayloadAction<{prj: string; pkgs: PackageInfo[]}>) {
      d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
    },
    _updateGitIgnores(d, {payload}: PayloadAction<{file: string, content: string}>) {
      d.gitIgnores[payload.file] = payload.content;
    }
  }
});

export const actionDispatcher = stateFactory.bindActionCreators(slice);

// const readFileAsync = promisify<string, string, string>(fs.readFile);
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
stateFactory.addEpic((action$, state$) => {
  return merge(
    getStore().pipe(map(s => s.project2Packages),
      distinctUntilChanged(),
      map(pks => {
        setProjectList(getProjectList());
      }),
      ignoreElements()
    ),

    //  initWorkspace
    action$.pipe(ofPayloadAction(slice.actions.initWorkspace),
      switchMap(({payload: {dir, isForce, logHasConfiged}}) => {
        dir = Path.resolve(dir);

        const hoistOnPackageChanges = getStore().pipe(
          distinctUntilChanged((s1, s2) => s1.srcPackages === s2.srcPackages),
          skip(1), take(1),
          map(() => actionDispatcher._hoistWorkspaceDeps({dir}))
        );

        if (getState().srcPackages.size === 0) {
          return merge(hoistOnPackageChanges, of(slice.actions.initRootDir()));
        } else {
          if (!logHasConfiged) {
            logConfig(config());
          }
          const wsKey = workspaceKey(dir);
          if (isForce && getState().workspaces.has(wsKey)) {
            actionDispatcher._change(d => {
              // clean to trigger install action
              d.workspaces.get(wsKey)!.installJsonStr = '';
            });
          }
          // updateLinkedPackageState();
          actionDispatcher._hoistWorkspaceDeps({dir});
          return of();
        }
      }),
      ignoreElements()
    ),

    // initRootDir
    action$.pipe(ofPayloadAction(slice.actions.initRootDir),
      switchMap(() => {
        const goInitWorkspace$ = action$.pipe(
          ofPayloadAction(slice.actions._syncPackagesState),
          take(1),
          map(() => {
            if (getState().workspaces.size > 0) {
              for (const key of getState().workspaces.keys()) {
                const path = Path.resolve(getRootDir(), key);
                actionDispatcher.initWorkspace({dir: path, isForce: false, logHasConfiged: true});
              }
            }
          })
        );
        return merge(goInitWorkspace$, from(initRootDirectory()));
      }),
      ignoreElements()
    ),

    action$.pipe(ofPayloadAction(slice.actions._hoistWorkspaceDeps),
      concatMap(({payload}) => {
        const srcPackages = getState().srcPackages;
        const wsKey = workspaceKey(payload.dir);
        const ws = getState().workspaces.get(wsKey);
        if (ws == null)
          return of();
        const pks: PackageInfo[] = [
          ...ws.linkedDependencies.map(([name, ver]) => srcPackages.get(name)),
          ...ws.linkedDevDependencies.map(([name, ver]) => srcPackages.get(name))
        ].filter(pk => pk != null) as PackageInfo[];
        // if (getState().linkedDrcp) {
        //   const drcp = getState().linkedDrcp!.name;
        //   const spaceJson = getState().workspaces.get(wsKey)!.originInstallJson;
        //   if (spaceJson.dependencies && spaceJson.dependencies[drcp] ||
        //     spaceJson.devDependencies && spaceJson.devDependencies[drcp]) {
        //     pks.push(getState().linkedDrcp!);
        //   }
        // }
        return from(writeTsconfigForEachPackage(payload.dir, pks,
          (file, content) => actionDispatcher._updateGitIgnores({file, content})));
      }),
      ignoreElements()
    ),
    // Handle newly added workspace
    getStore().pipe(
      map(s => s.workspaces), distinctUntilChanged(),
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
          writeConfigFiles();
        }
        return curr;
      }),
      ignoreElements()
    ),
    ...Array.from(getState().workspaces.keys()).map(key => {
      return getStore().pipe(
        map(s => s.workspaces.get(key)!.installJsonStr),
        distinctUntilChanged(),
        filter(installJsonStr =>installJsonStr.length > 0),
        skip(1), take(1),
        map(() => {
          return actionDispatcher._installWorkspace({workspaceKey: key});
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
            const pkgEntry =
              listInstalledComp4Workspace(getState(), wsKey);

            const installed = new Map((function*(): Generator<[string, PackageInfo]> {
              for (const pk of pkgEntry) {
                yield [pk.name, pk];
              }
            })());
            actionDispatcher._change(d => d.workspaces.get(wsKey)!.installedComponents = installed);
          })
        );
      }),
      ignoreElements()
    ),
    getStore().pipe(
      map(s => s.gitIgnores),
      distinctUntilChanged(),
      map(gitIgnores => Object.keys(gitIgnores).join(',')),
      distinctUntilChanged(),
      switchMap(() => {
        // console.log('$$$$$$$$$', files);
        return merge(...Object.keys(getState().gitIgnores).map(file => getStore().pipe(
          map(s => s.gitIgnores[file]),
          distinctUntilChanged(),
          skip(1),
          map(content => {
            fs.writeFile(file, content, () => {
              // tslint:disable-next-line: no-console
              console.log('modify', file);
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
    catchError(err => {
      console.error('[package-mgr.index]', err);
      return of();
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
  let rel = Path.relative(getRootDir(), path);
  if (Path.sep === '\\')
    rel = rel.replace(/\\/g, '/');
  return rel;
}

export function pathToWorkspace(path: string) {
  return Path.relative(getRootDir(), path);
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

export function listPackages(): string {
  let out = '';
  let i = 0;
  findAllPackages((name: string) => {
    out += `${i++}. ${name}`;
    out += '\n';
  }, 'src');

  return out;
}

export function getProjectList() {
  return Array.from(getState().project2Packages.keys()).map(pj => Path.resolve(getRootDir(), pj));
}

export function listPackagesByProjects() {
  const cwd = process.cwd();
  const linkedPkgs = getState().srcPackages;
  let out = '';
  for (const [prj, pkgNames] of getState().project2Packages.entries()) {
    out += `Project ${prj || '.'}\n`;
    const pkgs = pkgNames.map(name => linkedPkgs.get(name)!);
    const maxWidth = pkgs.reduce((maxWidth, pk) => {
      const width = pk.name.length + pk.json.version.length + 1;
      return width > maxWidth ? width : maxWidth;
    }, 0);
    for (const pk of pkgs) {
      const width = pk.name.length + pk.json.version.length + 1;
      out += `  |- ${chalk.cyan(pk.name)}@${chalk.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
      ` ${Path.relative(cwd, pk.realPath)}\n`;
    }
    out += '\n';
  }
  return out;
}

// async function updateLinkedPackageState() {
//   const jsonStrs = await Promise.all(
//     Array.from(getState().srcPackages.entries())
//     .map(([name, pkInfo]) => {
//       return readFileAsync(Path.resolve(pkInfo.realPath, 'package.json'), 'utf8');
//     })
//   );

//   warnUselessSymlink();
//   actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
// }

function warnUselessSymlink() {
  const checkDir = Path.resolve(getRootDir(), 'node_modules');
  const srcPackages = getState().srcPackages;
  const drcpName = getState().linkedDrcp ? getState().linkedDrcp!.name : null;
  const done1 = listModuleSymlinks(checkDir, async link => {
    const pkgName = Path.relative(checkDir, link).replace(/\\/g, '/');
    if ( drcpName !== pkgName && !srcPackages.has(pkgName)) {
      // tslint:disable-next-line: no-console
      console.log(chalk.yellow(`Extraneous symlink: ${link}`));
    }
  });

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
  return done1;
}


async function initRootDirectory() {
  const rootPath = getRootDir();
  fs.mkdirpSync(Path.join(rootPath, 'dist'));
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(rootPath, 'dist', 'config.local.yaml'));
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates/app-template.js'), rootPath + '/app.js');
  maybeCopyTemplate(Path.resolve(__dirname, '../../templates', 'module-resolve.server.tmpl.ts'), rootPath + '/module-resolve.server.ts');
    // tslint:disable-next-line: max-line-length
    // maybeCopyTemplate(Path.resolve(__dirname, 'templates', 'module-resolve.browser.tmpl.ts'), rootPath + '/module-resolve.browser.ts');
  await cleanInvalidSymlinks();
  if (!fs.existsSync(Path.join(rootPath, 'logs')))
    fs.mkdirpSync(Path.join(rootPath, 'logs'));

  fs.mkdirpSync(symlinkDir);

  logConfig(config());

  const projectDirs = getProjectList();

  projectDirs.forEach(prjdir => {
    _writeGitHook(prjdir);
    maybeCopyTemplate(Path.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
  });

  await _scanPackageAndLink();
  warnUselessSymlink();

  await writeConfigFiles();

  writeTsconfig4project(getProjectList(), (file, content) => actionDispatcher._updateGitIgnores({file, content}));
}

async function writeConfigFiles() {
  return (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
    writeFile(Path.resolve(getRootDir(), 'dist', file),
      '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
  });
}

async function installWorkspace(ws: WorkspaceState) {
  const dir = Path.resolve(getRootDir(), ws.id);
  // tslint:disable-next-line: no-console
  console.log('Install dependencies in ' + dir);
  const symlinksInModuleDir = [] as {content: string, link: string}[];

  const target = Path.resolve(dir, 'node_modules');
  if (!fs.existsSync(target)) {
    fs.mkdirpSync(target);
  }

  // if (ws.linkedDependencies.length + ws.linkedDevDependencies.length > 0) {
    // Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
    // backup them for late recovery
  await listModuleSymlinks(target, link => {
    const linkContent = fs.readlinkSync(link);
    symlinksInModuleDir.push({content: linkContent, link});
    return unlinkAsync(link);
  });
  // _cleanActions.addWorkspaceFile(links);

  // 3. Run `npm install`
  const installJsonFile = Path.resolve(dir, 'package.json');
  // tslint:disable-next-line: no-console
  console.log('[init] write', installJsonFile);
  fs.writeFileSync(installJsonFile, ws.installJsonStr, 'utf8');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    await exe('npm', 'install', {cwd: dir}).promise;
    await exe('npm', 'dedupe', {cwd: dir}).promise;
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.log(e, e.stack);
  }
  // 4. Recover package.json and symlinks deleted in Step.1.
  fs.writeFile(installJsonFile, ws.originInstallJsonStr, 'utf8');
  await recoverSymlinks();
  // }

  function recoverSymlinks() {
    return Promise.all(symlinksInModuleDir.map(({content, link}) => {
      return _symlinkAsync(content, link, isWin32 ? 'junction' : 'dir');
    }));
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
  actionDispatcher._syncPackagesState(pkgList);
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
function* listInstalledComp4Workspace(state: PackagesState, workspaceKey: string) {
  const originInstallJson = state.workspaces.get(workspaceKey)!.originInstallJson;
  const depJson = process.env.NODE_ENV === 'production' ? [originInstallJson.dependencies] :
    [originInstallJson.dependencies, originInstallJson.devDependencies];
  for (const deps of depJson) {
    if (deps == null)
      continue;
    for (const dep of Object.keys(deps)) {
      if (!state.srcPackages.has(dep) && dep !== 'dr-comp-package') {
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
      `node node_modules/dr-comp-package/bin/drcp.js lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
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
