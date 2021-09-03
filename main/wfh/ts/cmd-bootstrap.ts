#!/usr/bin/env node
/* eslint-disable no-console */
import './node-path';
// import checkNode from './utils/node-version-check';
import chalk from 'chalk';
import {initProcess, initAsChildProcess} from './utils/bootstrap-process';
import * as _cli from './cmd/cli';
import {plinkEnv} from './utils/misc';
import Path from 'path';
import {forkFile} from './fork-for-preserve-symlink';

const startTime = new Date().getTime();

process.on('exit', () => {
  // eslint-disable-next-line no-console
  console.log(chalk.green(`Done in ${new Date().getTime() - startTime} ms`));
});

(async function run() {
  let argv = process.argv.slice(2);

  const foundCmdOptIdx = argv.findIndex(arg => arg === '--cwd');
  const workdir = foundCmdOptIdx >= 0 ? Path.resolve(plinkEnv.rootDir, argv[foundCmdOptIdx + 1]) : null;
  if (workdir) {
    process.argv.splice(foundCmdOptIdx, 2);
  }
  if (process.env.NODE_PRESERVE_SYMLINKS !== '1' || workdir) {
    forkFile('@wfh/plink/wfh/dist/cmd-bootstrap', workdir || process.cwd());
    return;
  }

  if (process.send) {
    // current process is forked
    initAsChildProcess(true);
  } else {
    initProcess();
  }
  await new Promise(resolve => process.nextTick(resolve));

  return (require('./cmd/cli') as typeof _cli).createCommands(startTime);
})().catch(err => {
  console.log(err);
  process.exit(1);
});
