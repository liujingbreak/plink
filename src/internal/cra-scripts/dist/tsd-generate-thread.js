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
        bootstrap_process_1.initAsChildProcess();
        bootstrap_process_1.initConfig({ config: [], prop: [] });
        const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
        yield tsc(worker_threads_1.workerData);
    });
})().catch(err => worker_threads_1.parentPort.postMessage(err));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNkLWdlbmVyYXRlLXRocmVhZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRzZC1nZW5lcmF0ZS10aHJlYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSxtREFBdUQ7QUFHdkQsbUZBQTJGO0FBRTNGLENBQUM7O1FBQ0Msc0NBQWtCLEVBQUUsQ0FBQztRQUNyQiw4QkFBVSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFrQixDQUFDO1FBQ3JFLE1BQU0sR0FBRyxDQUFDLDJCQUFnQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUFBLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLDJCQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB3b3JrZXJEYXRhLCBwYXJlbnRQb3J0fSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgKiBhcyBfdHNjbWQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnO1xuXG5pbXBvcnQge2luaXRDb25maWcsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5cbihhc3luYyBmdW5jdGlvbigpIHtcbiAgaW5pdEFzQ2hpbGRQcm9jZXNzKCk7XG4gIGluaXRDb25maWcoe2NvbmZpZzogW10sIHByb3A6IFtdfSk7XG4gIGNvbnN0IHt0c2N9ID0gcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnKSBhcyB0eXBlb2YgX3RzY21kO1xuICBhd2FpdCB0c2Mod29ya2VyRGF0YSBhcyBfdHNjbWQuVHNjQ21kUGFyYW0pO1xufSkoKS5jYXRjaChlcnIgPT4gcGFyZW50UG9ydCEucG9zdE1lc3NhZ2UoZXJyKSk7XG4iXX0=