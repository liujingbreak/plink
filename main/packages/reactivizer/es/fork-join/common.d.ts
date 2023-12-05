import { ActionMeta, ActionFunctions, InferPayload } from '../control';
import { ReactorComposite } from '../epic';
export declare function fork<I extends ActionFunctions, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(comp: ReactorComposite<I, any, any, any>, actionName: K & string, params: InferPayload<I[K]>, returnedActionName?: R, relatedToAction?: ActionMeta): Promise<[...InferPayload<I[R]>]>;
