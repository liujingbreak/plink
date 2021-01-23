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
const bootstrap_process_1 = require("@wfh/plink/wfh/dist/utils/bootstrap-process");
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        bootstrap_process_1.initProcess();
        bootstrap_process_1.initConfig({ config: [], prop: [] });
        const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
        yield tsc(worker_threads_1.workerData);
    });
})().catch(err => worker_threads_1.parentPort.postMessage(err));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNkLWdlbmVyYXRlLXRocmVhZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzZC1nZW5lcmF0ZS10aHJlYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxtREFBdUQ7QUFHdkQsbUZBQW9GO0FBRXBGLENBQUM7O1FBQ0MsK0JBQVcsRUFBRSxDQUFDO1FBQ2QsOEJBQVUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBa0IsQ0FBQztRQUNyRSxNQUFNLEdBQUcsQ0FBQywyQkFBZ0MsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FBQSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQywyQkFBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgd29ya2VyRGF0YSwgcGFyZW50UG9ydH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0ICogYXMgX3RzY21kIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJztcblxuaW1wb3J0IHtpbml0Q29uZmlnLCBpbml0UHJvY2Vzc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5cbihhc3luYyBmdW5jdGlvbigpIHtcbiAgaW5pdFByb2Nlc3MoKTtcbiAgaW5pdENvbmZpZyh7Y29uZmlnOiBbXSwgcHJvcDogW119KTtcbiAgY29uc3Qge3RzY30gPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCcpIGFzIHR5cGVvZiBfdHNjbWQ7XG4gIGF3YWl0IHRzYyh3b3JrZXJEYXRhIGFzIF90c2NtZC5Uc2NDbWRQYXJhbSk7XG59KSgpLmNhdGNoKGVyciA9PiBwYXJlbnRQb3J0IS5wb3N0TWVzc2FnZShlcnIpKTtcbiJdfQ==