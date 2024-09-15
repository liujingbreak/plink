/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import * as rx from 'rxjs';
import { ControllerCore, nameOfAction } from './stream-core';
import { ActionDataTable } from './action-table';
import { ActionDispenser } from './stream-dispense';
import { SingleActionFactoryImpl } from './action-factory';
export class RxController2 extends ControllerCore {
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
                    return new SingleActionFactoryImpl(key, args, control, {
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
        /**
         * you don't need to use this Subject directly, it is meant to be extended by Reactivizer internally
         * */
        this.doOperator$ = new rx.BehaviorSubject((_dispatchingAction) => input => input);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const actionDispenseByType = ActionDispenser.ofRxController(this);
        this.at = actionDispenseByType.at;
        this.pt = actionDispenseByType.pt;
    }
    /**
     * This method create a new RxController2 which recieve exactly same action messages as the current controlle does.
     * In short, subscribers of both controllers can recieve messages dispatched from both controller, just the subscribers of "prepend" controller always
     * recieves earlier than any subscribers of this controller.
     * It helps to conquer recursive message emitting problem when add more reactors to existing message stream.
     *
     * 1. current dispatches --message--> current.actionUpstream(intercepted) --> this.actionUpstream (intercepted) --> current.action$, this.action$
     * 2. This dispatches --message--> this.actionUpstream (intercepted) --> current.action$, this.action$
     *
     * The "prepend" controller will always recieve a copy of each action message from current controller, and awlays recieves earlier than this controller's subscribers,
     * Any action dispatched by current controller will always be piped to prepended controller's actionUpstream instead of its owns, so that again, both
     * current and prepend controller will recieves them.
     *
     * Notice the order of prependController and interceptors set by `interceptor$.next()`, it behaves differetly as below:
     * - prependController should recieve message dispatched by both controllers, but base controller can not recieve message from either controller,
     *   **when interceptor of base controller is added before prependController() invocation** (interceptor is appended after prependController to pipeline as reverse order)
     * - prependController emitted recieve message can be recieved by both controllers, but messages dispatched from the base controller are all blocked by interceptor
     *   when interceptor is added later than prependController() happens (in which case interceptor is prior to prependController in pipe line)
     */
    prependController(name) {
        const targetCtl = new RxController2();
        targetCtl.config(Object.assign(Object.assign({}, this.opts), name ? { name } : {}));
        this.configChange.subscribe(targetCtl.configChange);
        // unlike actionUpstream, thisUpStream is posterior to interceptors
        const thisUpStream = new rx.Subject();
        const targetUpstream = new rx.Subject();
        targetCtl.prependInterceptor(a$ => {
            return rx.merge(targetUpstream, a$.pipe(rx.map(a => {
                targetUpstream.next(a);
                // emit to current controller as well but later than other subscribers
                thisUpStream.next(a);
            }), rx.ignoreElements()));
        });
        this.prependInterceptor(a$ => rx.merge(thisUpStream, a$.pipe(rx.map(a => {
            // Ensure prependController recieve earlier than current controller
            targetUpstream.next(a);
            // Ensure action emitted later than prependController
            thisUpStream.next(a);
        }), rx.ignoreElements())));
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
        this.action$.pipe(rx.filter(a => typeSet.has(nameOfAction(a))), rx.tap(value => {
            sub.actionUpstream.next(value);
        })).subscribe();
        return sub;
    }
    /**
     * Create an very simple and naive version Apache Kafka KTable like "observable Map<K, Action>",
     * a table which retains latest action by "key"
     **/
    createDataTable(actionType, keySelector) {
        return new ActionDataTable(this.at[actionType], keySelector);
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
    const act = toController.copyActionFrom(actionObj);
    toController.actionUpstream.next(act);
}
//# sourceMappingURL=control2.js.map