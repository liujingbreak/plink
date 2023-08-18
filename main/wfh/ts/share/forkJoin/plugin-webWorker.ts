import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/es/rx-utils';
import {ForkWorkerActions} from './forkJoin-pool';
import {PluginActions} from './types';

export function createWebWorkerPlugin() {
  const ctrl = createActionStreamByType<PluginActions & ForkWorkerActions>();
  const {payloadByType: pt, dispatcher, actionByType: at, _actionFromObject, objectToAction} = ctrl;

  rx.merge(
    pt.pluginDoInitWorker.pipe(
      op.map(([workerNo, worker, actionSubject]) => {
        const chan = new MessageChannel();

        chan.port1.onmessage = event => {
          if ((event.data as {type: string}).type === 'WORKER_READY') {
            dispatcher.pluginDoneInitWorker(workerNo, chan.port1);
          } else if ((event.data as {error?: any}).error) {
            dispatcher.onWorkerError(
              workerNo,
              (event.data as {error?: any}).error
            );
          } else {
            actionSubject.next(objectToAction(event.data));
          }
        };
        chan.port1.onmessageerror = event => {
          dispatcher.onWorkerError(workerNo, event.data);
        };
        (worker as Worker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo, port: chan.port2}, [chan.port2]);
      })
    ),
    pt.pluginWorkerOnInit.pipe(
      op.switchMap(() => new rx.Observable(_sub => {

        const handler = (event: MessageEvent<{type?: string; workerNo: number, port: MessagePort}>) => {
          const msg = event.data;
          if (msg.type === 'ASSIGN_WORKER_NO') {
            msg.port.postMessage({type: 'WORKER_READY'});
            dispatcher.pluginWorkerDoneInit(msg.workerNo, msg.port);

            msg.port.onmessage = (event: MessageEvent<any>) => {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log(`worker #${msg.workerNo} recieve message from master`, msg);
              }
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              _actionFromObject(event.data);
            };
          }
        };
        // eslint-disable-next-line no-restricted-globals
        self.onmessage = handler;
      })),
      op.takeUntil(at.pluginWorkerOnDestory)
    ),
    pt.pluginCreateReturnPort.pipe(
      op.map(([workerNo, cb]) => {
        const chan = new MessageChannel();
        const workerMsgHandler = (event: MessageEvent<unknown>) => {
          const {data: msg} = event;
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log(`worker #${workerNo} recieve message from forked worker`, msg);
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          _actionFromObject(msg as any);
          chan.port1.removeEventListener('message', workerMsgHandler);
          chan.port1.close();
        };
        chan.port1.addEventListener('message', workerMsgHandler);
        chan.port1.start();
        cb(chan.port2);
      })
    ),
    pt.pluginPostMsgTo.pipe(
      op.map(([port, content, transfers]) => {
        // eslint-disable-next-line no-restricted-globals
        port.postMessage(content, transfers);
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

