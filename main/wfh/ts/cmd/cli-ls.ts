// tslint:disable: no-console
import config from '../config';
import logConfig from '../log-config';
import {GlobalOptions} from './types';
import * as pkMgr from '../package-mgr';
import chalk from 'chalk';
import Path from 'path';
import * as _ from 'lodash';
import NodePackage from '../packageNodeInstance';
import {printWorkspaces} from './cli-init';

interface ComponentListItem {
  pk: NodePackage;
  desc: string;
}
export default async function list(opt: GlobalOptions & {json: boolean}) {
  await config.init(opt);
  logConfig(config());
  const pmgr: typeof pkMgr = require('../package-mgr');

  const pkRunner = require('../../lib/packageMgr/packageRunner');

  console.log('==============[ LINKED PACKAGES IN PROJECT ]==============\n');
  if (opt.json)
    console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
  else
    console.log(pmgr.listPackagesByProjects());

  console.log('\n' + chalk.green(_.pad('[ SERVER COMPONENTS ]', 50, '=')) + '\n');

  let list: ComponentListItem[] = await pkRunner.listServerComponents();
  list.forEach(row => console.log(' ' + row.desc + '   ' + chalk.blue(Path.relative(config().rootPath, row.pk.path))));
  console.log('');
  console.log('\n' + chalk.green(_.pad('[ BUILDER COMPONENTS ]', 50, '=')) + '\n');

  list = await pkRunner.listBuilderComponents();
  list.forEach(row => console.log(' ' + row.desc + '   ' + chalk.blue(Path.relative(config().rootPath, row.pk.path))));

  printWorkspaces();
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
