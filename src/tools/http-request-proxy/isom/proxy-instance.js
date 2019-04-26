"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const assign_1 = tslib_1.__importDefault(require("lodash/assign"));
const pm = tslib_1.__importStar(require("./path-matcher"));
function intercept(req, headers, body, resHandlers, name) {
    // console.log(resHandlers.toString());
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvaHR0cC1yZXF1ZXN0LXByb3h5L2lzb20vcHJveHktaW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUVBQW1DO0FBR25DLDJEQUFxQztBQWtCckMsU0FBZ0IsU0FBUyxDQUFDLEdBQW9CLEVBQUUsT0FBMkIsRUFBRSxJQUFTLEVBQ3JGLFdBQXdELEVBQUUsSUFBWTtJQUN0RSx1Q0FBdUM7SUFDdkMsSUFBSSxlQUF1QyxDQUFDO0lBQzVDLElBQUksUUFBUSxHQUFrQixFQUFFLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkUsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN4QixlQUFlLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUN4RCxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZCLGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM3QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDN0UsSUFBSSxXQUFXLElBQUksSUFBSSxFQUFFO29CQUN4QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO3lCQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7d0JBQ2QsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7b0JBQ3RDLENBQUMsQ0FBQyxDQUFDO2lCQUNIO2dCQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0gsZUFBZSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDNUQ7U0FBTTtRQUNOLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUM3QjtJQUNELE9BQU8sZUFBZSxDQUFDO0FBQ3hCLENBQUM7QUF4QkQsOEJBd0JDO0FBQ0Qsa0hBQWtIO0FBQ2xILHdEQUF3RDtBQUN4RCx5Q0FBeUM7QUFDekMsbUNBQW1DO0FBQ25DLGVBQWU7QUFDZiwwREFBMEQ7QUFDMUQsbUJBQW1CO0FBQ25CLDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFDN0MsMEJBQTBCO0FBQzFCLGtEQUFrRDtBQUNsRCxvQkFBb0I7QUFDcEIsSUFBSTtBQUNKLE1BQWEsdUJBQXVCO0lBTW5DLFlBQVksSUFBWSxFQUFZLFVBQThCLEVBQUU7UUFBaEMsWUFBTyxHQUFQLE9BQU8sQ0FBeUI7UUFKcEUsZ0JBQVcsR0FBZ0QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUUsZ0JBQVcsR0FBZ0QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUUsaUJBQVksR0FBZ0QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0Usc0JBQWlCLEdBQWtELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRW5GLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO0lBQzFDLENBQUM7SUFFRCxVQUFVLENBQUMsR0FBdUI7UUFDakMsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNEOzs7OztPQUtHO0lBQ0gsaUJBQWlCLENBQUMsSUFBWSxFQUFFLE9BQW9CO1FBQ25ELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBQ0Qsa0JBQWtCO0lBQ2xCLGdCQUFnQixDQUFDLElBQVksRUFBRSxPQUFvQjtRQUNsRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUNEOzs7Ozs7T0FNRztJQUNILFlBQVksQ0FBQyxJQUFZLEVBQUUsT0FBb0I7UUFDOUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFDRCxpQkFBaUI7SUFDakIsa0JBQWtCLENBQUMsSUFBWSxFQUFFLE9BQXNCO1FBQ3RELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRDtBQTdDRCwwREE2Q0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci9odHRwLXJlcXVlc3QtcHJveHkvaXNvbS9wcm94eS1pbnN0YW5jZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhc3NpZ24gZnJvbSAnbG9kYXNoL2Fzc2lnbic7XG5pbXBvcnQgKiBhcyBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtCb2R5SGFuZGxlciwgSGVhZGVySGFuZGxlcn0gZnJvbSAnLi9wYXRoLW1hdGNoZXInO1xuaW1wb3J0ICogYXMgcG0gZnJvbSAnLi9wYXRoLW1hdGNoZXInO1xuLy8gaW1wb3J0IHtJbmNvbWluZ0h0dHBIZWFkZXJzfSBmcm9tICdodHRwJztcblxuLy8gZXhwb3J0IGludGVyZmFjZSBJc29tUmVxdWVzdCB7XG4vLyBcdG1ldGhvZDogc3RyaW5nO1xuLy8gXHR1cmw6IHN0cmluZztcbi8vIFx0aGVhZGVyczogSW5jb21pbmdIdHRwSGVhZGVycztcbi8vIFx0Ym9keTogYW55O1xuLy8gXHRxdWVyeTogYW55O1xuLy8gXHRyZXNwb25zZVR5cGU6ICdhcnJheWJ1ZmZlcicgfCAnYmxvYicgfCAnanNvbicgfCAndGV4dCc7XG4vLyB9XG5cbmludGVyZmFjZSBIYW5kbGVyUGFyYW1zIHtcblx0cmVxOiBleHByZXNzLlJlcXVlc3Q7XG5cdGhlYWRlcnM6IHtbazogc3RyaW5nXTogYW55fTtcblx0Ym9keTogYW55O1xuXHRyZXN1bHQ/OiBhbnk7XG59XG5leHBvcnQgZnVuY3Rpb24gaW50ZXJjZXB0KHJlcTogZXhwcmVzcy5SZXF1ZXN0LCBoZWFkZXJzOiB7W2s6IHN0cmluZ106IGFueX0sIGJvZHk6IGFueSxcblx0cmVzSGFuZGxlcnM6IHBtLkRpclRyZWU8cG0uU3RvcmVkSGFuZGxlcjxCb2R5SGFuZGxlcj5bXT4sIG5hbWU6IHN0cmluZyk6IFByb21pc2U8SGFuZGxlclBhcmFtc3xudWxsPiB7XG5cdC8vIGNvbnNvbGUubG9nKHJlc0hhbmRsZXJzLnRvU3RyaW5nKCkpO1xuXHR2YXIgYm9keUhhbmRsZXJQcm9tOiBQcm9taXNlPEhhbmRsZXJQYXJhbXM+O1xuXHR2YXIgaGFuZGxlcnM6IEJvZHlIYW5kbGVyW10gPSBwbS5tYXRjaGVkSGFuZGxlcnMocmVzSGFuZGxlcnMsIHJlcS51cmwpO1xuXHRpZiAoaGFuZGxlcnMubGVuZ3RoID4gMCkge1xuXHRcdGJvZHlIYW5kbGVyUHJvbSA9IFByb21pc2UucmVzb2x2ZSh7cmVxLCBoZWFkZXJzLCBib2R5fSk7XG5cdFx0aGFuZGxlcnMuZm9yRWFjaChmdW5jID0+IHtcblx0XHRcdGJvZHlIYW5kbGVyUHJvbSA9IGJvZHlIYW5kbGVyUHJvbS50aGVuKGRhdGEgPT4ge1xuXHRcdFx0XHRjb25zdCByZXNvbHZlZFJlcyA9IGZ1bmMoZGF0YS5yZXEsIGRhdGEuaGVhZGVycywgZGF0YS5ib2R5LCBkYXRhLnJlc3VsdCwge30pO1xuXHRcdFx0XHRpZiAocmVzb2x2ZWRSZXMgIT0gbnVsbCkge1xuXHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzb2x2ZWRSZXMpXG5cdFx0XHRcdFx0LnRoZW4ocmVzdWx0ID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiBPYmplY3QuYXNzaWduKGRhdGEsIHtyZXN1bHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGRhdGEpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0Ym9keUhhbmRsZXJQcm9tID0gYm9keUhhbmRsZXJQcm9tLnRoZW4oZGF0YSA9PiBkYXRhLnJlc3VsdCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcblx0fVxuXHRyZXR1cm4gYm9keUhhbmRsZXJQcm9tO1xufVxuLy8gZnVuY3Rpb24gX2ZpbHRlckhhbmRsZXJzKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXNIYW5kbGVyczoge1twYXRoOiBzdHJpbmddOiBTZXQ8Qm9keUhhbmRsZXJ8SGVhZGVySGFuZGxlcj59KSB7XG4vLyBcdHZhciBoYW5kbGVyczogQXJyYXk8Qm9keUhhbmRsZXJ8SGVhZGVySGFuZGxlcj4gPSBbXTtcbi8vIFx0Y29uc3QgcGFyc2VkVXJsID0gVXJsLnBhcnNlKHJlcS51cmwpO1xuLy8gXHRpZiAocGFyc2VkVXJsLnBhdGhuYW1lID09IG51bGwpXG4vLyBcdFx0cmV0dXJuIFtdO1xuLy8gXHR2YXIgaGFuZGxlclNldCA9IGdldChyZXNIYW5kbGVycywgcGFyc2VkVXJsLnBhdGhuYW1lKTtcbi8vIFx0aWYgKGhhbmRsZXJTZXQpXG4vLyBcdFx0aGFuZGxlcnMucHVzaCguLi5oYW5kbGVyU2V0LnZhbHVlcygpKTtcbi8vIFx0dmFyIGRlZmF1bHRIYW5kbGVyU2V0ID0gcmVzSGFuZGxlcnNbJyonXTtcbi8vIFx0aWYgKGRlZmF1bHRIYW5kbGVyU2V0KVxuLy8gXHRcdGhhbmRsZXJzLnB1c2goLi4uZGVmYXVsdEhhbmRsZXJTZXQudmFsdWVzKCkpO1xuLy8gXHRyZXR1cm4gaGFuZGxlcnM7XG4vLyB9XG5leHBvcnQgY2xhc3MgUHJveHlJbnN0YW5jZUZvckJyb3dzZXIge1xuXHRuYW1lOiBzdHJpbmc7XG5cdHJlc0hhbmRsZXJzOiBwbS5EaXJUcmVlPHBtLlN0b3JlZEhhbmRsZXI8Qm9keUhhbmRsZXI+W10+ID0gbmV3IHBtLkRpclRyZWUoKTtcblx0cmVxSGFuZGxlcnM6IHBtLkRpclRyZWU8cG0uU3RvcmVkSGFuZGxlcjxCb2R5SGFuZGxlcj5bXT4gPSBuZXcgcG0uRGlyVHJlZSgpO1xuXHRtb2NrSGFuZGxlcnM6IHBtLkRpclRyZWU8cG0uU3RvcmVkSGFuZGxlcjxCb2R5SGFuZGxlcj5bXT4gPSBuZXcgcG0uRGlyVHJlZSgpO1xuXHRyZXNIZWFkZXJIYW5kbGVyczogcG0uRGlyVHJlZTxwbS5TdG9yZWRIYW5kbGVyPEhlYWRlckhhbmRsZXI+W10+ID0gbmV3IHBtLkRpclRyZWUoKTtcblx0Y29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBwcm90ZWN0ZWQgb3B0aW9uczoge1trOiBzdHJpbmddOiBhbnl9ID0ge30pIHtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHR9XG5cblx0Z2V0IGlzUmVtb3ZlQ29va2llRG9tYWluKCk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiAhIXRoaXMub3B0aW9ucy5yZW1vdmVDb29raWVEb21haW47XG5cdH1cblxuXHRhZGRPcHRpb25zKG9wdDoge1trOiBzdHJpbmddOiBhbnl9KTogUHJveHlJbnN0YW5jZUZvckJyb3dzZXIge1xuXHRcdGFzc2lnbih0aGlzLm9wdGlvbnMsIG9wdCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblx0LyoqXG5cdCAqIEBkZXByZWNhdGVkXG5cdCAqIEBwYXJhbSB7Kn0gcGF0aCBzdWIgcGF0aCBhZnRlciAnL2h0dHAtcmVxdWVzdC1wcm94eSdcblx0ICogQHBhcmFtIHsqfSBoYW5kbGVyICh1cmw6IHN0cmluZywgbWV0aG9kOnN0cmluZyxcblx0ICogXHRyZXNwb25zZUhlYWRlcnM6IHtbbmFtZTogc3RyaW5nXTpzdHJpbmd9LCByZXNwb25zZUJvZHk6IHN0cmluZyB8IEJ1ZmZlcikgPT4gbnVsbCB8IFByb21pc2U8c3RyaW5nPlxuXHQgKi9cblx0aW50ZXJjZXB0UmVzcG9uc2UocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBCb2R5SGFuZGxlcikge1xuXHRcdHBtLmFkZFRvSGFuZGxlclRyZWUocGF0aCwgaGFuZGxlciwgdGhpcy5yZXNIYW5kbGVycyk7XG5cdH1cblx0LyoqIEBkZXByZWNhdGVkICovXG5cdGludGVyY2VwdFJlcXVlc3QocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBCb2R5SGFuZGxlcikge1xuXHRcdHBtLmFkZFRvSGFuZGxlclRyZWUocGF0aCwgaGFuZGxlciwgdGhpcy5yZXFIYW5kbGVycyk7XG5cdH1cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gcGF0aCB7c3RyaW5nfSBhIFVSSSBzdHJpbmcgaW4gZm9ybWF0IG9mIFVybCdzIHBhdGhuYW1lLCBzdXBwb3J0IHBhdGggcGFyYW1ldGVyaXplZCBwYXRoIG5hbWVcblx0ICogIGJlZ2luIHdpdGggXCI6XCIgb3Igd2lsZGNhcmQgXCIqXCIsIGUuZy5cblx0ICogICBcIi9mb28vYmFyLzppZC9yZXN0aW5nLXBhdGhcIiwgXCIvZm9vL2Jhci8qXCIgYW5kIFwiKlwiXG5cdCAqIEBwYXJhbSBoYW5kbGVyIFxuXHQgKi9cblx0bW9ja1Jlc3BvbnNlKHBhdGg6IHN0cmluZywgaGFuZGxlcjogQm9keUhhbmRsZXIpIHtcblx0XHRwbS5hZGRUb0hhbmRsZXJUcmVlKHBhdGgsIGhhbmRsZXIsIHRoaXMubW9ja0hhbmRsZXJzKTtcblx0fVxuXHQvKipAZGVwcmVjYXRlZCAqL1xuXHRpbnRlcmNlcHRSZXNIZWFkZXIocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBIZWFkZXJIYW5kbGVyKSB7XG5cdFx0cG0uYWRkVG9IYW5kbGVyVHJlZShwYXRoLCBoYW5kbGVyLCB0aGlzLnJlc0hlYWRlckhhbmRsZXJzKTtcblx0fVxufVxuXG5leHBvcnQgdHlwZSBNb2NrU2V0dXBGdW5jID0gKHByb3h5OiBQcm94eUluc3RhbmNlRm9yQnJvd3NlciwgZm9yTmFtZT86IChuYW1lOiBzdHJpbmcpID0+XG5cdFByb3h5SW5zdGFuY2VGb3JCcm93c2VyKSA9PiB2b2lkO1xuIl19