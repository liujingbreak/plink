var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ActionTable_latestPayloadsByName$;
import * as rx from 'rxjs';
import { ControllerCore, has, nameOfAction, actionMetaToStr } from './stream-core';
export * from './stream-core';
const EMPTY_ARRY = [];
export class RxController {
    constructor(opts) {
        this.opts = opts;
        const core = this.core = new ControllerCore(opts);
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
            has(_target, key) {
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
            has(_target, key) {
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
            has(_target, key) {
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
                    const matchType = core.typePrefix + type;
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
        this.updateInterceptor = core.updateInterceptor;
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
        this.core.action$.pipe(rx.filter(a => typeSet.has(nameOfAction(a))), rx.tap(value => {
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
        this.core.action$.pipe(rx.filter(a => !typeSet.has(nameOfAction(a))), rx.tap(value => {
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
export class ActionTable {
    get dataChange$() {
        if (__classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f"))
            return __classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f");
        __classPrivateFieldSet(this, _ActionTable_latestPayloadsByName$, this.actionNamesAdded$.pipe(rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))), rx.map(() => {
            this.data = {};
            for (const k of this.actionNames) {
                const v = this.actionSnapshot.get(k);
                const old = this.data[k];
                if (old === EMPTY_ARRY || old == null)
                    this.data[k] = v ? v.slice(1) : EMPTY_ARRY;
                else {
                    if (v) {
                        old.splice(0);
                        for (let i = 1, l = v.length; i < l; i++)
                            old.push(v[i]);
                    }
                    else
                        this.data[k] = EMPTY_ARRY;
                }
            }
            return this.data;
        }), rx.share()), "f");
        return __classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f");
    }
    constructor(streamCtl, actionNames) {
        this.streamCtl = streamCtl;
        this.latestPayloads = {};
        this.data = {};
        this.actionSnapshot = new Map();
        // private
        _ActionTable_latestPayloadsByName$.set(this, void 0);
        // #latestPayloadsSnapshot$: rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> | undefined;
        this.actionNamesAdded$ = new rx.ReplaySubject(1);
        this.actionNames = [];
        this.l = this.latestPayloads;
        this.addActions(...actionNames);
        this.actionNamesAdded$.pipe(rx.map(actionNames => {
            this.onAddActions(actionNames);
        })).subscribe();
        this.dataChange$.subscribe(); // to make sure this.data will be fulfilled even when there is no any external observer
    }
    getData() {
        return this.data;
    }
    /** Add actions to be recoreded in table map,
     * by creating `ReplaySubject(1)` for each action payload stream respectively
     */
    addActions(...actionNames) {
        this.actionNames = this.actionNames.concat(actionNames);
        this.actionNamesAdded$.next(actionNames);
        return this;
    }
    onAddActions(actionNames) {
        var _a;
        for (const type of actionNames) {
            if (this.data[type] == null)
                this.data[type] = EMPTY_ARRY;
            if (has.call(this.latestPayloads, type))
                continue;
            const a$ = new rx.ReplaySubject(1);
            this.streamCtl.actionByType[type].pipe(rx.map(a => {
                const arr = this.actionSnapshot.get(type);
                if (arr == null) {
                    const mapParam = [{ i: a.i, r: a.r }, ...a.p];
                    this.actionSnapshot.set(type, mapParam);
                    return mapParam;
                }
                else {
                    arr[0] = { i: a.i, r: a.r };
                    arr.splice(1, arr.length - 1, ...a.p); // reuse old array
                    return arr;
                }
            })).subscribe(a$);
            this.latestPayloads[type] = ((_a = this.streamCtl.opts) === null || _a === void 0 ? void 0 : _a.debugTableAction) ?
                a$.pipe(this.debugLogLatestActionOperator(type)) :
                a$.asObservable();
        }
    }
    getLatestActionOf(actionName) {
        return this.actionSnapshot.get(actionName);
    }
    debugLogLatestActionOperator(type) {
        var _a;
        const core = this.streamCtl.core;
        return ((_a = this.streamCtl.opts) === null || _a === void 0 ? void 0 : _a.log) ?
            rx.map((action, idx) => {
                if (idx === 0 && !core.debugExcludeSet.has(type)) {
                    this.streamCtl.opts.log(core.logPrefix + 'rx:latest', type, actionMetaToStr(action[0]));
                }
                return action;
            }) :
            (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                rx.map((p, idx) => {
                    if (idx === 0 && !core.debugExcludeSet.has(type)) {
                        // eslint-disable-next-line no-console
                        console.log(`%c ${core.logPrefix}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type, actionMetaToStr(p[0]));
                    }
                    return p;
                }) :
                rx.map((p, idx) => {
                    if (idx > 0 && !core.debugExcludeSet.has(type)) {
                        // eslint-disable-next-line no-console
                        console.log(core.logPrefix + 'latest:', type, actionMetaToStr(p[0]));
                    }
                    return p;
                });
    }
}
_ActionTable_latestPayloadsByName$ = new WeakMap();
/** Rx operator function */
export function actionRelatedToAction(actionOrMeta) {
    return function (up) {
        let isPayload;
        return up.pipe(rx.filter(a => {
            if (isPayload == null)
                isPayload = Array.isArray(a);
            const m = isPayload ? a[0] : a;
            return (m.r != null && m.r === actionOrMeta.i) || (Array.isArray(m.r) && m.r.some(r => r === actionOrMeta.i));
        }));
    };
}
export function throwErrorOnRelated(actionOrMeta) {
    return function (up) {
        return up.pipe(rx.map(actionOrPayload => {
            const isPayload = Array.isArray(actionOrPayload);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            const m = isPayload ? actionOrPayload[0] : actionOrPayload;
            if ((m.r != null && m.r === actionOrMeta.i) || (Array.isArray(m.r) && m.r.some(r => r === actionOrMeta.i))) {
                throw isPayload ? actionOrPayload[1] : actionOrPayload.p[0];
            }
            return actionOrPayload;
        }));
    };
}
/** @deprecated use actionRelatedToAction instead */
export const payloadRelatedToAction = actionRelatedToAction;
export function serializeAction(action) {
    const a = Object.assign(Object.assign({}, action), { t: nameOfAction(action) });
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
    const newAction = toController.core.createAction(nameOfAction(actionObj), actionObj.p);
    newAction.i = actionObj.i;
    if (actionObj.r)
        newAction.r = actionObj.r;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    toController.core.actionUpstream.next(newAction);
    return newAction;
}
export function mapActionToPayload() {
    return (up) => up.pipe(rx.map(a => [{ i: a.i, r: a.r }, ...a.p]));
}
//# sourceMappingURL=control.js.map