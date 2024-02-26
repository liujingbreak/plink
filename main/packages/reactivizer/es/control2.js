import * as rx from 'rxjs';
import { ControllerCore, nameOfAction } from './stream-core';
import { mapActionToPayload, actionRelatedToAction } from './control';
class SingleActionFactoryImpl {
    constructor(type, payload, control) {
        this.type = type;
        this.payload = payload;
        this.control = control;
    }
    dp(...origActionMeta) {
        const metas = origActionMeta.filter(m => m != null);
        if (metas.length > 0)
            this.control.dispatchForFactory(this.type)(metas, ...this.payload);
        else
            this.control.dispatchFactory(this.type)(...this.payload);
    }
    do(waitForAction$, referActionMeta) {
        const action = this.control.createAction(this.type, this.payload);
        if (referActionMeta)
            action.r = Array.isArray(referActionMeta) ? referActionMeta.map(m => m.i) : referActionMeta.i;
        const r$ = new rx.ReplaySubject(1);
        this.ddo(waitForAction$, referActionMeta).pipe(rx.take(1)).subscribe(r$);
        return r$.asObservable();
    }
    ddo(waitForAction$, referActionMeta) {
        const action = this.control.createAction(this.type, this.payload);
        if (referActionMeta)
            action.r = Array.isArray(referActionMeta) ? referActionMeta.map(m => m.i) : referActionMeta.i;
        return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => waitForAction$.pipe(rx.map(actionOrPayload => {
            if (Array.isArray(actionOrPayload)) {
                const [actionMeta, ...payload] = actionOrPayload;
                actionMeta.p = payload;
                return actionMeta;
            }
            return actionOrPayload;
        }), operator(action), actionRelatedToAction(action), mapActionToPayload(), rx.take(1)))), new rx.Observable(sub => {
            this.control.actionUpstream.next(action);
            sub.complete();
        }));
    }
}
export class RxController2 extends ControllerCore {
    constructor(opts) {
        super(opts);
        this.opts = opts;
        /** Rx operator for `do()`, we can change it by emit new value to this observable,
         * you don't need to use this Subject directory, it is meant to be extended by Reactivizer internally
         * */
        this.doOperator$ = new rx.BehaviorSubject((_dispatchingAction) => input => input);
        const actionsByType = new Map();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const actionByTypeProxy = new Proxy({}, {
            get(_target, type, _rec) {
                let a$ = actionsByType.get(type);
                if (a$ == null) {
                    const matchType = self.typePrefix + type;
                    a$ = self.action$.pipe(rx.filter(({ t }) => t === matchType), rx.share());
                    actionsByType.set(type, a$);
                }
                return a$;
            },
            has(_target, key) {
                return actionsByType.has(key);
            },
            ownKeys() {
                return [...actionsByType.keys()];
            }
        });
        const payloadsByType = new Map();
        this.at = actionByTypeProxy;
        this.pt = new Proxy({}, {
            get(_target, key, _rec) {
                let p$ = payloadsByType.get(key);
                if (p$ == null) {
                    const a$ = actionByTypeProxy[key];
                    p$ = a$.pipe(mapActionToPayload(), rx.share());
                    payloadsByType.set(key, p$);
                }
                return p$;
            },
            has(_target, key) {
                return Object.prototype.hasOwnProperty.call(actionByTypeProxy, key);
            },
            ownKeys() {
                return Object.keys(actionByTypeProxy);
            }
        });
        const factories = new Map();
        this.ft = new Proxy({}, {
            get(_target, key, _rec) {
                if (factories.has(key)) {
                    return factories.get(key);
                }
                const fn = (...args) => {
                    return new SingleActionFactoryImpl(key, args, self);
                };
                factories.set(key, fn);
                return fn;
            },
            has(_target, key) {
                return Object.prototype.hasOwnProperty.call(actionByTypeProxy, key);
            },
            ownKeys() {
                return Object.keys(actionByTypeProxy);
            }
        });
    }
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy(keySelector, groupedCtlOptionsFn) {
        return this.action$.pipe(rx.groupBy(keySelector), rx.map(grouped => {
            const groupedRxCtl = new GroupedRxController2(grouped.key, Object.assign(Object.assign({}, (groupedCtlOptionsFn ? groupedCtlOptionsFn(grouped.key) : {})), { autoConnect: false }));
            // connect to source actionUpstream only when it is subscribed
            rx.concat(groupedRxCtl.actionSubscribed$.pipe(rx.tap(() => {
                groupedRxCtl.connect();
            }), rx.take(1)), 
            // Then dispatch source action to grouped controller
            grouped.pipe(rx.tap(action => deserializeAction2(action, groupedRxCtl)))).pipe(rx.takeUntil(groupedRxCtl.actionUnsubscribed$)).subscribe();
            return groupedRxCtl;
        }), rx.scan((acc, el) => {
            const ret = acc;
            ret[0] = el;
            ret[1].set(el.key, el);
            return ret;
        }, [null, new Map()]));
    }
    /**
     * create a new RxController whose action$ is filtered for action types which are included in `actionTypes`
     */
    subForTypes(actionTypes, opts) {
        const sub = new RxController2(opts);
        const typeSet = new Set(actionTypes);
        this.action$.pipe(rx.filter(a => typeSet.has(nameOfAction(a))), rx.tap(value => {
            sub.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes(excludeActionTypes, opts) {
        const sub = new RxController2(opts);
        const typeSet = new Set(excludeActionTypes);
        this.action$.pipe(rx.filter(a => !typeSet.has(nameOfAction(a))), rx.tap(value => {
            sub.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
}
export class GroupedRxController2 extends RxController2 {
    constructor(key, opts) {
        super(opts);
        this.key = key;
    }
}
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export function deserializeAction2(actionObj, toController) {
    const newAction = toController.createAction(nameOfAction(actionObj), actionObj.p);
    newAction.i = actionObj.i;
    if (actionObj.r)
        newAction.r = actionObj.r;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    toController.actionUpstream.next(newAction);
    return newAction;
}
//# sourceMappingURL=control2.js.map