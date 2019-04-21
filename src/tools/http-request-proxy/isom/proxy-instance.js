"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const assign_1 = tslib_1.__importDefault(require("lodash/assign"));
const pm = tslib_1.__importStar(require("./path-matcher"));
function intercept(req, headers, body, resHandlers, name) {
    var bodyHandlerProm;
    var handlers = pm.matchedHandlers(resHandlers, req.url);
    if (handlers.length > 0) {
        bodyHandlerProm = Promise.resolve({ req, headers, body });
        handlers.forEach(func => {
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
    mockResponse(path, handler) {
        pm.addToHandlerTree(path, handler, this.mockHandlers);
    }
    /**@deprecated */
    interceptResHeader(path, handler) {
        pm.addToHandlerTree(path, handler, this.resHeaderHandlers);
    }
}
exports.ProxyInstanceForBrowser = ProxyInstanceForBrowser;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvaHR0cC1yZXF1ZXN0LXByb3h5L2lzb20vcHJveHktaW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUVBQW1DO0FBR25DLDJEQUFxQztBQWtCckMsU0FBZ0IsU0FBUyxDQUFDLEdBQW9CLEVBQUUsT0FBMkIsRUFBRSxJQUFTLEVBQ3JGLFdBQXNELEVBQUUsSUFBWTtJQUNwRSxJQUFJLGVBQXVDLENBQUM7SUFDNUMsSUFBSSxRQUFRLEdBQWtCLEVBQUUsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2RSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3hCLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3hELFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkIsZUFBZSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzdDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RSxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7b0JBQ3hCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7eUJBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDZCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztvQkFDdEMsQ0FBQyxDQUFDLENBQUM7aUJBQ0g7Z0JBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxlQUFlLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUM1RDtTQUFNO1FBQ04sT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQzdCO0lBQ0QsT0FBTyxlQUFlLENBQUM7QUFDeEIsQ0FBQztBQXZCRCw4QkF1QkM7QUFDRCxrSEFBa0g7QUFDbEgsd0RBQXdEO0FBQ3hELHlDQUF5QztBQUN6QyxtQ0FBbUM7QUFDbkMsZUFBZTtBQUNmLDBEQUEwRDtBQUMxRCxtQkFBbUI7QUFDbkIsMkNBQTJDO0FBQzNDLDZDQUE2QztBQUM3QywwQkFBMEI7QUFDMUIsa0RBQWtEO0FBQ2xELG9CQUFvQjtBQUNwQixJQUFJO0FBQ0osTUFBYSx1QkFBdUI7SUFNbkMsWUFBWSxJQUFZLEVBQVksVUFBOEIsRUFBRTtRQUFoQyxZQUFPLEdBQVAsT0FBTyxDQUF5QjtRQUpwRSxnQkFBVyxHQUE4QyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxRSxnQkFBVyxHQUE4QyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxRSxpQkFBWSxHQUE4QyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzRSxzQkFBaUIsR0FBZ0QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFakYsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7SUFDMUMsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUF1QjtRQUNqQyxnQkFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0Q7Ozs7O09BS0c7SUFDSCxpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsT0FBb0I7UUFDbkQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFDRCxrQkFBa0I7SUFDbEIsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLE9BQW9CO1FBQ2xELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBQ0QsWUFBWSxDQUFDLElBQVksRUFBRSxPQUFvQjtRQUM5QyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNELGlCQUFpQjtJQUNqQixrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsT0FBc0I7UUFDdEQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDNUQsQ0FBQztDQUNEO0FBdENELDBEQXNDQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyL2h0dHAtcmVxdWVzdC1wcm94eS9pc29tL3Byb3h5LWluc3RhbmNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFzc2lnbiBmcm9tICdsb2Rhc2gvYXNzaWduJztcbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge0JvZHlIYW5kbGVyLCBIZWFkZXJIYW5kbGVyfSBmcm9tICcuL3BhdGgtbWF0Y2hlcic7XG5pbXBvcnQgKiBhcyBwbSBmcm9tICcuL3BhdGgtbWF0Y2hlcic7XG4vLyBpbXBvcnQge0luY29taW5nSHR0cEhlYWRlcnN9IGZyb20gJ2h0dHAnO1xuXG4vLyBleHBvcnQgaW50ZXJmYWNlIElzb21SZXF1ZXN0IHtcbi8vIFx0bWV0aG9kOiBzdHJpbmc7XG4vLyBcdHVybDogc3RyaW5nO1xuLy8gXHRoZWFkZXJzOiBJbmNvbWluZ0h0dHBIZWFkZXJzO1xuLy8gXHRib2R5OiBhbnk7XG4vLyBcdHF1ZXJ5OiBhbnk7XG4vLyBcdHJlc3BvbnNlVHlwZTogJ2FycmF5YnVmZmVyJyB8ICdibG9iJyB8ICdqc29uJyB8ICd0ZXh0Jztcbi8vIH1cblxuaW50ZXJmYWNlIEhhbmRsZXJQYXJhbXMge1xuXHRyZXE6IGV4cHJlc3MuUmVxdWVzdDtcblx0aGVhZGVyczoge1trOiBzdHJpbmddOiBhbnl9O1xuXHRib2R5OiBhbnk7XG5cdHJlc3VsdD86IGFueTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcmNlcHQocmVxOiBleHByZXNzLlJlcXVlc3QsIGhlYWRlcnM6IHtbazogc3RyaW5nXTogYW55fSwgYm9keTogYW55LFxuXHRyZXNIYW5kbGVyczogcG0uRGlyVHJlZTxwbS5TdG9yZWRIYW5kbGVyPEJvZHlIYW5kbGVyPj4sIG5hbWU6IHN0cmluZyk6IFByb21pc2U8SGFuZGxlclBhcmFtc3xudWxsPiB7XG5cdHZhciBib2R5SGFuZGxlclByb206IFByb21pc2U8SGFuZGxlclBhcmFtcz47XG5cdHZhciBoYW5kbGVyczogQm9keUhhbmRsZXJbXSA9IHBtLm1hdGNoZWRIYW5kbGVycyhyZXNIYW5kbGVycywgcmVxLnVybCk7XG5cdGlmIChoYW5kbGVycy5sZW5ndGggPiAwKSB7XG5cdFx0Ym9keUhhbmRsZXJQcm9tID0gUHJvbWlzZS5yZXNvbHZlKHtyZXEsIGhlYWRlcnMsIGJvZHl9KTtcblx0XHRoYW5kbGVycy5mb3JFYWNoKGZ1bmMgPT4ge1xuXHRcdFx0Ym9keUhhbmRsZXJQcm9tID0gYm9keUhhbmRsZXJQcm9tLnRoZW4oZGF0YSA9PiB7XG5cdFx0XHRcdGNvbnN0IHJlc29sdmVkUmVzID0gZnVuYyhkYXRhLnJlcSwgZGF0YS5oZWFkZXJzLCBkYXRhLmJvZHksIGRhdGEucmVzdWx0LCB7fSk7XG5cdFx0XHRcdGlmIChyZXNvbHZlZFJlcyAhPSBudWxsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXNvbHZlZFJlcylcblx0XHRcdFx0XHQudGhlbihyZXN1bHQgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oZGF0YSwge3Jlc3VsdH0pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoZGF0YSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRib2R5SGFuZGxlclByb20gPSBib2R5SGFuZGxlclByb20udGhlbihkYXRhID0+IGRhdGEucmVzdWx0KTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuXHR9XG5cdHJldHVybiBib2R5SGFuZGxlclByb207XG59XG4vLyBmdW5jdGlvbiBfZmlsdGVySGFuZGxlcnMocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlc0hhbmRsZXJzOiB7W3BhdGg6IHN0cmluZ106IFNldDxCb2R5SGFuZGxlcnxIZWFkZXJIYW5kbGVyPn0pIHtcbi8vIFx0dmFyIGhhbmRsZXJzOiBBcnJheTxCb2R5SGFuZGxlcnxIZWFkZXJIYW5kbGVyPiA9IFtdO1xuLy8gXHRjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UocmVxLnVybCk7XG4vLyBcdGlmIChwYXJzZWRVcmwucGF0aG5hbWUgPT0gbnVsbClcbi8vIFx0XHRyZXR1cm4gW107XG4vLyBcdHZhciBoYW5kbGVyU2V0ID0gZ2V0KHJlc0hhbmRsZXJzLCBwYXJzZWRVcmwucGF0aG5hbWUpO1xuLy8gXHRpZiAoaGFuZGxlclNldClcbi8vIFx0XHRoYW5kbGVycy5wdXNoKC4uLmhhbmRsZXJTZXQudmFsdWVzKCkpO1xuLy8gXHR2YXIgZGVmYXVsdEhhbmRsZXJTZXQgPSByZXNIYW5kbGVyc1snKiddO1xuLy8gXHRpZiAoZGVmYXVsdEhhbmRsZXJTZXQpXG4vLyBcdFx0aGFuZGxlcnMucHVzaCguLi5kZWZhdWx0SGFuZGxlclNldC52YWx1ZXMoKSk7XG4vLyBcdHJldHVybiBoYW5kbGVycztcbi8vIH1cbmV4cG9ydCBjbGFzcyBQcm94eUluc3RhbmNlRm9yQnJvd3NlciB7XG5cdG5hbWU6IHN0cmluZztcblx0cmVzSGFuZGxlcnM6IHBtLkRpclRyZWU8cG0uU3RvcmVkSGFuZGxlcjxCb2R5SGFuZGxlcj4+ID0gbmV3IHBtLkRpclRyZWUoKTtcblx0cmVxSGFuZGxlcnM6IHBtLkRpclRyZWU8cG0uU3RvcmVkSGFuZGxlcjxCb2R5SGFuZGxlcj4+ID0gbmV3IHBtLkRpclRyZWUoKTtcblx0bW9ja0hhbmRsZXJzOiBwbS5EaXJUcmVlPHBtLlN0b3JlZEhhbmRsZXI8Qm9keUhhbmRsZXI+PiA9IG5ldyBwbS5EaXJUcmVlKCk7XG5cdHJlc0hlYWRlckhhbmRsZXJzOiBwbS5EaXJUcmVlPHBtLlN0b3JlZEhhbmRsZXI8SGVhZGVySGFuZGxlcj4+ID0gbmV3IHBtLkRpclRyZWUoKTtcblx0Y29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBwcm90ZWN0ZWQgb3B0aW9uczoge1trOiBzdHJpbmddOiBhbnl9ID0ge30pIHtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR9XG5cblx0Z2V0IGlzUmVtb3ZlQ29va2llRG9tYWluKCk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiAhIXRoaXMub3B0aW9ucy5yZW1vdmVDb29raWVEb21haW47XG5cdH1cblxuXHRhZGRPcHRpb25zKG9wdDoge1trOiBzdHJpbmddOiBhbnl9KTogUHJveHlJbnN0YW5jZUZvckJyb3dzZXIge1xuXHRcdGFzc2lnbih0aGlzLm9wdGlvbnMsIG9wdCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblx0LyoqXG5cdCAqIEBkZXByZWNhdGVkXG5cdCAqIEBwYXJhbSB7Kn0gcGF0aCBzdWIgcGF0aCBhZnRlciAnL2h0dHAtcmVxdWVzdC1wcm94eSdcblx0ICogQHBhcmFtIHsqfSBoYW5kbGVyICh1cmw6IHN0cmluZywgbWV0aG9kOnN0cmluZyxcblx0ICogXHRyZXNwb25zZUhlYWRlcnM6IHtbbmFtZTogc3RyaW5nXTpzdHJpbmd9LCByZXNwb25zZUJvZHk6IHN0cmluZyB8IEJ1ZmZlcikgPT4gbnVsbCB8IFByb21pc2U8c3RyaW5nPlxuXHQgKi9cblx0aW50ZXJjZXB0UmVzcG9uc2UocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBCb2R5SGFuZGxlcikge1xuXHRcdHBtLmFkZFRvSGFuZGxlclRyZWUocGF0aCwgaGFuZGxlciwgdGhpcy5yZXNIYW5kbGVycyk7XG5cdH1cblx0LyoqIEBkZXByZWNhdGVkICovXG5cdGludGVyY2VwdFJlcXVlc3QocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBCb2R5SGFuZGxlcikge1xuXHRcdHBtLmFkZFRvSGFuZGxlclRyZWUocGF0aCwgaGFuZGxlciwgdGhpcy5yZXFIYW5kbGVycyk7XG5cdH1cblx0bW9ja1Jlc3BvbnNlKHBhdGg6IHN0cmluZywgaGFuZGxlcjogQm9keUhhbmRsZXIpIHtcblx0XHRwbS5hZGRUb0hhbmRsZXJUcmVlKHBhdGgsIGhhbmRsZXIsIHRoaXMubW9ja0hhbmRsZXJzKTtcblx0fVxuXHQvKipAZGVwcmVjYXRlZCAqL1xuXHRpbnRlcmNlcHRSZXNIZWFkZXIocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBIZWFkZXJIYW5kbGVyKSB7XG5cdFx0cG0uYWRkVG9IYW5kbGVyVHJlZShwYXRoLCBoYW5kbGVyLCB0aGlzLnJlc0hlYWRlckhhbmRsZXJzKTtcblx0fVxufVxuXG5leHBvcnQgdHlwZSBNb2NrU2V0dXBGdW5jID0gKHByb3h5OiBQcm94eUluc3RhbmNlRm9yQnJvd3NlciwgZm9yTmFtZT86IChuYW1lOiBzdHJpbmcpID0+XG5cdFByb3h5SW5zdGFuY2VGb3JCcm93c2VyKSA9PiB2b2lkO1xuIl19
