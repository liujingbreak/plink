import * as rx from 'rxjs';
export type ActionFunctions = {
    [k: string]: any;
};
type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type Action<I extends ActionFunctions, K extends keyof I = keyof I> = {
    /** id */
    i: number;
    /** type */
    t: string;
    /** payload **/
    p: InferPayload<I[K]>;
};
type InferMapParam<I extends ActionFunctions, K extends keyof I> = [Action<any>['i'], ...InferPayload<I[K]>];
export type PayloadStream<I extends ActionFunctions, K extends keyof I> = rx.Observable<InferMapParam<I, K>>;
type Dispatch<I extends ActionFunctions> = (...params: InferPayload<I[keyof I]>) => Action<any>['i'];
export type CoreOptions = {
    debug?: string | boolean;
    debugExcludeTypes?: string[];
    log?: (msg: string, ...objs: any[]) => unknown;
};
export declare class ControllerCore<I extends ActionFunctions = {
    [k: string]: never;
}> {
    opts?: CoreOptions | undefined;
    actionUpstream: rx.Subject<Action<I, keyof I>>;
    interceptor$: rx.BehaviorSubject<(up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>>;
    typePrefix: string;
    debugName: string;
    action$: rx.Observable<Action<I, keyof I>>;
    debugExcludeSet: Set<string>;
    protected dispatcher: { [K in keyof I]: Dispatch<I>; };
    constructor(opts?: CoreOptions | undefined);
    createAction<K extends keyof I>(type: K, params?: InferPayload<I[K]>): Action<I, K>;
    dispatcherFactory<K extends keyof I>(type: K): Dispatch<I>;
    replaceActionInterceptor(factory: (origin: (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>) => (up: rx.Observable<Action<I, keyof I>>) => rx.Observable<Action<I, keyof I>>): void;
    ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any, any>>) => rx.Observable<Action<I, T[number]>>;
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
     * Conceptually, it is a "state store" like Apache Kafka's "table"
     * From perspecitve of implementation, a map ReplaySubject which provides similiar function as rx.withLatestFrom() does
     * @return Pick<...>
     The reason using `Pick<{[K in keyof I]: PayloadStream<I, K>}, T[number]>` instead of `{[K in T[number]]: PayloadStream<I, K>` is that the former expression
     makes Typescript to jump to `I` type definition source code when we perform operation like "Go to definition" in editor, the latter can't
     */
    createLatestPayloadsFor<T extends (keyof I)[]>(...types: T): Pick<{
        [K in keyof I]: PayloadStream<I, K>;
    }, T[number]>;
    protected debugLogLatestActionOperator<P>(type: string): rx.OperatorFunction<P, P>;
}
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
export declare function nameOfAction<I extends ActionFunctions>(action: Pick<Action<I, keyof I>, 't'>): keyof I & string;
export declare function serializeAction(action: Action<any>): Action<any>;
export declare function deserializeAction<I extends ActionFunctions>(actionObj: any, toController: RxController<I>): number;
export {};
