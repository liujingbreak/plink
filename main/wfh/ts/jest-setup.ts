import path from 'path';
import * as _bp from './utils/bootstrap-process';
import * as _pr from './package-runner';

export = function() {
  if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
    console.error('Node.js process must be executed with environment varaible NODE_PRESERVE_SYMLINKS=1');
    process.exit(1);
  }
  process.env.PLINK_WORK_DIR = path.resolve('react-space');

  const {initProcess, initAsChildProcess, initConfig} = require('./utils/bootstrap-process') as typeof _bp;
  const {initInjectorForNodePackages} = require('./package-runner') as typeof _pr;

  if (process.send) {
    initAsChildProcess('none');
  } else {
    initProcess('none');
  }
  initConfig({dev: true, verbose: true});
  initInjectorForNodePackages();
};
