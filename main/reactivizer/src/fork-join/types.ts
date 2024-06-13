import type {Worker as NodeWorker, MessagePort as NodeMessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, InferPayload} from '../control';
import {SingleActionFactory} from '../control2';
import {SimplexReactorMergeType} from '../inferred-types';
import {RxControlConfigType} from '../global-config';
import {SimplexReactor} from '../simplex-reactor';

export const brokerOutputTableFor = ['assignWorker', 'allReadyWorkers'] as const;
export type Broker<
  WI = Record<never, never>
> = SimplexReactor<BrokerInput & BrokerEvent<WI>, typeof brokerOutputTableFor>;

export type ForkWorkerInput = {
  changeConfig<I>(config: RxControlConfigType<I>): SingleActionFactory;
  exit(): SingleActionFactory;
  onFork(targetAction: Action<any>, port: NodeMessagePort | MessagePort): SingleActionFactory;
  /** set actions which are supposed to be sent to parent main thread by "messagePort.postMessage()",
   * consumer program should subscribe to `broker`'s outputTable.l.newWorkerReady to obtain lifted RxController
   * to dispatch or observe actions directly to or from worker threads
   */
  setLiftUpActions(action$: rx.Observable<Action<any>>): SingleActionFactory;
};

export interface ForkWorkerOutput<I = Record<string, any>>{
  inited(workerNo: string | number, logPrefix: string, mainWorkerPort: MessagePort | NodeMessagePort | null): SingleActionFactory;
  // inited(workerNo: number): SingleActionFactory;
  // forkAction<O, T extends keyof O>(targetActionName: T, ...params: InferPayload<O[T]>): SingleActionFactory;
  // fork(targetAction: Action<any>): SingleActionFactory;
  fork<K extends string & keyof I>(
    actionName: K & string,
    ...params: InferPayload<I[K]>
  ): SingleActionFactory;
  /** Informs broker that current step is waiting on forked function returns*/
  wait(): SingleActionFactory;
  /** Informs broker that current function step is be awake and continue on other instructions */
  stopWaiting(): SingleActionFactory;
  returned(): SingleActionFactory;
  log(...obj: any[]): SingleActionFactory;
  warn(...obj: any[]): SingleActionFactory;

  /** broker implementation should react to this event*/
  forkByBroker(targetAction: Action<any>, messagePort: NodeMessagePort | MessagePort): SingleActionFactory;
  onForkReturn(retAction: Action<any>): SingleActionFactory;
}

export const workerActionTableFor = ['setLiftUpActions', 'exit', 'inited', 'log', 'warn'] as const;
export const workerInputTableFor = ['setLiftUpActions', 'exit'] as const;
export const workerOutputTableFor = ['inited', 'log', 'warn'] as const;

export type WorkerControl<
  I = Record<never, never>,
  LI extends ReadonlyArray<keyof I> = readonly []
> = SimplexReactorMergeType<SimplexReactor<ForkWorkerInput & ForkWorkerOutput<I>, typeof workerActionTableFor>, SimplexReactor<I, LI>>;

export type BrokerInput = {
  ensureInitWorker(workerNo: number, worker: Worker | NodeWorker): SingleActionFactory;
  /** Send message to worker to stop all event listerners on it */
  letWorkerExit(workerNo: number): SingleActionFactory;
  /** Since Web worker doesn't have "close" event, there is no way currently this ca
   * work in web browser
   */
  letAllWorkerExit(): SingleActionFactory;
  workerAssigned(worketNo: number, worker: Worker | NodeWorker | 'main', isNew?: boolean, workerRank?: number): SingleActionFactory;
  mainThreadInit(): SingleActionFactory;
};

export type BrokerEvent<I = Record<never, never>> = {
  workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, action$FromWorker: WorkerControl<I>['s'], skipped: boolean): SingleActionFactory;
  newWorkerReady(workerNo: number, workerEvents: WorkerControl<I>['s'], workerInput: WorkerControl<I>['s']): SingleActionFactory;
  onWorkerError(workerNo: number, error: unknown, type?: string): SingleActionFactory;
  onWorkerExit(workerNo: number, exitCode: number): SingleActionFactory;
  onAllWorkerExit(): SingleActionFactory;
  assignWorker(): SingleActionFactory;
  workerRankChanged(workerNo: number, value: number): SingleActionFactory;
  allReadyWorkers<T>(workersReplay$: rx.Observable<InferPayload<BrokerEvent<T>['newWorkerReady']>>): SingleActionFactory;
};

export type ThreadExpirationEvents = {
  startExpirationTimer(workerNo: number): SingleActionFactory;
  clearExpirationTimer(workerNo: number): SingleActionFactory;
};
