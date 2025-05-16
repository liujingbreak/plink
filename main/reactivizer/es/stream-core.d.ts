import * as rx from 'rxjs';
import { CoreOptions } from './base-types';
export { CoreOptions } from './base-types';
export type ActionFunctions = Record<string, any>;
export type EmptyActionFunctions = Record<string, never>;
export type InferPayload<F> = F extends (...a: infer P) => any ? P : unknown[];
export type InferMapParam<F> = [ActionMeta, ...InferPayload<F>];
export interface ActionMeta {
    /** id */
    i: number;
    /** The ActionMeta['i'] of other actions that is referred to by this action */
    r?: number | number[];
}
export type ArrayOrTuple<T> = T[] | readonly T[] | readonly [T, ...T[]];
export declare class Action<F = unknown> implements ActionMeta {
    t: string;
    p: InferPayload<F>;
    static fromJsonObj(obj: ReturnType<Action['toJson']>): Action<unknown>;
    /** id */
    i: number;
    /** The ActionMeta['i'] of other actions that is referred to by this action */
    r?: number | number[];
    /**
    * use RxController2::createAction() instead,
    * otherwise don't forget to assign id number to property "i"
    **/
    constructor(t: string, p: InferPayload<F>);
    toJson(): {
        i: number;
        r: number | number[] | undefined;
        t: string;
        p: InferPayload<F>;
    };
    copy(override?: Partial<ReturnType<Action['toJson']>>): Action<F>;
}
export type Dispatch<F> = (...params: InferPayload<F>) => Action<F>;
export type DispatchFor<F> = (origActionMeta: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>, ...params: InferPayload<F>) => Action<F>;
export declare const has: (v: PropertyKey) => boolean;
export type Interceptor = (up: rx.Observable<Action>) => rx.Observable<Action>;
export declare class ControllerCore<I> {
    actionUpstream: rx.Subject<Action<unknown>>;
    _noFilterUpstream: rx.Subject<Action<unknown>>;
    /** Insert action "interceptor" operator function
     */
    logPrefix: string;
    action$: rx.Observable<Action>;
    debugIncludeSet: Set<string | number | symbol> | null | undefined;
    debugExcludeSet: Set<string | number | symbol>;
    /** Event when `action$` is first time subscribed */
    actionSubscribed$: rx.Observable<void>;
    /** Event when `action$` is entirely unsubscribed by all observers */
    actionUnsubscribed$: rx.Observable<void>;
    configChange: rx.ReplaySubject<Set<keyof CoreOptions<I>>>;
    opts: CoreOptions<unknown>;
    interceptorList$: rx.BehaviorSubject<Interceptor[]>;
    protected dispatcher: { [K in keyof I]: Dispatch<I[K]>; };
    protected dispatcherFor: { [K in keyof I]: DispatchFor<I[K]>; };
    private connectableAction$;
    constructor(opts?: CoreOptions<I>);
    createAction<J = I, K extends keyof J = keyof J>(type: K, params: InferPayload<J[K]>): Action<J[K]>;
    /** change a debug convenient "name" as previous specified in CoreOptions of constructor */
    setName(name: string | null | undefined): void;
    /** This method is used to change `this.opts` which is initially provided in constructor.
     * Only changed properties are merged to current options */
    config(opts: CoreOptions<I>): void;
    /** Insert action "interceptor" operator function
    * @returns a function to remove inserted interceptors
    **/
    prependInterceptor(...interceptor: Interceptor[]): () => void;
    /** If you want all the action messages go through this interceptor including those go to `forking` controller's reactors,
    * you probably should use `prependInterceptor()` instead, read source of `ForkedRxController`
    * @returns a function to remove inserted interceptors
    **/
    appendInterceptor(...interceptor: Interceptor[]): () => void;
    removeInterceptor(...interc: Interceptor[]): void;
    appendInterceptorToSrc(..._interceptors: Interceptor[]): void;
    /** Obsolete: This method is not meant to be used directly */
    dispatchFactory<K extends keyof I>(type: K): Dispatch<I[K]>;
    /** This method is not meant to be used directly */
    dispatchForFactory<K extends keyof I>(type: K): DispatchFor<I[K]>;
    /** A filter operator function which only allow action with specific types */
    ofType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[T[number]]>>;
    notOfType<T extends (keyof I)[]>(...types: T): (up: rx.Observable<Action<any>>) => rx.Observable<Action<I[Exclude<keyof I, T[number]>]>>;
    isType<K extends keyof I>(action: Action, type: K): action is Action<I[K]>;
    /** see CoreOption['autoConnect']
     */
    connect(): void;
}
/**
 * @deprecated use "action.t" instead
 * Get the "action name" from payload's "type" field,
 * `payload.type`` is actually consist of string like `${Prefix}/${actionName}`,
 * this function returns the `actionName` part
 * @return undefined if current action doesn't have a valid "type" field
 */
export declare function nameOfAction<I = ActionFunctions>(action: Pick<Action, 't'>): keyof I;
export declare function actionMetaToStr(action: ActionMeta): string;
export declare function assignActionReferParam(action: Action<any>, metas: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): Action<any>;
