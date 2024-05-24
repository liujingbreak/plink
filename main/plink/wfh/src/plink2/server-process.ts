import stream from 'node:stream';
import * as Path from 'node:path';
import * as cp from 'node:child_process';
import * as rx from 'rxjs';
import {SingleActionFactory, ReactorComposite2, ActionMeta, Action, actionRelatedToAction,
  actionRelatedToActionRelatives, serializeAction, deserializeAction2} from '@wfh/reactivizer';
import {workDirChangedByCli} from '../fork-for-preserve-symlink';
import {CmdChildProcessEvents, CmdChildProcessInput} from './cmd.types';
import {setupTTY} from './process-common';
import {service as serverChildProcess4CurrProc} from './server-child-process-entry';
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
}

export function createProcessManager(log: (...m: any[]) => void) {
  const mainPlinkRoot = lookupPlinkRoot(process.cwd());
  const plinkProcessByDir = new Map<string, ProcessState>();
  if (mainPlinkRoot)  {
    plinkProcessByDir.set(mainPlinkRoot, {process: 'main', ready: true});
    serverChildProcess4CurrProc.i.ft.setRootDir(mainPlinkRoot, log).dp();
  } else {
    throw new Error('can not find @wfh/plink directory in');
  }

  const processManager = new ReactorComposite2<ProcessActions, ProcessEvents>({
    name: 'server-process',
    debug: false,
    log
  });
  /** Child process service */
  const cpService = new ReactorComposite2<CmdChildProcessInput, CmdChildProcessEvents>({
    name: 'cmdChildProcessProcProxy',
    debug: false,
    log
  });

  const {i, o, r} = processManager;

  r('cmdModelService.enableRxMessageTrace ->', cmdModelService.inputTable.l.enableRxMessageTrace.pipe(
    rx.distinctUntilChanged(([, a], [, b]) => a === b),
    rx.map(([, enabled]) => {
      processManager.config({debug: enabled});
      cpService.config({debug: enabled});
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
        rx.concatMap(([m, cols, rows, cmd, output, p, rootDir, cwd]) => {
          if (p === 'main') {
            setupTTY(cols, rows);
            if (process.cwd() !== cwd) {
              process.chdir(cwd);
              workDirChangedByCli(cmd);
            }
            const [stdout, stopReadStdout] = createCurrentProcessOutputReader(true);
            stdout.pipe(output);
            return serverChildProcess4CurrProc.i.ft.doCommand(cols, rows, cwd, cmd)
              .od(serverChildProcess4CurrProc.o.pt.onCommandDone).pipe(
                rx.take(1),
                rx.timeout(120000), // 2 min
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
                const msg = cpService.i.createAction('doCommand', [cols, rows, cwd, cmd]);
                msg.r = m.i;
                p.send({
                  type: 'rx:message',
                  content: serializeAction(msg)
                });
                return rx.merge(
                  cpService.o.pt.onCommandDone,
                  cpService.o.pt.onCommandError
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
        })
      ))
    ));

  r('processFor (onReady) -> change plinkProcessByDir',
    o.pt.processFor.pipe(
      rx.mergeMap(([m, , dir]) => cpService.o.pt.onReady.pipe(
        actionRelatedToActionRelatives(m),
        rx.map(() => {
          plinkProcessByDir.get(dir)!.ready = true;
          o.ft.onChildProcessReady(dir).dp(m);
        }),
        rx.take(1)
      ))
    ));

  r('onShutdown -> dispose', rx.merge(
    serverChildProcess4CurrProc.o.pt.onShutdown,
    cpService.o.pt.onShutdown
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
        rx.map(child => (child as cp.ChildProcess).kill('SIGINT')),
        rx.finalize(() => {
          setTimeout(() => {
            processManager.dispose();
            cpService.dispose();
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

  function createChildProcess(m: ActionMeta, dir: string) {
    const p = cp.fork(plinkServerModule, ['' + m.i], {
      cwd: dir,
      stdio: 'pipe',
      detached: true
    });
    // eslint-disable-next-line no-console
    console.log('server-process fork new process', p.pid);

    p.on('exit', (_code) => {
      plinkProcessByDir.delete(dir);
    });
    p.on('message', msg => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((msg as any).type === 'rx:message') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const action = (msg as any).content as Action<CmdChildProcessEvents[keyof CmdChildProcessEvents]>;
        if (action.r == null)
          action.r = m.i;
        deserializeAction2(action, cpService.o);
      }
    });

    // rx.merge(
    //   processEvents.pt.onCommandDone.pipe(
    //     rx.map(() => o.ft.onCommandDone().dp(m))
    //   ),
    //   processEvents.pt.onCommandError.pipe(
    //     rx.map(([, err]) => processManager.dispatchErrorFor(err, m))
    //   )
    // ).subscribe();

    return new Promise<cp.ChildProcess>((resolve, rej) => {
      p.on('error', rej);
      p.on('spawn', () => resolve(p));
    });
  }
  return processManager;
}
const plinkServerModule = Path.resolve(__dirname, 'server-child-process-entry.js');

