import * as rx from 'rxjs';
import {SimplexReactor} from '../simplex-reactor';
import {ForkWorkerOutput} from './types';

/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export function setIdleDuring<T, O extends ForkWorkerOutput>(workerCtl: SimplexReactor<O, any>, waitingTask$: rx.ObservableInput<T>): rx.Observable<T> {
  const worker = workerCtl as unknown as SimplexReactor<ForkWorkerOutput>;
  worker.s.ft.wait().dp();
  return rx.from(waitingTask$).pipe(
    rx.tap({
      finalize() {
        worker.s.ft.stopWaiting().dp();
      }
    })
  );
}

/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Promise} when it is resolved, scheduler will be notified to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export namespace setIdleDuring {
  export function asPromise<T, O extends ForkWorkerOutput>(workerCtl: SimplexReactor<O, any>, waitingTask$: rx.ObservableInput<T>) {
    return rx.firstValueFrom(setIdleDuring(workerCtl, waitingTask$));
  }
}
