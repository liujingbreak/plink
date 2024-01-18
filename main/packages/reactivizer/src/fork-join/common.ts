import * as rx from 'rxjs';
import {ActionMeta, ActionFunctions, RxController,
  actionRelatedToAction, InferPayload} from '../control';
import {ReactorComposite} from '../epic';
import {ForkWorkerOutput} from './types';

/**
 * @param returnedActionName the name of action that is observed as "returned" message from forked worker, default is `${actionName}Resolved`
 */
export function fork<I extends ActionFunctions, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(
  comp: ReactorComposite<I, any, any, any>,
  actionName: K & string,
  params: InferPayload<I[K]>,
  returnedActionName?: R,
  relatedToAction?: ActionMeta
): Promise<[...InferPayload<I[R]>]> {
  const forkedAction = comp.o.createAction(actionName, ...params);
  if (relatedToAction)
    forkedAction.r = relatedToAction.i;

  const forkDone = rx.firstValueFrom(
    rx.merge(
      (returnedActionName ? comp.i.at[returnedActionName] : comp.i.at[actionName + 'Resolved']).pipe(
        actionRelatedToAction(forkedAction),
        rx.map(a => a.p)
      ),
      (comp as ReactorComposite<I, Record<string, never>, any, any>).o.pt._onErrorFor.pipe(
        actionRelatedToAction(forkedAction),
        // eslint-disable-next-line no-throw-literal
        rx.map(([, err]) => {throw (err as Error); })
      )
    ));
  if (relatedToAction)
    (comp.o as unknown as RxController<ForkWorkerOutput>).dpf.fork(relatedToAction, forkedAction);
  else
    (comp.o as unknown as RxController<ForkWorkerOutput>).dp.fork(forkedAction);
  return forkDone;
}

/**
 * Informs broker that current step is waiting on forked function returns or any other outside asynchronous operation,
 * so that broker can rank current thread worker as "less busy" and schedule more forked
 * task probably
 * @return {Observable} which should `complete`, so that it notifies scheduler to demote current thread
 * worker as current thread will be back to continue previous task.
 */
export function setIdleDuring<T, O extends ForkWorkerOutput>(workerCtl: ReactorComposite<any, O, any, any>, waitingTask$: rx.ObservableInput<T>): rx.Observable<T> {
  const worker = workerCtl as unknown as ReactorComposite<any, ForkWorkerOutput>;
  worker.o.dp.wait();
  return rx.from(waitingTask$).pipe(
    rx.finalize(() => worker.o.dp.stopWaiting())
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
  export function asPromise<T, O extends ForkWorkerOutput>(...args: [workerCtl: ReactorComposite<any, O, any, any>, waitingTask$: rx.ObservableInput<T>]) {
    return rx.lastValueFrom(setIdleDuring(...args));
  }
}
