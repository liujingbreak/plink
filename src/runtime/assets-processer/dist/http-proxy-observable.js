"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeProxyResponse = exports.httpProxyObservable = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const EVENTS = 'error,start,proxyReq,proxyRes,ProxyReqWs,econnreset,end,open,close'.split(',');
function httpProxyObservable(proxy) {
    const obsObj = {};
    const createdSubjs = {};
    for (const event of EVENTS) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        obsObj[event] = new rx.Observable(sub => {
            const handler = (...args) => {
                sub.next({ type: event, payload: args });
            };
            proxy.on(event, handler);
            return () => proxy.off(event, handler);
        });
        Object.defineProperty(obsObj, event, {
            get() {
                let ob = createdSubjs[event];
                if (ob)
                    return ob;
                const sub = new rx.Subject();
                const handler = (...args) => {
                    sub.next({ type: event, payload: args });
                };
                proxy.on(event, handler);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                createdSubjs[event] = sub.asObservable();
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
        !(skipRedirectRes && REDIRECT_STATUS.has(event.payload[0].statusCode || 200))), op.take(1)), rx.merge(httpProxy$.econnreset, httpProxy$.error).pipe(op.filter(event => event.payload[2] === res), op.take(1), op.mergeMap(event => {
        return rx.throwError(event.payload[0]);
    }))).pipe(op.take(1));
}
exports.observeProxyResponse = observeProxyResponse;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1wcm94eS1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cC1wcm94eS1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBZ0JyQyxNQUFNLE1BQU0sR0FBRyxvRUFBb0UsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUMxRCxDQUFDO0FBTXBDLFNBQWdCLG1CQUFtQixDQUFDLEtBQWdCO0lBQ2xELE1BQU0sTUFBTSxHQUFHLEVBQXVCLENBQUM7SUFDdkMsTUFBTSxZQUFZLEdBQUcsRUFBbUIsQ0FBQztJQUV6QyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtRQUMxQixtRUFBbUU7UUFDbkUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FDK0IsR0FBRyxDQUFDLEVBQUU7WUFDcEUsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFHLElBQXdDLEVBQUUsRUFBRTtnQkFDOUQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7WUFDekMsQ0FBQyxDQUFDO1lBQ0YsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDekIsT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFnQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFRLENBQUM7UUFDVixNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUU7WUFDbkMsR0FBRztnQkFDRCxJQUFJLEVBQUUsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLElBQUksRUFBRTtvQkFDSixPQUFPLEVBQUUsQ0FBQztnQkFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQ3VDLENBQUM7Z0JBRWxFLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxJQUF3QyxFQUFFLEVBQUU7b0JBQzlELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLENBQUM7Z0JBQ0YsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3pCLG1FQUFtRTtnQkFDbkUsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxZQUFZLEVBQVMsQ0FBQztnQkFDaEQsT0FBTyxHQUFHLENBQUM7WUFDYixDQUFDO1NBQ0YsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBakNELGtEQWlDQztBQUVELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRzs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLFVBQTZCLEVBQUUsR0FBYSxFQUMvRSxlQUFlLEdBQUcsSUFBSTtJQUV0QiwrQ0FBK0M7SUFDL0MsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUNiLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUN0QixFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO1FBQ3pDLENBQUMsQ0FBQyxlQUFlLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUM5RSxFQUNELEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1gsRUFDRCxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FDcEQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQzVDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNsQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUNILENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxDQUFDO0FBQ0osQ0FBQztBQXJCRCxvREFxQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgSHR0cFByb3h5IGZyb20gJ2h0dHAtcHJveHknO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbnR5cGUgUmVzcG9uc2UgPSBQYXJhbWV0ZXJzPEh0dHBQcm94eVsnd2ViJ10+WzFdO1xuXG5leHBvcnQgdHlwZSBIdHRwUHJveHlFdmVudFBhcmFtcyA9IHtcbiAgZXJyb3I6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkVycm9yQ2FsbGJhY2s+O1xuICBzdGFydDogUGFyYW1ldGVyczxIdHRwUHJveHkuU3RhcnRDYWxsYmFjaz47XG4gIHByb3h5UmVxOiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5Qcm94eVJlcUNhbGxiYWNrPjtcbiAgcHJveHlSZXM6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVzQ2FsbGJhY2s+O1xuICBwcm94eVJlcVdzOiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5Qcm94eVJlcVdzQ2FsbGJhY2s+O1xuICBlY29ubnJlc2V0OiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5FY29ubnJlc2V0Q2FsbGJhY2s+O1xuICBlbmQ6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkVuZENhbGxiYWNrPjtcbiAgb3BlbjogUGFyYW1ldGVyczxIdHRwUHJveHkuT3BlbkNhbGxiYWNrPjtcbiAgY2xvc2U6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkNsb3NlQ2FsbGJhY2s+O1xufTtcblxuY29uc3QgRVZFTlRTID0gJ2Vycm9yLHN0YXJ0LHByb3h5UmVxLHByb3h5UmVzLFByb3h5UmVxV3MsZWNvbm5yZXNldCxlbmQsb3BlbixjbG9zZScuc3BsaXQoJywnKSBhc1xuICBBcnJheTxrZXlvZiBIdHRwUHJveHlFdmVudFBhcmFtcz47XG5cbmV4cG9ydCB0eXBlIEh0dHBQcm94eUV2ZW50T2JzID0ge1xuICBbZXZ0IGluIGtleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zXTogcnguT2JzZXJ2YWJsZTx7dHlwZTogZXZ0OyBwYXlsb2FkOiBIdHRwUHJveHlFdmVudFBhcmFtc1tldnRdfT5cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBodHRwUHJveHlPYnNlcnZhYmxlKHByb3h5OiBIdHRwUHJveHkpOiBIdHRwUHJveHlFdmVudE9icyB7XG4gIGNvbnN0IG9ic09iaiA9IHt9IGFzIEh0dHBQcm94eUV2ZW50T2JzO1xuICBjb25zdCBjcmVhdGVkU3VianMgPSB7fSBhcyB0eXBlb2Ygb2JzT2JqO1xuXG4gIGZvciAoY29uc3QgZXZlbnQgb2YgRVZFTlRTKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIG9ic09ialtldmVudF0gPSBuZXcgcnguT2JzZXJ2YWJsZTx7dHlwZToga2V5b2YgSHR0cFByb3h5RXZlbnRQYXJhbXM7XG4gICAgICBwYXlsb2FkOiBIdHRwUHJveHlFdmVudFBhcmFtc1trZXlvZiBIdHRwUHJveHlFdmVudFBhcmFtc107IH0+KHN1YiA9PiB7XG4gICAgICBjb25zdCBoYW5kbGVyID0gKC4uLmFyZ3M6IEh0dHBQcm94eUV2ZW50UGFyYW1zW3R5cGVvZiBldmVudF0pID0+IHtcbiAgICAgICAgc3ViLm5leHQoe3R5cGU6IGV2ZW50LCBwYXlsb2FkOiBhcmdzfSk7XG4gICAgICB9O1xuICAgICAgcHJveHkub24oZXZlbnQsIGhhbmRsZXIpO1xuICAgICAgcmV0dXJuICgpID0+IHByb3h5Lm9mZihldmVudCwgaGFuZGxlciBhcyAoLi4uYTogYW55W10pID0+IHZvaWQpO1xuICAgIH0pIGFzIGFueTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JzT2JqLCBldmVudCwge1xuICAgICAgZ2V0KCkge1xuICAgICAgICBsZXQgb2IgPSBjcmVhdGVkU3VianNbZXZlbnRdO1xuICAgICAgICBpZiAob2IpXG4gICAgICAgICAgcmV0dXJuIG9iO1xuICAgICAgICBjb25zdCBzdWIgPSBuZXcgcnguU3ViamVjdDx7dHlwZToga2V5b2YgSHR0cFByb3h5RXZlbnRQYXJhbXM7XG4gICAgICAgICAgcGF5bG9hZDogSHR0cFByb3h5RXZlbnRQYXJhbXNba2V5b2YgSHR0cFByb3h5RXZlbnRQYXJhbXNdOyB9PigpO1xuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSAoLi4uYXJnczogSHR0cFByb3h5RXZlbnRQYXJhbXNbdHlwZW9mIGV2ZW50XSkgPT4ge1xuICAgICAgICAgIHN1Yi5uZXh0KHt0eXBlOiBldmVudCwgcGF5bG9hZDogYXJnc30pO1xuICAgICAgICB9O1xuICAgICAgICBwcm94eS5vbihldmVudCwgaGFuZGxlcik7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgICAgY3JlYXRlZFN1YmpzW2V2ZW50XSA9IHN1Yi5hc09ic2VydmFibGUoKSBhcyBhbnk7XG4gICAgICAgIHJldHVybiBzdWI7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIG9ic09iajtcbn1cblxuY29uc3QgUkVESVJFQ1RfU1RBVFVTID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oWzMwMSwgMzAyLCAzMDcsIDMwOF0ubWFwKGNvZGUgPT4gW2NvZGUsIGNvZGVdKSk7XG4vKipcbiAqIGUuZy5cbmBgYFxuICByeC5kZWZlcigoKSA9PiB7XG4gICAgcHJveHkud2ViKHJlcSwgcmVzLCB7dGltZW91dDogMTAwMDB9KTtcbiAgICByZXR1cm4gb2JzZXJ2ZVByb3h5UmVzcG9uc2UocHJveHkkLCBwYXlsb2FkLnJlcyk7XG4gIH0pXG5gYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9ic2VydmVQcm94eVJlc3BvbnNlKGh0dHBQcm94eSQ6IEh0dHBQcm94eUV2ZW50T2JzLCByZXM6IFJlc3BvbnNlLFxuICBza2lwUmVkaXJlY3RSZXMgPSB0cnVlKTpcbiAgSHR0cFByb3h5RXZlbnRPYnNbJ3Byb3h5UmVzJ10ge1xuICAvLyBTYW1lIGFzIFwicmFjZVwiIHdoaWNoIGlzIGRlcHJlY2F0ZWQgaW4gUnhKUyA3XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBodHRwUHJveHkkLnByb3h5UmVzLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoZXZlbnQgPT4gZXZlbnQucGF5bG9hZFsyXSA9PT0gcmVzICYmXG4gICAgICAgICEoc2tpcFJlZGlyZWN0UmVzICYmIFJFRElSRUNUX1NUQVRVUy5oYXMoZXZlbnQucGF5bG9hZFswXS5zdGF0dXNDb2RlIHx8IDIwMCkpXG4gICAgICApLFxuICAgICAgb3AudGFrZSgxKVxuICAgICksXG4gICAgcngubWVyZ2UoaHR0cFByb3h5JC5lY29ubnJlc2V0LCBodHRwUHJveHkkLmVycm9yKS5waXBlKFxuICAgICAgb3AuZmlsdGVyKGV2ZW50ID0+IGV2ZW50LnBheWxvYWRbMl0gPT09IHJlcyksXG4gICAgICBvcC50YWtlKDEpLFxuICAgICAgb3AubWVyZ2VNYXAoZXZlbnQgPT4ge1xuICAgICAgICByZXR1cm4gcngudGhyb3dFcnJvcihldmVudC5wYXlsb2FkWzBdKTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AudGFrZSgxKVxuICApO1xufVxuIl19