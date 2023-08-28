import * as rx from 'rxjs';
import { ReactorComposite } from './epic';
import { serializeAction, deserializeAction } from './control';
/** WA - Worker output Message
*/
export function createBroker(mainWorkerInput, opts) {
    const ctx = new ReactorComposite(opts);
    const workerInitState = new Map();
    const { r, i, o } = ctx;
    ctx.startAll();
    r(i.pt.ensureInitWorker.pipe(rx.mergeMap(([id, workerNo, worker]) => {
        if (workerInitState.get(workerNo) === 'DONE') {
            o.dp.workerInited(workerNo, null, id, true);
            return rx.EMPTY;
        }
        else if (workerInitState.get(workerNo) === 'WIP') {
            return o.pt.workerInited.pipe(rx.filter(() => workerInitState.get(workerNo) === 'DONE'), rx.take(1));
        }
        worker.on('message', (event) => {
            if (event.type === 'WORKER_READY') {
                workerInitState.set(workerNo, 'DONE');
                o.dp.workerInited(workerNo, null, id, false);
            }
            else if (event.error) {
                o.dp.onWorkerError(workerNo, event.error);
            }
            else {
                const { data } = event;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                deserializeAction(data, o);
            }
        });
        worker.on('error', event => {
            o.dp.onWorkerError(workerNo, event);
        });
        worker.on('messageerror', event => {
            o.dp.onWorkerError(workerNo, event);
        });
        worker.on('exit', event => {
            o.dp.onWorkerExit(workerNo, event);
        });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo });
        return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r(i.at.fork.pipe(rx.mergeMap(async (forkAction) => {
        const waitWorkerAssignment = i.pt.workerAssigned.pipe(rx.filter(([, aId]) => aId === assignId));
        const assignId = o.dp.assignWorker();
        const [, , workerNo, worker] = await rx.firstValueFrom(waitWorkerAssignment);
        if (worker === 'main') {
            mainWorkerInput.core.actionUpstream.next(forkAction);
        }
        else {
            console.log('ensureInitWorker', workerNo);
            i.dp.ensureInitWorker(workerNo, worker);
            worker.postMessage(serializeAction(forkAction), [forkAction.p[1]]);
        }
    })));
    r(i.pt.letWorkerExit.pipe(rx.map(([, worker]) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        worker.postMessage(serializeAction(o.core.createAction('exit')));
    })));
    return ctx;
}
//# sourceMappingURL=node-worker-broker.js.map