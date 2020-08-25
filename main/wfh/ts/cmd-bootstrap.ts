#!/usr/bin/env node
/* tslint:disable:no-console */
require('source-map-support/register');
import checkNode from './utils/node-version-check';
import setupNodePath from './node-path';

process.on('SIGINT', function() {
  console.log('Recieve SIGINT, bye.');
  process.exit(0);
});
process.on('message', function(msg) {
  if (msg === 'shutdown') {
    console.log('Recieve shutdown message from PM2, bye.');
    process.exit(0);
  }
});

(async function run() {
  await checkNode();
  const startTime = new Date().getTime();
  await processCmd();


  async function processCmd() {
    setupNodePath();
    (await import('./cmd/cli')).drcpCommand(startTime);
  }
})().catch(err => {
  console.log(err);
  process.exit(1);
});
