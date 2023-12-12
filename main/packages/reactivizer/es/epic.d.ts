import * as rx from 'rxjs';
import { RxController, ActionTable, ActionFunctions } from './control';
import { DuplexController, DuplexOptions } from './duplex';
export type Reactor<I> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I, O> = (ctl: DuplexController<I, O>) => rx.Observable<any>;
export type InferFuncReturnEvents<I> = {
    [K in keyof I as `${K & string}Resolved`]: (p: I[K] extends (...args: any) => PromiseLike<infer P> ? P : I[K] extends (...args: any) => rx.Observable<infer OB> ? OB : I[K] extends infer R ? R : unknown) => void;
} & {
    [K in keyof I as `${K & string}Completed`]: () => void;
};
export interface ReactorCompositeOpt<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexOptions<I & O> {
    name: string;
    inputTableFor?: LI;
    outputTableFor?: LO;
}
export declare class ReactorComposite<I = Record<never, never>, O = Record<never, never>, LI extends readonly (keyof I)[] = readonly [], LO extends readonly (keyof O)[] = readonly []> extends DuplexController<I, O> {
    private opts?;
    protected errorSubject: rx.Subject<[lable: string, originError: any]>;
    /** All catched error goes here */
    error$: rx.Observable<[lable: string, originError: any]>;
    destory$: rx.Subject<void>;
    dispose: () => void;
    get inputTable(): ActionTable<I, LI>;
    get outputTable(): ActionTable<O, LO>;
    private iTable;
    private oTable;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    constructor(opts?: ReactorCompositeOpt<I, O, LI, LO> | undefined);
    /** @deprecated no longer needed, always start automatically after being contructed */
    startAll(): void;
    /** @deprecated call dispose() instead */
    destory(): void;
    reactivize<F extends ActionFunctions>(fObject: F): ReactorComposite<I & F, { [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & O, LI, LO>;
    reativizeRecursiveFuncs<F extends ActionFunctions>(fObject: F): ReactorComposite<{ [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & I & F, { [K in keyof F as `${K & string}Resolved`]: (p: F[K] extends (...args: any) => PromiseLike<infer P> ? P : F[K] extends (...args: any) => rx.Observable<infer OB> ? OB : F[K] extends infer R ? R : unknown) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & O, LI, LO>;
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
    protected reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    protected logError(label: string, err: any): void;
    protected handleError(upStream: rx.Observable<any>, label?: string, hehavior?: 'continue' | 'stop' | 'throw'): rx.Observable<any>;
}
type InferInputActionsType<R> = R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>;
type InferOutputEventsType<R> = R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>;
type ExtractTupleElement<T> = T extends readonly (infer R)[] ? R : never;
type InferLatestActionType<R> = R extends ReactorComposite<any, any, infer LI, any> ? ExtractTupleElement<LI> : never;
type InferLatestEventsType<R> = R extends ReactorComposite<any, any, any, infer LO> ? ExtractTupleElement<LO> : never;
/** An utility type inference which helps to define a new ReactorComposite type based on extending an existing ReactorComposite type */
export type ReactorCompositeMergeType<R extends ReactorComposite<any, any, any, any>, ExActions = Record<never, never>, ExEvents = Record<never, never>, ELI extends readonly (keyof ExActions | keyof InferInputActionsType<R>)[] = readonly [], ELO extends readonly (keyof ExEvents | keyof InferOutputEventsType<R>)[] = readonly []> = ReactorComposite<(R extends ReactorComposite<infer I, any, any, any> ? I : Record<never, never>) & ExActions, (R extends ReactorComposite<any, infer O, any, any> ? O : Record<never, never>) & ExEvents, readonly (InferLatestActionType<R> | ExtractTupleElement<ELI>)[], readonly (InferLatestEventsType<R> | ExtractTupleElement<ELO>)[]>;
export {};
