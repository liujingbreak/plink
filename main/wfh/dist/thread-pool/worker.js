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
if (!worker_threads_1.isMainThread) {
    worker_threads_1.parentPort.on('message', executeOnEvent);
}
function executeOnEvent(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (data.exit) {
            process.exit(0);
            return;
        }
        yield Promise.resolve(require(data.file)[data.exportFn](...(data.args || [])));
        worker_threads_1.parentPort.postMessage('compelete');
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdGhyZWFkLXBvb2wvd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsbURBQXdEO0FBU3hELElBQUksQ0FBQyw2QkFBWSxFQUFFO0lBQ2pCLDJCQUFXLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztDQUMzQztBQUVELFNBQWUsY0FBYyxDQUFDLElBQWU7O1FBQzNDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEIsT0FBTztTQUNSO1FBQ0QsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRSwyQkFBVyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2lzTWFpblRocmVhZCwgcGFyZW50UG9ydH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2s8VD4ge1xuICBleGl0OiBib29sZWFuO1xuICBmaWxlOiBzdHJpbmc7XG4gIGV4cG9ydEZuOiBzdHJpbmc7XG4gIGFyZ3M/OiBhbnlbXTtcbn1cblxuaWYgKCFpc01haW5UaHJlYWQpIHtcbiAgcGFyZW50UG9ydCEub24oJ21lc3NhZ2UnLCBleGVjdXRlT25FdmVudCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVPbkV2ZW50KGRhdGE6IFRhc2s8YW55Pikge1xuICBpZiAoZGF0YS5leGl0KSB7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZShkYXRhLmZpbGUpW2RhdGEuZXhwb3J0Rm5dKC4uLihkYXRhLmFyZ3MgfHwgW10pKSk7XG4gIHBhcmVudFBvcnQhLnBvc3RNZXNzYWdlKCdjb21wZWxldGUnKTtcbn1cbiJdfQ==