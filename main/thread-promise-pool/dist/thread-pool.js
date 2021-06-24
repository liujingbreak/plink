"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pool = void 0;
// tslint:disable no-console
var worker_threads_1 = require("worker_threads");
var child_process_1 = require("child_process");
var os_1 = __importDefault(require("os"));
var PromisedTask = /** @class */ (function () {
    function PromisedTask(task, verbose) {
        var _this = this;
        if (verbose === void 0) { verbose = false; }
        this.task = task;
        this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    }
    PromisedTask.prototype.runByWorker = function (worker) {
        var _this = this;
        var onMessage = function (msg) {
            if (msg.type === 'wait') {
                unsubscribeWorker();
                _this.resolve(msg.data);
            }
            else if (msg.type === 'error') {
                unsubscribeWorker();
                _this.reject(msg.data);
            }
        };
        var onExit = function (code) {
            // if (this.verbose) {
            // console.log('[thread-pool] PromisedTask on exit');
            // }
            unsubscribeWorker();
            if (code !== 0) {
                _this.reject("Thread " + worker.threadId + " exist with code " + code);
            }
        };
        var unsubscribeWorker = function () {
            worker.off('message', onMessage);
            worker.off('error', onError);
            worker.off('messageerror', onError);
            worker.off('exit', onExit);
        };
        var onError = function (err) {
            unsubscribeWorker();
            _this.reject(err);
        };
        worker.on('message', onMessage);
        worker.on('messageerror', onError); // TODO: not sure if work will exit
        worker.on('error', onError);
        worker.on('exit', onExit);
        var msg = __assign({}, this.task);
        delete msg.transferList;
        worker.postMessage(msg, msg.transferList);
    };
    return PromisedTask;
}());
var PromisedProcessTask = /** @class */ (function () {
    function PromisedProcessTask(task) {
        var _this = this;
        this.task = task;
        this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    }
    PromisedProcessTask.prototype.runByProcess = function (worker, verbose) {
        var _this = this;
        var onMessage = function (msg) {
            if (msg.type === 'wait') {
                _this.resolve(msg.data);
                unsubscribeWorker();
            }
            else if (msg.type === 'error') {
                _this.reject(msg.data);
                unsubscribeWorker();
            }
        };
        var onExit = function (code) {
            unsubscribeWorker();
            if (code !== 0) {
                _this.reject('Child process exist with code ' + code);
            }
        };
        var unsubscribeWorker = function () {
            worker.off('message', onMessage);
            worker.off('error', onError);
            // worker.off('messageerror', onError);
            worker.off('exit', onExit);
        };
        var onError = function (err) {
            unsubscribeWorker();
            _this.reject(err);
        };
        worker.on('message', onMessage);
        // worker.on('messageerror', onError); // TODO: not sure if work will exit
        worker.on('error', onError);
        worker.on('exit', onExit);
        var msg = __assign(__assign({}, this.task), { verbose: verbose });
        if (!worker.send(msg)) {
            this.reject('Is Child process event threshold full? This is weird.');
        }
    };
    return PromisedProcessTask;
}());
var Pool = /** @class */ (function () {
    /**
     * @param maxParalle max number of paralle workers, default is `os.cpus().length - 1`
     * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
     * @param workerOptions thread worker options, e.g. initializing some environment
     * stuff
     */
    function Pool(maxParalle, idleTimeMs, workerOptions) {
        if (maxParalle === void 0) { maxParalle = os_1.default.cpus().length - 1; }
        if (idleTimeMs === void 0) { idleTimeMs = 0; }
        this.maxParalle = maxParalle;
        this.idleTimeMs = idleTimeMs;
        this.workerOptions = workerOptions;
        this.runningWorkers = new Set();
        /** Last in first run, always run the latest created worker, give chance for old ones to be removed after timeout */
        this.idleWorkers = [];
        this.idleTimers = new WeakMap();
        this.tasks = [];
        this.totalCreatedWorkers = 0;
    }
    Pool.prototype.submit = function (task) {
        var _a, _b;
        // 1. Bind a task with a promise
        var promisedTask = new PromisedTask(task, (_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose);
        if ((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose) {
            // eslint-disable-next-line no-console
            console.log("[thread-pool] submit task, idle workers: " + this.idleWorkers.length + ", running workers: " + this.runningWorkers.size);
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            var worker = this.idleWorkers.pop();
            void this.runWorker(worker);
        }
        else if (this.runningWorkers.size < this.maxParalle) {
            // 3. Create new worker if number of them is less than maxParalle
            this.createWorker(promisedTask);
        }
        return promisedTask.promise;
    };
    Pool.prototype.submitProcess = function (task) {
        var _a;
        // 1. Bind a task with a promise
        var promisedTask = new PromisedProcessTask(task);
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
            // eslint-disable-next-line no-console
            console.log("[thread-pool] submit child process, idle process: " + this.idleWorkers.length + ", " +
                ("running process or workers: " + this.runningWorkers.size));
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            var worker = this.idleWorkers.pop();
            void this.runWorker(worker);
        }
        else if (this.runningWorkers.size < this.maxParalle) {
            // 3. Create new worker if number of them is less than maxParalle
            void this.createChildProcess();
        }
        return promisedTask.promise;
    };
    Pool.prototype.runWorker = function (worker) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var task, timer;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.idleTimers.delete(worker);
                        this.runningWorkers.add(worker);
                        _b.label = 1;
                    case 1:
                        if (!(this.tasks.length > 0)) return [3 /*break*/, 3];
                        task = this.tasks.shift();
                        if (worker instanceof worker_threads_1.Worker)
                            task.runByWorker(worker);
                        else
                            task.runByProcess(worker, !!((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose));
                        return [4 /*yield*/, task.promise.catch(function (e) { })];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        // No more task, put worker in idle
                        this.runningWorkers.delete(worker);
                        this.idleWorkers.push(worker);
                        timer = setTimeout(function () {
                            var _a, _b;
                            var cmd = { exit: true };
                            if (worker instanceof worker_threads_1.Worker) {
                                worker.postMessage(cmd);
                                if ((_a = _this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose)
                                    // eslint-disable-next-line no-console
                                    console.log('[thread-pool] Remove expired worker thread:', worker.threadId);
                            }
                            else {
                                worker.send(cmd);
                                if ((_b = _this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose)
                                    // eslint-disable-next-line no-console
                                    console.log('[thread-pool] Remove expired child process:', worker.pid);
                            }
                            _this.idleTimers.delete(worker);
                        }, this.idleTimeMs);
                        this.idleTimers.set(worker, timer);
                        return [2 /*return*/];
                }
            });
        });
    };
    Pool.prototype.createChildProcess = function () {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var worker, verbose, initTask, onWorkerExit;
            var _this = this;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        worker = child_process_1.fork(require.resolve('./worker-process'), { serialization: 'advanced', stdio: 'inherit' });
                        this.runningWorkers.add(worker);
                        verbose = !!((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose);
                        if (verbose)
                            // eslint-disable-next-line no-console
                            console.log('[thread-pool] createChildProcess');
                        if (!((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.initializer)) return [3 /*break*/, 2];
                        initTask = new PromisedProcessTask({
                            verbose: verbose,
                            initializer: (_c = this.workerOptions) === null || _c === void 0 ? void 0 : _c.initializer
                        });
                        initTask.runByProcess(worker, !!((_d = this.workerOptions) === null || _d === void 0 ? void 0 : _d.verbose));
                        return [4 /*yield*/, initTask.promise];
                    case 1:
                        _e.sent();
                        _e.label = 2;
                    case 2:
                        // }
                        void this.runWorker(worker);
                        onWorkerExit = function () {
                            if (_this.runningWorkers.has(worker)) {
                                _this.runningWorkers.delete(worker);
                            }
                            else {
                                var idx = _this.idleWorkers.indexOf(worker);
                                if (idx >= 0) {
                                    _this.idleWorkers.splice(idx, 1);
                                }
                            }
                        };
                        worker.on('error', onWorkerExit);
                        worker.on('exit', onWorkerExit);
                        return [2 /*return*/, worker];
                }
            });
        });
    };
    Pool.prototype.createWorker = function (task) {
        var _this = this;
        var _a, _b, _c, _d;
        var worker;
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
            // eslint-disable-next-line no-console
            console.log('[thread-pool] createWorker');
        }
        worker = new worker_threads_1.Worker(require.resolve('./worker'), __assign(__assign({}, this.workerOptions), { 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            workerData: __assign({ id: ++this.totalCreatedWorkers + '', verbose: !!((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose), initializer: (_c = this.workerOptions) === null || _c === void 0 ? void 0 : _c.initializer }, ((_d = this.workerOptions) === null || _d === void 0 ? void 0 : _d.workerData) || {}) }));
        void this.runWorker(worker);
        var onWorkerExit = function () {
            if (_this.runningWorkers.has(worker)) {
                _this.runningWorkers.delete(worker);
            }
            else {
                var idx = _this.idleWorkers.indexOf(worker);
                if (idx >= 0) {
                    _this.idleWorkers.splice(idx, 1);
                }
            }
        };
        worker.on('error', onWorkerExit);
        worker.on('exit', onWorkerExit);
        return worker;
    };
    return Pool;
}());
exports.Pool = Pool;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QixpREFBcUQ7QUFDckQsK0NBQWlEO0FBTWpELDBDQUFvQjtBQUdwQjtJQU1FLHNCQUFvQixJQUFVLEVBQUUsT0FBZTtRQUEvQyxpQkFLQztRQUwrQix3QkFBQSxFQUFBLGVBQWU7UUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDNUMsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsS0FBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsa0NBQVcsR0FBWCxVQUFZLE1BQWM7UUFBMUIsaUJBMENDO1FBeENDLElBQU0sU0FBUyxHQUFHLFVBQUMsR0FBc0M7WUFDdkQsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDdkIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDL0IsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7UUFDSCxDQUFDLENBQUM7UUFFRixJQUFNLE1BQU0sR0FBRyxVQUFDLElBQVk7WUFDMUIsc0JBQXNCO1lBQ3BCLHFEQUFxRDtZQUN2RCxJQUFJO1lBRUosaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixJ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YUFDRjtRQUNILENBQUMsQ0FBQztRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFDSCxXQUFDO0FBQUQsQ0FBQyxBQWpLRCxJQWlLQztBQWpLWSxvQkFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCB7V29ya2VyLCBXb3JrZXJPcHRpb25zfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge0NoaWxkUHJvY2VzcywgZm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQge3F1ZXVlfSBmcm9tICcuL3Byb21pc2UtcXVlcXVlJztcbmltcG9ydCB7VGFzaywgQ29tbWFuZCwgSW5pdGlhbE9wdGlvbnN9IGZyb20gJy4vd29ya2VyJztcblxuaW1wb3J0IHtUYXNrIGFzIFByb2Nlc3NUYXNrLCBJbml0aWFsT3B0aW9ucyBhcyBJbml0aWFsT3B0aW9uczRQcm9jfSBmcm9tICcuL3dvcmtlci1wcm9jZXNzJztcblxuaW1wb3J0IG9zIGZyb20gJ29zJztcbmV4cG9ydCB7VGFza307XG5cbmNsYXNzIFByb21pc2VkVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXTtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogVGFzaywgdmVyYm9zZSA9IGZhbHNlKSB7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG5cbiAgcnVuQnlXb3JrZXIod29ya2VyOiBXb3JrZXIpIHtcblxuICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IHt0eXBlOiAnZXJyb3InIHwgJ3dhaXQnLCBkYXRhOiBUfSkgPT4ge1xuICAgICAgaWYgKG1zZy50eXBlID09PSAnd2FpdCcpIHtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgICAgdGhpcy5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgICAgdGhpcy5yZWplY3QobXNnLmRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICAvLyBpZiAodGhpcy52ZXJib3NlKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIFByb21pc2VkVGFzayBvbiBleGl0Jyk7XG4gICAgICAvLyB9XG5cbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdChgVGhyZWFkICR7d29ya2VyLnRocmVhZElkfSBleGlzdCB3aXRoIGNvZGUgYCArIGNvZGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB1bnN1YnNjcmliZVdvcmtlciA9ICgpID0+IHtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgICAgd29ya2VyLm9mZignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignZXhpdCcsIG9uRXhpdCk7XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBhbnkpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB0aGlzLnJlamVjdChlcnIpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgb25FcnJvcik7IC8vIFRPRE86IG5vdCBzdXJlIGlmIHdvcmsgd2lsbCBleGl0XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0gey4uLnRoaXMudGFza307XG4gICAgZGVsZXRlIG1zZy50cmFuc2Zlckxpc3Q7XG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKG1zZywgbXNnLnRyYW5zZmVyTGlzdCk7XG4gIH1cbn1cblxuY2xhc3MgUHJvbWlzZWRQcm9jZXNzVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXTtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogUHJvY2Vzc1Rhc2sgfCBJbml0aWFsT3B0aW9uczRQcm9jKSB7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG4gIHJ1bkJ5UHJvY2Vzcyh3b3JrZXI6IENoaWxkUHJvY2VzcywgdmVyYm9zZTogYm9vbGVhbikge1xuXG4gICAgY29uc3Qgb25NZXNzYWdlID0gKG1zZzoge3R5cGU6ICdlcnJvcicgfCAnd2FpdCcsIGRhdGE6IFR9KSA9PiB7XG4gICAgICBpZiAobXNnLnR5cGUgPT09ICd3YWl0Jykge1xuICAgICAgICB0aGlzLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB0aGlzLnJlamVjdChtc2cuZGF0YSk7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXhpdCA9IChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdCgnQ2hpbGQgcHJvY2VzcyBleGlzdCB3aXRoIGNvZGUgJyArIGNvZGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB1bnN1YnNjcmliZVdvcmtlciA9ICgpID0+IHtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgICAgd29ya2VyLm9mZignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIC8vIHdvcmtlci5vZmYoJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignZXhpdCcsIG9uRXhpdCk7XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBhbnkpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB0aGlzLnJlamVjdChlcnIpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIC8vIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgb25FcnJvcik7IC8vIFRPRE86IG5vdCBzdXJlIGlmIHdvcmsgd2lsbCBleGl0XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0gey4uLnRoaXMudGFzaywgdmVyYm9zZX07XG4gICAgaWYgKCF3b3JrZXIuc2VuZChtc2cpKSB7XG4gICAgICB0aGlzLnJlamVjdCgnSXMgQ2hpbGQgcHJvY2VzcyBldmVudCB0aHJlc2hvbGQgZnVsbD8gVGhpcyBpcyB3ZWlyZC4nKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBvb2wge1xuICBwcml2YXRlIHJ1bm5pbmdXb3JrZXJzID0gbmV3IFNldDxXb3JrZXJ8Q2hpbGRQcm9jZXNzPigpO1xuICAvKiogTGFzdCBpbiBmaXJzdCBydW4sIGFsd2F5cyBydW4gdGhlIGxhdGVzdCBjcmVhdGVkIHdvcmtlciwgZ2l2ZSBjaGFuY2UgZm9yIG9sZCBvbmVzIHRvIGJlIHJlbW92ZWQgYWZ0ZXIgdGltZW91dCAqL1xuICBwcml2YXRlIGlkbGVXb3JrZXJzOiAoV29ya2VyfENoaWxkUHJvY2VzcylbXSA9IFtdO1xuXG4gIHByaXZhdGUgaWRsZVRpbWVycyA9IG5ldyBXZWFrTWFwPFdvcmtlciB8IENoaWxkUHJvY2VzcywgUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4+KCk7XG5cbiAgcHJpdmF0ZSB0YXNrczogKFByb21pc2VkVGFzazxhbnk+IHwgUHJvbWlzZWRQcm9jZXNzVGFzazxhbnk+KVtdID0gW107XG4gIHByaXZhdGUgdG90YWxDcmVhdGVkV29ya2VycyA9IDA7XG4gIC8qKlxuICAgKiBAcGFyYW0gbWF4UGFyYWxsZSBtYXggbnVtYmVyIG9mIHBhcmFsbGUgd29ya2VycywgZGVmYXVsdCBpcyBgb3MuY3B1cygpLmxlbmd0aCAtIDFgXG4gICAqIEBwYXJhbSBpZGxlVGltZU1zIGxldCB3b3JrZXIgZXhpdCB0byByZWxlYXNlIG1lbW9yeSwgYWZ0ZXIgYSB3b3JrZXIgYmVpbmcgaWRsZSBmb3Igc29tZSB0aW1lIChpbiBtcylcbiAgICogQHBhcmFtIHdvcmtlck9wdGlvbnMgdGhyZWFkIHdvcmtlciBvcHRpb25zLCBlLmcuIGluaXRpYWxpemluZyBzb21lIGVudmlyb25tZW50XG4gICAqIHN0dWZmXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1heFBhcmFsbGUgPSBvcy5jcHVzKCkubGVuZ3RoIC0gMSwgcHJpdmF0ZSBpZGxlVGltZU1zID0gMCwgcHVibGljIHdvcmtlck9wdGlvbnM/OiBXb3JrZXJPcHRpb25zICYgSW5pdGlhbE9wdGlvbnMpIHtcbiAgfVxuXG4gIHN1Ym1pdDxUPih0YXNrOiBUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRUYXNrPFQ+KHRhc2ssIHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG5cbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gc3VibWl0IHRhc2ssIGlkbGUgd29ya2VyczogJHt0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aH0sIHJ1bm5pbmcgd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuc2l6ZSA8IHRoaXMubWF4UGFyYWxsZSkge1xuICAgICAgLy8gMy4gQ3JlYXRlIG5ldyB3b3JrZXIgaWYgbnVtYmVyIG9mIHRoZW0gaXMgbGVzcyB0aGFuIG1heFBhcmFsbGVcbiAgICAgIHRoaXMuY3JlYXRlV29ya2VyKHByb21pc2VkVGFzayk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHN1Ym1pdFByb2Nlc3M8VD4odGFzazogUHJvY2Vzc1Rhc2spOiBQcm9taXNlPFQ+IHtcbiAgICAvLyAxLiBCaW5kIGEgdGFzayB3aXRoIGEgcHJvbWlzZVxuICAgIGNvbnN0IHByb21pc2VkVGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrPFQ+KHRhc2spO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHN1Ym1pdCBjaGlsZCBwcm9jZXNzLCBpZGxlIHByb2Nlc3M6ICR7dGhpcy5pZGxlV29ya2Vycy5sZW5ndGh9LCBgICtcbiAgICAgIGBydW5uaW5nIHByb2Nlc3Mgb3Igd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuc2l6ZSA8IHRoaXMubWF4UGFyYWxsZSkge1xuICAgICAgLy8gMy4gQ3JlYXRlIG5ldyB3b3JrZXIgaWYgbnVtYmVyIG9mIHRoZW0gaXMgbGVzcyB0aGFuIG1heFBhcmFsbGVcbiAgICAgIHZvaWQgdGhpcy5jcmVhdGVDaGlsZFByb2Nlc3MoKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2VkVGFzay5wcm9taXNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5Xb3JrZXIod29ya2VyOiBXb3JrZXIgfCBDaGlsZFByb2Nlc3MpIHtcbiAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5hZGQod29ya2VyKTtcbiAgICB3aGlsZSAodGhpcy50YXNrcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrcy5zaGlmdCgpITtcbiAgICAgIGlmICh3b3JrZXIgaW5zdGFuY2VvZiBXb3JrZXIpXG4gICAgICAgICh0YXNrIGFzIFByb21pc2VkVGFzazxhbnk+KS5ydW5CeVdvcmtlcih3b3JrZXIpO1xuICAgICAgZWxzZVxuICAgICAgICAodGFzayBhcyBQcm9taXNlZFByb2Nlc3NUYXNrPGFueT4pLnJ1bkJ5UHJvY2Vzcyh3b3JrZXIsICEhdGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKTtcbiAgICAgIGF3YWl0IHRhc2sucHJvbWlzZS5jYXRjaChlID0+IHt9KTtcbiAgICB9XG4gICAgLy8gTm8gbW9yZSB0YXNrLCBwdXQgd29ya2VyIGluIGlkbGVcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIHRoaXMuaWRsZVdvcmtlcnMucHVzaCh3b3JrZXIpO1xuXG4gICAgLy8gc2V0dXAgaWRsZSB0aW1lclxuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjb25zdCBjbWQ6IENvbW1hbmQgPSB7ZXhpdDogdHJ1ZX07XG4gICAgICBpZiAod29ya2VyIGluc3RhbmNlb2YgV29ya2VyKSB7XG4gICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZShjbWQpO1xuICAgICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKVxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gUmVtb3ZlIGV4cGlyZWQgd29ya2VyIHRocmVhZDonLCB3b3JrZXIudGhyZWFkSWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29ya2VyLnNlbmQoY21kKTtcbiAgICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSlcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIFJlbW92ZSBleHBpcmVkIGNoaWxkIHByb2Nlc3M6Jywgd29ya2VyLnBpZCk7XG4gICAgICB9XG4gICAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgfSwgdGhpcy5pZGxlVGltZU1zKTtcbiAgICB0aGlzLmlkbGVUaW1lcnMuc2V0KHdvcmtlciwgdGltZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVDaGlsZFByb2Nlc3MoKSB7XG4gICAgbGV0IHdvcmtlcjogQ2hpbGRQcm9jZXNzID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyLXByb2Nlc3MnKSwge3NlcmlhbGl6YXRpb246ICdhZHZhbmNlZCcsIHN0ZGlvOiAnaW5oZXJpdCd9KTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuXG4gICAgLy8gaWYgKHRoaXMud29ya2VyT3B0aW9ucyAmJiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UgfHwgdGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSkge1xuICAgIGNvbnN0IHZlcmJvc2UgPSAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZTtcbiAgICBpZiAodmVyYm9zZSlcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBjcmVhdGVDaGlsZFByb2Nlc3MnKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LmluaXRpYWxpemVyKSB7XG4gICAgICBjb25zdCBpbml0VGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrKHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXJcbiAgICAgICAgfSk7XG4gICAgICBpbml0VGFzay5ydW5CeVByb2Nlc3Mod29ya2VyLCAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG4gICAgICBhd2FpdCBpbml0VGFzay5wcm9taXNlO1xuICAgIH1cbiAgICAvLyB9XG4gICAgdm9pZCB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuXG4gICAgY29uc3Qgb25Xb3JrZXJFeGl0ID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuaGFzKHdvcmtlcikpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaWRsZVdvcmtlcnMuaW5kZXhPZih3b3JrZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25Xb3JrZXJFeGl0KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbldvcmtlckV4aXQpO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVdvcmtlcih0YXNrOiBQcm9taXNlZFRhc2s8YW55Pikge1xuICAgIGxldCB3b3JrZXI6IFdvcmtlcjtcbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIGNyZWF0ZVdvcmtlcicpO1xuICAgIH1cbiAgICB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi93b3JrZXInKSwge1xuICAgICAgLi4udGhpcy53b3JrZXJPcHRpb25zLFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgd29ya2VyRGF0YToge1xuICAgICAgICBpZDogKyt0aGlzLnRvdGFsQ3JlYXRlZFdvcmtlcnMgKyAnJyxcbiAgICAgICAgdmVyYm9zZTogISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UsXG4gICAgICAgIGluaXRpYWxpemVyOiB0aGlzLndvcmtlck9wdGlvbnM/LmluaXRpYWxpemVyLFxuICAgICAgICAuLi50aGlzLndvcmtlck9wdGlvbnM/LndvcmtlckRhdGEgfHwge31cbiAgICAgIH1cbiAgICB9KTtcbiAgICB2b2lkIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG5cbiAgICBjb25zdCBvbldvcmtlckV4aXQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5oYXMod29ya2VyKSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5pZGxlV29ya2Vycy5pbmRleE9mKHdvcmtlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuaWRsZVdvcmtlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdvcmtlci5vbignZXJyb3InLCBvbldvcmtlckV4aXQpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uV29ya2VyRXhpdCk7XG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxufVxuIl19