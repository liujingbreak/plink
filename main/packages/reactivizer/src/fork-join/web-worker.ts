/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction,
  actionRelatedToAction} from '../control';
import {ReactorComposite, ReactorCompositeOpt} from '../epic';
// import {createBroker} from '../node-worker-broker';
import {Broker, ForkWorkerInput, ForkWorkerOutput, workerInputTableFor as inputTableFor,
  workerOutputTableFor as outputTableFor, WorkerControl} from './types';
export {fork} from './common';

export function createWorkerControl<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly [],
  LO extends ReadonlyArray<keyof O> = readonly []
>(
  isInWorker: boolean,
  opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput>
) {
  let broker: Broker | undefined;

  let mainPort: MessagePort | undefined; // parent thread port
  const comp = new ReactorComposite<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>({
    ...opts,
    name: opts?.name ?? '',
    inputTableFor: [...(opts?.inputTableFor ?? []), ...inputTableFor],
    outputTableFor: [...(opts?.outputTableFor ?? []), ...outputTableFor],
    debug: opts?.debug,
    log: !isInWorker ? opts?.log : (...args) => mainPort?.postMessage({type: 'log', p: args}),
    debugExcludeTypes: ['log', 'warn'],
    logStyle: 'noParam'
  });

  const {r, i, o, outputTable} = comp;
  const lo = comp.outputTable.l;

  r('worker$ -> workerInited', new rx.Observable(() => {
    const handler = (event: MessageEvent<{type?: string; workerNo: number; mainPort: MessagePort}>) => {
      const msg = event.data;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        msg.mainPort.postMessage({type: 'WORKER_READY'});
        const {workerNo} = msg;
        const logPrefix = (opts?.name ?? '') + '[Worker:' + workerNo + ']';
        o.dp.workerInited(workerNo, logPrefix, msg.mainPort);
        comp.setName(logPrefix);
      }
    };
    if (isInWorker) {
      /* eslint-disable no-restricted-globals */
      addEventListener('message', handler);
    } else {
      o.dp.workerInited('main', '[main]', null);
    }
    return () => self.removeEventListener('message', handler);
  }));

  r('workerInited -> main worker message port listener', outputTable.l.workerInited.pipe(
    rx.filter(([, , , port]) => port != null),
    rx.switchMap(([, , , port]) => new rx.Observable(() => {
      function handler(event: MessageEvent) {
        const act = event.data as Action<any>;
        deserializeAction(act, i);
      }
      (port as MessagePort).addEventListener('message', handler);
      return () => {(port as MessagePort).removeEventListener('message', handler); };
    }))
  ));

  if (isInWorker) {
    r('exit', comp.inputTable.l.exit.pipe(
      rx.switchMap(() => lo.workerInited),
      rx.take(1),
      rx.map(() => {
        comp.destory();
      })
    ));

    r('Pass worker wait and awake message to broker', lo.workerInited.pipe(
      rx.filter(([, , , port]) => port != null),
      rx.take(1),
      rx.switchMap(([, , , port]) => rx.merge(
        o.at.wait,
        o.at.stopWaiting,
        o.at.returned
      ).pipe(
        rx.map(action => {
          port!.postMessage(serializeAction(action));
        })
      ))
    ));

    r('postMessage log to broker (parent thread)', lo.workerInited.pipe(
      rx.filter(([, , , port]) => port != null),
      rx.take(1),
      rx.switchMap(([, , logPrefix, port]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => port!.postMessage({type: 'log', p: [logPrefix, ...p]}))
      ))
    ));
  } else {
    r('log, warn > console.log', lo.workerInited.pipe(
      rx.take(1),
      rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => (opts?.log ?? console.log)(logPrefix, ...p))
      ))
    ));
  }

  r('"fork" -> forkByBroker', o.at.fork.pipe(
    rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b] as const), rx.take(1))),
    rx.mergeMap(([act, [, , , mainPort]]) => {
      const {p: [wrappedAct]} = act;
      const chan = new MessageChannel();
      const error$ = new rx.Observable<any>(sub => {
        chan.port1.onmessageerror = err => sub.next(err);
        return () => chan.port1.onmessageerror = null;
      });
      return rx.merge(
        new rx.Observable<MessageEvent<any>['data']>(sub => {
          chan.port1.onmessage = msg => sub.next(msg.data);
          return () => chan.port1.onmessage = null;
        }).pipe(
          rx.map(event => deserializeAction(event, i)),
          rx.take(1),
          rx.takeUntil(rx.merge(error$, error$))
        ),
        new rx.Observable<void>(_sub => {
          if (mainPort) {
            const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
            (mainPort as MessagePort).postMessage(serializeAction(forkByBroker), [chan.port2]);
          } else {
            o.dpf.forkByBroker(act, wrappedAct, chan.port2);
          }
        })
      );
    })
  ));

  r('On recieving "being forked" message, wait for fork action returns', i.pt.onFork.pipe(
    rx.mergeMap(([, origAct, port]) => {
      deserializeAction(origAct, i);
      return o.core.action$.pipe(
        actionRelatedToAction(origAct),
        rx.take(1),
        rx.map(action => {
          const {p} = action;
          if (hasReturnTransferable(p)) {
            const [{transferList}] = p;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (p[0] as any).transferList = null;
            (port as MessagePort).postMessage(serializeAction(action), transferList);
          } else {
            (port as MessagePort).postMessage(serializeAction(action));
          }
          o.dp.returned();
        })
      );
    })
  ));

  r('Pass error to broker', comp.error$.pipe(
    rx.switchMap(a => outputTable.l.workerInited.pipe(
      rx.map(b => [a, b] as const),
      rx.take(1)
    )),
    rx.map(([[label, err], [, , , mainPort]]) => {
      if (mainPort) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        (mainPort as MessagePort).postMessage({error: {label, detail: err}});
      } else if (broker) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        broker.o.dp.onWorkerError(-1, {label, detail: err}, 'customized error');
      }
    })
  ));
  return comp as unknown as WorkerControl<I, O, LI, LO>;
}

export type WebForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort)[];
};

function hasReturnTransferable(payload: Action<any>['p']): payload is [WebForkTransferablePayload, ...unknown[]] {
  return Array.isArray((payload[0] as WebForkTransferablePayload | undefined)?.transferList);
}
