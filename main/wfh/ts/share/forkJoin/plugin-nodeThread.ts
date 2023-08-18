import {MessageChannel, parentPort, Worker} from 'node:worker_threads';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '../../../../packages/redux-toolkit-observable/dist/rx-utils';
import {PluginActions} from './types';

export function createNodeThreadPlugin() {
  const ctrl = createActionStreamByType<PluginActions>();
  const {payloadByType: pt, actionByType: at, objectToAction, dispatcher, _actionFromObject} = ctrl;
  rx.merge(
    pt.pluginDoInitWorker.pipe(
      op.map(([workerNo, worker, actionSubject]) => {
        (worker as Worker).on('message', event => {
          if ((event as {type: string}).type === 'WORKER_READY') {
            dispatcher.pluginDoneInitWorker(workerNo, parentPort!);
          } else if ((event as {error?: any}).error) {
            dispatcher.pluginOnError(
              workerNo,
              (event as {error?: any}).error
            );
          } else {
            actionSubject.next(objectToAction(event));
          }
        });
        (worker as Worker).on('messageerror', error => {
          dispatcher.pluginOnError(workerNo, error);
        });
        (worker as Worker).postMessage({type: 'ASSIGN_WORKER_NO', data: workerNo});
      })
    ),

    pt.pluginWorkerOnInit.pipe(
      op.switchMap(() => new rx.Observable(_sub => {
        const handler = (event: {type?: string; data: number}) => {
          const msg = event;
          if (msg.type === 'ASSIGN_WORKER_NO') {
            parentPort!.postMessage({type: 'WORKER_READY'});
            dispatcher.pluginWorkerDoneInit(msg.data, parentPort!);
          }
        };
        /* eslint-disable no-restricted-globals */
        parentPort?.addListener('message', handler);
        return () => parentPort?.removeListener('message', handler);
      })),
      op.takeUntil(at.pluginWorkerOnDestory)
    ),

    pt.pluginCreateReturnPort.pipe(
      op.map(([workerNo, cb]) => {
        const chan = new MessageChannel();
        const workerMsgHandler = (msg: any) => {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log(`worker #${workerNo} recieve message from forked worker`, msg);
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          _actionFromObject(msg);
          chan.port1.close();
        };
        chan.port1.once('message', workerMsgHandler);
        chan.port1.start();
        cb(chan.port2);
      })
    ),
    pt.pluginPostMsgTo.pipe(
      op.map(([content, transfers]) => {
        parentPort!.postMessage(content, transfers);
      })
    )
  ).pipe(
    op.catchError((err, src) => {
      console.error(err);
      return src;
    })
  ).subscribe();

  return [ctrl, createActionStreamByType] as const;
}

