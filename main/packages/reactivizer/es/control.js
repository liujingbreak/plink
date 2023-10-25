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
var _ActionTable_latestPayloadsByName$, _ActionTable_latestPayloadsSnapshot$;
import * as rx from 'rxjs';
import { ControllerCore, has, nameOfAction, actionMetaToStr } from './stream-core';
export * from './stream-core';
export class RxController {
    constructor(opts) {
        this.opts = opts;
        const core = this.core = new ControllerCore(opts);
        this.dispatcher = this.dp = new Proxy({}, {
            get(_target, key, _rec) {
                return core.dispatchFactory(key);
            }
        });
        this.dispatcherFor = this.dpf = new Proxy({}, {
            get(_target, key, _rec) {
                return core.dispatchForFactory(key);
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
                    rx.merge(action$.pipe(actionRelatedToAction(action.i), mapActionToPayload()), new rx.Observable(sub => {
                        self.core.actionUpstream.next(action);
                        sub.complete();
                    })).subscribe(r$);
                    return r$.asObservable();
                };
            }
        });
        this.dispatchAndObserveRes = this.do = new Proxy({}, {
            get(_target, key, _rec) {
                return (action$, ...params) => {
                    return self.dfo[key](action$, null, ...params);
                };
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
            }
        });
        this.updateInterceptor = core.updateInterceptor;
    }
    /** create state of actions, you can consider it like a map of BehaviorSubject of actions */
    // withTableFor<MS extends Array<keyof I>>(...actionNames: MS) {
    //   if (this.table == null)
    //     this.table = new ActionTable(this, actionNames) as TB;
    //   else
    //     this.table.addActions(...actionNames);
    //   return this as RxController<I, (KS[number] | MS[number])[], ActionTable<I, (KS[number] | MS[number])[]>>;
    // }
    createAction(type, ...params) {
        return this.core.createAction(type, params);
    }
}
export class ActionTable {
    get latestPayloadsByName$() {
        if (__classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f"))
            return __classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f");
        __classPrivateFieldSet(this, _ActionTable_latestPayloadsByName$, this.actionNamesAdded$.pipe(rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))), rx.map(() => {
            const paramByName = {};
            for (const [k, v] of this.actionSnapshot.entries()) {
                paramByName[k] = v;
            }
            return paramByName;
        }), rx.share()), "f");
        return __classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f");
    }
    get latestPayloadsSnapshot$() {
        if (__classPrivateFieldGet(this, _ActionTable_latestPayloadsSnapshot$, "f"))
            return __classPrivateFieldGet(this, _ActionTable_latestPayloadsSnapshot$, "f");
        __classPrivateFieldSet(this, _ActionTable_latestPayloadsSnapshot$, this.actionNamesAdded$.pipe(rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))), rx.map(() => this.actionSnapshot)), "f");
        return __classPrivateFieldGet(this, _ActionTable_latestPayloadsSnapshot$, "f");
    }
    constructor(streamCtl, actionNames) {
        this.streamCtl = streamCtl;
        this.actionNamesAdded$ = new rx.ReplaySubject(1);
        this.latestPayloads = {};
        _ActionTable_latestPayloadsByName$.set(this, void 0);
        _ActionTable_latestPayloadsSnapshot$.set(this, void 0);
        this.actionSnapshot = new Map();
        this.actionNames = [];
        this.l = this.latestPayloads;
        this.addActions(...actionNames);
        this.actionNamesAdded$.pipe(rx.map(actionNames => {
            this.onAddActions(actionNames);
        })).subscribe();
    }
    addActions(...actionNames) {
        this.actionNames = this.actionNames.concat(actionNames);
        this.actionNamesAdded$.next(actionNames);
        return this;
    }
    onAddActions(actionNames) {
        var _a;
        for (const type of actionNames) {
            if (has.call(this.latestPayloads, type))
                continue;
            const a$ = new rx.ReplaySubject(1);
            this.streamCtl.actionByType[type].pipe(rx.map(a => {
                const mapParam = [{ i: a.i, r: a.r }, ...a.p];
                this.actionSnapshot.set(type, mapParam);
                return mapParam;
            })).subscribe(a$);
            this.latestPayloads[type] = ((_a = this.streamCtl.opts) === null || _a === void 0 ? void 0 : _a.debug) ?
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
                    this.streamCtl.opts.log(core.logPrefix + 'rx:latest', type, action);
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
_ActionTable_latestPayloadsByName$ = new WeakMap(), _ActionTable_latestPayloadsSnapshot$ = new WeakMap();
/** Rx operator function */
export function actionRelatedToAction(id) {
    return function (up) {
        return up.pipe(rx.filter(m => (m.r != null && m.r === id) || (Array.isArray(m.r) && m.r.some(r => r === id))));
    };
}
/** Rx operator function */
export function actionRelatedToPayload(id) {
    return function (up) {
        return up.pipe(rx.filter(([m]) => (m.r != null && m.r === id) || (Array.isArray(m.r) && m.r.some(r => r === id))));
    };
}
export function serializeAction(action) {
    const a = Object.assign(Object.assign({}, action), { t: nameOfAction(action) });
    // if (a.r instanceof Set) {
    //   a.r = [...a.r.values()];
    // }
    return a;
}
/**
 * Create a new Action with same "i" and "r" properties and dispatched to RxController
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
function mapActionToPayload() {
    return (up) => up.pipe(rx.map(a => [{ i: a.i, r: a.r }, ...a.p]));
}
//# sourceMappingURL=control.js.map