"use strict";
// import * as rx from 'rxjs';
// import {ReactorComposite} from './epic';
// import {Action, ActionFunctions} from './control';
// import {BrokerInput, BrokerEvent} from './types';
// export function createBroker<A extends ActionFunctions>() {
// const ctx = new ReactorComposite<BrokerInput, BrokerEvent>();
// const {i, o} = ctx;
// ctx.r(
//   i.pt.init.pipe(
//     rx.map(([id, workerNo, worker]) => {
//       const chan = new MessageChannel();
//       chan.port1.onmessage = (event: MessageEvent<Action<A, keyof A> | {type: string}>) => {
//         if ((event.data as {type: string}).type === 'WORKER_READY') {
//           o.dp.initDone(workerNo, chan.port1, id);
//         } else if ((event.data as {error?: any}).error) {
//           o.dp.onWorkerError(
//             workerNo,
//             (event.data as {error?: any}).error
//           );
//         } else {
//           const {data} = event as MessageEvent<Action<any, keyof any>>;
//           // eslint-disable-next-line @typescript-eslint/no-unsafe-call
//           (o.dp[data.t as keyof typeof o.dp] as any)(data.p);
//         }
//       };
//       chan.port1.onmessageerror = event => {
//         o.dp.onWorkerError(workerNo, event.data);
//       };
//       (worker as Worker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo, port: chan.port2}, [chan.port2]);
//     })
//   ));
// return ctx as ReactorComposite<BrokerInput, BrokerEvent & A>;
// }
//# sourceMappingURL=web-worker-broker.js.map