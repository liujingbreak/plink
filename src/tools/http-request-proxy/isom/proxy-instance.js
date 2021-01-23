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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyInstanceForBrowser = exports.intercept = void 0;
const assign_1 = __importDefault(require("lodash/assign"));
const pm = __importStar(require("./path-matcher"));
function intercept(req, headers, body, resHandlers, name) {
    // console.log(resHandlers.toString());
    var bodyHandlerProm;
    var handlers = pm.matchedHandlers(resHandlers, req.url);
    if (handlers.length > 0) {
        bodyHandlerProm = Promise.resolve({ req, headers, body });
        const func = handlers[handlers.length - 1];
        bodyHandlerProm = bodyHandlerProm.then(data => {
            const resolvedRes = func(data.req, data.headers, data.body, data.result, {});
            if (resolvedRes != null) {
                return Promise.resolve(resolvedRes)
                    .then(result => {
                    return Object.assign(data, { result });
                });
            }
            return Promise.resolve(data);
        });
        bodyHandlerProm = bodyHandlerProm.then(data => data.result);
    }
    else {
        return Promise.resolve(null);
    }
    return bodyHandlerProm;
}
exports.intercept = intercept;
// function _filterHandlers(req: express.Request, resHandlers: {[path: string]: Set<BodyHandler|HeaderHandler>}) {
// 	var handlers: Array<BodyHandler|HeaderHandler> = [];
// 	const parsedUrl = Url.parse(req.url);
// 	if (parsedUrl.pathname == null)
// 		return [];
// 	var handlerSet = get(resHandlers, parsedUrl.pathname);
// 	if (handlerSet)
// 		handlers.push(...handlerSet.values());
// 	var defaultHandlerSet = resHandlers['*'];
// 	if (defaultHandlerSet)
// 		handlers.push(...defaultHandlerSet.values());
// 	return handlers;
// }
class ProxyInstanceForBrowser {
    constructor(name, options = {}) {
        this.options = options;
        this.resHandlers = new pm.DirTree();
        this.reqHandlers = new pm.DirTree();
        this.mockHandlers = new pm.DirTree();
        this.resHeaderHandlers = new pm.DirTree();
        this.name = name;
    }
    get isRemoveCookieDomain() {
        return !!this.options.removeCookieDomain;
    }
    addOptions(opt) {
        assign_1.default(this.options, opt);
        return this;
    }
    /**
       * @deprecated
       * @param {*} path sub path after '/http-request-proxy'
       * @param {*} handler (url: string, method:string,
       * 	responseHeaders: {[name: string]:string}, responseBody: string | Buffer) => null | Promise<string>
       */
    interceptResponse(path, handler) {
        pm.addToHandlerTree(path, handler, this.resHandlers);
    }
    /** @deprecated */
    interceptRequest(path, handler) {
        pm.addToHandlerTree(path, handler, this.reqHandlers);
    }
    /**
       *
       * @param path {string} a URI string in format of Url's pathname, support path parameterized path name
       *  begin with ":" or wildcard "*", e.g.
       *   "/foo/bar/:id/resting-path", "/foo/bar/*" and "*"
       * @param handler
       */
    mockResponse(path, handler) {
        pm.addToHandlerTree(path, handler, this.mockHandlers);
    }
    /**@deprecated */
    interceptResHeader(path, handler) {
        pm.addToHandlerTree(path, handler, this.resHeaderHandlers);
    }
}
exports.ProxyInstanceForBrowser = ProxyInstanceForBrowser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHktaW5zdGFuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm94eS1pbnN0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkRBQW1DO0FBR25DLG1EQUFxQztBQWtCckMsU0FBZ0IsU0FBUyxDQUFDLEdBQW9CLEVBQUUsT0FBMkIsRUFBRSxJQUFTLEVBQ3BGLFdBQXdELEVBQUUsSUFBWTtJQUN0RSx1Q0FBdUM7SUFDdkMsSUFBSSxlQUF1QyxDQUFDO0lBQzVDLElBQUksUUFBUSxHQUFrQixFQUFFLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkUsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN2QixlQUFlLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzQyxlQUFlLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RSxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7Z0JBQ3ZCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7cUJBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDYixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztnQkFDdkMsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztRQUNILGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzdEO1NBQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDOUI7SUFDRCxPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDO0FBdkJELDhCQXVCQztBQUNELGtIQUFrSDtBQUNsSCx3REFBd0Q7QUFDeEQseUNBQXlDO0FBQ3pDLG1DQUFtQztBQUNuQyxlQUFlO0FBQ2YsMERBQTBEO0FBQzFELG1CQUFtQjtBQUNuQiwyQ0FBMkM7QUFDM0MsNkNBQTZDO0FBQzdDLDBCQUEwQjtBQUMxQixrREFBa0Q7QUFDbEQsb0JBQW9CO0FBQ3BCLElBQUk7QUFDSixNQUFhLHVCQUF1QjtJQU1sQyxZQUFZLElBQVksRUFBWSxVQUE4QixFQUFFO1FBQWhDLFlBQU8sR0FBUCxPQUFPLENBQXlCO1FBSnBFLGdCQUFXLEdBQWdELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVFLGdCQUFXLEdBQWdELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVFLGlCQUFZLEdBQWdELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdFLHNCQUFpQixHQUFrRCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVsRixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsSUFBSSxvQkFBb0I7UUFDdEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUMzQyxDQUFDO0lBRUQsVUFBVSxDQUFDLEdBQXVCO1FBQ2hDLGdCQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRDs7Ozs7U0FLRTtJQUNGLGlCQUFpQixDQUFDLElBQVksRUFBRSxPQUFvQjtRQUNsRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNELGtCQUFrQjtJQUNsQixnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsT0FBb0I7UUFDakQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFDRDs7Ozs7O1NBTUU7SUFDRixZQUFZLENBQUMsSUFBWSxFQUFFLE9BQW9CO1FBQzdDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsaUJBQWlCO0lBQ2pCLGtCQUFrQixDQUFDLElBQVksRUFBRSxPQUFzQjtRQUNyRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQ0Y7QUE3Q0QsMERBNkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFzc2lnbiBmcm9tICdsb2Rhc2gvYXNzaWduJztcbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge0JvZHlIYW5kbGVyLCBIZWFkZXJIYW5kbGVyfSBmcm9tICcuL3BhdGgtbWF0Y2hlcic7XG5pbXBvcnQgKiBhcyBwbSBmcm9tICcuL3BhdGgtbWF0Y2hlcic7XG4vLyBpbXBvcnQge0luY29taW5nSHR0cEhlYWRlcnN9IGZyb20gJ2h0dHAnO1xuXG4vLyBleHBvcnQgaW50ZXJmYWNlIElzb21SZXF1ZXN0IHtcbi8vIFx0bWV0aG9kOiBzdHJpbmc7XG4vLyBcdHVybDogc3RyaW5nO1xuLy8gXHRoZWFkZXJzOiBJbmNvbWluZ0h0dHBIZWFkZXJzO1xuLy8gXHRib2R5OiBhbnk7XG4vLyBcdHF1ZXJ5OiBhbnk7XG4vLyBcdHJlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJyB8ICdibG9iJyB8ICdqc29uJyB8ICd0ZXh0Jztcbi8vIH1cblxuaW50ZXJmYWNlIEhhbmRsZXJQYXJhbXMge1xuICByZXE6IGV4cHJlc3MuUmVxdWVzdDtcbiAgaGVhZGVyczoge1trOiBzdHJpbmddOiBhbnl9O1xuICBib2R5OiBhbnk7XG4gIHJlc3VsdD86IGFueTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcmNlcHQocmVxOiBleHByZXNzLlJlcXVlc3QsIGhlYWRlcnM6IHtbazogc3RyaW5nXTogYW55fSwgYm9keTogYW55LFxuICByZXNIYW5kbGVyczogcG0uRGlyVHJlZTxwbS5TdG9yZWRIYW5kbGVyPEJvZHlIYW5kbGVyPltdPiwgbmFtZTogc3RyaW5nKTogUHJvbWlzZTxIYW5kbGVyUGFyYW1zfG51bGw+IHtcbiAgLy8gY29uc29sZS5sb2cocmVzSGFuZGxlcnMudG9TdHJpbmcoKSk7XG4gIHZhciBib2R5SGFuZGxlclByb206IFByb21pc2U8SGFuZGxlclBhcmFtcz47XG4gIHZhciBoYW5kbGVyczogQm9keUhhbmRsZXJbXSA9IHBtLm1hdGNoZWRIYW5kbGVycyhyZXNIYW5kbGVycywgcmVxLnVybCk7XG4gIGlmIChoYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgYm9keUhhbmRsZXJQcm9tID0gUHJvbWlzZS5yZXNvbHZlKHtyZXEsIGhlYWRlcnMsIGJvZHl9KTtcbiAgICBjb25zdCBmdW5jID0gaGFuZGxlcnNbaGFuZGxlcnMubGVuZ3RoIC0gMV07XG4gICAgYm9keUhhbmRsZXJQcm9tID0gYm9keUhhbmRsZXJQcm9tLnRoZW4oZGF0YSA9PiB7XG4gICAgICBjb25zdCByZXNvbHZlZFJlcyA9IGZ1bmMoZGF0YS5yZXEsIGRhdGEuaGVhZGVycywgZGF0YS5ib2R5LCBkYXRhLnJlc3VsdCwge30pO1xuICAgICAgaWYgKHJlc29sdmVkUmVzICE9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXNvbHZlZFJlcylcbiAgICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihkYXRhLCB7cmVzdWx0fSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShkYXRhKTtcbiAgICB9KTtcbiAgICBib2R5SGFuZGxlclByb20gPSBib2R5SGFuZGxlclByb20udGhlbihkYXRhID0+IGRhdGEucmVzdWx0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICB9XG4gIHJldHVybiBib2R5SGFuZGxlclByb207XG59XG4vLyBmdW5jdGlvbiBfZmlsdGVySGFuZGxlcnMocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlc0hhbmRsZXJzOiB7W3BhdGg6IHN0cmluZ106IFNldDxCb2R5SGFuZGxlcnxIZWFkZXJIYW5kbGVyPn0pIHtcbi8vIFx0dmFyIGhhbmRsZXJzOiBBcnJheTxCb2R5SGFuZGxlcnxIZWFkZXJIYW5kbGVyPiA9IFtdO1xuLy8gXHRjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UocmVxLnVybCk7XG4vLyBcdGlmIChwYXJzZWRVcmwucGF0aG5hbWUgPT0gbnVsbClcbi8vIFx0XHRyZXR1cm4gW107XG4vLyBcdHZhciBoYW5kbGVyU2V0ID0gZ2V0KHJlc0hhbmRsZXJzLCBwYXJzZWRVcmwucGF0aG5hbWUpO1xuLy8gXHRpZiAoaGFuZGxlclNldClcbi8vIFx0XHRoYW5kbGVycy5wdXNoKC4uLmhhbmRsZXJTZXQudmFsdWVzKCkpO1xuLy8gXHR2YXIgZGVmYXVsdEhhbmRsZXJTZXQgPSByZXNIYW5kbGVyc1snKiddO1xuLy8gXHRpZiAoZGVmYXVsdEhhbmRsZXJTZXQpXG4vLyBcdFx0aGFuZGxlcnMucHVzaCguLi5kZWZhdWx0SGFuZGxlclNldC52YWx1ZXMoKSk7XG4vLyBcdHJldHVybiBoYW5kbGVycztcbi8vIH1cbmV4cG9ydCBjbGFzcyBQcm94eUluc3RhbmNlRm9yQnJvd3NlciB7XG4gIG5hbWU6IHN0cmluZztcbiAgcmVzSGFuZGxlcnM6IHBtLkRpclRyZWU8cG0uU3RvcmVkSGFuZGxlcjxCb2R5SGFuZGxlcj5bXT4gPSBuZXcgcG0uRGlyVHJlZSgpO1xuICByZXFIYW5kbGVyczogcG0uRGlyVHJlZTxwbS5TdG9yZWRIYW5kbGVyPEJvZHlIYW5kbGVyPltdPiA9IG5ldyBwbS5EaXJUcmVlKCk7XG4gIG1vY2tIYW5kbGVyczogcG0uRGlyVHJlZTxwbS5TdG9yZWRIYW5kbGVyPEJvZHlIYW5kbGVyPltdPiA9IG5ldyBwbS5EaXJUcmVlKCk7XG4gIHJlc0hlYWRlckhhbmRsZXJzOiBwbS5EaXJUcmVlPHBtLlN0b3JlZEhhbmRsZXI8SGVhZGVySGFuZGxlcj5bXT4gPSBuZXcgcG0uRGlyVHJlZSgpO1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHByb3RlY3RlZCBvcHRpb25zOiB7W2s6IHN0cmluZ106IGFueX0gPSB7fSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gIH1cblxuICBnZXQgaXNSZW1vdmVDb29raWVEb21haW4oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5vcHRpb25zLnJlbW92ZUNvb2tpZURvbWFpbjtcbiAgfVxuXG4gIGFkZE9wdGlvbnMob3B0OiB7W2s6IHN0cmluZ106IGFueX0pOiBQcm94eUluc3RhbmNlRm9yQnJvd3NlciB7XG4gICAgYXNzaWduKHRoaXMub3B0aW9ucywgb3B0KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICAvKipcblx0ICogQGRlcHJlY2F0ZWRcblx0ICogQHBhcmFtIHsqfSBwYXRoIHN1YiBwYXRoIGFmdGVyICcvaHR0cC1yZXF1ZXN0LXByb3h5J1xuXHQgKiBAcGFyYW0geyp9IGhhbmRsZXIgKHVybDogc3RyaW5nLCBtZXRob2Q6c3RyaW5nLFxuXHQgKiBcdHJlc3BvbnNlSGVhZGVyczoge1tuYW1lOiBzdHJpbmddOnN0cmluZ30sIHJlc3BvbnNlQm9keTogc3RyaW5nIHwgQnVmZmVyKSA9PiBudWxsIHwgUHJvbWlzZTxzdHJpbmc+XG5cdCAqL1xuICBpbnRlcmNlcHRSZXNwb25zZShwYXRoOiBzdHJpbmcsIGhhbmRsZXI6IEJvZHlIYW5kbGVyKSB7XG4gICAgcG0uYWRkVG9IYW5kbGVyVHJlZShwYXRoLCBoYW5kbGVyLCB0aGlzLnJlc0hhbmRsZXJzKTtcbiAgfVxuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgaW50ZXJjZXB0UmVxdWVzdChwYXRoOiBzdHJpbmcsIGhhbmRsZXI6IEJvZHlIYW5kbGVyKSB7XG4gICAgcG0uYWRkVG9IYW5kbGVyVHJlZShwYXRoLCBoYW5kbGVyLCB0aGlzLnJlcUhhbmRsZXJzKTtcbiAgfVxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBwYXRoIHtzdHJpbmd9IGEgVVJJIHN0cmluZyBpbiBmb3JtYXQgb2YgVXJsJ3MgcGF0aG5hbWUsIHN1cHBvcnQgcGF0aCBwYXJhbWV0ZXJpemVkIHBhdGggbmFtZVxuXHQgKiAgYmVnaW4gd2l0aCBcIjpcIiBvciB3aWxkY2FyZCBcIipcIiwgZS5nLlxuXHQgKiAgIFwiL2Zvby9iYXIvOmlkL3Jlc3RpbmctcGF0aFwiLCBcIi9mb28vYmFyLypcIiBhbmQgXCIqXCJcblx0ICogQHBhcmFtIGhhbmRsZXIgXG5cdCAqL1xuICBtb2NrUmVzcG9uc2UocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBCb2R5SGFuZGxlcikge1xuICAgIHBtLmFkZFRvSGFuZGxlclRyZWUocGF0aCwgaGFuZGxlciwgdGhpcy5tb2NrSGFuZGxlcnMpO1xuICB9XG4gIC8qKkBkZXByZWNhdGVkICovXG4gIGludGVyY2VwdFJlc0hlYWRlcihwYXRoOiBzdHJpbmcsIGhhbmRsZXI6IEhlYWRlckhhbmRsZXIpIHtcbiAgICBwbS5hZGRUb0hhbmRsZXJUcmVlKHBhdGgsIGhhbmRsZXIsIHRoaXMucmVzSGVhZGVySGFuZGxlcnMpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIE1vY2tTZXR1cEZ1bmMgPSAocHJveHk6IFByb3h5SW5zdGFuY2VGb3JCcm93c2VyLCBmb3JOYW1lPzogKG5hbWU6IHN0cmluZykgPT5cbiAgUHJveHlJbnN0YW5jZUZvckJyb3dzZXIpID0+IHZvaWQ7XG4iXX0=