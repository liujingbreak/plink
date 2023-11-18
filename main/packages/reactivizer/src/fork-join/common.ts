import * as rx from 'rxjs';
import {ActionMeta, ActionFunctions, RxController,
  payloadRelatedToAction, InferPayload} from '../control';
import {ReactorComposite} from '../epic';
import {ForkWorkerOutput} from './types';

export function fork<I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends string & keyof I = `${K}Resolved`>(
  comp: ReactorComposite<I, O, any, any>,
  actionName: K & string,
  params: InferPayload<I[K]>,
  returnedActionName?: R,
  relatedToAction?: ActionMeta
): Promise<[...InferPayload<I[R]>]> {
  const forkedAction = comp.o.createAction(actionName, ...params);
  if (relatedToAction)
    forkedAction.r = relatedToAction.i;

  const forkDone = rx.firstValueFrom((returnedActionName ? comp.i.pt[returnedActionName] : comp.i.pt[actionName + 'Resolved']).pipe(
    payloadRelatedToAction(forkedAction),
    rx.map(([, ...p]) => p)
  ));
  if (relatedToAction)
    (comp.o as unknown as RxController<ForkWorkerOutput>).dpf.fork(relatedToAction, forkedAction);
  else
    (comp.o as unknown as RxController<ForkWorkerOutput>).dp.fork(forkedAction);
  return forkDone;
}

