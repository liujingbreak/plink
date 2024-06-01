import * as rx from 'rxjs';
import { Action, InferPayload, ActionMeta, ArrayOrTuple, ControllerCore, CoreOptions, InferMapParam } from './stream-core';
import { PayloadByType, ActionByType } from './inferred-types';
import { ActionDataTable } from './action-table';
import { SingleActionFactory } from './action-factory';
export { SingleActionFactory };
export type ActionFactory = {
    [k: string]: (...args: any[]) => SingleActionFactory;
};
export declare class RxController2<I> extends ControllerCore<I> {
    /** Abbrevation of payloadByType */
    pt: PayloadByType<I>;
    /** Action observable streamby type */
    at: ActionByType<I>;
    /** Action factory by type */
    get ft(): I;
    private ftProxy;
    private factories;
    /** Rx operator for `do()`, we can change it by emit new value to this observable,
     * you don't need to use this Subject directly, it is meant to be extended by Reactivizer internally
     * */
    doOperator$: rx.BehaviorSubject<(<A, F>(dispatchingAction: Action<A>) => (response$: rx.Observable<Action<F>>) => rx.Observable<Action<F>>)>;
    constructor(opts?: CoreOptions<I> & {
        debugTableAction?: boolean;
    });
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
    forkController(): RxController2<I>;
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy<K>(keySelector: (action: Action<I[keyof I]>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>): rx.Observable<[newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>]>;
    /**
     * create a new RxController, pipe actions whose tyoes are specofied in parameter `actionTypes` from this controller to the new controller
     */
    subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController2<Pick<I, KS[number]>>;
    /**
     * Create an very simple and naive version Apache Kafka KTable like "observable Map<K, Action>",
     * a table which retains latest action by "key"
     **/
    createDataTable<T extends keyof I, K>(actionType: T, keySelector: (action: InferMapParam<I[T]>) => K): ActionDataTable<I, T, K>;
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Omit<I, KS[number]>>): RxController2<Omit<I, KS[number]>>;
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
export declare function deserializeAction2<I>(actionObj: any, toController: RxController2<I>): Action<I[keyof I]>;
