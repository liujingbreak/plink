"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeAction = exports.serializeAction = exports.actionRelatedToPayload = exports.actionRelatedToAction = exports.nameOfAction = exports.RxController = exports.ControllerCore = void 0;
const rx = __importStar(require("rxjs"));
let SEQ = 1;
let ACTION_SEQ = Number((Math.random() + '').slice(2, 10)) + 1;
const has = Object.prototype.hasOwnProperty;
class ControllerCore {
    constructor(opts) {
        var _a;
        this.opts = opts;
        this.actionUpstream = new rx.Subject();
        this.interceptor$ = new rx.BehaviorSubject(a => a);
        this.typePrefix = SEQ++ + '/';
        this.dispatcher = {};
        this.dispatcherFor = {};
        this.debugName = typeof (opts === null || opts === void 0 ? void 0 : opts.debug) === 'string' ? `[${this.typePrefix}${opts.debug}] ` : this.typePrefix;
        this.debugExcludeSet = new Set((_a = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _a !== void 0 ? _a : []);
        const debuggableAction$ = (opts === null || opts === void 0 ? void 0 : opts.debug)
            ? this.actionUpstream.pipe((opts === null || opts === void 0 ? void 0 : opts.log) ?
                rx.tap(action => {
                    const type = nameOfAction(action);
                    if (!this.debugExcludeSet.has(type)) {
                        opts.log(this.debugName + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
                    }
                }) :
                (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                    rx.tap(action => {
                        const type = nameOfAction(action);
                        if (!this.debugExcludeSet.has(type)) {
                            // eslint-disable-next-line no-console
                            console.log(`%c ${this.debugName}rx:action `, 'color: white; background: #8c61ff;', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
                        }
                    }) :
                    rx.tap(action => {
                        const type = nameOfAction(action);
                        if (!this.debugExcludeSet.has(type)) {
                            // eslint-disable-next-line no-console
                            console.log(this.debugName + 'rx:action', type, actionMetaToStr(action), ...(opts.logStyle === 'noParam' ? [] : action.p));
                        }
                    }), rx.share())
            : this.actionUpstream;
        this.action$ = this.interceptor$.pipe(rx.switchMap(interceptor => interceptor ?
            debuggableAction$.pipe(interceptor, rx.share()) :
            debuggableAction$));
    }
    createAction(type, params) {
        return {
            t: this.typePrefix + type,
            i: ACTION_SEQ++,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            p: params !== null && params !== void 0 ? params : []
        };
    }
    dispatchFactory(type) {
        if (has.call(this.dispatcher, type)) {
            return this.dispatcher[type];
        }
        const dispatch = (...params) => {
            const action = this.createAction(type, params);
            this.actionUpstream.next(action);
            return action.i;
        };
        this.dispatcher[type] = dispatch;
        return dispatch;
    }
    dispatchForFactory(type) {
        if (has.call(this.dispatcherFor, type)) {
            return this.dispatcherFor[type];
        }
        const dispatch = (metas, ...params) => {
            const action = this.createAction(type, params);
            action.r = Array.isArray(metas) ? metas.map(m => m.i) : metas.i;
            this.actionUpstream.next(action);
            return action.i;
        };
        this.dispatcherFor[type] = dispatch;
        return dispatch;
    }
    replaceActionInterceptor(factory) {
        const newInterceptor = factory(this.interceptor$.getValue());
        this.interceptor$.next(newInterceptor);
    }
    // eslint-disable-next-line space-before-function-paren
    ofType(...types) {
        return (up) => {
            const matchTypes = types.map(type => this.typePrefix + type);
            return up.pipe(rx.filter((a) => matchTypes.some(matchType => a.t === matchType)));
        };
    }
    // eslint-disable-next-line space-before-function-paren
    notOfType(...types) {
        return (up) => {
            const matchTypes = types.map(type => this.typePrefix + type);
            return up.pipe(rx.filter((a) => matchTypes.every(matchType => a.t !== matchType)));
        };
    }
}
exports.ControllerCore = ControllerCore;
class RxController {
    constructor(opts) {
        this.opts = opts;
        this.latestActionsCache = {};
        this.latestPayloadsCache = {};
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
        this.dispatchAndObserveRes = this.do = new Proxy({}, {
            get(_target, key, _rec) {
                return (action$, ...params) => {
                    const action = self.core.createAction(key, params);
                    const r$ = new rx.ReplaySubject(1);
                    rx.merge(action$.pipe(actionRelatedToAction(action.i), mapActionToPayload()), new rx.Observable(sub => {
                        self.core.actionUpstream.next(action);
                        sub.complete();
                    })).subscribe(r$);
                    return r$.asObservable();
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
        this.replaceActionInterceptor = core.replaceActionInterceptor;
    }
    createAction(type, ...params) {
        return this.core.createAction(type, params);
    }
    /**
     * The function returns a cache which means you may repeatly invoke this method with duplicate parameter
     * without worrying about memory consumption
     */
    // eslint-disable-next-line space-before-function-paren
    createLatestActionsFor(...types) {
        var _a;
        for (const type of types) {
            if (has.call(this.latestActionsCache, type))
                continue;
            const a$ = new rx.ReplaySubject(1);
            this.actionByType[type].subscribe(a$);
            this.latestActionsCache[type] = ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.debug) ?
                a$.pipe(this.debugLogLatestActionOperator(type)
                // rx.share() DON'T USE share(), SINCE IT WILL TURS ReplaySubject TO A NORMAL Subject
                ) :
                a$.asObservable();
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.latestActionsCache;
    }
    /**
     * Conceptually, it is a "state store" like Apache Kafka's "table"
     * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
     * @return Pick<...>
     The reason using `Pick<{[K in keyof I]: PayloadStream<I, K>}, T[number]>` instead of `{[K in T[number]]: PayloadStream<I, K>` is that the former expression
     makes Typescript to jump to `I` type definition source code when we perform operation like "Go to definition" in editor, the latter can't
     */
    // eslint-disable-next-line space-before-function-paren
    createLatestPayloadsFor(...types) {
        const actions = this.createLatestActionsFor(...types);
        for (const key of types) {
            if (has.call(this.latestPayloadsCache, key))
                continue;
            this.latestPayloadsCache[key] = actions[key].pipe(rx.map(a => [{ i: a.i, r: a.r }, ...a.p]));
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.latestPayloadsCache;
    }
    debugLogLatestActionOperator(type) {
        var _a;
        return ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.log) ?
            rx.map((action, idx) => {
                if (idx === 0 && !this.core.debugExcludeSet.has(type)) {
                    this.opts.log(this.core.debugName + 'rx:latest', type, action);
                }
                return action;
            }) :
            (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                rx.map((action, idx) => {
                    if (idx === 0 && !this.core.debugExcludeSet.has(type)) {
                        // eslint-disable-next-line no-console
                        console.log(`%c ${this.core.debugName}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type, actionMetaToStr(action));
                    }
                    return action;
                }) :
                rx.map((action, idx) => {
                    if (idx > 0 && !this.core.debugExcludeSet.has(type)) {
                        // eslint-disable-next-line no-console
                        console.log(this.core.debugName + 'latest:', type, actionMetaToStr(action));
                    }
                    return action;
                });
    }
}
exports.RxController = RxController;
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
// eslint-disable-next-line space-before-function-paren
function nameOfAction(action) {
    const elements = action.t.split('/');
    return (elements.length > 1 ? elements[1] : elements[0]);
}
exports.nameOfAction = nameOfAction;
/** Rx operator function */
function actionRelatedToAction(id) {
    return function (up) {
        return up.pipe(rx.filter(m => (m.r != null && m.r === id) || (Array.isArray(m.r) && m.r.some(r => r === id))));
    };
}
exports.actionRelatedToAction = actionRelatedToAction;
/** Rx operator function */
function actionRelatedToPayload(id) {
    return function (up) {
        return up.pipe(rx.filter(([m]) => (m.r != null && m.r === id) || (Array.isArray(m.r) && m.r.some(r => r === id))));
    };
}
exports.actionRelatedToPayload = actionRelatedToPayload;
function serializeAction(action) {
    const a = Object.assign(Object.assign({}, action), { t: nameOfAction(action) });
    // if (a.r instanceof Set) {
    //   a.r = [...a.r.values()];
    // }
    return a;
}
exports.serializeAction = serializeAction;
/**
 * Create a new Action with same "i" and "r" properties and dispatched to RxController
 * @return that dispatched new action object
 */
function deserializeAction(actionObj, toController) {
    const newAction = toController.core.createAction(nameOfAction(actionObj), actionObj.p);
    newAction.i = actionObj.i;
    if (actionObj.r)
        newAction.r = actionObj.r;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    toController.core.actionUpstream.next(newAction);
    return newAction;
}
exports.deserializeAction = deserializeAction;
function mapActionToPayload() {
    return (up) => up.pipe(rx.map(a => [{ i: a.i, r: a.r }, ...a.p]));
}
function actionMetaToStr(action) {
    const { r, i } = action;
    return `(i: ${i}${r != null ? `, r: ${Array.isArray(r) ? [...r.values()].toString() : r}` : ''})`;
}
//# sourceMappingURL=control.js.map