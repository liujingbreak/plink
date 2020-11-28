// tslint:disable: no-console max-line-length
import chalk from 'chalk';
import Path from 'path';
import {merge} from 'rxjs';
import { distinctUntilChanged, map, take, skip, scan } from 'rxjs/operators';
import config from '../config';
import { actionDispatcher as actions, getState, getStore, WorkspaceState} from '../package-mgr';
import { packages4Workspace } from '../package-utils';
import { getRootDir } from '../utils/misc';
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
        table.push([chalk.cyan(pk.name), chalk.green(pk.json.version), chalk.gray(Path.relative(cwd, pk.realPath))]);
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
    actions.updateWorkspace({dir: workspace, isForce: opt.force});
  } else {
    actions.initRootDir({isForce: opt.force});
    setImmediate(() => listProject());
  }
  // setImmediate(() => printWorkspaces());
}

export function printWorkspaces() {
  const table = createCliTable({
    horizontalLines: false,
    colAligns: ['right', 'right']
  });
  table.push([{colSpan: 4, content: chalk.bold('Worktree Space directories and linked dependencies\n'), hAlign: 'center'}],
    ['Worktree Space', 'Dependency package', 'Version', 'state'].map(item => chalk.bold(item)),
    ['--------------', '------------------', '-------', '-----']);

  for (const reldir of getState().workspaces.keys()) {
    let i = 0;
    for (const {name: dep, json: {version: ver}, isInstalled} of packages4Workspace(Path.resolve(getRootDir(), reldir))) {
      table.push([i === 0 ? chalk.cyan(reldir ? `  ${reldir}/` : '  (root directory)') : '', dep, ver, isInstalled ? '' : chalk.gray('linked')]);
      i++;
    }
  }
  console.log(table.toString());
}

function printWorkspaceHoistedDeps(workspace: WorkspaceState) {
  console.log(chalk.bold(`\nHoisted production dependency and corresponding dependents (${workspace.id})`));
  const table = createTable();
  table.push(['Dependency', 'Dependent'].map(item => chalk.bold(item)),
    ['---', '---']);
  for (const [dep, dependents] of workspace.hoistInfo!.entries()) {
    table.push(renderHoistDepInfo(dep, dependents));
  }
  console.log(table.toString());
  if (workspace.hoistDevInfo.size > 0) {
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk.bold(item)),
    ['---', '---']);
    console.log(chalk.bold(`\nHoisted dev dependency and corresponding dependents (${workspace.id})`));
    for (const [dep, dependents] of workspace.hoistDevInfo!.entries()) {
      table.push(renderHoistDepInfo(dep, dependents));
    }
    console.log(table.toString());
  }
  if (workspace.hoistPeerDepInfo.size > 0) {
    console.log(chalk.yellowBright(`\nMissing Peer Dependencies for production (${workspace.id})`));
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk.bold(item)),
    ['---', '---']);
    for (const [dep, dependents] of workspace.hoistPeerDepInfo!.entries()) {
      table.push(renderHoistPeerDepInfo(dep, dependents));
    }
    console.log(table.toString());
  }
  if (workspace.hoistDevPeerDepInfo.size > 0) {
    console.log(chalk.yellowBright(`\nMissing Peer Dependencies for dev (${workspace.id})`));
    const table = createTable();
    table.push(['Dependency', 'Dependent'].map(item => chalk.bold(item)),
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
  return [dependents.sameVer ? dep : chalk.bgRed(dep), dependents.by.map(item => `${chalk.cyan(item.ver)}: ${chalk.grey(item.name)}`).join('\n')];
}
function renderHoistPeerDepInfo(dep: string, dependents: WorkspaceState['hoistInfo'] extends Map<string, infer T> ? T : unknown) {
  return [dependents.sameVer ? chalk.yellow(dep) : chalk.red(dep),
    dependents.by.map(item => `${chalk.cyan(item.ver)}: ${chalk.grey(item.name)}`).join('\n')];
}
