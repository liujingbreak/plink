import * as rx from 'rxjs';
export type ActionFunctions = {
    [k: string]: any;
};
export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type ActionMeta = {
    /** id */
    i: number;
    /** reference to other actions */
    r?: number | number[];
};
export type Action<I extends ActionFunctions, K extends keyof I = keyof I & string> = {
    /** type */
    t: string;
    /** payload **/
    p: InferPayload<I[K]>;
} & ActionMeta;
type InferMapParam<I extends ActionFunctions, K extends keyof I> = [ActionMeta, ...InferPayload<I[K]>];
export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<InferMapParam<I, K>>;
type Dispatch<F> = (...params: InferPayload<F>) => Action<any>['i'];
type DispatchFor<F> = (referActions: ActionMeta | ActionMeta[], ...params: InferPayload<F>) => Action<any>['i'];
type DispatchAndObserveRes<I extends ActionFunctions, K extends keyof I> = <O extends ActionFunctions, R extends keyof O>(waitForAction$: rx.Observable<Action<O, R>>, ...params: InferPayload<I[K]>) => rx.Observable<InferMapParam<O, R>>;
export type CoreOptions<K extends string[]> = {
    debug?: string | boolean;
    debugExcludeTypes?: K;
    logStyle?: 'full' | 'noParam';
    log?: (msg: string, ...objs: any[]) => unknown;
};
export declare class ControllerCore<I extends ActionFunctions = {
    [k: string]: never;
}> {
    opts?: CoreOptions<(string & keyof I)[]> | undefined;
    actionUpstream: rx.Subject<Action<I, keyof I>>;
    interceptor$: rx.BehaviorSubject<(up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>>;
    typePrefix: string;
    debugName: string;
    action$: rx.Observable<Action<I, keyof I>>;
    debugExcludeSet: Set<string>;
    protected dispatcher: { [K in keyof I]: Dispatch<I[keyof I]>; };
    protected dispatcherFor: { [K in keyof I]: DispatchFor<I[keyof I]>; };
    constructor(opts?: CoreOptions<(string & keyof I)[]> | undefined);
    createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, params?: InferPayload<J[K]>): Action<J, K>;
    dispatchFactory<K extends keyof I>(type: K): Dispatch<I>;
    dispatchForFactory<K extends keyof I>(type: K): DispatchFor<I>;
    replaceActionInterceptor(factory: (origin: (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>) => (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>): void;
    ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any, any>>) => rx.Observable<Action<I, T[number]>>;
    notOfType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any, any>>) => rx.Observable<Action<I, Exclude<keyof I, T[number]>>>;
}
export declare class RxController<I extends ActionFunctions> {
    private opts?;
    core: ControllerCore<I>;
    dispatcher: {
        [K in keyof I]: Dispatch<I[K]>;
    };
    dispatcherFor: {
        [K in keyof I]: DispatchFor<I[K]>;
    };
    dp: {
        [K in keyof I]: Dispatch<I[K]>;
    };
    dpf: {
        [K in keyof I]: DispatchFor<I[K]>;
    };
    dispatchAndObserveRes: {
        [K in keyof I]: DispatchAndObserveRes<I, K>;
    };
    do: {
        [K in keyof I]: DispatchAndObserveRes<I, K>;
    };
    payloadByType: {
        [K in keyof I]: PayloadStream<I, K>;
    };
    pt: {
        [K in keyof I]: PayloadStream<I, K>;
    };
    actionByType: {
        [K in keyof I]: rx.Observable<Action<I, K>>;
    };
    at: {
        [K in keyof I]: rx.Observable<Action<I, K>>;
    };
    protected latestActionsCache: { [K in keyof I]?: rx.Observable<Action<I, K>> | undefined; };
    protected latestPayloadsCache: { [K in keyof I]?: PayloadStream<I, K> | undefined; };
    replaceActionInterceptor: ControllerCore<I>['replaceActionInterceptor'];
    constructor(opts?: CoreOptions<(string & keyof I)[]> | undefined);
    createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, ...params: InferPayload<J[K]>): Action<J, K>;
    /**
     * The function returns a cache which means you may repeatly invoke this method with duplicate parameter
     * without worrying about memory consumption
     */
    createLatestActionsFor<T extends (keyof I)[]>(...types: T): Pick<{
        [K in keyof I]: rx.Observable<Action<I, K>>;
    }, T[number]>;
    /**
     * Conceptually, it is a "state store" like Apache Kafka's "table"
     * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
     * @return Pick<...>
     The reason using `Pick<{[K in keyof I]: PayloadStream<I, K>}, T[number]>` instead of `{[K in T[number]]: PayloadStream<I, K>` is that the former expression
     makes Typescript to jump to `I` type definition source code when we perform operation like "Go to definition" in editor, the latter can't
     */
    createLatestPayloadsFor<T extends (keyof I)[]>(...types: T): Pick<{
        [K in keyof I]: PayloadStream<I, K>;
    }, T[number]>;
    protected debugLogLatestActionOperator<P extends Action<I>>(type: string): rx.OperatorFunction<P, P>;
}
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
export declare function nameOfAction<I extends ActionFunctions>(action: Pick<Action<I, keyof I>, 't'>): keyof I & string;
/** Rx operator function */
export declare function actionRelatedToAction<T extends Action<any>>(id: ActionMeta['i']): (up: rx.Observable<T>) => rx.Observable<T>;
/** Rx operator function */
export declare function actionRelatedToPayload<T extends [ActionMeta, ...any[]]>(id: ActionMeta['i']): (up: rx.Observable<T>) => rx.Observable<T>;
export declare function serializeAction<I extends ActionFunctions = any, K extends keyof I = string>(action: Action<I, K>): {
    t: string;
    /** payload **/
    p: InferPayload<I[K]>;
    /** id */
    i: number;
    /** reference to other actions */
    r?: number | number[] | undefined;
};
/**
 * Create a new Action with same "i" and "r" properties and dispatched to RxController
 * @return that dispatched new action object
 */
export declare function deserializeAction<I extends ActionFunctions>(actionObj: any, toController: RxController<I>): Action<I, keyof I>;
export {};
