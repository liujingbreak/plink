import * as rx from 'rxjs';
import { actionRelatedToAction } from '../control';
/**
 * @param returnedActionName the name of action that is observed as "returned" message from forked worker, default is `${actionName}Resolved`
 */
export function fork(comp, actionName, params, returnedActionName, relatedToAction) {
    const forkedAction = comp.o.createAction(actionName, ...params);
    if (relatedToAction)
        forkedAction.r = relatedToAction.i;
    const forkDone = rx.firstValueFrom(rx.merge((returnedActionName ? comp.i.at[returnedActionName] : comp.i.at[actionName + 'Resolved']).pipe(actionRelatedToAction(forkedAction), rx.map(a => a.p)), comp.o.pt._onErrorFor.pipe(actionRelatedToAction(forkedAction), 
    // eslint-disable-next-line no-throw-literal
    rx.map(([, err]) => { throw err; }))));
    if (relatedToAction)
        comp.o.dpf.fork(relatedToAction, forkedAction);
    else
        comp.o.dp.fork(forkedAction);
    return forkDone;
}
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export function setIdleDuring(workerCtl, waitingTask$) {
    const worker = workerCtl;
    worker.o.dp.wait();
    return rx.from(waitingTask$).pipe(rx.finalize(() => worker.o.dp.stopWaiting()));
}
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Promise} when it is resolved, scheduler will be notified to demote current thread
 * worker as current thread will be back to continue previous task.
 */
(function (setIdleDuring) {
    function asPromise(...args) {
        return rx.lastValueFrom(setIdleDuring(...args));
    }
    setIdleDuring.asPromise = asPromise;
})(setIdleDuring || (setIdleDuring = {}));
//# sourceMappingURL=common.js.map