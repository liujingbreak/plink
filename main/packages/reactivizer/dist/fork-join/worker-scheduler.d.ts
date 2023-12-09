/// <reference types="node" />
import type { Worker as NodeWorker } from 'node:worker_threads';
import { Broker, WorkerControl } from './types';
export declare function applyScheduler<W extends WorkerControl<any, any, any, any>>(broker: Broker<W>, opts: {
    maxNumOfWorker: number;
    /** Default `false`, in which case the current thread (main) will also be assigned for tasks */
    excludeCurrentThead?: boolean;
    /** Once forked thread has become idle for specific milliseconds,
    * let worker thread (or web worker) "exit" (unsubscribed from parent port),
    * value of `undefined` stands for "never expired"
    */
    threadMaxIdleTime?: number;
    workerFactory(): Worker | NodeWorker;
}): Map<number, [worker: NodeWorker | Worker | "main", rank: number]>;
