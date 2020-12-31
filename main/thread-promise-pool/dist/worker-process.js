"use strict";
// tslint:disable no-console
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
var verbose = false;
process.on('uncaughtException', function (err) {
    // log.error('Uncaught exception', err, err.stack);
    console.error("[thread-pool] pid:" + process.pid + " Uncaught exception: ", err);
    process.send({
        type: 'error',
        data: err.toString()
    });
});
process.on('unhandledRejection', function (err) {
    // log.warn('unhandledRejection', err);
    console.error("[thread-pool] pid:" + process.pid + " unhandledRejection", err);
    process.send({
        type: 'error',
        data: err ? err.toString() : err
    });
});
if (process.send) {
    process.on('message', executeOnEvent);
}
function executeOnEvent(data) {
    return __awaiter(this, void 0, void 0, function () {
        var result, initData, exportFn, exportFn, ex_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (data.exit) {
                        if (verbose)
                            console.log("[thread-pool] child process " + process.pid + " exit");
                        process.exit(0);
                        return [2 /*return*/];
                    }
                    if (data.verbose != null) {
                        verbose = !!data.verbose;
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 9, , 10]);
                    result = void 0;
                    initData = data;
                    if (!initData.initializer) return [3 /*break*/, 5];
                    if (verbose) {
                        console.log("[thread-pool] child process " + process.pid + " init");
                    }
                    exportFn = initData.initializer.exportFn;
                    if (!exportFn) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.resolve(require(initData.initializer.file)[exportFn]())];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    require(initData.initializer.file);
                    _b.label = 4;
                case 4: return [3 /*break*/, 8];
                case 5:
                    if (verbose) {
                        console.log("[thread-pool] child process " + process.pid + " run");
                    }
                    exportFn = data.exportFn;
                    if (!exportFn) return [3 /*break*/, 7];
                    return [4 /*yield*/, Promise.resolve((_a = require(data.file))[exportFn].apply(_a, (data.args || [])))];
                case 6:
                    result = _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    require(data.file);
                    _b.label = 8;
                case 8:
                    if (verbose) {
                        console.log("[thread-pool] child process " + process.pid + " wait");
                    }
                    process.send({ type: 'wait', data: result });
                    return [3 /*break*/, 10];
                case 9:
                    ex_1 = _b.sent();
                    console.log("[thread-pool] child process " + process.pid + " error", ex_1);
                    try {
                        process.send({
                            type: 'error',
                            data: ex_1.toString()
                        });
                    }
                    catch (err) {
                        process.send({
                            type: 'error',
                            data: err.toString()
                        });
                    }
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy93b3JrZXItcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNEJBQTRCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUU1QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFFcEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsbURBQW1EO0lBQ25ELE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXFCLE9BQU8sQ0FBQyxHQUFHLDBCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzVFLE9BQU8sQ0FBQyxJQUFLLENBQUM7UUFDWixJQUFJLEVBQUUsT0FBTztRQUNiLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO0tBQ3JCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxVQUFBLEdBQUc7SUFDbEMsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXFCLE9BQU8sQ0FBQyxHQUFHLHdCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFFLE9BQU8sQ0FBQyxJQUFLLENBQUM7UUFDWixJQUFJLEVBQUUsT0FBTztRQUNiLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRztLQUNqQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQXVCSCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDaEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7Q0FDdkM7QUFFRCxTQUFlLGNBQWMsQ0FBQyxJQUFvQjs7Ozs7OztvQkFDaEQsSUFBSyxJQUFnQixDQUFDLElBQUksRUFBRTt3QkFDMUIsSUFBSSxPQUFPOzRCQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQStCLE9BQU8sQ0FBQyxHQUFHLFVBQU8sQ0FBQyxDQUFDO3dCQUNqRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNoQixzQkFBTztxQkFDUjtvQkFFRCxJQUFLLElBQXVCLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTt3QkFDNUMsT0FBTyxHQUFHLENBQUMsQ0FBRSxJQUF1QixDQUFDLE9BQU8sQ0FBQztxQkFDOUM7Ozs7b0JBR0ssTUFBTSxTQUFLLENBQUM7b0JBQ1YsUUFBUSxHQUFHLElBQXNCLENBQUM7eUJBQ3BDLFFBQVEsQ0FBQyxXQUFXLEVBQXBCLHdCQUFvQjtvQkFDdEIsSUFBSSxPQUFPLEVBQUU7d0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBK0IsT0FBTyxDQUFDLEdBQUcsVUFBTyxDQUFDLENBQUM7cUJBQ2hFO29CQUNLLFFBQVEsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQzt5QkFDM0MsUUFBUSxFQUFSLHdCQUFRO29CQUNWLHFCQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFBOztvQkFBckUsU0FBcUUsQ0FBQzs7O29CQUV0RSxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7OztvQkFHckMsSUFBSSxPQUFPLEVBQUU7d0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBK0IsT0FBTyxDQUFDLEdBQUcsU0FBTSxDQUFDLENBQUM7cUJBQy9EO29CQUNLLFFBQVEsR0FBSSxJQUFhLENBQUMsUUFBUSxDQUFDO3lCQUVyQyxRQUFRLEVBQVIsd0JBQVE7b0JBQ0EscUJBQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBLEtBQUEsT0FBTyxDQUFFLElBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLFFBQVEsQ0FBQyxXQUNqRSxDQUFFLElBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLEVBQzVCLEVBQUE7O29CQUZKLE1BQU0sR0FBSSxTQUVOLENBQUM7OztvQkFFTCxPQUFPLENBQUUsSUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7b0JBSWpDLElBQUksT0FBTyxFQUFFO3dCQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQStCLE9BQU8sQ0FBQyxHQUFHLFVBQU8sQ0FBQyxDQUFDO3FCQUNoRTtvQkFDRCxPQUFPLENBQUMsSUFBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQzs7OztvQkFHOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBK0IsT0FBTyxDQUFDLEdBQUcsV0FBUSxFQUFFLElBQUUsQ0FBQyxDQUFDO29CQUNwRSxJQUFJO3dCQUNGLE9BQU8sQ0FBQyxJQUFLLENBQUM7NEJBQ1osSUFBSSxFQUFFLE9BQU87NEJBQ2IsSUFBSSxFQUFFLElBQUUsQ0FBQyxRQUFRLEVBQUU7eUJBQ3BCLENBQUMsQ0FBQztxQkFDSjtvQkFBQyxPQUFPLEdBQUcsRUFBRTt3QkFDWixPQUFPLENBQUMsSUFBSyxDQUFDOzRCQUNaLElBQUksRUFBRSxPQUFPOzRCQUNiLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO3lCQUNyQixDQUFDLENBQUM7cUJBQ0o7Ozs7OztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuXG5sZXQgdmVyYm9zZSA9IGZhbHNlO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICAvLyBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbicsIGVyciwgZXJyLnN0YWNrKTtcbiAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSBwaWQ6JHtwcm9jZXNzLnBpZH0gVW5jYXVnaHQgZXhjZXB0aW9uOiBgLCBlcnIpO1xuICBwcm9jZXNzLnNlbmQhKHtcbiAgICB0eXBlOiAnZXJyb3InLFxuICAgIGRhdGE6IGVyci50b1N0cmluZygpXG4gIH0pO1xufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVyciA9PiB7XG4gIC8vIGxvZy53YXJuKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xuICBjb25zb2xlLmVycm9yKGBbdGhyZWFkLXBvb2xdIHBpZDoke3Byb2Nlc3MucGlkfSB1bmhhbmRsZWRSZWplY3Rpb25gLCBlcnIpO1xuICBwcm9jZXNzLnNlbmQhKHtcbiAgICB0eXBlOiAnZXJyb3InLFxuICAgIGRhdGE6IGVyciA/IGVyci50b1N0cmluZygpIDogZXJyXG4gIH0pO1xufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5pdGlhbE9wdGlvbnMge1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgLyoqIEFmdGVyIHdvcmtlciBiZWluZyBjcmVhdGVkLCB0aGUgZXhwb3J0ZWQgZnVuY3Rpb24gd2lsbCBiZSBydW4sXG4gICAqIFlvdSBjYW4gcHV0IGFueSBpbml0aWFsIGxvZ2ljIGluIGl0LCBsaWtlIGNhbGxpbmcgYHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpYCBvclxuICAgKiBzZXR1cCBwcm9jZXNzIGV2ZW50IGhhbmRsaW5nIGZvciB1bmNhdWdodEV4Y2VwdGlvbiBhbmQgdW5oYW5kbGVkUmVqZWN0aW9uLlxuICAgKi9cbiAgaW5pdGlhbGl6ZXI/OiB7ZmlsZTogc3RyaW5nOyBleHBvcnRGbj86IHN0cmluZ307XG59XG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBmaWxlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiByZXR1cm4gUHJvbWlzZSBvciBub24tUHJvbWlzZSB2YWx1ZVxuICAgKi9cbiAgZXhwb3J0Rm4/OiBzdHJpbmc7XG4gIGFyZ3M/OiBhbnlbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kIHtcbiAgZXhpdDogYm9vbGVhbjtcbn1cblxuaWYgKHByb2Nlc3Muc2VuZCkge1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZXhlY3V0ZU9uRXZlbnQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlT25FdmVudChkYXRhOiBUYXNrIHwgQ29tbWFuZCkge1xuICBpZiAoKGRhdGEgYXMgQ29tbWFuZCkuZXhpdCkge1xuICAgIGlmICh2ZXJib3NlKVxuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBleGl0YCk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICgoZGF0YSBhcyBJbml0aWFsT3B0aW9ucykudmVyYm9zZSAhPSBudWxsKSB7XG4gICAgdmVyYm9zZSA9ICEhKGRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLnZlcmJvc2U7XG4gIH1cblxuICB0cnkge1xuICAgIGxldCByZXN1bHQ6IGFueTtcbiAgICBjb25zdCBpbml0RGF0YSA9IGRhdGEgYXMgSW5pdGlhbE9wdGlvbnM7XG4gICAgaWYgKGluaXREYXRhLmluaXRpYWxpemVyKSB7XG4gICAgICBpZiAodmVyYm9zZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBjaGlsZCBwcm9jZXNzICR7cHJvY2Vzcy5waWR9IGluaXRgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGV4cG9ydEZuID0gaW5pdERhdGEuaW5pdGlhbGl6ZXIuZXhwb3J0Rm47XG4gICAgICBpZiAoZXhwb3J0Rm4pIHtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoaW5pdERhdGEuaW5pdGlhbGl6ZXIuZmlsZSlbZXhwb3J0Rm5dKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWlyZShpbml0RGF0YS5pbml0aWFsaXplci5maWxlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBydW5gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGV4cG9ydEZuID0gKGRhdGEgYXMgVGFzaykuZXhwb3J0Rm47XG5cbiAgICAgIGlmIChleHBvcnRGbikge1xuICAgICAgICByZXN1bHQgPSAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoKGRhdGEgYXMgVGFzaykuZmlsZSlbZXhwb3J0Rm5dKFxuICAgICAgICAgIC4uLigoZGF0YSBhcyBUYXNrKS5hcmdzIHx8IFtdKVxuICAgICAgICAgICkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWlyZSgoZGF0YSBhcyBUYXNrKS5maWxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSB3YWl0YCk7XG4gICAgfVxuICAgIHByb2Nlc3Muc2VuZCEoeyB0eXBlOiAnd2FpdCcsIGRhdGE6IHJlc3VsdCB9KTtcblxuICB9IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gZXJyb3JgLCBleCk7XG4gICAgdHJ5IHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiBleC50b1N0cmluZygpXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiBlcnIudG9TdHJpbmcoKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iXX0=