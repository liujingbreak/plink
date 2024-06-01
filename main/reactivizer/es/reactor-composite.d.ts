import * as rx from 'rxjs';
import { ActionFunctions, ActionMeta } from './control';
import { SingleActionFactory } from './control2';
import { DuplexController } from './duplex2';
import { ActionTable } from './action-table';
import { ReactorCompositeOpt } from './reactor-base';
import { ActionFactoryOfPlainType, ReactorCompositeExtendType, ExtractTupleElement } from './inferred-types';
interface BaseEvents {
    /** Internal use, when option `debug` is `true`, this message will be dispatched when
     * ReactorComposite2 is instantiated */
    __onNew(): SingleActionFactory;
    __onError(err: any): SingleActionFactory;
    __onDisposed(): SingleActionFactory;
}
interface BaseActions<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> {
    __config(opts: ReactorCompositeOpt<I, O, LI, LO>): SingleActionFactory;
}
declare const baseTableFor: readonly ["__onError", "__onDisposed"];
type LOE<LI extends readonly any[]> = readonly (LI[number] | ExtractTupleElement<typeof baseTableFor>)[];
export declare class ReactorComposite2<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] | (keyof I)[] = [], LO extends readonly (keyof O)[] | (keyof O)[] = []> extends DuplexController<I & BaseActions<I, O, LI, LO>, O & BaseEvents> {
    private opts?;
    destory$: rx.Observable<unknown>;
    protected errorSubject: rx.Subject<[
        lable: string,
        originError: any
    ] | [
        lable: string,
        originError: any,
        relevantActions: ActionMeta[]
    ]>;
    dispose: () => void;
    error$: rx.Observable<any>;
    get inputTable(): ActionTable<I, LI>;
    /** alias of inputTable */
    get it(): ActionTable<I, LI>;
    /** alias of outputTable */
    get ot(): ActionTable<O & BaseEvents, LOE<LO>>;
    get outputTable(): ActionTable<O & BaseEvents, LOE<LO>>;
    private iTable;
    private oTable;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    constructor(opts?: ReactorCompositeOpt<I, O, LI, LO> | undefined);
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): void;
    /** @deprecated call dispose() instead */
    destory(): void;
    /**
     * For properties "inputTableFor", "outputTableFor", the elements inside them are considered as being added new action
     * keys to existing action table's structure
     */
    config(opts: Omit<ReactorCompositeOpt<I, O, LI, LO>, 'name' | 'autoConnect'>): void;
    reactivize<F extends ActionFunctions>(fObject: F): ReactorComposite2<I & ActionFactoryOfPlainType<F>, { [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => SingleActionFactory; } & O, LI, LO>;
    reativizeRecursiveFuncs<F extends ActionFunctions>(fObject: F): ReactorComposite2<{ [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => SingleActionFactory; } & I & ActionFactoryOfPlainType<F>, { [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => SingleActionFactory; } & O, LI, LO>;
    /**
     * It is just a declaration of mergeMap() operator, which merge an observable to the main stream
     * which will be or has already been observed by `startAll()`.
     * This is where we can add `side effect`s
    * */
    addReaction(...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]): void;
    /** Abbrevation of addReaction */
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    /**
     * An rx operator tracks down "lobel" information in error log via a 'catchError' inside it, to help to locate errors.
     * This operator will continue to throw any errors from upstream observable, if you want to play any side-effect to
     * errors, you should add your own "catchError" after.
     *
     * `addReaction(lable, ...)` uses this op internally.
     */
    labelError<T>(label: string): (upStream: rx.Observable<T>) => rx.Observable<T>;
    catchErrorFor<T>(...actionMetas: ActionMeta[]): (upStream: rx.Observable<T>) => rx.Observable<T>;
    /** Respond an error to actions specified by "actionMeta",
     * be aware that this message is not an Observable's "error" message,
     * it will not terminate observable stream.
     * This method emits an event "__onError" under the hood.
     */
    dispatchErrorFor(err: any, actionMeta: ActionMeta, ...moreActionMetas: ActionMeta[]): void;
    reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
declare class ExtendHelper<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> {
    private defineFn;
    private optsOverride;
    define(fn: (composite: ReactorComposite2<I, O, LI, LO>) => any): this;
    options(override: Pick<ReactorCompositeOpt<I, O, LI, LO>, 'inputTableFor' | 'outputTableFor' | 'debugIncludeTypes' | 'debugExcludeTypes'>): this;
    to<G extends ReactorComposite2<any, any, any, any>>(base: G): ReactorCompositeExtendType<G, I, O, LI, LO>;
}
/**
 * A function just helps to monkey-patch an existing ReactorComposite2 instance, consider this as similiar functionality of inheritance being used in OO programming
 */
export declare function patch<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []>(patchDefinition?: (composite: ReactorComposite2<I, O, LI, LO>) => void): ExtendHelper<I, O, LI, LO>;
export declare function patch<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []>(options: Pick<ReactorCompositeOpt<I, O, LI, LO>, 'inputTableFor' | 'outputTableFor' | 'debugIncludeTypes' | 'debugExcludeTypes'>, patchDefinition?: (composite: ReactorComposite2<I, O, LI, LO>) => void): ExtendHelper<I, O, LI, LO>;
export {};
