/// <reference types="node" />
import type { Worker as NodeWorker } from 'node:worker_threads';
import { Broker, WorkerControl } from './types';
export declare function applyScheduler<W extends WorkerControl<any, any, any, any>>(broker: Broker<W>, opts: {
    maxNumOfWorker: number;
    /** Default `false`, in which case the current thread (main) will also be assigned for tasks */
    excludeCurrentThead?: boolean;
    workerFactory(): Worker | NodeWorker;
}): Map<number, [worker: Worker | NodeWorker | "main", rank: number]>;
