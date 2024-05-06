import util from 'node:util';
import {isMainThread, threadId} from 'worker_threads';
import * as rx from 'rxjs';
import chalk from 'chalk';
import {ReactorComposite2, serializeAction, deserializeAction2} from '@wfh/reactivizer';
import {initProcess} from '../utils/bootstrap-process';
import {defineCommander, parseCommand} from '../cmd/cli';
import {workDirChangedByCli} from '../fork-for-preserve-symlink';
import {CmdEntryChildProcessInput, CmdEntryChildProcessEvents, outputTableForCmdEntryProcEvents as outputTableFor} from './cmd.types';
import {setupTTY} from './process-common';

const startTime = new Date().getTime();
process.env.__plinkLogMainPid = process.pid + '';
initProcess('save');
process.on('exit', (code) => {
  // eslint-disable-next-line no-console
  console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
    chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
});

const service = new ReactorComposite2<CmdEntryChildProcessInput, CmdEntryChildProcessEvents, [], typeof outputTableFor>({
  name: 'cmd-child-process',
  debug: true,
  outputTableFor
});

const {i, o, r, outputTable} = service;
r('init commander', rx.from(defineCommander(() => {
  o.ft.onShutdown().dp();
  setImmediate(() => {
    o.ft.onShutdown().dp();
    setImmediate(() => {
      service.dispose();
      process.exit();
    });
  });
})).pipe(
  rx.tap(program => o.ft.onCommanderInited(program).dp())
));

r('doCommand -> onCommandDone', i.pt.doCommand.pipe(
  rx.mergeMap((a) => outputTable.l.onCommanderInited.pipe(
    rx.map(([, commander]) => [...a, commander] as const),
    rx.take(1)
  )),
  rx.mergeMap(async ([m, cols, rows, cwd, cmd, commander]) => {
    setupTTY(cols, rows);
    process.chdir(cwd);
    workDirChangedByCli(cmd);
    try {
      await parseCommand(commander, cmd);
      o.ft.onCommandDone().dp(m);
    } catch (err) {
      o.ft.onCommandError(util.inspect(err)).dp(m);
    }
  })
));

r('events should be lifted to parent process', rx.merge(
  o.at.onCommandError, o.at.onCommandDone, o.at.onReady, o.at.onShutdown, o.at._onErrorFor
).pipe(
  rx.map(a => process.send!({
    type: 'rx:message',
    content: serializeAction(a)
  }))
));

o.ft.onReady().dp({i: Number(process.argv[2])});

process.on('message', (msg: any) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (msg.type === 'rx:message') {
    deserializeAction2((msg as {content: any}).content, service.i);
    return;
  }
});

