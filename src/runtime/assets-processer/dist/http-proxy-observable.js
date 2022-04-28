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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1wcm94eS1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cC1wcm94eS1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EseUNBQTJCO0FBQzNCLG1EQUFxQztBQWdCckMsTUFBTSxNQUFNLEdBQUcsb0VBQW9FLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FDMUQsQ0FBQztBQU1wQyxTQUFnQixtQkFBbUIsQ0FBQyxLQUFnQjtJQUNsRCxNQUFNLE1BQU0sR0FBRyxFQUF1QixDQUFDO0lBQ3ZDLE1BQU0sWUFBWSxHQUFHLEVBQW1CLENBQUM7SUFFekMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDMUIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO1lBQ25DLEdBQUc7Z0JBQ0QsSUFBSSxFQUFFLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM3QixJQUFJLEVBQUUsRUFBRTtvQkFDTixPQUFPLEVBQUUsQ0FBQztpQkFDWDtnQkFFRCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQzdCLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQ25DLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQ3JDLENBQUMsSUFBSSxDQUNKLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNkLElBQUksRUFBRSxLQUFLO29CQUNYLE9BQU8sRUFBRSxJQUFJO2lCQUNkLENBQUMsQ0FBQyxDQUNKLENBQUM7Z0JBQ0YsbUVBQW1FO2dCQUNuRSxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBVSxDQUFDO2dCQUNqQyxPQUFPLEdBQUcsQ0FBQztZQUNiLENBQUM7U0FDRixDQUFDLENBQUM7S0FDSjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUE1QkQsa0RBNEJDO0FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQWlCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHOzs7Ozs7OztHQVFHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsVUFBNkIsRUFBRSxHQUFhLEVBQy9FLGVBQWUsR0FBRyxJQUFJO0lBRXRCLCtDQUErQztJQUMvQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQ3RCLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7UUFDekMsQ0FBQyxDQUFDLGVBQWUsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQzlFLEVBQ0QsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxFQUNELEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUNwRCxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFDNUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBQyxFQUFFLEVBQUU7UUFDL0IsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLENBQUMsQ0FBQyxDQUNILENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxDQUFDO0FBQ0osQ0FBQztBQXJCRCxvREFxQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgSHR0cFByb3h5IGZyb20gJ2h0dHAtcHJveHknO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbnR5cGUgUmVzcG9uc2UgPSBQYXJhbWV0ZXJzPEh0dHBQcm94eVsnd2ViJ10+WzFdO1xuXG5leHBvcnQgdHlwZSBIdHRwUHJveHlFdmVudFBhcmFtcyA9IHtcbiAgZXJyb3I6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkVycm9yQ2FsbGJhY2s+O1xuICBzdGFydDogUGFyYW1ldGVyczxIdHRwUHJveHkuU3RhcnRDYWxsYmFjaz47XG4gIHByb3h5UmVxOiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5Qcm94eVJlcUNhbGxiYWNrPjtcbiAgcHJveHlSZXM6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVzQ2FsbGJhY2s+O1xuICBwcm94eVJlcVdzOiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5Qcm94eVJlcVdzQ2FsbGJhY2s+O1xuICBlY29ubnJlc2V0OiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5FY29ubnJlc2V0Q2FsbGJhY2s+O1xuICBlbmQ6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkVuZENhbGxiYWNrPjtcbiAgb3BlbjogUGFyYW1ldGVyczxIdHRwUHJveHkuT3BlbkNhbGxiYWNrPjtcbiAgY2xvc2U6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkNsb3NlQ2FsbGJhY2s+O1xufTtcblxuY29uc3QgRVZFTlRTID0gJ2Vycm9yLHN0YXJ0LHByb3h5UmVxLHByb3h5UmVzLFByb3h5UmVxV3MsZWNvbm5yZXNldCxlbmQsb3BlbixjbG9zZScuc3BsaXQoJywnKSBhc1xuICBBcnJheTxrZXlvZiBIdHRwUHJveHlFdmVudFBhcmFtcz47XG5cbmV4cG9ydCB0eXBlIEh0dHBQcm94eUV2ZW50T2JzID0ge1xuICBbZXZ0IGluIGtleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zXTogcnguT2JzZXJ2YWJsZTx7dHlwZTogZXZ0OyBwYXlsb2FkOiBIdHRwUHJveHlFdmVudFBhcmFtc1tldnRdfT5cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBodHRwUHJveHlPYnNlcnZhYmxlKHByb3h5OiBIdHRwUHJveHkpOiBIdHRwUHJveHlFdmVudE9icyB7XG4gIGNvbnN0IG9ic09iaiA9IHt9IGFzIEh0dHBQcm94eUV2ZW50T2JzO1xuICBjb25zdCBjcmVhdGVkU3VianMgPSB7fSBhcyB0eXBlb2Ygb2JzT2JqO1xuXG4gIGZvciAoY29uc3QgZXZlbnQgb2YgRVZFTlRTKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9ic09iaiwgZXZlbnQsIHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgbGV0IG9iID0gY3JlYXRlZFN1YmpzW2V2ZW50XTtcbiAgICAgICAgaWYgKG9iKSB7XG4gICAgICAgICAgcmV0dXJuIG9iO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3ViID0gcnguZnJvbUV2ZW50UGF0dGVybjxIdHRwUHJveHlFdmVudFBhcmFtc1t0eXBlb2YgZXZlbnRdPihcbiAgICAgICAgICBoYW5kbGVyID0+IHByb3h5Lm9uKGV2ZW50LCBoYW5kbGVyKSxcbiAgICAgICAgICBoYW5kbGVyID0+IHByb3h5Lm9mZihldmVudCwgaGFuZGxlcilcbiAgICAgICAgKS5waXBlKFxuICAgICAgICAgIG9wLm1hcChhcmdzID0+ICh7XG4gICAgICAgICAgICB0eXBlOiBldmVudCxcbiAgICAgICAgICAgIHBheWxvYWQ6IGFyZ3NcbiAgICAgICAgICB9KSlcbiAgICAgICAgKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgICBjcmVhdGVkU3VianNbZXZlbnRdID0gc3ViIGFzIGFueTtcbiAgICAgICAgcmV0dXJuIHN1YjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gb2JzT2JqO1xufVxuXG5jb25zdCBSRURJUkVDVF9TVEFUVVMgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPihbMzAxLCAzMDIsIDMwNywgMzA4XS5tYXAoY29kZSA9PiBbY29kZSwgY29kZV0pKTtcbi8qKlxuICogZS5nLlxuYGBgXG4gIHJ4LmRlZmVyKCgpID0+IHtcbiAgICBwcm94eS53ZWIocmVxLCByZXMsIHt0aW1lb3V0OiAxMDAwMH0pO1xuICAgIHJldHVybiBvYnNlcnZlUHJveHlSZXNwb25zZShwcm94eSQsIHBheWxvYWQucmVzKTtcbiAgfSlcbmBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gb2JzZXJ2ZVByb3h5UmVzcG9uc2UoaHR0cFByb3h5JDogSHR0cFByb3h5RXZlbnRPYnMsIHJlczogUmVzcG9uc2UsXG4gIHNraXBSZWRpcmVjdFJlcyA9IHRydWUpOlxuICBIdHRwUHJveHlFdmVudE9ic1sncHJveHlSZXMnXSB7XG4gIC8vIFNhbWUgYXMgXCJyYWNlXCIgd2hpY2ggaXMgZGVwcmVjYXRlZCBpbiBSeEpTIDdcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIGh0dHBQcm94eSQucHJveHlSZXMucGlwZShcbiAgICAgIG9wLmZpbHRlcihldmVudCA9PiBldmVudC5wYXlsb2FkWzJdID09PSByZXMgJiZcbiAgICAgICAgIShza2lwUmVkaXJlY3RSZXMgJiYgUkVESVJFQ1RfU1RBVFVTLmhhcyhldmVudC5wYXlsb2FkWzBdLnN0YXR1c0NvZGUgfHwgMjAwKSlcbiAgICAgICksXG4gICAgICBvcC50YWtlKDEpXG4gICAgKSxcbiAgICByeC5tZXJnZShodHRwUHJveHkkLmVjb25ucmVzZXQsIGh0dHBQcm94eSQuZXJyb3IpLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoZXZlbnQgPT4gZXZlbnQucGF5bG9hZFsyXSA9PT0gcmVzKSxcbiAgICAgIG9wLnRha2UoMSksXG4gICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWQ6IFtlcnJdfSkgPT4ge1xuICAgICAgICByZXR1cm4gcngudGhyb3dFcnJvcihlcnIpO1xuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC50YWtlKDEpXG4gICk7XG59XG4iXX0=