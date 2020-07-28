import { PayloadAction } from '@reduxjs/toolkit';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { from, merge, concat, of, forkJoin} from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, mergeMap,
  pluck, take, concatMap, skip, ignoreElements, scan } from 'rxjs/operators';
import { writeFile } from '../cmd/utils';
import config from '../config';
import { listCompDependency, PackageJsonInterf } from '../dependency-installer';
import { writeTsconfig4Editor } from '../editor-helper';
import logConfig from '../log-config';
import { findAllPackages } from '../package-utils';
import { spawn } from '../process-utils';
// import { createProjectSymlink } from '../project-dir';
import { exe } from '../process-utils';
import { eachRecipeSrc, setProjectList as setProjectForRecipe } from '../recipe-manager';
import { stateFactory } from '../store';
import { getRootDir, isDrcpSymlink } from '../utils';
import { ofPayloadAction } from '../utils/redux-store';
import cleanInvalidSymlinks, { isWin32, scanNodeModulesForSymlinks,
  symlinkAsync, unlinkAsync, _symlinkAsync } from '../utils/symlinks';
import * as cmdOpt from '../cmd/types';
import { actions as _cleanActions } from '../cmd/cli-clean';
import {promisify} from 'util';

const {green: col1, cyan} = require('chalk');

// const isDrcpSymlink = fs.lstatSync(Path.resolve('node_modules/dr-comp-package')).isSymbolicLink();
export interface PackageInfo {
  name: string;
  scope: string;
  shortName: string;
  json: any;
  path: string;
  realPath: string;
}

export interface PackagesState {
  seq: number;
  srcPackages?: {[name: string]: PackageInfo};
  workspaces: {[dir: string]: WorkspaceState};
  project2Packages: {[prj: string]: string[]};
}

const NS = 'packages';


const state: PackagesState = {
  seq: 1,
  workspaces: {},
  project2Packages: {}
};

