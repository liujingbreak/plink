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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvaHR0cC1yZXF1ZXN0LXByb3h5L2lzb20vcHJveHktaW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUVBQW1DO0FBR25DLDJEQUFxQztBQWtCckMsU0FBZ0IsU0FBUyxDQUFDLEdBQW9CLEVBQUUsT0FBMkIsRUFBRSxJQUFTLEVBQ3BGLFdBQXdELEVBQUUsSUFBWTtJQUN0RSx1Q0FBdUM7SUFDdkMsSUFBSSxlQUF1QyxDQUFDO0lBQzVDLElBQUksUUFBUSxHQUFrQixFQUFFLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkUsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN2QixlQUFlLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzQyxlQUFlLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RSxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7Z0JBQ3ZCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7cUJBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDYixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQztnQkFDdkMsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztRQUNILGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzdEO1NBQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDOUI7SUFDRCxPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDO0FBdkJELDhCQXVCQztBQUNELGtIQUFrSDtBQUNsSCx3REFBd0Q7QUFDeEQseUNBQXlDO0FBQ3pDLG1DQUFtQztBQUNuQyxlQUFlO0FBQ2YsMERBQTBEO0FBQzFELG1CQUFtQjtBQUNuQiwyQ0FBMkM7QUFDM0MsNkNBQTZDO0FBQzdDLDBCQUEwQjtBQUMxQixrREFBa0Q7QUFDbEQsb0JBQW9CO0FBQ3BCLElBQUk7QUFDSixNQUFhLHVCQUF1QjtJQU1sQyxZQUFZLElBQVksRUFBWSxVQUE4QixFQUFFO1FBQWhDLFlBQU8sR0FBUCxPQUFPLENBQXlCO1FBSnBFLGdCQUFXLEdBQWdELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVFLGdCQUFXLEdBQWdELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVFLGlCQUFZLEdBQWdELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdFLHNCQUFpQixHQUFrRCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVsRixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsSUFBSSxvQkFBb0I7UUFDdEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUMzQyxDQUFDO0lBRUQsVUFBVSxDQUFDLEdBQXVCO1FBQ2hDLGdCQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRDs7Ozs7U0FLRTtJQUNGLGlCQUFpQixDQUFDLElBQVksRUFBRSxPQUFvQjtRQUNsRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNELGtCQUFrQjtJQUNsQixnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsT0FBb0I7UUFDakQsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFDRDs7Ozs7O1NBTUU7SUFDRixZQUFZLENBQUMsSUFBWSxFQUFFLE9BQW9CO1FBQzdDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsaUJBQWlCO0lBQ2pCLGtCQUFrQixDQUFDLElBQVksRUFBRSxPQUFzQjtRQUNyRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQ0Y7QUE3Q0QsMERBNkNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvaHR0cC1yZXF1ZXN0LXByb3h5L2lzb20vcHJveHktaW5zdGFuY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzaWduIGZyb20gJ2xvZGFzaC9hc3NpZ24nO1xuaW1wb3J0ICogYXMgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCB7Qm9keUhhbmRsZXIsIEhlYWRlckhhbmRsZXJ9IGZyb20gJy4vcGF0aC1tYXRjaGVyJztcbmltcG9ydCAqIGFzIHBtIGZyb20gJy4vcGF0aC1tYXRjaGVyJztcbi8vIGltcG9ydCB7SW5jb21pbmdIdHRwSGVhZGVyc30gZnJvbSAnaHR0cCc7XG5cbi8vIGV4cG9ydCBpbnRlcmZhY2UgSXNvbVJlcXVlc3Qge1xuLy8gXHRtZXRob2Q6IHN0cmluZztcbi8vIFx0dXJsOiBzdHJpbmc7XG4vLyBcdGhlYWRlcnM6IEluY29taW5nSHR0cEhlYWRlcnM7XG4vLyBcdGJvZHk6IGFueTtcbi8vIFx0cXVlcnk6IGFueTtcbi8vIFx0cmVzcG9uc2VUeXBlOiAnYXJyYXlidWZmZXInIHwgJ2Jsb2InIHwgJ2pzb24nIHwgJ3RleHQnO1xuLy8gfVxuXG5pbnRlcmZhY2UgSGFuZGxlclBhcmFtcyB7XG4gIHJlcTogZXhwcmVzcy5SZXF1ZXN0O1xuICBoZWFkZXJzOiB7W2s6IHN0cmluZ106IGFueX07XG4gIGJvZHk6IGFueTtcbiAgcmVzdWx0PzogYW55O1xufVxuZXhwb3J0IGZ1bmN0aW9uIGludGVyY2VwdChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgaGVhZGVyczoge1trOiBzdHJpbmddOiBhbnl9LCBib2R5OiBhbnksXG4gIHJlc0hhbmRsZXJzOiBwbS5EaXJUcmVlPHBtLlN0b3JlZEhhbmRsZXI8Qm9keUhhbmRsZXI+W10+LCBuYW1lOiBzdHJpbmcpOiBQcm9taXNlPEhhbmRsZXJQYXJhbXN8bnVsbD4ge1xuICAvLyBjb25zb2xlLmxvZyhyZXNIYW5kbGVycy50b1N0cmluZygpKTtcbiAgdmFyIGJvZHlIYW5kbGVyUHJvbTogUHJvbWlzZTxIYW5kbGVyUGFyYW1zPjtcbiAgdmFyIGhhbmRsZXJzOiBCb2R5SGFuZGxlcltdID0gcG0ubWF0Y2hlZEhhbmRsZXJzKHJlc0hhbmRsZXJzLCByZXEudXJsKTtcbiAgaWYgKGhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICBib2R5SGFuZGxlclByb20gPSBQcm9taXNlLnJlc29sdmUoe3JlcSwgaGVhZGVycywgYm9keX0pO1xuICAgIGNvbnN0IGZ1bmMgPSBoYW5kbGVyc1toYW5kbGVycy5sZW5ndGggLSAxXTtcbiAgICBib2R5SGFuZGxlclByb20gPSBib2R5SGFuZGxlclByb20udGhlbihkYXRhID0+IHtcbiAgICAgIGNvbnN0IHJlc29sdmVkUmVzID0gZnVuYyhkYXRhLnJlcSwgZGF0YS5oZWFkZXJzLCBkYXRhLmJvZHksIGRhdGEucmVzdWx0LCB7fSk7XG4gICAgICBpZiAocmVzb2x2ZWRSZXMgIT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc29sdmVkUmVzKVxuICAgICAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKGRhdGEsIHtyZXN1bHR9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGRhdGEpO1xuICAgIH0pO1xuICAgIGJvZHlIYW5kbGVyUHJvbSA9IGJvZHlIYW5kbGVyUHJvbS50aGVuKGRhdGEgPT4gZGF0YS5yZXN1bHQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG4gIH1cbiAgcmV0dXJuIGJvZHlIYW5kbGVyUHJvbTtcbn1cbi8vIGZ1bmN0aW9uIF9maWx0ZXJIYW5kbGVycyhyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzSGFuZGxlcnM6IHtbcGF0aDogc3RyaW5nXTogU2V0PEJvZHlIYW5kbGVyfEhlYWRlckhhbmRsZXI+fSkge1xuLy8gXHR2YXIgaGFuZGxlcnM6IEFycmF5PEJvZHlIYW5kbGVyfEhlYWRlckhhbmRsZXI+ID0gW107XG4vLyBcdGNvbnN0IHBhcnNlZFVybCA9IFVybC5wYXJzZShyZXEudXJsKTtcbi8vIFx0aWYgKHBhcnNlZFVybC5wYXRobmFtZSA9PSBudWxsKVxuLy8gXHRcdHJldHVybiBbXTtcbi8vIFx0dmFyIGhhbmRsZXJTZXQgPSBnZXQocmVzSGFuZGxlcnMsIHBhcnNlZFVybC5wYXRobmFtZSk7XG4vLyBcdGlmIChoYW5kbGVyU2V0KVxuLy8gXHRcdGhhbmRsZXJzLnB1c2goLi4uaGFuZGxlclNldC52YWx1ZXMoKSk7XG4vLyBcdHZhciBkZWZhdWx0SGFuZGxlclNldCA9IHJlc0hhbmRsZXJzWycqJ107XG4vLyBcdGlmIChkZWZhdWx0SGFuZGxlclNldClcbi8vIFx0XHRoYW5kbGVycy5wdXNoKC4uLmRlZmF1bHRIYW5kbGVyU2V0LnZhbHVlcygpKTtcbi8vIFx0cmV0dXJuIGhhbmRsZXJzO1xuLy8gfVxuZXhwb3J0IGNsYXNzIFByb3h5SW5zdGFuY2VGb3JCcm93c2VyIHtcbiAgbmFtZTogc3RyaW5nO1xuICByZXNIYW5kbGVyczogcG0uRGlyVHJlZTxwbS5TdG9yZWRIYW5kbGVyPEJvZHlIYW5kbGVyPltdPiA9IG5ldyBwbS5EaXJUcmVlKCk7XG4gIHJlcUhhbmRsZXJzOiBwbS5EaXJUcmVlPHBtLlN0b3JlZEhhbmRsZXI8Qm9keUhhbmRsZXI+W10+ID0gbmV3IHBtLkRpclRyZWUoKTtcbiAgbW9ja0hhbmRsZXJzOiBwbS5EaXJUcmVlPHBtLlN0b3JlZEhhbmRsZXI8Qm9keUhhbmRsZXI+W10+ID0gbmV3IHBtLkRpclRyZWUoKTtcbiAgcmVzSGVhZGVySGFuZGxlcnM6IHBtLkRpclRyZWU8cG0uU3RvcmVkSGFuZGxlcjxIZWFkZXJIYW5kbGVyPltdPiA9IG5ldyBwbS5EaXJUcmVlKCk7XG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgcHJvdGVjdGVkIG9wdGlvbnM6IHtbazogc3RyaW5nXTogYW55fSA9IHt9KSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgfVxuXG4gIGdldCBpc1JlbW92ZUNvb2tpZURvbWFpbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLm9wdGlvbnMucmVtb3ZlQ29va2llRG9tYWluO1xuICB9XG5cbiAgYWRkT3B0aW9ucyhvcHQ6IHtbazogc3RyaW5nXTogYW55fSk6IFByb3h5SW5zdGFuY2VGb3JCcm93c2VyIHtcbiAgICBhc3NpZ24odGhpcy5vcHRpb25zLCBvcHQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIC8qKlxuXHQgKiBAZGVwcmVjYXRlZFxuXHQgKiBAcGFyYW0geyp9IHBhdGggc3ViIHBhdGggYWZ0ZXIgJy9odHRwLXJlcXVlc3QtcHJveHknXG5cdCAqIEBwYXJhbSB7Kn0gaGFuZGxlciAodXJsOiBzdHJpbmcsIG1ldGhvZDpzdHJpbmcsXG5cdCAqIFx0cmVzcG9uc2VIZWFkZXJzOiB7W25hbWU6IHN0cmluZ106c3RyaW5nfSwgcmVzcG9uc2VCb2R5OiBzdHJpbmcgfCBCdWZmZXIpID0+IG51bGwgfCBQcm9taXNlPHN0cmluZz5cblx0ICovXG4gIGludGVyY2VwdFJlc3BvbnNlKHBhdGg6IHN0cmluZywgaGFuZGxlcjogQm9keUhhbmRsZXIpIHtcbiAgICBwbS5hZGRUb0hhbmRsZXJUcmVlKHBhdGgsIGhhbmRsZXIsIHRoaXMucmVzSGFuZGxlcnMpO1xuICB9XG4gIC8qKiBAZGVwcmVjYXRlZCAqL1xuICBpbnRlcmNlcHRSZXF1ZXN0KHBhdGg6IHN0cmluZywgaGFuZGxlcjogQm9keUhhbmRsZXIpIHtcbiAgICBwbS5hZGRUb0hhbmRsZXJUcmVlKHBhdGgsIGhhbmRsZXIsIHRoaXMucmVxSGFuZGxlcnMpO1xuICB9XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHBhdGgge3N0cmluZ30gYSBVUkkgc3RyaW5nIGluIGZvcm1hdCBvZiBVcmwncyBwYXRobmFtZSwgc3VwcG9ydCBwYXRoIHBhcmFtZXRlcml6ZWQgcGF0aCBuYW1lXG5cdCAqICBiZWdpbiB3aXRoIFwiOlwiIG9yIHdpbGRjYXJkIFwiKlwiLCBlLmcuXG5cdCAqICAgXCIvZm9vL2Jhci86aWQvcmVzdGluZy1wYXRoXCIsIFwiL2Zvby9iYXIvKlwiIGFuZCBcIipcIlxuXHQgKiBAcGFyYW0gaGFuZGxlciBcblx0ICovXG4gIG1vY2tSZXNwb25zZShwYXRoOiBzdHJpbmcsIGhhbmRsZXI6IEJvZHlIYW5kbGVyKSB7XG4gICAgcG0uYWRkVG9IYW5kbGVyVHJlZShwYXRoLCBoYW5kbGVyLCB0aGlzLm1vY2tIYW5kbGVycyk7XG4gIH1cbiAgLyoqQGRlcHJlY2F0ZWQgKi9cbiAgaW50ZXJjZXB0UmVzSGVhZGVyKHBhdGg6IHN0cmluZywgaGFuZGxlcjogSGVhZGVySGFuZGxlcikge1xuICAgIHBtLmFkZFRvSGFuZGxlclRyZWUocGF0aCwgaGFuZGxlciwgdGhpcy5yZXNIZWFkZXJIYW5kbGVycyk7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgTW9ja1NldHVwRnVuYyA9IChwcm94eTogUHJveHlJbnN0YW5jZUZvckJyb3dzZXIsIGZvck5hbWU/OiAobmFtZTogc3RyaW5nKSA9PlxuICBQcm94eUluc3RhbmNlRm9yQnJvd3NlcikgPT4gdm9pZDtcbiJdfQ==
