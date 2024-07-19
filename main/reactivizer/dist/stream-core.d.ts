import * as rx from 'rxjs';
import { RxControlConfigType } from './global-config';
export type ActionFunctions = Record<string, any>;
export type EmptyActionFunctions = Record<string, never>;
export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type InferMapParam<F> = [ActionMeta, ...InferPayload<F>];
export type ActionMeta = {
    /** id */
    i: number;
    /** The ActionMeta['i'] of other actions that is referred to by this action */
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
export type DispatchFor<F> = (origActionMeta: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>, ...params: InferPayload<F>) => Action<F>;
export type CoreOptions<I> = {
    name?: string;
    /** default is `true`, set to `false` will result in Connectable multicast action observable "action$" not
    * being automatically connected, you have to manually call `RxController::connect()` or `action$.connect()`,
    * otherwise, any actions that is dispatched to `actionUpstream` will not be observed and emitted by `action$`,
    * Refer to [https://rxjs.dev/api/index/function/connectable](https://rxjs.dev/api/index/function/connectable)
    * */
    autoConnect?: boolean;
    /** default is `false`, setting `true` will print message in console log */
    debug?: boolean;
    /** Log all actions whose type is listed in this property, by default "undefined" means actions of all types will be logged. */
    debugIncludeTypes?: (keyof I)[] | null;
    /** Exclude actions of specific types from "debugIncludeTypes" */
    debugExcludeTypes?: (keyof I)[];
    /**
     * "full" - print full message content, including "type" and "payload" tuple
     * "noParam" - print message type, without payload tuple
     */
    logStyle?: 'full' | 'noParam';
    /** Use a customized log function
     */
    log?: null | ((msg: string, ...objs: any[]) => unknown);
};
export declare const has: (v: PropertyKey) => boolean;
export declare class ControllerCore<I> {
    actionUpstream: rx.Subject<Action<I[keyof I]>>;
    /** Insert action "interceptor" operator function
     */
    interceptor$: rx.Subject<(up: rx.Observable<Action<I[keyof I]>>) => rx.Observable<Action<I[keyof I]>>>;
    logPrefix: string;
    action$: rx.Observable<Action<I[keyof I]>>;
    debugIncludeSet: Set<string | number | symbol> | null | undefined;
    debugExcludeSet: Set<string | number | symbol>;
    /** Event when `action$` is first time subscribed */
    actionSubscribed$: rx.Observable<void>;
    /** Event when `action$` is entirely unsubscribed by all observers */
    actionUnsubscribed$: rx.Observable<void>;
    configChange: rx.Subject<Set<"log" | "name" | "debug" | "debugIncludeTypes" | "debugExcludeTypes" | "logStyle">>;
    opts: CoreOptions<any>;
    protected dispatcher: { [K in keyof I]: Dispatch<I[K]>; };
    protected dispatcherFor: { [K in keyof I]: DispatchFor<I[K]>; };
    private connectableAction$;
    constructor(opts?: CoreOptions<I>);
    createAction<J = I, K extends keyof J = keyof J>(name: K, params?: InferPayload<J[K]>): Action<J[K]>;
    /** action id is also copied */
    copyActionFrom(source: Action<any>): Action<I[keyof I]>;
    /** change the "name" as previous specified in CoreOptions of constructor */
    setName(name: string | null | undefined): void;
    /** This method is used to change `this.opts` which is initially provided in constructor.
     * Only changed properties are merged to current options */
    config(opts: RxControlConfigType<I>): void;
    /** Insert action "interceptor" operator function */
    prependInterceptor(interceptor: (up: rx.Observable<Action<I[keyof I]>>) => rx.Observable<Action<I[keyof I]>>): void;
    /** This method is not meant to be used directly */
    dispatchFactory<K extends keyof I>(type: K): Dispatch<I[K]>;
    /** This method is not meant to be used directly */
    dispatchForFactory<K extends keyof I>(type: K): DispatchFor<I[K]>;
    ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[T[number]]>>;
    notOfType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[Exclude<keyof I, T[number]>]>>;
    isType<K extends keyof I>(action: Action<I[keyof I]>, type: K): action is Action<I[K]>;
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
export declare function assignActionReferParam(action: Action<any>, metas: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): Action<any>;
