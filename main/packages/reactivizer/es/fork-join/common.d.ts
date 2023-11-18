import { ActionMeta, ActionFunctions, InferPayload } from '../control';
import { ReactorComposite } from '../epic';
import { ForkWorkerOutput } from './types';
export declare function fork<I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(comp: ReactorComposite<I, O, any, any>, actionName: K & string, params: InferPayload<I[K]>, returnedActionName?: R, relatedToAction?: ActionMeta): Promise<[...InferPayload<I[R]>]>;
