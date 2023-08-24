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
export declare class ReactorComposite<I extends ActionFunctions = Record<string, never>, O extends ActionFunctions = Record<string, never>> {
    private opts?;
    latestPayloads: {
        [K in 'mergeStream']: PayloadStream<ReactorCompositeActions, K>;
    };
    l: ReactorComposite<I, O>['latestPayloads'];
    protected control: DuplexController<ReactorCompositeActions, ReactorCompositeOutput>;
    constructor(opts?: DuplexOptions | undefined);
    startAll(): rx.Subscription;
    getControl(): DuplexController<ReactorCompositeActions & I, ReactorCompositeOutput & O>;
    protected handleError(upStream: rx.Observable<any>, label?: string): rx.Observable<any>;
}
