/* eslint-disable @typescript-eslint/no-unused-vars */
import * as rx from 'rxjs';
import { ControllerCore } from './stream-core';
import { actionRelatedToAction } from './context-operators';
export * from './stream-core';
export class RxController {
    constructor(opts) {
        const core = this.core = new ControllerCore(opts);
        this.opts = opts;
        this.dispatcher = this.dp = new Proxy({}, {
            get(_target, key, _rec) {
                return core.dispatchFactory(key);
            },
            has(_target, _key) {
                return true;
            },
            ownKeys() {
                return [];
            }
        });
        this.dispatcherFor = this.dpf = new Proxy({}, {
            get(_target, key, _rec) {
                return core.dispatchForFactory(key);
            },
            has(_target, _key) {
                return true;
            },
            ownKeys() {
                return [];
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.dispatchForAndObserveRes = this.dfo = new Proxy({}, {
            get(_target, key, _rec) {
                return (action$, referActions, ...params) => {
                    const action = self.core.createAction(key, params);
                    if (referActions)
                        action.r = Array.isArray(referActions) ? referActions.map(m => m.i) : referActions.i;
                    const r$ = new rx.ReplaySubject(1);
                    rx.merge(action$.pipe(actionRelatedToAction(action), mapActionToPayload()), new rx.Observable(sub => {
                        self.core.actionUpstream.next(action);
                        sub.complete();
                    })).subscribe(r$);
                    return r$.asObservable();
                };
            },
            has(_target, _key) {
                return true;
            },
            ownKeys() {
                return [];
            }
        });
        this.dispatchAndObserveRes = this.do = new Proxy({}, {
            get(_target, key, _rec) {
                return (action$, ...params) => {
                    return self.dfo[key](action$, null, ...params);
                };
            },
            has(_target, _key) {
                return true;
            },
            ownKeys() {
                return [];
            }
        });
        const actionsByType = {};
        const actionByTypeProxy = new Proxy({}, {
            get(_target, type, _rec) {
                let a$ = actionsByType[type];
                if (a$ == null) {
                    const matchType = type;
                    a$ = actionsByType[type] = core.action$.pipe(rx.filter(({ t }) => t === matchType), rx.share());
                }
                return a$;
            },
            has(_target, key) {
                return Object.prototype.hasOwnProperty.call(actionsByType, key);
            },
            ownKeys() {
                return Object.keys(actionsByType);
            }
        });
        const payloadsByType = {};
        this.actionByType = this.at = actionByTypeProxy;
        this.payloadByType = this.pt = new Proxy({}, {
            get(_target, key, _rec) {
                let p$ = payloadsByType[key];
                if (p$ == null) {
                    const a$ = actionByTypeProxy[key];
                    p$ = payloadsByType[key] = a$.pipe(mapActionToPayload(), rx.share());
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
        this.interceptorList$ = core.interceptorList$;
    }
    /** change CoreOptions's "name" property which is displayed in actions log for developer to identify which stream the action log entry
    * belongs to
    */
    setName(value) {
        this.core.setName(value);
    }
    createAction(type, ...params) {
        return this.core.createAction(type, params);
    }
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy(keySelector, groupedCtlOptionsFn) {
        return this.core.action$.pipe(rx.groupBy(keySelector), rx.map(grouped => {
            const groupedRxCtl = new GroupedRxController(grouped.key, Object.assign(Object.assign({}, (groupedCtlOptionsFn ? groupedCtlOptionsFn(grouped.key) : {})), { autoConnect: false }));
            // connect to source actionUpstream only when it is subscribed
            rx.concat(groupedRxCtl.core.actionSubscribed$.pipe(rx.tap(() => {
                groupedRxCtl.connect();
            }), rx.take(1)), 
            // Then dispatch source action to grouped controller
            grouped.pipe(rx.tap(action => deserializeAction(action, groupedRxCtl)))).pipe(rx.takeUntil(groupedRxCtl.core.actionUnsubscribed$)).subscribe();
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
        const sub = new RxController(opts);
        const typeSet = new Set(actionTypes);
        this.core.action$.pipe(rx.filter(a => typeSet.has(a.t)), rx.tap(value => {
            sub.core.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes(excludeActionTypes, opts) {
        const sub = new RxController(opts);
        const typeSet = new Set(excludeActionTypes);
        this.core.action$.pipe(rx.filter(a => !typeSet.has(a.t)), rx.tap(value => {
            sub.core.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
    /**
     * Delegate to `this.core.action$.connect()`
     * "core.action$" is a `connectable` observable, under the hood, it is like `action$ = connectable(actionUpstream)`.
     *
     * By default `connect()` will be immediately invoked in constructor function, when "options.autoConnect" is
     * `undefined` or `true`, in that case you don't need to call this method manually.
     *
     * Refer to [connectable](https://rxjs.dev/api/index/function/connectable)
     */
    connect() {
        this.core.connect();
    }
}
export class GroupedRxController extends RxController {
    constructor(key, opts) {
        super(opts);
        this.key = key;
    }
}
export function serializeAction(action) {
    const a = Object.assign(Object.assign({}, action), { t: action.t });
    // if (a.r instanceof Set) {
    //   a.r = [...a.r.values()];
    // }
    return a;
}
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export function deserializeAction(actionObj, toController) {
    const newAction = toController.core.createAction(actionObj.t, actionObj.p);
    newAction.i = actionObj.i;
    if (actionObj.r)
        newAction.r = actionObj.r;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    toController.core.actionUpstream.next(newAction);
    return newAction;
}
export function mapActionToPayload() {
    return (up) => up.pipe(rx.map(a => [a, ...a.p]));
}
//# sourceMappingURL=control.js.map