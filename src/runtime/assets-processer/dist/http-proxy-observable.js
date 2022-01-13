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
exports.httpProxyObservable = void 0;
const rx = __importStar(require("rxjs"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1wcm94eS1vYnNlcnZhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cC1wcm94eS1vYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx5Q0FBMkI7QUFlM0IsTUFBTSxNQUFNLEdBQUcsb0VBQW9FLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FDMUQsQ0FBQztBQUVwQyxTQUFnQixtQkFBbUIsQ0FBQyxLQUFnQjtJQUNsRCxNQUFNLE1BQU0sR0FBRyxFQUEyRyxDQUFDO0lBQzNILE1BQU0sWUFBWSxHQUFHLEVBQW1CLENBQUM7SUFFekMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDMUIsbUVBQW1FO1FBQ25FLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQytCLEdBQUcsQ0FBQyxFQUFFO1lBQ3BFLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBRyxJQUF3QyxFQUFFLEVBQUU7Z0JBQzlELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1lBQ3pDLENBQUMsQ0FBQztZQUNGLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3pCLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBZ0MsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBUSxDQUFDO1FBQ1YsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO1lBQ25DLEdBQUc7Z0JBQ0QsSUFBSSxFQUFFLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM3QixJQUFJLEVBQUU7b0JBQ0osT0FBTyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUN1QyxDQUFDO2dCQUVsRSxNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsSUFBd0MsRUFBRSxFQUFFO29CQUM5RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDekMsQ0FBQyxDQUFDO2dCQUNGLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN6QixtRUFBbUU7Z0JBQ25FLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFTLENBQUM7Z0JBQ2hELE9BQU8sR0FBRyxDQUFDO1lBQ2IsQ0FBQztTQUNGLENBQUMsQ0FBQztLQUNKO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQWpDRCxrREFpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgSHR0cFByb3h5IGZyb20gJ2h0dHAtcHJveHknO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCB0eXBlIEh0dHBQcm94eUV2ZW50UGFyYW1zID0ge1xuICBlcnJvcjogUGFyYW1ldGVyczxIdHRwUHJveHkuRXJyb3JDYWxsYmFjaz47XG4gIHN0YXJ0OiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5TdGFydENhbGxiYWNrPjtcbiAgcHJveHlSZXE6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVxQ2FsbGJhY2s+O1xuICBwcm94eVJlczogUGFyYW1ldGVyczxIdHRwUHJveHkuUHJveHlSZXNDYWxsYmFjaz47XG4gIHByb3h5UmVxV3M6IFBhcmFtZXRlcnM8SHR0cFByb3h5LlByb3h5UmVxV3NDYWxsYmFjaz47XG4gIGVjb25ucmVzZXQ6IFBhcmFtZXRlcnM8SHR0cFByb3h5LkVjb25ucmVzZXRDYWxsYmFjaz47XG4gIGVuZDogUGFyYW1ldGVyczxIdHRwUHJveHkuRW5kQ2FsbGJhY2s+O1xuICBvcGVuOiBQYXJhbWV0ZXJzPEh0dHBQcm94eS5PcGVuQ2FsbGJhY2s+O1xuICBjbG9zZTogUGFyYW1ldGVyczxIdHRwUHJveHkuQ2xvc2VDYWxsYmFjaz47XG59O1xuXG5jb25zdCBFVkVOVFMgPSAnZXJyb3Isc3RhcnQscHJveHlSZXEscHJveHlSZXMsUHJveHlSZXFXcyxlY29ubnJlc2V0LGVuZCxvcGVuLGNsb3NlJy5zcGxpdCgnLCcpIGFzXG4gIEFycmF5PGtleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zPjtcblxuZXhwb3J0IGZ1bmN0aW9uIGh0dHBQcm94eU9ic2VydmFibGUocHJveHk6IEh0dHBQcm94eSkge1xuICBjb25zdCBvYnNPYmogPSB7fSBhcyB7W2V2dCBpbiBrZXlvZiBIdHRwUHJveHlFdmVudFBhcmFtc106IHJ4Lk9ic2VydmFibGU8e3R5cGU6IGV2dDsgcGF5bG9hZDogSHR0cFByb3h5RXZlbnRQYXJhbXNbZXZ0XX0+fTtcbiAgY29uc3QgY3JlYXRlZFN1YmpzID0ge30gYXMgdHlwZW9mIG9ic09iajtcblxuICBmb3IgKGNvbnN0IGV2ZW50IG9mIEVWRU5UUykge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBvYnNPYmpbZXZlbnRdID0gbmV3IHJ4Lk9ic2VydmFibGU8e3R5cGU6IGtleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zO1xuICAgICAgcGF5bG9hZDogSHR0cFByb3h5RXZlbnRQYXJhbXNba2V5b2YgSHR0cFByb3h5RXZlbnRQYXJhbXNdOyB9PihzdWIgPT4ge1xuICAgICAgY29uc3QgaGFuZGxlciA9ICguLi5hcmdzOiBIdHRwUHJveHlFdmVudFBhcmFtc1t0eXBlb2YgZXZlbnRdKSA9PiB7XG4gICAgICAgIHN1Yi5uZXh0KHt0eXBlOiBldmVudCwgcGF5bG9hZDogYXJnc30pO1xuICAgICAgfTtcbiAgICAgIHByb3h5Lm9uKGV2ZW50LCBoYW5kbGVyKTtcbiAgICAgIHJldHVybiAoKSA9PiBwcm94eS5vZmYoZXZlbnQsIGhhbmRsZXIgYXMgKC4uLmE6IGFueVtdKSA9PiB2b2lkKTtcbiAgICB9KSBhcyBhbnk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9ic09iaiwgZXZlbnQsIHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgbGV0IG9iID0gY3JlYXRlZFN1YmpzW2V2ZW50XTtcbiAgICAgICAgaWYgKG9iKVxuICAgICAgICAgIHJldHVybiBvYjtcbiAgICAgICAgY29uc3Qgc3ViID0gbmV3IHJ4LlN1YmplY3Q8e3R5cGU6IGtleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zO1xuICAgICAgICAgIHBheWxvYWQ6IEh0dHBQcm94eUV2ZW50UGFyYW1zW2tleW9mIEh0dHBQcm94eUV2ZW50UGFyYW1zXTsgfT4oKTtcblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gKC4uLmFyZ3M6IEh0dHBQcm94eUV2ZW50UGFyYW1zW3R5cGVvZiBldmVudF0pID0+IHtcbiAgICAgICAgICBzdWIubmV4dCh7dHlwZTogZXZlbnQsIHBheWxvYWQ6IGFyZ3N9KTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJveHkub24oZXZlbnQsIGhhbmRsZXIpO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICAgIGNyZWF0ZWRTdWJqc1tldmVudF0gPSBzdWIuYXNPYnNlcnZhYmxlKCkgYXMgYW55O1xuICAgICAgICByZXR1cm4gc3ViO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBvYnNPYmo7XG59XG5cbiJdfQ==