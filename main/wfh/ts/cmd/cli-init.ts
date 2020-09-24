// tslint:disable: no-console max-line-length
import chalk from 'chalk';
import { distinctUntilChanged, map, take, takeLast } from 'rxjs/operators';
import config from '../config';
import Path from 'path';
import { actionDispatcher as actions, getStore, getState } from '../package-mgr';
import * as options from './types';
import {packages4Workspace} from '../package-utils';
export default async function(opt: options.InitCmdOptions, workspace?: string) {
  await config.init(opt);

  const cwd = process.cwd();
  getStore().pipe(
    map(s => s.srcPackages),
    distinctUntilChanged(),
    take(2),
    takeLast(1),
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
    actions.initWorkspace({dir: workspace, isForce: opt.force, logHasConfiged: false});
  } else {
    actions.initRootDir(null);
  }
}

export function printWorkspaces() {
  console.log('\n' + chalk.greenBright('Workspace directories and linked dependencies:'));
  for (const reldir of getState().workspaces.keys()) {
    console.log(reldir ? reldir + '/' : '(root directory)');
    console.log('  |- dependencies');
    for (const {name: dep, json: {version: ver}, isInstalled} of packages4Workspace(reldir)) {
      console.log(`  |  |- ${dep}  v${ver}  ${isInstalled ? '' : '(linked)'}`);
    }
    // if (ws.linkedDependencies.length === 0)
    //   console.log('  |    (Empty)');
    // for (const [dep, ver] of ws.linkedDependencies) {
    //   console.log(`  |  |- ${dep} ${ver}`);
    // }
    // console.log('  |');
    // console.log('  |- devDependencies');
    // if (ws.linkedDevDependencies.length === 0)
    //   console.log('       (Empty)');
    // for (const [dep, ver] of ws.linkedDevDependencies) {
    //   console.log(`     |- ${dep} ${ver}`);
    // }
    console.log('');
  }
}
