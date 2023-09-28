/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { MessagePort } from 'worker_threads';
import * as rx from 'rxjs';
import { ActionFunctions, InferPayload } from './control';
import { ReactorComposite } from './epic';
import { ForkWorkerInput, ForkWorkerOutput } from './types';
import { DuplexOptions } from './duplex';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>>(opts?: DuplexOptions<ForkWorkerInput & ForkWorkerOutput>): ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput>;
export declare function reativizeRecursiveFuncs<I extends ActionFunctions, O extends ActionFunctions, F extends {
    [s: string]: (...a: any[]) => any;
}>(comp: ReactorComposite<I, O>, fObject: F): ReactorComposite<{ [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & I & F, { [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & O>;
export declare function fork<I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends keyof I = `${K}Resolved`>(comp: ReactorComposite<I, O>, actionType: K & string, params: InferPayload<I[K]>, resActionType?: R): Promise<InferPayload<I[R]>[0]>;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
