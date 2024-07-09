import * as rx from 'rxjs';
import { Action, ActionMeta, ActionFunctions } from './stream-core';
import { RxController2 } from './control2';
import { SingleActionFactory } from './action-factory';
import { SimplexReactorOptions, SimplexReactorCfgOpts } from './reactor-base';
import { ActionTable } from './action-table';
import { InferFuncReturnEvents, ActionFactoryOfPlainType, ExtractTupleElement } from './inferred-types';
export interface BaseActions<I = any, LI extends readonly (keyof I)[] = readonly []> {
    /** Internal use, when option `debug` is `true`, this message will be dispatched when
     * ReactorComposite2 is instantiated */
    __onNew(): SingleActionFactory;
    __onError(err: any): SingleActionFactory;
    __config(opts: SimplexReactorOptions<I & BaseActions<LI>, LI>): SingleActionFactory;
    __onDisposed(): SingleActionFactory;
}
declare const baseTableFor: readonly ["__onError", "__onDisposed"];
type LE<LI extends readonly any[]> = readonly (LI[number] | ExtractTupleElement<typeof baseTableFor>)[];
export declare class SimplexReactor<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = []> {
    protected errorSubject: rx.Subject<[label: string, originError: any]>;
    /** All catched error goes here, including those from "dispatchErrorFor" */
    error$: rx.Observable<readonly [error: any, label: string | null]>;
    destory$: rx.Observable<unknown>;
    dispose: () => void;
    /** default stream controller used also as Reactor's internal message stream */
    s: RxController2<I>;
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    table: ActionTable<I & BaseActions<I>, LE<LI>>;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    private id;
    opts?: SimplexReactorOptions<any, readonly any[]>;
    constructor(opts?: SimplexReactorOptions<I & BaseActions<I>, LI>);
    /**
     * This method can be used to change "options" after SimplexReactor instanciation, e.g. `.change({debug: true})` to enable action tracing log for debug.
     * This method can also be useful to "cast" type of one SimplexReactor type to another extended type, in this case generic type parameter `<I2, LI2>` must
     * be explicitly provided to ensure returned type being correctly inferred, a property `tableFor` of parameter `opts` must be provided to correspond with `LI2`
     */
    config<I2 = Record<string, never>, LI2 extends ReadonlyArray<keyof I2> = []>(opts: SimplexReactorCfgOpts<I & BaseActions<any>, I2, LI2>): SimplexReactor<I & I2, (LI[number] | LI2[number])[]>;
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
    startAll(): void;
    /** @deprecated call dispose() instead */
    destory(): void;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
export {};
