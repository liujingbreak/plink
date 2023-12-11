import * as rx from 'rxjs';
import {ActionMeta, ActionFunctions, RxController,
  actionRelatedToAction, InferPayload} from '../control';
import {ReactorComposite} from '../epic';
import {ForkWorkerOutput} from './types';

/**
 * @param returnedActionName the name of action that is observed as "returned" message from forked worker, default is `${actionName}Resolved`
 */
export function fork<I extends ActionFunctions, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(
  comp: ReactorComposite<I, any, any, any>,
  actionName: K & string,
  params: InferPayload<I[K]>,
  returnedActionName?: R,
  relatedToAction?: ActionMeta
): Promise<[...InferPayload<I[R]>]> {
  const forkedAction = comp.o.createAction(actionName, ...params);
  if (relatedToAction)
    forkedAction.r = relatedToAction.i;

  const forkDone = rx.firstValueFrom((returnedActionName ? comp.i.at[returnedActionName] : comp.i.at[actionName + 'Resolved']).pipe(
    actionRelatedToAction(forkedAction),
    rx.map(a => a.p)
  ));
  if (relatedToAction)
    (comp.o as unknown as RxController<ForkWorkerOutput>).dpf.fork(relatedToAction, forkedAction);
  else
    (comp.o as unknown as RxController<ForkWorkerOutput>).dp.fork(forkedAction);
  return forkDone;
}

