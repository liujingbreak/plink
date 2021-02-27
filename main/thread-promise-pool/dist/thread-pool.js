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
                                    console.log('[thread-pool] Remove expired worker thread:', worker.threadId);
                            }
                            else {
                                worker.send(cmd);
                                if ((_b = _this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose)
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
        var _a, _b, _c, _d;
        var worker;
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
            console.log('[thread-pool] createWorker');
        }
        worker = new worker_threads_1.Worker(require.resolve('./worker'), __assign(__assign({}, this.workerOptions), { workerData: __assign({ id: ++this.totalCreatedWorkers + '', verbose: !!((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose), initializer: (_c = this.workerOptions) === null || _c === void 0 ? void 0 : _c.initializer }, ((_d = this.workerOptions) === null || _d === void 0 ? void 0 : _d.workerData) || {}) }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QixpREFBcUQ7QUFDckQsK0NBQWlEO0FBTWpELDBDQUFvQjtBQUdwQjtJQU1FLHNCQUFvQixJQUFVLEVBQUUsT0FBZTtRQUEvQyxpQkFLQztRQUwrQix3QkFBQSxFQUFBLGVBQWU7UUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDNUMsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsS0FBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsa0NBQVcsR0FBWCxVQUFZLE1BQWM7UUFBMUIsaUJBMENDO1FBeENDLElBQU0sU0FBUyxHQUFHLFVBQUMsR0FBc0M7WUFDdkQsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDdkIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDL0IsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7UUFDSCxDQUFDLENBQUM7UUFFRixJQUFNLE1BQU0sR0FBRyxVQUFDLElBQVk7WUFDMUIsc0JBQXNCO1lBQ3BCLHFEQUFxRDtZQUN2RCxJQUFJO1lBRUosaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixJ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QztRQUNoQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBQ0gsV0FBQztBQUFELENBQUMsQUExSkQsSUEwSkM7QUExSlksb0JBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQge1dvcmtlciwgV29ya2VyT3B0aW9uc30gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHtDaGlsZFByb2Nlc3MsIGZvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gaW1wb3J0IHtxdWV1ZX0gZnJvbSAnLi9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQge1Rhc2ssIENvbW1hbmQsIEluaXRpYWxPcHRpb25zfSBmcm9tICcuL3dvcmtlcic7XG5cbmltcG9ydCB7VGFzayBhcyBQcm9jZXNzVGFzaywgSW5pdGlhbE9wdGlvbnMgYXMgSW5pdGlhbE9wdGlvbnM0UHJvY30gZnJvbSAnLi93b3JrZXItcHJvY2Vzcyc7XG5cbmltcG9ydCBvcyBmcm9tICdvcyc7XG5leHBvcnQge1Rhc2t9O1xuXG5jbGFzcyBQcm9taXNlZFRhc2s8VD4ge1xuICBwcm9taXNlOiBQcm9taXNlPFQ+O1xuXG4gIHJlc29sdmU6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMF07XG4gIHJlamVjdDogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlsxXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRhc2s6IFRhc2ssIHZlcmJvc2UgPSBmYWxzZSkge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkJ5V29ya2VyKHdvcmtlcjogV29ya2VyKSB7XG5cbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JywgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVzb2x2ZShtc2cuZGF0YSk7XG4gICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVqZWN0KG1zZy5kYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgb25FeGl0ID0gKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgLy8gaWYgKHRoaXMudmVyYm9zZSkge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBQcm9taXNlZFRhc2sgb24gZXhpdCcpO1xuICAgICAgLy8gfVxuXG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QoYFRocmVhZCAke3dvcmtlci50aHJlYWRJZH0gZXhpc3Qgd2l0aCBjb2RlIGAgKyBjb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdW5zdWJzY3JpYmVXb3JrZXIgPSAoKSA9PiB7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICAgIHdvcmtlci5vZmYoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdvcmtlci5vZmYoJ2V4aXQnLCBvbkV4aXQpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbkVycm9yID0gKGVycjogYW55KSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgdGhpcy5yZWplY3QoZXJyKTtcbiAgICB9O1xuXG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpOyAvLyBUT0RPOiBub3Qgc3VyZSBpZiB3b3JrIHdpbGwgZXhpdFxuICAgIHdvcmtlci5vbignZXJyb3InLCBvbkVycm9yKTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbkV4aXQpO1xuICAgIGNvbnN0IG1zZyA9IHsuLi50aGlzLnRhc2t9O1xuICAgIGRlbGV0ZSBtc2cudHJhbnNmZXJMaXN0O1xuICAgIHdvcmtlci5wb3N0TWVzc2FnZShtc2csIG1zZy50cmFuc2Zlckxpc3QpO1xuICB9XG59XG5cbmNsYXNzIFByb21pc2VkUHJvY2Vzc1Rhc2s8VD4ge1xuICBwcm9taXNlOiBQcm9taXNlPFQ+O1xuXG4gIHJlc29sdmU6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMF07XG4gIHJlamVjdDogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlsxXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRhc2s6IFByb2Nlc3NUYXNrIHwgSW5pdGlhbE9wdGlvbnM0UHJvYykge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuICBydW5CeVByb2Nlc3Mod29ya2VyOiBDaGlsZFByb2Nlc3MsIHZlcmJvc2U6IGJvb2xlYW4pIHtcblxuICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IHt0eXBlOiAnZXJyb3InIHwgJ3dhaXQnLCBkYXRhOiBUfSkgPT4ge1xuICAgICAgaWYgKG1zZy50eXBlID09PSAnd2FpdCcpIHtcbiAgICAgICAgdGhpcy5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgdGhpcy5yZWplY3QobXNnLmRhdGEpO1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QoJ0NoaWxkIHByb2Nlc3MgZXhpc3Qgd2l0aCBjb2RlICcgKyBjb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdW5zdWJzY3JpYmVXb3JrZXIgPSAoKSA9PiB7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICAgIHdvcmtlci5vZmYoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAvLyB3b3JrZXIub2ZmKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdvcmtlci5vZmYoJ2V4aXQnLCBvbkV4aXQpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbkVycm9yID0gKGVycjogYW55KSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgdGhpcy5yZWplY3QoZXJyKTtcbiAgICB9O1xuXG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICAvLyB3b3JrZXIub24oJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpOyAvLyBUT0RPOiBub3Qgc3VyZSBpZiB3b3JrIHdpbGwgZXhpdFxuICAgIHdvcmtlci5vbignZXJyb3InLCBvbkVycm9yKTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbkV4aXQpO1xuICAgIGNvbnN0IG1zZyA9IHsuLi50aGlzLnRhc2ssIHZlcmJvc2V9O1xuICAgIGlmICghd29ya2VyLnNlbmQobXNnKSkge1xuICAgICAgdGhpcy5yZWplY3QoJ0lzIENoaWxkIHByb2Nlc3MgZXZlbnQgdGhyZXNob2xkIGZ1bGw/IFRoaXMgaXMgd2VpcmQuJyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQb29sIHtcbiAgcHJpdmF0ZSBydW5uaW5nV29ya2VycyA9IG5ldyBTZXQ8V29ya2VyfENoaWxkUHJvY2Vzcz4oKTtcbiAgLyoqIExhc3QgaW4gZmlyc3QgcnVuLCBhbHdheXMgcnVuIHRoZSBsYXRlc3QgY3JlYXRlZCB3b3JrZXIsIGdpdmUgY2hhbmNlIGZvciBvbGQgb25lcyB0byBiZSByZW1vdmVkIGFmdGVyIHRpbWVvdXQgKi9cbiAgcHJpdmF0ZSBpZGxlV29ya2VyczogKFdvcmtlcnxDaGlsZFByb2Nlc3MpW10gPSBbXTtcblxuICBwcml2YXRlIGlkbGVUaW1lcnMgPSBuZXcgV2Vha01hcDxXb3JrZXIgfCBDaGlsZFByb2Nlc3MsIFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+PigpO1xuXG4gIHByaXZhdGUgdGFza3M6IChQcm9taXNlZFRhc2s8YW55PiB8IFByb21pc2VkUHJvY2Vzc1Rhc2s8YW55PilbXSA9IFtdO1xuICBwcml2YXRlIHRvdGFsQ3JlYXRlZFdvcmtlcnMgPSAwO1xuICAvKipcbiAgICogQHBhcmFtIG1heFBhcmFsbGUgbWF4IG51bWJlciBvZiBwYXJhbGxlIHdvcmtlcnMsIGRlZmF1bHQgaXMgYG9zLmNwdXMoKS5sZW5ndGggLSAxYFxuICAgKiBAcGFyYW0gaWRsZVRpbWVNcyBsZXQgd29ya2VyIGV4aXQgdG8gcmVsZWFzZSBtZW1vcnksIGFmdGVyIGEgd29ya2VyIGJlaW5nIGlkbGUgZm9yIHNvbWUgdGltZSAoaW4gbXMpXG4gICAqIEBwYXJhbSB3b3JrZXJPcHRpb25zIHRocmVhZCB3b3JrZXIgb3B0aW9ucywgZS5nLiBpbml0aWFsaXppbmcgc29tZSBlbnZpcm9ubWVudFxuICAgKiBzdHVmZlxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXhQYXJhbGxlID0gb3MuY3B1cygpLmxlbmd0aCAtIDEsIHByaXZhdGUgaWRsZVRpbWVNcyA9IDAsIHB1YmxpYyB3b3JrZXJPcHRpb25zPzogV29ya2VyT3B0aW9ucyAmIEluaXRpYWxPcHRpb25zKSB7XG4gIH1cblxuICBzdWJtaXQ8VD4odGFzazogVGFzayk6IFByb21pc2U8VD4ge1xuICAgIC8vIDEuIEJpbmQgYSB0YXNrIHdpdGggYSBwcm9taXNlXG4gICAgY29uc3QgcHJvbWlzZWRUYXNrID0gbmV3IFByb21pc2VkVGFzazxUPih0YXNrLCB0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gc3VibWl0IHRhc2ssIGlkbGUgd29ya2VyczogJHt0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aH0sIHJ1bm5pbmcgd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZVdvcmtlcihwcm9taXNlZFRhc2spO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrLnByb21pc2U7XG4gIH1cblxuICBzdWJtaXRQcm9jZXNzPFQ+KHRhc2s6IFByb2Nlc3NUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRQcm9jZXNzVGFzazxUPih0YXNrKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHN1Ym1pdCBjaGlsZCBwcm9jZXNzLCBpZGxlIHByb2Nlc3M6ICR7dGhpcy5pZGxlV29ya2Vycy5sZW5ndGh9LCBgICtcbiAgICAgIGBydW5uaW5nIHByb2Nlc3Mgb3Igd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZUNoaWxkUHJvY2VzcygpO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrLnByb21pc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1bldvcmtlcih3b3JrZXI6IFdvcmtlciB8IENoaWxkUHJvY2Vzcykge1xuICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuICAgIHdoaWxlICh0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tzLnNoaWZ0KCkhO1xuICAgICAgaWYgKHdvcmtlciBpbnN0YW5jZW9mIFdvcmtlcilcbiAgICAgICAgKHRhc2sgYXMgUHJvbWlzZWRUYXNrPGFueT4pLnJ1bkJ5V29ya2VyKHdvcmtlcik7XG4gICAgICBlbHNlXG4gICAgICAgICh0YXNrIGFzIFByb21pc2VkUHJvY2Vzc1Rhc2s8YW55PikucnVuQnlQcm9jZXNzKHdvcmtlciwgISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuICAgICAgYXdhaXQgdGFzay5wcm9taXNlLmNhdGNoKGUgPT4ge30pO1xuICAgIH1cbiAgICAvLyBObyBtb3JlIHRhc2ssIHB1dCB3b3JrZXIgaW4gaWRsZVxuICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgdGhpcy5pZGxlV29ya2Vycy5wdXNoKHdvcmtlcik7XG5cbiAgICAvLyBzZXR1cCBpZGxlIHRpbWVyXG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnN0IGNtZDogQ29tbWFuZCA9IHtleGl0OiB0cnVlfTtcbiAgICAgIGlmICh3b3JrZXIgaW5zdGFuY2VvZiBXb3JrZXIpIHtcbiAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKGNtZCk7XG4gICAgICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpXG4gICAgICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gUmVtb3ZlIGV4cGlyZWQgd29ya2VyIHRocmVhZDonLCB3b3JrZXIudGhyZWFkSWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29ya2VyLnNlbmQoY21kKTtcbiAgICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSlcbiAgICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBSZW1vdmUgZXhwaXJlZCBjaGlsZCBwcm9jZXNzOicsIHdvcmtlci5waWQpO1xuICAgICAgfVxuICAgICAgdGhpcy5pZGxlVGltZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIH0sIHRoaXMuaWRsZVRpbWVNcyk7XG4gICAgdGhpcy5pZGxlVGltZXJzLnNldCh3b3JrZXIsIHRpbWVyKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQ2hpbGRQcm9jZXNzKCkge1xuICAgIGxldCB3b3JrZXI6IENoaWxkUHJvY2VzcyA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlci1wcm9jZXNzJyksIHtzZXJpYWxpemF0aW9uOiAnYWR2YW5jZWQnLCBzdGRpbzogJ2luaGVyaXQnfSk7XG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5hZGQod29ya2VyKTtcblxuICAgIC8vIGlmICh0aGlzLndvcmtlck9wdGlvbnMgJiYgKHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlIHx8IHRoaXMud29ya2VyT3B0aW9ucy5pbml0aWFsaXplcikpIHtcbiAgICBjb25zdCB2ZXJib3NlID0gISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2U7XG4gICAgaWYgKHZlcmJvc2UpXG4gICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBjcmVhdGVDaGlsZFByb2Nlc3MnKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LmluaXRpYWxpemVyKSB7XG4gICAgICBjb25zdCBpbml0VGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrKHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXJcbiAgICAgICAgfSk7XG4gICAgICBpbml0VGFzay5ydW5CeVByb2Nlc3Mod29ya2VyLCAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG4gICAgICBhd2FpdCBpbml0VGFzay5wcm9taXNlO1xuICAgIH1cbiAgICAvLyB9XG4gICAgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcblxuICAgIGNvbnN0IG9uV29ya2VyRXhpdCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLmhhcyh3b3JrZXIpKSB7XG4gICAgICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmlkbGVXb3JrZXJzLmluZGV4T2Yod29ya2VyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uV29ya2VyRXhpdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25Xb3JrZXJFeGl0KTtcbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVXb3JrZXIodGFzazogUHJvbWlzZWRUYXNrPGFueT4pIHtcbiAgICBsZXQgd29ya2VyOiBXb3JrZXI7XG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBjcmVhdGVXb3JrZXInKTtcbiAgICB9XG4gICAgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyJyksIHtcbiAgICAgIC4uLnRoaXMud29ya2VyT3B0aW9ucyxcbiAgICAgIHdvcmtlckRhdGE6IHtcbiAgICAgICAgaWQ6ICsrdGhpcy50b3RhbENyZWF0ZWRXb3JrZXJzICsgJycsXG4gICAgICAgIHZlcmJvc2U6ICEhdGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlLFxuICAgICAgICBpbml0aWFsaXplcjogdGhpcy53b3JrZXJPcHRpb25zPy5pbml0aWFsaXplcixcbiAgICAgICAgLi4udGhpcy53b3JrZXJPcHRpb25zPy53b3JrZXJEYXRhIHx8IHt9XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcblxuICAgIGNvbnN0IG9uV29ya2VyRXhpdCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLmhhcyh3b3JrZXIpKSB7XG4gICAgICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmlkbGVXb3JrZXJzLmluZGV4T2Yod29ya2VyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uV29ya2VyRXhpdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25Xb3JrZXJFeGl0KTtcbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG59XG4iXX0=