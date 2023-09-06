import * as rx from 'rxjs';
import { RxController, ActionFunctions } from './control';
import { DuplexController, DuplexOptions } from './duplex';
export type Reactor<I extends ActionFunctions> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I extends ActionFunctions, O extends ActionFunctions> = (ctl: DuplexController<I, O>) => rx.Observable<any>;
export type ReactorCompositeActions = {
    stopAll(): void;
};
export type ReactorCompositeOutput = {
    onError(label: string, originError: any): void;
};
export type InferFuncReturnEvents<I extends ActionFunctions> = {
    [K in keyof I as `${K & string}Resolved`]: (p: ReturnType<I[K]> extends PromiseLike<infer P> ? P : ReturnType<I[K]> extends rx.Observable<infer OB> ? OB : ReturnType<I[K]>) => void;
} & {
    [K in keyof I as `${K & string}Completed`]: () => void;
};
export declare class ReactorComposite<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>> extends DuplexController<ReactorCompositeActions & I, ReactorCompositeOutput & O> {
    private opts?;
    protected reactorSubj: rx.Subject<[label: string, stream: rx.Observable<any>, disableCatchError?: boolean]>;
    constructor(opts?: DuplexOptions<I & O> | undefined);
    startAll(): rx.Subscription;
    reactivize<F extends {
        [s: string]: (...a: any[]) => any;
    }>(fObject: F): ReactorComposite<I & F, { [K in keyof F as `${K & string}Resolved`]: (p: ReturnType<F[K]> extends PromiseLike<infer P> ? P : ReturnType<F[K]> extends rx.Observable<infer OB> ? OB : ReturnType<F[K]>) => void; } & { [K_1 in keyof F as `${K_1 & string}Completed`]: () => void; } & O>;
    /**
     * It is just a declaration of mergeMap() operator, which merge an observable to the main stream
     * which will be or has already been observed by `startAll()`.
     * This is where we can add `side effect`s
    * */
    addReaction(...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean]): void;
    /** Abbrevation of addReaction */
    r: (...params: [label: string, stream: rx.Observable<any>, disableCatchError?: boolean] | [stream: rx.Observable<any>, disableCatchError?: boolean]) => void;
    protected reactivizeFunction(key: string, func: (...a: any[]) => any, funcThisRef?: any): string;
    protected handleError(upStream: rx.Observable<any>, label?: string): rx.Observable<any>;
}
