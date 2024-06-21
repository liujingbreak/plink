import * as rx from 'rxjs';
import {SimplexReactor} from './simplex-reactor';

/** This function must be invoked by providing all generic type parameters, otherwise type inference won't work */
export function defineParialSimplexReactor<I, LI extends ReadonlyArray<keyof I> = never[]>(tableFor?: LI) {
  return function applyTo<I2, LI2 extends ReadonlyArray<keyof I2>>(targetService: SimplexReactor<I2, LI2>) {
    if (tableFor)
      targetService.table.addActions(...tableFor);
    return targetService as SimplexReactor<I & I2, (LI[number] | LI2[number])[]>;
  };
}
export function timeoutLog<T>(millseconds: number, callbackOnTimeout: () => void): (up: rx.Observable<T>) => rx.Observable<T> {
  return function(up: rx.Observable<T>): rx.Observable<T> {
    let hasValue = false;
    return rx.merge(
      up.pipe(
        rx.map(v => {
          hasValue = true;
          return v;
        })
      ),
      rx.timer(millseconds).pipe(
        rx.map(() => {
          if (!hasValue) {
            callbackOnTimeout();
          }
        }),
        rx.take(1),
        rx.ignoreElements()
      )
    );
  };
}

/**
 * Turn string to web worker transferable `ArrayBuffer`
 */
export function str2ArrayBuffer<T extends SharedArrayBuffer | ArrayBuffer>(str: string, isShared = false): T {
  const buf = isShared ? new SharedArrayBuffer(str.length << 1) : new ArrayBuffer(str.length << 1);
  const u16arr = new Uint16Array(buf);
  for (let i = 0, l = str.length; i < l; i++) {
    u16arr[i] = str.charCodeAt(i);
  }
  return buf as T;
}

export function arrayBuffer2str(buf: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number) {
  return String.fromCharCode.apply(null, (new Uint16Array(buf, byteOffset, length)) as unknown as number[]);
}
/**
 * Turn ascii string to web worker transferable `ArrayBuffer` by Uint8Array
 */
export function ascii2ArrayBuffer<T extends SharedArrayBuffer | ArrayBuffer>(str: string, isShared = false): T {
  const buf = isShared ? new SharedArrayBuffer(str.length) : new ArrayBuffer(str.length);
  const u16arr = new Uint8Array(buf);
  for (let i = 0, l = str.length; i < l; i++) {
    u16arr[i] = str.charCodeAt(i);
  }
  return buf as T;
}

export function arrayBuffer2ascii(buf: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number) {
  return String.fromCharCode.apply(null, (new Uint8Array(buf, byteOffset, length)) as unknown as number[]);
}
