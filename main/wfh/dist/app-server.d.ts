import * as rx from 'rxjs';
export declare const exit$: rx.BehaviorSubject<"done" | "start" | null>;
/** Emitted function will be executed during server shutdown phase */
export declare const shutdownHooks: (() => (rx.ObservableInput<any> | void))[];
