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

export default async function(opt: options.InitCmdOptions, workspace?: string) {
  await config.init(opt);
  const cwd = process.cwd();
  getStore().pipe(
    distinctUntilChanged((s1, s2) => s1.workspaceUpdateChecksum === s2.workspaceUpdateChecksum),
    skip(1), take(1),
    map(s => s.srcPackages),
    map(srcPackages => {
      const paks = Array.from(srcPackages.values());
      const maxWidth = paks.reduce((maxWidth, pk) => {
        const width = pk.name.length + pk.json.version.length + 1;
        return width > maxWidth ? width : maxWidth;
      }, 0);

      console.log(
        `\n${chalk.bold('\n[ Linked packages ]')}\n` +
        paks.map(pk => {
          const width = pk.name.length + pk.json.version.length + 1;
          return `  ${chalk.cyan(pk.name)}@${chalk.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
            ` ${chalk.gray(Path.relative(cwd, pk.realPath))}`;
        }).join('\n')
      );
      printWorkspaces();
    })
  ).subscribe();

  // print newly added workspace hoisted dependency information
  getStore().pipe(map(s => s._computed.workspaceKeys),
    distinctUntilChanged(),
    scan((prev, curr) => {
      const newlyAdded = _.difference(curr, prev);
      for (const key of newlyAdded) {
        printWorkspaceHoistedDeps(getState().workspaces.get(key)!);
      }
      return curr;
    })
  ).subscribe();

  // print existing workspace CHANGED hoisted dependency information
  merge(...Array.from(getState()._computed.workspaceKeys).map(wsKey => getStore().pipe(
    map(s => s.workspaces.get(wsKey)!),
    distinctUntilChanged((s1, s2) => s1.hoistInfo === s2.hoistInfo && s1.hoistPeerDepInfo === s2.hoistPeerDepInfo),
    scan((wsOld, wsNew) => {
      printWorkspaceHoistedDeps(wsNew);
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
  console.log('\n' + chalk.bold('\n[ Workspace directories and linked dependencies ]'));
  for (const reldir of getState().workspaces.keys()) {
    console.log(reldir ? `  ${reldir}/` : '  (root directory)');
    console.log('    |- dependencies');
    for (const {name: dep, json: {version: ver}, isInstalled} of packages4Workspace(Path.resolve(getRootDir(), reldir))) {
      console.log(`    |  |- ${dep}  v${ver}  ${isInstalled ? '' : chalk.gray('(linked)')}`);
    }
    console.log('');
  }
}

function printWorkspaceHoistedDeps(workspace: WorkspaceState) {
  console.log(chalk.bold(`\n[ Hoisted production dependency and corresponding dependents (${workspace.id}) ]`));
  for (const [dep, dependents] of workspace.hoistInfo!.entries()) {
    console.log('  ' + chalk.cyan(dep));
    console.log('    ' + dependents.by.map(item => `${dependents.sameVer ? item.ver : chalk.bgRed(item.ver)}: ${chalk.grey(item.name)}`).join(', '));
  }
  if (workspace.hoistDevInfo.size > 0) {
    console.log(chalk.bold(`\n[ Hoisted dev dependency and corresponding dependents (${workspace.id}) ]`));
    for (const [dep, dependents] of workspace.hoistDevInfo!.entries()) {
      console.log('  ' + chalk.cyan(dep));
      console.log('    ' + dependents.by.map(item => `${dependents.sameVer ? item.ver : chalk.bgRed(item.ver)}: ${chalk.grey(item.name)}`).join(', '));
    }
  }
  if (workspace.hoistPeerDepInfo.size > 0) {
    console.log(chalk.yellowBright('\n[Missing production Peer Dependencies]'));
    for (const [dep, dependents] of workspace.hoistPeerDepInfo!.entries()) {
      console.log('  ' + chalk.cyanBright(dep));
      console.log('    ' + dependents.by.map(item => `${item.ver}: ${chalk.grey(item.name)}`).join(', '));
    }
  }
  if (workspace.hoistDevPeerDepInfo.size > 0) {
    console.log(chalk.yellowBright('\n[Missing dev Peer Dependencies]'));
    for (const [dep, dependents] of workspace.hoistDevPeerDepInfo!.entries()) {
      console.log('  ' + chalk.cyanBright(dep));
      console.log('    ' + dependents.by.map(item => `${item.ver}: ${chalk.grey(item.name)}`).join(', '));
    }
  }
}
