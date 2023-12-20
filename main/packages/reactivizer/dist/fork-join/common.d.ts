import * as rx from 'rxjs';
import { ActionMeta, ActionFunctions, InferPayload } from '../control';
import { ReactorComposite } from '../epic';
import { ForkWorkerOutput } from './types';
/**
 * @param returnedActionName the name of action that is observed as "returned" message from forked worker, default is `${actionName}Resolved`
 */
export declare function fork<I extends ActionFunctions, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(comp: ReactorComposite<I, any, any, any>, actionName: K & string, params: InferPayload<I[K]>, returnedActionName?: R, relatedToAction?: ActionMeta): Promise<[...InferPayload<I[R]>]>;
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export declare function setIdleDuring<T, O extends ForkWorkerOutput>(workerCtl: ReactorComposite<any, O, any, any>, waitingTask$: rx.ObservableInput<T>): rx.Observable<T>;
/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Promise} when it is resolved, scheduler will be notified to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export declare namespace setIdleDuring {
    function asPromise<T, O extends ForkWorkerOutput>(...args: [workerCtl: ReactorComposite<any, O, any, any>, waitingTask$: rx.ObservableInput<T>]): Promise<T>;
}
