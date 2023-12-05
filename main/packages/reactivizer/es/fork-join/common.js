import * as rx from 'rxjs';
import { actionRelatedToAction } from '../control';
export function fork(comp, actionName, params, returnedActionName, relatedToAction) {
    const forkedAction = comp.o.createAction(actionName, ...params);
    if (relatedToAction)
        forkedAction.r = relatedToAction.i;
    const forkDone = rx.firstValueFrom((returnedActionName ? comp.i.at[returnedActionName] : comp.i.at[actionName + 'Resolved']).pipe(actionRelatedToAction(forkedAction), rx.map(a => a.p)));
    if (relatedToAction)
        comp.o.dpf.fork(relatedToAction, forkedAction);
    else
        comp.o.dp.fork(forkedAction);
    return forkDone;
}
//# sourceMappingURL=common.js.map