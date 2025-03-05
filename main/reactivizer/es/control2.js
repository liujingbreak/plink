/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import * as rx from 'rxjs';
import { assignActionReferParam, ControllerCore } from './stream-core';
import { actionRelatedToAction } from './context-operators';
import { ActionDataTable } from './action-table';
import { ActionDispenser } from './action-dispenser';
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
        super(Object.assign(Object.assign({}, opts), { debugExcludeTypes: (opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) ?
                ['__cancel', ...opts.debugExcludeTypes] :
                ['__cancel'] }));
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
        return this.pt.__cancel.pipe(actionRelatedToAction(actionMeta));
    }
    /** Same as dispatching "__cancel" message */
    cancelAction(queryAction) {
        const cancel = this.createAction('__cancel', [queryAction.t]);
        assignActionReferParam(cancel, queryAction);
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
        return new ActionDataTable(this.at[actionType], keySelector);
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