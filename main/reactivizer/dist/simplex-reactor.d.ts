import * as rx from 'rxjs';
import { Action, ActionMeta, ActionFunctions } from './stream-core';
import { RxController2 } from './control2';
import { SingleActionFactory } from './action-factory';
import { SimplexReactorOptions, SimplexReactorCfgOpts } from './reactor-base';
import { ActionTable } from './action-table';
import { InferFuncReturnEvents, ActionFactoryOfPlainType, ExtractTupleElement } from './inferred-types';
export interface BaseActions<I = any, LI extends readonly (keyof I)[] = readonly []> {
    /** This event is when we can dispatch actions for initializing "action table" */
    __onError(err: any): SingleActionFactory;
    __config(opts: SimplexReactorOptions<I, LI>): SingleActionFactory;
    __onDisposed(): SingleActionFactory;
}
declare const baseTableFor: readonly ["__onError", "__onDisposed"];
type LE<LI extends readonly any[]> = LI[number] | ExtractTupleElement<typeof baseTableFor>;
export declare class SimplexReactor<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = readonly [], BaseType = unknown> {
    protected errorSubject: rx.Subject<[label: string, originError: any]>;
    /** All catched error goes here, including those from "dispatchErrorFor" */
    error$: rx.Observable<readonly [error: any, label: string | null]>;
    destory$: rx.Observable<unknown>;
    dispose: () => void;
    /** default stream controller used also as Reactor's internal message stream */
    s: RxController2<I & BaseActions>;
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    table: ActionTable<I & BaseActions<I>, LE<LI>>;
    /** cast current SimplexReactor type to its logical super type for Typescript type assignable check */
    asBaseType: BaseType;
    /** alias of "asBaseType",
     * cast current SimplexReactor type to its logical super type for Typescript type assignable check
     **/
    b: BaseType;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    private id;
    opts?: SimplexReactorOptions<I, LI>;
    constructor(opts?: SimplexReactorOptions<I, LI>);
    /**
     * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
     * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
     * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
     */
    config<I2 = Record<string, never>, L2 extends (Array<keyof I2> | ReadonlyArray<keyof I2>) = never>(opts: SimplexReactorCfgOpts<I, I2, L2>): SimplexReactor<I & I2, readonly (LI[number] | L2[number])[], SimplexReactor<I, LI, BaseType>>;
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
    reactivize<F extends ActionFunctions>(fObject: F): SimplexReactor<I & ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, LI, BaseType>;
    log(...msg: any[]): void;
    reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): this;
    /** @deprecated call dispose() instead */
    destory(): void;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
export {};
