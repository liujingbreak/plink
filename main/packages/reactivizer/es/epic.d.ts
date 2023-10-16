import * as rx from 'rxjs';
import { RxController, ActionTable, ActionFunctions } from './control';
import { DuplexController, DuplexOptions } from './duplex';
export type Reactor<I extends ActionFunctions> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I extends ActionFunctions, O extends ActionFunctions> = (ctl: DuplexController<I, O>) => rx.Observable<any>;
export type InferFuncReturnEvents<I extends ActionFunctions> = {
    [K in keyof I as `${K & string}Resolved`]: (p: ReturnType<I[K]> extends PromiseLike<infer P> ? P : ReturnType<I[K]> extends rx.Observable<infer OB> ? OB : ReturnType<I[K]>) => void;
} & {
    [K in keyof I as `${K & string}Completed`]: () => void;
};
export interface ReactorCompositeOpt<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexOptions<I & O> {
    name: string;
    inputTableFor?: LI;
    outputTableFor?: LO;
}
export declare class ReactorComposite<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexController<I, O> {
    private opts?;
    protected errorSubject: rx.Subject<[lable: string, originError: any]>;
    /** All catched error goes here */
    error$: rx.Observable<[lable: string, originError: any]>;
    destory$: rx.Subject<void>;
    get inputTable(): ActionTable<I, LI>;
    get outputTable(): ActionTable<O, LO>;
    private iTable;
    private oTable;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    constructor(opts?: ReactorCompositeOpt<I, O, LI, LO> | undefined);
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): void;
    destory(): void;
    reactivize<F extends {
        [s: string]: (...a: any[]) => any;
    }>(fObject: F): ReactorComposite<I & F, { [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & O, readonly [], readonly []>;
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
    labelError(label: string): (upStream: rx.Observable<any>) => rx.Observable<any>;
    protected reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
