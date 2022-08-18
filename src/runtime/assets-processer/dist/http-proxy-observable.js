"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeProxyResponse = exports.httpProxyObservable = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const EVENTS = 'error,start,proxyReq,proxyRes,ProxyReqWs,econnreset,end,open,close'.split(',');
function httpProxyObservable(proxy) {
    const obsObj = {};
    const createdSubjs = {};
    for (const event of EVENTS) {
        Object.defineProperty(obsObj, event, {
            get() {
                let ob = createdSubjs[event];
                if (ob) {
                    return ob;
                }
                const sub = rx.fromEventPattern(handler => proxy.on(event, handler), handler => proxy.off(event, handler)).pipe(op.map(args => ({
                    type: event,
                    payload: args
                })));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                createdSubjs[event] = sub;
                return sub;
            }
        });
    }
    return obsObj;
}
exports.httpProxyObservable = httpProxyObservable;
const REDIRECT_STATUS = new Map([301, 302, 307, 308].map(code => [code, code]));
/**
 * e.g.
```
  rx.defer(() => {
    proxy.web(req, res, {timeout: 10000});
    return observeProxyResponse(proxy$, payload.res);
  })
```
 */
function observeProxyResponse(httpProxy$, res, skipRedirectRes = true) {
    // Same as "race" which is deprecated in RxJS 7
    return rx.merge(httpProxy$.proxyRes.pipe(op.filter(event => event.payload[2] === res &&
        !(skipRedirectRes && REDIRECT_STATUS.has(event.payload[0].statusCode || 200))), op.take(1)), rx.merge(httpProxy$.econnreset, httpProxy$.error).pipe(op.filter(event => event.payload[2] === res), op.take(1), op.mergeMap(({ payload: [err] }) => {
        return rx.throwError(err);
    }))).pipe(op.take(1));
}
exports.observeProxyResponse = observeProxyResponse;
//# sourceMappingURL=http-proxy-observable.js.map