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
exports.deserializeAction2 = exports.GroupedRxController2 = exports.RxController2 = void 0;
const rx = __importStar(require("rxjs"));
const stream_core_1 = require("./stream-core");
const control_1 = require("./control");
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
        }), operator(action), (0, control_1.actionRelatedToAction)(action), (0, control_1.mapActionToPayload)(), rx.take(1)))), new rx.Observable(sub => {
            this.control.actionUpstream.next(action);
            sub.complete();
        }));
    }
}
class RxController2 extends stream_core_1.ControllerCore {
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
                    p$ = a$.pipe((0, control_1.mapActionToPayload)(), rx.share());
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
        this.action$.pipe(rx.filter(a => typeSet.has((0, stream_core_1.nameOfAction)(a))), rx.tap(value => {
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
        this.action$.pipe(rx.filter(a => !typeSet.has((0, stream_core_1.nameOfAction)(a))), rx.tap(value => {
            sub.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
}
exports.RxController2 = RxController2;
class GroupedRxController2 extends RxController2 {
    constructor(key, opts) {
        super(opts);
        this.key = key;
    }
}
exports.GroupedRxController2 = GroupedRxController2;
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
function deserializeAction2(actionObj, toController) {
    const newAction = toController.createAction((0, stream_core_1.nameOfAction)(actionObj), actionObj.p);
    newAction.i = actionObj.i;
    if (actionObj.r)
        newAction.r = actionObj.r;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    toController.actionUpstream.next(newAction);
    return newAction;
}
exports.deserializeAction2 = deserializeAction2;
//# sourceMappingURL=control2.js.map