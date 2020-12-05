"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var worker_threads_1 = require("worker_threads");
if (worker_threads_1.workerData) {
    executeOnEvent(worker_threads_1.workerData);
}
if (!worker_threads_1.isMainThread) {
    worker_threads_1.parentPort.on('message', executeOnEvent);
}
function executeOnEvent(data) {
    return __awaiter(this, void 0, void 0, function () {
        var result, transferList, ex_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (data.exit) {
                        process.exit(0);
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.resolve((_a = require(data.file))[data.exportFn].apply(_a, (data.args || [])))];
                case 2:
                    result = _b.sent();
                    if (result.transferList) {
                        transferList = result.transferList;
                        delete result.transferList;
                        worker_threads_1.parentPort.postMessage({ type: 'wait', data: result }, transferList);
                    }
                    else {
                        worker_threads_1.parentPort.postMessage({ type: 'wait', data: result });
                    }
                    return [3 /*break*/, 4];
                case 3:
                    ex_1 = _b.sent();
                    worker_threads_1.parentPort.postMessage({
                        type: 'error',
                        data: ex_1
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1GO0FBOEJuRixJQUFJLDJCQUFVLEVBQUU7SUFDZCxjQUFjLENBQUMsMkJBQVUsQ0FBQyxDQUFDO0NBQzVCO0FBRUQsSUFBSSxDQUFDLDZCQUFZLEVBQUU7SUFDakIsMkJBQVcsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0NBQzNDO0FBRUQsU0FBZSxjQUFjLENBQUMsSUFBb0I7Ozs7Ozs7b0JBQ2hELElBQUssSUFBZ0IsQ0FBQyxJQUFJLEVBQUU7d0JBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2hCLHNCQUFPO3FCQUNSOzs7O29CQUVnQixxQkFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUEsS0FBQSxPQUFPLENBQUUsSUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUUsSUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUNyRixDQUFFLElBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLEVBQzVCLEVBQUE7O29CQUZFLE1BQU0sR0FBRyxTQUVYO29CQUNKLElBQUssTUFBcUIsQ0FBQyxZQUFZLEVBQUU7d0JBQ2pDLFlBQVksR0FBSSxNQUFxQixDQUFDLFlBQVksQ0FBQzt3QkFDekQsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDO3dCQUMzQiwyQkFBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO3FCQUN2RTt5QkFBTTt3QkFDTCwyQkFBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7cUJBQ3pEOzs7O29CQUdELDJCQUFXLENBQUMsV0FBVyxDQUFDO3dCQUN0QixJQUFJLEVBQUUsT0FBTzt3QkFDYixJQUFJLEVBQUUsSUFBRTtxQkFDVCxDQUFDLENBQUM7Ozs7OztDQUVOIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtpc01haW5UaHJlYWQsIHBhcmVudFBvcnQsIHdvcmtlckRhdGEsIFdvcmtlck9wdGlvbnN9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcblxuZXhwb3J0IGludGVyZmFjZSBUYXNrIHtcbiAgZmlsZTogc3RyaW5nO1xuICAvKipcbiAgICogQSBmdW5jdGlvbiB3aGljaCBjYW4gcmV0dXJuIFByb21pc2Ugb3Igbm9uLVByb21pc2UgdmFsdWVcbiAgICovXG4gIGV4cG9ydEZuOiBzdHJpbmc7XG4gIGFyZ3M/OiBhbnlbXTtcbiAgLyoqIFdvcmtlciBtZXNzYWdlIHRyYW5zZmVyTGlzdCwgc2VlXG4gICAqIGh0dHBzOi8vbm9kZWpzLm9yZy9kb2NzL2xhdGVzdC12MTIueC9hcGkvd29ya2VyX3RocmVhZHMuaHRtbCN3b3JrZXJfdGhyZWFkc19wb3J0X3Bvc3RtZXNzYWdlX3ZhbHVlX3RyYW5zZmVybGlzdFxuICAgKiBtYXkgYmUgYSBsaXN0IG9mIEFycmF5QnVmZmVyLCBNZXNzYWdlUG9ydCBhbmQgRmlsZUhhbmRsZSBvYmplY3RzLiBBZnRlciB0cmFuc2ZlcnJpbmcsIFxuICAgKiB0aGV5IHdpbGwgbm90IGJlIHVzYWJsZSBvbiB0aGUgc2VuZGluZyBzaWRlIG9mIHRoZSBjaGFubmVsIGFueW1vcmUgKGV2ZW4gaWYgdGhleSBhcmUgbm90IGNvbnRhaW5lZCBpbiB2YWx1ZSkuXG4gICAqIFVubGlrZSB3aXRoIGNoaWxkIHByb2Nlc3NlcywgdHJhbnNmZXJyaW5nIGhhbmRsZXMgc3VjaCBhcyBuZXR3b3JrIHNvY2tldHMgaXMgY3VycmVudGx5IG5vdCBzdXBwb3J0ZWQuXG4gICAqIElmIHZhbHVlIGNvbnRhaW5zIFNoYXJlZEFycmF5QnVmZmVyIGluc3RhbmNlcywgdGhvc2Ugd2lsbCBiZSBhY2Nlc3NpYmxlIGZyb20gZWl0aGVyIHRocmVhZC4gXG4gICAqIFRoZXkgY2Fubm90IGJlIGxpc3RlZCBpbiB0cmFuc2Zlckxpc3QuXG4gICAqIHZhbHVlIG1heSBzdGlsbCBjb250YWluIEFycmF5QnVmZmVyIGluc3RhbmNlcyB0aGF0IGFyZSBub3QgaW4gdHJhbnNmZXJMaXN0O1xuICAgKiBpbiB0aGF0IGNhc2UsIHRoZSB1bmRlcmx5aW5nIG1lbW9yeSBpcyBjb3BpZWQgcmF0aGVyIHRoYW4gbW92ZWQuXG4gICAqL1xuICB0cmFuc2Zlckxpc3Q/OiBXb3JrZXJPcHRpb25zWyd0cmFuc2Zlckxpc3QnXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYXNrUmVzdWx0IHtcbiAgdHJhbnNmZXJMaXN0PzogV29ya2VyT3B0aW9uc1sndHJhbnNmZXJMaXN0J107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZCB7XG4gIGV4aXQ6IGJvb2xlYW47XG59XG5cbmlmICh3b3JrZXJEYXRhKSB7XG4gIGV4ZWN1dGVPbkV2ZW50KHdvcmtlckRhdGEpO1xufVxuXG5pZiAoIWlzTWFpblRocmVhZCkge1xuICBwYXJlbnRQb3J0IS5vbignbWVzc2FnZScsIGV4ZWN1dGVPbkV2ZW50KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZU9uRXZlbnQoZGF0YTogVGFzayB8IENvbW1hbmQpIHtcbiAgaWYgKChkYXRhIGFzIENvbW1hbmQpLmV4aXQpIHtcbiAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoKGRhdGEgYXMgVGFzaykuZmlsZSlbKGRhdGEgYXMgVGFzaykuZXhwb3J0Rm5dKFxuICAgICAgLi4uKChkYXRhIGFzIFRhc2spLmFyZ3MgfHwgW10pXG4gICAgICApKTtcbiAgICBpZiAoKHJlc3VsdCBhcyBUYXNrUmVzdWx0KS50cmFuc2Zlckxpc3QpIHtcbiAgICAgIGNvbnN0IHRyYW5zZmVyTGlzdCA9IChyZXN1bHQgYXMgVGFza1Jlc3VsdCkudHJhbnNmZXJMaXN0O1xuICAgICAgZGVsZXRlIHJlc3VsdC50cmFuc2Zlckxpc3Q7XG4gICAgICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7IHR5cGU6ICd3YWl0JywgZGF0YTogcmVzdWx0IH0sIHRyYW5zZmVyTGlzdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3dhaXQnLCBkYXRhOiByZXN1bHQgfSk7XG4gICAgfVxuXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcGFyZW50UG9ydCEucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIGRhdGE6IGV4XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==