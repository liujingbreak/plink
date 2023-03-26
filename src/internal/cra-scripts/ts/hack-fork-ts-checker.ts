/**
 * Hack fork-ts-checker-webpack-plugin:
 *  - change ts.compilerHost.readFile()
 *  - change rootNames in parameters of ts.createProgram()
 *  - change compilerOptions.rootDir in parameters of ts.createProgram()
 */
// import Path from 'node:path';
import * as _plink from '@wfh/plink';
// import inspector from 'inspector';


export function register() {
  // process.env.NODE_OPTIONS =  (process.env.NODE_OPTIONS || '') + ' -r ' +
  //   Path.resolve(__filename); // + ' --inspect-brk';
}

// if (process.send && /[\\/]fork-ts-checker-webpack-plugin[\\/]/.test(process.argv[1])) {
//   // Current process is a child process forked by fork-ts-checker-webpack-plugin
//   require('@wfh/plink/wfh/dist/node-path');
//   const plink = require('@wfh/plink') as typeof _plink;

//   // inspector.open(9222, 'localhost', true);
//   plink.initAsChildProcess();
//   plink.initConfig(JSON.parse(process.env.PLINK_CLI_OPTS!));
//   plink.initInjectorForNodePackages();
//   // plink.logConfig(setting());
//   require('./hack-fork-ts-checker-worker');
// }

