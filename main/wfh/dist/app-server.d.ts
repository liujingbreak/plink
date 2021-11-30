import * as rx from 'rxjs';
export declare const exit$: rx.BehaviorSubject<"start" | "done" | null>;
/** Emitted function will be executed during server shutdown phase */
export declare const shutdownHook$: rx.ReplaySubject<() => (rx.ObservableInput<any> | void)>;
