import * as rx from 'rxjs';
import { payloadRelatedToAction } from '../control';
export function fork(comp, actionName, params, returnedActionName, relatedToAction) {
    const forkedAction = comp.o.createAction(actionName, ...params);
    if (relatedToAction)
        forkedAction.r = relatedToAction.i;
    const forkDone = rx.firstValueFrom((returnedActionName ? comp.i.pt[returnedActionName] : comp.i.pt[actionName + 'Resolved']).pipe(payloadRelatedToAction(forkedAction), rx.map(([, ...p]) => p)));
    if (relatedToAction)
        comp.o.dpf.fork(relatedToAction, forkedAction);
    else
        comp.o.dp.fork(forkedAction);
    return forkDone;
}
//# sourceMappingURL=common.js.map