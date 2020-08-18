import { PayloadAction } from '@reduxjs/toolkit';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import { from, merge, of} from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, mergeMap,
  pluck, take, concatMap, skip, ignoreElements, scan } from 'rxjs/operators';
import { writeFile } from '../cmd/utils';
import config from '../config';
import { listCompDependency, PackageJsonInterf } from '../dependency-installer';
import { writeTsconfig4project, writeTsconfigForEachPackage } from '../editor-helper';
import logConfig from '../log-config';
import { findAllPackages } from '../package-utils';
import { spawn } from '../process-utils';
// import { createProjectSymlink } from '../project-dir';
import { exe } from '../process-utils';
import { eachRecipeSrc, setProjectList as setProjectForRecipe } from '../recipe-manager';
import { stateFactory } from '../store';
import { getRootDir, isDrcpSymlink } from '../utils';
import { ofPayloadAction } from '../utils/redux-store';
import cleanInvalidSymlinks, { isWin32, scanNodeModulesForSymlinks, unlinkAsync, _symlinkAsync } from '../utils/symlinks';
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
  srcPackages: {[name: string]: PackageInfo};
  // _srcPackagesChecksum: number;
  workspaces: {[dir: string]: WorkspaceState};
  project2Packages: {[prj: string]: string[]};
  linkedDrcp: PackageInfo | null;
  gitIgnores: {[file: string]: string};
  errors: string[];
}

const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;

const state: PackagesState = {
  workspaces: {},
  project2Packages: {},
  srcPackages: {},
  errors: [],
  gitIgnores: {},
  linkedDrcp: isDrcpSymlink ?
    createPackageInfo(Path.resolve(getRootDir(), 'node_modules/dr-comp-package/package.json')) : null
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
    _syncPackagesState(d, {payload}: PayloadAction<PackageInfo[]>) {
      d.srcPackages = {};
      for (const pkInfo of payload) {
        d.srcPackages[pkInfo.name] = pkInfo;
      }
    },
    _updatePackageState(d, {payload}: PayloadAction<any[]>) {
      for (const json of payload) {
        d.srcPackages[json.name].json = json;
      }
    },
    addProject(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathToProjKey(rawDir);
        if (!_.has(d.project2Packages, dir)) {
          d.project2Packages[dir] = [];
        }
      }
    },
    deleteProject(d, action: PayloadAction<string[]>) {
      for (const rawDir of action.payload) {
        const dir = pathToProjKey(rawDir);
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
    },
    _associatePackageToPrj(d, {payload: {prj, pkgs}}: PayloadAction<{prj: string; pkgs: PackageInfo[]}>) {
      d.project2Packages[prj] = pkgs.map(pkgs => pkgs.name);
    },
    _updateGitIgnores(d, {payload}: PayloadAction<{file: string, content: string}>) {
      d.gitIgnores[payload.file] = payload.content;
    }
  }
});

export const actionDispatcher = stateFactory.bindActionCreators(slice);

// export type ActionsType = typeof actions extends Promise<infer T> ? T : unknown;

