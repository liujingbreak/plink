/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { MessagePort } from 'worker_threads';
import { ActionFunctions, InferPayload } from '../control';
import { ReactorComposite, ReactorCompositeOpt } from '../epic';
import { ForkWorkerInput, ForkWorkerOutput } from './types';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>>(opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I & O>): ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O>;
export declare function fork<I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends keyof I = `${K}Resolved`>(comp: ReactorComposite<I, O>, actionName: K & string, params: InferPayload<I[K]>, resActionName?: R): Promise<InferPayload<I[R]>[0]>;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
