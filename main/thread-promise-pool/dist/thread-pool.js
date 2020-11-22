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
exports.Pool = void 0;
const worker_threads_1 = require("worker_threads");
class PromisedTask {
    constructor(task) {
        this.task = task;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    runByWorker(worker, next) {
        const onMessage = (msg) => {
            if (msg.type === 'wait') {
                this.resolve(msg.data);
            }
            else if (msg.type === 'error') {
                this.reject(msg.data);
            }
            unsubscribeWorker();
            next();
        };
        const onExit = (code) => {
            if (code !== 0) {
                this.reject('Thread exist with code ' + code);
            }
        };
        const unsubscribeWorker = () => {
            worker.off('message', onMessage);
            worker.off('error', this.reject);
            worker.off('messageerror', this.reject);
            worker.off('exit', onExit);
        };
        worker.on('message', onMessage);
        worker.on('messageerror', this.reject); // TODO: not sure if work will exit
        worker.on('error', this.reject);
        worker.on('exit', onExit);
        const msg = Object.assign({}, this.task);
        delete msg.transferList;
        worker.postMessage(msg, msg.transferList);
    }
}
class Pool {
    /**
     * @param maxParalle max number of paralle workers
     * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
     * @param workerInitTaskFactory generate initial task for a newly created woker, like initialize some environment
     * stuff
     */
    constructor(maxParalle, idleTimeMs, workerInitTaskFactory) {
        this.maxParalle = maxParalle;
        this.idleTimeMs = idleTimeMs;
        this.workerInitTaskFactory = workerInitTaskFactory;
        this.runningWorkers = new Set();
        /** Last in first run, always run the latest created worker, give chance for old ones to be removed after timeout */
        this.idleWorkers = [];
        this.idleTimers = new WeakMap();
    }
    submit(task) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Bind a task with a promise
            const promisedTask = new PromisedTask(task);
            if (this.idleWorkers.length > 0) {
                // 2. Look for availabe idle worker
                const worker = this.idleWorkers.pop();
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
            return promisedTask.promise;
        });
    }
    runWorker(task, worker) {
        this.idleTimers.delete(worker);
        this.runningWorkers.add(worker);
        task.runByWorker(worker, () => {
            if (this.tasks.length > 0) {
                // continue work on next task
                this.runWorker(this.tasks.shift(), worker);
            }
            else {
                // No more task, put worker in idle
                this.runningWorkers.delete(worker);
                this.idleWorkers.push(worker);
                // setup idle timer
                const timer = setTimeout(() => {
                    const cmd = { exit: true };
                    worker.postMessage(cmd);
                    this.idleTimers.delete(worker);
                }, this.idleTimeMs);
                this.idleTimers.set(worker, timer);
            }
        });
    }
    createWorker(task) {
        const worker = new worker_threads_1.Worker(require.resolve('./worker'));
        if (this.workerInitTaskFactory) {
            this.tasks.push(task);
            const promisedInitTask = new PromisedTask(this.workerInitTaskFactory());
            this.runWorker(promisedInitTask, worker);
        }
        else {
            this.runWorker(task, worker);
        }
        const onWorkerExit = () => {
            if (this.runningWorkers.has(worker)) {
                this.runningWorkers.delete(worker);
            }
            else {
                const idx = this.idleWorkers.indexOf(worker);
                if (idx >= 0) {
                    this.idleWorkers.splice(idx, 1);
                }
            }
        };
        worker.on('error', onWorkerExit);
        worker.on('exit', onWorkerExit);
        return worker;
    }
}
exports.Pool = Pool;

//# sourceMappingURL=thread-pool.js.map
