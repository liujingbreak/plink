import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl, ActionTypes} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {WorkerMsgData} from '../utils/worker-pool';

export type RecursiveTaskActions<A extends Record<string, (...a: any[]) => void>> = {
  // fork<K extends keyof A>(id: string, actionType: K, payload: ActionTypes<A>[K]['payload']): void;
  waitForJoin(): void;
  setForkActions(action$s: rx.Observable<ActionTypes<A>[keyof A]>[]): void;
  setReturnActions(action$s: rx.Observable<ActionTypes<A>[keyof A]>[]): void;
  onJoinReturn(actionObject: ActionTypes<A>[keyof A]): void;

  getShareData(key: string): void;
  putShareData(key: string, data: unknown): void;
  removeShareData(key: string): void;
};

/** Dispatched by pool or forked worker*/
export type WorkerEvent = {
  onForkedFor(returnPort: MessagePort, actionObject: {p: [id: string]; t: string}): void;
};

export type ForkWorkerPoolActions = {
  fork(returnPort: MessagePort, fromWorker: number, action: any): void;
};
/**
 * @param epic a function which return `observable of actions` to be `postMessage` to worker's caller
 */
// eslint-disable-next-line space-before-function-paren
export function createWorkerControl<A extends Record<string, (...payload: any[]) => void> = Record<string, never>>(
  epic: (controller: ActionStreamControl<A & RecursiveTaskActions<A>>, workerNo: number) =>
  rx.Observable<ActionTypes<A>[keyof A]>,
  {debug, pool}: {
    /** By providing `pool` option, determines current worker control is in master thread mode */
    pool?: ActionStreamControl<ForkWorkerPoolActions>;
    debug?: string | boolean;
  }
) {

  let port: MessagePort | undefined;

  // key is fork task ID
  const returnResultPortMap = new Map<string, MessagePort>();
  const sub = (pool ?
    rx.of(0) :
    new rx.Observable<number>(sub => {
      const handler = (event: MessageEvent<{type?: string; data: number; port: MessagePort}>) => {
        const msg = event.data;
        if (msg.type === 'ASSIGN_WORKER_NO') {
          port = msg.port;
          port.postMessage({type: 'WORKER_READY'});
          sub.next(msg.data);
          sub.complete();
          return;
        }
      };
      /* eslint-disable no-restricted-globals */
      addEventListener('message', handler);
      return () => removeEventListener('message', handler);
    })
  ).pipe(
    op.switchMap(workerNo => {
      if (port == null)  {
        // eslint-disable-next-line no-console
        console.log('worker-' + workerNo, 'is created');
      }
      const controller = createActionStreamByType<RecursiveTaskActions<A>>({
        debug: debug ?? process.env.NODE_ENV === 'development' ? 'worker-' + workerNo : false
      });
      const {_actionFromObject, _actionToObject, payloadByType: pt, createAction} = controller;
      const {dispatcher, actionByType} = controller as unknown as ActionStreamControl<ForkWorkerPoolActions>;
      // const {createAction} = controller as unknown as ActionStreamControl<RecursiveTaskActions<A>>;

      return rx.merge(
        epic(controller as unknown as ActionStreamControl<A & RecursiveTaskActions<A>>, workerNo).pipe(
          port != null ?
            op.map(action => {
              const outMsg = _actionToObject(action as any);
              port!.postMessage(outMsg);
            }) :
            op.ignoreElements(),

          op.catchError((err, src) => {
            if (port != null) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              port.postMessage({error: err, workerNo});
            } else {
              console.error(err);
            }
            return src;
          })
        ),

        pt.setForkActions.pipe(
          op.switchMap(action$s => rx.merge(...action$s)),
          op.map(act => {
            const actionObj = _actionToObject(act);

            const chan = new MessageChannel();
            const workerMsgHandler = (event: MessageEvent<WorkerMsgData>) => {
              const msg = event.data;
              if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
                console.log(`worker #${workerNo} recieve message from forked worker`, msg);
              }
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              _actionFromObject(msg.content);
              chan.port1.removeEventListener('message', workerMsgHandler);
              chan.port1.close();
            };
            chan.port1.addEventListener('message', workerMsgHandler);
            chan.port1.start();

            dispatcher.fork(chan.port2, workerNo, actionObj);
          })
        ),

        actionByType.fork.pipe(
          op.map(a => {
            if (port)
              port.postMessage(_actionToObject(a as any), [a.payload[0]]);
            else if (pool)
              pool.dispatcher.fork(...a.payload);
          })
        ),

        port ?
          pt.setReturnActions.pipe(
            op.switchMap(action$s => rx.merge(...action$s)),
            op.map(act => {
              createAction('getShareData', '');
              const onJoinReturnAction = createAction('onJoinReturn', act);
              const aobj = _actionToObject(onJoinReturnAction);

              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const id = Array.isArray(act.payload) ? act.payload[0] : act.payload;
              if (typeof id === 'string') {
                const port = returnResultPortMap.get(id);
                returnResultPortMap.delete(id);
                port!.postMessage(aobj);
              }
            })
          ) :
          rx.EMPTY,

        (pt as unknown as ActionStreamControl<WorkerEvent>['payloadByType'])
          .onForkedFor.pipe(
            op.map(([callerPort, obj]) => {
              returnResultPortMap.set(obj.p[0], callerPort);
              _actionFromObject(obj);
            })
          ),

        port != null ?
          new rx.Observable(_sub => {
            const workerMsgHandler = (event: MessageEvent<WorkerMsgData>) => {
              const msg = event.data;
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log(`worker #${workerNo} recieve message from master`, msg);
              }
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              _actionFromObject(msg.content);
            };
            port!.addEventListener('message', workerMsgHandler);
            port!.start();
            return () => port!.removeEventListener('message', workerMsgHandler);
          }) :
          rx.EMPTY
      );
    }),
    op.catchError((err, src) => {
      if (port) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        port.postMessage({error: err});
      } else {
        console.error(err);
      }
      return src;
    })
  ).subscribe();
  return () => sub.unsubscribe();
}

