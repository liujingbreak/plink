import stream from 'node:stream';
import * as Path from 'node:path';
import * as cp from 'node:child_process';
import * as util from 'node:util';
import * as rx from 'rxjs';
import {SingleActionFactory, SimplexReactor, ReactorComposite2, ActionMeta, Action, actionRelatedToAction,
  actionRelatedToActionRelatives, serializeAction, deserializeAction2} from '@wfh/reactivizer';
import {workDirChangedByCli} from '../fork-for-preserve-symlink';
import {CmdChildProcessEvents, CmdChildProcessInput} from './cmd.types';
import {setupTTY} from './process-common';
import {createService as createChildProcessService} from './server-child-process-service';
import {createCurrentProcessOutputReader} from './server-process-stdout';
import {cmdModelService} from './cmd-model';
import {lookupPlinkRoot} from './process-common';

interface ProcessState {
  process: 'main' | cp.ChildProcess;
  ready: boolean;
}

interface ProcessActions {
  getProcessFor(cwd: string): SingleActionFactory;
  sendCommand(screenSize: [number, number], cwd: string, cmd: string[], ouput: stream.Writable): SingleActionFactory;
  interrupt(cwd: string): SingleActionFactory;
}

interface ProcessEvents {
  processFor(p: cp.ChildProcess | 'main', rootDir: string): SingleActionFactory;
  /** ActionMeta is related to processFor */
  onChildProcessReady(plinkRootDir: string): SingleActionFactory;
  onCommandDoneAnyway(): SingleActionFactory;
  startRecordError(): SingleActionFactory;
  onCachedError(errors: (readonly [error: any, label: string | null])[]): SingleActionFactory;
}

const tableFor = ['onCachedError'] as const;

