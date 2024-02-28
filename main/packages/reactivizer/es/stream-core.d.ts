import * as rx from 'rxjs';
export type ActionFunctions = Record<string, any>;
export type EmptyActionFunctions = Record<string, never>;
export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type InferMapParam<F> = [ActionMeta, ...InferPayload<F>];
export type ActionMeta = {
    /** id */
    i: number;
    /** reference to other actions */
    r?: number | number[];
};
export type ArrayOrTuple<T> = T[] | readonly T[] | readonly [T, ...T[]];
export type Action<F> = {
    /** type */
    t: string;
    /** payload **/
    p: InferPayload<F>;
} & ActionMeta;
export type Dispatch<F> = (...params: InferPayload<F>) => Action<F>;
export type DispatchFor<F> = (origActionMeta: ActionMeta | ArrayOrTuple<ActionMeta>, ...params: InferPayload<F>) => Action<F>;
export type CoreOptions<I> = {
    name?: string;
    /** default is `true`, set to `false` will result in Connectable multicast action observable "action$" not
    * being automatically connected, you have to manually call `RxController::connect()` or `action$.connect()`,
    * otherwise, any actions that is dispatched to `actionUpstream` will not be observed and emitted by `action$`,
    * Refer to [https://rxjs.dev/api/index/function/connectable](https://rxjs.dev/api/index/function/connectable)
    * */
    autoConnect?: boolean;
    debug?: boolean;
    /** Log all actions whose type is listed in this property, by default "undefined" means actions of all types will be logged. */
    debugIncludeTypes?: (keyof I)[];
    /** Exclude actions of specific types from "debugIncludeTypes" */
    debugExcludeTypes?: (keyof I)[];
    logStyle?: 'full' | 'noParam';
    log?: (msg: string, ...objs: any[]) => unknown;
};
export declare const has: (v: PropertyKey) => boolean;
export declare class ControllerCore<I> {
    opts?: CoreOptions<I> | undefined;
    actionUpstream: rx.Subject<Action<I[keyof I]>>;
    /** Add or change action "interceptor" by emiting new value to this BehaviorSubject */
    interceptor$: rx.BehaviorSubject<(up: rx.Observable<Action<I[keyof I]>>) => rx.Observable<Action<I[keyof I]>>>;
    typePrefix: string;
    logPrefix: string;
    action$: rx.Observable<Action<I[keyof I]>>;
    debugIncludeSet: Set<string | number | symbol> | null;
    debugExcludeSet: Set<string | number | symbol>;
    /** Event when `action$` is first time subscribed */
    actionSubscribed$: rx.Observable<void>;
    /** Event when `action$` is entirely unsubscribed by all observers */
    actionUnsubscribed$: rx.Observable<void>;
    protected dispatcher: { [K in keyof I]: Dispatch<I[K]>; };
    protected dispatcherFor: { [K in keyof I]: DispatchFor<I[K]>; };
    protected actionSubDispatcher: rx.Subject<void>;
    protected actionUnsubDispatcher: rx.Subject<void>;
    private connectableAction$;
    constructor(opts?: CoreOptions<I> | undefined);
    createAction<J = I, K extends keyof J = keyof J>(type: K, params?: InferPayload<J[K]>): Action<J[K]>;
    /** change the "name" as previous specified in CoreOptions of constructor */
    setName(name: string | null | undefined): void;
    /** This method is not meant to be used directly */
    dispatchFactory<K extends keyof I>(type: K): Dispatch<I[K]>;
    /** This method is not meant to be used directly */
    dispatchForFactory<K extends keyof I>(type: K): DispatchFor<I[K]>;
    ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[T[number]]>>;
    notOfType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[Exclude<keyof I, T[number]>]>>;
    connect(): void;
}
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
export declare function nameOfAction<I = ActionFunctions>(action: Pick<Action<I[keyof I]>, 't'>): keyof I;
export declare function actionMetaToStr(action: ActionMeta): string;
