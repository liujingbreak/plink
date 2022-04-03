#!/usr/bin/env node
/* eslint-disable no-console */
import './node-path';
// import checkNode from './utils/node-version-check';
import {isMainThread, threadId} from 'worker_threads';
import chalk from 'chalk';
import * as _cli from './cmd/cli';
import runWithPreserveSymlink from './fork-for-preserve-symlink';

const startTime = new Date().getTime();

runWithPreserveSymlink('@wfh/plink/wfh/dist/cmd-bootstrap', {
  stateExitAction: 'save',
  handleShutdownMsg: false
}, () => {

  process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
      chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
  });

  void (require('./cmd/cli') as typeof _cli).createCommands(startTime);
  return [];
});

