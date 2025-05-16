import { ActionFunctions } from '../control';
import { InferFuncReturnEvents, ActionFactoryOfPlainType } from '../inferred-types';
import { SimplexReactorCfgOpts } from '../reactor-base';
import { ForkWorkerInput, ForkWorkerOutput, WorkerControl } from './types';
export { setIdleDuring } from './common';
export { WorkerControl } from './types';
export declare function createWorkerControl<I = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly []>(isInWorker: boolean, opts?: SimplexReactorCfgOpts<ForkWorkerInput & ForkWorkerOutput, I, LI>): WorkerControl<I, LI>;
export type WebForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort)[];
};
export declare function createWorkerControlOfFn<F extends ActionFunctions, LI extends (keyof ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>)[]>(recursiveFuncs: F, isInWorker: boolean, opts?: SimplexReactorCfgOpts<ForkWorkerInput & ForkWorkerOutput, ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, LI>): WorkerControl<ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>>;
