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
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const worker_threads_1 = require("worker_threads");
let verbose = false;
let initialDone = Promise.resolve();
if (worker_threads_1.workerData) {
    verbose = !!worker_threads_1.workerData.verbose;
    if (worker_threads_1.workerData.initializer) {
        const { file, exportFn } = worker_threads_1.workerData.initializer;
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
    return __awaiter(this, void 0, void 0, function* () {
        if (data.exit) {
            if (verbose)
                console.log(`[thread-pool] worker ${worker_threads_1.workerData.id} exit`);
            process.exit(0);
            return;
        }
        yield initialDone;
        if (verbose) {
            console.log(`[thread-pool] worker ${worker_threads_1.workerData.id} run`);
        }
        try {
            const result = yield Promise.resolve(require(data.file)[data.exportFn](...(data.args || [])));
            if (verbose) {
                console.log(`[thread-pool] worker ${worker_threads_1.workerData.id} wait`);
            }
            if (result != null && result.transferList) {
                const transferList = result.transferList;
                delete result.transferList;
                worker_threads_1.parentPort.postMessage({ type: 'wait', data: result }, transferList);
            }
            else {
                worker_threads_1.parentPort.postMessage({ type: 'wait', data: result });
            }
        }
        catch (ex) {
            console.log(`[thread-pool] worker ${worker_threads_1.workerData.id} error`, ex);
            try {
                worker_threads_1.parentPort.postMessage({
                    type: 'error',
                    data: ex.toString()
                });
            }
            catch (err) {
                worker_threads_1.parentPort.postMessage({
                    type: 'error',
                    data: err.toString()
                });
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLG1EQUFtRjtBQUVuRixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDcEIsSUFBSSxXQUFXLEdBQWlCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQXdEbEQsSUFBSSwyQkFBVSxFQUFFO0lBQ2QsT0FBTyxHQUFHLENBQUMsQ0FBRSwyQkFBNkIsQ0FBQyxPQUFPLENBQUM7SUFDbkQsSUFBSywyQkFBNkIsQ0FBQyxXQUFXLEVBQUU7UUFDOUMsTUFBTSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsR0FBSSwyQkFBNkIsQ0FBQyxXQUFZLENBQUM7UUFDckUsSUFBSSxRQUFRLElBQUksSUFBSTtZQUNsQixXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs7WUFFN0MsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUM1RDtTQUFNO1FBQ0wsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztLQUNqQztDQUNGO0FBRUQsSUFBSSxDQUFDLDZCQUFZLEVBQUU7SUFDakIsMkJBQVcsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0NBQzNDO0FBRUQsU0FBZSxjQUFjLENBQUMsSUFBb0I7O1FBQ2hELElBQUssSUFBZ0IsQ0FBQyxJQUFJLEVBQUU7WUFDMUIsSUFBSSxPQUFPO2dCQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLDJCQUFVLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM1RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU87U0FDUjtRQUNELE1BQU0sV0FBVyxDQUFDO1FBQ2xCLElBQUksT0FBTyxFQUFFO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsMkJBQVUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzFEO1FBQ0QsSUFBSTtZQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUUsSUFBYSxDQUFDLElBQUksQ0FBQyxDQUFFLElBQWEsQ0FBQyxRQUFRLENBQUMsQ0FDeEYsR0FBRyxDQUFFLElBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQzdCLENBQUMsQ0FBQztZQUVMLElBQUksT0FBTyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLDJCQUFVLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUMzRDtZQUNELElBQUksTUFBTSxJQUFJLElBQUksSUFBSyxNQUFxQixDQUFDLFlBQVksRUFBRTtnQkFDekQsTUFBTSxZQUFZLEdBQUksTUFBcUIsQ0FBQyxZQUFZLENBQUM7Z0JBQ3pELE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQztnQkFDM0IsMkJBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQzthQUN2RTtpQkFBTTtnQkFDTCwyQkFBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDekQ7U0FFRjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsMkJBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMvRCxJQUFJO2dCQUNGLDJCQUFXLENBQUMsV0FBVyxDQUFDO29CQUN0QixJQUFJLEVBQUUsT0FBTztvQkFDYixJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRTtpQkFDcEIsQ0FBQyxDQUFDO2FBQ0o7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWiwyQkFBVyxDQUFDLFdBQVcsQ0FBQztvQkFDdEIsSUFBSSxFQUFFLE9BQU87b0JBQ2IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUU7aUJBQ3JCLENBQUMsQ0FBQzthQUNKO1NBQ0Y7SUFDSCxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQge2lzTWFpblRocmVhZCwgcGFyZW50UG9ydCwgd29ya2VyRGF0YSwgV29ya2VyT3B0aW9uc30gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5sZXQgdmVyYm9zZSA9IGZhbHNlO1xubGV0IGluaXRpYWxEb25lOiBQcm9taXNlPGFueT4gPSBQcm9taXNlLnJlc29sdmUoKTtcblxuLy8gcHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcbi8vICAgLy8gbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb24nLCBlcnIsIGVyci5zdGFjayk7XG4vLyAgIGNvbnNvbGUuZXJyb3IoYFt0aHJlYWQtcG9vbF0gd29ya2VyIHBpZDoke3dvcmtlckRhdGEuaWR9IFVuY2F1Z2h0IGV4Y2VwdGlvbjogYCwgZXJyKTtcbi8vICAgcGFyZW50UG9ydCEucG9zdE1lc3NhZ2Uoe1xuLy8gICAgIHR5cGU6ICdlcnJvcicsXG4vLyAgICAgZGF0YTogZXJyLnRvU3RyaW5nKClcbi8vICAgfSk7XG4vLyB9KTtcblxuLy8gcHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbi8vICAgLy8gbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4vLyAgIGNvbnNvbGUuZXJyb3IoYFt0aHJlYWQtcG9vbF0gd29ya2VyIHBpZDoke3dvcmtlckRhdGEuaWR9IHVuaGFuZGxlZFJlamVjdGlvbmAsIGVycik7XG4vLyAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHtcbi8vICAgICB0eXBlOiAnZXJyb3InLFxuLy8gICAgIGRhdGE6IGVyciA/IGVyci50b1N0cmluZygpIDogZXJyXG4vLyAgIH0pO1xuLy8gfSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5pdGlhbE9wdGlvbnMge1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgLyoqIEFmdGVyIHdvcmtlciBiZWluZyBjcmVhdGVkLCB0aGUgZXhwb3J0ZWQgZnVuY3Rpb24gd2lsbCBiZSBydW4sXG4gICAqIFlvdSBjYW4gcHV0IGFueSBpbml0aWFsIGxvZ2ljIGluIGl0LCBsaWtlIGNhbGxpbmcgYHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpYCBvclxuICAgKiBzZXR1cCBwcm9jZXNzIGV2ZW50IGhhbmRsaW5nIGZvciB1bmNhdWdodEV4Y2VwdGlvbiBhbmQgdW5oYW5kbGVkUmVqZWN0aW9uLlxuICAgKi9cbiAgaW5pdGlhbGl6ZXI/OiB7ZmlsZTogc3RyaW5nOyBleHBvcnRGbj86IHN0cmluZ307XG59XG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBmaWxlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiByZXR1cm4gUHJvbWlzZSBvciBub24tUHJvbWlzZSB2YWx1ZVxuICAgKi9cbiAgZXhwb3J0Rm46IHN0cmluZztcbiAgYXJncz86IGFueVtdO1xuICAvKiogV29ya2VyIG1lc3NhZ2UgdHJhbnNmZXJMaXN0LCBzZWVcbiAgICogaHR0cHM6Ly9ub2RlanMub3JnL2RvY3MvbGF0ZXN0LXYxMi54L2FwaS93b3JrZXJfdGhyZWFkcy5odG1sI3dvcmtlcl90aHJlYWRzX3BvcnRfcG9zdG1lc3NhZ2VfdmFsdWVfdHJhbnNmZXJsaXN0XG4gICAqIG1heSBiZSBhIGxpc3Qgb2YgQXJyYXlCdWZmZXIsIE1lc3NhZ2VQb3J0IGFuZCBGaWxlSGFuZGxlIG9iamVjdHMuIEFmdGVyIHRyYW5zZmVycmluZywgXG4gICAqIHRoZXkgd2lsbCBub3QgYmUgdXNhYmxlIG9uIHRoZSBzZW5kaW5nIHNpZGUgb2YgdGhlIGNoYW5uZWwgYW55bW9yZSAoZXZlbiBpZiB0aGV5IGFyZSBub3QgY29udGFpbmVkIGluIHZhbHVlKS5cbiAgICogVW5saWtlIHdpdGggY2hpbGQgcHJvY2Vzc2VzLCB0cmFuc2ZlcnJpbmcgaGFuZGxlcyBzdWNoIGFzIG5ldHdvcmsgc29ja2V0cyBpcyBjdXJyZW50bHkgbm90IHN1cHBvcnRlZC5cbiAgICogSWYgdmFsdWUgY29udGFpbnMgU2hhcmVkQXJyYXlCdWZmZXIgaW5zdGFuY2VzLCB0aG9zZSB3aWxsIGJlIGFjY2Vzc2libGUgZnJvbSBlaXRoZXIgdGhyZWFkLiBcbiAgICogVGhleSBjYW5ub3QgYmUgbGlzdGVkIGluIHRyYW5zZmVyTGlzdC5cbiAgICogdmFsdWUgbWF5IHN0aWxsIGNvbnRhaW4gQXJyYXlCdWZmZXIgaW5zdGFuY2VzIHRoYXQgYXJlIG5vdCBpbiB0cmFuc2Zlckxpc3Q7XG4gICAqIGluIHRoYXQgY2FzZSwgdGhlIHVuZGVybHlpbmcgbWVtb3J5IGlzIGNvcGllZCByYXRoZXIgdGhhbiBtb3ZlZC5cbiAgICovXG4gIHRyYW5zZmVyTGlzdD86IFdvcmtlck9wdGlvbnNbJ3RyYW5zZmVyTGlzdCddO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tSZXN1bHQge1xuICB0cmFuc2Zlckxpc3Q/OiBXb3JrZXJPcHRpb25zWyd0cmFuc2Zlckxpc3QnXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kIHtcbiAgZXhpdDogYm9vbGVhbjtcbn1cblxuaWYgKHdvcmtlckRhdGEpIHtcbiAgdmVyYm9zZSA9ICEhKHdvcmtlckRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLnZlcmJvc2U7XG4gIGlmICgod29ya2VyRGF0YSBhcyBJbml0aWFsT3B0aW9ucykuaW5pdGlhbGl6ZXIpIHtcbiAgICBjb25zdCB7ZmlsZSwgZXhwb3J0Rm59ID0gKHdvcmtlckRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLmluaXRpYWxpemVyITtcbiAgICBpZiAoZXhwb3J0Rm4gPT0gbnVsbClcbiAgICAgIGluaXRpYWxEb25lID0gUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoZmlsZSkpO1xuICAgIGVsc2VcbiAgICAgIGluaXRpYWxEb25lID0gUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoZmlsZSlbZXhwb3J0Rm5dKCkpO1xuICB9IGVsc2Uge1xuICAgIGluaXRpYWxEb25lID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cbn1cblxuaWYgKCFpc01haW5UaHJlYWQpIHtcbiAgcGFyZW50UG9ydCEub24oJ21lc3NhZ2UnLCBleGVjdXRlT25FdmVudCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVPbkV2ZW50KGRhdGE6IFRhc2sgfCBDb21tYW5kKSB7XG4gIGlmICgoZGF0YSBhcyBDb21tYW5kKS5leGl0KSB7XG4gICAgaWYgKHZlcmJvc2UpXG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSB3b3JrZXIgJHt3b3JrZXJEYXRhLmlkfSBleGl0YCk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBpbml0aWFsRG9uZTtcbiAgaWYgKHZlcmJvc2UpIHtcbiAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSB3b3JrZXIgJHt3b3JrZXJEYXRhLmlkfSBydW5gKTtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKChkYXRhIGFzIFRhc2spLmZpbGUpWyhkYXRhIGFzIFRhc2spLmV4cG9ydEZuXShcbiAgICAgIC4uLigoZGF0YSBhcyBUYXNrKS5hcmdzIHx8IFtdKVxuICAgICAgKSk7XG5cbiAgICBpZiAodmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gd29ya2VyICR7d29ya2VyRGF0YS5pZH0gd2FpdGApO1xuICAgIH1cbiAgICBpZiAocmVzdWx0ICE9IG51bGwgJiYgKHJlc3VsdCBhcyBUYXNrUmVzdWx0KS50cmFuc2Zlckxpc3QpIHtcbiAgICAgIGNvbnN0IHRyYW5zZmVyTGlzdCA9IChyZXN1bHQgYXMgVGFza1Jlc3VsdCkudHJhbnNmZXJMaXN0O1xuICAgICAgZGVsZXRlIHJlc3VsdC50cmFuc2Zlckxpc3Q7XG4gICAgICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7IHR5cGU6ICd3YWl0JywgZGF0YTogcmVzdWx0IH0sIHRyYW5zZmVyTGlzdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3dhaXQnLCBkYXRhOiByZXN1bHQgfSk7XG4gICAgfVxuXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gd29ya2VyICR7d29ya2VyRGF0YS5pZH0gZXJyb3JgLCBleCk7XG4gICAgdHJ5IHtcbiAgICAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgZGF0YTogZXgudG9TdHJpbmcoKVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIGRhdGE6IGVyci50b1N0cmluZygpXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==