#!/usr/bin/env node
/* eslint-disable no-console */
import './node-path';
// import checkNode from './utils/node-version-check';
import chalk from 'chalk';
import {initProcess, initAsChildProcess} from './utils/bootstrap-process';
import * as _cli from './cmd/cli';
import {forkFile} from './fork-for-preserve-symlink';
import {isMainThread, threadId} from 'worker_threads';

const startTime = new Date().getTime();

(async function run() {

  process.on('exit', () => {
    // eslint-disable-next-line no-console
    console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
      chalk.green(`Done in ${new Date().getTime() - startTime} ms`));
  });
  let storeSettingDispatcher: ReturnType<typeof initProcess> | undefined;
  if (process.send) {
    // current process is forked
    initAsChildProcess(true);
  } else {
    storeSettingDispatcher = initProcess();
  }
  if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
    if (storeSettingDispatcher)
      storeSettingDispatcher.changeActionOnExit('none');
    void forkFile('@wfh/plink/wfh/dist/cmd-bootstrap');
    return;
  }
  await new Promise(resolve => process.nextTick(resolve));

  return (require('./cmd/cli') as typeof _cli).createCommands(startTime);
})().catch(err => {
  console.log(err);
  process.exit(1);
});