interface WorkspaceState {
  dir: string;
  originInstallJson: PackageJsonInterf;
  originInstallJsonStr: string;
  installJson: PackageJsonInterf;
  installJsonStr: string;
  /** names of those symlink packages */
  linkedDependencies: [string, string][];
  // /** names of those symlink packages */
  linkedDevDependencies: [string, string][];
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
    initRootDir(d, action: PayloadAction<{hoistedDir: string} | undefined | null>) {
    },
    initWorkspace(d, action: PayloadAction<{dir: string, opt: cmdOpt.InitCmdOptions}>) {
    },
    _syncPackagesState(d, {payload}: PayloadAction<{packageJsonFiles: string[]}>) {
      d.srcPackages = {};
      for (const pk of payload.packageJsonFiles) {
        const json = JSON.parse(fs.readFileSync(pk, 'utf8'));
        const m = moduleNameReg.exec(json.name);
        const pkInfo: PackageInfo = {
          shortName: m![1],
          name: json.name,
          scope: m![0],
          path: Path.dirname(pk),
          json,
          realPath: fs.realpathSync(Path.dirname(pk))
        };
        d.srcPackages[pkInfo.name] = pkInfo;
      }
    },
    _checkPackages() {
    },
    _updatePackageState(d, {payload}: PayloadAction<any[]>) {
      for (const json of payload) {
        d.srcPackages![json.name].json = json;
      }
    },
    addProject(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathOfRootPath(rawDir);
        if (!_.has(d.project2Packages, dir)) {
          d.project2Packages[dir] = [];
        }
      }
    },
    deleteProject(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathOfRootPath(rawDir);
        delete d.project2Packages[dir];
      }
    },
    _hoistWorkspaceDeps(state, {payload: {dir}}: PayloadAction<{dir: string}>) {
      if (state.srcPackages == null) {
        throw new Error('"srcPackages" is null, need to run `init` command first');
      }
      dir = Path.resolve(dir);

      const pkjsonStr = fs.readFileSync(Path.resolve(dir, 'package.json'), 'utf8');
      const pkjson: PackageJsonInterf = JSON.parse(pkjsonStr);
      // for (const deps of [pkjson.dependencies, pkjson.devDependencies] as {[name: string]: string}[] ) {
      //   Object.entries(deps);
      // }

      const deps = Object.entries<string>(pkjson.dependencies || {});

      const updatingDeps = {...pkjson.dependencies || {}};
      const linkedDependencies: typeof deps = [];
      deps.filter(dep => {
        if (_.has(state.srcPackages, dep[0])) {
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
        if (_.has(state.srcPackages, dep[0])) {
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

      const hoistedDeps = listCompDependency(
        linkedDependencies.map(entry => state.srcPackages![entry[0]].json),
        dir, updatingDeps
      );

      const hoistedDevDeps = listCompDependency(
        linkedDevDependencies.map(entry => state.srcPackages![entry[0]].json),
        dir, updatingDevDeps
      );

      const installJson: PackageJsonInterf = {
        ...pkjson,
        dependencies: {...hoistedDeps},
        devDependencies: {...hoistedDevDeps}
      };

      const wp: WorkspaceState = {
        dir,
        originInstallJson: pkjson,
        originInstallJsonStr: pkjsonStr,
        installJson,
        installJsonStr: JSON.stringify(installJson, null, '  '),
        linkedDependencies,
        linkedDevDependencies
        // dependencies,
        // devDependencies,
        // hoistedDeps,
        // hoistedDevDeps
      };
      state.workspaces[dir] = wp;
      // console.log('-----------------', dir);
    },
    _installWorkspace(state, {payload: {dir}}: PayloadAction<{dir: string}>) {
    }
  }
});

export const actionDispatcher = stateFactory.bindActionCreators(slice);

// export type ActionsType = typeof actions extends Promise<infer T> ? T : unknown;

const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const readFileAsync = promisify<string, string, string>(fs.readFile);
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
stateFactory.addEpic((action$, state$) => {

  // Handle newly added workspace
  getStore().pipe(
    map(s => s.workspaces), distinctUntilChanged(),
    map(ws => Object.keys(ws)),
    scan((prev, curr) => {
      if (prev.length < curr.length) {
        const newAdded = _.difference(curr, prev);
        // tslint:disable-next-line: no-console
        console.log('New workspace: ', newAdded);
        for (const dir of newAdded)
          stateFactory.dispatch(slice.actions._installWorkspace({dir}));
      }
      return curr;
    })
  ).subscribe();

  return merge(
    getStore().pipe(
      map(s => s.project2Packages), distinctUntilChanged(),
      map(pks => {
        setProjectForRecipe(getProjectList());
      }),
      ignoreElements()
    ),
    //  initWorkspace
    action$.pipe(ofPayloadAction(slice.actions.initWorkspace),
      switchMap(({payload: {dir, opt}}) => {
        dir = Path.resolve(dir);

        let scanLinkPackageDirDone = false;
        const doHoistLater = getStore().pipe(
          map(s => s.srcPackages), distinctUntilChanged(),
          concatMap((packages) => {
            if (!scanLinkPackageDirDone && packages != null) {
              scanLinkPackageDirDone = true;
              return from(scanDirForNodeModules(Object.values(packages).map(pk => pk.realPath), dir))
              .pipe(map(() => packages));
            }
            return of(packages);
          }),
          skip(1), take(1),
          map(() => slice.actions._hoistWorkspaceDeps({dir}))
        );
        if (_.size(getState()!.srcPackages) === 0) {
          return merge(doHoistLater, of(slice.actions.initRootDir()));
        } else if (opt.force && getState().workspaces[dir]) {
          logConfig(config());
          return merge(doHoistLater, of(
            slice.actions._change(d => {
              d.workspaces[dir].installJsonStr = ''; // clean so that it will be changed after _hoistWorkspaceDeps
            }),
            slice.actions._checkPackages()
          ));
        } else {
          logConfig(config());
          return merge(doHoistLater, of(slice.actions._checkPackages()));
        }
      })
    ),

    action$.pipe(ofPayloadAction(slice.actions._checkPackages),
      mergeMap(() => {
        return forkJoin(Object.entries(getState().srcPackages || [])
          .map(([name, pkInfo]) => {
            return from(readFileAsync(Path.resolve(pkInfo.realPath, 'package.json'), 'utf8'));
          }));
      }),
      map(jsonStrs => {
        actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
      }),
      ignoreElements()
    ),

    // initRootDir
    action$.pipe(ofPayloadAction(slice.actions.initRootDir),
      switchMap(() => {
        return from(initRootDirectory());
      })
    ),
    // In case any workspace's installJsonStr is changed, do _installWorkspace
    getStore().pipe(
      map(s => s.workspaces), distinctUntilChanged(),
      // distinctUntilChanged((s1, s2) => {
      //   const keys1 = Object.keys(s1);
      //   const keys2 = Object.keys(s2);
      //   return keys1.length === keys2.length && keys1.every(key => s2[key] != null);
      // }),
      map(workspaces => Object.keys(workspaces)),
      filter(dirs => dirs.length > 0),
      take(1),
      switchMap(dirs => concat(...dirs.map(dir => getStore()
        .pipe(
          map(s => s.workspaces[dir]),
          distinctUntilChanged((s1, s2) => s1.installJsonStr === s2.installJsonStr),
          skip(1),// skip initial value, only react for changing value event
          filter(s => s.installJsonStr.length > 0),
          map(ws => slice.actions._installWorkspace({dir: ws.dir}))
        )
      )))
    ),
    // action$.pipe(ofPayloadAction(slice.actions._syncPackagesState),
    //   switchMap(() => {
    //     const srcPackages = getState()!.srcPackages;
    //     if (srcPackages != null) {
    //       return from(Object.keys(getState()!.workspaces));
    //     }
    //     return from([]);
    //   }),
    //   map(workspace => slice.actions._hoistWorkspaceDeps({dir: workspace}))
    // ),
    action$.pipe(
      ofPayloadAction(slice.actions._installWorkspace),
      mergeMap(action => getStore().pipe(
        map(s => s.workspaces[action.payload.dir]), distinctUntilChanged(),
        filter(ws => ws != null)
      )),
      concatMap(ws => from(installWorkspace(ws))),
      ignoreElements()
    )

    // getStore().pipe(
    // map(s => s.project2Packages), distinctUntilChanged(),
    // take(2), takeLast(1),
    // map(() => slice.actions.initWorkspace({dir: ''}))
  );
});

export function getState() {
  return stateFactory.sliceState(slice);
}

export function getStore() {
  return stateFactory.sliceStore(slice);
}
// import PackageNodeInstance from '../packageNodeInstance';

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
  return Object.keys(getState()!.project2Packages).map(pj => Path.resolve(getRootDir(), pj));
}

