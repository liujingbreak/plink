import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl, ActionTypes} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {WorkerMsgData} from '../utils/worker-pool';

/**
 * @param epic a function which return `observable of actions` to be `postMessage` to worker's caller
 */
// eslint-disable-next-line space-before-function-paren
export function createWorkerControl<A extends Record<string, (...payload: any[]) => void>>(
  epic: (controller: ActionStreamControl<A>, workerNo: number) => rx.Observable<ActionTypes<A>[keyof A]>,
  {debug}: {debug?: string | boolean}
) {

  let port: MessagePort | undefined;
  const sub = new rx.Observable<number>(sub => {
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
  }).pipe(
    op.switchMap(workerNo => {
      // eslint-disable-next-line no-console
      console.log('worker-' + workerNo, 'is created');
      const controller = createActionStreamByType<A>({
        debug: debug ?? process.env.NODE_ENV === 'development' ? 'worker-' + workerNo : false
      });
      const {_actionFromObject, _actionToObject} = controller;
      const workerMsgHandler = (event: MessageEvent<WorkerMsgData>) => {
        const msg = event.data;
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log(`worker #${workerNo} recieve message`, msg);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        _actionFromObject(msg.content);
      };

      return rx.merge(
        epic(controller, workerNo).pipe(
          op.map(action => {
            const outMsg = _actionToObject(action);
            port!.postMessage(outMsg);
          }),
          op.catchError((err, src) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            port!.postMessage({error: err, workerNo});
            return src;
          })
        ),
        new rx.Observable(_sub => {
          port!.addEventListener('message', workerMsgHandler);
          port!.start();
          return () => port!.removeEventListener('message', workerMsgHandler);
        })
      );
    }),
    op.catchError((err, src) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      port!.postMessage({error: err});
      return src;
    })
  ).subscribe();
  return () => sub.unsubscribe();
}

