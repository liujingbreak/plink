#!/usr/bin/env node
/* eslint-disable no-console */
import './node-path';
// import checkNode from './utils/node-version-check';
import chalk from 'chalk';
import {initProcess, initAsChildProcess} from './utils/bootstrap-process';
import * as _cli from './cmd/cli';
import {fork} from 'child_process';
import {plinkEnv} from './utils/misc';
import Path from 'path';

const startTime = new Date().getTime();

process.on('exit', () => {
  // eslint-disable-next-line no-console
  console.log(chalk.green(`Done in ${new Date().getTime() - startTime} ms`));
});

(async function run() {
  if (process.send) {
    // current process is forked
    initAsChildProcess(true);
  } else {
    initProcess();
  }
  await new Promise(resolve => process.nextTick(resolve));
  const argv = process.argv.slice(2);
  const foundCmdOptIdx = argv.findIndex(arg => arg === '--cwd');
  if (foundCmdOptIdx >= 0) {
    const workdir = Path.resolve(plinkEnv.rootDir, argv[foundCmdOptIdx + 1]);
    if (workdir) {
      const pkgMgr = (await import('./package-mgr/index'));
      if (pkgMgr.getState().workspaces.has(pkgMgr.workspaceKey(workdir))) {
        const newArgv = argv.concat();
        newArgv.splice(foundCmdOptIdx, 2);
        fork(__filename, newArgv, {cwd: workdir});
        return;
      }
    }
    console.log(chalk.yellow(workdir + ' is not an existing worktree space'));
  }
  return (require('./cmd/cli') as typeof _cli).createCommands(startTime);
})().catch(err => {
  console.log(err);
  process.exit(1);
});
