import * as rx from 'rxjs';
import { Action, InferPayload, ActionMeta, ArrayOrTuple, ControllerCore, CoreOptions, InferMapParam } from './stream-core';
import { PayloadByType, ActionByType } from './inferred-types';
import { ActionDataTable } from './action-table';
import { ActionDispenser } from './stream-dispense';
import type { ForkedRxController as ForkedRxControllerConst } from './forked-control';
import { SingleActionFactory } from './action-factory';
export { SingleActionFactory };
export type ActionFactory = {
    [k: string]: (...args: any[]) => SingleActionFactory;
};
export type ActionInterceptor<I> = (ac: ActionDispenser<I>) => rx.Observable<Action<unknown>>;
export interface ControllerBaseActions {
    __cancel(origActionType: string): SingleActionFactory;
}
export declare class RxController2<I> extends ControllerCore<I> {
    /** Abbrevation of payloadByType */
    pt: PayloadByType<I & ControllerBaseActions>;
    /** Action observable streamby type */
    at: ActionByType<I & ControllerBaseActions>;
    /** Action factory by type */
    get ft(): I & ControllerBaseActions;
    private ftProxy;
    private factories;
    /**
     * you don't need to use this Subject directly, it is meant to be extended by Reactivizer internally
     * */
    doOperator$: rx.BehaviorSubject<(<A>(dispatchingAction: {
        i: ActionMeta["i"];
    }) => (response$: rx.Observable<A>) => rx.Observable<A>)>;
    constructor(opts?: CoreOptions<I> & {
        debugTableAction?: boolean;
    });
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
     *        rx.takeUntil(s.onCancelOf(m)), // This is where you need "onCancelOf()" to tell when to stop relevant service for certain original action
     *        rx.map(result => s.ft.updateResult(result).dp(m))
     *      );
     *    )
     * ).subscribe();
     * ```
     */
    onCancelOf(actionMeta: ActionMeta): rx.Observable<[ActionMeta, ...InferPayload<(I & ControllerBaseActions)["__cancel"]>]>;
    appendInterceptorByType(interceptor: ActionInterceptor<I>): void;
    prependInterceptorByType(interceptor: ActionInterceptor<I>): void;
    /**
     * This method create a new RxController2 which recieve exactly same action messages as the current controlle does.
     * In short, subscribers of both controllers can recieve messages dispatched from both controller, just the subscribers of "forked" controller always
     * recieves earlier than any subscribers of this controller.
     * It helps to conquer recursive message emitting problem when adding more reactors to existing message stream.
     */
    forkController(): ForkedRxControllerConst<I>;
    /** alias of forkController() */
    prependController(): ForkedRxControllerConst<I>;
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy<K>(keySelector: (action: Action<unknown>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>): rx.Observable<[newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>]>;
    /**
     * create a new RxController, pipe actions whose tyoes are specofied in parameter `actionTypes` from this controller to the new controller
     */
    subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController2<Pick<I, KS[number]> & ControllerBaseActions>;
    /**
     * Create an very simple and naive version Apache Kafka KTable like "observable Map<K, Action>",
     * a table which retains latest action by "key"
     **/
    createDataTable<T extends keyof I, K>(actionType: T, keySelector: (action: InferMapParam<I[T]>) => K): ActionDataTable<I, T, K>;
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Omit<I, KS[number]>>): RxController2<Omit<I, KS[number]> & ControllerBaseActions>;
    /**
     * Create a variant of calling .ft(...).dp(...)`
     **/
    createDispatcherFor<K extends keyof I>(type: K, ...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): (...params: InferPayload<I[K]>) => void;
    /**
     * Create a variant of interface of functions `<I>.ft(...).dp(...)`
     **/
    createDispatchers(...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): {
        [K in keyof I]: (...params: InferPayload<I[K]>) => void;
    };
}
export declare class GroupedRxController2<I, K> extends RxController2<I> {
    key: K;
    constructor(key: K, opts?: CoreOptions<I>);
}
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export declare function deserializeAction2<I>(actionObj: any, toController: RxController2<I>): void;
