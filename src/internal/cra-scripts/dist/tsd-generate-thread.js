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
        if (!worker_threads_1.isMainThread) {
            (0, bootstrap_process_1.initAsChildProcess)();
            (0, bootstrap_process_1.initConfig)(JSON.parse(process.env.PLINK_CLI_OPTS));
        }
        const { buildTsd } = require('./tsd-generate');
        yield buildTsd();
    });
})().catch(err => {
    if (worker_threads_1.parentPort)
        worker_threads_1.parentPort.postMessage(err);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNkLWdlbmVyYXRlLXRocmVhZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzZC1nZW5lcmF0ZS10aHJlYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxtREFBeUQ7QUFHekQsbUZBQTJGO0FBQzNGLENBQUM7O1FBQ0MsSUFBSSxDQUFDLDZCQUFZLEVBQUU7WUFDakIsSUFBQSxzQ0FBa0IsR0FBRSxDQUFDO1lBQ3JCLElBQUEsOEJBQVUsRUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBZSxDQUFDLENBQUMsQ0FBQztTQUNyRDtRQUNELE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQWtCLENBQUM7UUFDOUQsTUFBTSxRQUFRLEVBQUUsQ0FBQztJQUNuQixDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsSUFBSSwyQkFBVTtRQUNaLDJCQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyZW50UG9ydCwgaXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgKiBhcyB0c2RHZW4gZnJvbSAnLi90c2QtZ2VuZXJhdGUnO1xuXG5pbXBvcnQge2luaXRDb25maWcsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG4oYXN5bmMgZnVuY3Rpb24oKSB7XG4gIGlmICghaXNNYWluVGhyZWFkKSB7XG4gICAgaW5pdEFzQ2hpbGRQcm9jZXNzKCk7XG4gICAgaW5pdENvbmZpZyhKU09OLnBhcnNlKHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTISkpO1xuICB9XG4gIGNvbnN0IHtidWlsZFRzZH0gPSByZXF1aXJlKCcuL3RzZC1nZW5lcmF0ZScpIGFzIHR5cGVvZiB0c2RHZW47XG4gIGF3YWl0IGJ1aWxkVHNkKCk7XG59KSgpLmNhdGNoKGVyciA9PiB7XG4gIGlmIChwYXJlbnRQb3J0KVxuICAgIHBhcmVudFBvcnQucG9zdE1lc3NhZ2UoZXJyKTtcbn0pO1xuIl19