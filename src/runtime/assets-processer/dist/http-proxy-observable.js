"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeProxyResponseAndChange = exports.observeProxyResponse = exports.httpProxyObservable = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const utils_1 = require("@wfh/http-server/dist/utils");
const EVENTS = 'error,start,proxyReq,proxyRes,ProxyReqWs,econnreset,end,open,close'.split(',');
function httpProxyObservable(proxy) {
    const obsObj = {};
    const createdSubjs = {};
    for (const event of EVENTS) {
        Object.defineProperty(obsObj, event, {
            get() {
                const ob = createdSubjs[event];
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
function observeProxyResponseAndChange(httpProxy$, res, change, skipRedirectRes = true) {
    return observeProxyResponse(httpProxy$, res, skipRedirectRes).pipe(op.mergeMap(async ({ payload: [pRes] }) => {
        const content = await (0, utils_1.compressedIncomingMsgToBuffer)(pRes);
        const changed = await Promise.resolve(change(content));
        for (const [header, value] of Object.entries(pRes.headers)) {
            if (header.toLowerCase() === 'content-length') {
                continue;
            }
            if (Array.isArray(value)) {
                for (const item of value) {
                    res.setHeader(header, item);
                }
            }
            else if (value)
                res.setHeader(header, value);
        }
        await (0, utils_1.compressResponse)(changed, res, pRes.headers['content-encoding']);
    }));
}
exports.observeProxyResponseAndChange = observeProxyResponseAndChange;
//# sourceMappingURL=http-proxy-observable.js.map