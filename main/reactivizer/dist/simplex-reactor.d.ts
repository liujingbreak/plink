import * as rx from 'rxjs';
import { Action, ActionMeta, ActionFunctions, InferMapParam, InferPayload, CoreOptions } from './stream-core';
import { RxController2, ControllerBaseActions, ActionInterceptor } from './control2';
import { SingleActionFactory } from './action-factory';
import { SimplexReactorOptions, SimplexReactorCfgOpts } from './reactor-base';
import { ActionTable } from './action-table';
import { ForkedRxController } from './forked-control';
import { ForkedPostRxController } from './forked-post-control';
import { InferFuncReturnEvents, ActionFactoryOfPlainType } from './inferred-types';
import { SingleActionInterceptor } from './single-action-interceptor';
export interface BaseActions<I = any, LI extends readonly (keyof I)[] = readonly []> {
    __onError(err: any): SingleActionFactory;
    __config(opts: SimplexReactorOptions<I, LI>): SingleActionFactory;
    __onDisposed(): SingleActionFactory;
    /** extends ControllerBaseActions */
    __cancel: ControllerBaseActions['__cancel'];
}
declare const internalTableFor: readonly ["__onError", "__onDisposed"];
type LE<LI extends readonly any[]> = LI[number] | (typeof internalTableFor)[number];
export type PreActionHook<I, K extends keyof I = keyof I> = (...payload: InferMapParam<I[K]>) => rx.Observable<InferPayload<I[K]>>;
export declare class SimplexReactor<I = Record<string, never>, LI extends readonly (keyof I)[] = []> {
    /** All catched error goes here, including those from "dispatchErrorFor" */
    error$: rx.Observable<readonly [error: any, label: string | null]>;
    /** When "dispose" method is invoked, __onDisposed message will be emitted,
    * subscribing this observable is equivalent to subscribing "__onDisposed" message.
    * Be aware, any subscription created through current service's `r()` is "rx.takeUntil(pt.__onDisposed)`,
    * so don't define "reactor" against `destory$` or `pt.__onDisposed` through `r()`,
    * any logic inside it will never be triggered. The subscription to destory$ will
    * take effect if it is through plain observable `subscribe()` or another service's `r()` method.
    **/
    destory$: rx.Observable<unknown>;
    dispose: () => void;
    /** default stream controller used also as Reactor's internal message stream */
    s: RxController2<I & BaseActions>;
    /** shortcut to s.pt */
    pt: RxController2<I & BaseActions>['pt'];
    /** shortcut to s.at */
    at: RxController2<I & BaseActions>['at'];
    /** shortcut to s.ft */
    ft: RxController2<I & BaseActions>['ft'];
    /** Add a "pre-hook" of specific message type, all returned observable of provided hook functions
     * of that specific message type will be `rx.concat()` together,
     * thus the returned an Observable must be completed in the future, otherwise it will block
     * messages being recieved by reactors.
     * Any subscription to that specific message type (aka reactor) will recieved message after all
     * pre-hooks completes.
     *
     * the value function returns a function to remove pre-hook previously added.
     * e.g.
     * ```
     *    const service = someFactory.create();
     *    const {preHooks} = service;
     *    const removeHook = preHooks.actionFoobar('prehook for actionFoobar', (m, params) => {
     *        // do something about params...
     *        // Remove current hook setting of message "actionFoobar"
     *        removeHook();
     *    });
    **/
    preHooks: {
        [K in keyof I & string]: (labelOrPreHook: string | PreActionHook<I, K>, preHook?: PreActionHook<I, K>) => () => void;
    };
    /** shortcut to table.l */
    latest: ActionTable<I & BaseActions<I>, LE<LI>>['l'];
    postBase: RxController2<I & BaseActions>;
    /** alias of postBase */
    p: RxController2<I & BaseActions>;
    /** Define an reactor (RxJS observable subscription) */
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    table: ActionTable<I & BaseActions<I>, LE<LI>>;
    id: number;
    opts?: CoreOptions<any>;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    protected errorSubject: rx.Subject<[label: string, originError: any]>;
    private preActionHook$;
    private removePreActionHook$;
    constructor(opts?: SimplexReactorOptions<I, LI>);
    protected createRxControllers<I0, LI0 extends readonly (keyof I0)[]>(opts?: SimplexReactorOptions<I0, LI0>): RxController2<I0>;
    getLogName(): string;
    /**
     * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
     * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
     * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
     */
    config<I2 = Record<string, never>, L2 extends readonly (keyof I2 | keyof I)[] = []>(opts: SimplexReactorCfgOpts<I, I2, L2>): SimplexReactor<I & I2, readonly (LI[number] | L2[number])[]>;
    /** @deprecated use toExtend instead
     * Turn current reactors to extend mode,
     * fork a stream RxController2 to ForkedRxController, so that we can create new reactors by subscribing to
     * new forked stream controller, and be able to manipulate previously created reactors by "appendInterceptorToSrc()"
     **/
    forExtend(): DerivedSimplexReactor<I, LI>;
    /**
     * A compromise: returned instance has more features like "forkUpStream", "interceptSrcAction", but remains using same
     * type "SimplexReactor" due to Typescript does not consider an extended SimplexReactor type is assignable to
     * SimplexReactor<any, any>, mainly because it regards these properties whose type is like `keyof I` is not assignable to
     * `{[key: string]: any}`. This blocks using another "extends" type to indicates differentiated features.
    **/
    toExtend<I2 = object, LI2 extends readonly (keyof I2 | keyof I)[] = []>(): SimplexReactor<I & I2, readonly (LI[number] | LI2[number])[]>;
    private addPreHook;
    /**
     * prepend action stream interceptor by action type, the interceptors will intercept messages
     * before they reach all inherited and current SimplexReactor
     */
    prependInterceptor(inter: ActionInterceptor<I>): () => void;
    /**
     * If current instance is an extending SimplexReactor, this method is same as
     * ` return (this.s as ForkedRxController).interceptSrcAction(...params)`, otherwise
     * This method is supposed to be invoked when a certain Action message is recieved, at the moment
     * source forked stream has not recieved the same message yet.
     * By executing this method, current action message will be prevented from being emitted to any subscribers
     * of source forked stream.
     *
     * @return a function to continue emitting the intercepted message to source forked stream with chance to
     *    change the payload content of the message.
     *    the returned emit function has one parameter to allow replacing action payload, or executed with no
     *    parameter to emit same action message without any change.
   */
    interceptBase<K extends keyof I = keyof I>(metaOrId: ActionMeta | ActionMeta['i']): SingleActionInterceptor<I, K>;
    /**
     * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
     * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
     * errors, you should add your own "catchError" after.
     *
     * `addReaction(label, ...)` uses this op internally.
     */
    labelError<T>(label: string): (upStream: rx.Observable<T>) => rx.Observable<T>;
    catchErrorFor<T>(actionMeta: ActionMeta, ...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T>;
    /** Rx operator function, filter action or payload stream by:
    * action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
    * invokes "catchErrorFor()" or "dispatchErrorFor()"
    */
    actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
        i: ActionMeta['i'];
    }): (up: rx.Observable<T>) => rx.Observable<T>;
    /** Respond an error to actions specified by "actionMeta",
     * be aware that this message is not an Observable's "error" message,
     * it will not terminate observable stream.
     * This method emits an event "__onError" under the hood.
     */
    dispatchErrorFor(err: any, actionMeta: ActionMeta, ...moreActionMetas: ActionMeta[]): void;
    reactivize<F extends ActionFunctions>(fObject: F): SimplexReactor<I & ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, LI>;
    log(...msg: any[]): void;
    reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    toString(): string;
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): this;
    /** @deprecated call dispose() instead */
    destory(): void;
    protected logError(label: string, err: {
        message?: string;
    }): void;
    protected handleErrorOp(label?: string, hehavior?: 'continue' | 'stop' | 'throw'): (upStream: rx.Observable<any>) => rx.Observable<any>;
}
/** @deprecated
 * should never create instance by constructor of this class,
 **/
export interface DerivedSimplexReactor<I = Record<never, never>, LI extends readonly (keyof I)[] = []> extends SimplexReactor<I, LI> {
    s: ForkedRxController<I & BaseActions>;
    postBase: ForkedPostRxController<I & BaseActions>;
    /** alias of postBase */
    p: ForkedPostRxController<I & BaseActions>;
}
export {};
