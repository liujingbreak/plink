/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { MessagePort } from 'worker_threads';
import * as rx from 'rxjs';
import { ActionFunctions } from './control';
import { ReactorComposite } from './epic';
import { ForkWorkerInput, ForkWorkerOutput } from './types';
import { DuplexOptions } from './duplex';
export declare function createWorkerControl<I extends ActionFunctions = ActionFunctions>(opts?: DuplexOptions<ForkWorkerInput & ForkWorkerOutput<I>>): ReactorComposite<I & ForkWorkerInput, ForkWorkerOutput<I>>;
export declare function reativizeRecursiveFuncs<I extends ActionFunctions, O extends ActionFunctions, F extends {
    [s: string]: (...a: any[]) => any;
}>(ctx: ReactorComposite<I, O>, fObject: F): ReactorComposite<{ [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & I & F, { [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & O>;
export type ForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};
