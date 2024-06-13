import util from 'node:util';
import {isMainThread, threadId} from 'worker_threads';
import * as rx from 'rxjs';
import chalk from 'chalk';
import {BaseActions, serializeAction, deserializeAction2, SimplexReactor, RxController2} from '@wfh/reactivizer';
// import {initProcess} from '../utils/bootstrap-process';
import {workDirChangedByCli} from '../fork-for-preserve-symlink';
import {cmdModelService} from './cmd-model';
import {define as defineCommand} from './cmd-definition';
import {CmdChildProcessInput, CmdChildProcessEvents} from './cmd.types';
import {setupTTY} from './process-common';
// import inspector from 'inspector';
// inspector.open(9222);

const startTime = new Date().getTime();

if (process.send) {
  process.on('message', (msg: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (msg.type === 'rx:message') {
      deserializeAction2((msg as {content: any}).content, service.s);
      return;
    }
  });
  process.env.__plinkLogMainPid = process.pid + '';
  // initProcess('save');
  process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
      chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
  });
}

const tableFor = ['setRootDir', 'onCommanderInited'] as const;
export const service = new SimplexReactor<CmdChildProcessInput & CmdChildProcessEvents, typeof tableFor>({
  name: 'server-child-process-entry',
  debug: true,
  tableFor,
  log(msg, ...objs) {
    // eslint-disable-next-line no-console
    console.log(msg, ...objs.map(it => util.inspect(it, false, 0)));
  }
});

const {s, r, table} = service;

const rootDir$ = (process.send ?
  rx.of(process.cwd()) :
  service.table.l.setRootDir.pipe(
    rx.map(([, dir]) => dir)
  ));

r('setRootDir? -> onCommanderInited', rootDir$.pipe(
  rx.mergeMap(dir => defineCommand(dir, () => s.ft.onShutdown().dp())),
  rx.tap(program => s.ft.onCommanderInited(program).dp())
));

r('cmdModelService.enableRxMessageTrace ->', cmdModelService.inputTable.l.enableRxMessageTrace.pipe(
  rx.distinctUntilChanged(([, a], [, b]) => a === b),
  rx.map(([, enabled]) => {
    service.config({debug: enabled});
  })
));

r('doCommand -> onCommandDone', s.pt.doCommand.pipe(
  rx.mergeMap((a) => table.l.onCommanderInited.pipe(
    rx.map(([, commander]) => [...a, commander] as const),
    rx.take(1)
  )),
  rx.mergeMap(async ([m, cols, rows, cwd, cmd, commander]) => {
    setupTTY(cols, rows);
    if (process.cwd() !== cwd) {
      process.chdir(cwd);
      workDirChangedByCli(cmd);
    }
    const exit = process.exit;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      process.exit = (() => {
        throw new Error('cmd-help');
      }) as any; // commander's help() will invoke process.exit(), I have to void this happends
      await commander.parseAsync(cmd, {from: 'user'});
      s.ft.onCommandDone().dp(m);
    } catch (err) {
      if (err.message === 'cmd-help') {
        s.ft.onCommandDone().dp(m);
      } else {
        s.ft.onCommandError(util.inspect(err)).dp(m);
        service.dispatchErrorFor(err, m);
      }
    } finally {
      process.exit = exit;
    }
  })
));

if (process.send) {
  r('events should be lifted to parent process', rx.merge(
    s.at.onCommandError, s.at.onCommandDone, s.at.onReady, s.at.onShutdown, (s as unknown as RxController2<BaseActions>).at.__onError
  ).pipe(
    rx.map(a => process.send!({
      type: 'rx:message',
      content: serializeAction(a)
    }))
  ));
}

r('onShutdown', s.pt.onShutdown.pipe(
  rx.map(() => setImmediate(() => service.dispose()))
));

if (process.send)
  s.ft.onReady().dp({i: Number(process.argv[2])});
