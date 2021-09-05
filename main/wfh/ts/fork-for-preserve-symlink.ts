import Path from 'path';
import {fork} from 'child_process';
import {plinkEnv} from './utils/misc';

// import log4js from 'log4js';
// const log = log4js.getLogger('plink.fork-for-preserver-symlink');

export function forkFile(file: string) {
  let argv = process.argv.slice(2);
  const foundCmdOptIdx =  argv.findIndex(arg => arg === '--cwd' || arg === '--space');
  const workdir = foundCmdOptIdx >= 0 ? Path.resolve(plinkEnv.rootDir,  argv[foundCmdOptIdx + 1]) : null;
  if (workdir) {
    argv.splice(foundCmdOptIdx, 2);
    process.env.PLINK_WORK_DIR = workdir;
  }

  process.execArgv.push('--preserve-symlinks-main', '--preserve-symlinks');
  const foundDebugOptIdx = argv.findIndex(arg => arg === '--inspect' || arg === '--inspect-brk');

  const env: {[key: string]: string | undefined} = {...process.env};
  if (foundDebugOptIdx >= 0) {
    env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' ' + argv[foundDebugOptIdx] : argv[foundDebugOptIdx];
    argv.splice(foundDebugOptIdx, 1);
  }
  const debugOptIdx = argv.findIndex(arg => arg === '--debug');
  if (debugOptIdx >= 0) {
    env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' --inspect-brk' : '--inspect-brk';
    argv.splice(debugOptIdx, 1);
  }

  fork(Path.resolve(__dirname, 'fork-preserve-symlink-main.js'), argv, {
    env: {...env, __plink_fork_main: file, __plink_save_state: '1'},
    stdio: 'inherit'
  });
  process.on('SIGINT', () => {
    // eslint-disable-next-line no-console
    console.log('bye');
    process.exit(0);
  });

  return;
}