export function listPackagesByProjects() {
  let out = '';
  for (const prj of getProjectList()) {
    out += col1(`Project: ${prj}`) + '\n';
    eachRecipeSrc(prj, (srcDir, recipeDir) => {
      const relDir = Path.relative(prj, srcDir) || '/';
      out += `  ${col1('|-')} ${cyan(relDir)}\n`;
      const deps: string[] = Object.keys(require(Path.resolve(recipeDir, 'package.json')).dependencies);
      deps.forEach(name => out += `  ${col1('|')}  ${ col1('|-')} ${name}\n`);
    });
    out += '\n';
  }
  // out += '\nInstalled:\n';
  // eachInstalledRecipe((recipeDir) => {
  //   out += `${recipeDir}\n`;
  // });
  return out;
}

const cwd = process.cwd();

async function initRootDirectory() {
  const rootPath = cwd;
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

  logConfig(config());
  const action = await _initDependency();

  await (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
    writeFile(Path.resolve(rootPath || process.cwd(), 'dist', file),
      '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
  });

  // createProjectSymlink();
  writeTsconfig4Editor(getProjectList());
  return action;
}

async function installWorkspace(ws: WorkspaceState) {
  // tslint:disable-next-line: no-console
  console.log('Install dependencies in ' + ws.dir);
  const symlinksInModuleDir = [] as {content: string, link: string}[];

  const target = Path.resolve(ws.dir, 'node_modules');
  if (!fs.existsSync(target)) {
    fs.mkdirpSync(target);
  }
  // 1. create symlink `node_modules` under every linked component package's realPath
  const links = await Promise.all([...ws.linkedDependencies, ...ws.linkedDevDependencies]
    .map(async ([dep]) => {
      const dir = getState().srcPackages![dep].realPath;
      const link = Path.resolve(dir, 'node_modules');
      await symlinkAsync(target, link);
      return link;
      // return link;
    }));

  if (links.length > 0) {
    // 2. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
    // backup them for late recovery
    await scanNodeModulesForSymlinks(ws.dir, link => {
      const linkContent = fs.readlinkSync(link);
      symlinksInModuleDir.push({content: linkContent, link});
      return unlinkAsync(link);
    });
    _cleanActions.addWorkspaceFile(links);

    // 3. Run `npm install`
    const installJsonFile = Path.resolve(ws.dir, 'package.json');
    // tslint:disable-next-line: no-console
    console.log('[init] write', installJsonFile);

    fs.writeFile(installJsonFile, ws.installJsonStr, 'utf8');
    try {
      await exe('npm', 'install', {cwd: ws.dir}).promise;
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log(e, e.stack);
    }
    // 4. Recover package.json and symlinks deleted in Step.1.
    fs.writeFile(installJsonFile, ws.originInstallJsonStr, 'utf8');
    await recoverSymlinks();
  }

  function recoverSymlinks() {
    return Promise.all(symlinksInModuleDir.map(({content, link}) => {
      return _symlinkAsync(content, link, isWin32 ? 'junction' : 'dir');
    }));
  }
}