export function createProcessManager(log: (...m: any[]) => void) {
  const mainPlinkRoot = lookupPlinkRoot(process.cwd());
  const plinkProcessByDir = new Map<string, ProcessState>();

  const processManager = new ReactorComposite2<ProcessActions, ProcessEvents, never[], typeof tableFor>({
    name: 'server-process',
    debug: false,
    outputTableFor: tableFor,
    log
  });
  /** Child process service */
  const cpProxy = new SimplexReactor<CmdChildProcessInput & CmdChildProcessEvents>({
    name: 'cmdChildProcessProcProxy',
    debug: false,
    log
  });
  const svrChdService = createChildProcessService(log);
  const {i, o, r} = processManager;
  const errors$ = rx.merge(
    svrChdService.error$,
    svrChdService.s.pt.onCommandError,
    svrChdService.s.pt.onUncaughtServiceError.pipe(
      rx.map(([, ...errInfo]) => errInfo)
    ),
    processManager.error$,
    cpProxy.error$
  );
  r('error$, startRecordError, sendCommand -> onCachedError', errors$.pipe(
    // rx.tap(errWithLabel => { log('got', errWithLabel); }),
    rx.bufferToggle(o.pt.startRecordError, () => i.pt.sendCommand),
    rx.map(errors => {
      o.ft.onCachedError(errors).dp();
    })
  ));
  r('onCachedError, sendCommand', rx.zip(o.pt.onCachedError, i.pt.sendCommand).pipe(
    rx.map(([[, errors], [, , , , output]]) => {
      for (const [err, label] of errors) {
        if (label) {
          output.write(label);
          output.write(' - ');
        }
        output.write(util.inspect(err));
        output.write('\n');
      }
    })
  ));
  r('cmdModelService.enableRxMessageTrace ->', cmdModelService.inputTable.l.enableRxMessageTrace.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([, enabled]) => {
      const opts = {debug: enabled};
      svrChdService.config(opts);
      processManager.config(opts);
      cpProxy.config(opts);
    })
  ));
  r('getProcessFor -> processFor', i.pt.getProcessFor.pipe(
    rx.map(([m, dir]) => {
      const root = lookupPlinkRoot(Path.resolve(dir));
      if (root == null) {
        processManager.dispatchErrorFor(new Error(`No installed PLink found for ${dir}`), m);
      }
      return [m, root] as const;
    }),
    rx.filter(([, root]) => root != null),
    rx.groupBy(([, dir]) => dir),
    rx.mergeMap(grouped$ => {
      return grouped$.pipe(
        rx.concatMap(async ([m, dir]) => {
          const p = plinkProcessByDir.get(dir!);
          if (p != null) {
            o.ft.processFor(p.process, dir!).dp(m);
          } else {
            try {
              const childProcess = await createChildProcess(m, dir!);
              plinkProcessByDir.set(dir!, {
                process: childProcess,
                ready: false
              });
              o.ft.processFor(childProcess, dir!).dp(m);
            } catch (e) {
              processManager.dispatchErrorFor(e, m);
            }
          }
        })
      );
    })
  ));
  r('sendCommand, (onCommandDoneAnyway) -> startRecordError', i.pt.sendCommand.pipe(
    rx.mergeMap(([m, , , , output]) => {
      return errors$.pipe(
        rx.map(([err, label]) => {
          if (label) {
            output.write(util.inspect(label));
            output.write('\n');
          }
          output.write(util.inspect(err));
          output.write('\n');
        }),
        rx.takeUntil(
          o.pt.onCommandDoneAnyway.pipe(
            actionRelatedToAction(m)
          )
        ),
        rx.finalize(() => {
          o.ft.startRecordError().dp(m);
        })
      );
    })
  ));
  r('sendCommand (childProcess.onCommandDone, onCommandError) -> childProcess.doCommand',
    i.pt.sendCommand.pipe(
      // Join process creation information
      rx.mergeMap(([m, [cols, rows], cwd, cmd, output]) =>
        i.ft.getProcessFor(cwd).od(o.pt.processFor).pipe(
          rx.take(1),
          rx.map(([, p, rootDir]) => [
            m, cols, rows, cmd, output, p,
            rootDir, cwd
          ] as const)
        )),
      rx.groupBy(([, , , , , , rootDir]) => rootDir),
      rx.mergeMap(grouped => grouped.pipe(
        // Using concatMap: commands should be queued up by correspoding child process or rootDir
        rx.mergeMap(([m, cols, rows, cmd, output, p, rootDir, cwd]) => {
          try {
            if (p === 'main') {
              setupTTY(cols, rows);
              if (process.cwd() !== cwd) {
                process.chdir(cwd);
                workDirChangedByCli(cmd);
              }
              const [stdout, stopReadStdout] = createCurrentProcessOutputReader();
              stdout.pipe(output);
              const [done$, error$] = svrChdService.s.ft.doCommand(cols, rows, cwd, cmd)
                .od(svrChdService.s.pt.onCommandDone, svrChdService.s.pt.onCommandError);
              return done$.pipe(
                rx.take(1),
                rx.timeout(120000), // 2 min
                rx.takeUntil(error$.pipe(
                  rx.map(([, err]) => {
                    return err;
                  })
                )),
                rx.catchError(err => {
                  processManager.dispatchErrorFor(err, m);
                  return rx.EMPTY;
                }),
                rx.finalize(() => {
                  stopReadStdout();
                  o.ft.onCommandDoneAnyway().dp(m);
                })
              );
            } else {
              p.stdout!.pipe(output);
              p.stderr!.pipe(output);
              return (
              // wait for child process ready
                plinkProcessByDir.get(rootDir)?.ready ?
                  rx.of(p) :
                  o.pt.onChildProcessReady.pipe(
                    rx.filter(([, d]) => rootDir === d),
                    rx.take(1),
                    rx.map(() => p)
                  )
              ).pipe(
                rx.mergeMap(() => {
                  const msg = cpProxy.s.createAction('doCommand', [cols, rows, cwd, cmd]);
                  msg.r = m.i;
                  p.send({
                    type: 'rx:message',
                    content: serializeAction(msg)
                  });
                  return rx.merge(
                    cpProxy.s.pt.onCommandDone,
                    cpProxy.s.pt.onCommandError
                  ).pipe(
                    actionRelatedToAction(msg),
                    rx.take(1)
                  );
                }),
                rx.finalize(() => {
                  o.ft.onCommandDoneAnyway().dp(m);
                  p.stdout!.unpipe(output);
                  p.stderr!.unpipe(output);
                })
              );
            }
          } catch (err) {
            processManager.dispatchErrorFor(err, m);
            return rx.EMPTY;
          }
        })
      ))
    ));

  r('processFor (onReady) -> change plinkProcessByDir',
    o.pt.processFor.pipe(
      rx.mergeMap(([m, , dir]) => cpProxy.s.pt.onReady.pipe(
        actionRelatedToActionRelatives(m),
        rx.map(() => {
          plinkProcessByDir.get(dir)!.ready = true;
          o.ft.onChildProcessReady(dir).dp(m);
        }),
        rx.take(1)
      ))
    ));

  r('onShutdown -> dispose', rx.merge(
    svrChdService.s.pt.onShutdown,
    cpProxy.s.pt.onShutdown
  ).pipe(
    rx.concatMap(() => rx.timer(500)),
    rx.mergeMap(() =>
      rx.from(plinkProcessByDir.entries()).pipe(
        rx.mergeMap(([dir, {ready, process: child}]) => (child === 'main' ?
          rx.of(null) :
          ready ?
            rx.of(child) :
            o.pt.onChildProcessReady.pipe(
              rx.filter(([, d]) => dir === d),
              rx.take(1),
              rx.map(() => child)
            ))
        ),
        rx.filter(isChild => isChild != null),
        rx.map(child => child.kill('SIGINT')),
        rx.finalize(() => {
          setTimeout(() => {
            processManager.dispose();
            cpProxy.dispose();
          }, 20);
        })
      )
    )
  ));

  r('interrupt', i.pt.interrupt.pipe(
    rx.mergeMap(([m, cwd]) => i.ft.getProcessFor(cwd).ddo(o.pt.processFor, m).pipe(
      rx.take(1),
      rx.map(([, ...param]) => [m, ...param] as const)
    )),
    rx.groupBy(([, , root]) => root)
    // rx.mergeMap(g$ => g$.pipe(
    //   rx.exhaustMap(([, p, rootDir]) => {
    //     if (p === 'main') {
    //       i.ft.sendCommand([150, 50], rootDir, ['stop'], new );
    //     } else 
    //     // TODO
    //   })
    // ))
  ));
  o.ft.startRecordError().dp();
  if (mainPlinkRoot)  {
    plinkProcessByDir.set(mainPlinkRoot, {process: 'main', ready: true});
    svrChdService.s.ft.setRootDir(mainPlinkRoot).dp();
  } else {
    throw new Error('can not find @wfh/plink directory in');
  }

  function createChildProcess(m: ActionMeta, dir: string) {
    const p = cp.fork(plinkServerModule, ['' + m.i], {
      cwd: dir,
      stdio: 'pipe',
      detached: true
    });
    // eslint-disable-next-line no-console
    log('server-process fork new process', p.pid);

    p.on('exit', (_code) => {
      plinkProcessByDir.delete(dir);
    });
    p.on('message', msg => {
      if ((msg as {type: string}).type === 'rx:message') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const action = (msg as {content: any}).content as Action<CmdChildProcessEvents[keyof CmdChildProcessEvents]>;
        if (action.r == null)
          action.r = m.i;
        deserializeAction2(action, cpProxy.s);
      } else if ((msg as {type: string}).type === 'plink2:log') {
        log(...(msg as {msg: string[]}).msg);
      }
    });

    return new Promise<cp.ChildProcess>((resolve, rej) => {
      p.on('error', rej);
      p.on('spawn', () => resolve(p));
    });
  }
  return processManager;
}
const plinkServerModule = Path.resolve(__dirname, 'server-process-child.js');

