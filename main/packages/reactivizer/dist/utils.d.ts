import * as rx from 'rxjs';
export declare function timeoutLog<T>(millseconds: number, log: () => void): (up: rx.Observable<T>) => rx.Observable<T>;
