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
                            console.log("[thread-pool] worker " + (worker_threads_1.workerData === null || worker_threads_1.workerData === void 0 ? void 0 : worker_threads_1.workerData.id) + " exit");
                        worker_threads_1.parentPort.off('message', executeOnEvent);
                        // Don't call process.exit(0), there might be some unfinished output stream still on-going at this moment.
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, initialDone];
                case 1:
                    _b.sent();
                    if (verbose) {
                        console.log("[thread-pool] worker " + (worker_threads_1.workerData === null || worker_threads_1.workerData === void 0 ? void 0 : worker_threads_1.workerData.id) + " run");
                    }
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve((_a = require(data.file))[data.exportFn].apply(_a, (data.args || [])))];
                case 3:
                    result = _b.sent();
                    if (verbose) {
                        console.log("[thread-pool] worker " + (worker_threads_1.workerData === null || worker_threads_1.workerData === void 0 ? void 0 : worker_threads_1.workerData.id) + " wait");
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
                    console.log("[thread-pool] worker " + (worker_threads_1.workerData === null || worker_threads_1.workerData === void 0 ? void 0 : worker_threads_1.workerData.id) + " error", ex_1);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLGlEQUFtRjtBQUVuRixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxXQUFXLEdBQWlCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQXdEbEQsSUFBSSwyQkFBVSxFQUFFO0lBQ2QsT0FBTyxHQUFHLENBQUMsQ0FBRSwyQkFBNkIsQ0FBQyxPQUFPLENBQUM7SUFDbkQsSUFBSywyQkFBNkIsQ0FBQyxXQUFXLEVBQUU7UUFDeEMsSUFBQSxLQUFvQiwyQkFBNkIsQ0FBQyxXQUFZLEVBQTdELElBQUksVUFBQSxFQUFFLFFBQVEsY0FBK0MsQ0FBQztRQUNyRSxJQUFJLFFBQVEsSUFBSSxJQUFJO1lBQ2xCLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztZQUU3QyxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQzVEO1NBQU07UUFDTCxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0tBQ2pDO0NBQ0Y7QUFFRCxJQUFJLENBQUMsNkJBQVksRUFBRTtJQUNqQiwyQkFBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7Q0FDM0M7QUFFRCxTQUFlLGNBQWMsQ0FBQyxJQUFvQjs7Ozs7OztvQkFDaEQsSUFBSyxJQUFnQixDQUFDLElBQUksRUFBRTt3QkFDMUIsSUFBSSxPQUFPOzRCQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQXdCLDJCQUFVLGFBQVYsMkJBQVUsdUJBQVYsMkJBQVUsQ0FBRSxFQUFFLFdBQU8sQ0FBQyxDQUFDO3dCQUM3RCwyQkFBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7d0JBQzNDLDBHQUEwRzt3QkFDMUcsc0JBQU87cUJBQ1I7b0JBQ0QscUJBQU0sV0FBVyxFQUFBOztvQkFBakIsU0FBaUIsQ0FBQztvQkFDbEIsSUFBSSxPQUFPLEVBQUU7d0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBd0IsMkJBQVUsYUFBViwyQkFBVSx1QkFBViwyQkFBVSxDQUFFLEVBQUUsVUFBTSxDQUFDLENBQUM7cUJBQzNEOzs7O29CQUVnQixxQkFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUEsS0FBQSxPQUFPLENBQUUsSUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUUsSUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUNyRixDQUFFLElBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLEVBQzVCLEVBQUE7O29CQUZFLE1BQU0sR0FBRyxTQUVYO29CQUVKLElBQUksT0FBTyxFQUFFO3dCQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQXdCLDJCQUFVLGFBQVYsMkJBQVUsdUJBQVYsMkJBQVUsQ0FBRSxFQUFFLFdBQU8sQ0FBQyxDQUFDO3FCQUM1RDtvQkFDRCxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUssTUFBcUIsQ0FBQyxZQUFZLEVBQUU7d0JBQ25ELFlBQVksR0FBSSxNQUFxQixDQUFDLFlBQVksQ0FBQzt3QkFDekQsT0FBTyxNQUFNLENBQUMsWUFBWSxDQUFDO3dCQUMzQiwyQkFBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO3FCQUN2RTt5QkFBTTt3QkFDTCwyQkFBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7cUJBQ3pEOzs7O29CQUdELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQXdCLDJCQUFVLGFBQVYsMkJBQVUsdUJBQVYsMkJBQVUsQ0FBRSxFQUFFLFlBQVEsRUFBRSxJQUFFLENBQUMsQ0FBQztvQkFDaEUsSUFBSTt3QkFDRiwyQkFBVyxDQUFDLFdBQVcsQ0FBQzs0QkFDdEIsSUFBSSxFQUFFLE9BQU87NEJBQ2IsSUFBSSxFQUFFLElBQUUsQ0FBQyxRQUFRLEVBQUU7eUJBQ3BCLENBQUMsQ0FBQztxQkFDSjtvQkFBQyxPQUFPLEdBQUcsRUFBRTt3QkFDWiwyQkFBVyxDQUFDLFdBQVcsQ0FBQzs0QkFDdEIsSUFBSSxFQUFFLE9BQU87NEJBQ2IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUU7eUJBQ3JCLENBQUMsQ0FBQztxQkFDSjs7Ozs7O0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQge2lzTWFpblRocmVhZCwgcGFyZW50UG9ydCwgd29ya2VyRGF0YSwgV29ya2VyT3B0aW9uc30gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5sZXQgdmVyYm9zZSA9IGZhbHNlO1xubGV0IGluaXRpYWxEb25lOiBQcm9taXNlPGFueT4gPSBQcm9taXNlLnJlc29sdmUoKTtcblxuLy8gcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcbi8vICAgLy8gbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb24nLCBlcnIsIGVyci5zdGFjayk7XG4vLyAgIGNvbnNvbGUuZXJyb3IoYFt0aHJlYWQtcG9vbF0gd29ya2VyIHBpZDoke3dvcmtlckRhdGEuaWR9IFVuY2F1Z2h0IGV4Y2VwdGlvbjogYCwgZXJyKTtcbi8vICAgcGFyZW50UG9ydCEucG9zdE1lc3NhZ2Uoe1xuLy8gICAgIHR5cGU6ICdlcnJvcicsXG4vLyAgICAgZGF0YTogZXJyLnRvU3RyaW5nKClcbi8vICAgfSk7XG4vLyB9KTtcblxuLy8gcHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbi8vICAgLy8gbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4vLyAgIGNvbnNvbGUuZXJyb3IoYFt0aHJlYWQtcG9vbF0gd29ya2VyIHBpZDoke3dvcmtlckRhdGEuaWR9IHVuaGFuZGxlZFJlamVjdGlvbmAsIGVycik7XG4vLyAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHtcbi8vICAgICB0eXBlOiAnZXJyb3InLFxuLy8gICAgIGRhdGE6IGVyciA/IGVyci50b1N0cmluZygpIDogZXJyXG4vLyAgIH0pO1xuLy8gfSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5pdGlhbE9wdGlvbnMge1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgLyoqIEFmdGVyIHdvcmtlciBiZWluZyBjcmVhdGVkLCB0aGUgZXhwb3J0ZWQgZnVuY3Rpb24gd2lsbCBiZSBydW4sXG4gICAqIFlvdSBjYW4gcHV0IGFueSBpbml0aWFsIGxvZ2ljIGluIGl0LCBsaWtlIGNhbGxpbmcgYHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpYCBvclxuICAgKiBzZXR1cCBwcm9jZXNzIGV2ZW50IGhhbmRsaW5nIGZvciB1bmNhdWdodEV4Y2VwdGlvbiBhbmQgdW5oYW5kbGVkUmVqZWN0aW9uLlxuICAgKi9cbiAgaW5pdGlhbGl6ZXI/OiB7ZmlsZTogc3RyaW5nOyBleHBvcnRGbj86IHN0cmluZ307XG59XG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBmaWxlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiByZXR1cm4gUHJvbWlzZSBvciBub24tUHJvbWlzZSB2YWx1ZVxuICAgKi9cbiAgZXhwb3J0Rm46IHN0cmluZztcbiAgYXJncz86IGFueVtdO1xuICAvKiogV29ya2VyIG1lc3NhZ2UgdHJhbnNmZXJMaXN0LCBzZWVcbiAgICogaHR0cHM6Ly9ub2RlanMub3JnL2RvY3MvbGF0ZXN0LXYxMi54L2FwaS93b3JrZXJfdGhyZWFkcy5odG1sI3dvcmtlcl90aHJlYWRzX3BvcnRfcG9zdG1lc3NhZ2VfdmFsdWVfdHJhbnNmZXJsaXN0XG4gICAqIG1heSBiZSBhIGxpc3Qgb2YgQXJyYXlCdWZmZXIsIE1lc3NhZ2VQb3J0IGFuZCBGaWxlSGFuZGxlIG9iamVjdHMuIEFmdGVyIHRyYW5zZmVycmluZywgXG4gICAqIHRoZXkgd2lsbCBub3QgYmUgdXNhYmxlIG9uIHRoZSBzZW5kaW5nIHNpZGUgb2YgdGhlIGNoYW5uZWwgYW55bW9yZSAoZXZlbiBpZiB0aGV5IGFyZSBub3QgY29udGFpbmVkIGluIHZhbHVlKS5cbiAgICogVW5saWtlIHdpdGggY2hpbGQgcHJvY2Vzc2VzLCB0cmFuc2ZlcnJpbmcgaGFuZGxlcyBzdWNoIGFzIG5ldHdvcmsgc29ja2V0cyBpcyBjdXJyZW50bHkgbm90IHN1cHBvcnRlZC5cbiAgICogSWYgdmFsdWUgY29udGFpbnMgU2hhcmVkQXJyYXlCdWZmZXIgaW5zdGFuY2VzLCB0aG9zZSB3aWxsIGJlIGFjY2Vzc2libGUgZnJvbSBlaXRoZXIgdGhyZWFkLiBcbiAgICogVGhleSBjYW5ub3QgYmUgbGlzdGVkIGluIHRyYW5zZmVyTGlzdC5cbiAgICogdmFsdWUgbWF5IHN0aWxsIGNvbnRhaW4gQXJyYXlCdWZmZXIgaW5zdGFuY2VzIHRoYXQgYXJlIG5vdCBpbiB0cmFuc2Zlckxpc3Q7XG4gICAqIGluIHRoYXQgY2FzZSwgdGhlIHVuZGVybHlpbmcgbWVtb3J5IGlzIGNvcGllZCByYXRoZXIgdGhhbiBtb3ZlZC5cbiAgICovXG4gIHRyYW5zZmVyTGlzdD86IFdvcmtlck9wdGlvbnNbJ3RyYW5zZmVyTGlzdCddO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tSZXN1bHQge1xuICB0cmFuc2Zlckxpc3Q/OiBXb3JrZXJPcHRpb25zWyd0cmFuc2Zlckxpc3QnXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kIHtcbiAgZXhpdDogYm9vbGVhbjtcbn1cblxuaWYgKHdvcmtlckRhdGEpIHtcbiAgdmVyYm9zZSA9ICEhKHdvcmtlckRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLnZlcmJvc2U7XG4gIGlmICgod29ya2VyRGF0YSBhcyBJbml0aWFsT3B0aW9ucykuaW5pdGlhbGl6ZXIpIHtcbiAgICBjb25zdCB7ZmlsZSwgZXhwb3J0Rm59ID0gKHdvcmtlckRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLmluaXRpYWxpemVyITtcbiAgICBpZiAoZXhwb3J0Rm4gPT0gbnVsbClcbiAgICAgIGluaXRpYWxEb25lID0gUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoZmlsZSkpO1xuICAgIGVsc2VcbiAgICAgIGluaXRpYWxEb25lID0gUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoZmlsZSlbZXhwb3J0Rm5dKCkpO1xuICB9IGVsc2Uge1xuICAgIGluaXRpYWxEb25lID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cbn1cblxuaWYgKCFpc01haW5UaHJlYWQpIHtcbiAgcGFyZW50UG9ydCEub24oJ21lc3NhZ2UnLCBleGVjdXRlT25FdmVudCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVPbkV2ZW50KGRhdGE6IFRhc2sgfCBDb21tYW5kKSB7XG4gIGlmICgoZGF0YSBhcyBDb21tYW5kKS5leGl0KSB7XG4gICAgaWYgKHZlcmJvc2UpXG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSB3b3JrZXIgJHt3b3JrZXJEYXRhPy5pZH0gZXhpdGApO1xuICAgIHBhcmVudFBvcnQhLm9mZignbWVzc2FnZScsIGV4ZWN1dGVPbkV2ZW50KTtcbiAgICAvLyBEb24ndCBjYWxsIHByb2Nlc3MuZXhpdCgwKSwgdGhlcmUgbWlnaHQgYmUgc29tZSB1bmZpbmlzaGVkIG91dHB1dCBzdHJlYW0gc3RpbGwgb24tZ29pbmcgYXQgdGhpcyBtb21lbnQuXG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IGluaXRpYWxEb25lO1xuICBpZiAodmVyYm9zZSkge1xuICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHdvcmtlciAke3dvcmtlckRhdGE/LmlkfSBydW5gKTtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKChkYXRhIGFzIFRhc2spLmZpbGUpWyhkYXRhIGFzIFRhc2spLmV4cG9ydEZuXShcbiAgICAgIC4uLigoZGF0YSBhcyBUYXNrKS5hcmdzIHx8IFtdKVxuICAgICAgKSk7XG5cbiAgICBpZiAodmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gd29ya2VyICR7d29ya2VyRGF0YT8uaWR9IHdhaXRgKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsICYmIChyZXN1bHQgYXMgVGFza1Jlc3VsdCkudHJhbnNmZXJMaXN0KSB7XG4gICAgICBjb25zdCB0cmFuc2Zlckxpc3QgPSAocmVzdWx0IGFzIFRhc2tSZXN1bHQpLnRyYW5zZmVyTGlzdDtcbiAgICAgIGRlbGV0ZSByZXN1bHQudHJhbnNmZXJMaXN0O1xuICAgICAgcGFyZW50UG9ydCEucG9zdE1lc3NhZ2UoeyB0eXBlOiAnd2FpdCcsIGRhdGE6IHJlc3VsdCB9LCB0cmFuc2Zlckxpc3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7IHR5cGU6ICd3YWl0JywgZGF0YTogcmVzdWx0IH0pO1xuICAgIH1cblxuICB9IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHdvcmtlciAke3dvcmtlckRhdGE/LmlkfSBlcnJvcmAsIGV4KTtcbiAgICB0cnkge1xuICAgICAgcGFyZW50UG9ydCEucG9zdE1lc3NhZ2Uoe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiBleC50b1N0cmluZygpXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgZGF0YTogZXJyLnRvU3RyaW5nKClcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19