import Path from 'path';
import {fork} from 'child_process';
// import log4js from 'log4js';
// const log = log4js.getLogger('plink.fork-for-preserver-symlink');

export function forkFile(file: string, cwd: string) {
  let argv = process.argv.slice(2);
  const foundDebugOptIdx = argv.findIndex(arg => arg === '--inspect' || arg === '--inspect-brk');
  const debugOptIdx = argv.findIndex(arg => arg === '--debug');

  const env: {[key: string]: string} = {...process.env, NODE_PRESERVE_SYMLINKS: '1'};
  if (foundDebugOptIdx >= 0) {
    env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' ' + argv[foundDebugOptIdx] : argv[foundDebugOptIdx];
    argv.splice(foundDebugOptIdx, 1);
  }
  if (debugOptIdx >= 0) {
    env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' --inspect-brk' : '--inspect-brk';
    argv.splice(debugOptIdx, 1);
  }
  fork(Path.resolve(__dirname, 'fork-preserve-symlink-main.js'), argv, {
    env: {...env, __plink_fork_main: file, __plink_save_state: '1'},
    cwd,
    stdio: 'inherit'
  });
  // cp.send({
  //   type: '__plink_save_state'
  // }, (err) => {
  //   if (err) {
  //     console.error('Failed to send msg of __plink_save_state enablement to child process', err);
  //   }
  // });

  // cp.on('message', (msg) => {
  //   if (store.isStateSyncMsg(msg)) {
  //     console.log('Recieve state sync message from forked process');
  //     store.stateFactory.actionsToDispatch.next({type: '::syncState', payload(state: any) {
  //       return eval('(' + msg.data + ')');
  //     }});
  //   }
  // });

  return;
}
