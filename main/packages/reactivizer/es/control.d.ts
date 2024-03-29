import * as rx from 'rxjs';
import { Action, InferPayload, ActionMeta, ArrayOrTuple, ControllerCore, Dispatch, DispatchFor, CoreOptions } from './stream-core';
export * from './stream-core';
export type InferMapParam<I, K extends keyof I> = [ActionMeta, ...InferPayload<I[K]>];
export type DispatchAndObserveRes<I, K extends keyof I> = <O, R extends keyof O>(waitForAction$: rx.Observable<Action<O, R>>, ...params: InferPayload<I[K]>) => rx.Observable<InferMapParam<O, R>>;
export type DispatchForAndObserveRes<I, K extends keyof I> = <O, R extends keyof O>(waitForAction$: rx.Observable<Action<O, R>>, relateToActionMeta: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: InferPayload<I[K]>) => rx.Observable<InferMapParam<O, R>>;
export declare class RxController<I> {
    opts?: (CoreOptions<I> & {
        debugTableAction?: boolean | undefined;
    }) | undefined;
    core: ControllerCore<I>;
    dispatcher: {
        [K in keyof I]: Dispatch<I, K & string>;
    };
    dispatcherFor: {
        [K in keyof I]: DispatchFor<I, K & string>;
    };
    /** abbrevation of property "dispatcher", exactly same instance of dispatcher */
    dp: {
        [K in keyof I]: Dispatch<I, K & string>;
    };
    /** abbrevation of property "dispatcherFor", exactly same instance of dispatcherFor */
    dpf: {
        [K in keyof I]: DispatchFor<I, K & string>;
    };
    dispatchAndObserveRes: {
        [K in keyof I]: DispatchAndObserveRes<I, K>;
    };
    /** abbrevation of property "dispatchAndObserveRes", exactly same instance of dispatchAndObserveRes */
    do: {
        [K in keyof I]: DispatchAndObserveRes<I, K>;
    };
    dispatchForAndObserveRes: {
        [K in keyof I]: DispatchForAndObserveRes<I, K>;
    };
    /** abbrevation of dispatchForAndObserveRes */
    dfo: {
        [K in keyof I]: DispatchForAndObserveRes<I, K>;
    };
    payloadByType: {
        [K in keyof I]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>;
    };
    /** abbrevation of payloadByType */
    pt: {
        [K in keyof I]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>;
    };
    actionByType: {
        [K in keyof I]: rx.Observable<Action<I, K>>;
    };
    /** abbrevation of actionByType */
    at: {
        [K in keyof I]: rx.Observable<Action<I, K>>;
    };
    updateInterceptor: ControllerCore<I>['updateInterceptor'];
    constructor(opts?: (CoreOptions<I> & {
        debugTableAction?: boolean | undefined;
    }) | undefined);
    /** change CoreOptions's "name" property which is displayed in actions log for developer to identify which stream the action log entry
    * belongs to
    */
    setName(value: string): void;
    createAction<J = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>): Action<J, K>;
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy<K>(keySelector: (action: Action<I>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>): rx.Observable<[newGroup: GroupedRxController<I, K>, allGroups: Map<K, GroupedRxController<I, K>>]>;
    /**
     * create a new RxController whose action$ is filtered for action types which are included in `actionTypes`
     */
    subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController<Pick<I, KS[number]>>;
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController<Pick<I, KS[number]>>;
    /**
     * Delegate to `this.core.action$.connect()`
     * "core.action$" is a `connectable` observable, under the hood, it is like `action$ = connectable(actionUpstream)`.
     *
     * By default `connect()` will be immediately invoked in constructor function, when "options.autoConnect" is
     * `undefined` or `true`, in that case you don't need to call this method manually.
     *
     * Refer to [connectable](https://rxjs.dev/api/index/function/connectable)
     */
    connect(): void;
}
export declare class GroupedRxController<I, K> extends RxController<I> {
    key: K;
    constructor(key: K, opts?: CoreOptions<I>);
}
/**
 * If we consider ActionTable a 2-dimentional data structure, this is the infer type of it.
 * Each row is latest action payload of an action type (or name),
 * each column is a element of payload content array.
 *
 * If you use ActionTable as a frontend UI state (like for a UI template), this infer type
 * defines exactly data structure of it.
 *
 */
export type ActionTableDataType<I, KS extends ReadonlyArray<keyof I>> = {
    [P in KS[number]]: InferPayload<I[P]> | [];
};
export declare class ActionTable<I, KS extends ReadonlyArray<keyof I>> {
    #private;
    private streamCtl;
    actionNames: KS;
    latestPayloads: { [K in KS[number]]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>; };
    /** Abbrevation of "latestPayloads", pointing to exactly same instance of latestPayloads */
    l: {
        [K in KS[number]]: rx.Observable<[ActionMeta, ...InferPayload<I[K]>]>;
    };
    get dataChange$(): rx.Observable<ActionTableDataType<I, KS>>;
    private data;
    actionSnapshot: Map<keyof I, [ActionMeta, ...InferPayload<I[keyof I]>]>;
    private actionNamesAdded$;
    constructor(streamCtl: RxController<I>, actionNames: KS);
    getData(): ActionTableDataType<I, KS>;
    /** Add actions to be recoreded in table map,
     * by creating `ReplaySubject(1)` for each action payload stream respectively
     */
    addActions<M extends Array<keyof I>>(...actionNames: M): ActionTable<I, (KS[number] | M[number])[]>;
    private onAddActions;
    getLatestActionOf<K extends KS[number]>(actionName: K): InferMapParam<I, K> | undefined;
    protected debugLogLatestActionOperator<K extends keyof I, P extends InferMapParam<I, K>>(type: K): rx.OperatorFunction<P, P>;
}
/** Rx operator function */
export declare function actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
export declare function throwErrorOnRelated<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/** @deprecated use actionRelatedToAction instead */
export declare const payloadRelatedToAction: typeof actionRelatedToAction;
export declare function serializeAction<I = any, K extends keyof I = any>(action: Action<I, K>): {
    t: string;
    p: InferPayload<I[K]>;
    i: number;
    r?: number | number[] | undefined;
};
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export declare function deserializeAction<I>(actionObj: any, toController: RxController<I>): Action<I, keyof I>;
export declare function mapActionToPayload<I, K extends keyof I>(): (up: rx.Observable<Action<I, K>>) => rx.Observable<[ActionMeta, ...InferPayload<I[keyof I]>]>;
