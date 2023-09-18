/// <reference types="node" />
import type { Worker as NodeWorker, MessagePort as NodeMessagePort } from 'worker_threads';
import { ReactorComposite } from './epic';
import { Action, ActionFunctions } from './control';
export type Broker<WA extends ActionFunctions = Record<string, never>> = ReactorComposite<BrokerInput, BrokerEvent & WA>;
export type ForkWorkerInput = {
    exit(): void;
    onFork(targetAction: Action<any>, port: NodeMessagePort): void;
};
export type ForkWorkerOutput = {
    fork(targetAction: Action<any>): void;
    /** Informs broker that current step is waiting on forked function returns*/
    wait(): void;
    /** Informs broker that current function step is be awake and continue on other instructions */
    stopWaiting(): void;
    log(...obj: any[]): void;
    warn(...obj: any[]): void;
    /** broker implementation should react to this event*/
    forkByBroker(targetAction: Action<any>, messagePort: NodeMessagePort): void;
};
export type BrokerInput = {
    onWorkerWait(workerNo: number): void;
    onWorkerAwake(workerNo: number): void;
    ensureInitWorker(workerNo: number, worker: Worker | NodeWorker): void;
    /** Send message to worker to stop all event listerners on it */
    letWorkerExit(worker: Worker | NodeWorker): void;
    letAllWorkerExit(): void;
    forkFromWorker(workerNo: number, targetAction: Action<any>, messagePort: NodeMessagePort): void;
    workerAssigned(worketNo: number, worker: Worker | NodeWorker | 'main'): void;
};
export type BrokerEvent = {
    workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, skipped: boolean): void;
    onWorkerError(workerNo: number, error: unknown): void;
    onWorkerExit(workerNo: number, exitCode: number): void;
    onAllWorkerExit(): void;
    assignWorker(): void;
    actionFromWorker(action: Action<ForkWorkerOutput>, workerNo: number): void;
};
