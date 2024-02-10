/// <reference types="node" />
import type { Worker as NodeWorker, MessagePort as NodeMessagePort } from 'worker_threads';
import * as rx from 'rxjs';
import { Action, InferPayload } from '../control';
import { SingleActionFactory } from '../control2';
import { ReactorCompositeMergeType2 } from '../inferred-types';
import { ReactorComposite2 } from '../reactor-composite';
export declare const brokerOutputTableFor: readonly ["newWorkerReady", "assignWorker"];
export type Broker<WI = Record<never, never>, WO = Record<never, never>> = ReactorComposite2<BrokerInput, BrokerEvent<WI, WO>, [], typeof brokerOutputTableFor>;
export type ForkWorkerInput = {
    exit(): SingleActionFactory;
    onFork(targetAction: Action<any>, port: NodeMessagePort | MessagePort): SingleActionFactory;
    /** set actions which are supposed to be sent to parent main thread by "messagePort.postMessage()",
     * consumer program should subscribe to `broker`'s outputTable.l.newWorkerReady to obtain lifted RxController
     * to dispatch or observe actions directly to or from worker threads
     */
    setLiftUpActions(action$: rx.Observable<Action<any>>): SingleActionFactory;
};
export interface ForkWorkerOutput<I = Record<string, any>> {
    workerInited(workerNo: string | number, logPrefix: string, mainWorkerPort: MessagePort | NodeMessagePort | null): SingleActionFactory;
    fork<K extends string & keyof I>(actionName: K & string, ...params: InferPayload<I[K]>): SingleActionFactory;
    /** Informs broker that current step is waiting on forked function returns*/
    wait(): SingleActionFactory;
    /** Informs broker that current function step is be awake and continue on other instructions */
    stopWaiting(): SingleActionFactory;
    returned(): SingleActionFactory;
    log(...obj: any[]): SingleActionFactory;
    warn(...obj: any[]): SingleActionFactory;
    /** broker implementation should react to this event*/
    forkByBroker(targetAction: Action<any>, messagePort: NodeMessagePort | MessagePort): SingleActionFactory;
}
export declare const workerInputTableFor: readonly ["setLiftUpActions", "exit"];
export declare const workerOutputTableFor: readonly ["workerInited", "log", "warn"];
export type WorkerControl<I = Record<never, never>, O = Record<never, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []> = ReactorCompositeMergeType2<ReactorComposite2<ForkWorkerInput, ForkWorkerOutput<I>, typeof workerInputTableFor, typeof workerOutputTableFor>, I, O, LI, LO>;
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
export type BrokerEvent<I = Record<never, never>, O = Record<never, never>> = {
    workerInited(workerNo: number, newPort: MessagePort | NodeMessagePort | null, action$FromWorker: WorkerControl<I, O>['o'], skipped: boolean): SingleActionFactory;
    newWorkerReady(workerNo: number, action$FromWorker: WorkerControl<I, O>['o'], workerInput: WorkerControl<I, O>['i']): SingleActionFactory;
    onWorkerError(workerNo: number, error: unknown, type?: string): SingleActionFactory;
    onWorkerExit(workerNo: number, exitCode: number): SingleActionFactory;
    onAllWorkerExit(): SingleActionFactory;
    assignWorker(): SingleActionFactory;
    workerRankChanged(workerNo: number, value: number): SingleActionFactory;
};
export type ThreadExpirationEvents = {
    startExpirationTimer(workerNo: number): SingleActionFactory;
    clearExpirationTimer(workerNo: number): SingleActionFactory;
};
