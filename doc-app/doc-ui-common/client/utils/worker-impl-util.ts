import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl, ActionTypes} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {WorkerMsgData} from '../utils/worker-pool';

/**
 * @param epic a function which return `observable of actions` to be `postMessage` to worker's caller
 */
// eslint-disable-next-line space-before-function-paren
export function createWorkerControl<A extends Record<string, (...payload: any[]) => void>>(
  epic: (controller: ActionStreamControl<A>) => rx.Observable<ActionTypes<A>[keyof A]>
) {
  const sub = new rx.Observable<number>(sub => {
    const handler = (event: MessageEvent<{type?: string; data: number}>) => {
      const msg = event.data;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        postMessage({type: 'WORKER_READY'});
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
        debug: process.env.NODE_ENV === 'development' ? 'worker-' + workerNo : false
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
        epic(controller).pipe(
          op.map(action => {
            const outMsg = _actionToObject(action);
            postMessage(outMsg);
          })
        ),
        new rx.Observable(sub => {
          addEventListener('message', workerMsgHandler);
          return () => removeEventListener('message', workerMsgHandler);
        })
      );
    }),
    op.catchError((err, src) => {
      // void Promise.resolve().then(() => {throw err; });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      postMessage({error: err});
      throw err;
    })
  ).subscribe();
  return () => sub.unsubscribe();
}

