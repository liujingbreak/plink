/// <reference types="node" />
import type { Worker as NodeWorker } from 'node:worker_threads';
import { Broker } from './types';
export declare function applyScheduler(broker: Broker, opts: {
    maxNumOfWorker: number;
    workerFactory(): Worker | NodeWorker;
}): Map<number, [worker: NodeWorker | Worker, rank: number]>;
