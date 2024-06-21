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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupedRxController = exports.RxController = void 0;
exports.serializeAction = serializeAction;
exports.deserializeAction = deserializeAction;
exports.mapActionToPayload = mapActionToPayload;
const rx = __importStar(require("rxjs"));
const stream_core_1 = require("./stream-core");
const context_operators_1 = require("./context-operators");
__exportStar(require("./stream-core"), exports);
class RxController {
    constructor(opts) {
        this.opts = opts;
        const core = this.core = new stream_core_1.ControllerCore(opts);
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
                    rx.merge(action$.pipe((0, context_operators_1.actionRelatedToAction)(action), mapActionToPayload()), new rx.Observable(sub => {
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
        this.interceptor$ = core.interceptor$;
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
        this.core.action$.pipe(rx.filter(a => typeSet.has((0, stream_core_1.nameOfAction)(a))), rx.tap(value => {
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
        this.core.action$.pipe(rx.filter(a => !typeSet.has((0, stream_core_1.nameOfAction)(a))), rx.tap(value => {
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
exports.RxController = RxController;
class GroupedRxController extends RxController {
    constructor(key, opts) {
        super(opts);
        this.key = key;
    }
}
exports.GroupedRxController = GroupedRxController;
function serializeAction(action) {
    const a = Object.assign(Object.assign({}, action), { t: (0, stream_core_1.nameOfAction)(action) });
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
function deserializeAction(actionObj, toController) {
    const newAction = toController.core.createAction((0, stream_core_1.nameOfAction)(actionObj), actionObj.p);
    newAction.i = actionObj.i;
    if (actionObj.r)
        newAction.r = actionObj.r;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    toController.core.actionUpstream.next(newAction);
    return newAction;
}
function mapActionToPayload() {
    return (up) => up.pipe(rx.map(a => [a, ...a.p]));
}
//# sourceMappingURL=control.js.map