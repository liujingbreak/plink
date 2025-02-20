import * as rx from 'rxjs';
import { Action, ActionMeta, ActionFunctions } from './stream-core';
import { RxController2, ControllerBaseActions } from './control2';
import { SingleActionFactory } from './action-factory';
import { SimplexReactorOptions, SimplexReactorCfgOpts } from './reactor-base';
import { ActionTable } from './action-table';
import { ForkedRxController } from './forked-control';
import { ForkedPostRxController } from './forked-post-control';
import { InferFuncReturnEvents, ActionFactoryOfPlainType, ExtractTupleElement } from './inferred-types';
export interface BaseActions<I = any, LI extends readonly (keyof I)[] = readonly []> {
    /** This event is when we can dispatch actions for initializing "action table" */
    __onError(err: any): SingleActionFactory;
    __config(opts: SimplexReactorOptions<I, LI>): SingleActionFactory;
    __onDisposed(): SingleActionFactory;
    /** extends ControllerBaseActions */
    __cancel: ControllerBaseActions['__cancel'];
}
declare const baseTableFor: readonly ["__onError", "__onDisposed"];
type LE<LI extends readonly any[]> = LI[number] | ExtractTupleElement<typeof baseTableFor>;
export declare class SimplexReactor<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly []> {
    /** All catched error goes here, including those from "dispatchErrorFor" */
    error$: rx.Observable<readonly [error: any, label: string | null]>;
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
    /** shortcut to table.l */
    latest: ActionTable<I & BaseActions<I>, LE<LI>>['l'];
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    table: ActionTable<I & BaseActions<I>, LE<LI>>;
    id: number;
    opts?: SimplexReactorOptions<unknown, readonly never[]>;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    protected errorSubject: rx.Subject<[label: string, originError: any]>;
    constructor(opts?: SimplexReactorOptions<I, LI>);
    /**
     * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
     * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
     * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
     */
    config<I2 = Record<string, never>, L2 extends (Array<keyof I2 | keyof I> | ReadonlyArray<keyof I2 | keyof I>) = never>(opts: SimplexReactorCfgOpts<I, I2, L2>): SimplexReactor<I & I2, readonly (LI[number] | L2[number])[]>;
    /** Turn current reactors to extend mode,
     * fork a stream RxController2 to ForkedRxController, so that we can create new reactors by subscribing to
     * new forked stream controller, and be able to manipulate previously created reactors by "appendInterceptorToSrc()"
     **/
    forExtend(): DerivedSimplexReactor<I, LI>;
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
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): this;
    /** @deprecated call dispose() instead */
    destory(): void;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
/** You should never create instance by constructor of this class,
 **/
export interface DerivedSimplexReactor<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly []> extends SimplexReactor<I, LI> {
    s: ForkedRxController<I & BaseActions>;
    postBase: ForkedPostRxController<I & BaseActions>;
    /** alias of postBase */
    p: ForkedPostRxController<I & BaseActions>;
}
export {};
