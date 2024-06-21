import util from 'node:util';
import * as rx from 'rxjs';
import {SimplexReactor} from '@wfh/reactivizer';
import {formatToConciseNoColor} from '@wfh/reactivizer/dist/nodejs-utils';
// import {initProcess} from '../utils/bootstrap-process';
import {workDirChangedByCli} from '../fork-for-preserve-symlink';
import {cmdModelService} from './cmd-model';
import {define as defineCommand} from './cmd-definition';
import {CmdChildProcessInput, CmdChildProcessEvents} from './cmd.types';
import {setupTTY} from './process-common';
// import inspector from 'inspector';
// inspector.open(9222);

const tableFor = ['setRootDir', 'onCommanderInited'] as const;
export type ServcerChildProcessEntry = SimplexReactor<CmdChildProcessInput & CmdChildProcessEvents, typeof tableFor>;

export function createService(log: (...args: string[]) => void) {
  function logger(...args: any[]) {
    log(formatToConciseNoColor(...args));
  }
  const service = new SimplexReactor<CmdChildProcessInput & CmdChildProcessEvents, typeof tableFor>({
    name: 'server-child-process-entry',
    debug: true,
    tableFor,
    log: logger
  });
  const {s, r, table} = service;
  defineCommand(service, logger);

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

  r('onShutdown', s.pt.onShutdown.pipe(
    rx.map(() => setImmediate(() => service.dispose()))
  ));
  return service;
}

