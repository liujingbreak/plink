import type {Worker as NodeWorker, MessagePort as NodeMessagePort} from 'worker_threads';
import {ReactorComposite} from '../epic';
import {Action, ActionFunctions} from '../control';

export const brokerOutputTableFor = ['newWorkerReady', 'workerInputs', 'assignWorker', 'portOfWorker'] as const;
export type Broker<W extends WorkerControl<any, any, any, any> = WorkerControl> = ReactorComposite<BrokerInput, BrokerEvent<W>, [], typeof brokerOutputTableFor>;

export type ForkWorkerInput = {
  exit(): void;
  onFork(targetAction: Action<any>, port: NodeMessagePort | MessagePort): void;
};

export type ForkWorkerOutput = {
  workerInited(workerNo: string | number, logPrefix: string, mainWorkerPort: MessagePort | NodeMessagePort | null): void;
  // inited(workerNo: number): void;
  fork(targetAction: Action<any>): void;
  /** Informs broker that current step is waiting on forked function returns*/
  wait(): void;
  /** Informs broker that current function step is be awake and continue on other instructions */
  stopWaiting(): void;
  returned(): void;
  log(...obj: any[]): void;
  warn(...obj: any[]): void;

  /** broker implementation should react to this event*/
  forkByBroker(targetAction: Action<any>, messagePort: NodeMessagePort | MessagePort): void;
};

export const workerInputTableFor = ['exit'] as const;
export const workerOutputTableFor = ['workerInited', 'log', 'warn'] as const;

export type WorkerControl<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly [],
  LO extends ReadonlyArray<keyof O> = readonly []
> = ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O,
ReadonlyArray<typeof workerInputTableFor[number] | LI[number]>,
ReadonlyArray<typeof workerOutputTableFor[number] | LO[number]>
>;

export type BrokerInput = {
  ensureInitWorker(workerNo: number, worker: Worker | NodeWorker): void;
  /** Send message to worker to stop all event listerners on it */
  letWorkerExit(worker: Worker | NodeWorker): void;
  /** Since Web worker doesn't have "close" event, there is no way currently this ca
   * work in web browser
   */
  letAllWorkerExit(): void;
  workerAssigned(worketNo: number, worker: Worker | NodeWorker | 'main'): void;
};

export type BrokerEvent<W extends WorkerControl<any, any, any, any> = WorkerControl> = {
  workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, action$FromWorker: W['o'], skipped: boolean): void;
  newWorkerReady(workerNo: number, action$FromWorker: W['o'], workerInput: W['i']): void;
  workerInputs(byWorkerNo: Map<number, W['i']>): void;
  onWorkerError(workerNo: number, error: unknown, type?: string): void;
  onWorkerExit(workerNo: number, exitCode: number): void;
  onAllWorkerExit(): void;
  assignWorker(): void;
  portOfWorker(map: Map<Worker | NodeWorker, MessagePort | NodeMessagePort>): void;
};
