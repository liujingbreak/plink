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
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
const rx = __importStar(require("rxjs"));
const stream_core_1 = require("./stream-core");
const action_table_1 = require("./action-table");
const stream_dispense_1 = require("./stream-dispense");
const action_factory_1 = require("./action-factory");
class RxController2 extends stream_core_1.ControllerCore {
    /** Action factory by type */
    get ft() {
        if (this.ftProxy)
            return this.ftProxy;
        const factories = this.factories;
        const opts = this.opts;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const control = this;
        this.ftProxy = new Proxy({}, {
            get(_target, key, _rec) {
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
                            else {
                                // eslint-disable-next-line no-console
                                console.log(msg);
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
        return this.ftProxy;
    }
    constructor(opts) {
        super(opts);
        this.factories = new Map();
        /** Rx operator for `do()`, we can change it by emit new value to this observable,
         * you don't need to use this Subject directly, it is meant to be extended by Reactivizer internally
         * */
        this.doOperator$ = new rx.BehaviorSubject((_dispatchingAction) => input => input);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const actionDispenseByType = stream_dispense_1.ActionDispenser.ofRxController(this);
        this.at = actionDispenseByType.at;
        this.pt = actionDispenseByType.pt;
    }
    /**
     * In short, subscribers of both controllers can recieve messages dispatched from both controller, just the subscribers of target controller always
     * recieves earlier than any subscribers of this controller.
     * It help to conquer recursive message emitting problem when extending reactor.
     *
     * 1. Target dispatches --message--> target.actionUpstream(intercepted) --> this.actionUpstream (intercepted) --> target.action$, this.action$
     * 2. This dispatches --message--> this.actionUpstream (intercepted) --> target.action$, this.action$
     *
     * Target controller will always recieve a copy of each action from this controller, and awlays recieves earlier than this controller's subscribers,
     * Any action dispatched by target controller will always be piped to this controller's actionUpstream instead of its owns, so that again both
     * target and this controller will recieves them.
     *
     */
    forkController() {
        const targetCtl = new RxController2({ debug: false });
        targetCtl.typePrefix = this.typePrefix;
        const targetUpStream = new rx.Subject();
        targetCtl.interceptor$.next(a$ => {
            return rx.merge(a$.pipe(rx.map(a => this.actionUpstream.next(a)), rx.ignoreElements()), targetUpStream);
        });
        this.interceptor$.next(a$ => a$.pipe(rx.tap(a => {
            targetUpStream.next(a);
        })));
        return targetCtl;
    }
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy(keySelector, groupedCtlOptionsFn) {
        return this.action$.pipe(rx.groupBy(keySelector), rx.map(grouped => {
            const opts = groupedCtlOptionsFn ?
                groupedCtlOptionsFn(grouped.key) :
                this.opts ?
                    Object.entries(this.opts)
                        .filter(([p]) => p !== 'name' && p !== 'autoConnect')
                        .reduce((obj, [p, v]) => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        obj[p] = v;
                        return obj;
                    }, {}) :
                    {};
            const groupedRxCtl = new GroupedRxController2(grouped.key, Object.assign(Object.assign({}, opts), { autoConnect: false }));
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
     * create a new RxController, pipe actions whose tyoes are specofied in parameter `actionTypes` from this controller to the new controller
     */
    subForTypes(actionTypes, opts) {
        const sub = new RxController2(opts);
        sub.typePrefix = this.typePrefix;
        const typeSet = new Set(actionTypes);
        this.action$.pipe(rx.filter(a => typeSet.has((0, stream_core_1.nameOfAction)(a))), rx.tap(value => {
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
        this.action$.pipe(rx.filter(a => !typeSet.has((0, stream_core_1.nameOfAction)(a))), rx.tap(value => {
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
            get(_target, key, _rec) {
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
    return toController.copyActionFrom(actionObj);
}
exports.deserializeAction2 = deserializeAction2;
//# sourceMappingURL=control2.js.map