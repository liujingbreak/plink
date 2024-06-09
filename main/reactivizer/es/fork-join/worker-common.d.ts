/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { MessagePort } from 'worker_threads';
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { SimplexReactor } from '../simplex-reactor';
import { ForkWorkerInput, ForkWorkerOutput, workerActionTableFor } from './types';
export declare function applySharedReactors(isMainWorker: boolean, comp: SimplexReactor<ForkWorkerInput & ForkWorkerOutput, typeof workerActionTableFor>, log: (...a: any[]) => any): void;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
