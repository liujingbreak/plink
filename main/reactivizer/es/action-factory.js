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
        this.dispatched = false;
        this.action = control.createAction(type, payload);
    }
    /** Make this action become related to another action message
     */
    re(...actionMeta) {
        this.relateToAction = actionMeta;
        return this;
    }
    dp(...actionMetaRelated) {
        if (this.dispatched) {
            throw new Error('Message has already been dispatched');
        }
        const metas = actionMetaRelated.filter(m => m != null);
        const s = this.control.actionUpstream;
        assignActionReferParam(this.action, this.relateToAction && this.relateToAction.length > 0 ?
            this.relateToAction.concat(metas) :
            metas);
        s.next(this.action);
        this.dispatched = true;
        return this.action;
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
        const action = this.action;
        if (referAction) {
            assignActionReferParam(action, referAction);
        }
        else if (this.relateToAction && this.relateToAction.length > 0) {
            assignActionReferParam(action, this.relateToAction);
        }
        return new rx.Observable(sub => {
            sub.next(action);
            sub.complete();
        }).pipe(rx.mergeMap(action => {
            var _a;
            return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => response$.pipe(operator(action), actionRelatedToAction(action)
            // mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...P]>,
            // rx.take(1)
            )), timeoutLog((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, 
            // eslint-disable-next-line no-console
            this.opts.slowLog ? () => this.opts.slowLog(action) : () => { })), new rx.Observable(() => {
                this.control.actionUpstream.next(action);
                return () => {
                    // const cancel = this.control.createAction('__cancel' as keyof I, [action.t] as any);
                    // assignActionReferParam(cancel, action);
                    // this.control.actionUpstream.next(cancel);
                    this.control.cancelAction(action);
                };
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
            if (this.relateToAction && this.relateToAction.length > 0) {
                assignActionReferParam(this.action, this.relateToAction);
            }
            // when all (counted) the returned streams are subscribed, dispatch the new action
            const onSubscribe$ = new rx.Subject();
            onSubscribe$.pipe(rx.distinct(), rx.take(responses.length)).subscribe({
                complete: () => {
                    this.control.actionUpstream.next(this.action);
                }
            });
            const onUnsubscribe$ = new rx.Subject();
            onUnsubscribe$.pipe(rx.distinct(), rx.take(responses.length)).subscribe({
                complete: () => {
                    // const cancel = this.control.createAction('__cancel' as keyof I, [action.t] as any);
                    // assignActionReferParam(cancel, action);
                    // this.control.actionUpstream.next(cancel);
                    this.control.cancelAction(this.action);
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return responses.map((res$, idx) => {
                var _a;
                return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => res$.pipe(operator(this.action), actionRelatedToAction(this.action)
                // mapActionToPayload() as (a: rx.Observable<Action<any>>) => rx.Observable<[ActionMeta, ...any[]]>,
                // rx.take(1)
                )), timeoutLog((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, 
                // eslint-disable-next-line no-console
                this.opts.slowLog ? () => this.opts.slowLog(this.action) : () => console.log('Slow observable action detected'))), new rx.Observable(() => {
                    onSubscribe$.next(idx);
                }));
            });
        }
    }
    odMono(response, ...moreResponses) {
        const res = this.od(response, ...moreResponses);
        if (Array.isArray(res)) {
            return res.map(i => i.pipe(rx.take(1)));
        }
        return res.pipe(rx.take(1));
    }
}
//# sourceMappingURL=action-factory.js.map