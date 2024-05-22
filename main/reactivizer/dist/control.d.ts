import * as rx from 'rxjs';
import { Action, InferPayload, ActionMeta, InferMapParam, ArrayOrTuple, ControllerCore, Dispatch, DispatchFor, CoreOptions } from './stream-core';
import { PayloadByType, ActionByType } from './inferred-types';
export * from './stream-core';
export type DispatchAndObserveRes<I, K extends keyof I> = <F>(waitForAction$: rx.Observable<Action<F>>, ...params: InferPayload<I[K]>) => rx.Observable<InferMapParam<F>>;
export type DispatchForAndObserveRes<I, K extends keyof I> = <F>(waitForAction$: rx.Observable<Action<F>>, relateToActionMeta: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: InferPayload<I[K]>) => rx.Observable<InferMapParam<F>>;
export declare class RxController<I> {
    opts?: (CoreOptions<I> & {
        debugTableAction?: boolean | undefined;
    }) | undefined;
    core: ControllerCore<I>;
    dispatcher: {
        [K in keyof I]: Dispatch<I[K]>;
    };
    dispatcherFor: {
        [K in keyof I]: DispatchFor<I[K]>;
    };
    /** abbrevation of property "dispatcher", exactly same instance of dispatcher */
    dp: {
        [K in keyof I]: Dispatch<I[K]>;
    };
    /** abbrevation of property "dispatcherFor", exactly same instance of dispatcherFor */
    dpf: {
        [K in keyof I]: DispatchFor<I[K]>;
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
    payloadByType: PayloadByType<I>;
    /** abbrevation of payloadByType */
    pt: PayloadByType<I>;
    actionByType: ActionByType<I>;
    /** abbrevation of actionByType */
    at: ActionByType<I>;
    interceptor$: ControllerCore<I>['interceptor$'];
    constructor(opts?: (CoreOptions<I> & {
        debugTableAction?: boolean | undefined;
    }) | undefined);
    /** change CoreOptions's "name" property which is displayed in actions log for developer to identify which stream the action log entry
    * belongs to
    */
    setName(value: string): void;
    createAction<J = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>): Action<J[K]>;
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy<K>(keySelector: (action: Action<I[keyof I]>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>): rx.Observable<[newGroup: GroupedRxController<I, K>, allGroups: Map<K, GroupedRxController<I, K>>]>;
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
/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
export declare function actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/** Rx operator function, filter action or payload stream by:
 *  action's reference IDs (Action['r'])
 **/
export declare function actionRelatedToActionRelatives<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    r?: ActionMeta['r'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
export declare function actionOfContext<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i?: ActionMeta['i'];
    r?: ActionMeta['r'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
export declare function throwErrorOnRelated<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/** @deprecated use actionRelatedToAction instead */
export declare const payloadRelatedToAction: typeof actionRelatedToAction;
export declare function serializeAction<I = any, K extends keyof I = any>(action: Action<I[K]>): {
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
export declare function deserializeAction<I>(actionObj: any, toController: RxController<I>): Action<I[keyof I]>;
export declare function mapActionToPayload<F>(): (up: rx.Observable<Action<F>>) => rx.Observable<[ActionMeta, ...InferPayload<F>]>;
