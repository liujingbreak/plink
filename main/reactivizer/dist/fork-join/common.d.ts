import * as rx from 'rxjs';
import { SimplexReactor } from '../simplex-reactor';
import { ForkWorkerOutput } from './types';
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export declare function setIdleDuring<T, O extends ForkWorkerOutput>(workerCtl: SimplexReactor<O, any>, waitingTask$: rx.ObservableInput<T>): rx.Observable<T>;
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Promise} when it is resolved, scheduler will be notified to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export declare namespace setIdleDuring {
    function asPromise<T, O extends ForkWorkerOutput>(workerCtl: SimplexReactor<O, any>, waitingTask$: rx.ObservableInput<T>): Promise<T>;
}
