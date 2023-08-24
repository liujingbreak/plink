import * as rx from 'rxjs';
export type ActionFunctions = object;
type InferPayload<F extends (...a: any[]) => any> = Parameters<F>;
export type Action<I extends ActionFunctions, K extends keyof I = keyof I> = {
    /** id */
    i: number;
    /** type */
    t: string;
    /** payload **/
    p: InferPayload<I[K]>;
};
type InferMapParam<I extends ActionFunctions, K extends keyof I> = [Action<I, K>['i'], ...InferPayload<I[K]>];
export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<InferMapParam<I, K>>;
export type CoreOptions = {
    debug?: string | boolean;
    log?: (msg: string, ...objs: any[]) => unknown;
};
export declare class ControllerCore<I extends ActionFunctions = {
    [k: string]: never;
}> {
    opts?: CoreOptions | undefined;
    actionUpstream: rx.Subject<Action<I, keyof I>>;
    dispatcher: { [K in keyof I]: (...params: Parameters<I[K]>) => number; };
    interceptor$: rx.BehaviorSubject<(up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>>;
    typePrefix: string;
    debugName: string;
    action$: rx.Observable<Action<I, keyof I>>;
    constructor(opts?: CoreOptions | undefined);
    createAction<K extends keyof I>(type: K, params: InferPayload<I[K]>): Action<I, K>;
    dispatcherFactory<K extends keyof I>(type: K): { [K_1 in keyof I]: (...params: Parameters<I[K_1]>) => number; }[K];
    replaceActionInterceptor(factory: (origin: (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>) => (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>): void;
    ofType<T extends keyof I>(...types: [T, ...T[]]): (up: rx.Observable<Action<any, any>>) => rx.Observable<Action<I, T>>;
}
export declare class RxController<I extends ActionFunctions> {
    private opts?;
    core: ControllerCore<I>;
    dispatcher: {
        [K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i'];
    };
    dp: {
        [K in keyof I]: (...params: InferPayload<I[K]>) => Action<I, K>['i'];
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
    replaceActionInterceptor: ControllerCore<I>['replaceActionInterceptor'];
    constructor(opts?: CoreOptions | undefined);
    /**
     * Conceptually, it is a "store store" like Apache Kafka's "table"
     * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
     */
    createLatestPayloadsFor<T extends keyof I>(...types: [T, ...T[]]): {
        [K in T]: PayloadStream<I, K>;
    };
    protected debugLogLatestActionOperator<P>(type: string): rx.OperatorFunction<P, P>;
}
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
export declare function nameOfAction<I extends ActionFunctions>(action: Action<I, keyof I>): keyof I | undefined;
export {};
