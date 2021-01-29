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
    function PromisedTask(task) {
        var _this = this;
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
    PromisedProcessTask.prototype.runByProcess = function (worker) {
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
        var msg = __assign({}, this.task);
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
        var _a;
        // 1. Bind a task with a promise
        var promisedTask = new PromisedTask(task);
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
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
        return __awaiter(this, void 0, void 0, function () {
            var task, timer;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.idleTimers.delete(worker);
                        this.runningWorkers.add(worker);
                        _a.label = 1;
                    case 1:
                        if (!(this.tasks.length > 0)) return [3 /*break*/, 3];
                        task = this.tasks.shift();
                        if (worker instanceof worker_threads_1.Worker)
                            task.runByWorker(worker);
                        else
                            task.runByProcess(worker);
                        return [4 /*yield*/, task.promise];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        // No more task, put worker in idle
                        this.runningWorkers.delete(worker);
                        this.idleWorkers.push(worker);
                        timer = setTimeout(function () {
                            var cmd = { exit: true };
                            if (worker instanceof worker_threads_1.Worker) {
                                worker.postMessage(cmd);
                            }
                            else {
                                worker.send(cmd);
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
        return __awaiter(this, void 0, void 0, function () {
            var worker, initTask, onWorkerExit;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
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
                        initTask.runByProcess(worker);
                        return [4 /*yield*/, initTask.promise];
                    case 1:
                        _a.sent();
                        _a.label = 2;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QixpREFBcUQ7QUFDckQsK0NBQWlEO0FBTWpELDBDQUFvQjtBQUdwQjtJQU1FLHNCQUFvQixJQUFVO1FBQTlCLGlCQUtDO1FBTG1CLFNBQUksR0FBSixJQUFJLENBQU07UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBSSxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQzVDLEtBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1lBQ3ZCLEtBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGtDQUFXLEdBQVgsVUFBWSxNQUFjO1FBQTFCLGlCQXNDQztRQXBDQyxJQUFNLFNBQVMsR0FBRyxVQUFDLEdBQXNDO1lBQ3ZELElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7Z0JBQ3ZCLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3hCO2lCQUFNLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7Z0JBQy9CLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLEtBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3ZCO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsSUFBTSxNQUFNLEdBQUcsVUFBQyxJQUFZO1lBQzFCLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNkLEtBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLEdBQUcsSUFBSSxD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QUMsT0FBTztvQkFDbkMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVztpQkFBQyxJQUN6QyxJQUFJLENBQUMsYUFBYSxFQUN2QixDQUFDO1NBQ0o7YUFBTTtZQUNMLE1BQU0sR0FBRyxJQUFJLHVCQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDdEU7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXZCLElBQU0sWUFBWSxHQUFHO1lBQ25CLElBQUksS0FBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ25DLEtBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLElBQU0sR0FBRyxHQUFHLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7b0JBQ1osS0FBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNqQzthQUNGO1FBQ0gsQ0FBQyxDQUFDO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDaEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUNILFdBQUM7QUFBRCxDQUFDLEFBdkpELElBdUpDO0FBdkpZLG9CQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IHtXb3JrZXIsIFdvcmtlck9wdGlvbnN9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB7Q2hpbGRQcm9jZXNzLCBmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCB7cXVldWV9IGZyb20gJy4vcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0IHtUYXNrLCBDb21tYW5kLCBJbml0aWFsT3B0aW9uc30gZnJvbSAnLi93b3JrZXInO1xuXG5pbXBvcnQge1Rhc2sgYXMgUHJvY2Vzc1Rhc2ssIEluaXRpYWxPcHRpb25zIGFzIEluaXRpYWxPcHRpb25zNFByb2N9IGZyb20gJy4vd29ya2VyLXByb2Nlc3MnO1xuXG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuZXhwb3J0IHtUYXNrfTtcblxuY2xhc3MgUHJvbWlzZWRUYXNrPFQ+IHtcbiAgcHJvbWlzZTogUHJvbWlzZTxUPjtcblxuICByZXNvbHZlOiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzBdO1xuICByZWplY3Q6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMV07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0YXNrOiBUYXNrKSB7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG5cbiAgcnVuQnlXb3JrZXIod29ya2VyOiBXb3JrZXIpIHtcblxuICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IHt0eXBlOiAnZXJyb3InIHwgJ3dhaXQnLCBkYXRhOiBUfSkgPT4ge1xuICAgICAgaWYgKG1zZy50eXBlID09PSAnd2FpdCcpIHtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgICAgdGhpcy5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgICAgdGhpcy5yZWplY3QobXNnLmRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QoJ1RocmVhZCBleGlzdCB3aXRoIGNvZGUgJyArIGNvZGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB1bnN1YnNjcmliZVdvcmtlciA9ICgpID0+IHtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgICAgd29ya2VyLm9mZignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignZXhpdCcsIG9uRXhpdCk7XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBhbnkpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB0aGlzLnJlamVjdChlcnIpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgb25FcnJvcik7IC8vIFRPRE86IG5vdCBzdXJlIGlmIHdvcmsgd2lsbCBleGl0XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0gey4uLnRoaXMudGFza307XG4gICAgZGVsZXRlIG1zZy50cmFuc2Zlckxpc3Q7XG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKG1zZywgbXNnLnRyYW5zZmVyTGlzdCk7XG4gIH1cbn1cblxuY2xhc3MgUHJvbWlzZWRQcm9jZXNzVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXTtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogUHJvY2Vzc1Rhc2sgfCBJbml0aWFsT3B0aW9uczRQcm9jKSB7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG4gIHJ1bkJ5UHJvY2Vzcyh3b3JrZXI6IENoaWxkUHJvY2Vzcykge1xuXG4gICAgY29uc3Qgb25NZXNzYWdlID0gKG1zZzoge3R5cGU6ICdlcnJvcicgfCAnd2FpdCcsIGRhdGE6IFR9KSA9PiB7XG4gICAgICBpZiAobXNnLnR5cGUgPT09ICd3YWl0Jykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlamVjdChtc2cuZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXhpdCA9IChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdCgnQ2hpbGQgcHJvY2VzcyBleGlzdCB3aXRoIGNvZGUgJyArIGNvZGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB1bnN1YnNjcmliZVdvcmtlciA9ICgpID0+IHtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgICAgd29ya2VyLm9mZignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIC8vIHdvcmtlci5vZmYoJ21lc3NhZ2VlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignZXhpdCcsIG9uRXhpdCk7XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBhbnkpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB0aGlzLnJlamVjdChlcnIpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIC8vIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgb25FcnJvcik7IC8vIFRPRE86IG5vdCBzdXJlIGlmIHdvcmsgd2lsbCBleGl0XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0gey4uLnRoaXMudGFza307XG4gICAgaWYgKCF3b3JrZXIuc2VuZChtc2cpKSB7XG4gICAgICB0aGlzLnJlamVjdCgnSXMgQ2hpbGQgcHJvY2VzcyBldmVudCB0aHJlc2hvbGQgZnVsbD8gVGhpcyBpcyB3ZWlyZC4nKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBvb2wge1xuICBwcml2YXRlIHJ1bm5pbmdXb3JrZXJzID0gbmV3IFNldDxXb3JrZXJ8Q2hpbGRQcm9jZXNzPigpO1xuICAvKiogTGFzdCBpbiBmaXJzdCBydW4sIGFsd2F5cyBydW4gdGhlIGxhdGVzdCBjcmVhdGVkIHdvcmtlciwgZ2l2ZSBjaGFuY2UgZm9yIG9sZCBvbmVzIHRvIGJlIHJlbW92ZWQgYWZ0ZXIgdGltZW91dCAqL1xuICBwcml2YXRlIGlkbGVXb3JrZXJzOiAoV29ya2VyfENoaWxkUHJvY2VzcylbXSA9IFtdO1xuXG4gIHByaXZhdGUgaWRsZVRpbWVycyA9IG5ldyBXZWFrTWFwPFdvcmtlciB8IENoaWxkUHJvY2VzcywgUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4+KCk7XG5cbiAgcHJpdmF0ZSB0YXNrczogKFByb21pc2VkVGFzazxhbnk+IHwgUHJvbWlzZWRQcm9jZXNzVGFzazxhbnk+KVtdID0gW107XG4gIHByaXZhdGUgdG90YWxDcmVhdGVkV29ya2VycyA9IDA7XG4gIC8qKlxuICAgKiBAcGFyYW0gbWF4UGFyYWxsZSBtYXggbnVtYmVyIG9mIHBhcmFsbGUgd29ya2VycywgZGVmYXVsdCBpcyBgb3MuY3B1cygpLmxlbmd0aCAtIDFgXG4gICAqIEBwYXJhbSBpZGxlVGltZU1zIGxldCB3b3JrZXIgZXhpdCB0byByZWxlYXNlIG1lbW9yeSwgYWZ0ZXIgYSB3b3JrZXIgYmVpbmcgaWRsZSBmb3Igc29tZSB0aW1lIChpbiBtcylcbiAgICogQHBhcmFtIHdvcmtlck9wdGlvbnMgdGhyZWFkIHdvcmtlciBvcHRpb25zLCBlLmcuIGluaXRpYWxpemluZyBzb21lIGVudmlyb25tZW50XG4gICAqIHN0dWZmXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1heFBhcmFsbGUgPSBvcy5jcHVzKCkubGVuZ3RoIC0gMSwgcHJpdmF0ZSBpZGxlVGltZU1zID0gMCwgcHJpdmF0ZSB3b3JrZXJPcHRpb25zPzogV29ya2VyT3B0aW9ucyAmIEluaXRpYWxPcHRpb25zKSB7XG4gIH1cblxuICBzdWJtaXQ8VD4odGFzazogVGFzayk6IFByb21pc2U8VD4ge1xuICAgIC8vIDEuIEJpbmQgYSB0YXNrIHdpdGggYSBwcm9taXNlXG4gICAgY29uc3QgcHJvbWlzZWRUYXNrID0gbmV3IFByb21pc2VkVGFzazxUPih0YXNrKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHN1Ym1pdCB0YXNrLCBpZGxlIHdvcmtlcnM6ICR7dGhpcy5pZGxlV29ya2Vycy5sZW5ndGh9LCBydW5uaW5nIHdvcmtlcnM6ICR7dGhpcy5ydW5uaW5nV29ya2Vycy5zaXplfWApO1xuICAgIH1cbiAgICB0aGlzLnRhc2tzLnB1c2gocHJvbWlzZWRUYXNrKTtcbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5zaXplIDwgdGhpcy5tYXhQYXJhbGxlKSB7XG4gICAgICAvLyAzLiBDcmVhdGUgbmV3IHdvcmtlciBpZiBudW1iZXIgb2YgdGhlbSBpcyBsZXNzIHRoYW4gbWF4UGFyYWxsZVxuICAgICAgdGhpcy5jcmVhdGVXb3JrZXIocHJvbWlzZWRUYXNrKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2VkVGFzay5wcm9taXNlO1xuICB9XG5cbiAgc3VibWl0UHJvY2VzczxUPih0YXNrOiBQcm9jZXNzVGFzayk6IFByb21pc2U8VD4ge1xuICAgIC8vIDEuIEJpbmQgYSB0YXNrIHdpdGggYSBwcm9taXNlXG4gICAgY29uc3QgcHJvbWlzZWRUYXNrID0gbmV3IFByb21pc2VkUHJvY2Vzc1Rhc2s8VD4odGFzayk7XG5cbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBzdWJtaXQgY2hpbGQgcHJvY2VzcywgaWRsZSBwcm9jZXNzOiAke3RoaXMuaWRsZVdvcmtlcnMubGVuZ3RofSwgYCArXG4gICAgICBgcnVubmluZyBwcm9jZXNzIG9yIHdvcmtlcnM6ICR7dGhpcy5ydW5uaW5nV29ya2Vycy5zaXplfWApO1xuICAgIH1cbiAgICB0aGlzLnRhc2tzLnB1c2gocHJvbWlzZWRUYXNrKTtcbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5zaXplIDwgdGhpcy5tYXhQYXJhbGxlKSB7XG4gICAgICAvLyAzLiBDcmVhdGUgbmV3IHdvcmtlciBpZiBudW1iZXIgb2YgdGhlbSBpcyBsZXNzIHRoYW4gbWF4UGFyYWxsZVxuICAgICAgdGhpcy5jcmVhdGVDaGlsZFByb2Nlc3MoKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2VkVGFzay5wcm9taXNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5Xb3JrZXIod29ya2VyOiBXb3JrZXIgfCBDaGlsZFByb2Nlc3MpIHtcbiAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5hZGQod29ya2VyKTtcbiAgICB3aGlsZSAodGhpcy50YXNrcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrcy5zaGlmdCgpITtcbiAgICAgIGlmICh3b3JrZXIgaW5zdGFuY2VvZiBXb3JrZXIpXG4gICAgICAgICh0YXNrIGFzIFByb21pc2VkVGFzazxhbnk+KS5ydW5CeVdvcmtlcih3b3JrZXIpO1xuICAgICAgZWxzZVxuICAgICAgICAodGFzayBhcyBQcm9taXNlZFByb2Nlc3NUYXNrPGFueT4pLnJ1bkJ5UHJvY2Vzcyh3b3JrZXIpO1xuICAgICAgYXdhaXQgdGFzay5wcm9taXNlO1xuICAgIH1cbiAgICAvLyBObyBtb3JlIHRhc2ssIHB1dCB3b3JrZXIgaW4gaWRsZVxuICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgdGhpcy5pZGxlV29ya2Vycy5wdXNoKHdvcmtlcik7XG5cbiAgICAvLyBzZXR1cCBpZGxlIHRpbWVyXG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnN0IGNtZDogQ29tbWFuZCA9IHtleGl0OiB0cnVlfTtcbiAgICAgIGlmICh3b3JrZXIgaW5zdGFuY2VvZiBXb3JrZXIpIHtcbiAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKGNtZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3b3JrZXIuc2VuZChjbWQpO1xuICAgICAgfVxuICAgICAgdGhpcy5pZGxlVGltZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIH0sIHRoaXMuaWRsZVRpbWVNcyk7XG4gICAgdGhpcy5pZGxlVGltZXJzLnNldCh3b3JrZXIsIHRpbWVyKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQ2hpbGRQcm9jZXNzKCkge1xuICAgIGxldCB3b3JrZXI6IENoaWxkUHJvY2VzcyA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlci1wcm9jZXNzJyksIHtzZXJpYWxpemF0aW9uOiAnYWR2YW5jZWQnLCBzdGRpbzogJ2luaGVyaXQnfSk7XG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5hZGQod29ya2VyKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnMgJiYgKHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlIHx8IHRoaXMud29ya2VyT3B0aW9ucy5pbml0aWFsaXplcikpIHtcblxuICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlKVxuICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBjcmVhdGVDaGlsZFByb2Nlc3MnKTtcblxuICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucy5pbml0aWFsaXplcikge1xuICAgICAgICBjb25zdCBpbml0VGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrKHtcbiAgICAgICAgICB2ZXJib3NlOiB0aGlzLndvcmtlck9wdGlvbnMudmVyYm9zZSxcbiAgICAgICAgICBpbml0aWFsaXplcjogdGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyXG4gICAgICAgICAgfSk7XG4gICAgICAgIGluaXRUYXNrLnJ1bkJ5UHJvY2Vzcyh3b3JrZXIpO1xuICAgICAgICBhd2FpdCBpbml0VGFzay5wcm9taXNlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuXG4gICAgY29uc3Qgb25Xb3JrZXJFeGl0ID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuaGFzKHdvcmtlcikpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaWRsZVdvcmtlcnMuaW5kZXhPZih3b3JrZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25Xb3JrZXJFeGl0KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbldvcmtlckV4aXQpO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVdvcmtlcih0YXNrOiBQcm9taXNlZFRhc2s8YW55Pikge1xuICAgIGxldCB3b3JrZXI6IFdvcmtlcjtcbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zICYmICh0aGlzLndvcmtlck9wdGlvbnMudmVyYm9zZSB8fCB0aGlzLndvcmtlck9wdGlvbnMuaW5pdGlhbGl6ZXIpKSB7XG4gICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UpXG4gICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIGNyZWF0ZVdvcmtlcicpO1xuICAgICAgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyJyksIHtcbiAgICAgICAgd29ya2VyRGF0YToge1xuICAgICAgICAgIGlkOiArK3RoaXMudG90YWxDcmVhdGVkV29ya2VycyArICcnLFxuICAgICAgICAgIHZlcmJvc2U6IHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIGluaXRpYWxpemVyOiB0aGlzLndvcmtlck9wdGlvbnMuaW5pdGlhbGl6ZXJ9LFxuICAgICAgICAgIC4uLnRoaXMud29ya2VyT3B0aW9uc1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlcicpLCB0aGlzLndvcmtlck9wdGlvbnMpO1xuICAgIH1cbiAgICB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuXG4gICAgY29uc3Qgb25Xb3JrZXJFeGl0ID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuaGFzKHdvcmtlcikpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaWRsZVdvcmtlcnMuaW5kZXhPZih3b3JrZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25Xb3JrZXJFeGl0KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbldvcmtlckV4aXQpO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cbn1cbiJdfQ==