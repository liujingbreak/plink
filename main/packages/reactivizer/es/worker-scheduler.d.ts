/// <reference types="node" />
import type { Worker as NodeWorker } from 'node:worker_threads';
import { Broker } from './types';
export declare function apply(broker: Broker, opts: {
    maxNumOfWorker: number;
    workerFactory(): Worker | NodeWorker;
}): void;
