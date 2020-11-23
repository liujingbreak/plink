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
const worker_threads_1 = require("worker_threads");
if (worker_threads_1.workerData) {
    executeOnEvent(worker_threads_1.workerData);
}
if (!worker_threads_1.isMainThread) {
    worker_threads_1.parentPort.on('message', executeOnEvent);
}
function executeOnEvent(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (data.exit) {
            process.exit(0);
            return;
        }
        try {
            const result = yield Promise.resolve(require(data.file)[data.exportFn](...(data.args || [])));
            if (result.transferList) {
                const transferList = result.transferList;
                delete result.transferList;
                worker_threads_1.parentPort.postMessage({ type: 'wait', data: result }, transferList);
            }
            else {
                worker_threads_1.parentPort.postMessage({ type: 'wait', data: result });
            }
        }
        catch (ex) {
            worker_threads_1.parentPort.postMessage({
                type: 'error',
                data: ex
            });
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdGhyZWFkLXBvb2wvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsbURBQW1GO0FBOEJuRixJQUFJLDJCQUFVLEVBQUU7SUFDZCxjQUFjLENBQUMsMkJBQVUsQ0FBQyxDQUFDO0NBQzVCO0FBRUQsSUFBSSxDQUFDLDZCQUFZLEVBQUU7SUFDakIsMkJBQVcsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0NBQzNDO0FBRUQsU0FBZSxjQUFjLENBQUMsSUFBb0I7O1FBQ2hELElBQUssSUFBZ0IsQ0FBQyxJQUFJLEVBQUU7WUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQixPQUFPO1NBQ1I7UUFDRCxJQUFJO1lBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBRSxJQUFhLENBQUMsSUFBSSxDQUFDLENBQUUsSUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUN4RixHQUFHLENBQUUsSUFBYSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUNoQyxDQUFDO1lBQ0YsSUFBSyxNQUFxQixDQUFDLFlBQVksRUFBRTtnQkFDdkMsTUFBTSxZQUFZLEdBQUksTUFBcUIsQ0FBQyxZQUFZLENBQUM7Z0JBQ3pELE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQztnQkFDM0IsMkJBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQzthQUN2RTtpQkFBTTtnQkFDTCwyQkFBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7YUFDekQ7U0FFRjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsMkJBQVcsQ0FBQyxXQUFXLENBQUM7Z0JBQ3RCLElBQUksRUFBRSxPQUFPO2dCQUNiLElBQUksRUFBRSxFQUFFO2FBQ1QsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2lzTWFpblRocmVhZCwgcGFyZW50UG9ydCwgd29ya2VyRGF0YSwgV29ya2VyT3B0aW9uc30gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBmaWxlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiByZXR1cm4gUHJvbWlzZSBvciBub24tUHJvbWlzZSB2YWx1ZVxuICAgKi9cbiAgZXhwb3J0Rm46IHN0cmluZztcbiAgYXJncz86IGFueVtdO1xuICAvKiogV29ya2VyIG1lc3NhZ2UgdHJhbnNmZXJMaXN0LCBzZWVcbiAgICogaHR0cHM6Ly9ub2RlanMub3JnL2RvY3MvbGF0ZXN0LXYxMi54L2FwaS93b3JrZXJfdGhyZWFkcy5odG1sI3dvcmtlcl90aHJlYWRzX3BvcnRfcG9zdG1lc3NhZ2VfdmFsdWVfdHJhbnNmZXJsaXN0XG4gICAqIG1heSBiZSBhIGxpc3Qgb2YgQXJyYXlCdWZmZXIsIE1lc3NhZ2VQb3J0IGFuZCBGaWxlSGFuZGxlIG9iamVjdHMuIEFmdGVyIHRyYW5zZmVycmluZywgXG4gICAqIHRoZXkgd2lsbCBub3QgYmUgdXNhYmxlIG9uIHRoZSBzZW5kaW5nIHNpZGUgb2YgdGhlIGNoYW5uZWwgYW55bW9yZSAoZXZlbiBpZiB0aGV5IGFyZSBub3QgY29udGFpbmVkIGluIHZhbHVlKS5cbiAgICogVW5saWtlIHdpdGggY2hpbGQgcHJvY2Vzc2VzLCB0cmFuc2ZlcnJpbmcgaGFuZGxlcyBzdWNoIGFzIG5ldHdvcmsgc29ja2V0cyBpcyBjdXJyZW50bHkgbm90IHN1cHBvcnRlZC5cbiAgICogSWYgdmFsdWUgY29udGFpbnMgU2hhcmVkQXJyYXlCdWZmZXIgaW5zdGFuY2VzLCB0aG9zZSB3aWxsIGJlIGFjY2Vzc2libGUgZnJvbSBlaXRoZXIgdGhyZWFkLiBcbiAgICogVGhleSBjYW5ub3QgYmUgbGlzdGVkIGluIHRyYW5zZmVyTGlzdC5cbiAgICogdmFsdWUgbWF5IHN0aWxsIGNvbnRhaW4gQXJyYXlCdWZmZXIgaW5zdGFuY2VzIHRoYXQgYXJlIG5vdCBpbiB0cmFuc2Zlckxpc3Q7XG4gICAqIGluIHRoYXQgY2FzZSwgdGhlIHVuZGVybHlpbmcgbWVtb3J5IGlzIGNvcGllZCByYXRoZXIgdGhhbiBtb3ZlZC5cbiAgICovXG4gIHRyYW5zZmVyTGlzdD86IFdvcmtlck9wdGlvbnNbJ3RyYW5zZmVyTGlzdCddO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tSZXN1bHQge1xuICB0cmFuc2Zlckxpc3Q/OiBXb3JrZXJPcHRpb25zWyd0cmFuc2Zlckxpc3QnXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kIHtcbiAgZXhpdDogYm9vbGVhbjtcbn1cblxuaWYgKHdvcmtlckRhdGEpIHtcbiAgZXhlY3V0ZU9uRXZlbnQod29ya2VyRGF0YSk7XG59XG5cbmlmICghaXNNYWluVGhyZWFkKSB7XG4gIHBhcmVudFBvcnQhLm9uKCdtZXNzYWdlJywgZXhlY3V0ZU9uRXZlbnQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlT25FdmVudChkYXRhOiBUYXNrIHwgQ29tbWFuZCkge1xuICBpZiAoKGRhdGEgYXMgQ29tbWFuZCkuZXhpdCkge1xuICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZSgoZGF0YSBhcyBUYXNrKS5maWxlKVsoZGF0YSBhcyBUYXNrKS5leHBvcnRGbl0oXG4gICAgICAuLi4oKGRhdGEgYXMgVGFzaykuYXJncyB8fCBbXSkpXG4gICAgKTtcbiAgICBpZiAoKHJlc3VsdCBhcyBUYXNrUmVzdWx0KS50cmFuc2Zlckxpc3QpIHtcbiAgICAgIGNvbnN0IHRyYW5zZmVyTGlzdCA9IChyZXN1bHQgYXMgVGFza1Jlc3VsdCkudHJhbnNmZXJMaXN0O1xuICAgICAgZGVsZXRlIHJlc3VsdC50cmFuc2Zlckxpc3Q7XG4gICAgICBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZSh7IHR5cGU6ICd3YWl0JywgZGF0YTogcmVzdWx0IH0sIHRyYW5zZmVyTGlzdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3dhaXQnLCBkYXRhOiByZXN1bHQgfSk7XG4gICAgfVxuXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcGFyZW50UG9ydCEucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIGRhdGE6IGV4XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==