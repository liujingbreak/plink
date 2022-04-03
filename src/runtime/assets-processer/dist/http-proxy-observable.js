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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1wcm94eS1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cC1wcm94eS1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBZ0JyQyxNQUFNLE1BQU0sR0FBRyxvRUFBb0UsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUMxRCxDQUFDO0FBTXBDLFNBQWdCLG1CQUFtQixDQUFDLEtBQWdCO0lBQ2xELE1BQU0sTUFBTSxHQUFHLEVBQXVCLENBQUM7SUFDdkMsTUFBTSxZQUFZLEdBQUcsRUFBbUIsQ0FBQztJQUV6QyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtRQUMxQixNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUU7WUFDbkMsR0FBRztnQkFDRCxJQUFJLEVBQUUsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLElBQUksRUFBRSxFQUFFO29CQUNOLE9BQU8sRUFBRSxDQUFDO2lCQUNYO2dCQUVELE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FDN0IsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsRUFDbkMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FDckMsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2QsSUFBSSxFQUFFLEtBQUs7b0JBQ1gsT0FBTyxFQUFFLElBQUk7aUJBQ2QsQ0FBQyxDQUFDLENBQ0osQ0FBQztnQkFDRixtRUFBbUU7Z0JBQ25FLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFVLENBQUM7Z0JBQ2pDLE9BQU8sR0FBRyxDQUFDO1lBQ2IsQ0FBQztTQUNGLENBQUMsQ0FBQztLQUNKO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQTVCRCxrREE0QkM7QUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBaUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEc7Ozs7Ozs7O0dBUUc7QUFDSCxTQUFnQixvQkFBb0IsQ0FBQyxVQUE2QixFQUFFLEdBQWEsRUFDL0UsZUFBZSxHQUFHLElBQUk7SUFFdEIsK0NBQStDO0lBQy9DLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FDYixVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FDdEIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztRQUN6QyxDQUFDLENBQUMsZUFBZSxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLENBQUMsQ0FDOUUsRUFDRCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNYLEVBQ0QsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQ3BELEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUM1QyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEVBQUUsRUFBRTtRQUMvQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUIsQ0FBQyxDQUFDLENBQ0gsQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNYLENBQUM7QUFDSixDQUFDO0FBckJELG9EQXFCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBIdHRwUHJveHkgZnJvbSAnaHR0cC1wcm94eSc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxudHlwZSBSZXNwb25zZSA9IFBhcmFtZXRlcnM8SHR0cFByb3h5Wyd3ZWInXT5bMV07XG5cbmV4cG9ydCB0eXBlIEh0dHBQcm94eUV2ZW50UGFyYW1zID0ge1xuICBlcnJvcjogUGFyYW1ldGVyczxIdHRwUHJveHkuRXJyb3JDYWxsYmFjaz47XG4gIHN0YXJ0OiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5TdGFydENhbGxiYWNrPjtcbiAgcHJveHlSZXE6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVxQ2FsbGJhY2s+O1xuICBwcm94eVJlczogUGFyYW1ldGVyczxIdHRwUHJveHkuUHJveHlSZXNDYWxsYmFjaz47XG4gIHByb3h5UmVxV3M6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVxV3NDYWxsYmFjaz47XG4gIGVjb25ucmVzZXQ6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkVjb25ucmVzZXRDYWxsYmFjaz47XG4gIGVuZDogUGFyYW1ldGVyczxIdHRwUHJveHkuRW5kQ2FsbGJhY2s+O1xuICBvcGVuOiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5PcGVuQ2FsbGJhY2s+O1xuICBjbG9zZTogUGFyYW1ldGVyczxIdHRwUHJveHkuQ2xvc2VDYWxsYmFjaz47XG59O1xuXG5jb25zdCBFVkVOVFMgPSAnZXJyb3Isc3RhcnQscHJveHlSZXEscHJveHlSZXMsUHJveHlSZXFXcyxlY29ubnJlc2V0LGVuZCxvcGVuLGNsb3NlJy5zcGxpdCgnLCcpIGFzXG4gIEFycmF5PGtleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zPjtcblxuZXhwb3J0IHR5cGUgSHR0cFByb3h5RXZlbnRPYnMgPSB7XG4gIFtldnQgaW4ga2V5b2YgSHR0cFByb3h5RXZlbnRQYXJhbXNdOiByeC5PYnNlcnZhYmxlPHt0eXBlOiBldnQ7IHBheWxvYWQ6IEh0dHBQcm94eUV2ZW50UGFyYW1zW2V2dF19PlxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGh0dHBQcm94eU9ic2VydmFibGUocHJveHk6IEh0dHBQcm94eSk6IEh0dHBQcm94eUV2ZW50T2JzIHtcbiAgY29uc3Qgb2JzT2JqID0ge30gYXMgSHR0cFByb3h5RXZlbnRPYnM7XG4gIGNvbnN0IGNyZWF0ZWRTdWJqcyA9IHt9IGFzIHR5cGVvZiBvYnNPYmo7XG5cbiAgZm9yIChjb25zdCBldmVudCBvZiBFVkVOVFMpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JzT2JqLCBldmVudCwge1xuICAgICAgZ2V0KCkge1xuICAgICAgICBsZXQgb2IgPSBjcmVhdGVkU3VianNbZXZlbnRdO1xuICAgICAgICBpZiAob2IpIHtcbiAgICAgICAgICByZXR1cm4gb2I7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdWIgPSByeC5mcm9tRXZlbnRQYXR0ZXJuPEh0dHBQcm94eUV2ZW50UGFyYW1zW3R5cGVvZiBldmVudF0+KFxuICAgICAgICAgIGhhbmRsZXIgPT4gcHJveHkub24oZXZlbnQsIGhhbmRsZXIpLFxuICAgICAgICAgIGhhbmRsZXIgPT4gcHJveHkub2ZmKGV2ZW50LCBoYW5kbGVyKVxuICAgICAgICApLnBpcGUoXG4gICAgICAgICAgb3AubWFwKGFyZ3MgPT4gKHtcbiAgICAgICAgICAgIHR5cGU6IGV2ZW50LFxuICAgICAgICAgICAgcGF5bG9hZDogYXJnc1xuICAgICAgICAgIH0pKVxuICAgICAgICApO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICAgIGNyZWF0ZWRTdWJqc1tldmVudF0gPSBzdWIgYXMgYW55O1xuICAgICAgICByZXR1cm4gc3ViO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBvYnNPYmo7XG59XG5cbmNvbnN0IFJFRElSRUNUX1NUQVRVUyA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KFszMDEsIDMwMiwgMzA3LCAzMDhdLm1hcChjb2RlID0+IFtjb2RlLCBjb2RlXSkpO1xuLyoqXG4gKiBlLmcuXG5gYGBcbiAgcnguZGVmZXIoKCkgPT4ge1xuICAgIHByb3h5LndlYihyZXEsIHJlcywge3RpbWVvdXQ6IDEwMDAwfSk7XG4gICAgcmV0dXJuIG9ic2VydmVQcm94eVJlc3BvbnNlKHByb3h5JCwgcGF5bG9hZC5yZXMpO1xuICB9KVxuYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvYnNlcnZlUHJveHlSZXNwb25zZShodHRwUHJveHkkOiBIdHRwUHJveHlFdmVudE9icywgcmVzOiBSZXNwb25zZSxcbiAgc2tpcFJlZGlyZWN0UmVzID0gdHJ1ZSk6XG4gIEh0dHBQcm94eUV2ZW50T2JzWydwcm94eVJlcyddIHtcbiAgLy8gU2FtZSBhcyBcInJhY2VcIiB3aGljaCBpcyBkZXByZWNhdGVkIGluIFJ4SlMgN1xuICByZXR1cm4gcngubWVyZ2UoXG4gICAgaHR0cFByb3h5JC5wcm94eVJlcy5waXBlKFxuICAgICAgb3AuZmlsdGVyKGV2ZW50ID0+IGV2ZW50LnBheWxvYWRbMl0gPT09IHJlcyAmJlxuICAgICAgICAhKHNraXBSZWRpcmVjdFJlcyAmJiBSRURJUkVDVF9TVEFUVVMuaGFzKGV2ZW50LnBheWxvYWRbMF0uc3RhdHVzQ29kZSB8fCAyMDApKVxuICAgICAgKSxcbiAgICAgIG9wLnRha2UoMSlcbiAgICApLFxuICAgIHJ4Lm1lcmdlKGh0dHBQcm94eSQuZWNvbm5yZXNldCwgaHR0cFByb3h5JC5lcnJvcikucGlwZShcbiAgICAgIG9wLmZpbHRlcihldmVudCA9PiBldmVudC5wYXlsb2FkWzJdID09PSByZXMpLFxuICAgICAgb3AudGFrZSgxKSxcbiAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZDogW2Vycl19KSA9PiB7XG4gICAgICAgIHJldHVybiByeC50aHJvd0Vycm9yKGVycik7XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLnRha2UoMSlcbiAgKTtcbn1cbiJdfQ==