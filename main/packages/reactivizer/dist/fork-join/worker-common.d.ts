/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { MessagePort } from 'worker_threads';
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { ReactorComposite2 } from '..';
import { ForkWorkerInput, ForkWorkerOutput, workerInputTableFor as inputTableFor, workerOutputTableFor as outputTableFor } from './types';
export declare function applySharedReactors(isMainWorker: boolean, comp: ReactorComposite2<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>, log: (...a: any[]) => any): void;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
