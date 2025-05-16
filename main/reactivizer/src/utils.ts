/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
import * as rx from 'rxjs';

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

export function onAllSubscribed<T extends readonly unknown[]>(
  inputs: {[K in keyof T]: rx.Observable<T[K]>},
  onAllSubscribed: () => void,
  onAllUnsubscribed?: () => void
): {[K in keyof T]: rx.Observable<T[K]>} {
  // when all (counted) the returned streams are subscribed, dispatch the new action
  const onSubscribe$ = new rx.Subject<number>();
  onSubscribe$.pipe(
    rx.distinct(),
    rx.take(inputs.length)
  ).subscribe({
    complete: onAllSubscribed
  });
  const onUnsubscribe$ = new rx.Subject<number>();
  onUnsubscribe$.pipe(
    rx.distinct(),
    rx.take(inputs.length)
  ).subscribe({
    complete: onAllUnsubscribed
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return inputs.map((input, idx) => rx.merge(
    input.pipe(
      rx.finalize(() => {
        onUnsubscribe$.next(idx);
      })
    ),
    new rx.Observable<never>(sink => {
      onSubscribe$.next(idx);
      sink.complete();
    })
  )) as any;
}
