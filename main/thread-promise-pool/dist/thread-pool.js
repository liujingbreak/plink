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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pool = void 0;
var worker_threads_1 = require("worker_threads");
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
     * @param maxParalle max number of paralle workers
     * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
     * @param workerInitTaskFactory generate initial task for a newly created woker, like initialize some environment
     * stuff
     */
    function Pool(maxParalle, idleTimeMs, workerInitTaskFactory) {
        this.maxParalle = maxParalle;
        this.idleTimeMs = idleTimeMs;
        this.workerInitTaskFactory = workerInitTaskFactory;
        this.runningWorkers = new Set();
        /** Last in first run, always run the latest created worker, give chance for old ones to be removed after timeout */
        this.idleWorkers = [];
        this.idleTimers = new WeakMap();
        this.tasks = [];
    }
    Pool.prototype.submit = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var promisedTask, worker;
            return __generator(this, function (_a) {
                promisedTask = new PromisedTask(task);
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
        var worker = new worker_threads_1.Worker(require.resolve('./worker'));
        if (this.workerInitTaskFactory) {
            this.tasks.push(task);
            var promisedInitTask = new PromisedTask(this.workerInitTaskFactory());
            this.runWorker(promisedInitTask, worker);
        }
        else {
            this.runWorker(task, worker);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFzQztBQUt0QztJQU1FLHNCQUFvQixJQUFVO1FBQTlCLGlCQUtDO1FBTG1CLFNBQUksR0FBSixJQUFJLENBQU07UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBSSxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQzVDLEtBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1lBQ3ZCLEtBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGtDQUFXLEdBQVgsVUFBWSxNQUFjLEVBQUUsSUFBZ0I7UUFBNUMsaUJBK0JDO1FBOUJDLElBQU0sU0FBUyxHQUFHLFVBQUMsR0FBc0M7WUFDdkQsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDdkIsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDL0IsS0FBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7WUFDRCxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQyxDQUFDO1FBRUYsSUFBTSxNQUFNLEdBQUcsVUFBQyxJQUFZO1lBQzFCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDZCxLQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsSUFBTSxpQkFBaUIsR0FBRztZQUN4QixN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QUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsSUFBTSxHQUFHLEdBQUcsS0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRTtvQkFDWixLQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2pDO2FBQ0Y7UUFDSCxDQUFDLENBQUM7UUFDRixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBQ0gsV0FBQztBQUFELENBQUMsQUFsRkQsSUFrRkM7QUFsRlksb0JBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1dvcmtlcn0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuLy8gaW1wb3J0IHtxdWV1ZX0gZnJvbSAnLi9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQge1Rhc2ssIENvbW1hbmR9IGZyb20gJy4vd29ya2VyJztcbmV4cG9ydCB7VGFza307XG5cbmNsYXNzIFByb21pc2VkVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXTtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogVGFzaykge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkJ5V29ya2VyKHdvcmtlcjogV29ya2VyLCBuZXh0OiAoKSA9PiB2b2lkKSB7XG4gICAgY29uc3Qgb25NZXNzYWdlID0gKG1zZzoge3R5cGU6ICdlcnJvcicgfCAnd2FpdCcsIGRhdGE6IFR9KSA9PiB7XG4gICAgICBpZiAobXNnLnR5cGUgPT09ICd3YWl0Jykge1xuICAgICAgICB0aGlzLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB0aGlzLnJlamVjdChtc2cuZGF0YSk7XG4gICAgICB9XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdCgnVGhyZWFkIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIHRoaXMucmVqZWN0KTtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2VlcnJvcicsIHRoaXMucmVqZWN0KTtcbiAgICAgIHdvcmtlci5vZmYoJ2V4aXQnLCBvbkV4aXQpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgdGhpcy5yZWplY3QpOyAvLyBUT0RPOiBub3Qgc3VyZSBpZiB3b3JrIHdpbGwgZXhpdFxuICAgIHdvcmtlci5vbignZXJyb3InLCB0aGlzLnJlamVjdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrfTtcbiAgICBkZWxldGUgbXNnLnRyYW5zZmVyTGlzdDtcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UobXNnLCBtc2cudHJhbnNmZXJMaXN0KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9vbCB7XG4gIHByaXZhdGUgcnVubmluZ1dvcmtlcnMgPSBuZXcgU2V0PFdvcmtlcj4oKTtcbiAgLyoqIExhc3QgaW4gZmlyc3QgcnVuLCBhbHdheXMgcnVuIHRoZSBsYXRlc3QgY3JlYXRlZCB3b3JrZXIsIGdpdmUgY2hhbmNlIGZvciBvbGQgb25lcyB0byBiZSByZW1vdmVkIGFmdGVyIHRpbWVvdXQgKi9cbiAgcHJpdmF0ZSBpZGxlV29ya2VyczogV29ya2VyW10gPSBbXTtcblxuICBwcml2YXRlIGlkbGVUaW1lcnMgPSBuZXcgV2Vha01hcDxXb3JrZXIsIFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+PigpO1xuXG4gIHByaXZhdGUgdGFza3M6IFByb21pc2VkVGFzazxhbnk+W10gPSBbXTtcblxuICAvKipcbiAgICogQHBhcmFtIG1heFBhcmFsbGUgbWF4IG51bWJlciBvZiBwYXJhbGxlIHdvcmtlcnNcbiAgICogQHBhcmFtIGlkbGVUaW1lTXMgbGV0IHdvcmtlciBleGl0IHRvIHJlbGVhc2UgbWVtb3J5LCBhZnRlciBhIHdvcmtlciBiZWluZyBpZGxlIGZvciBzb21lIHRpbWUgKGluIG1zKVxuICAgKiBAcGFyYW0gd29ya2VySW5pdFRhc2tGYWN0b3J5IGdlbmVyYXRlIGluaXRpYWwgdGFzayBmb3IgYSBuZXdseSBjcmVhdGVkIHdva2VyLCBsaWtlIGluaXRpYWxpemUgc29tZSBlbnZpcm9ubWVudFxuICAgKiBzdHVmZlxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXhQYXJhbGxlOiBudW1iZXIsIHByaXZhdGUgaWRsZVRpbWVNczogbnVtYmVyLCBwcml2YXRlIHdvcmtlckluaXRUYXNrRmFjdG9yeT86ICgpID0+IFRhc2spIHtcbiAgfVxuXG4gIGFzeW5jIHN1Ym1pdDxUPih0YXNrOiBUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRUYXNrPFQ+KHRhc2spO1xuXG4gICAgaWYgKHRoaXMuaWRsZVdvcmtlcnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gMi4gTG9vayBmb3IgYXZhaWxhYmUgaWRsZSB3b3JrZXJcbiAgICAgIGNvbnN0IHdvcmtlciA9IHRoaXMuaWRsZVdvcmtlcnMucG9wKCkhO1xuICAgICAgdGhpcy5ydW5Xb3JrZXIocHJvbWlzZWRUYXNrLCB3b3JrZXIpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5zaXplIDwgdGhpcy5tYXhQYXJhbGxlKSB7XG4gICAgICAvLyAzLiBDcmVhdGUgbmV3IHdvcmtlciBpZiBudW1iZXIgb2YgdGhlbSBpcyBsZXNzIHRoYW4gbWF4UGFyYWxsZVxuICAgICAgdGhpcy5jcmVhdGVXb3JrZXIocHJvbWlzZWRUYXNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gNC4gcHV0IHRhc2sgd2l0aCBwcm9taXNlIGluIHRoZSBxdWV1ZS9jaGFubmVsIHRvIHdhaXRcbiAgICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrLnByb21pc2U7XG4gIH1cblxuICBwcml2YXRlIHJ1bldvcmtlcih0YXNrOiBQcm9taXNlZFRhc2s8YW55Piwgd29ya2VyOiBXb3JrZXIpIHtcbiAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5hZGQod29ya2VyKTtcbiAgICB0YXNrLnJ1bkJ5V29ya2VyKHdvcmtlciwgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBjb250aW51ZSB3b3JrIG9uIG5leHQgdGFza1xuICAgICAgICB0aGlzLnJ1bldvcmtlcih0aGlzLnRhc2tzLnNoaWZ0KCkhLCB3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm8gbW9yZSB0YXNrLCBwdXQgd29ya2VyIGluIGlkbGVcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5wdXNoKHdvcmtlcik7XG5cbiAgICAgICAgLy8gc2V0dXAgaWRsZSB0aW1lclxuICAgICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGNtZDogQ29tbWFuZCA9IHtleGl0OiB0cnVlfTtcbiAgICAgICAgICB3b3JrZXIucG9zdE1lc3NhZ2UoY21kKTtcbiAgICAgICAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICAgIH0sIHRoaXMuaWRsZVRpbWVNcyk7XG4gICAgICAgIHRoaXMuaWRsZVRpbWVycy5zZXQod29ya2VyLCB0aW1lcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVdvcmtlcih0YXNrOiBQcm9taXNlZFRhc2s8YW55Pikge1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlcicpKTtcbiAgICBpZiAodGhpcy53b3JrZXJJbml0VGFza0ZhY3RvcnkpIHtcbiAgICAgIHRoaXMudGFza3MucHVzaCh0YXNrKTtcbiAgICAgIGNvbnN0IHByb21pc2VkSW5pdFRhc2sgPSBuZXcgUHJvbWlzZWRUYXNrKHRoaXMud29ya2VySW5pdFRhc2tGYWN0b3J5KCkpO1xuICAgICAgdGhpcy5ydW5Xb3JrZXIocHJvbWlzZWRJbml0VGFzaywgd29ya2VyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ydW5Xb3JrZXIodGFzaywgd29ya2VyKTtcbiAgICB9XG4gICAgY29uc3Qgb25Xb3JrZXJFeGl0ID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuaGFzKHdvcmtlcikpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaWRsZVdvcmtlcnMuaW5kZXhPZih3b3JrZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25Xb3JrZXJFeGl0KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbldvcmtlckV4aXQpO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cbn1cbiJdfQ==