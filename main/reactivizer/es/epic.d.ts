import * as rx from 'rxjs';
import { RxController, ActionFunctions, ActionMeta } from './control';
import { DuplexController } from './duplex';
import { ActionTable } from './action-table';
import { ReactorCompositeOpt } from './reactor-base';
export { ReactorCompositeOpt } from './reactor-base';
interface BaseEvents {
    _onErrorFor(err: any): void;
}
type LOE<LI extends readonly any[]> = readonly (LI[number] | '_onErrorFor')[];
export declare class ReactorComposite<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexController<I, O & BaseEvents> {
    private opts?;
    protected errorSubject: rx.Subject<[
        lable: string,
        originError: any
    ] | [
        lable: string,
        originError: any,
        relevantActions: ActionMeta[]
    ]>;
    /** All catched error goes here */
    error$: rx.Observable<[lable: string, originError: any] | [lable: string, originError: any, relevantActions: ActionMeta[]]>;
    destory$: rx.Subject<void>;
    dispose: () => void;
    get inputTable(): ActionTable<I, LI>;
    get outputTable(): ActionTable<O & BaseEvents, LOE<LO>>;
    private iTable;
    private oTable;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    constructor(opts?: ReactorCompositeOpt<I, O, LI, LO> | undefined);
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): void;
    /** @deprecated call dispose() instead */
    destory(): void;
    reactivize<F extends ActionFunctions>(fObject: F): ReactorComposite<I & F, { [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => import("./action-factory").SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => import("./action-factory").SingleActionFactory; } & O, LI, LO>;
    reativizeRecursiveFuncs<F extends ActionFunctions>(fObject: F): ReactorComposite<{ [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => import("./action-factory").SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => import("./action-factory").SingleActionFactory; } & I & F, { [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => import("./action-factory").SingleActionFactory; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => import("./action-factory").SingleActionFactory; } & O, LI, LO>;
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
    dispatchErrorFor(err: any, actionMetas: ActionMeta | ActionMeta[]): void;
    protected createDispatchAndObserveProxy<I>(streamCtl: RxController<I>): void;
    protected reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
