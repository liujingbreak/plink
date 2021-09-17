import commander from 'commander';
import {GlobalOptions, initConfig, initProcess, initAsChildProcess} from './index';
import * as _runner from './package-runner';
import logConfig from './log-config';
import {withGlobalOptions} from './cmd/override-commander';
import {forkFile} from './fork-for-preserve-symlink';
import {isMainThread, threadId} from 'worker_threads';
import chalk from 'chalk';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

const exit$ = new rx.BehaviorSubject<null | 'start' | 'done'>(null);
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
      chalk.green(`${code !== 0 ? 'Failed' : 'Done'}`));
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
    const setting = initConfig(program.opts() as GlobalOptions);
    logConfig(setting());
    const {runServer} = require('./package-runner') as typeof _runner;
    shutdown = runServer().shutdown;

    exit$.pipe(
      op.filter(action => action === 'start'),
      op.concatMap(() => shutdown()),
      op.tap(() => {
        exit$.next('done');
        exit$.complete();
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

