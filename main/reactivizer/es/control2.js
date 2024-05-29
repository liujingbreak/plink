/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import * as rx from 'rxjs';
import { ControllerCore, nameOfAction, assignActionReferParam } from './stream-core';
import { mapActionToPayload } from './control';
import { actionRelatedToAction } from './context-operators';
import { ActionDataTable } from './action-table';
import { ActionDispenser } from './stream-dispense';
import { timeoutLog } from './utils';
class SingleActionFactoryImpl {
    constructor(type, payload, control, opts = { slowDispatchObservableTime: 20000 }) {
        this.type = type;
        this.payload = payload;
        this.control = control;
        this.opts = opts;
    }
    /** Make this action become related to another action message
     */
    re(...actionMeta) {
        this.relateToAction = actionMeta;
        return this;
    }
    dp(...actionMetaRelated) {
        const metas = actionMetaRelated.filter(m => m != null);
        if (metas.length > 0)
            return this.control.dispatchForFactory(this.type)(metas.length > 1 ? metas : metas[0], ...this.payload);
        else if (this.relateToAction && this.relateToAction.length > 0)
            return this.control.dispatchForFactory(this.type)(this.relateToAction.length > 1 ? this.relateToAction : this.relateToAction[0], ...this.payload);
        else
            return this.control.dispatchFactory(this.type)(...this.payload);
    }
    do(response$, referAction) {
        const action = this.control.createAction(this.type, this.payload);
        if (referAction) {
            assignActionReferParam(action, referAction);
        }
        else if (this.relateToAction && this.relateToAction.length > 0) {
            assignActionReferParam(action, this.relateToAction);
        }
        const r$ = new rx.ReplaySubject(1);
        this.ddo(response$, referAction).pipe(rx.take(1)).subscribe(r$);
        return r$.asObservable();
    }
    ddo(response$, referAction) {
        return new rx.Observable(sub => {
            const action = this.control.createAction(this.type, this.payload);
            if (referAction) {
                assignActionReferParam(action, referAction);
            }
            else if (this.relateToAction && this.relateToAction.length > 0) {
                assignActionReferParam(action, this.relateToAction);
            }
            sub.next(action);
            sub.complete();
        }).pipe(rx.mergeMap(action => {
            var _a;
            return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => response$.pipe(rx.map(actionOrPayload => {
                if (Array.isArray(actionOrPayload)) {
                    const [actionMeta, ...payload] = actionOrPayload;
                    actionMeta.p = payload;
                    return actionMeta;
                }
                return actionOrPayload;
            }), operator(action), actionRelatedToAction(action), mapActionToPayload(), rx.take(1))), timeoutLog((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, 
            // eslint-disable-next-line no-console
            this.opts.slowLog ? () => this.opts.slowLog() : () => console.log('Slow observable action detected'))), new rx.Observable(sub => {
                this.control.actionUpstream.next(action);
                sub.complete();
            }));
        }));
    }
    od(response, ...moreResponses) {
        if (moreResponses.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this.ddo(response);
        }
        else {
            const responses = [response, ...moreResponses];
            const action = this.control.createAction(this.type, this.payload);
            if (this.relateToAction && this.relateToAction.length > 0) {
                assignActionReferParam(action, this.relateToAction);
            }
            // when all the returned streams are subscribed, dispatch the new action
            const onSubscribe$ = new rx.Subject();
            onSubscribe$.pipe(rx.distinct(), rx.take(responses.length)).subscribe({
                complete: () => {
                    this.control.actionUpstream.next(action);
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return responses.map((res$, idx) => {
                var _a;
                return rx.merge(this.control.doOperator$.pipe(rx.take(1), rx.switchMap(operator => res$.pipe(rx.map(actionOrPayload => {
                    if (Array.isArray(actionOrPayload)) {
                        const [actionMeta, ...payload] = actionOrPayload;
                        actionMeta.p = payload;
                        return actionMeta;
                    }
                    return actionOrPayload;
                }), operator(action), actionRelatedToAction(action), mapActionToPayload(), rx.take(1))), timeoutLog((_a = this.opts.slowDispatchObservableTime) !== null && _a !== void 0 ? _a : 20000, 
                // eslint-disable-next-line no-console
                this.opts.slowLog ? () => this.opts.slowLog() : () => console.log('Slow observable action detected'))), new rx.Observable(sink => {
                    onSubscribe$.next(idx);
                    sink.complete();
                }));
            });
        }
    }
}
export class RxController2 extends ControllerCore {
    constructor(opts) {
        super(opts);
        /** Rx operator for `do()`, we can change it by emit new value to this observable,
         * you don't need to use this Subject directory, it is meant to be extended by Reactivizer internally
         * */
        this.doOperator$ = new rx.BehaviorSubject((_dispatchingAction) => input => input);
        // addConfigurable(this);
        const actionsByType = new Map();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const actionDispenseByType = new ActionDispenser(this.action$, this.typePrefix);
        const actionByTypeProxy = new Proxy({}, {
            get(_target, type, _rec) {
                return actionDispenseByType.ofType(type);
                // let a$ = actionsByType.get(type);
                // if (a$ == null) {
                //   const matchType = self.typePrefix + (type as string);
                //   a$ = self.action$.pipe(
                //     rx.filter(({t}) => t === matchType),
                //     rx.share()
                //   );
                //   actionsByType.set(type, a$);
                // }
                // return a$;
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
        const factories = new Map();
        this.ft = new Proxy({}, {
            get(_target, key, _rec) {
                if (factories.has(key)) {
                    return factories.get(key);
                }
                const fn = (...args) => {
                    return new SingleActionFactoryImpl(key, args, self, {
                        slowLog() {
                            var _a;
                            const msg = `Detected a slow responding message of dispatched action of "${self.logPrefix} ${key}"`;
                            if ((_a = self.opts) === null || _a === void 0 ? void 0 : _a.log) {
                                self.opts.log(msg);
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