import type {Worker as NodeWorker, MessagePort as NodeMessagePort} from 'worker_threads';
import {ReactorComposite} from '../epic';
import {Action, ActionFunctions, RxController} from '../control';

export type Broker<WA extends ActionFunctions = Record<string, never>> = ReactorComposite<BrokerInput, BrokerEvent & WA>;

export type ForkWorkerInput = {
  exit(): void;
  onFork(targetAction: Action<any>, port: NodeMessagePort | MessagePort): void;
};

export type ForkWorkerOutput = {
  workerInited(workerNo: string | number, logPrefix: string): void;
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

export type BrokerEvent = {
  workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, action$FromWorker: RxController<ForkWorkerOutput>, skipped: boolean): void;
  newWorkerReady(workerNo: number, action$FromWorker: RxController<ForkWorkerOutput>): void;
  onWorkerError(workerNo: number, error: unknown, type?: string): void;
  onWorkerExit(workerNo: number, exitCode: number): void;
  onAllWorkerExit(): void;
  assignWorker(): void;
};
