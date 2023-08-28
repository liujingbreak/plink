import * as rx from 'rxjs';
import { RxController, ActionFunctions, PayloadStream } from './control';
import { DuplexController, DuplexOptions } from './duplex';
export type Reactor<I extends ActionFunctions> = (ctl: RxController<I>) => rx.Observable<any>;
export type DuplexReactor<I extends ActionFunctions, O extends ActionFunctions> = (ctl: DuplexController<I, O>) => rx.Observable<any>;
export type ReactorCompositeActions = {
    mergeStream(stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string): void;
    stopAll(): void;
};
export type ReactorCompositeOutput = {
    onError(label: string, originError: any): void;
};
export type InferFuncReturnEventNames<I extends ActionFunctions> = {
    [K in keyof I as `${K & string}Done`]: (p: ReturnType<I[K]> extends PromiseLike<infer P> ? P : ReturnType<I[K]> extends rx.Observable<infer OB> ? OB : ReturnType<I[K]>) => void;
};
export declare class ReactorComposite<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>> extends DuplexController<I & ReactorCompositeActions, O> {
    private opts?;
    protected latestCompActPayloads: {
        [K in 'mergeStream']: PayloadStream<ReactorCompositeActions, K>;
    };
    constructor(opts?: DuplexOptions | undefined);
    startAll(): rx.Subscription;
    reactivize<F extends {
        [s: string]: (...a: any[]) => any;
    }>(fObject: F): ReactorComposite<I & F, InferFuncReturnEventNames<F> & O>;
    addReaction(...params: [stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string]): void;
    /** Abbrevation of addReaction */
    r(...params: [stream: rx.Observable<any>, disableCatchError?: boolean, errorLabel?: string]): void;
    protected handleError(upStream: rx.Observable<any>, label?: string): rx.Observable<any>;
}
