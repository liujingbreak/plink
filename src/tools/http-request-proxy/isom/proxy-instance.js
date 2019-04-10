"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
class ProxyInstanceForBrowser {
    constructor(name, options = {}) {
        this.options = options;
        this.resHandlers = {};
        this.reqHandlers = {};
        this.mockHandlers = {};
        this.resHeaderHandlers = {};
        this.name = name;
    }
    get isRemoveCookieDomain() {
        return !!this.options.removeCookieDomain;
    }
    addOptions(opt) {
        _.assign(this.options, opt);
        return this;
    }
    /**
     * @param {*} path sub path after '/http-request-proxy'
     * @param {*} handler (url: string, method:string,
     * 	responseHeaders: {[name: string]:string}, responseBody: string | Buffer) => null | Promise<string>
     */
    interceptResponse(path, handler) {
        this.addHandler(path, handler, this.resHandlers);
    }
    interceptRequest(path, handler) {
        this.addHandler(path, handler, this.reqHandlers);
    }
    mockResponse(path, handler) {
        this.addHandler(path, handler, this.mockHandlers);
    }
    interceptResHeader(path, handler) {
        this.addHandler(path, handler, this.resHeaderHandlers);
    }
    addHandler(path, handler, to) {
        if (path !== '*' && !_.startsWith(path, '/'))
            path = '/' + path;
        var list = _.get(to, path);
        if (list == null) {
            list = new Set();
            to[path] = list;
        }
        list.add(handler);
    }
}
exports.ProxyInstanceForBrowser = ProxyInstanceForBrowser;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvaHR0cC1yZXF1ZXN0LXByb3h5L2lzb20vcHJveHktaW5zdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0RBQTRCO0FBVTVCLE1BQWEsdUJBQXVCO0lBTW5DLFlBQVksSUFBWSxFQUFZLFVBQThCLEVBQUU7UUFBaEMsWUFBTyxHQUFQLE9BQU8sQ0FBeUI7UUFKcEUsZ0JBQVcsR0FBdUQsRUFBRSxDQUFDO1FBQ3JFLGdCQUFXLEdBQXVELEVBQUUsQ0FBQztRQUNyRSxpQkFBWSxHQUF1RCxFQUFFLENBQUM7UUFDdEUsc0JBQWlCLEdBQXlDLEVBQUUsQ0FBQztRQUU1RCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUMxQyxDQUFDO0lBRUQsVUFBVSxDQUFDLEdBQXVCO1FBQ2pDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRDs7OztPQUlHO0lBQ0gsaUJBQWlCLENBQUMsSUFBWSxFQUFFLE9BQW9CO1FBQ25ELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUNELGdCQUFnQixDQUFDLElBQVksRUFBRSxPQUFvQjtRQUNsRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFDRCxZQUFZLENBQUMsSUFBWSxFQUFFLE9BQW9CO1FBQzlDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNELGtCQUFrQixDQUFDLElBQVksRUFBRSxPQUFzQjtRQUN0RCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUNPLFVBQVUsQ0FBQyxJQUFZLEVBQUUsT0FBb0MsRUFDcEUsRUFBc0Q7UUFDdEQsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO1lBQzNDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ25CLElBQUksSUFBSSxHQUFxQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3RCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDakIsSUFBSSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1lBQzlDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7U0FDaEI7UUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25CLENBQUM7Q0FDRDtBQTlDRCwwREE4Q0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci9odHRwLXJlcXVlc3QtcHJveHkvaXNvbS9wcm94eS1pbnN0YW5jZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5cbmV4cG9ydCB0eXBlIEhlYWRlckhhbmRsZXIgPSAocmVxOiBleHByZXNzLlJlcXVlc3QsIGhlYWRlcjoge1tuYW1lOiBzdHJpbmddOiBhbnl9KSA9PiB2b2lkO1xuXG5leHBvcnQgdHlwZSBCb2R5SGFuZGxlciA9IChyZXE6IGV4cHJlc3MuUmVxdWVzdCxcblx0aGFja2VkUmVxSGVhZGVyczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9LFxuXHRyZXF1ZXN0Qm9keTogYW55LFxuXHRsYXN0UmVzdWx0OiBhbnkpID0+IGFueTtcblxuZXhwb3J0IGNsYXNzIFByb3h5SW5zdGFuY2VGb3JCcm93c2VyIHtcblx0bmFtZTogc3RyaW5nO1xuXHRyZXNIYW5kbGVyczoge1twYXRoOiBzdHJpbmddOiBTZXQ8Qm9keUhhbmRsZXIgfCBIZWFkZXJIYW5kbGVyPn0gPSB7fTtcblx0cmVxSGFuZGxlcnM6IHtbcGF0aDogc3RyaW5nXTogU2V0PEJvZHlIYW5kbGVyIHwgSGVhZGVySGFuZGxlcj59ID0ge307XG5cdG1vY2tIYW5kbGVyczoge1twYXRoOiBzdHJpbmddOiBTZXQ8Qm9keUhhbmRsZXIgfCBIZWFkZXJIYW5kbGVyPn0gPSB7fTtcblx0cmVzSGVhZGVySGFuZGxlcnM6IHtbcGF0aDogc3RyaW5nXTogU2V0PEhlYWRlckhhbmRsZXI+fSA9IHt9O1xuXHRjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHByb3RlY3RlZCBvcHRpb25zOiB7W2s6IHN0cmluZ106IGFueX0gPSB7fSkge1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdH1cblxuXHRnZXQgaXNSZW1vdmVDb29raWVEb21haW4oKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuICEhdGhpcy5vcHRpb25zLnJlbW92ZUNvb2tpZURvbWFpbjtcblx0fVxuXG5cdGFkZE9wdGlvbnMob3B0OiB7W2s6IHN0cmluZ106IGFueX0pOiBQcm94eUluc3RhbmNlRm9yQnJvd3NlciB7XG5cdFx0Xy5hc3NpZ24odGhpcy5vcHRpb25zLCBvcHQpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cdC8qKlxuXHQgKiBAcGFyYW0geyp9IHBhdGggc3ViIHBhdGggYWZ0ZXIgJy9odHRwLXJlcXVlc3QtcHJveHknXG5cdCAqIEBwYXJhbSB7Kn0gaGFuZGxlciAodXJsOiBzdHJpbmcsIG1ldGhvZDpzdHJpbmcsXG5cdCAqIFx0cmVzcG9uc2VIZWFkZXJzOiB7W25hbWU6IHN0cmluZ106c3RyaW5nfSwgcmVzcG9uc2VCb2R5OiBzdHJpbmcgfCBCdWZmZXIpID0+IG51bGwgfCBQcm9taXNlPHN0cmluZz5cblx0ICovXG5cdGludGVyY2VwdFJlc3BvbnNlKHBhdGg6IHN0cmluZywgaGFuZGxlcjogQm9keUhhbmRsZXIpIHtcblx0XHR0aGlzLmFkZEhhbmRsZXIocGF0aCwgaGFuZGxlciwgdGhpcy5yZXNIYW5kbGVycyk7XG5cdH1cblx0aW50ZXJjZXB0UmVxdWVzdChwYXRoOiBzdHJpbmcsIGhhbmRsZXI6IEJvZHlIYW5kbGVyKSB7XG5cdFx0dGhpcy5hZGRIYW5kbGVyKHBhdGgsIGhhbmRsZXIsIHRoaXMucmVxSGFuZGxlcnMpO1xuXHR9XG5cdG1vY2tSZXNwb25zZShwYXRoOiBzdHJpbmcsIGhhbmRsZXI6IEJvZHlIYW5kbGVyKSB7XG5cdFx0dGhpcy5hZGRIYW5kbGVyKHBhdGgsIGhhbmRsZXIsIHRoaXMubW9ja0hhbmRsZXJzKTtcblx0fVxuXHRpbnRlcmNlcHRSZXNIZWFkZXIocGF0aDogc3RyaW5nLCBoYW5kbGVyOiBIZWFkZXJIYW5kbGVyKSB7XG5cdFx0dGhpcy5hZGRIYW5kbGVyKHBhdGgsIGhhbmRsZXIsIHRoaXMucmVzSGVhZGVySGFuZGxlcnMpO1xuXHR9XG5cdHByaXZhdGUgYWRkSGFuZGxlcihwYXRoOiBzdHJpbmcsIGhhbmRsZXI6IEJvZHlIYW5kbGVyIHwgSGVhZGVySGFuZGxlcixcblx0XHR0bzoge1twYXRoOiBzdHJpbmddOiBTZXQ8Qm9keUhhbmRsZXIgfCBIZWFkZXJIYW5kbGVyPn0pIHtcblx0XHRpZiAocGF0aCAhPT0gJyonICYmICFfLnN0YXJ0c1dpdGgocGF0aCwgJy8nKSlcblx0XHRcdHBhdGggPSAnLycgKyBwYXRoO1xuXHRcdHZhciBsaXN0OiBTZXQ8Qm9keUhhbmRsZXIgfCBIZWFkZXJIYW5kbGVyPiA9IF8uZ2V0KHRvLCBwYXRoKTtcblx0XHRpZiAobGlzdCA9PSBudWxsKSB7XG5cdFx0XHRsaXN0ID0gbmV3IFNldDxCb2R5SGFuZGxlciB8IEhlYWRlckhhbmRsZXI+KCk7XG5cdFx0XHR0b1twYXRoXSA9IGxpc3Q7XG5cdFx0fVxuXHRcdGxpc3QuYWRkKGhhbmRsZXIpO1xuXHR9XG59XG4iXX0=
