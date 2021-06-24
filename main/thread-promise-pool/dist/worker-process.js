"use strict";
/* eslint-disable no-console */
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
function sendMsg(msg) {
    return process.send(msg, null, {}, function (err) {
        if (err)
            console.error("[thread-pool] pid:" + process.pid + " failed to send Error message: ", msg, err);
    });
}
process.on('uncaughtException', onUncaughtException);
// let doNotSendToParent = false;
function onUncaughtException(err) {
    // log.error('Uncaught exception', err, err.stack);
    console.error("[thread-pool] pid:" + process.pid + " Uncaught exception: ", err);
    sendMsg({
        type: 'error',
        data: err.toString()
    });
}
process.on('unhandledRejection', onUnhandledRejection);
function onUnhandledRejection(err) {
    console.error("[thread-pool] pid:" + process.pid + " unhandledRejection", err);
    sendMsg({
        type: 'error',
        data: err ? err.toString() : err
    });
}
if (process.send) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
                        // eslint-disable-next-line @typescript-eslint/no-misused-promises
                        process.off('message', executeOnEvent);
                        // process.off('uncaughtException', onUncaughtException);
                        // process.off('unhandledRejection', onUnhandledRejection);
                        // setImmediate(() => process.exit(0));
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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                    return [4 /*yield*/, Promise.resolve(require(initData.initializer.file)[exportFn]())];
                case 2:
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                    result = _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    require(data.file);
                    _b.label = 8;
                case 8:
                    if (verbose) {
                        console.log("[thread-pool] child process " + process.pid + " wait");
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    sendMsg({ type: 'wait', data: result });
                    return [3 /*break*/, 10];
                case 9:
                    ex_1 = _b.sent();
                    console.log("[thread-pool] child process " + process.pid + " error", ex_1);
                    try {
                        sendMsg({
                            type: 'error',
                            data: ex_1.toString()
                        });
                    }
                    catch (err) {
                        sendMsg({
                            type: 'error',
                            data: ex_1.toString()
                        });
                    }
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy93b3JrZXItcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsK0JBQStCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUUvQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFFcEIsU0FBUyxPQUFPLENBQUMsR0FBUTtJQUN2QixPQUFPLE9BQU8sQ0FBQyxJQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsVUFBQSxHQUFHO1FBQ3JDLElBQUksR0FBRztZQUNMLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXFCLE9BQU8sQ0FBQyxHQUFHLG9DQUFpQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMvRixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxPQUFPLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLENBQUM7QUFFckQsaUNBQWlDO0FBQ2pDLFNBQVMsbUJBQW1CLENBQUMsR0FBUTtJQUNuQyxtREFBbUQ7SUFDbkQsT0FBTyxDQUFDLEtBQUssQ0FBQyx1QkFBcUIsT0FBTyxDQUFDLEdBQUcsMEJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDNUUsT0FBTyxDQUFDO1FBQ04sSUFBSSxFQUFFLE9BQU87UUFDYixJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRTtLQUNyQixDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBRXZELFNBQVMsb0JBQW9CLENBQUMsR0FBUTtJQUNwQyxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUFxQixPQUFPLENBQUMsR0FBRyx3QkFBcUIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxRSxPQUFPLENBQUM7UUFDTixJQUFJLEVBQUUsT0FBTztR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QUM7NEJBQ04sSUFBSSxFQUFFLE9BQU87NEJBQ2IsSUFBSSxFQUFHLElBQVksQ0FBQyxRQUFRLEVBQUU7eUJBQy9CLENBQUMsQ0FBQztxQkFDSjs7Ozs7O0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5cbmxldCB2ZXJib3NlID0gZmFsc2U7XG5cbmZ1bmN0aW9uIHNlbmRNc2cobXNnOiBhbnkpIHtcbiAgcmV0dXJuIHByb2Nlc3Muc2VuZCEobXNnLCBudWxsLCB7fSwgZXJyID0+IHtcbiAgICBpZiAoZXJyKVxuICAgICAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSBwaWQ6JHtwcm9jZXNzLnBpZH0gZmFpbGVkIHRvIHNlbmQgRXJyb3IgbWVzc2FnZTogYCwgbXNnLCBlcnIpO1xuICB9KTtcbn1cblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBvblVuY2F1Z2h0RXhjZXB0aW9uKTtcblxuLy8gbGV0IGRvTm90U2VuZFRvUGFyZW50ID0gZmFsc2U7XG5mdW5jdGlvbiBvblVuY2F1Z2h0RXhjZXB0aW9uKGVycjogYW55KSB7XG4gIC8vIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uJywgZXJyLCBlcnIuc3RhY2spO1xuICBjb25zb2xlLmVycm9yKGBbdGhyZWFkLXBvb2xdIHBpZDoke3Byb2Nlc3MucGlkfSBVbmNhdWdodCBleGNlcHRpb246IGAsIGVycik7XG4gIHNlbmRNc2coe1xuICAgIHR5cGU6ICdlcnJvcicsXG4gICAgZGF0YTogZXJyLnRvU3RyaW5nKClcbiAgfSk7XG59XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIG9uVW5oYW5kbGVkUmVqZWN0aW9uKTtcblxuZnVuY3Rpb24gb25VbmhhbmRsZWRSZWplY3Rpb24oZXJyOiBhbnkpIHtcbiAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSBwaWQ6JHtwcm9jZXNzLnBpZH0gdW5oYW5kbGVkUmVqZWN0aW9uYCwgZXJyKTtcbiAgc2VuZE1zZyh7XG4gICAgdHlwZTogJ2Vycm9yJyxcbiAgICBkYXRhOiBlcnIgPyBlcnIudG9TdHJpbmcoKSA6IGVyclxuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbml0aWFsT3B0aW9ucyB7XG4gIHZlcmJvc2U/OiBib29sZWFuO1xuICAvKiogQWZ0ZXIgd29ya2VyIGJlaW5nIGNyZWF0ZWQsIHRoZSBleHBvcnRlZCBmdW5jdGlvbiB3aWxsIGJlIHJ1bixcbiAgICogWW91IGNhbiBwdXQgYW55IGluaXRpYWwgbG9naWMgaW4gaXQsIGxpa2UgY2FsbGluZyBgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJylgIG9yXG4gICAqIHNldHVwIHByb2Nlc3MgZXZlbnQgaGFuZGxpbmcgZm9yIHVuY2F1Z2h0RXhjZXB0aW9uIGFuZCB1bmhhbmRsZWRSZWplY3Rpb24uXG4gICAqL1xuICBpbml0aWFsaXplcj86IHtmaWxlOiBzdHJpbmc7IGV4cG9ydEZuPzogc3RyaW5nfTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGFzayB7XG4gIGZpbGU6IHN0cmluZztcbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2hpY2ggY2FuIHJldHVybiBQcm9taXNlIG9yIG5vbi1Qcm9taXNlIHZhbHVlXG4gICAqL1xuICBleHBvcnRGbj86IHN0cmluZztcbiAgYXJncz86IGFueVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmQge1xuICBleGl0OiBib29sZWFuO1xufVxuXG5pZiAocHJvY2Vzcy5zZW5kKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1wcm9taXNlc1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZXhlY3V0ZU9uRXZlbnQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlT25FdmVudChkYXRhOiBUYXNrIHwgQ29tbWFuZCkge1xuICBpZiAoKGRhdGEgYXMgQ29tbWFuZCkuZXhpdCkge1xuICAgIGlmICh2ZXJib3NlKVxuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBleGl0YCk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1taXN1c2VkLXByb21pc2VzXG4gICAgcHJvY2Vzcy5vZmYoJ21lc3NhZ2UnLCBleGVjdXRlT25FdmVudCk7XG4gICAgLy8gcHJvY2Vzcy5vZmYoJ3VuY2F1Z2h0RXhjZXB0aW9uJywgb25VbmNhdWdodEV4Y2VwdGlvbik7XG4gICAgLy8gcHJvY2Vzcy5vZmYoJ3VuaGFuZGxlZFJlamVjdGlvbicsIG9uVW5oYW5kbGVkUmVqZWN0aW9uKTtcbiAgICAvLyBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoKGRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLnZlcmJvc2UgIT0gbnVsbCkge1xuICAgIHZlcmJvc2UgPSAhIShkYXRhIGFzIEluaXRpYWxPcHRpb25zKS52ZXJib3NlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBsZXQgcmVzdWx0OiBhbnk7XG4gICAgY29uc3QgaW5pdERhdGEgPSBkYXRhIGFzIEluaXRpYWxPcHRpb25zO1xuICAgIGlmIChpbml0RGF0YS5pbml0aWFsaXplcikge1xuICAgICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBpbml0YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBleHBvcnRGbiA9IGluaXREYXRhLmluaXRpYWxpemVyLmV4cG9ydEZuO1xuICAgICAgaWYgKGV4cG9ydEZuKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGwsQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKGluaXREYXRhLmluaXRpYWxpemVyLmZpbGUpW2V4cG9ydEZuXSgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcXVpcmUoaW5pdERhdGEuaW5pdGlhbGl6ZXIuZmlsZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gcnVuYCk7XG4gICAgICB9XG4gICAgICBjb25zdCBleHBvcnRGbiA9IChkYXRhIGFzIFRhc2spLmV4cG9ydEZuO1xuXG4gICAgICBpZiAoZXhwb3J0Rm4pIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCxAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGwsQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgIHJlc3VsdCA9ICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZSgoZGF0YSBhcyBUYXNrKS5maWxlKVtleHBvcnRGbl0oXG4gICAgICAgICAgLi4uKChkYXRhIGFzIFRhc2spLmFyZ3MgfHwgW10pXG4gICAgICAgICAgKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1aXJlKChkYXRhIGFzIFRhc2spLmZpbGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBjaGlsZCBwcm9jZXNzICR7cHJvY2Vzcy5waWR9IHdhaXRgKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIHNlbmRNc2coeyB0eXBlOiAnd2FpdCcsIGRhdGE6IHJlc3VsdCB9KTtcblxuICB9IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gZXJyb3JgLCBleCk7XG4gICAgdHJ5IHtcbiAgICAgIHNlbmRNc2coe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiAoZXggYXMgRXJyb3IpLnRvU3RyaW5nKClcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc2VuZE1zZyh7XG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIGRhdGE6IChleCBhcyBFcnJvcikudG9TdHJpbmcoKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iXX0=