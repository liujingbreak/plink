import * as rx from 'rxjs';
import { Action, ActionFunctions, InferMapParam, InferPayload, ActionMeta, ArrayOrTuple, ControllerCore, Dispatch, DispatchFor, PayloadStream, CoreOptions } from './stream-core';
export * from './stream-core';
type DispatchAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(waitForAction$: rx.Observable<Action<O, R>>, ...params: InferPayload<I[K]>) => rx.Observable<InferMapParam<O, R>>;
type DispatchForAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(waitForAction$: rx.Observable<Action<O, R>>, origActionMeta: ActionMeta | ArrayOrTuple<ActionMeta> | null, ...params: InferPayload<I[K]>) => rx.Observable<InferMapParam<O, R>>;
export declare class RxController<I extends ActionFunctions> {
    opts?: CoreOptions<(string & keyof I)[]> | undefined;
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
    payloadByType: {
        [K in keyof I]: PayloadStream<I, K>;
    };
    /** abbrevation of payloadByType */
    pt: {
        [K in keyof I]: PayloadStream<I, K>;
    };
    actionByType: {
        [K in keyof I]: rx.Observable<Action<I, K>>;
    };
    /** abbrevation of actionByType */
    at: {
        [K in keyof I]: rx.Observable<Action<I, K>>;
    };
    replaceActionInterceptor: ControllerCore<I>['replaceActionInterceptor'];
    constructor(opts?: CoreOptions<(string & keyof I)[]> | undefined);
    /** create state of actions, you can consider it like a map of BehaviorSubject of actions */
    createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>): Action<J, K>;
}
export declare class ActionTable<I extends ActionFunctions, KS extends ReadonlyArray<keyof I>> {
    private streamCtl;
    latestPayloads: { [K in KS[number]]: PayloadStream<I, K>; };
    /** Abbrevation of latestPayloads, pointing to exactly same instance of latestPayloads */
    l: {
        [K in KS[number]]: PayloadStream<I, K>;
    };
    actionSnapshot: Map<keyof I, [ActionMeta, ...InferPayload<I[keyof I]>]>;
    constructor(streamCtl: RxController<I>, actionNames: KS);
    addActions<M extends Array<keyof I>>(...actionNames: M): ActionTable<I, (KS[number] | M[number])[]>;
    getLatestActionOf<K extends KS[number]>(actionName: K): [ActionMeta, ...InferPayload<I[K]>] | undefined;
    protected debugLogLatestActionOperator<K extends string & keyof I, P extends InferMapParam<I, K>>(type: K): rx.OperatorFunction<P, P>;
}
/** Rx operator function */
export declare function actionRelatedToAction<T extends Action<any>>(id: ActionMeta['i']): (up: rx.Observable<T>) => rx.Observable<T>;
/** Rx operator function */
export declare function actionRelatedToPayload<T extends [ActionMeta, ...any[]]>(id: ActionMeta['i']): (up: rx.Observable<T>) => rx.Observable<T>;
export declare function serializeAction<I extends ActionFunctions = any, K extends keyof I = string>(action: Action<I, K>): {
    t: string;
    p: InferPayload<I[K]>;
    i: number;
    r?: number | number[] | undefined;
};
/**
 * Create a new Action with same "i" and "r" properties and dispatched to RxController
 * @return that dispatched new action object
 */
export declare function deserializeAction<I extends ActionFunctions>(actionObj: any, toController: RxController<I>): Action<I, keyof I>;
