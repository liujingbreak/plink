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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupedRxController2 = exports.RxController2 = void 0;
exports.deserializeAction2 = deserializeAction2;
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
const rx = __importStar(require("rxjs"));
const stream_core_1 = require("./stream-core");
const context_operators_1 = require("./context-operators");
const action_table_1 = require("./action-table");
const action_dispenser_1 = require("./action-dispenser");
const action_factory_1 = require("./action-factory");
class RxController2 extends stream_core_1.ControllerCore {
    constructor(opts) {
        super(Object.assign(Object.assign({}, opts), { debugExcludeTypes: (opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) ?
                ['__cancel', ...opts.debugExcludeTypes] :
                ['__cancel'] }));
        /**
         * you don't need to use this Subject directly, it is meant to be extended by Reactivizer internally
         * */
        this.doOperator$ = new rx.BehaviorSubject(() => input => input);
        const actionDispenseByType = action_dispenser_1.ActionDispenser.ofRxController(this);
        this.at = actionDispenseByType.at;
        this.pt = actionDispenseByType.pt;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const control = this;
        const factories = new Map();
        this.ft = new Proxy({}, {
            get(_target, key) {
                if (factories.has(key)) {
                    return factories.get(key);
                }
                const fn = (...args) => {
                    return new action_factory_1.SingleActionFactoryImpl(key, args, control, {
                        slowLog(a) {
                            const msg = `Detected a slow responding message of dispatched action of "${control.logPrefix} ${key} #${a.i}"`;
                            if (opts === null || opts === void 0 ? void 0 : opts.log) {
                                opts.log(msg);
                            }
                        }
                    });
                };
                factories.set(key, fn);
                return fn;
            },
            has(_target, key) {
                return Object.prototype.hasOwnProperty.call(control.at, key);
            },
            ownKeys() {
                return Object.keys(control.at);
            }
        });
    }
    /**
     * This function return the same message observable of `pt.__cancel.pipe(actionRelatedToAction(actionMeta))`.
     * Regarding "__cancel" message:
     * it is dispatched when an or multiple action observables of `ft.<action>().od(<response$>)` are ALL unsubscribed,
     *
     * e.g.
     * ```
     * interface Messages {
     *    searchAndKeepUpdate(keyword: string): SingleActionFactory;
     *    updateResult(resultUpdates: string[]): SingleActionFactory;
     * }
     * const s = new RxController2<Messages>();
     * s.pt.searchAndKeepUpdate.pipe(
     *    rx.mergeMap(([m, keyword]) => {
     *      return aysncObtainOtherResource(keyword).pipe(
     *        rx.takeUntil(s.onCancelOf(m)), // This is where you need "onCancelOf()" to tell when to stop corresponding service for certain original action
     *        rx.map(result => s.ft.updateResult(result).dp(m))
     *      );
     *    )
     * ).subscribe();
     * ```
     */
    onCancelOf(actionMeta) {
        return this.pt.__cancel.pipe((0, context_operators_1.actionRelatedToAction)(actionMeta));
    }
    /** Same as dispatching "__cancel" message */
    cancelAction(queryAction) {
        const cancel = this.createAction('__cancel', [queryAction.t]);
        (0, stream_core_1.assignActionReferParam)(cancel, queryAction);
        this.actionUpstream.next(cancel);
    }
    /**
     * This method create a new RxController2 which recieves exactly same action messages as the current controlle does.
     * i.e. subscribers of both controllers can recieve messages dispatched from both controller, just the subscribers of "forked" controller always
     * recieves earlier than any subscribers of this controller.
     * It helps to conquer recursive message emitting problem when adding more reactors to existing message stream.
     */
    forkController() {
        const { ForkedRxController } = require('./forked-control'); // avoid cyclic import
        return new ForkedRxController(this);
    }
    /** @deprecated
     * Use forkController() instead */
    prependController() {
        return this.forkController();
    }
    forkPostController() {
        const { ForkedPostRxController } = require('./forked-post-control');
        return new ForkedPostRxController(this);
    }
    /**
     * If current instance is ForkedRxController,
     * append interceptor to all source controllers, otherwise do nothing.
     * ForkedRxController overrides this method
     * @returns a function to remove added interceptors
    **/
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    appendInterceptorToSrc(..._interceptors) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => { };
    }
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy(keySelector, groupedCtlOptionsFn) {
        return this.action$.pipe(rx.groupBy(keySelector), rx.map(grouped => {
            const opts = groupedCtlOptionsFn ?
                groupedCtlOptionsFn(grouped.key) :
                Object.entries(this.opts)
                    .filter(([p]) => p !== 'name' && p !== 'autoConnect')
                    .reduce((obj, [p, v]) => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    obj[p] = v;
                    return obj;
                }, {});
            const groupedRxCtl = new GroupedRxController2(grouped.key, Object.assign(Object.assign({}, opts), { autoConnect: false }));
            // connect to source actionUpstream only when it is subscribed
            rx.concat(groupedRxCtl.actionSubscribed$.pipe(rx.tap(() => {
                groupedRxCtl.connect();
            }), rx.take(1)), 
            // Then dispatch source action to grouped controller
            grouped.pipe(rx.tap(action => {
                deserializeAction2(action, groupedRxCtl);
            }))).pipe(rx.takeUntil(groupedRxCtl.actionUnsubscribed$)).subscribe();
            return groupedRxCtl;
        }), rx.scan((acc, el) => {
            const ret = acc;
            ret[0] = el;
            ret[1].set(el.key, el);
            return ret;
        }, [null, new Map()]));
    }
    /**
     * create a new RxController, pipe actions whose tyoes are specofied in parameter `actionTypes` from this controller to the new controller
     */
    subForTypes(actionTypes, opts) {
        const sub = new RxController2(opts);
        const typeSet = new Set(actionTypes);
        this.action$.pipe(rx.filter(a => typeSet.has(a.t) || a.t === '__cancel'), rx.tap(value => {
            sub.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
    /**
     * Create an very simple and naive version Apache Kafka KTable like "observable Map<K, Action>",
     * a table which retains latest action by "key"
     **/
    createDataTable(actionType, keySelector) {
        return new action_table_1.ActionDataTable(this.at[actionType], keySelector);
    }
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes(excludeActionTypes, opts) {
        const sub = new RxController2(opts);
        const typeSet = new Set(excludeActionTypes);
        this.action$.pipe(rx.filter(a => !typeSet.has(a.t) || a.t === '__cancel'), rx.tap(value => {
            sub.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
    /**
     * Create a variant of calling .ft(...).dp(...)`
     **/
    createDispatcherFor(type, ...actionMetaRelated) {
        return (...params) => this.ft[type](...params).dp(...actionMetaRelated);
    }
    /**
     * Create a variant of interface of functions `<I>.ft(...).dp(...)`
     **/
    createDispatchers(...actionMetaRelated) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const dispatchers = new Map();
        return new Proxy({}, {
            get(_target, key) {
                const existing = dispatchers.get(key);
                if (existing)
                    return existing;
                const d = self.createDispatcherFor(key, ...actionMetaRelated);
                dispatchers.set(key, d);
                return self.createDispatcherFor(key, ...actionMetaRelated);
            },
            has(_target, key) {
                return Object.prototype.hasOwnProperty.call(self.ft, key);
            },
            ownKeys() {
                return Object.keys(self.ft);
            }
        });
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
    const act = toController.copyActionFrom(actionObj);
    toController.actionUpstream.next(act);
}
//# sourceMappingURL=control2.js.map