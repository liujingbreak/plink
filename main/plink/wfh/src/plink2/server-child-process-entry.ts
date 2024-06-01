import util from 'node:util';
import {isMainThread, threadId} from 'worker_threads';
import * as rx from 'rxjs';
import chalk from 'chalk';
import {ReactorComposite2, serializeAction, deserializeAction2} from '@wfh/reactivizer';
import {initProcess} from '../utils/bootstrap-process';
import {parseCommand} from '../cmd/cli';
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
      deserializeAction2((msg as {content: any}).content, service.i);
      return;
    }
  });
  process.env.__plinkLogMainPid = process.pid + '';
  initProcess('save');
  process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
      chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
  });
}

const inputTableFor = ['setRootDir'] as const;
const outputTableFor = ['onCommanderInited'] as const;
export const service = new ReactorComposite2<CmdChildProcessInput, CmdChildProcessEvents, typeof inputTableFor, typeof outputTableFor>({
  name: 'server-child-process-entry',
  debug: false,
  inputTableFor,
  outputTableFor,
  log(msg, ...objs) {
    // const [, logger] = service.inputTable.getData().setRootDir;
    // if (logger) {
    //   logger(msg, ...objs);
    // } else {
    // eslint-disable-next-line no-console
    console.log(msg, ...objs.map(it => util.inspect(it, false, 0)));
    // }
  }
});

const {i, o, r, outputTable} = service;

const rootDir$ = (process.send ?
  rx.of(process.cwd()) :
  service.inputTable.l.setRootDir.pipe(
    rx.map(([, dir]) => dir)
  ));

r('setRootDir? -> onCommanderInited', rootDir$.pipe(
  rx.mergeMap(dir => defineCommand(dir, () => o.ft.onShutdown().dp())),
  rx.tap(program => o.ft.onCommanderInited(program).dp())
));

r('cmdModelService.enableRxMessageTrace ->', cmdModelService.inputTable.l.enableRxMessageTrace.pipe(
  rx.distinctUntilChanged(([, a], [, b]) => a === b),
  rx.map(([, enabled]) => {
    service.config({debug: enabled});
  })
));

r('doCommand -> onCommandDone', i.pt.doCommand.pipe(
  rx.mergeMap((a) => outputTable.l.onCommanderInited.pipe(
    rx.map(([, commander]) => [...a, commander] as const),
    rx.take(1)
  )),
  rx.mergeMap(async ([m, cols, rows, cwd, cmd, commander]) => {
    setupTTY(cols, rows);
    if (process.cwd() !== cwd) {
      process.chdir(cwd);
      workDirChangedByCli(cmd);
    }
    try {
      await parseCommand(commander, cmd);
      o.ft.onCommandDone().dp(m);
    } catch (err) {
      o.ft.onCommandError(util.inspect(err)).dp(m);
      service.dispatchErrorFor(err, m);
    }
  })
));

if (process.send) {
  r('events should be lifted to parent process', rx.merge(
    o.at.onCommandError, o.at.onCommandDone, o.at.onReady, o.at.onShutdown, o.at.__onError
  ).pipe(
    rx.map(a => process.send!({
      type: 'rx:message',
      content: serializeAction(a)
    }))
  ));
}

r('onShutdown', o.pt.onShutdown.pipe(
  rx.map(() => setImmediate(() => service.dispose()))
));

if (process.send)
  o.ft.onReady().dp({i: Number(process.argv[2])});
