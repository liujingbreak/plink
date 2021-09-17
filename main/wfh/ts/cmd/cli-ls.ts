/* eslint-disable no-console */
import config from '../config';
import {GlobalOptions} from './types';
import * as pkMgr from '../package-mgr';
// import {getRootDir} from '../utils/misc';
import {packages4WorkspaceKey} from '../package-mgr/package-list-helper';
import chalk from 'chalk';
import Path from 'path';
import * as _ from 'lodash';
import {printWorkspaces, printWorkspaceHoistedDeps} from './cli-init';
import {take, map, distinctUntilChanged, skip} from 'rxjs/operators';
import {createCliTable, plinkEnv} from '../utils/misc';
import * as priorityHelper from '../package-priority-helper';
import {isServerPackage, readPriorityProperty} from '../package-runner';
import {dispatcher as storeSettingDispatcher} from '../store';

export default async function list(opt: GlobalOptions & {json: boolean; hoist: boolean}) {
  if (opt.hoist) {
    for (const wsState of pkMgr.getState().workspaces.values()) {
      printWorkspaceHoistedDeps(wsState);
    }
  }
  if (opt.json)
    console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
  else
    console.log(listPackagesByProjects());

  const table = createCliTable({horizontalLines: false});
  table.push(
    [{colSpan: 3, hAlign: 'center', content: chalk.bold('SERVER PACKAGES')}],
    ['PACKAGE', 'PRIORITY', 'DIRECTORY'].map(item => chalk.gray(item)),
    ['------', '-------', '--------'].map(item => chalk.gray(item))
  );

  const list: ServerPackageView[] = await listServerPackages();
  list.forEach(row => table.push([
    row.name,
    row.priority,
    chalk.cyan(Path.relative(config().rootPath, row.dir))
  ]));
  console.log(table.toString());
  printWorkspaces();
}

export function checkDir(opt: GlobalOptions) {
  storeSettingDispatcher.changeActionOnExit('save');
  pkMgr.getStore().pipe(
    map(s => s.packagesUpdateChecksum), distinctUntilChanged(),
    skip(1), take(1),
    map((curr) => {
      console.log('Directory state is updated.');
      return curr;
    })
  ).subscribe();
  pkMgr.actionDispatcher.updateDir();
}

function listPackagesByProjects() {
  const cwd = process.cwd();
  const pmgr: typeof pkMgr = require('../package-mgr');
  const linkedPkgs = pmgr.getState().srcPackages;

  const table = createCliTable({horizontalLines: false, colAligns: ['right', 'left', 'left']});
  table.push([{colSpan: 3, content: chalk.bold('LINKED PACKAGES IN PROJECT\n'), hAlign: 'center'}]);
  for (const [prj, pkgNames] of pmgr.getState().project2Packages.entries()) {
    table.push([{
      colSpan: 3, hAlign: 'left',
      content: chalk.bold('Project: ') + (prj ? chalk.cyan(prj) : chalk.cyan('(root directory)'))}
    ],
      ['PACKAGE NAME', 'VERSION', 'PATH'].map(item => chalk.gray(item)),
      ['------------', '-------', '----'].map(item => chalk.gray(item))
    );
    const pkgs = pkgNames.map(name => linkedPkgs.get(name)!);
    for (const pk of pkgs) {
      table.push([
        chalk.cyan(pk.name),
        chalk.green(pk.json.version),
        Path.relative(cwd, pk.realPath)]);
    }
  }
  for (const [prj, pkgNames] of pmgr.getState().srcDir2Packages.entries()) {
    table.push([{
      colSpan: 3, hAlign: 'left',
      content: chalk.bold('Source directory: ') + (prj ? chalk.cyan(prj) : chalk.cyan('(root directory)'))}
    ],
      ['PACKAGE NAME', 'VERSION', 'PATH'].map(item => chalk.gray(item)),
      ['------------', '-------', '----'].map(item => chalk.gray(item))
    );
    const pkgs = pkgNames.map(name => linkedPkgs.get(name)!);
    for (const pk of pkgs) {
      table.push([
        chalk.cyan(pk.name),
        chalk.green(pk.json.version),
        Path.relative(cwd, pk.realPath)]);
    }
  }
  return table.toString();
}

function jsonOfLinkedPackageForProjects() {
  const all: {[prj: string]: {[key: string]: string}} = {};
  const linkedPkgs = pkMgr.getState().srcPackages;
  for (const [prj, pkgNames] of pkMgr.getState().project2Packages.entries()) {
    const dep: {[key: string]: string} = all[prj] = {};
    for (const pkName of pkgNames) {
      const pkg = linkedPkgs.get(pkName);
      if (pkg)
        dep[pkName] = pkg.json.version;
    }
  }
  return all;
}

interface ServerPackageView {
  name: string;
  priority: string;
  dir: string;
}

async function listServerPackages(): Promise<ServerPackageView[]> {
  let wsKey: string | null | undefined = pkMgr.workspaceKey(plinkEnv.workDir);
  wsKey = pkMgr.getState().workspaces.has(wsKey) ? wsKey : pkMgr.getState().currWorkspace;
  if (wsKey == null) {
    return [] as ServerPackageView[];
  }

  const pkgs = Array.from(packages4WorkspaceKey(wsKey, true))
  .filter(isServerPackage)
  .map(pkg => ({
    name: pkg.name,
    priority: readPriorityProperty(pkg.json)
  }));

  const list: Array<[string, string | number]> = [];

  await priorityHelper.orderPackages(pkgs, pk => {
    list.push([pk.name, pk.priority]);
  });
  const workspace = pkMgr.getState().workspaces.get(wsKey)!;
  return list.map(([name, pri]) => {
    const pkg = pkMgr.getState().srcPackages.get(name) || workspace.installedComponents!.get(name)!;
    return {
      name,
      priority: pri + '',
      dir: pkg.realPath
    };
  });
}
