/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { MessagePort } from 'worker_threads';
import { ActionFunctions } from '../control';
import { ReactorCompositeOpt } from '../epic';
import { ForkWorkerInput, ForkWorkerOutput, WorkerControl } from './types';
export { fork } from './common';
export { WorkerControl } from './types';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I & O>): WorkerControl<I, O, LI, LO>;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
