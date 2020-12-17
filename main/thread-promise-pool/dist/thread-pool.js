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
    PromisedTask.prototype.runByWorker = function (worker, next) {
        var _this = this;
        var onMessage = function (msg) {
            if (msg.type === 'wait') {
                _this.resolve(msg.data);
            }
            else if (msg.type === 'error') {
                _this.reject(msg.data);
            }
            unsubscribeWorker();
            next();
        };
        var onExit = function (code) {
            if (code !== 0) {
                _this.reject('Thread exist with code ' + code);
            }
        };
        var unsubscribeWorker = function () {
            worker.off('message', onMessage);
            worker.off('error', _this.reject);
            worker.off('messageerror', _this.reject);
            worker.off('exit', onExit);
        };
        worker.on('message', onMessage);
        worker.on('messageerror', this.reject); // TODO: not sure if work will exit
        worker.on('error', this.reject);
        worker.on('exit', onExit);
        var msg = __assign({}, this.task);
        delete msg.transferList;
        worker.postMessage(msg, msg.transferList);
    };
    return PromisedTask;
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
        return __awaiter(this, void 0, void 0, function () {
            var promisedTask, worker;
            return __generator(this, function (_b) {
                promisedTask = new PromisedTask(task);
                if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
                    console.log("[thread-pool] submit task, idle workers: " + this.idleWorkers.length + ", running workers: " + this.runningWorkers.size);
                }
                if (this.idleWorkers.length > 0) {
                    worker = this.idleWorkers.pop();
                    this.runWorker(promisedTask, worker);
                }
                else if (this.runningWorkers.size < this.maxParalle) {
                    // 3. Create new worker if number of them is less than maxParalle
                    this.createWorker(promisedTask);
                }
                else {
                    // 4. put task with promise in the queue/channel to wait
                    this.tasks.push(promisedTask);
                }
                return [2 /*return*/, promisedTask.promise];
            });
        });
    };
    Pool.prototype.runWorker = function (task, worker) {
        var _this = this;
        this.idleTimers.delete(worker);
        this.runningWorkers.add(worker);
        task.runByWorker(worker, function () {
            if (_this.tasks.length > 0) {
                // continue work on next task
                _this.runWorker(_this.tasks.shift(), worker);
            }
            else {
                // No more task, put worker in idle
                _this.runningWorkers.delete(worker);
                _this.idleWorkers.push(worker);
                // setup idle timer
                var timer = setTimeout(function () {
                    var cmd = { exit: true };
                    worker.postMessage(cmd);
                    _this.idleTimers.delete(worker);
                }, _this.idleTimeMs);
                _this.idleTimers.set(worker, timer);
            }
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
        this.runWorker(task, worker);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QixpREFBcUQ7QUFHckQsMENBQW9CO0FBR3BCO0lBTUUsc0JBQW9CLElBQVU7UUFBOUIsaUJBS0M7UUFMbUIsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDNUMsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsS0FBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsa0NBQVcsR0FBWCxVQUFZLE1BQWMsRUFBRSxJQUFnQjtRQUE1QyxpQkErQkM7UUE5QkMsSUFBTSxTQUFTLEdBQUcsVUFBQyxHQUFzQztZQUN2RCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO2dCQUN2QixLQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN4QjtpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFO2dCQUMvQixLQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN2QjtZQUNELGlCQUFpQixFQUFFLENBQUM7WUFDcEIsSUFBSSxFQUFFLENBQUM7UUFDVCxDQUFDLENBQUM7UUFFRixJQUFNLE1BQU0sR0FBRyxVQUFDLElBQVk7WUFDMUIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNkLEtBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLENBQUM7YUFDL0M7UUFDSCxDQUFDLENBQUM7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QUM7SUFDaEIsQ0FBQztJQUNILFdBQUM7QUFBRCxDQUFDLEFBL0ZELElBK0ZDO0FBL0ZZLG9CQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IHtXb3JrZXIsIFdvcmtlck9wdGlvbnN9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbi8vIGltcG9ydCB7cXVldWV9IGZyb20gJy4vcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0IHtUYXNrLCBDb21tYW5kLCBJbml0aWFsT3B0aW9uc30gZnJvbSAnLi93b3JrZXInO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmV4cG9ydCB7VGFza307XG5cbmNsYXNzIFByb21pc2VkVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXTtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogVGFzaykge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkJ5V29ya2VyKHdvcmtlcjogV29ya2VyLCBuZXh0OiAoKSA9PiB2b2lkKSB7XG4gICAgY29uc3Qgb25NZXNzYWdlID0gKG1zZzoge3R5cGU6ICdlcnJvcicgfCAnd2FpdCcsIGRhdGE6IFR9KSA9PiB7XG4gICAgICBpZiAobXNnLnR5cGUgPT09ICd3YWl0Jykge1xuICAgICAgICB0aGlzLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB0aGlzLnJlamVjdChtc2cuZGF0YSk7XG4gICAgICB9XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdCgnVGhyZWFkIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIHRoaXMucmVqZWN0KTtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2VlcnJvcicsIHRoaXMucmVqZWN0KTtcbiAgICAgIHdvcmtlci5vZmYoJ2V4aXQnLCBvbkV4aXQpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgdGhpcy5yZWplY3QpOyAvLyBUT0RPOiBub3Qgc3VyZSBpZiB3b3JrIHdpbGwgZXhpdFxuICAgIHdvcmtlci5vbignZXJyb3InLCB0aGlzLnJlamVjdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrfTtcbiAgICBkZWxldGUgbXNnLnRyYW5zZmVyTGlzdDtcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UobXNnLCBtc2cudHJhbnNmZXJMaXN0KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9vbCB7XG4gIHByaXZhdGUgcnVubmluZ1dvcmtlcnMgPSBuZXcgU2V0PFdvcmtlcj4oKTtcbiAgLyoqIExhc3QgaW4gZmlyc3QgcnVuLCBhbHdheXMgcnVuIHRoZSBsYXRlc3QgY3JlYXRlZCB3b3JrZXIsIGdpdmUgY2hhbmNlIGZvciBvbGQgb25lcyB0byBiZSByZW1vdmVkIGFmdGVyIHRpbWVvdXQgKi9cbiAgcHJpdmF0ZSBpZGxlV29ya2VyczogV29ya2VyW10gPSBbXTtcblxuICBwcml2YXRlIGlkbGVUaW1lcnMgPSBuZXcgV2Vha01hcDxXb3JrZXIsIFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+PigpO1xuXG4gIHByaXZhdGUgdGFza3M6IFByb21pc2VkVGFzazxhbnk+W10gPSBbXTtcbiAgcHJpdmF0ZSB0b3RhbENyZWF0ZWRXb3JrZXJzID0gMDtcblxuICAvKipcbiAgICogQHBhcmFtIG1heFBhcmFsbGUgbWF4IG51bWJlciBvZiBwYXJhbGxlIHdvcmtlcnMsIGRlZmF1bHQgaXMgYG9zLmNwdXMoKS5sZW5ndGggLSAxYFxuICAgKiBAcGFyYW0gaWRsZVRpbWVNcyBsZXQgd29ya2VyIGV4aXQgdG8gcmVsZWFzZSBtZW1vcnksIGFmdGVyIGEgd29ya2VyIGJlaW5nIGlkbGUgZm9yIHNvbWUgdGltZSAoaW4gbXMpXG4gICAqIEBwYXJhbSB3b3JrZXJPcHRpb25zIHRocmVhZCB3b3JrZXIgb3B0aW9ucywgZS5nLiBpbml0aWFsaXppbmcgc29tZSBlbnZpcm9ubWVudFxuICAgKiBzdHVmZlxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXhQYXJhbGxlID0gb3MuY3B1cygpLmxlbmd0aCAtIDEsIHByaXZhdGUgaWRsZVRpbWVNcyA9IDAsIHByaXZhdGUgd29ya2VyT3B0aW9ucz86IFdvcmtlck9wdGlvbnMgJiBJbml0aWFsT3B0aW9ucykge1xuICB9XG5cbiAgYXN5bmMgc3VibWl0PFQ+KHRhc2s6IFRhc2spOiBQcm9taXNlPFQ+IHtcbiAgICAvLyAxLiBCaW5kIGEgdGFzayB3aXRoIGEgcHJvbWlzZVxuICAgIGNvbnN0IHByb21pc2VkVGFzayA9IG5ldyBQcm9taXNlZFRhc2s8VD4odGFzayk7XG5cbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBzdWJtaXQgdGFzaywgaWRsZSB3b3JrZXJzOiAke3RoaXMuaWRsZVdvcmtlcnMubGVuZ3RofSwgcnVubmluZyB3b3JrZXJzOiAke3RoaXMucnVubmluZ1dvcmtlcnMuc2l6ZX1gKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB0aGlzLnJ1bldvcmtlcihwcm9taXNlZFRhc2ssIHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZVdvcmtlcihwcm9taXNlZFRhc2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyA0LiBwdXQgdGFzayB3aXRoIHByb21pc2UgaW4gdGhlIHF1ZXVlL2NoYW5uZWwgdG8gd2FpdFxuICAgICAgdGhpcy50YXNrcy5wdXNoKHByb21pc2VkVGFzayk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHByaXZhdGUgcnVuV29ya2VyKHRhc2s6IFByb21pc2VkVGFzazxhbnk+LCB3b3JrZXI6IFdvcmtlcikge1xuICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuICAgIHRhc2sucnVuQnlXb3JrZXIod29ya2VyLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy50YXNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIGNvbnRpbnVlIHdvcmsgb24gbmV4dCB0YXNrXG4gICAgICAgIHRoaXMucnVuV29ya2VyKHRoaXMudGFza3Muc2hpZnQoKSEsIHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBObyBtb3JlIHRhc2ssIHB1dCB3b3JrZXIgaW4gaWRsZVxuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnB1c2god29ya2VyKTtcblxuICAgICAgICAvLyBzZXR1cCBpZGxlIHRpbWVyXG4gICAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY21kOiBDb21tYW5kID0ge2V4aXQ6IHRydWV9O1xuICAgICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZShjbWQpO1xuICAgICAgICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICAgICAgfSwgdGhpcy5pZGxlVGltZU1zKTtcbiAgICAgICAgdGhpcy5pZGxlVGltZXJzLnNldCh3b3JrZXIsIHRpbWVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlV29ya2VyKHRhc2s6IFByb21pc2VkVGFzazxhbnk+KSB7XG4gICAgbGV0IHdvcmtlcjogV29ya2VyO1xuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnMgJiYgKHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlIHx8IHRoaXMud29ya2VyT3B0aW9ucy5pbml0aWFsaXplcikpIHtcbiAgICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnMudmVyYm9zZSlcbiAgICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gY3JlYXRlV29ya2VyJyk7XG4gICAgICB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi93b3JrZXInKSwge1xuICAgICAgICB3b3JrZXJEYXRhOiB7XG4gICAgICAgICAgaWQ6ICsrdGhpcy50b3RhbENyZWF0ZWRXb3JrZXJzICsgJycsXG4gICAgICAgICAgdmVyYm9zZTogdGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UsXG4gICAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucy5pbml0aWFsaXplcn0sXG4gICAgICAgICAgLi4udGhpcy53b3JrZXJPcHRpb25zXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyJyksIHRoaXMud29ya2VyT3B0aW9ucyk7XG4gICAgfVxuICAgIHRoaXMucnVuV29ya2VyKHRhc2ssIHdvcmtlcik7XG5cbiAgICBjb25zdCBvbldvcmtlckV4aXQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5oYXMod29ya2VyKSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5pZGxlV29ya2Vycy5pbmRleE9mKHdvcmtlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuaWRsZVdvcmtlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdvcmtlci5vbignZXJyb3InLCBvbldvcmtlckV4aXQpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uV29ya2VyRXhpdCk7XG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxufVxuIl19