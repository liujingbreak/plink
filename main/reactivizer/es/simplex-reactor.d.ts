import * as rx from 'rxjs';
import { Action, ActionMeta, ActionFunctions } from './stream-core';
import { RxController2 } from './control2';
import { SingleActionFactory } from './action-factory';
import { SimplexReactorOptions } from './reactor-base';
import { ActionTable } from './action-table';
import { RxControlConfigType } from './global-config';
import { ActionFactoryOfPlainType, ExtractTupleElement } from './inferred-types';
export interface BaseActions<I = Record<never, never>, LI extends readonly (keyof I)[] = readonly []> {
    /** Internal use, when option `debug` is `true`, this message will be dispatched when
     * ReactorComposite2 is instantiated */
    __onNew(): SingleActionFactory;
    __onError(err: any): SingleActionFactory;
    __config(opts: SimplexReactorOptions<I, LI>): SingleActionFactory;
    __onDisposed(): SingleActionFactory;
}
declare const baseTableFor: readonly ["__onError", "__onDisposed"];
type LE<LI extends readonly any[]> = readonly (LI[number] | ExtractTupleElement<typeof baseTableFor>)[];
export declare class SimplexReactor<I = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = []> {
    opts?: SimplexReactorOptions<I & BaseActions<LI, readonly []>, LE<LI>> | undefined;
    protected errorSubject: rx.Subject<[lable: string, originError: any] | [lable: string, originError: any, relevantActions: ActionMeta[]]>;
    /** All catched error goes here, including those from "dispatchErrorFor" */
    error$: rx.Observable<any>;
    destory$: rx.Observable<unknown>;
    dispose: () => void;
    /** default stream controller used also as Reactor's internal message stream */
    s: RxController2<I>;
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    table: ActionTable<I & BaseActions<I>, LE<LI>>;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    private id;
    constructor(opts?: SimplexReactorOptions<I & BaseActions<LI, readonly []>, LE<LI>> | undefined);
    config(opts: RxControlConfigType<I>): void;
    /**
     * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
     * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
     * errors, you should add your own "catchError" after.
     *
     * `addReaction(lable, ...)` uses this op internally.
     */
    labelError<T>(label: string): (upStream: rx.Observable<T>) => rx.Observable<T>;
    catchErrorFor<T>(actionMeta: ActionMeta, ...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T>;
    /** Rx operator function, filter action or payload stream by:
   *  action ID (Action['i']), this method also react to __onError messages, the returned observable emits Error message when the initial action producer
   *  invokes "catchErrorFor()" or "dispatchErrorFor()"
   **/
    actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
        i: ActionMeta['i'];
    }): (up: rx.Observable<T>) => rx.Observable<T>;
    /** Respond an error to actions specified by "actionMeta",
     * be aware that this message is not an Observable's "error" message,
     * it will not terminate observable stream.
     * This method emits an event "__onError" under the hood.
     */
    dispatchErrorFor(err: any, actionMeta: ActionMeta, ...moreActionMetas: ActionMeta[]): void;
    reactivize<F extends ActionFunctions>(fObject: F): SimplexReactor<I & ActionFactoryOfPlainType<F> & { [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => SingleActionFactory; }, LI>;
    reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): void;
    /** @deprecated call dispose() instead */
    destory(): void;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
export {};
