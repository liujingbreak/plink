/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { MessagePort } from 'worker_threads';
import { ReactorCompositeOpt } from '../epic';
import { ForkWorkerInput, ForkWorkerOutput, WorkerControl } from './types';
export { fork, setIdleDuring } from './common';
export { WorkerControl } from './types';
/**
 * @param opts.log if value is `undefined` and current createWorkerControl() is for creating instance in a forked thread, by default log messages will
 * be transfered to main worker thread, but message will be trimmed by `util.inspect(..., {depth: 1, showHidden: false})`.
 */
export declare function createWorkerControl<I = Record<string, never>, O = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I, ForkWorkerOutput & O>): WorkerControl<I, O, LI, LO>;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
