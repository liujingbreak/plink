#!/usr/bin/env node
/* tslint:disable:no-console */
import './node-path';
// import checkNode from './utils/node-version-check';
import chalk from 'chalk';
import {initProcess} from './utils/bootstrap-process';
import * as _cli from './cmd/cli';
// debugger;

const startTime = new Date().getTime();

process.on('exit', () => {
  // tslint:disable-next-line: no-console
  console.log(chalk.green(`Done in ${new Date().getTime() - startTime} ms`));
});

(async function run() {
  initProcess();
  (require('./cmd/cli') as typeof _cli).drcpCommand(startTime);
})().catch(err => {
  console.log(err);
  process.exit(1);
});
