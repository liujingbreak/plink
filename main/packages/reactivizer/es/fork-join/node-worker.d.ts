/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { MessagePort } from 'worker_threads';
import * as rx from 'rxjs';
import { ActionFunctions, InferPayload, InferMapParam } from '../control';
import { ReactorComposite, ReactorCompositeOpt } from '../epic';
import { ForkWorkerInput, ForkWorkerOutput } from './types';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I & O>): ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, readonly ("exit" | LI[number])[], readonly ("workerInited" | "log" | "warn" | LO[number])[]>;
export declare function fork<I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(comp: ReactorComposite<I, O, any, any>, actionName: K & string, params: InferPayload<I[K]>, responseAction$?: rx.Observable<InferMapParam<I, R>>): Promise<[...InferPayload<I[R]>]>;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
