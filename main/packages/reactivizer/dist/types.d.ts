/// <reference types="node" />
import type { Worker as NodeWorker, MessagePort as NodeMessagePort } from 'worker_threads';
import { Action, ActionFunctions } from './control';
import { Broker } from './node-worker-broker';
export type ForkWorkerInput = {
    exit(): void;
    fork(targetAction: Action<any>, messagePort?: NodeMessagePort): void;
};
export type ForkWorkerOutput<I extends ActionFunctions> = {
    fork: ForkWorkerInput['fork'];
    returnFork<K extends keyof I>(ForkId: Action<any>['i'], type: K, ...result: Parameters<I[K]>): void;
    brokerCreated(broker: Broker<I>): void;
};
export type BrokerInput = {
    ensureInitWorker(workerNo: number, worker: Worker | NodeWorker): void;
    /** Send message to worker to stop all event listerners on it */
    letWorkerExit(worker: Worker | NodeWorker): void;
    fork: ForkWorkerOutput<any>['fork'];
    workerAssigned(assignId: Action<any>['i'], worketNo: number, worker: Worker | NodeWorker | 'main'): void;
};
export type BrokerEvent = {
    workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, initId: Action<any, string>['i'], skipped: boolean): void;
    onWorkerError(workerNo: number, error: any): void;
    onWorkerExit(workerNo: number, initId: Action<any, string>['i']): void;
    assignWorker(): void;
};
