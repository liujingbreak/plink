import * as rx from 'rxjs';
import { assignActionReferParam } from './stream-core';
import { actionRelatedToAction } from './context-operators';
import { timeoutLog } from './utils';
export class SingleActionFactoryImpl {
    constructor(type, payload, control, opts = { slowDispatchObservableTime: 20000 }) {
        this.type = type;
        this.payload = payload;
        this.control = control;
        this.opts = opts;
    }
    /** Make this action become related to another action message
     */
    re(...actionMeta) {
        this.relateToAction = actionMeta;
        return this;
    }
    dp(...actionMetaRelated) {
        const metas = actionMetaRelated.filter(m => m != null);
        if (metas.length > 0)
            return this.control.dispatchForFactory(this.type)(metas.length > 1 ? metas : metas[0], ...this.payload);
        else if (this.relateToAction && this.relateToAction.length > 0)
            return this.control.dispatchForFactory(this.type)(this.relateToAction.length > 1 ? this.relateToAction : this.relateToAction[0], ...this.payload);
        else
            return this.control.dispatchFactory(this.type)(...this.payload);
    }
    do(response$, referAction) {
        const action = this.control.createAction(this.type, this.payload);
        if (referAction) {
            assignActionReferParam(action, referAction);
        }
        else if (this.relateToAction && this.relateToAction.length > 0) {
            assignActionReferParam(action, this.relateToAction);
        }
        const r$ = new rx.ReplaySubject(1);
        this.ddo(response$, referAction).subscribe(r$);
        return r$.asObservable();
    }
    ddo(response$, referAction) {
        return new rx.Observable(sub => {
            const action = this.control.createAction(this.type, this.payload);
            if (referAction) {
                assignActionReferParam(action, referAction);
            }
            else if (this.relateToAction && this.relateToAction.length > 0) {
                assignActionReferParam(action, this.relateToAction);
            }
            sub.next(action);
            sub.complete();
        }).pipe(rx.mergeMap(action => {
            var _a;
            return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => response$.pipe(operator(action), actionRelatedToAction(action)
            // mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...P]>,
            // rx.take(1)
            )), timeoutLog((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, 
            // eslint-disable-next-line no-console
            this.opts.slowLog ? () => this.opts.slowLog(action) : () => console.log('Slow observable action detected'))), new rx.Observable(sub => {
                this.control.actionUpstream.next(action);
                sub.complete();
            }));
        }));
    }
    od(response, ...moreResponses) {
        if (moreResponses.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this.ddo(response);
        }
        else {
            const responses = [response, ...moreResponses];
            const action = this.control.createAction(this.type, this.payload);
            if (this.relateToAction && this.relateToAction.length > 0) {
                assignActionReferParam(action, this.relateToAction);
            }
            // when all the returned streams are subscribed, dispatch the new action
            const onSubscribe$ = new rx.Subject();
            onSubscribe$.pipe(rx.distinct(), rx.take(responses.length)).subscribe({
                complete: () => {
                    this.control.actionUpstream.next(action);
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return responses.map((res$, idx) => {
                var _a;
                return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => res$.pipe(operator(action), actionRelatedToAction(action)
                // mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...any[]]>,
                // rx.take(1)
                )), timeoutLog((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, 
                // eslint-disable-next-line no-console
                this.opts.slowLog ? () => this.opts.slowLog(action) : () => console.log('Slow observable action detected'))), new rx.Observable(sink => {
                    onSubscribe$.next(idx);
                    sink.complete();
                }));
            });
        }
    }
}
//# sourceMappingURL=action-factory.js.map