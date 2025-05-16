import * as rx from 'rxjs';
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export function setIdleDuring(workerCtl, waitingTask$) {
    const worker = workerCtl;
    worker.s.ft.wait().dp();
    return rx.from(waitingTask$).pipe(rx.tap({
        finalize() {
            worker.s.ft.stopWaiting().dp();
        }
    }));
}
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Promise} when it is resolved, scheduler will be notified to demote current thread
 * worker as current thread will be back to continue previous task.
 */
(function (setIdleDuring) {
    function asPromise(workerCtl, waitingTask$) {
        return rx.firstValueFrom(setIdleDuring(workerCtl, waitingTask$));
    }
    setIdleDuring.asPromise = asPromise;
})(setIdleDuring || (setIdleDuring = {}));
//# sourceMappingURL=common.js.map