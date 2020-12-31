// tslint:disable: no-console max-line-length
import chalk from 'chalk';
import Path from 'path';
import {merge} from 'rxjs';
import { distinctUntilChanged, map, take, skip, scan } from 'rxjs/operators';
import config from '../config';
import { actionDispatcher as actions, getState, getStore, WorkspaceState} from '../package-mgr';
import { packages4WorkspaceKey } from '../package-utils';
// import { getRootDir } from '../utils/misc';
import { listProject } from './cli-project';
import _ from 'lodash';
import * as options from './types';
import {createCliTable} from '../utils/misc';

export default async function(opt: options.InitCmdOptions, workspace?: string) {
  await config.init(opt);
  const cwd = process.cwd();
  getStore().pipe(
    distinctUntilChanged((s1, s2) => s1.workspaceUpdateChecksum === s2.workspaceUpdateChecksum),
    skip(1), take(1),
    map(s => s.srcPackages),
    map(srcPackages => {
      const paks = Array.from(srcPackages.values());

      const table = createCliTable({
        horizontalLines: false,
        colAligns: ['right', 'left']
      });
      table.push([{colSpan: 3, content: 'Linked packages', hAlign: 'center'}]);
      table.push(['Package name', 'Version', 'Path'],
                 ['------------', '-------', '----']);
      for (const pk of paks) {
        table.push([pk.name, pk.json.version, chalk.gray(Path.relative(cwd, pk.realPath))]);
      }
      console.log(table.toString());
      printWorkspaces();
    })
  ).subscribe();

  const existingWsKeys = getState().workspaces;

  // print newly added workspace hoisted dependency information
  getStore().pipe(map(s => s.lastCreatedWorkspace),
    distinctUntilChanged(),
    scan((prev, curr) => {
      if (curr && !existingWsKeys.has(curr)) {
        printWorkspaceHoistedDeps(getState().workspaces.get(curr)!);
      }
      return curr;
    })
  ).subscribe();

  // print existing workspace CHANGED hoisted dependency information
  merge(...Array.from(getState().workspaces.keys()).map(wsKey => getStore().pipe(
    map(s => s.workspaces),
    distinctUntilChanged(),
    map(s => s.get(wsKey)),
    distinctUntilChanged((s1, s2) => s1!.hoistInfo === s2!.hoistInfo && s1!.hoistPeerDepInfo === s2!.hoistPeerDepInfo),
    scan((wsOld, wsNew) => {
      // console.log('*****************', wsKey);
      printWorkspaceHoistedDeps(wsNew!);
      return wsNew;
    })
  ))).subscribe();

  if (workspace) {
    actions.updateWorkspace({dir: workspace, isForce: opt.force, createHook: opt.lintHook});
  } else {
    actions.initRootDir({isForce: opt.force, createHook: opt.lintHook});
    setImmediate(() => listProject());
  }
  // setImmediate(() => printWorkspaces());
}

export function printWorkspaces() {
  const table = createCliTable({
    horizontalLines: false,
    colAligns: ['right', 'right']
  });
  const sep = ['--------------', '------------------', '------------', '----------', '-----'];
  table.push([{colSpan: 5, content: chalk.underline('Worktree Space and linked dependencies\n'), hAlign: 'center'}],
    ['Worktree Space', 'Dependency package', 'Expected version', 'Actual version', 'state'].map(item => chalk.underline(item)),
    sep);

  let wsIdx = 0;
  for (const reldir of getState().workspaces.keys()) {
    if (wsIdx > 0) {
      table.push(sep);
    }

    let i = 0;
    const pkJson = getState().workspaces.get(reldir)!.originInstallJson;
    // console.log(pkJson);

    for (const {name: dep, json: {version: ver}, isInstalled} of packages4WorkspaceKey(reldir)) {
      const expectedVer = convertVersion(pkJson, dep);
      const same = expectedVer === ver;
      table.push([
        i === 0 ? chalk.cyan(reldir ? `  ${reldir}/` : '  (root directory)') : '',
        same ? dep : chalk.red(dep),
        same ? expectedVer : chalk.bgRed(expectedVer),
        ver,
        isInstalled ? '' : chalk.gray('linked')
      ]);
      i++;
    }
    wsIdx++;
  }
  console.log(table.toString());
}

