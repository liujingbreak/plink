"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeoutLog = timeoutLog;
exports.str2ArrayBuffer = str2ArrayBuffer;
exports.arrayBuffer2str = arrayBuffer2str;
exports.ascii2ArrayBuffer = ascii2ArrayBuffer;
exports.arrayBuffer2ascii = arrayBuffer2ascii;
const rx = __importStar(require("rxjs"));
function timeoutLog(millseconds, callbackOnTimeout) {
    return function (up) {
        let hasValue = false;
        return rx.merge(up.pipe(rx.map(v => {
            hasValue = true;
            return v;
        })), rx.timer(millseconds).pipe(rx.map(() => {
            if (!hasValue) {
                callbackOnTimeout();
            }
        }), rx.take(1), rx.ignoreElements()));
    };
}
/**
 * Turn string to web worker transferable `ArrayBuffer`
 */
function str2ArrayBuffer(str, isShared = false) {
    const buf = isShared ? new SharedArrayBuffer(str.length << 1) : new ArrayBuffer(str.length << 1);
    const u16arr = new Uint16Array(buf);
    for (let i = 0, l = str.length; i < l; i++) {
        u16arr[i] = str.charCodeAt(i);
    }
    return buf;
}
function arrayBuffer2str(buf, byteOffset, length) {
    return String.fromCharCode.apply(null, (new Uint16Array(buf, byteOffset, length)));
}
/**
 * Turn ascii string to web worker transferable `ArrayBuffer` by Uint8Array
 */
function ascii2ArrayBuffer(str, isShared = false) {
    const buf = isShared ? new SharedArrayBuffer(str.length) : new ArrayBuffer(str.length);
    const u16arr = new Uint8Array(buf);
    for (let i = 0, l = str.length; i < l; i++) {
        u16arr[i] = str.charCodeAt(i);
    }
    return buf;
}
function arrayBuffer2ascii(buf, byteOffset, length) {
    return String.fromCharCode.apply(null, (new Uint8Array(buf, byteOffset, length)));
}
//# sourceMappingURL=utils.js.map