import * as rx from 'rxjs';
import { ReactorComposite } from './epic';
import { serializeAction, deserializeAction, nameOfAction } from './control';
/** WA - Worker output Message
*/
export function createBroker(mainWorkerInput, opts) {
    const comp = new ReactorComposite(opts);
    const workerInitState = new Map();
    const { r, i, o } = comp;
    comp.startAll();
    r('ensureInitWorker', i.pt.ensureInitWorker.pipe(rx.mergeMap(([meta, workerNo, worker]) => {
        if (workerInitState.get(workerNo) === 'DONE') {
            o.dpf.workerInited(meta, workerNo, null, true);
            return rx.EMPTY;
        }
        else if (workerInitState.get(workerNo) === 'WIP') {
            return o.pt.workerInited.pipe(rx.filter(() => workerInitState.get(workerNo) === 'DONE'), rx.take(1), rx.tap(() => o.dpf.workerInited(meta, workerNo, null, true)));
        }
        workerInitState.set(workerNo, 'WIP');
        worker.on('message', (event) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                workerInitState.set(workerNo, 'DONE');
                o.dpf.workerInited(meta, workerNo, null, false);
            }
            else if (event.type === 'log') {
                // eslint-disable-next-line no-console
                ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(...event.p);
            }
            else if (event.error) {
                o.dp.onWorkerError(workerNo, event.error);
            }
            else {
                const data = event;
                o.dp.actionFromWorker(data, workerNo);
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
    r('On fork', i.at.fork.pipe(rx.mergeMap(async (forkAction) => {
        const [, workerNo, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned));
        if (worker === 'main') {
            deserializeAction(forkAction, mainWorkerInput);
        }
        else {
            await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, workerNo, worker));
            worker.postMessage(serializeAction(forkAction), [forkAction.p[1]]);
        }
    })));
    r('dispatch action of actionFromWorker to broker\'s upStream', o.pt.actionFromWorker.pipe(rx.map(([, action, workerNo]) => {
        if (nameOfAction(action) === 'wait')
            i.dp.onWorkerWait(workerNo);
        else if (nameOfAction(action) === 'stopWaiting')
            i.dp.onWorkerAwake(workerNo);
        else
            deserializeAction(action, i); // fork action
    })));
    r(i.pt.letWorkerExit.pipe(rx.map(([, worker]) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        worker.postMessage(serializeAction(o.core.createAction('exit')));
    })));
    return comp;
}
//# sourceMappingURL=node-worker-broker.js.map