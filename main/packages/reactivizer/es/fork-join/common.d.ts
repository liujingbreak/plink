import { ActionMeta, ActionFunctions, InferPayload } from '../control';
import { ReactorComposite } from '../epic';
/**
 * @param returnedActionName the name of action that is observed as "returned" message from forked worker, default is `${actionName}Resolved`
 */
export declare function fork<I extends ActionFunctions, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(comp: ReactorComposite<I, any, any, any>, actionName: K & string, params: InferPayload<I[K]>, returnedActionName?: R, relatedToAction?: ActionMeta): Promise<[...InferPayload<I[R]>]>;
