/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import * as rx from 'rxjs';
import { ControllerCore, nameOfAction } from './stream-core';
import { mapActionToPayload } from './control';
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
                        slowLog() {
                            const msg = `Detected a slow responding message of dispatched action of "${control.logPrefix} ${key}"`;
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
        // addConfigurable(this);
        const actionsByType = new Map();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const actionDispenseByType = ActionDispenser.ofRxController(this);
        const actionByTypeProxy = new Proxy({}, {
            get(_target, type, _rec) {
                return actionDispenseByType.ofType(type);
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
                    const a$ = actionDispenseByType.ofType(key);
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
    const newAction = toController.createAction(nameOfAction(actionObj), actionObj.p);
    newAction.i = actionObj.i;
    if (actionObj.r)
        newAction.r = actionObj.r;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    toController.actionUpstream.next(newAction);
    return newAction;
}
//# sourceMappingURL=control2.js.map