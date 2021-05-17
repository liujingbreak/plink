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
const tsd_generate_1 = require("./tsd-generate");
const bootstrap_process_1 = require("@wfh/plink/wfh/dist/utils/bootstrap-process");
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log(process.env);
        if (!worker_threads_1.isMainThread) {
            bootstrap_process_1.initAsChildProcess();
            bootstrap_process_1.initConfig(JSON.parse(process.env.PLINK_CLI_OPTS));
        }
        yield tsd_generate_1.buildTsd();
    });
})().catch(err => {
    if (worker_threads_1.parentPort)
        worker_threads_1.parentPort.postMessage(err);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNkLWdlbmVyYXRlLXRocmVhZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzZC1nZW5lcmF0ZS10aHJlYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxtREFBeUQ7QUFFekQsaURBQXdDO0FBRXhDLG1GQUEyRjtBQUMzRixDQUFDOztRQUNDLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsNkJBQVksRUFBRTtZQUNqQixzQ0FBa0IsRUFBRSxDQUFDO1lBQ3JCLDhCQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWUsQ0FBQyxDQUFDLENBQUM7U0FDckQ7UUFDRCxNQUFNLHVCQUFRLEVBQUUsQ0FBQztJQUNuQixDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsSUFBSSwyQkFBVTtRQUNaLDJCQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyZW50UG9ydCwgaXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgKiBhcyBfdHNjbWQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnO1xuaW1wb3J0IHtidWlsZFRzZH0gZnJvbSAnLi90c2QtZ2VuZXJhdGUnO1xuXG5pbXBvcnQge2luaXRDb25maWcsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG4oYXN5bmMgZnVuY3Rpb24oKSB7XG4gIC8vIGNvbnNvbGUubG9nKHByb2Nlc3MuZW52KTtcbiAgaWYgKCFpc01haW5UaHJlYWQpIHtcbiAgICBpbml0QXNDaGlsZFByb2Nlc3MoKTtcbiAgICBpbml0Q29uZmlnKEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKSk7XG4gIH1cbiAgYXdhaXQgYnVpbGRUc2QoKTtcbn0pKCkuY2F0Y2goZXJyID0+IHtcbiAgaWYgKHBhcmVudFBvcnQpXG4gICAgcGFyZW50UG9ydC5wb3N0TWVzc2FnZShlcnIpO1xufSk7XG4iXX0=