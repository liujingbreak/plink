import * as rx from 'rxjs';
/** This function must be invoked by providing all generic type parameters, otherwise type inference won't work */
export declare function timeoutLog<T>(millseconds: number, callbackOnTimeout: () => void): (up: rx.Observable<T>) => rx.Observable<T>;
/**
 * Turn string to web worker transferable `ArrayBuffer`
 */
export declare function str2ArrayBuffer<T extends SharedArrayBuffer | ArrayBuffer>(str: string, isShared?: boolean): T;
export declare function arrayBuffer2str(buf: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): any;
/**
 * Turn ascii string to web worker transferable `ArrayBuffer` by Uint8Array
 */
export declare function ascii2ArrayBuffer<T extends SharedArrayBuffer | ArrayBuffer>(str: string, isShared?: boolean): T;
export declare function arrayBuffer2ascii(buf: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): any;
