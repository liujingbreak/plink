// tslint:disable: no-console
import config from '../config';
import logConfig from '../log-config';
import {GlobalOptions} from './types';
import * as pkMgr from '../package-mgr';
import chalk from 'chalk';
import Path from 'path';
import * as _ from 'lodash';
import NodePackage from '../packageNodeInstance';
import {printWorkspaces/*, printWorkspaceHoistedDeps*/} from './cli-init';
import {take, map, distinctUntilChanged, skip} from 'rxjs/operators';
import {createCliTable} from '../utils/misc';

interface ComponentListItem {
  pk: NodePackage;
  desc: string;
}
export default async function list(opt: GlobalOptions & {json: boolean}) {
  await config.init(opt);
  logConfig(config());
  // const pmgr: typeof pkMgr = require('../package-mgr');

  const pkRunner = require('../../lib/packageMgr/packageRunner');

  if (opt.json)
    console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
  else
    console.log(listPackagesByProjects());

  const table = createCliTable({horizontalLines: false});
  table.push(
    [{colSpan: 2, hAlign: 'center', content: chalk.bold('SERVER COMPONENTS')}],
    [chalk.bold('Package'), chalk.bold('Directory')],
    ['------', '-------']);

  const list: ComponentListItem[] = await pkRunner.listServerComponents();
  list.forEach(row => table.push([row.desc, chalk.blue(Path.relative(config().rootPath, row.pk.path))]));
  console.log(table.toString());
  printWorkspaces();
}

export async function checkDir(opt: GlobalOptions) {
  await config.init(opt);
  logConfig(config());
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
      ['Package name', 'version', 'Path'],
      ['------------', '-------', '----']);
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
      dep[pkName] = linkedPkgs.get(pkName)?.json.version;
    }
  }
  return all;
}
