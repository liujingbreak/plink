import * as rx from 'rxjs';
import { ActionFunctions } from '../control';
import { ReactorCompositeOpt } from '..';
import { InferFuncReturnEvents, ActionFactoryOfPlainType } from '../inferred-types';
import { ForkWorkerInput, ForkWorkerOutput, WorkerControl } from './types';
export { setIdleDuring } from './common';
export { WorkerControl } from './types';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(isInWorker: boolean, opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I, ForkWorkerOutput & O>): WorkerControl<I, O, LI, LO>;
export type WebForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort)[];
};
export declare function createWorkerControlOfFn<F extends ActionFunctions>(recursiveFuncs: F, isInWorker: boolean, opts?: ReactorCompositeOpt<any, any>): WorkerControl<{ [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => import("..").SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => import("..").SingleActionFactory; } & ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F>>;
