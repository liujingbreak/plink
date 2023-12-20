/// <reference types="node" />
import type { Worker as NodeWorker, MessagePort as NodeMessagePort } from 'worker_threads';
import * as rx from 'rxjs';
import { ReactorComposite, ReactorCompositeMergeType } from '../epic';
import { Action } from '../control';
export declare const brokerOutputTableFor: readonly ["newWorkerReady", "assignWorker"];
export type Broker<WI = Record<never, never>, WO = Record<never, never>> = ReactorComposite<BrokerInput, BrokerEvent<WI, WO>, [], typeof brokerOutputTableFor>;
export type ForkWorkerInput = {
    exit(): void;
    onFork(targetAction: Action<any>, port: NodeMessagePort | MessagePort): void;
    /** set actions which are supposed to be sent to parent main thread by "messagePort.postMessage()",
     * consumer program should subscribe to `broker`'s outputTable.l.newWorkerReady to obtain lifted RxController
     * to dispatch or observe actions directly to or from worker threads
     */
    setLiftUpActions(action$: rx.Observable<Action<any>>): void;
};
export type ForkWorkerOutput = {
    workerInited(workerNo: string | number, logPrefix: string, mainWorkerPort: MessagePort | NodeMessagePort | null): void;
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
export declare const workerInputTableFor: readonly ["setLiftUpActions", "exit"];
export declare const workerOutputTableFor: readonly ["workerInited", "log", "warn"];
export type WorkerControl<I = Record<never, never>, O = Record<never, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []> = ReactorCompositeMergeType<ReactorComposite<ForkWorkerInput, ForkWorkerOutput, typeof workerInputTableFor, typeof workerOutputTableFor>, I, O, LI, LO>;
export type BrokerInput = {
    ensureInitWorker(workerNo: number, worker: Worker | NodeWorker): void;
    /** Send message to worker to stop all event listerners on it */
    letWorkerExit(workerNo: number): void;
    /** Since Web worker doesn't have "close" event, there is no way currently this ca
     * work in web browser
     */
    letAllWorkerExit(): void;
    workerAssigned(worketNo: number, worker: Worker | NodeWorker | 'main'): void;
};
export type BrokerEvent<I = Record<never, never>, O = Record<never, never>> = {
    workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, action$FromWorker: WorkerControl<I, O>['o'], skipped: boolean): void;
    newWorkerReady(workerNo: number, action$FromWorker: WorkerControl<I, O>['o'], workerInput: WorkerControl<I, O>['i']): void;
    onWorkerError(workerNo: number, error: unknown, type?: string): void;
    onWorkerExit(workerNo: number, exitCode: number): void;
    onAllWorkerExit(): void;
    assignWorker(): void;
    workerRankChanged(workerNo: number, value: number): void;
};
export type ThreadExpirationEvents = {
    startExpirationTimer(workerNo: number): void;
    clearExpirationTimer(workerNo: number): void;
};
