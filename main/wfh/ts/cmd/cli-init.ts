// tslint:disable: no-console max-line-length
import chalk from 'chalk';
import Path from 'path';
import { distinctUntilChanged, map, take, skip } from 'rxjs/operators';
import config from '../config';
import { actionDispatcher as actions, getState, getStore } from '../package-mgr';
import { packages4Workspace } from '../package-utils';
import { getRootDir } from '../utils/misc';
import { listProject } from './cli-project';
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
        `\n${chalk.greenBright('Linked packages')}\n` +
        paks.map(pk => {
          const width = pk.name.length + pk.json.version.length + 1;
          return `  ${chalk.cyan(pk.name)}@${chalk.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
            ` ${Path.relative(cwd, pk.realPath)}`;
        }).join('\n')
      );
      printWorkspaces();
    })
  ).toPromise();

  if (workspace) {
    actions.updateWorkspace({dir: workspace, isForce: opt.force});
  } else {
    actions.initRootDir({isForce: opt.force});
    setImmediate(() => listProject());
  }
  // setImmediate(() => printWorkspaces());
}

export function printWorkspaces() {
  console.log('\n' + chalk.greenBright('Workspace directories and linked dependencies:'));
  for (const reldir of getState().workspaces.keys()) {
    console.log(reldir ? reldir + '/' : '(root directory)');
    console.log('  |- dependencies');
    for (const {name: dep, json: {version: ver}, isInstalled} of packages4Workspace(Path.resolve(getRootDir(), reldir))) {
      console.log(`  |  |- ${dep}  v${ver}  ${isInstalled ? '' : '(linked)'}`);
    }
    console.log('');
  }
}
