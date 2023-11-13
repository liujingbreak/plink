import { ActionFunctions, InferPayload } from '../control';
import { ReactorComposite, ReactorCompositeOpt } from '../epic';
import { ForkWorkerInput, ForkWorkerOutput } from './types';
export declare function createWorkerControl<I extends ActionFunctions = Record<string, never>>(isInWorker: boolean, opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput>): ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput>;
export declare function fork<I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends keyof I = `${K}Resolved`>(comp: ReactorComposite<I, O>, actionType: K & string, params: InferPayload<I[K]>, resActionType?: R): Promise<InferPayload<I[R]>[0]>;
export type WebForkTransferablePayload<T = unknown> = {
    content: T;
    transferList: (ArrayBuffer | MessagePort)[];
};
