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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL2h0dHAtcmVxdWVzdC1wcm94eS9pc29tL3Byb3h5LWluc3RhbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyREFBbUM7QUFHbkMsbURBQXFDO0FBa0JyQyxTQUFnQixTQUFTLENBQUMsR0FBb0IsRUFBRSxPQUEyQixFQUFFLElBQVMsRUFDcEYsV0FBd0QsRUFBRSxJQUFZO0lBQ3RFLHVDQUF1QztJQUN2QyxJQUFJLGVBQXVDLENBQUM7SUFDNUMsSUFBSSxRQUFRLEdBQWtCLEVBQUUsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2RSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZCLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNDLGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtnQkFDdkIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztxQkFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUNiLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO2dCQUN2QyxDQUFDLENBQUMsQ0FBQzthQUNKO1lBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO1FBQ0gsZUFBZSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDN0Q7U0FBTTtRQUNMLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUM5QjtJQUNELE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUF2QkQsOEJBdUJDO0FBQ0Qsa0hBQWtIO0FBQ2xILHdEQUF3RDtBQUN4RCx5Q0FBeUM7QUFDekMsbUNBQW1DO0FBQ25DLGVBQWU7QUFDZiwwREFBMEQ7QUFDMUQsbUJBQW1CO0FBQ25CLDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFDN0MsMEJBQTBCO0FBQzFCLGtEQUFrRDtBQUNsRCxvQkFBb0I7QUFDcEIsSUFBSTtBQUNKLE1BQWEsdUJBQXVCO0lBTWxDLFlBQVksSUFBWSxFQUFZLFVBQThCLEVBQUU7UUFBaEMsWUFBTyxHQUFQLE9BQU8sQ0FBeUI7UUFKcEUsZ0JBQVcsR0FBZ0QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUUsZ0JBQVcsR0FBZ0QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUUsaUJBQVksR0FBZ0QsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0Usc0JBQWlCLEdBQWtELElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWxGLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFFRCxJQUFJLG9CQUFvQjtRQUN0QixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO0lBQzNDLENBQUM7SUFFRCxVQUFVLENBQUMsR0FBdUI7UUFDaEMsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNEOzs7OztTQUtFO0lBQ0YsaUJBQWlCLENBQUMsSUFBWSxFQUFFLE9BQW9CO1FBQ2xELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQ0Qsa0JBQWtCO0lBQ2xCLGdCQUFnQixDQUFDLElBQVksRUFBRSxPQUFvQjtRQUNqRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNEOzs7Ozs7U0FNRTtJQUNGLFlBQVksQ0FBQyxJQUFZLEVBQUUsT0FBb0I7UUFDN0MsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFDRCxpQkFBaUI7SUFDakIsa0JBQWtCLENBQUMsSUFBWSxFQUFFLE9BQXNCO1FBQ3JELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRjtBQTdDRCwwREE2Q0MiLCJmaWxlIjoidG9vbHMvaHR0cC1yZXF1ZXN0LXByb3h5L2Rpc3QvcHJveHktaW5zdGFuY2UuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
