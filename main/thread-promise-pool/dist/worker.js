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
// tslint:disable no-console
var worker_threads_1 = require("worker_threads");
var verbose = false;
var initialDone = Promise.resolve();
process.on('uncaughtException', function (err) {
    // log.error('Uncaught exception', err, err.stack);
    console.error("[thread-pool] worker pid:" + worker_threads_1.workerData.id + " Uncaught exception: ", err);
    worker_threads_1.parentPort.postMessage({
        type: 'error',
        data: err.toString()
    });
});
process.on('unhandledRejection', function (err) {
    // log.warn('unhandledRejection', err);
    console.error("[thread-pool] worker pid:" + worker_threads_1.workerData.id + " unhandledRejection", err);
    worker_threads_1.parentPort.postMessage({
        type: 'error',
        data: err ? err.toString() : err
    });
});
if (worker_threads_1.workerData) {
    verbose = !!worker_threads_1.workerData.verbose;
    if (worker_threads_1.workerData.initializer) {
        var _a = worker_threads_1.workerData.initializer, file = _a.file, exportFn = _a.exportFn;
        if (exportFn == null)
            initialDone = Promise.resolve(require(file));
        else
            initialDone = Promise.resolve(require(file)[exportFn]());
    }
    else {
        initialDone = Promise.resolve();
    }
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
                        if (verbose)
                            console.log("[thread-pool] worker pid:" + worker_threads_1.workerData.id + " exit");
                        process.exit(0);
                        return [2 /*return*/];
                    }
                    if (verbose) {
                        console.log("[thread-pool] worker " + worker_threads_1.workerData.id + " run");
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, initialDone];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, Promise.resolve((_a = require(data.file))[data.exportFn].apply(_a, (data.args || [])))];
                case 3:
                    result = _b.sent();
                    if (verbose) {
                        console.log("[thread-pool] worker pid:" + worker_threads_1.workerData.id + " wait");
                    }
                    if (result != null && result.transferList) {
                        transferList = result.transferList;
                        delete result.transferList;
                        worker_threads_1.parentPort.postMessage({ type: 'wait', data: result }, transferList);
                    }
                    else {
                        worker_threads_1.parentPort.postMessage({ type: 'wait', data: result });
                    }
                    return [3 /*break*/, 5];
                case 4:
                    ex_1 = _b.sent();
                    console.log("[thread-pool] worker " + worker_threads_1.workerData.id + " error", ex_1);
                    try {
                        worker_threads_1.parentPort.postMessage({
                            type: 'error',
                            data: ex_1.toString()
                        });
                    }
                    catch (err) {
                        worker_threads_1.parentPort.postMessage({
                            type: 'error',
                            data: err.toString()
                        });
                    }
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLGlEQUFtRjtBQUVuRixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxXQUFXLEdBQWlCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUVsRCxPQUFPLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLFVBQVMsR0FBRztJQUMxQyxtREFBbUQ7SUFDbkQsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBNEIsMkJBQVUsQ0FBQyxFQUFFLDBCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3JGLDJCQUFXLENBQUMsV0FBVyxDQUFDO1FBQ3RCLElBQUksRUFBRSxPQUFPO1FBQ2IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUU7S0FDckIsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLFVBQUEsR0FBRztJQUNsQyx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBNEIsMkJBQVUsQ0FBQyxFQUFFLHdCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ25GLDJCQUFXLENBQUMsV0FBVyxDQUFDO1FBQ3RCLElBQUksRUFBRSxPQUFPO1FBQ2IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHO0tBQ2pDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBc0NILElBQUksMkJBQVUsRUFBRTtJQUNkLE9BQU8sR0FBRyxDQUFDLENBQUUsMkJBQTZCLENBQUMsT0FBTyxDQUFDO0lBQ25ELElBQUssMkJBQTZCLENBQUMsV0FBVyxFQUFFO1FBQ3hDLElBQUEsS0FBb0IsMkJBQTZCLENBQUMsV0FBWSxFQUE3RCxJQUFJLFVBQUEsRUFBRSxRQUFRLGNBQStDLENBQUM7UUFDckUsSUFBSSxRQUFRLElBQUksSUFBSTtZQUNsQixXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7WUFFN0MsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUM1RDtTQUFNO1FBQ0wsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUNqQztDQUNGO0FBRUQsSUFBSSxDQUFDLDZCQUFZLEVBQUU7SUFDakIsMkJBQVcsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0NBQzNDO0FBRUQsU0FBZSxjQUFjLENBQUMsSUFBb0I7Ozs7Ozs7b0JBQ2hELElBQUssSUFBZ0IsQ0FBQyxJQUFJLEVBQUU7d0JBQzFCLElBQUksT0FBTzs0QkFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE0QiwyQkFBVSxDQUFDLEVBQUUsVUFBTyxDQUFDLENBQUM7d0JBQ2hFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2hCLHNCQUFPO3FCQUNSO29CQUNELElBQUksT0FBTyxFQUFFO3dCQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQXdCLDJCQUFVLENBQUMsRUFBRSxTQUFNLENBQUMsQ0FBQztxQkFDMUQ7Ozs7b0JBRUMscUJBQU0sV0FBVyxFQUFBOztvQkFBakIsU0FBaUIsQ0FBQztvQkFDSCxxQkFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUEsS0FBQSxPQUFPLENBQUUsSUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUUsSUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUNyRixDQUFFLElBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLEVBQzVCLEVBQUE7O29CQUZFLE1BQU0sR0FBRyxTQUVYO29CQUVKLElBQUksT0FBTyxFQUFFO3dCQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQTRCLDJCQUFVLENBQUMsRUFBRSxVQUFPLENBQUMsQ0FBQztxQkFDL0Q7b0JBQ0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFLLE1BQXFCLENBQUMsWUFBWSxFQUFFO3dCQUNuRCxZQUFZLEdBQUksTUFBcUIsQ0FBQyxZQUFZLENBQUM7d0JBQ3pELE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQzt3QkFDM0IsMkJBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztxQkFDdkU7eUJBQU07d0JBQ0wsMkJBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO3FCQUN6RDs7OztvQkFHRCxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUF3QiwyQkFBVSxDQUFDLEVBQUUsV0FBUSxFQUFFLElBQUUsQ0FBQyxDQUFDO29CQUMvRCxJQUFJO3dCQUNGLDJCQUFXLENBQUMsV0FBVyxDQUFDOzRCQUN0QixJQUFJLEVBQUUsT0FBTzs0QkFDYixJQUFJLEVBQUUsSUFBRSxDQUFDLFFBQVEsRUFBRTt5QkFDcEIsQ0FBQyxDQUFDO3FCQUNKO29CQUFDLE9BQU8sR0FBRyxFQUFFO3dCQUNaLDJCQUFXLENBQUMsV0FBVyxDQUFDOzRCQUN0QixJQUFJLEVBQUUsT0FBTzs0QkFDYixJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRTt5QkFDckIsQ0FBQyxDQUFDO3FCQUNKOzs7Ozs7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCB7aXNNYWluVGhyZWFkLCBwYXJlbnRQb3J0LCB3b3JrZXJEYXRhLCBXb3JrZXJPcHRpb25zfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmxldCB2ZXJib3NlID0gZmFsc2U7XG5sZXQgaW5pdGlhbERvbmU6IFByb21pc2U8YW55PiA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICAvLyBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbicsIGVyciwgZXJyLnN0YWNrKTtcbiAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSB3b3JrZXIgcGlkOiR7d29ya2VyRGF0YS5pZH0gVW5jYXVnaHQgZXhjZXB0aW9uOiBgLCBlcnIpO1xuICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7XG4gICAgdHlwZTogJ2Vycm9yJyxcbiAgICBkYXRhOiBlcnIudG9TdHJpbmcoKVxuICB9KTtcbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuICAvLyBsb2cud2FybigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbiAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSB3b3JrZXIgcGlkOiR7d29ya2VyRGF0YS5pZH0gdW5oYW5kbGVkUmVqZWN0aW9uYCwgZXJyKTtcbiAgcGFyZW50UG9ydCEucG9zdE1lc3NhZ2Uoe1xuICAgIHR5cGU6ICdlcnJvcicsXG4gICAgZGF0YTogZXJyID8gZXJyLnRvU3RyaW5nKCkgOiBlcnJcbiAgfSk7XG59KTtcblxuZXhwb3J0IGludGVyZmFjZSBJbml0aWFsT3B0aW9ucyB7XG4gIHZlcmJvc2U/OiBib29sZWFuO1xuICAvKiogQWZ0ZXIgd29ya2VyIGJlaW5nIGNyZWF0ZWQsIHRoZSBleHBvcnRlZCBmdW5jdGlvbiB3aWxsIGJlIHJ1bixcbiAgICogWW91IGNhbiBwdXQgYW55IGluaXRpYWwgbG9naWMgaW4gaXQsIGxpa2UgY2FsbGluZyBgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJylgIG9yXG4gICAqIHNldHVwIHByb2Nlc3MgZXZlbnQgaGFuZGxpbmcgZm9yIHVuY2F1Z2h0RXhjZXB0aW9uIGFuZCB1bmhhbmRsZWRSZWplY3Rpb24uXG4gICAqL1xuICBpbml0aWFsaXplcj86IHtmaWxlOiBzdHJpbmc7IGV4cG9ydEZuPzogc3RyaW5nfTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGFzayB7XG4gIGZpbGU6IHN0cmluZztcbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2hpY2ggY2FuIHJldHVybiBQcm9taXNlIG9yIG5vbi1Qcm9taXNlIHZhbHVlXG4gICAqL1xuICBleHBvcnRGbjogc3RyaW5nO1xuICBhcmdzPzogYW55W107XG4gIC8qKiBXb3JrZXIgbWVzc2FnZSB0cmFuc2Zlckxpc3QsIHNlZVxuICAgKiBodHRwczovL25vZGVqcy5vcmcvZG9jcy9sYXRlc3QtdjEyLngvYXBpL3dvcmtlcl90aHJlYWRzLmh0bWwjd29ya2VyX3RocmVhZHNfcG9ydF9wb3N0bWVzc2FnZV92YWx1ZV90cmFuc2Zlcmxpc3RcbiAgICogbWF5IGJlIGEgbGlzdCBvZiBBcnJheUJ1ZmZlciwgTWVzc2FnZVBvcnQgYW5kIEZpbGVIYW5kbGUgb2JqZWN0cy4gQWZ0ZXIgdHJhbnNmZXJyaW5nLCBcbiAgICogdGhleSB3aWxsIG5vdCBiZSB1c2FibGUgb24gdGhlIHNlbmRpbmcgc2lkZSBvZiB0aGUgY2hhbm5lbCBhbnltb3JlIChldmVuIGlmIHRoZXkgYXJlIG5vdCBjb250YWluZWQgaW4gdmFsdWUpLlxuICAgKiBVbmxpa2Ugd2l0aCBjaGlsZCBwcm9jZXNzZXMsIHRyYW5zZmVycmluZyBoYW5kbGVzIHN1Y2ggYXMgbmV0d29yayBzb2NrZXRzIGlzIGN1cnJlbnRseSBub3Qgc3VwcG9ydGVkLlxuICAgKiBJZiB2YWx1ZSBjb250YWlucyBTaGFyZWRBcnJheUJ1ZmZlciBpbnN0YW5jZXMsIHRob3NlIHdpbGwgYmUgYWNjZXNzaWJsZSBmcm9tIGVpdGhlciB0aHJlYWQuIFxuICAgKiBUaGV5IGNhbm5vdCBiZSBsaXN0ZWQgaW4gdHJhbnNmZXJMaXN0LlxuICAgKiB2YWx1ZSBtYXkgc3RpbGwgY29udGFpbiBBcnJheUJ1ZmZlciBpbnN0YW5jZXMgdGhhdCBhcmUgbm90IGluIHRyYW5zZmVyTGlzdDtcbiAgICogaW4gdGhhdCBjYXNlLCB0aGUgdW5kZXJseWluZyBtZW1vcnkgaXMgY29waWVkIHJhdGhlciB0aGFuIG1vdmVkLlxuICAgKi9cbiAgdHJhbnNmZXJMaXN0PzogV29ya2VyT3B0aW9uc1sndHJhbnNmZXJMaXN0J107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFza1Jlc3VsdCB7XG4gIHRyYW5zZmVyTGlzdD86IFdvcmtlck9wdGlvbnNbJ3RyYW5zZmVyTGlzdCddO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmQge1xuICBleGl0OiBib29sZWFuO1xufVxuXG5pZiAod29ya2VyRGF0YSkge1xuICB2ZXJib3NlID0gISEod29ya2VyRGF0YSBhcyBJbml0aWFsT3B0aW9ucykudmVyYm9zZTtcbiAgaWYgKCh3b3JrZXJEYXRhIGFzIEluaXRpYWxPcHRpb25zKS5pbml0aWFsaXplcikge1xuICAgIGNvbnN0IHtmaWxlLCBleHBvcnRGbn0gPSAod29ya2VyRGF0YSBhcyBJbml0aWFsT3B0aW9ucykuaW5pdGlhbGl6ZXIhO1xuICAgIGlmIChleHBvcnRGbiA9PSBudWxsKVxuICAgICAgaW5pdGlhbERvbmUgPSBQcm9taXNlLnJlc29sdmUocmVxdWlyZShmaWxlKSk7XG4gICAgZWxzZVxuICAgICAgaW5pdGlhbERvbmUgPSBQcm9taXNlLnJlc29sdmUocmVxdWlyZShmaWxlKVtleHBvcnRGbl0oKSk7XG4gIH0gZWxzZSB7XG4gICAgaW5pdGlhbERvbmUgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxufVxuXG5pZiAoIWlzTWFpblRocmVhZCkge1xuICBwYXJlbnRQb3J0IS5vbignbWVzc2FnZScsIGV4ZWN1dGVPbkV2ZW50KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZU9uRXZlbnQoZGF0YTogVGFzayB8IENvbW1hbmQpIHtcbiAgaWYgKChkYXRhIGFzIENvbW1hbmQpLmV4aXQpIHtcbiAgICBpZiAodmVyYm9zZSlcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHdvcmtlciBwaWQ6JHt3b3JrZXJEYXRhLmlkfSBleGl0YCk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAodmVyYm9zZSkge1xuICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHdvcmtlciAke3dvcmtlckRhdGEuaWR9IHJ1bmApO1xuICB9XG4gIHRyeSB7XG4gICAgYXdhaXQgaW5pdGlhbERvbmU7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoKGRhdGEgYXMgVGFzaykuZmlsZSlbKGRhdGEgYXMgVGFzaykuZXhwb3J0Rm5dKFxuICAgICAgLi4uKChkYXRhIGFzIFRhc2spLmFyZ3MgfHwgW10pXG4gICAgICApKTtcblxuICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSB3b3JrZXIgcGlkOiR7d29ya2VyRGF0YS5pZH0gd2FpdGApO1xuICAgIH1cbiAgICBpZiAocmVzdWx0ICE9IG51bGwgJiYgKHJlc3VsdCBhcyBUYXNrUmVzdWx0KS50cmFuc2Zlckxpc3QpIHtcbiAgICAgIGNvbnN0IHRyYW5zZmVyTGlzdCA9IChyZXN1bHQgYXMgVGFza1Jlc3VsdCkudHJhbnNmZXJMaXN0O1xuICAgICAgZGVsZXRlIHJlc3VsdC50cmFuc2Zlckxpc3Q7XG4gICAgICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7IHR5cGU6ICd3YWl0JywgZGF0YTogcmVzdWx0IH0sIHRyYW5zZmVyTGlzdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3dhaXQnLCBkYXRhOiByZXN1bHQgfSk7XG4gICAgfVxuXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gd29ya2VyICR7d29ya2VyRGF0YS5pZH0gZXJyb3JgLCBleCk7XG4gICAgdHJ5IHtcbiAgICAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgZGF0YTogZXgudG9TdHJpbmcoKVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIGRhdGE6IGVyci50b1N0cmluZygpXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==