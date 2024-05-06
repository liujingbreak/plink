import * as rx from 'rxjs';
export function timeoutLog(millseconds, log) {
    return function (up) {
        let hasValue = false;
        return rx.merge(up.pipe(rx.map(v => {
            hasValue = true;
            return v;
        })), rx.timer(millseconds).pipe(rx.map(() => {
            if (!hasValue) {
                log();
            }
        }), rx.take(1), rx.ignoreElements()));
    };
}
/**
 * Turn string to web worker transferable `ArrayBuffer`
 */
export function str2ArrayBuffer(str, isShared = false) {
    const buf = isShared ? new SharedArrayBuffer(str.length << 1) : new ArrayBuffer(str.length << 1);
    const u16arr = new Uint16Array(buf);
    for (let i = 0, l = str.length; i < l; i++) {
        u16arr[i] = str.charCodeAt(i);
    }
    return buf;
}
export function arrayBuffer2str(buf, byteOffset, length) {
    return String.fromCharCode.apply(null, (new Uint16Array(buf, byteOffset, length)));
}
/**
 * Turn ascii string to web worker transferable `ArrayBuffer` by Uint8Array
 */
export function ascii2ArrayBuffer(str, isShared = false) {
    const buf = isShared ? new SharedArrayBuffer(str.length) : new ArrayBuffer(str.length);
    const u16arr = new Uint8Array(buf);
    for (let i = 0, l = str.length; i < l; i++) {
        u16arr[i] = str.charCodeAt(i);
    }
    return buf;
}
export function arrayBuffer2ascii(buf, byteOffset, length) {
    return String.fromCharCode.apply(null, (new Uint8Array(buf, byteOffset, length)));
}
//# sourceMappingURL=utils.js.map