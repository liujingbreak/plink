import * as rx from 'rxjs';
export type ActionFunctions = Record<string, any>;
export type EmptyActionFunctions = Record<string, never>;
export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type ActionMeta = {
    /** id */
    i: number;
    /** reference to other actions */
    r?: number | number[];
};
export type ArrayOrTuple<T> = T[] | readonly T[] | readonly [T, ...T[]];
export type Action<I extends ActionFunctions, K extends keyof I = keyof I & string> = {
    /** type */
    t: string;
    /** payload **/
    p: InferPayload<I[K]>;
} & ActionMeta;
export type InferMapParam<I extends ActionFunctions, K extends keyof I> = [ActionMeta, ...InferPayload<I[K]>];
export type Dispatch<F> = (...params: InferPayload<F>) => Action<any>['i'];
export type DispatchFor<F> = (origActionMeta: ActionMeta | ArrayOrTuple<ActionMeta>, ...params: InferPayload<F>) => Action<any>['i'];
export type CoreOptions<I extends ActionFunctions> = {
    name?: string | boolean;
    /** default is `true`, set to `false` will result in Connectable multicast action observable "action$" not
    * being automatically connected, you have to manually call `RxController::connect()` or `action$.connect()`,
    * otherwise, any actions that is dispatched to `actionUpstream` will not be observed and emitted by `action$`,
    * Refer to [https://rxjs.dev/api/index/function/connectable](https://rxjs.dev/api/index/function/connectable)
    * */
    autoConnect?: boolean;
    debug?: boolean;
    debugExcludeTypes?: (keyof I & string)[];
    logStyle?: 'full' | 'noParam';
    log?: (msg: string, ...objs: any[]) => unknown;
};
export declare const has: (v: PropertyKey) => boolean;
export declare class ControllerCore<I extends ActionFunctions = {
    [k: string]: never;
}> {
    opts?: CoreOptions<I> | undefined;
    actionUpstream: rx.Subject<Action<I, keyof I & string>>;
    interceptor$: rx.BehaviorSubject<(up: rx.Observable<Action<I>>) => rx.Observable<Action<I>>>;
    typePrefix: string;
    logPrefix: string;
    action$: rx.Observable<Action<I>>;
    debugExcludeSet: Set<string>;
    /** Event when `action$` is first time subscribed */
    actionSubscribed$: rx.Observable<void>;
    /** Event when `action$` is entirely unsubscribed by all observers */
    actionUnsubscribed$: rx.Observable<void>;
    protected dispatcher: { [K in keyof I]: Dispatch<I[keyof I]>; };
    protected dispatcherFor: { [K in keyof I]: DispatchFor<I[keyof I]>; };
    protected actionSubDispatcher: rx.Subject<void>;
    protected actionUnsubDispatcher: rx.Subject<void>;
    private connectableAction$;
    constructor(opts?: CoreOptions<I> | undefined);
    createAction<J extends ActionFunctions = I, K extends keyof J = keyof J>(type: K, params?: InferPayload<J[K]>): Action<J, K>;
    dispatchFactory<K extends keyof I>(type: K): Dispatch<I>;
    dispatchForFactory<K extends keyof I>(type: K): DispatchFor<I>;
    updateInterceptor(factory: (previous: (up: rx.Observable<Action<I>>) => rx.Observable<Action<I>>) => (up: rx.Observable<Action<I>>) => rx.Observable<Action<I>>): void;
    ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any, any>>) => rx.Observable<Action<I, T[number]>>;
    notOfType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any, any>>) => rx.Observable<Action<I, Exclude<keyof I, T[number]>>>;
    connect(): void;
}
/**
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
export declare function nameOfAction<I extends ActionFunctions>(action: Pick<Action<I>, 't'>): keyof I & string;
export declare function actionMetaToStr(action: ActionMeta): string;
