import Path from 'path';
import {fork} from 'child_process';
import fs from 'fs';
import os from 'os';
import log4js from 'log4js';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {plinkEnv} from './utils/misc';
import * as _editorHelper from './editor-helper';
import * as bootstrapProc from './utils/bootstrap-process';
import * as wrapper from './fork-module-wrapper';
import * as store from './store';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      __plinkLogMainPid: string | undefined;
      // __plink_fork_main?: string;
    }
  }
}

export const isWin32 = os.platform().indexOf('win32') >= 0;
const log = log4js.getLogger('plink.fork-for-preserver-symlink');

export function workDirChangedByCli() {
  const argv = process.argv.slice(2);
  const foundCmdOptIdx =  argv.findIndex(arg => arg === '--cwd' || arg === '--space');
  const workdir = foundCmdOptIdx >= 0 ? Path.resolve(plinkEnv.rootDir,  argv[foundCmdOptIdx + 1]) : null;
  if (workdir) {
    argv.splice(foundCmdOptIdx, 2);
    // process.env.PLINK_WORK_DIR = workdir;
  }
  return {workdir, argv};
}

export default function run(
  moduleName: string,
  opts?: {
    stateExitAction?: 'save' | 'send' | 'none';
    handleShutdownMsg?: boolean;
  }) {

  if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
    void forkFile(moduleName, opts?.handleShutdownMsg != null ? opts.handleShutdownMsg : false, opts || {});
    return;
  }
  // In case it is already under "preserve-symlinks" mode
  const {workdir} = workDirChangedByCli();
  const {runModule} = require('./fork-module-wrapper') as typeof wrapper;
  const file = resolveTargetModule(moduleName, workdir || process.env.PLINK_WORK_DIR || process.cwd());
  runModule(file, opts?.stateExitAction);
}

/** run in main process, mayby in PM2 as a cluster process */
async function forkFile(
  moduleName: string,
  broadcastShutdown: boolean,
  opts: {
    stateExitAction?: 'save' | 'send' | 'none';
    handleShutdownMsg?: boolean;
  }) {
  let recovered = false;
  const {initProcess, exitHooks} = require('./utils/bootstrap-process') as typeof bootstrapProc;
  const {stateFactory} = require('./store') as typeof store;

  exitHooks.push(() => {
    recoverNodeModuleSymlink();
  });
  process.env.__plinkLogMainPid = '-1';
  initProcess('none');

  // removeNodeModuleSymlink needs Editor-helper, and editor-helper needs store being configured!
  stateFactory.configureStore();
  const removed = await removeNodeModuleSymlink();

  const {workdir, argv} = workDirChangedByCli();

  // process.execArgv.push('--preserve-symlinks-main', '--preserve-symlinks');
  const foundDebugOptIdx = argv.findIndex(arg => arg === '--inspect' || arg === '--inspect-brk');

  const env: NodeJS.ProcessEnv = process.env;
  if (foundDebugOptIdx >= 0) {
    env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' ' + argv[foundDebugOptIdx] : argv[foundDebugOptIdx];
    argv.splice(foundDebugOptIdx, 1);
  }
  const debugOptIdx = argv.findIndex(arg => arg === '--debug');
  if (debugOptIdx >= 0) {
    env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' --inspect-brk' : '--inspect-brk';
    argv.splice(debugOptIdx, 1);
  }

  // env.__plink_fork_main = moduleName;

  if (workdir)
    env.PLINK_WORK_DIR = workdir;

  const file = resolveTargetModule(moduleName, workdir || process.env.PLINK_WORK_DIR || process.cwd());
  const cp = fork(Path.resolve(plinkEnv.rootDir, 'node_modules/@wfh/plink/wfh/dist/fork-module-wrapper.js'), argv, {
    execArgv: process.execArgv.concat(['--preserve-symlinks-main', '--preserve-symlinks']),
    stdio: 'inherit'
  });
  cp.send(JSON.stringify({type: 'plink-fork-wrapper', opts, moduleFile: file}));

  if (broadcastShutdown) {
    const processMsg$ = rx.fromEventPattern<string>(h => process.on('message', h), h => process.off('message', h));

    processMsg$.pipe(
      op.filter(msg => msg === 'shutdown'),
      op.take(1),
      op.tap(() => {
        cp.send('shutdown');
      })
    ).subscribe();
  }

  const onChildExit$ = new rx.ReplaySubject<number>();
  cp.once('exit', code => {
    // if (code !== 0) {
    // console.log('child process exits:', code);
    // }
    onChildExit$.next(code || 0);
    onChildExit$.complete();
  });
  exitHooks.push(() => onChildExit$);

  function recoverNodeModuleSymlink() {
    if (recovered)
      return;
    recovered = true;

    for (const {link, content} of removed) {
      if (!fs.existsSync(link)) {
        void fs.promises.symlink(content, link, isWin32 ? 'junction' : 'dir');
        log.info('recover ' + link);
      }
    }
  }
}

/**
 * Temporarily rename <pkg>/node_modules to another name
 * @returns
 */
async function removeNodeModuleSymlink() {
  const {getState} = require('./editor-helper') as typeof _editorHelper;
  const links = getState().nodeModuleSymlinks;
  if (links == null)
    return Promise.resolve([]);

  const dones = Array.from(links.values()).map(async link => {
    let stat: fs.Stats | undefined;
    try {
      stat = await fs.promises.lstat(link);
      if (!stat.isSymbolicLink())
        return null;
    } catch (ex) {
      return null;
    }

    const content = fs.readlinkSync(link);
    await fs.promises.unlink(link);
    return {link, content};
  });
  const res = await Promise.all(dones);
  return res.filter(item => item != null) as {link: string; content: string}[];
}

/**
 *
 * @param tModule module name like "@foo/bar/dist/index.js", "@foo/bar/dist/index"
 * @param workDir 
 * @returns complete resolved path like "/Users/superhero/project/server-space/node_modules/@foo/bar/dist/index.js"
 */
function resolveTargetModule(tModule: string, workDir: string) {
  if (!Path.extname(tModule)) {
    tModule += '.js';
  }
  const root = Path.parse(workDir).root;
  let dir = workDir;
  let target: string;
  for (;;) {
    target = Path.resolve(dir, 'node_modules', tModule);
    if (fs.existsSync(target))
      break;
    else {
      if (dir === root) {
        throw new Error('Can not require module ' + tModule + ' from directory ' + workDir);
      }
      dir = Path.dirname(dir);
    }
  }
  return target;
}

