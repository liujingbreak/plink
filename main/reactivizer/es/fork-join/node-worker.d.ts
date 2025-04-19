import type { promises as fsPromises } from 'node:fs';
import type { X509Certificate } from 'node:crypto';
import type { Blob } from 'node:buffer';
import { MessagePort } from 'worker_threads';
import { ActionFunctions } from '../control';
import { InferFuncReturnEvents, ActionFactoryOfPlainType } from '../inferred-types';
import { SimplexReactorCfgOpts } from '../reactor-base';
import { ForkWorkerInput, ForkWorkerOutput, WorkerControl } from './types';
export { setIdleDuring } from './common';
export { WorkerControl } from './types';
/**
 * @param opts.log if value is `undefined` and current createWorkerControl() is for creating instance in a forked thread, by default log messages will
 * be transfered to main worker thread, but message will be trimmed by `util.inspect(..., {depth: 1, showHidden: false})`.
 */
export declare function createWorkerControl<I = Record<string, never>, LI extends readonly (keyof I)[] = readonly []>(opts?: SimplexReactorCfgOpts<ForkWorkerInput & ForkWorkerOutput, I, LI>): WorkerControl<I, LI>;
export interface ForkTransferablePayload<T = unknown> {
    content: T;
    transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
}
export declare function createWorkerControlOfFn<F extends ActionFunctions, LI extends (keyof ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>)[]>(recursiveFuncs: F, opts?: SimplexReactorCfgOpts<ForkWorkerInput & ForkWorkerOutput, ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, LI>): WorkerControl<ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>>;
