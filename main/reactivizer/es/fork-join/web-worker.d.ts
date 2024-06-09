import * as rx from 'rxjs';
import { ActionFunctions } from '../control';
import { SimplexReactor } from '../simplex-reactor';
import { ActionFactoryOfPlainType, SimplexReactorMergeOptions } from '../inferred-types';
import { SimplexReactorOptions } from '../reactor-base';
import { ForkWorkerInput, ForkWorkerOutput, WorkerControl, workerActionTableFor } from './types';
export { setIdleDuring } from './common';
export { WorkerControl } from './types';
export declare function createWorkerControl<I = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly []>(isInWorker: boolean, opts?: SimplexReactorMergeOptions<SimplexReactor<ForkWorkerInput & ForkWorkerOutput, typeof workerActionTableFor>, SimplexReactor<I, LI>>): WorkerControl<I, LI>;
export type WebForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort)[];
};
export declare function createWorkerControlOfFn<F extends ActionFunctions>(recursiveFuncs: F, isInWorker: boolean, opts?: SimplexReactorOptions<any, any>): WorkerControl<{ [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => import("..").SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => import("..").SingleActionFactory; } & ActionFactoryOfPlainType<F>>;
