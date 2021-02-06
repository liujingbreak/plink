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
                _this.reject('Thread exist with code ' + code);
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
            console.log("[thread-pool] submit task, idle workers: " + this.idleWorkers.length + ", running workers: " + this.runningWorkers.size);
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            var worker = this.idleWorkers.pop();
            this.runWorker(worker);
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
            console.log("[thread-pool] submit child process, idle process: " + this.idleWorkers.length + ", " +
                ("running process or workers: " + this.runningWorkers.size));
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            var worker = this.idleWorkers.pop();
            this.runWorker(worker);
        }
        else if (this.runningWorkers.size < this.maxParalle) {
            // 3. Create new worker if number of them is less than maxParalle
            this.createChildProcess();
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
                                    console.log('[thread-pool] Remove expired worker threads');
                            }
                            else {
                                worker.send(cmd);
                                if ((_b = _this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose)
                                    console.log('[thread-pool] Remove expired child process');
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
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var worker, initTask, onWorkerExit;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        worker = child_process_1.fork(require.resolve('./worker-process'), { serialization: 'advanced', stdio: 'inherit' });
                        this.runningWorkers.add(worker);
                        if (!(this.workerOptions && (this.workerOptions.verbose || this.workerOptions.initializer))) return [3 /*break*/, 2];
                        if (this.workerOptions.verbose)
                            console.log('[thread-pool] createChildProcess');
                        if (!this.workerOptions.initializer) return [3 /*break*/, 2];
                        initTask = new PromisedProcessTask({
                            verbose: this.workerOptions.verbose,
                            initializer: this.workerOptions.initializer
                        });
                        initTask.runByProcess(worker, !!((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose));
                        return [4 /*yield*/, initTask.promise];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        this.runWorker(worker);
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
        var worker;
        if (this.workerOptions && (this.workerOptions.verbose || this.workerOptions.initializer)) {
            if (this.workerOptions.verbose)
                console.log('[thread-pool] createWorker');
            worker = new worker_threads_1.Worker(require.resolve('./worker'), __assign({ workerData: {
                    id: ++this.totalCreatedWorkers + '',
                    verbose: this.workerOptions.verbose,
                    initializer: this.workerOptions.initializer
                } }, this.workerOptions));
        }
        else {
            worker = new worker_threads_1.Worker(require.resolve('./worker'), this.workerOptions);
        }
        this.runWorker(worker);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QixpREFBcUQ7QUFDckQsK0NBQWlEO0FBTWpELDBDQUFvQjtBQUdwQjtJQU1FLHNCQUFvQixJQUFVLEVBQUUsT0FBZTtRQUEvQyxpQkFLQztRQUwrQix3QkFBQSxFQUFBLGVBQWU7UUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDNUMsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsS0FBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsa0NBQVcsR0FBWCxVQUFZLE1BQWM7UUFBMUIsaUJBMENDO1FBeENDLElBQU0sU0FBUyxHQUFHLFVBQUMsR0FBc0M7WUFDdkQsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDdkIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDL0IsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7UUFDSCxDQUFDLENBQUM7UUFFRixJQUFNLE1BQU0sR0FBRyxVQUFDLElBQVk7WUFDMUIsc0JBQXNCO1lBQ3BCLHFEQUFxRDtZQUN2RCxJQUFJO1lBRUosaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixJ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QUNaLEtBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDakM7YUFDRjtRQUNILENBQUMsQ0FBQztRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFDSCxXQUFDO0FBQUQsQ0FBQyxBQTNKRCxJQTJKQztBQTNKWSxvQkFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCB7V29ya2VyLCBXb3JrZXJPcHRpb25zfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge0NoaWxkUHJvY2VzcywgZm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQge3F1ZXVlfSBmcm9tICcuL3Byb21pc2UtcXVlcXVlJztcbmltcG9ydCB7VGFzaywgQ29tbWFuZCwgSW5pdGlhbE9wdGlvbnN9IGZyb20gJy4vd29ya2VyJztcblxuaW1wb3J0IHtUYXNrIGFzIFByb2Nlc3NUYXNrLCBJbml0aWFsT3B0aW9ucyBhcyBJbml0aWFsT3B0aW9uczRQcm9jfSBmcm9tICcuL3dvcmtlci1wcm9jZXNzJztcblxuaW1wb3J0IG9zIGZyb20gJ29zJztcbmV4cG9ydCB7VGFza307XG5cbmNsYXNzIFByb21pc2VkVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXTtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogVGFzaywgdmVyYm9zZSA9IGZhbHNlKSB7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG5cbiAgcnVuQnlXb3JrZXIod29ya2VyOiBXb3JrZXIpIHtcblxuICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IHt0eXBlOiAnZXJyb3InIHwgJ3dhaXQnLCBkYXRhOiBUfSkgPT4ge1xuICAgICAgaWYgKG1zZy50eXBlID09PSAnd2FpdCcpIHtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgICAgdGhpcy5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgICAgdGhpcy5yZWplY3QobXNnLmRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICAvLyBpZiAodGhpcy52ZXJib3NlKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIFByb21pc2VkVGFzayBvbiBleGl0Jyk7XG4gICAgICAvLyB9XG5cbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdCgnVGhyZWFkIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0KGVycik7XG4gICAgfTtcblxuICAgIHdvcmtlci5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgd29ya2VyLm9uKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrfTtcbiAgICBkZWxldGUgbXNnLnRyYW5zZmVyTGlzdDtcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UobXNnLCBtc2cudHJhbnNmZXJMaXN0KTtcbiAgfVxufVxuXG5jbGFzcyBQcm9taXNlZFByb2Nlc3NUYXNrPFQ+IHtcbiAgcHJvbWlzZTogUHJvbWlzZTxUPjtcblxuICByZXNvbHZlOiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzBdO1xuICByZWplY3Q6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMV07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0YXNrOiBQcm9jZXNzVGFzayB8IEluaXRpYWxPcHRpb25zNFByb2MpIHtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cbiAgcnVuQnlQcm9jZXNzKHdvcmtlcjogQ2hpbGRQcm9jZXNzLCB2ZXJib3NlOiBib29sZWFuKSB7XG5cbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JywgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZShtc2cuZGF0YSk7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgIHRoaXMucmVqZWN0KG1zZy5kYXRhKTtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgb25FeGl0ID0gKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIHRoaXMucmVqZWN0KCdDaGlsZCBwcm9jZXNzIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgLy8gd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0KGVycik7XG4gICAgfTtcblxuICAgIHdvcmtlci5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgLy8gd29ya2VyLm9uKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrLCB2ZXJib3NlfTtcbiAgICBpZiAoIXdvcmtlci5zZW5kKG1zZykpIHtcbiAgICAgIHRoaXMucmVqZWN0KCdJcyBDaGlsZCBwcm9jZXNzIGV2ZW50IHRocmVzaG9sZCBmdWxsPyBUaGlzIGlzIHdlaXJkLicpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9vbCB7XG4gIHByaXZhdGUgcnVubmluZ1dvcmtlcnMgPSBuZXcgU2V0PFdvcmtlcnxDaGlsZFByb2Nlc3M+KCk7XG4gIC8qKiBMYXN0IGluIGZpcnN0IHJ1biwgYWx3YXlzIHJ1biB0aGUgbGF0ZXN0IGNyZWF0ZWQgd29ya2VyLCBnaXZlIGNoYW5jZSBmb3Igb2xkIG9uZXMgdG8gYmUgcmVtb3ZlZCBhZnRlciB0aW1lb3V0ICovXG4gIHByaXZhdGUgaWRsZVdvcmtlcnM6IChXb3JrZXJ8Q2hpbGRQcm9jZXNzKVtdID0gW107XG5cbiAgcHJpdmF0ZSBpZGxlVGltZXJzID0gbmV3IFdlYWtNYXA8V29ya2VyIHwgQ2hpbGRQcm9jZXNzLCBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0Pj4oKTtcblxuICBwcml2YXRlIHRhc2tzOiAoUHJvbWlzZWRUYXNrPGFueT4gfCBQcm9taXNlZFByb2Nlc3NUYXNrPGFueT4pW10gPSBbXTtcbiAgcHJpdmF0ZSB0b3RhbENyZWF0ZWRXb3JrZXJzID0gMDtcbiAgLyoqXG4gICAqIEBwYXJhbSBtYXhQYXJhbGxlIG1heCBudW1iZXIgb2YgcGFyYWxsZSB3b3JrZXJzLCBkZWZhdWx0IGlzIGBvcy5jcHVzKCkubGVuZ3RoIC0gMWBcbiAgICogQHBhcmFtIGlkbGVUaW1lTXMgbGV0IHdvcmtlciBleGl0IHRvIHJlbGVhc2UgbWVtb3J5LCBhZnRlciBhIHdvcmtlciBiZWluZyBpZGxlIGZvciBzb21lIHRpbWUgKGluIG1zKVxuICAgKiBAcGFyYW0gd29ya2VyT3B0aW9ucyB0aHJlYWQgd29ya2VyIG9wdGlvbnMsIGUuZy4gaW5pdGlhbGl6aW5nIHNvbWUgZW52aXJvbm1lbnRcbiAgICogc3R1ZmZcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWF4UGFyYWxsZSA9IG9zLmNwdXMoKS5sZW5ndGggLSAxLCBwcml2YXRlIGlkbGVUaW1lTXMgPSAwLCBwcml2YXRlIHdvcmtlck9wdGlvbnM/OiBXb3JrZXJPcHRpb25zICYgSW5pdGlhbE9wdGlvbnMpIHtcbiAgfVxuXG4gIHN1Ym1pdDxUPih0YXNrOiBUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRUYXNrPFQ+KHRhc2ssIHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG5cbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBzdWJtaXQgdGFzaywgaWRsZSB3b3JrZXJzOiAke3RoaXMuaWRsZVdvcmtlcnMubGVuZ3RofSwgcnVubmluZyB3b3JrZXJzOiAke3RoaXMucnVubmluZ1dvcmtlcnMuc2l6ZX1gKTtcbiAgICB9XG4gICAgdGhpcy50YXNrcy5wdXNoKHByb21pc2VkVGFzayk7XG4gICAgaWYgKHRoaXMuaWRsZVdvcmtlcnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gMi4gTG9vayBmb3IgYXZhaWxhYmUgaWRsZSB3b3JrZXJcbiAgICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuaWRsZVdvcmtlcnMucG9wKCkhO1xuICAgICAgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuc2l6ZSA8IHRoaXMubWF4UGFyYWxsZSkge1xuICAgICAgLy8gMy4gQ3JlYXRlIG5ldyB3b3JrZXIgaWYgbnVtYmVyIG9mIHRoZW0gaXMgbGVzcyB0aGFuIG1heFBhcmFsbGVcbiAgICAgIHRoaXMuY3JlYXRlV29ya2VyKHByb21pc2VkVGFzayk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHN1Ym1pdFByb2Nlc3M8VD4odGFzazogUHJvY2Vzc1Rhc2spOiBQcm9taXNlPFQ+IHtcbiAgICAvLyAxLiBCaW5kIGEgdGFzayB3aXRoIGEgcHJvbWlzZVxuICAgIGNvbnN0IHByb21pc2VkVGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrPFQ+KHRhc2spO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gc3VibWl0IGNoaWxkIHByb2Nlc3MsIGlkbGUgcHJvY2VzczogJHt0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aH0sIGAgK1xuICAgICAgYHJ1bm5pbmcgcHJvY2VzcyBvciB3b3JrZXJzOiAke3RoaXMucnVubmluZ1dvcmtlcnMuc2l6ZX1gKTtcbiAgICB9XG4gICAgdGhpcy50YXNrcy5wdXNoKHByb21pc2VkVGFzayk7XG4gICAgaWYgKHRoaXMuaWRsZVdvcmtlcnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gMi4gTG9vayBmb3IgYXZhaWxhYmUgaWRsZSB3b3JrZXJcbiAgICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuaWRsZVdvcmtlcnMucG9wKCkhO1xuICAgICAgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuc2l6ZSA8IHRoaXMubWF4UGFyYWxsZSkge1xuICAgICAgLy8gMy4gQ3JlYXRlIG5ldyB3b3JrZXIgaWYgbnVtYmVyIG9mIHRoZW0gaXMgbGVzcyB0aGFuIG1heFBhcmFsbGVcbiAgICAgIHRoaXMuY3JlYXRlQ2hpbGRQcm9jZXNzKCk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuV29ya2VyKHdvcmtlcjogV29ya2VyIHwgQ2hpbGRQcm9jZXNzKSB7XG4gICAgdGhpcy5pZGxlVGltZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIHRoaXMucnVubmluZ1dvcmtlcnMuYWRkKHdvcmtlcik7XG4gICAgd2hpbGUgKHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgdGFzayA9IHRoaXMudGFza3Muc2hpZnQoKSE7XG4gICAgICBpZiAod29ya2VyIGluc3RhbmNlb2YgV29ya2VyKVxuICAgICAgICAodGFzayBhcyBQcm9taXNlZFRhc2s8YW55PikucnVuQnlXb3JrZXIod29ya2VyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgKHRhc2sgYXMgUHJvbWlzZWRQcm9jZXNzVGFzazxhbnk+KS5ydW5CeVByb2Nlc3Mod29ya2VyLCAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG4gICAgICBhd2FpdCB0YXNrLnByb21pc2UuY2F0Y2goZSA9PiB7fSk7XG4gICAgfVxuICAgIC8vIE5vIG1vcmUgdGFzaywgcHV0IHdvcmtlciBpbiBpZGxlXG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLmlkbGVXb3JrZXJzLnB1c2god29ya2VyKTtcblxuICAgIC8vIHNldHVwIGlkbGUgdGltZXJcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc3QgY21kOiBDb21tYW5kID0ge2V4aXQ6IHRydWV9O1xuICAgICAgaWYgKHdvcmtlciBpbnN0YW5jZW9mIFdvcmtlcikge1xuICAgICAgICB3b3JrZXIucG9zdE1lc3NhZ2UoY21kKTtcbiAgICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSlcbiAgICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBSZW1vdmUgZXhwaXJlZCB3b3JrZXIgdGhyZWFkcycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29ya2VyLnNlbmQoY21kKTtcbiAgICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSlcbiAgICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBSZW1vdmUgZXhwaXJlZCBjaGlsZCBwcm9jZXNzJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgfSwgdGhpcy5pZGxlVGltZU1zKTtcbiAgICB0aGlzLmlkbGVUaW1lcnMuc2V0KHdvcmtlciwgdGltZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVDaGlsZFByb2Nlc3MoKSB7XG4gICAgbGV0IHdvcmtlcjogQ2hpbGRQcm9jZXNzID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyLXByb2Nlc3MnKSwge3NlcmlhbGl6YXRpb246ICdhZHZhbmNlZCcsIHN0ZGlvOiAnaW5oZXJpdCd9KTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucyAmJiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UgfHwgdGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSkge1xuXG4gICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UpXG4gICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIGNyZWF0ZUNoaWxkUHJvY2VzcycpO1xuXG4gICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSB7XG4gICAgICAgIGNvbnN0IGluaXRUYXNrID0gbmV3IFByb21pc2VkUHJvY2Vzc1Rhc2soe1xuICAgICAgICAgIHZlcmJvc2U6IHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIGluaXRpYWxpemVyOiB0aGlzLndvcmtlck9wdGlvbnMuaW5pdGlhbGl6ZXJcbiAgICAgICAgICB9KTtcbiAgICAgICAgaW5pdFRhc2sucnVuQnlQcm9jZXNzKHdvcmtlciwgISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuICAgICAgICBhd2FpdCBpbml0VGFzay5wcm9taXNlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuXG4gICAgY29uc3Qgb25Xb3JrZXJFeGl0ID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuaGFzKHdvcmtlcikpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaWRsZVdvcmtlcnMuaW5kZXhPZih3b3JrZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25Xb3JrZXJFeGl0KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbldvcmtlckV4aXQpO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVdvcmtlcih0YXNrOiBQcm9taXNlZFRhc2s8YW55Pikge1xuICAgIGxldCB3b3JrZXI6IFdvcmtlcjtcbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zICYmICh0aGlzLndvcmtlck9wdGlvbnMudmVyYm9zZSB8fCB0aGlzLndvcmtlck9wdGlvbnMuaW5pdGlhbGl6ZXIpKSB7XG4gICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UpXG4gICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIGNyZWF0ZVdvcmtlcicpO1xuICAgICAgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyJyksIHtcbiAgICAgICAgd29ya2VyRGF0YToge1xuICAgICAgICAgIGlkOiArK3RoaXMudG90YWxDcmVhdGVkV29ya2VycyArICcnLFxuICAgICAgICAgIHZlcmJvc2U6IHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIGluaXRpYWxpemVyOiB0aGlzLndvcmtlck9wdGlvbnMuaW5pdGlhbGl6ZXJ9LFxuICAgICAgICAgIC4uLnRoaXMud29ya2VyT3B0aW9uc1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlcicpLCB0aGlzLndvcmtlck9wdGlvbnMpO1xuICAgIH1cbiAgICB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuXG4gICAgY29uc3Qgb25Xb3JrZXJFeGl0ID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuaGFzKHdvcmtlcikpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaWRsZVdvcmtlcnMuaW5kZXhPZih3b3JrZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25Xb3JrZXJFeGl0KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbldvcmtlckV4aXQpO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cbn1cbiJdfQ==