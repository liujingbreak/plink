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
                        worker = (0, child_process_1.fork)(require.resolve('./worker-process'), { serialization: 'advanced', stdio: 'inherit' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QixpREFBcUQ7QUFDckQsK0NBQWlEO0FBTWpELDBDQUFvQjtBQUdwQjtJQU1FLHNCQUFvQixJQUFVLEVBQUUsT0FBZTtRQUEvQyxpQkFLQztRQUwrQix3QkFBQSxFQUFBLGVBQWU7UUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDNUMsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsS0FBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsa0NBQVcsR0FBWCxVQUFZLE1BQWM7UUFBMUIsaUJBMENDO1FBeENDLElBQU0sU0FBUyxHQUFHLFVBQUMsR0FBc0M7WUFDdkQsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDdkIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDL0IsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7UUFDSCxDQUFDLENBQUM7UUFFRixJQUFNLE1BQU0sR0FBRyxVQUFDLElBQVk7WUFDMUIsc0JBQXNCO1lBQ3BCLHFEQUFxRDtZQUN2RCxJQUFJO1lBRUosaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixJ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QUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRTtvQkFDWixLQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2pDO2FBQ0Y7UUFDSCxDQUFDLENBQUM7UUFDRixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBQ0gsV0FBQztBQUFELENBQUMsQUFqS0QsSUFpS0M7QUFqS1ksb0JBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQge1dvcmtlciwgV29ya2VyT3B0aW9uc30gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHtDaGlsZFByb2Nlc3MsIGZvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gaW1wb3J0IHtxdWV1ZX0gZnJvbSAnLi9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQge1Rhc2ssIENvbW1hbmQsIEluaXRpYWxPcHRpb25zfSBmcm9tICcuL3dvcmtlcic7XG5cbmltcG9ydCB7VGFzayBhcyBQcm9jZXNzVGFzaywgSW5pdGlhbE9wdGlvbnMgYXMgSW5pdGlhbE9wdGlvbnM0UHJvY30gZnJvbSAnLi93b3JrZXItcHJvY2Vzcyc7XG5cbmltcG9ydCBvcyBmcm9tICdvcyc7XG5leHBvcnQge1Rhc2t9O1xuXG5jbGFzcyBQcm9taXNlZFRhc2s8VD4ge1xuICBwcm9taXNlOiBQcm9taXNlPFQ+O1xuXG4gIHJlc29sdmU6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMF07XG4gIHJlamVjdDogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlsxXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRhc2s6IFRhc2ssIHZlcmJvc2UgPSBmYWxzZSkge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkJ5V29ya2VyKHdvcmtlcjogV29ya2VyKSB7XG5cbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JzsgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVzb2x2ZShtc2cuZGF0YSk7XG4gICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVqZWN0KG1zZy5kYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgb25FeGl0ID0gKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgLy8gaWYgKHRoaXMudmVyYm9zZSkge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBQcm9taXNlZFRhc2sgb24gZXhpdCcpO1xuICAgICAgLy8gfVxuXG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QoYFRocmVhZCAke3dvcmtlci50aHJlYWRJZH0gZXhpc3Qgd2l0aCBjb2RlIGAgKyBjb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdW5zdWJzY3JpYmVXb3JrZXIgPSAoKSA9PiB7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICAgIHdvcmtlci5vZmYoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdvcmtlci5vZmYoJ2V4aXQnLCBvbkV4aXQpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbkVycm9yID0gKGVycjogYW55KSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgdGhpcy5yZWplY3QoZXJyKTtcbiAgICB9O1xuXG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpOyAvLyBUT0RPOiBub3Qgc3VyZSBpZiB3b3JrIHdpbGwgZXhpdFxuICAgIHdvcmtlci5vbignZXJyb3InLCBvbkVycm9yKTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbkV4aXQpO1xuICAgIGNvbnN0IG1zZyA9IHsuLi50aGlzLnRhc2t9O1xuICAgIGRlbGV0ZSBtc2cudHJhbnNmZXJMaXN0O1xuICAgIHdvcmtlci5wb3N0TWVzc2FnZShtc2csIG1zZy50cmFuc2Zlckxpc3QpO1xuICB9XG59XG5cbmNsYXNzIFByb21pc2VkUHJvY2Vzc1Rhc2s8VD4ge1xuICBwcm9taXNlOiBQcm9taXNlPFQ+O1xuXG4gIHJlc29sdmU6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMF07XG4gIHJlamVjdDogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlsxXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRhc2s6IFByb2Nlc3NUYXNrIHwgSW5pdGlhbE9wdGlvbnM0UHJvYykge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuICBydW5CeVByb2Nlc3Mod29ya2VyOiBDaGlsZFByb2Nlc3MsIHZlcmJvc2U6IGJvb2xlYW4pIHtcblxuICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IHt0eXBlOiAnZXJyb3InIHwgJ3dhaXQnOyBkYXRhOiBUfSkgPT4ge1xuICAgICAgaWYgKG1zZy50eXBlID09PSAnd2FpdCcpIHtcbiAgICAgICAgdGhpcy5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgdGhpcy5yZWplY3QobXNnLmRhdGEpO1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QoJ0NoaWxkIHByb2Nlc3MgZXhpc3Qgd2l0aCBjb2RlICcgKyBjb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdW5zdWJzY3JpYmVXb3JrZXIgPSAoKSA9PiB7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICAgIHdvcmtlci5vZmYoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAvLyB3b3JrZXIub2ZmKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdvcmtlci5vZmYoJ2V4aXQnLCBvbkV4aXQpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbkVycm9yID0gKGVycjogYW55KSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgdGhpcy5yZWplY3QoZXJyKTtcbiAgICB9O1xuXG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICAvLyB3b3JrZXIub24oJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpOyAvLyBUT0RPOiBub3Qgc3VyZSBpZiB3b3JrIHdpbGwgZXhpdFxuICAgIHdvcmtlci5vbignZXJyb3InLCBvbkVycm9yKTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbkV4aXQpO1xuICAgIGNvbnN0IG1zZyA9IHsuLi50aGlzLnRhc2ssIHZlcmJvc2V9O1xuICAgIGlmICghd29ya2VyLnNlbmQobXNnKSkge1xuICAgICAgdGhpcy5yZWplY3QoJ0lzIENoaWxkIHByb2Nlc3MgZXZlbnQgdGhyZXNob2xkIGZ1bGw/IFRoaXMgaXMgd2VpcmQuJyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQb29sIHtcbiAgcHJpdmF0ZSBydW5uaW5nV29ya2VycyA9IG5ldyBTZXQ8V29ya2VyIHwgQ2hpbGRQcm9jZXNzPigpO1xuICAvKiogTGFzdCBpbiBmaXJzdCBydW4sIGFsd2F5cyBydW4gdGhlIGxhdGVzdCBjcmVhdGVkIHdvcmtlciwgZ2l2ZSBjaGFuY2UgZm9yIG9sZCBvbmVzIHRvIGJlIHJlbW92ZWQgYWZ0ZXIgdGltZW91dCAqL1xuICBwcml2YXRlIGlkbGVXb3JrZXJzOiAoV29ya2VyIHwgQ2hpbGRQcm9jZXNzKVtdID0gW107XG5cbiAgcHJpdmF0ZSBpZGxlVGltZXJzID0gbmV3IFdlYWtNYXA8V29ya2VyIHwgQ2hpbGRQcm9jZXNzLCBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0Pj4oKTtcblxuICBwcml2YXRlIHRhc2tzOiAoUHJvbWlzZWRUYXNrPGFueT4gfCBQcm9taXNlZFByb2Nlc3NUYXNrPGFueT4pW10gPSBbXTtcbiAgcHJpdmF0ZSB0b3RhbENyZWF0ZWRXb3JrZXJzID0gMDtcbiAgLyoqXG4gICAqIEBwYXJhbSBtYXhQYXJhbGxlIG1heCBudW1iZXIgb2YgcGFyYWxsZSB3b3JrZXJzLCBkZWZhdWx0IGlzIGBvcy5jcHVzKCkubGVuZ3RoIC0gMWBcbiAgICogQHBhcmFtIGlkbGVUaW1lTXMgbGV0IHdvcmtlciBleGl0IHRvIHJlbGVhc2UgbWVtb3J5LCBhZnRlciBhIHdvcmtlciBiZWluZyBpZGxlIGZvciBzb21lIHRpbWUgKGluIG1zKVxuICAgKiBAcGFyYW0gd29ya2VyT3B0aW9ucyB0aHJlYWQgd29ya2VyIG9wdGlvbnMsIGUuZy4gaW5pdGlhbGl6aW5nIHNvbWUgZW52aXJvbm1lbnRcbiAgICogc3R1ZmZcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWF4UGFyYWxsZSA9IG9zLmNwdXMoKS5sZW5ndGggLSAxLCBwcml2YXRlIGlkbGVUaW1lTXMgPSAwLCBwdWJsaWMgd29ya2VyT3B0aW9ucz86IFdvcmtlck9wdGlvbnMgJiBJbml0aWFsT3B0aW9ucykge1xuICB9XG5cbiAgc3VibWl0PFQ+KHRhc2s6IFRhc2spOiBQcm9taXNlPFQ+IHtcbiAgICAvLyAxLiBCaW5kIGEgdGFzayB3aXRoIGEgcHJvbWlzZVxuICAgIGNvbnN0IHByb21pc2VkVGFzayA9IG5ldyBQcm9taXNlZFRhc2s8VD4odGFzaywgdGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBzdWJtaXQgdGFzaywgaWRsZSB3b3JrZXJzOiAke3RoaXMuaWRsZVdvcmtlcnMubGVuZ3RofSwgcnVubmluZyB3b3JrZXJzOiAke3RoaXMucnVubmluZ1dvcmtlcnMuc2l6ZX1gKTtcbiAgICB9XG4gICAgdGhpcy50YXNrcy5wdXNoKHByb21pc2VkVGFzayk7XG4gICAgaWYgKHRoaXMuaWRsZVdvcmtlcnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gMi4gTG9vayBmb3IgYXZhaWxhYmUgaWRsZSB3b3JrZXJcbiAgICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuaWRsZVdvcmtlcnMucG9wKCkhO1xuICAgICAgdm9pZCB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5zaXplIDwgdGhpcy5tYXhQYXJhbGxlKSB7XG4gICAgICAvLyAzLiBDcmVhdGUgbmV3IHdvcmtlciBpZiBudW1iZXIgb2YgdGhlbSBpcyBsZXNzIHRoYW4gbWF4UGFyYWxsZVxuICAgICAgdGhpcy5jcmVhdGVXb3JrZXIocHJvbWlzZWRUYXNrKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2VkVGFzay5wcm9taXNlO1xuICB9XG5cbiAgc3VibWl0UHJvY2VzczxUPih0YXNrOiBQcm9jZXNzVGFzayk6IFByb21pc2U8VD4ge1xuICAgIC8vIDEuIEJpbmQgYSB0YXNrIHdpdGggYSBwcm9taXNlXG4gICAgY29uc3QgcHJvbWlzZWRUYXNrID0gbmV3IFByb21pc2VkUHJvY2Vzc1Rhc2s8VD4odGFzayk7XG5cbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gc3VibWl0IGNoaWxkIHByb2Nlc3MsIGlkbGUgcHJvY2VzczogJHt0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aH0sIGAgK1xuICAgICAgYHJ1bm5pbmcgcHJvY2VzcyBvciB3b3JrZXJzOiAke3RoaXMucnVubmluZ1dvcmtlcnMuc2l6ZX1gKTtcbiAgICB9XG4gICAgdGhpcy50YXNrcy5wdXNoKHByb21pc2VkVGFzayk7XG4gICAgaWYgKHRoaXMuaWRsZVdvcmtlcnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gMi4gTG9vayBmb3IgYXZhaWxhYmUgaWRsZSB3b3JrZXJcbiAgICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuaWRsZVdvcmtlcnMucG9wKCkhO1xuICAgICAgdm9pZCB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5zaXplIDwgdGhpcy5tYXhQYXJhbGxlKSB7XG4gICAgICAvLyAzLiBDcmVhdGUgbmV3IHdvcmtlciBpZiBudW1iZXIgb2YgdGhlbSBpcyBsZXNzIHRoYW4gbWF4UGFyYWxsZVxuICAgICAgdm9pZCB0aGlzLmNyZWF0ZUNoaWxkUHJvY2VzcygpO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrLnByb21pc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1bldvcmtlcih3b3JrZXI6IFdvcmtlciB8IENoaWxkUHJvY2Vzcykge1xuICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuICAgIHdoaWxlICh0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tzLnNoaWZ0KCkhO1xuICAgICAgaWYgKHdvcmtlciBpbnN0YW5jZW9mIFdvcmtlcilcbiAgICAgICAgKHRhc2sgYXMgUHJvbWlzZWRUYXNrPGFueT4pLnJ1bkJ5V29ya2VyKHdvcmtlcik7XG4gICAgICBlbHNlXG4gICAgICAgICh0YXNrIGFzIFByb21pc2VkUHJvY2Vzc1Rhc2s8YW55PikucnVuQnlQcm9jZXNzKHdvcmtlciwgISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuICAgICAgYXdhaXQgdGFzay5wcm9taXNlLmNhdGNoKGUgPT4ge30pO1xuICAgIH1cbiAgICAvLyBObyBtb3JlIHRhc2ssIHB1dCB3b3JrZXIgaW4gaWRsZVxuICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgdGhpcy5pZGxlV29ya2Vycy5wdXNoKHdvcmtlcik7XG5cbiAgICAvLyBzZXR1cCBpZGxlIHRpbWVyXG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnN0IGNtZDogQ29tbWFuZCA9IHtleGl0OiB0cnVlfTtcbiAgICAgIGlmICh3b3JrZXIgaW5zdGFuY2VvZiBXb3JrZXIpIHtcbiAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKGNtZCk7XG4gICAgICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBSZW1vdmUgZXhwaXJlZCB3b3JrZXIgdGhyZWFkOicsIHdvcmtlci50aHJlYWRJZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3b3JrZXIuc2VuZChjbWQpO1xuICAgICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKVxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gUmVtb3ZlIGV4cGlyZWQgY2hpbGQgcHJvY2VzczonLCB3b3JrZXIucGlkKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICB9LCB0aGlzLmlkbGVUaW1lTXMpO1xuICAgIHRoaXMuaWRsZVRpbWVycy5zZXQod29ya2VyLCB0aW1lcik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZUNoaWxkUHJvY2VzcygpIHtcbiAgICBsZXQgd29ya2VyOiBDaGlsZFByb2Nlc3MgPSBmb3JrKHJlcXVpcmUucmVzb2x2ZSgnLi93b3JrZXItcHJvY2VzcycpLCB7c2VyaWFsaXphdGlvbjogJ2FkdmFuY2VkJywgc3RkaW86ICdpbmhlcml0J30pO1xuICAgIHRoaXMucnVubmluZ1dvcmtlcnMuYWRkKHdvcmtlcik7XG5cbiAgICAvLyBpZiAodGhpcy53b3JrZXJPcHRpb25zICYmICh0aGlzLndvcmtlck9wdGlvbnMudmVyYm9zZSB8fCB0aGlzLndvcmtlck9wdGlvbnMuaW5pdGlhbGl6ZXIpKSB7XG4gICAgY29uc3QgdmVyYm9zZSA9ICEhdGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlO1xuICAgIGlmICh2ZXJib3NlKVxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIGNyZWF0ZUNoaWxkUHJvY2VzcycpO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXIpIHtcbiAgICAgIGNvbnN0IGluaXRUYXNrID0gbmV3IFByb21pc2VkUHJvY2Vzc1Rhc2soe1xuICAgICAgICB2ZXJib3NlLFxuICAgICAgICBpbml0aWFsaXplcjogdGhpcy53b3JrZXJPcHRpb25zPy5pbml0aWFsaXplclxuICAgICAgICB9KTtcbiAgICAgIGluaXRUYXNrLnJ1bkJ5UHJvY2Vzcyh3b3JrZXIsICEhdGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKTtcbiAgICAgIGF3YWl0IGluaXRUYXNrLnByb21pc2U7XG4gICAgfVxuICAgIC8vIH1cbiAgICB2b2lkIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG5cbiAgICBjb25zdCBvbldvcmtlckV4aXQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5oYXMod29ya2VyKSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5pZGxlV29ya2Vycy5pbmRleE9mKHdvcmtlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuaWRsZVdvcmtlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdvcmtlci5vbignZXJyb3InLCBvbldvcmtlckV4aXQpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uV29ya2VyRXhpdCk7XG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlV29ya2VyKHRhc2s6IFByb21pc2VkVGFzazxhbnk+KSB7XG4gICAgbGV0IHdvcmtlcjogV29ya2VyO1xuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gY3JlYXRlV29ya2VyJyk7XG4gICAgfVxuICAgIHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlcicpLCB7XG4gICAgICAuLi50aGlzLndvcmtlck9wdGlvbnMsXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICB3b3JrZXJEYXRhOiB7XG4gICAgICAgIGlkOiArK3RoaXMudG90YWxDcmVhdGVkV29ya2VycyArICcnLFxuICAgICAgICB2ZXJib3NlOiAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXIsXG4gICAgICAgIC4uLnRoaXMud29ya2VyT3B0aW9ucz8ud29ya2VyRGF0YSB8fCB7fVxuICAgICAgfVxuICAgIH0pO1xuICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcblxuICAgIGNvbnN0IG9uV29ya2VyRXhpdCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLmhhcyh3b3JrZXIpKSB7XG4gICAgICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmlkbGVXb3JrZXJzLmluZGV4T2Yod29ya2VyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uV29ya2VyRXhpdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25Xb3JrZXJFeGl0KTtcbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG59XG4iXX0=