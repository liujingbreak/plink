import * as rx from 'rxjs';
import { SimplexReactor } from './simplex-reactor';
/** This function must be invoked by providing all generic type parameters, otherwise type inference won't work */
export declare function defineParialSimplexReactor<I, LI extends ReadonlyArray<keyof I> = never[]>(tableFor?: LI): <I2, LI2 extends ReadonlyArray<keyof I2>>(targetService: SimplexReactor<I2, LI2>) => SimplexReactor<I & I2, (LI[number] | LI2[number])[]>;
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
