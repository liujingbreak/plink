import * as rx from 'rxjs';
export declare function cacheAndReplay<T>(markAction: rx.Observable<number>, // with offset of look ahead
replayAction: rx.Observable<number>): (input: rx.Observable<T>) => any;
export declare function test(): void;
