import { ActionFunctions } from '../control';
import { ReactorCompositeOpt } from '../epic';
import { ForkWorkerInput, ForkWorkerOutput, WorkerControl } from './types';
export { fork, setIdleDuring } from './common';
export { WorkerControl } from './types';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends ReadonlyArray<keyof I> = readonly [], LO extends ReadonlyArray<keyof O> = readonly []>(isInWorker: boolean, opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I, ForkWorkerOutput & O>): WorkerControl<I, O, LI, LO>;
export type WebForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort)[];
};