async function _initDependency() {
  const rm = (await import('../recipe-manager'));

  // const listCompDependency = await (await import('../dependency-installer')).listCompDependency;
  const projectDirs = await getStore().pipe(
    pluck('project2Packages'), distinctUntilChanged(),
    map(project2Packages => Object.keys(project2Packages).map(dir => Path.resolve(dir))),
    take(1)
  ).toPromise();

  projectDirs.forEach(prjdir => {
    _writeGitHook(prjdir);
    maybeCopyTemplate(Path.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
  });
  let pkJsonFiles = await rm.linkComponentsAsync();
  // pkJsonFiles.push(...projectDirs.filter(dir => dir !== cwd)
  //     .map(dir => Path.join(dir, 'package.json'))
  //     .filter(file => fs.existsSync(file)));
  pkJsonFiles = _.uniq(pkJsonFiles);
  return slice.actions._syncPackagesState({packageJsonFiles: pkJsonFiles});
  // const needRunInstall = listCompDependency(pkJsonFiles, true);
  // return needRunInstall;
}

async function scanDirForNodeModules(packageDirs: string[], workspaceDir: string) {
  // const workspaceNm = Path.resolve(workspaceDir, 'node_modules');
  const nmDirs = await Promise.all(packageDirs.map(async dir => {
    const nm = Path.resolve(dir, 'node_modules');
    try {
      // await symlinkAsync(workspaceNm, nm);
    } catch (err) {
      console.error(chalk.red('[scanDirForNodeModules]'), err);
    }
    return nm;
  }));
  return nmDirs;
  // console.log(nmDirs.join('\n'));
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
    to = Path.relative(cwd, to);
  // tslint:disable-next-line: no-console
  console.log('copy to %s', chalk.cyan(to));
}

function maybeCopyTemplate(from: string, to: string) {
  if (!fs.existsSync(Path.resolve(cwd, to)))
    cp(Path.resolve(__dirname, from), to);
}

function pathOfRootPath(path: string) {
  const relPath = Path.relative(getRootDir(), path);
  return relPath.startsWith('..') ? Path.resolve(path) : relPath;
}

function _writeGitHook(project: string) {
  // if (!isWin32) {
  const gitPath = Path.resolve(project, '.git/hooks');
  if (fs.existsSync(gitPath)) {
    const hookStr = '#!/bin/sh\n' +
      `cd "${cwd}"\n` +
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
