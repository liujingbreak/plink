/// <reference types="node" />
import type { Worker as NodeWorker, MessagePort as NodeMessagePort } from 'worker_threads';
import { Action, ActionFunctions } from './control';
import { Broker } from './node-worker-broker';
export type ForkWorkerInput = {
    exit(): void;
    fork(targetAction: Action<any>, messagePort?: NodeMessagePort): void;
};
export type ForkWorkerOutput<I extends ActionFunctions = ActionFunctions> = {
    fork: ForkWorkerInput['fork'];
    returnFork<K extends keyof I>(ForkId: Action<any>['i'], type: K, ...result: Parameters<I[K]>): void;
    brokerCreated(broker: Broker<I>): void;
    /** Informs broker that current step is waiting on forked function returns*/
    wait(): void;
    /** Informs broker that current function step is be awake and continue on other instructions */
    stopWaiting(): void;
    log(...obj: any[]): void;
    warn(...obj: any[]): void;
};
export type BrokerInput = {
    onWorkerWait(workerNo: number): void;
    onWorkerAwake(workerNo: number): void;
    ensureInitWorker(workerNo: number, worker: Worker | NodeWorker): void;
    /** Send message to worker to stop all event listerners on it */
    letWorkerExit(worker: Worker | NodeWorker): void;
    fork: ForkWorkerOutput<any>['fork'];
    workerAssigned(worketNo: number, worker: Worker | NodeWorker | 'main'): void;
};
export type BrokerEvent = {
    workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, skipped: boolean): void;
    onWorkerError(workerNo: number, error: unknown): void;
    onWorkerExit(workerNo: number, initId: Action<any, string>['i']): void;
    assignWorker(): void;
    actionFromWorker(action: Action<ForkWorkerOutput>, workerNo: number): void;
};
