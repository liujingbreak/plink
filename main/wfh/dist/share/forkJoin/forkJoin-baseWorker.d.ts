/// <reference types="node" />
import type { Worker as NodeWorker, MessagePort as NodeMessagePort } from 'node:worker_threads';
import * as rx from 'rxjs';
import { createActionStreamByType, ActionStreamControl, ActionTypes } from '@wfh/redux-toolkit-observable/es/rx-utils';
export type PluginActions = {
    /** called by pool */
    pluginDoInitWorker(workerNo: number, worker: Worker | NodeWorker, actionOfWorker$: rx.Subject<any>): void;
    pluginDoneInitWorker(workerNo: number, parentPort: MessagePort | NodeMessagePort): void;
    /** called by worker */
    pluginWorkerOnInit(): void;
    pluginWorkerDoneInit(workerNo: number, parentPort: MessagePort | NodeMessagePort): void;
    pluginWorkerOnDestory(): void;
    pluginCreateReturnPort(workerNo: number): void;
    pluginDoneCreateReturnPort(port2: MessagePort | NodeMessagePort): void;
    pluginPostMsgTo(parentPort: MessagePort | NodeMessagePort, content: any, transferable?: any[]): void;
    pluginOnError(workerNo: number, err: Error): void;
};
export type RecursiveTaskActions<A extends Record<string, (...a: any[]) => void> = Record<string, never>> = {
    waitForJoin(): void;
    setForkActions(action$s: rx.Observable<ActionTypes<A>[keyof A]>[]): void;
    setReturnActions(action$s: rx.Observable<ActionTypes<A>[keyof A]>[]): void;
    tellPoolReturned(returnWorkerNo: number): void;
    onJoinReturn(actionObject: ActionTypes<A>[keyof A]): void;
    getShareData(key: string): void;
    putShareData(key: string, data: unknown): void;
    removeShareData(key: string): void;
};
/** Dispatched by pool or forked worker */
export type WorkerEvent = {
    onForkedFor(returnPort: MessagePort | NodeMessagePort, callerWorkerNo: number, actionObject: {
        p: [id: string];
        t: string;
    }): void;
};
export type ForkWorkerPoolActions = {
    fork(returnPort: MessagePort | NodeMessagePort, fromWorker: number, action: any): void;
};
export declare function createControlForMain<A extends Record<string, (...payload: any[]) => void> = Record<string, never>>([plugin, casbt]: readonly [ActionStreamControl<PluginActions>, typeof createActionStreamByType], workerFactory: () => Worker | NodeWorker, opts: {
    concurrent: number;
} & NonNullable<Parameters<typeof createActionStreamByType>[0]>, epic: (controller: ActionStreamControl<A & RecursiveTaskActions<A>>, workerNo: number) => rx.Observable<any>): () => void;
export declare function createControlForWorker<A extends Record<string, (...payload: any[]) => void> = Record<string, never>>(plugin: readonly [ActionStreamControl<PluginActions>, typeof createActionStreamByType], opts: NonNullable<Parameters<typeof createActionStreamByType>[0]>, epic: (controller: ActionStreamControl<A & RecursiveTaskActions<A>>, workerNo: number) => rx.Observable<any>): () => void;
