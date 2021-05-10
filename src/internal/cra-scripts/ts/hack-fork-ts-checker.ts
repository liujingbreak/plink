/**
 * Hack fork-ts-checker-webpack-plugin:
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */

import Path from 'path';
import * as _plink from '@wfh/plink/wfh/dist';

export function register() {
  process.env.NODE_OPTIONS =  (process.env.NODE_OPTIONS || '') + ' -r ' +
    Path.resolve(__filename);
}

if (process.send && /[\\\/]fork-ts-checker-webpack-plugin[\\\/]/.test(process.argv[1])) {
  // Current process is a child process forked by fork-ts-checker-webpack-plugin
  require('@wfh/plink/wfh/dist/node-path');
  const plink: typeof _plink = require('@wfh/plink/wfh/dist');
  plink.initAsChildProcess();
  const setting = plink.initConfig(JSON.parse(process.env.PLINK_CLI_OPTS!));
  plink.logConfig(setting());
  require('./hack-fork-ts-checker-worker');
}

