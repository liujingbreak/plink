import type {Worker as NodeWorker, MessagePort as NodeMessagePort} from 'node:worker_threads';
import * as rx from 'rxjs';
// import {ActionTypes, ActionStreamControl} from '@wfh/redux-toolkit-observable/es/rx-utils';

export type PluginActions = {
  /** called by pool */
  pluginDoInitWorker(
    workerNo: number, worker: Worker | NodeWorker, actionOfWorker$: rx.Subject<any>): void;
  pluginDoneInitWorker(workerNo: number, parentPort: MessagePort | NodeMessagePort): void;

  /** called by worker */
  pluginWorkerOnInit(): void;
  pluginWorkerDoneInit(workerNo: number, parentPort: MessagePort | NodeMessagePort): void;
  pluginWorkerOnDestory(): void;
  pluginCreateReturnPort(workerNo: number, cb: (port2: MessagePort | NodeMessagePort) => void): void;
  pluginPostMsgTo(parentPort: MessagePort | NodeMessagePort, content: any, transferable?: any[]): void;
  pluginOnError(workerNo: number, err: Error): void;
};

export type RecursiveTaskActions<R extends RecursiveFuncs> = {
  waitForJoin(): void;
  setForkActions(functions: R): void;
  fork<K extends keyof R>(
    funcKey: K,
    param: Parameters<R[K]>,
    onReturn: (result: ReturnType<R[K]>) => void
  ): void;
};

export type RecursiveFuncs = Record<string, (...params: any[]) => Promise<any>>;

export type RecursiveFunction<T = any, R = any> = (data: T) => Promise<R>;

/** Dispatched by pool or forked worker */
export type WorkerEvent = {
  onForkedFor( returnPort: MessagePort | NodeMessagePort, callerWorkerNo: number, actionObject: {p: [id: string]; t: string}): void;
};

export type ForkWorkerPoolActions = {
  tellPoolReturned(returnWorkerNo: number): void;
  fork(returnPort: MessagePort | NodeMessagePort, fromWorker: number, funcKey: string, params: any[]): void;
};

