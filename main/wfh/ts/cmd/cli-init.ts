// tslint:disable: no-console max-line-length
import chalk from 'chalk';
import { distinctUntilChanged, map, take, takeLast } from 'rxjs/operators';
import config from '../config';
import Path from 'path';
// import logConfig from '../log-config';
import { actionDispatcher as actions, getStore, getState } from '../package-mgr';
import * as options from './types';

export default async function(opt: options.InitCmdOptions, workspace?: string) {
  await config.init(opt);

  const done = getStore().pipe(
    map(s => s.srcPackages),
    distinctUntilChanged(),
    take(2),
    takeLast(1),
    map(srcPackages => {
      console.log(
        ' *** Linked packages ***\n\n' +
        Object.values(srcPackages!).map(pk => `${chalk.cyan(pk.name)}@${chalk.green(pk.json.version)}  (${pk.realPath})` ).join('\n')
      );
    })
  ).toPromise();

  if (workspace) {
    actions.initWorkspace({dir: workspace, opt});
  } else {
    actions.initRootDir(null);
  }
  await done;
  printWorkspaces();
}

export function printWorkspaces() {
  console.log('\n' + chalk.greenBright('Workspace directories and linked dependencies:'));
  for (const [dir, ws] of Object.entries(getState().workspaces)) {
    const reldir = Path.relative(process.cwd(), dir);
    console.log(reldir ? reldir + '/' : '(root directory)');
    console.log('  |- dependencies');
    if (ws.linkedDependencies.length === 0)
      console.log('  |    (Empty)');
    for (const [dep, ver] of ws.linkedDependencies) {
      console.log(`  |  |- ${dep} ${ver}`);
    }
    console.log('  |');
    console.log('  |- devDependencies');
    if (ws.linkedDevDependencies.length === 0)
      console.log('       (Empty)');
    for (const [dep, ver] of ws.linkedDevDependencies) {
      console.log(`     |- ${dep} ${ver}`);
    }
    console.log('');
  }
}
