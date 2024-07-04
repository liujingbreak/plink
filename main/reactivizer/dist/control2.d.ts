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
     * This method create a new RxController2 which recieve exactly same action messages as the current controlle does.
     * In short, subscribers of both controllers can recieve messages dispatched from both controller, just the subscribers of "prepend" controller always
     * recieves earlier than any subscribers of this controller.
     * It helps to conquer recursive message emitting problem when add more reactors to existing message stream.
     *
     * 1. current dispatches --message--> current.actionUpstream(intercepted) --> this.actionUpstream (intercepted) --> current.action$, this.action$
     * 2. This dispatches --message--> this.actionUpstream (intercepted) --> current.action$, this.action$
     *
     * The "prepend" controller will always recieve a copy of each action message from current controller, and awlays recieves earlier than this controller's subscribers,
     * Any action dispatched by current controller will always be piped to this controller's actionUpstream instead of its owns, so that again, both
     * current and prepend controller will recieves them.
     *
     * Notice the order of prependController and interceptors set by `interceptor$.next()`, it behaves differetly as below:
     * - prependController should recieve message dispatched by both controllers, but base controller can not recieve message from either controller,
     *   **when interceptor of base controller is added before prependController() invocation** (interceptor is appended after prependController to pipeline as reverse order)
     * - prependController emitted recieve message can be recieved by both controllers, but messages dispatched from the base controller are all blocked by interceptor
     *   when interceptor is added later than prependController() happens (in which case interceptor is prior to prependController in pipe line)
     */
    prependController(name?: string): RxController2<I>;
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
export declare function deserializeAction2<I>(actionObj: any, toController: RxController2<I>): void;
