#!/usr/bin/env node
/* tslint:disable:no-console */
import './node-path';
// import checkNode from './utils/node-version-check';
import chalk from 'chalk';

// debugger;

const startTime = new Date().getTime();
process.on('SIGINT', function() {
  console.log('Recieve SIGINT, bye...');
  process.exit(0);
});
process.on('message', function(msg) {
  if (msg === 'shutdown') {
    console.log('Recieve shutdown message from PM2, bye.');
    process.exit(0);
  }
});

process.on('exit', () => {
  // tslint:disable-next-line: no-console
  console.log(chalk.green(`Done in ${new Date().getTime() - startTime} ms`));
});

(async function run() {
  // await checkNode();
  (await import('./cmd/cli')).drcpCommand(startTime);
})().catch(err => {
  console.log(err);
  process.exit(1);
});
