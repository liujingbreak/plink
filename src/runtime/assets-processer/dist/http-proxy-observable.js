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
        obsObj[event] = rx.fromEventPattern(handler => proxy.on(event, handler), handler => proxy.off(event, handler)).pipe(op.map(args => ({
            type: event,
            payload: args
        })));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1wcm94eS1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cC1wcm94eS1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBZ0JyQyxNQUFNLE1BQU0sR0FBRyxvRUFBb0UsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUMxRCxDQUFDO0FBTXBDLFNBQWdCLG1CQUFtQixDQUFDLEtBQWdCO0lBQ2xELE1BQU0sTUFBTSxHQUFHLEVBQXVCLENBQUM7SUFDdkMsTUFBTSxZQUFZLEdBQUcsRUFBbUIsQ0FBQztJQUV6QyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtRQUMxQixtRUFBbUU7UUFDbkUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FDakMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsRUFDbkMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FDckMsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDZCxJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFDLENBQ0csQ0FBQztRQUVULE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRTtZQUNuQyxHQUFHO2dCQUNELElBQUksRUFBRSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxFQUFFO29CQUNKLE9BQU8sRUFBRSxDQUFDO2dCQUNaLE1BQU0sR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFDdUMsQ0FBQztnQkFFbEUsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFHLElBQXdDLEVBQUUsRUFBRTtvQkFDOUQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7Z0JBQ3pDLENBQUMsQ0FBQztnQkFDRixLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDekIsbUVBQW1FO2dCQUNuRSxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLFlBQVksRUFBUyxDQUFDO2dCQUNoRCxPQUFPLEdBQUcsQ0FBQztZQUNiLENBQUM7U0FDRixDQUFDLENBQUM7S0FDSjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFuQ0Qsa0RBbUNDO0FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQWlCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHOzs7Ozs7OztHQVFHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsVUFBNkIsRUFBRSxHQUFhLEVBQy9FLGVBQWUsR0FBRyxJQUFJO0lBRXRCLCtDQUErQztJQUMvQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQ3RCLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7UUFDekMsQ0FBQyxDQUFDLGVBQWUsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQzlFLEVBQ0QsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxFQUNELEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUNwRCxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFDNUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ2xCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQ0gsQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNYLENBQUM7QUFDSixDQUFDO0FBckJELG9EQXFCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBIdHRwUHJveHkgZnJvbSAnaHR0cC1wcm94eSc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxudHlwZSBSZXNwb25zZSA9IFBhcmFtZXRlcnM8SHR0cFByb3h5Wyd3ZWInXT5bMV07XG5cbmV4cG9ydCB0eXBlIEh0dHBQcm94eUV2ZW50UGFyYW1zID0ge1xuICBlcnJvcjogUGFyYW1ldGVyczxIdHRwUHJveHkuRXJyb3JDYWxsYmFjaz47XG4gIHN0YXJ0OiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5TdGFydENhbGxiYWNrPjtcbiAgcHJveHlSZXE6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVxQ2FsbGJhY2s+O1xuICBwcm94eVJlczogUGFyYW1ldGVyczxIdHRwUHJveHkuUHJveHlSZXNDYWxsYmFjaz47XG4gIHByb3h5UmVxV3M6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVxV3NDYWxsYmFjaz47XG4gIGVjb25ucmVzZXQ6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkVjb25ucmVzZXRDYWxsYmFjaz47XG4gIGVuZDogUGFyYW1ldGVyczxIdHRwUHJveHkuRW5kQ2FsbGJhY2s+O1xuICBvcGVuOiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5PcGVuQ2FsbGJhY2s+O1xuICBjbG9zZTogUGFyYW1ldGVyczxIdHRwUHJveHkuQ2xvc2VDYWxsYmFjaz47XG59O1xuXG5jb25zdCBFVkVOVFMgPSAnZXJyb3Isc3RhcnQscHJveHlSZXEscHJveHlSZXMsUHJveHlSZXFXcyxlY29ubnJlc2V0LGVuZCxvcGVuLGNsb3NlJy5zcGxpdCgnLCcpIGFzXG4gIEFycmF5PGtleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zPjtcblxuZXhwb3J0IHR5cGUgSHR0cFByb3h5RXZlbnRPYnMgPSB7XG4gIFtldnQgaW4ga2V5b2YgSHR0cFByb3h5RXZlbnRQYXJhbXNdOiByeC5PYnNlcnZhYmxlPHt0eXBlOiBldnQ7IHBheWxvYWQ6IEh0dHBQcm94eUV2ZW50UGFyYW1zW2V2dF19PlxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGh0dHBQcm94eU9ic2VydmFibGUocHJveHk6IEh0dHBQcm94eSk6IEh0dHBQcm94eUV2ZW50T2JzIHtcbiAgY29uc3Qgb2JzT2JqID0ge30gYXMgSHR0cFByb3h5RXZlbnRPYnM7XG4gIGNvbnN0IGNyZWF0ZWRTdWJqcyA9IHt9IGFzIHR5cGVvZiBvYnNPYmo7XG5cbiAgZm9yIChjb25zdCBldmVudCBvZiBFVkVOVFMpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgb2JzT2JqW2V2ZW50XSA9IHJ4LmZyb21FdmVudFBhdHRlcm48SHR0cFByb3h5RXZlbnRQYXJhbXNbdHlwZW9mIGV2ZW50XT4oXG4gICAgICBoYW5kbGVyID0+IHByb3h5Lm9uKGV2ZW50LCBoYW5kbGVyKSxcbiAgICAgIGhhbmRsZXIgPT4gcHJveHkub2ZmKGV2ZW50LCBoYW5kbGVyKVxuICAgICkucGlwZShcbiAgICAgIG9wLm1hcChhcmdzID0+ICh7XG4gICAgICAgIHR5cGU6IGV2ZW50LFxuICAgICAgICBwYXlsb2FkOiBhcmdzXG4gICAgICB9KSlcbiAgICApIGFzIGFueTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYnNPYmosIGV2ZW50LCB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIGxldCBvYiA9IGNyZWF0ZWRTdWJqc1tldmVudF07XG4gICAgICAgIGlmIChvYilcbiAgICAgICAgICByZXR1cm4gb2I7XG4gICAgICAgIGNvbnN0IHN1YiA9IG5ldyByeC5TdWJqZWN0PHt0eXBlOiBrZXlvZiBIdHRwUHJveHlFdmVudFBhcmFtcztcbiAgICAgICAgICBwYXlsb2FkOiBIdHRwUHJveHlFdmVudFBhcmFtc1trZXlvZiBIdHRwUHJveHlFdmVudFBhcmFtc107IH0+KCk7XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9ICguLi5hcmdzOiBIdHRwUHJveHlFdmVudFBhcmFtc1t0eXBlb2YgZXZlbnRdKSA9PiB7XG4gICAgICAgICAgc3ViLm5leHQoe3R5cGU6IGV2ZW50LCBwYXlsb2FkOiBhcmdzfSk7XG4gICAgICAgIH07XG4gICAgICAgIHByb3h5Lm9uKGV2ZW50LCBoYW5kbGVyKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgICBjcmVhdGVkU3VianNbZXZlbnRdID0gc3ViLmFzT2JzZXJ2YWJsZSgpIGFzIGFueTtcbiAgICAgICAgcmV0dXJuIHN1YjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gb2JzT2JqO1xufVxuXG5jb25zdCBSRURJUkVDVF9TVEFUVVMgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPihbMzAxLCAzMDIsIDMwNywgMzA4XS5tYXAoY29kZSA9PiBbY29kZSwgY29kZV0pKTtcbi8qKlxuICogZS5nLlxuYGBgXG4gIHJ4LmRlZmVyKCgpID0+IHtcbiAgICBwcm94eS53ZWIocmVxLCByZXMsIHt0aW1lb3V0OiAxMDAwMH0pO1xuICAgIHJldHVybiBvYnNlcnZlUHJveHlSZXNwb25zZShwcm94eSQsIHBheWxvYWQucmVzKTtcbiAgfSlcbmBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gb2JzZXJ2ZVByb3h5UmVzcG9uc2UoaHR0cFByb3h5JDogSHR0cFByb3h5RXZlbnRPYnMsIHJlczogUmVzcG9uc2UsXG4gIHNraXBSZWRpcmVjdFJlcyA9IHRydWUpOlxuICBIdHRwUHJveHlFdmVudE9ic1sncHJveHlSZXMnXSB7XG4gIC8vIFNhbWUgYXMgXCJyYWNlXCIgd2hpY2ggaXMgZGVwcmVjYXRlZCBpbiBSeEpTIDdcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIGh0dHBQcm94eSQucHJveHlSZXMucGlwZShcbiAgICAgIG9wLmZpbHRlcihldmVudCA9PiBldmVudC5wYXlsb2FkWzJdID09PSByZXMgJiZcbiAgICAgICAgIShza2lwUmVkaXJlY3RSZXMgJiYgUkVESVJFQ1RfU1RBVFVTLmhhcyhldmVudC5wYXlsb2FkWzBdLnN0YXR1c0NvZGUgfHwgMjAwKSlcbiAgICAgICksXG4gICAgICBvcC50YWtlKDEpXG4gICAgKSxcbiAgICByeC5tZXJnZShodHRwUHJveHkkLmVjb25ucmVzZXQsIGh0dHBQcm94eSQuZXJyb3IpLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoZXZlbnQgPT4gZXZlbnQucGF5bG9hZFsyXSA9PT0gcmVzKSxcbiAgICAgIG9wLnRha2UoMSksXG4gICAgICBvcC5tZXJnZU1hcChldmVudCA9PiB7XG4gICAgICAgIHJldHVybiByeC50aHJvd0Vycm9yKGV2ZW50LnBheWxvYWRbMF0pO1xuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC50YWtlKDEpXG4gICk7XG59XG4iXX0=