function convertVersion(pkgJson: {
  dependencies?: {[k: string]: string},
  devDependencies?: {[k: string]: string}
}, depName: string) {
  let ver = pkgJson.dependencies ? pkgJson.dependencies[depName] : null;
  if (ver == null && pkgJson.devDependencies) {
    ver = pkgJson.devDependencies[depName];
  }
  if (ver == null) {
    return '';
  }
  if (ver.startsWith('.') || ver.startsWith('file:')) {
    const m = /\-(\d+(?:\.\d+){1,2}(?:\-[^\-])?)\.tgz$/.exec(ver);
    if (m) {
      return m[1];
    }
  }
  return ver;
}

export function printWorkspaceHoistedDeps(workspace: WorkspaceState) {
  console.log(chalk.bold(`\nHoisted Transitive Dependency & Dependents (${workspace.id})`));
  const table = createTable();
  table.push(['Dependency', 'Dependent'].map(item => chalk.underline(item)),
    ['---', '---']);
  for (const [dep, dependents] of workspace.hoistInfo!.entries()) {
    table.push(renderHoistDepInfo(dep, dependents));
  }
  console.log(table.toString());
  if (workspace.hoistDevInfo.size > 0) {
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk.underline(item)),
    ['---', '---']);
    console.log(chalk.bold(`\nHoisted Transitive (dev) Dependency & Dependents (${workspace.id})`));
    for (const [dep, dependents] of workspace.hoistDevInfo!.entries()) {
      table.push(renderHoistDepInfo(dep, dependents));
    }
    console.log(table.toString());
  }
  if (workspace.hoistPeerDepInfo.size > 0) {
    console.log(chalk.bold(`Hoisted Transitive Peer Dependencies (${workspace.id})`));
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk.underline(item)),
    ['---', '---']);
    for (const [dep, dependents] of workspace.hoistPeerDepInfo!.entries()) {
      table.push(renderHoistPeerDepInfo(dep, dependents));
    }
    console.log(table.toString());
  }
  if (workspace.hoistDevPeerDepInfo.size > 0) {
    console.log(chalk.yellowBright(`\nHoisted Transitive Peer Dependencies (dev) (${workspace.id})`));
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk.underline(item)),
    ['---', '---']);
    for (const [dep, dependents] of workspace.hoistDevPeerDepInfo!.entries()) {
      table.push(renderHoistPeerDepInfo(dep, dependents));
    }
    console.log(table.toString());
  }
}

function createTable() {
  const table = createCliTable({
    horizontalLines: false,
    // style: {head: []},
    colAligns: ['right', 'left']
  });
  return table;
}

function renderHoistDepInfo(dep: string, dependents: WorkspaceState['hoistInfo'] extends Map<string, infer T> ? T : unknown): string[] {
  return [
    dependents.sameVer ? dep : dependents.direct ? chalk.yellow(dep) : chalk.bgRed(dep),
    dependents.by.map((item, idx) =>
      `${dependents.direct && idx === 0 ? chalk.green(item.ver) : idx > 0 ? chalk.gray(item.ver) : chalk.cyan(item.ver)}: ${chalk.grey(item.name)}`
    ).join('\n')
  ];
}
function renderHoistPeerDepInfo(dep: string, dependents: WorkspaceState['hoistInfo'] extends Map<string, infer T> ? T : unknown) {
  return [
    dependents.missing ? chalk.bgYellow(dep) : (dependents.duplicatePeer ? dep : chalk.green(dep)),
    dependents.by.map((item, idx) =>
      `${dependents.direct && idx === 0 ? chalk.green(item.ver) : idx > 0 ? item.ver : chalk.cyan(item.ver)}: ${chalk.grey(item.name)}`
    ).join('\n')
  ];
}
