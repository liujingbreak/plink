import {isMainThread, threadId} from 'worker_threads';
import commander from 'commander';
import chalk from 'chalk';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {forkFile} from './fork-for-preserve-symlink';
import {withGlobalOptions} from './cmd/override-commander';
import logConfig from './log-config';
import * as _runner from './package-runner';
import {initConfig, initProcess, initAsChildProcess} from './index';

export const exit$ = new rx.BehaviorSubject<null | 'start' | 'done'>(null);
/** Emitted function will be executed during server shutdown phase */
export const shutdownHooks: (() => (rx.ObservableInput<any> | void))[] = [];

// Subscribe to "done" event for being notified when app server is shutdown and all
// hooks are done execution
const exitDone$ = exit$.pipe(op.filter(action => action === 'done'), op.take(1));

let storeSettingDispatcher: ReturnType<typeof initProcess> | undefined;
if (process.send) {
  // current process is forked
  initAsChildProcess(true, () => {
    const done = exitDone$.toPromise();
    exit$.next('start');
    return done;
  });
} else {
  process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
      chalk.green(`${code !== 0 ? 'App server stopped with failures' : 'App server is shutdown'}`));
  });
  storeSettingDispatcher = initProcess(true, () => {
    const done = exitDone$.toPromise();
    exit$.next('start');
    return done;
  });
  storeSettingDispatcher.changeActionOnExit('none');
}

if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
  void forkFile('@wfh/plink/wfh/dist/app-server.js');
} else {
  const {version} = require('../../package.json') as {version: string};

  process.title = 'Plink - server';

  let shutdown: () => Promise<any>;

  const program = new commander.Command()
  .arguments('[args...]')
  .action((args: string[]) => {
    // eslint-disable-next-line no-console
    console.log('\nPlink version:', version);
    const setting = initConfig(program.opts());
    logConfig(setting());
    const {runServer} = require('./package-runner') as typeof _runner;
    shutdown = runServer().shutdown;

    exit$.pipe(
      op.filter(action => action === 'start'),
      op.take(1),
      op.concatMap(() => rx.from(shutdownHooks)),
      op.mergeMap(hookFn => {
        const result = hookFn();
        return result || rx.EMPTY;
      }),
      op.catchError(err => {
        console.error('Failed to execute shutdown hooks', err);
        return rx.EMPTY;
      }),
      op.count(),
      op.concatMap(async () => {
        await shutdown();
        exit$.next('done');
        exit$.complete();
        // eslint-disable-next-line no-console
        console.log('Packages are deactivated');
      })
    ).subscribe();
  });

  withGlobalOptions(program);

  program.parseAsync(process.argv)
  .catch((e: Error) => {
    console.error(e, e.stack);
    process.exit(1);
  });
}