const readFileAsync = promisify<string, string, string>(fs.readFile);
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
stateFactory.addEpic((action$, state$) => {
  return merge(
    getStore().pipe(map(s => s.project2Packages),
      distinctUntilChanged(),
      map(pks => {
        setProjectForRecipe(getProjectList());
      }),
      ignoreElements()
    ),

    //  initWorkspace
    action$.pipe(ofPayloadAction(slice.actions.initWorkspace),
      switchMap(({payload: {dir, opt}}) => {
        dir = Path.resolve(dir);

        const hoistOnPackageChanges = getStore().pipe(
          distinctUntilChanged((s1, s2) => s1.srcPackages === s2.srcPackages),
          skip(1), take(1),
          map(() => actionDispatcher._hoistWorkspaceDeps({dir}))
        );

        if (_.size(getState()!.srcPackages) === 0) {
          return merge(hoistOnPackageChanges, of(slice.actions.initRootDir()));
        } else {
          logConfig(config());
          if (opt.force) {
            actionDispatcher._change(d => {
              // console.log('********* clean up')
              // d.workspaces[dir] = {};
              d.workspaces[dir].installJsonStr = ''; // clean so that it will be changed after _hoistWorkspaceDeps
            });
          }
          updateLinkedPackageState();
          return hoistOnPackageChanges;
        }
      }),
      ignoreElements()
    ),

    // initRootDir
    action$.pipe(ofPayloadAction(slice.actions.initRootDir),
      switchMap(() => {
        return from(initRootDirectory());
      }),
      ignoreElements()
    ),

    action$.pipe(ofPayloadAction(slice.actions._hoistWorkspaceDeps),
      concatMap(({payload}) => {
        const srcPackages = getState().srcPackages!;
        const ws = getState().workspaces[payload.dir];
        const pks = [
          ...ws.linkedDependencies.map(([name, ver]) => srcPackages[name]),
          ...ws.linkedDevDependencies.map(([name, ver]) => srcPackages[name])
        ];
        if (getState().linkedDrcp) {
          const drcp = getState().linkedDrcp!.name;
          const spaceJson = getState().workspaces[payload.dir].originInstallJson;
          if (spaceJson.dependencies && spaceJson.dependencies[drcp] ||
            spaceJson.devDependencies && spaceJson.devDependencies[drcp]) {
            pks.push(getState().linkedDrcp!);
          }
        }
        return from(writeTsconfigForEachPackage(payload.dir, pks,
          (file, content) => actionDispatcher._updateGitIgnores({file, content})));
      }),
      ignoreElements()
    ),
    // Handle newly added workspace
    getStore().pipe(
      map(s => s.workspaces), distinctUntilChanged(),
      map(ws => Object.keys(ws)),
      scan<string[]>((prev, curr) => {
        if (prev.length < curr.length) {
          const newAdded = _.difference(curr, prev);
          // tslint:disable-next-line: no-console
          console.log('New workspace: ', newAdded);
          for (const dir of newAdded) {
            actionDispatcher._installWorkspace({dir});
          }
        }
        return curr;
      }),
      ignoreElements()
    ),
    action$.pipe(ofPayloadAction(slice.actions._installWorkspace),
      mergeMap(action => getStore().pipe(
        map(s => s.workspaces[action.payload.dir]), distinctUntilChanged(),
        filter(ws => ws != null)
      )),
      concatMap(ws => from(installWorkspace(ws))),
      ignoreElements()
    ),
    ...Object.keys(getState().workspaces).map(dir => {
      return getStore().pipe(
        map(s => s.workspaces[dir].installJsonStr),
        distinctUntilChanged(),
        filter(installJsonStr =>installJsonStr.length > 0),
        skip(1), take(1),
        map(() => {
          // console.log('+++++++++++ emit action', dir);
          return actionDispatcher._installWorkspace({dir});
        }),
        ignoreElements()
      );
    }),
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
      const deps: string[] = recipeDir ?
        Object.keys(require(Path.resolve(recipeDir, 'package.json')).dependencies) : [];
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

async function updateLinkedPackageState() {
  const jsonStrs = await Promise.all(
    Object.entries(getState().srcPackages || [])
    .map(([name, pkInfo]) => {
      return readFileAsync(Path.resolve(pkInfo.realPath, 'package.json'), 'utf8');
    })
  );

  warnUselessSymlink();
  actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
}

function warnUselessSymlink() {
  const srcPackages = getState().srcPackages;
  const nodeModule = Path.resolve(getRootDir(), 'node_modules');
  const drcpName = getState().linkedDrcp ? getState().linkedDrcp!.name : null;
  return scanNodeModulesForSymlinks(getRootDir(), async link => {
    const pkgName = Path.relative(nodeModule, link).replace(/\\/g, '/');
    if ( drcpName !== pkgName && srcPackages[pkgName] == null) {
      // tslint:disable-next-line: no-console
      console.log(chalk.yellow(`Extraneous symlink: ${link}`));
    }
  });
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

  logConfig(config());

  const projectDirs = await getStore().pipe(
    pluck('project2Packages'), distinctUntilChanged(),
    map(project2Packages => Object.keys(project2Packages).map(dir => Path.resolve(dir))),
    take(1)
  ).toPromise();

  projectDirs.forEach(prjdir => {
    _writeGitHook(prjdir);
    maybeCopyTemplate(Path.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
  });

  await _scanPackageAndLink();
  warnUselessSymlink();

  await (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
    writeFile(Path.resolve(rootPath, 'dist', file),
      '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
  });

  // createProjectSymlink();
  writeTsconfig4project(getProjectList(), (file, content) => actionDispatcher._updateGitIgnores({file, content}));
}

async function installWorkspace(ws: WorkspaceState) {
  // tslint:disable-next-line: no-console
  console.log('Install dependencies in ' + ws.dir);
  const symlinksInModuleDir = [] as {content: string, link: string}[];

  const target = Path.resolve(ws.dir, 'node_modules');
  if (!fs.existsSync(target)) {
    fs.mkdirpSync(target);
  }

  if (ws.linkedDependencies.length + ws.linkedDevDependencies.length > 0) {
    // Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
    // backup them for late recovery
    await scanNodeModulesForSymlinks(ws.dir, link => {
      const linkContent = fs.readlinkSync(link);
      symlinksInModuleDir.push({content: linkContent, link});
      return unlinkAsync(link);
    });
    // _cleanActions.addWorkspaceFile(links);

    // 3. Run `npm install`
    const installJsonFile = Path.resolve(ws.dir, 'package.json');
    // tslint:disable-next-line: no-console
    console.log('[init] write', installJsonFile);

    fs.writeFile(installJsonFile, ws.installJsonStr, 'utf8');
    try {
      await exe('npm', 'install', {cwd: ws.dir}).promise;
      await exe('npm', 'dedupe', {cwd: ws.dir}).promise;
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

async function _scanPackageAndLink() {
  const rm = (await import('../recipe-manager'));

  const projPkgMap: {[proj: string]: PackageInfo[]} = {};
  await rm.linkComponentsAsync((proj, pkgJsonFile) => {
    if (projPkgMap[proj] == null)
      projPkgMap[proj] = [];
    const info = createPackageInfo(pkgJsonFile);
    projPkgMap[proj].push(info);
  });
  const pkgList: PackageInfo[] = [];
  for (const [prj, pkgs] of Object.entries(projPkgMap)) {
    actionDispatcher._associatePackageToPrj({prj, pkgs});
    pkgList.push(...pkgs);
  }
  actionDispatcher._syncPackagesState(pkgList);
}

function createPackageInfo(pkJsonFile: string): PackageInfo {
  const json = JSON.parse(fs.readFileSync(pkJsonFile, 'utf8'));
  const m = moduleNameReg.exec(json.name);
  const pkInfo: PackageInfo = {
    shortName: m![2],
    name: json.name,
    scope: m![1],
    path: Path.dirname(pkJsonFile),
    json,
    realPath: fs.realpathSync(Path.dirname(pkJsonFile))
  };
  return pkInfo;
}

// async function scanDirForNodeModules(packageDirs: string[], workspaceDir: string) {
//   // const workspaceNm = Path.resolve(workspaceDir, 'node_modules');
//   const nmDirs = await Promise.all(packageDirs.map(async dir => {
//     const nm = Path.resolve(dir, 'node_modules');
//     try {
//       // await symlinkAsync(workspaceNm, nm);
//     } catch (err) {
//       console.error(chalk.red('[scanDirForNodeModules]'), err);
//     }
//     return nm;
//   }));
//   return nmDirs;
//   // console.log(nmDirs.join('\n'));
// }

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

function pathOfRootPath(path: string) {
  const relPath = Path.relative(getRootDir(), path);
  return relPath.startsWith('..') ? Path.resolve(path) : relPath;
}

export function pathToProjKey(path: string) {
  return pathOfRootPath(path);
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
