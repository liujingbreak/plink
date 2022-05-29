"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pool = void 0;
// tslint:disable no-console
const worker_threads_1 = require("worker_threads");
const child_process_1 = require("child_process");
// import {queue} from './promise-queque';
const os_1 = __importDefault(require("os"));
class PromisedTask {
    constructor(task, verbose = false) {
        this.task = task;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    runByWorker(worker) {
        const onMessage = (msg) => {
            if (msg.type === 'wait') {
                unsubscribeWorker();
                this.resolve(msg.data);
            }
            else if (msg.type === 'error') {
                unsubscribeWorker();
                this.reject(msg.data);
            }
        };
        const onExit = (code) => {
            // if (this.verbose) {
            // console.log('[thread-pool] PromisedTask on exit');
            // }
            unsubscribeWorker();
            if (code !== 0) {
                this.reject(`Thread ${worker.threadId} exist with code ` + code);
            }
        };
        const unsubscribeWorker = () => {
            worker.off('message', onMessage);
            worker.off('error', onError);
            worker.off('messageerror', onError);
            worker.off('exit', onExit);
        };
        const onError = (err) => {
            unsubscribeWorker();
            this.reject(err);
        };
        worker.on('message', onMessage);
        worker.on('messageerror', onError); // TODO: not sure if work will exit
        worker.on('error', onError);
        worker.on('exit', onExit);
        const msg = Object.assign({}, this.task);
        delete msg.transferList;
        worker.postMessage(msg, msg.transferList);
    }
}
class PromisedProcessTask {
    constructor(task) {
        this.task = task;
        this.promise = new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    runByProcess(worker, verbose) {
        const onMessage = (msg) => {
            if (msg.type === 'wait') {
                this.resolve(msg.data);
                unsubscribeWorker();
            }
            else if (msg.type === 'error') {
                this.reject(msg.data);
                unsubscribeWorker();
            }
        };
        const onExit = (code) => {
            unsubscribeWorker();
            if (code !== 0) {
                this.reject('Child process exist with code ' + code);
            }
        };
        const unsubscribeWorker = () => {
            worker.off('message', onMessage);
            worker.off('error', onError);
            // worker.off('messageerror', onError);
            worker.off('exit', onExit);
        };
        const onError = (err) => {
            unsubscribeWorker();
            this.reject(err);
        };
        worker.on('message', onMessage);
        // worker.on('messageerror', onError); // TODO: not sure if work will exit
        worker.on('error', onError);
        worker.on('exit', onExit);
        const msg = Object.assign(Object.assign({}, this.task), { verbose });
        if (!worker.send(msg)) {
            this.reject('Is Child process event threshold full? This is weird.');
        }
    }
}
class Pool {
    /**
     * @param maxParalle max number of paralle workers, default is `os.cpus().length - 1`
     * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
     * @param workerOptions thread worker options, e.g. initializing some environment
     * stuff
     */
    constructor(maxParalle = os_1.default.cpus().length - 1, idleTimeMs = 0, workerOptions) {
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
    submit(task) {
        var _a, _b;
        // 1. Bind a task with a promise
        const promisedTask = new PromisedTask(task, (_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose);
        if ((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose) {
            // eslint-disable-next-line no-console
            console.log(`[thread-pool] submit task, idle workers: ${this.idleWorkers.length}, running workers: ${this.runningWorkers.size}`);
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            const worker = this.idleWorkers.pop();
            void this.runWorker(worker);
        }
        else if (this.runningWorkers.size < this.maxParalle) {
            // 3. Create new worker if number of them is less than maxParalle
            this.createWorker(promisedTask);
        }
        return promisedTask.promise;
    }
    submitProcess(task) {
        var _a;
        // 1. Bind a task with a promise
        const promisedTask = new PromisedProcessTask(task);
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
            // eslint-disable-next-line no-console
            console.log(`[thread-pool] submit child process, idle process: ${this.idleWorkers.length}, ` +
                `running process or workers: ${this.runningWorkers.size}`);
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            const worker = this.idleWorkers.pop();
            void this.runWorker(worker);
        }
        else if (this.runningWorkers.size < this.maxParalle) {
            // 3. Create new worker if number of them is less than maxParalle
            void this.createChildProcess();
        }
        return promisedTask.promise;
    }
    async runWorker(worker) {
        var _a;
        this.idleTimers.delete(worker);
        this.runningWorkers.add(worker);
        while (this.tasks.length > 0) {
            const task = this.tasks.shift();
            if (worker instanceof worker_threads_1.Worker)
                task.runByWorker(worker);
            else
                task.runByProcess(worker, !!((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose));
            await task.promise.catch(e => { });
        }
        // No more task, put worker in idle
        this.runningWorkers.delete(worker);
        this.idleWorkers.push(worker);
        // setup idle timer
        const timer = setTimeout(() => {
            var _a, _b;
            const cmd = { exit: true };
            if (worker instanceof worker_threads_1.Worker) {
                worker.postMessage(cmd);
                if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose)
                    // eslint-disable-next-line no-console
                    console.log('[thread-pool] Remove expired worker thread:', worker.threadId);
            }
            else {
                worker.send(cmd);
                if ((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose)
                    // eslint-disable-next-line no-console
                    console.log('[thread-pool] Remove expired child process:', worker.pid);
            }
            this.idleTimers.delete(worker);
        }, this.idleTimeMs);
        this.idleTimers.set(worker, timer);
    }
    async createChildProcess() {
        var _a, _b, _c, _d;
        const worker = (0, child_process_1.fork)(require.resolve('./worker-process'), { serialization: 'advanced', stdio: 'inherit' });
        this.runningWorkers.add(worker);
        // if (this.workerOptions && (this.workerOptions.verbose || this.workerOptions.initializer)) {
        const verbose = !!((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose);
        if (verbose)
            // eslint-disable-next-line no-console
            console.log('[thread-pool] createChildProcess');
        if ((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.initializer) {
            const initTask = new PromisedProcessTask({
                verbose,
                initializer: (_c = this.workerOptions) === null || _c === void 0 ? void 0 : _c.initializer
            });
            initTask.runByProcess(worker, !!((_d = this.workerOptions) === null || _d === void 0 ? void 0 : _d.verbose));
            await initTask.promise;
        }
        // }
        void this.runWorker(worker);
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
    createWorker(task) {
        var _a, _b, _c, _d;
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
            // eslint-disable-next-line no-console
            console.log('[thread-pool] createWorker');
        }
        const worker = new worker_threads_1.Worker(require.resolve('./worker'), Object.assign(Object.assign({}, this.workerOptions), { 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            workerData: Object.assign({ id: ++this.totalCreatedWorkers + '', verbose: !!((_b = this.workerOptions) === null || _b === void 0 ? void 0 : _b.verbose), initializer: (_c = this.workerOptions) === null || _c === void 0 ? void 0 : _c.initializer }, ((_d = this.workerOptions) === null || _d === void 0 ? void 0 : _d.workerData) || {}) }));
        void this.runWorker(worker);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsbURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCwwQ0FBMEM7QUFDMUMsNENBQW9CO0FBT3BCLE1BQU0sWUFBWTtJQU1oQixZQUFvQixJQUFVLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2hELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBYyxDQUFDO1lBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFdBQVcsQ0FBQyxNQUFjO1FBRXhCLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBc0MsRUFBRSxFQUFFO1lBQzNELElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7Z0JBQ3ZCLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxPQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3pCO2lCQUFNLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7Z0JBQy9CLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxNQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3hCO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsTUFBTSxNQUFNLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtZQUM5QixzQkFBc0I7WUFDdEIscURBQXFEO1lBQ3JELElBQUk7WUFFSixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDZCxJQUFJLENB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O2lCQUNqQzthQUNGO1FBQ0gsQ0FBQyxDQUFDO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDaEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGO0FBaEtELG9CQWdLQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGVcbmltcG9ydCB7V29ya2VyLCBXb3JrZXJPcHRpb25zfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge0NoaWxkUHJvY2VzcywgZm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQge3F1ZXVlfSBmcm9tICcuL3Byb21pc2UtcXVlcXVlJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge1Rhc2ssIENvbW1hbmQsIEluaXRpYWxPcHRpb25zfSBmcm9tICcuL3dvcmtlcic7XG5cbmltcG9ydCB7VGFzayBhcyBQcm9jZXNzVGFzaywgSW5pdGlhbE9wdGlvbnMgYXMgSW5pdGlhbE9wdGlvbnM0UHJvY30gZnJvbSAnLi93b3JrZXItcHJvY2Vzcyc7XG5cbmV4cG9ydCB7VGFza307XG5cbmNsYXNzIFByb21pc2VkVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXSB8IHVuZGVmaW5lZDtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogVGFzaywgdmVyYm9zZSA9IGZhbHNlKSB7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZSBhcyBhbnk7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuXG4gIHJ1bkJ5V29ya2VyKHdvcmtlcjogV29ya2VyKSB7XG5cbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JzsgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVzb2x2ZSEobXNnLmRhdGEpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlamVjdCEobXNnLmRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICAvLyBpZiAodGhpcy52ZXJib3NlKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBQcm9taXNlZFRhc2sgb24gZXhpdCcpO1xuICAgICAgLy8gfVxuXG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QhKGBUaHJlYWQgJHt3b3JrZXIudGhyZWFkSWR9IGV4aXN0IHdpdGggY29kZSBgICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0IShlcnIpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgb25FcnJvcik7IC8vIFRPRE86IG5vdCBzdXJlIGlmIHdvcmsgd2lsbCBleGl0XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0gey4uLnRoaXMudGFza307XG4gICAgZGVsZXRlIG1zZy50cmFuc2Zlckxpc3Q7XG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKG1zZywgbXNnLnRyYW5zZmVyTGlzdCk7XG4gIH1cbn1cblxuY2xhc3MgUHJvbWlzZWRQcm9jZXNzVGFzazxUPiB7XG4gIHByb21pc2U6IFByb21pc2U8VD47XG5cbiAgcmVzb2x2ZTogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlswXSB8IHVuZGVmaW5lZDtcbiAgcmVqZWN0OiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzFdIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdGFzazogUHJvY2Vzc1Rhc2sgfCBJbml0aWFsT3B0aW9uczRQcm9jKSB7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZSBhcyBhbnk7XG4gICAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuICBydW5CeVByb2Nlc3Mod29ya2VyOiBDaGlsZFByb2Nlc3MsIHZlcmJvc2U6IGJvb2xlYW4pIHtcblxuICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IHt0eXBlOiAnZXJyb3InIHwgJ3dhaXQnOyBkYXRhOiBUfSkgPT4ge1xuICAgICAgaWYgKG1zZy50eXBlID09PSAnd2FpdCcpIHtcbiAgICAgICAgdGhpcy5yZXNvbHZlIShtc2cuZGF0YSk7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgIHRoaXMucmVqZWN0IShtc2cuZGF0YSk7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXhpdCA9IChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdCEoJ0NoaWxkIHByb2Nlc3MgZXhpc3Qgd2l0aCBjb2RlICcgKyBjb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdW5zdWJzY3JpYmVXb3JrZXIgPSAoKSA9PiB7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICAgIHdvcmtlci5vZmYoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAvLyB3b3JrZXIub2ZmKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdvcmtlci5vZmYoJ2V4aXQnLCBvbkV4aXQpO1xuICAgIH07XG5cbiAgICBjb25zdCBvbkVycm9yID0gKGVycjogYW55KSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgdGhpcy5yZWplY3QhKGVycik7XG4gICAgfTtcblxuICAgIHdvcmtlci5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgLy8gd29ya2VyLm9uKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrLCB2ZXJib3NlfTtcbiAgICBpZiAoIXdvcmtlci5zZW5kKG1zZykpIHtcbiAgICAgIHRoaXMucmVqZWN0ISgnSXMgQ2hpbGQgcHJvY2VzcyBldmVudCB0aHJlc2hvbGQgZnVsbD8gVGhpcyBpcyB3ZWlyZC4nKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBvb2wge1xuICBwcml2YXRlIHJ1bm5pbmdXb3JrZXJzID0gbmV3IFNldDxXb3JrZXIgfCBDaGlsZFByb2Nlc3M+KCk7XG4gIC8qKiBMYXN0IGluIGZpcnN0IHJ1biwgYWx3YXlzIHJ1biB0aGUgbGF0ZXN0IGNyZWF0ZWQgd29ya2VyLCBnaXZlIGNoYW5jZSBmb3Igb2xkIG9uZXMgdG8gYmUgcmVtb3ZlZCBhZnRlciB0aW1lb3V0ICovXG4gIHByaXZhdGUgaWRsZVdvcmtlcnM6IChXb3JrZXIgfCBDaGlsZFByb2Nlc3MpW10gPSBbXTtcblxuICBwcml2YXRlIGlkbGVUaW1lcnMgPSBuZXcgV2Vha01hcDxXb3JrZXIgfCBDaGlsZFByb2Nlc3MsIFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+PigpO1xuXG4gIHByaXZhdGUgdGFza3M6IChQcm9taXNlZFRhc2s8YW55PiB8IFByb21pc2VkUHJvY2Vzc1Rhc2s8YW55PilbXSA9IFtdO1xuICBwcml2YXRlIHRvdGFsQ3JlYXRlZFdvcmtlcnMgPSAwO1xuICAvKipcbiAgICogQHBhcmFtIG1heFBhcmFsbGUgbWF4IG51bWJlciBvZiBwYXJhbGxlIHdvcmtlcnMsIGRlZmF1bHQgaXMgYG9zLmNwdXMoKS5sZW5ndGggLSAxYFxuICAgKiBAcGFyYW0gaWRsZVRpbWVNcyBsZXQgd29ya2VyIGV4aXQgdG8gcmVsZWFzZSBtZW1vcnksIGFmdGVyIGEgd29ya2VyIGJlaW5nIGlkbGUgZm9yIHNvbWUgdGltZSAoaW4gbXMpXG4gICAqIEBwYXJhbSB3b3JrZXJPcHRpb25zIHRocmVhZCB3b3JrZXIgb3B0aW9ucywgZS5nLiBpbml0aWFsaXppbmcgc29tZSBlbnZpcm9ubWVudFxuICAgKiBzdHVmZlxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBtYXhQYXJhbGxlID0gb3MuY3B1cygpLmxlbmd0aCAtIDEsIHByaXZhdGUgaWRsZVRpbWVNcyA9IDAsIHB1YmxpYyB3b3JrZXJPcHRpb25zPzogV29ya2VyT3B0aW9ucyAmIEluaXRpYWxPcHRpb25zKSB7XG4gIH1cblxuICBzdWJtaXQ8VD4odGFzazogVGFzayk6IFByb21pc2U8VD4ge1xuICAgIC8vIDEuIEJpbmQgYSB0YXNrIHdpdGggYSBwcm9taXNlXG4gICAgY29uc3QgcHJvbWlzZWRUYXNrID0gbmV3IFByb21pc2VkVGFzazxUPih0YXNrLCB0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHN1Ym1pdCB0YXNrLCBpZGxlIHdvcmtlcnM6ICR7dGhpcy5pZGxlV29ya2Vycy5sZW5ndGh9LCBydW5uaW5nIHdvcmtlcnM6ICR7dGhpcy5ydW5uaW5nV29ya2Vycy5zaXplfWApO1xuICAgIH1cbiAgICB0aGlzLnRhc2tzLnB1c2gocHJvbWlzZWRUYXNrKTtcbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB2b2lkIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZVdvcmtlcihwcm9taXNlZFRhc2spO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrLnByb21pc2U7XG4gIH1cblxuICBzdWJtaXRQcm9jZXNzPFQ+KHRhc2s6IFByb2Nlc3NUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRQcm9jZXNzVGFzazxUPih0YXNrKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBzdWJtaXQgY2hpbGQgcHJvY2VzcywgaWRsZSBwcm9jZXNzOiAke3RoaXMuaWRsZVdvcmtlcnMubGVuZ3RofSwgYCArXG4gICAgICBgcnVubmluZyBwcm9jZXNzIG9yIHdvcmtlcnM6ICR7dGhpcy5ydW5uaW5nV29ya2Vycy5zaXplfWApO1xuICAgIH1cbiAgICB0aGlzLnRhc2tzLnB1c2gocHJvbWlzZWRUYXNrKTtcbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB2b2lkIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB2b2lkIHRoaXMuY3JlYXRlQ2hpbGRQcm9jZXNzKCk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuV29ya2VyKHdvcmtlcjogV29ya2VyIHwgQ2hpbGRQcm9jZXNzKSB7XG4gICAgdGhpcy5pZGxlVGltZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIHRoaXMucnVubmluZ1dvcmtlcnMuYWRkKHdvcmtlcik7XG4gICAgd2hpbGUgKHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgdGFzayA9IHRoaXMudGFza3Muc2hpZnQoKSE7XG4gICAgICBpZiAod29ya2VyIGluc3RhbmNlb2YgV29ya2VyKVxuICAgICAgICAodGFzayBhcyBQcm9taXNlZFRhc2s8YW55PikucnVuQnlXb3JrZXIod29ya2VyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgKHRhc2sgYXMgUHJvbWlzZWRQcm9jZXNzVGFzazxhbnk+KS5ydW5CeVByb2Nlc3Mod29ya2VyLCAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG4gICAgICBhd2FpdCB0YXNrLnByb21pc2UuY2F0Y2goZSA9PiB7fSk7XG4gICAgfVxuICAgIC8vIE5vIG1vcmUgdGFzaywgcHV0IHdvcmtlciBpbiBpZGxlXG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLmlkbGVXb3JrZXJzLnB1c2god29ya2VyKTtcblxuICAgIC8vIHNldHVwIGlkbGUgdGltZXJcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc3QgY21kOiBDb21tYW5kID0ge2V4aXQ6IHRydWV9O1xuICAgICAgaWYgKHdvcmtlciBpbnN0YW5jZW9mIFdvcmtlcikge1xuICAgICAgICB3b3JrZXIucG9zdE1lc3NhZ2UoY21kKTtcbiAgICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSlcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIFJlbW92ZSBleHBpcmVkIHdvcmtlciB0aHJlYWQ6Jywgd29ya2VyLnRocmVhZElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdvcmtlci5zZW5kKGNtZCk7XG4gICAgICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBSZW1vdmUgZXhwaXJlZCBjaGlsZCBwcm9jZXNzOicsIHdvcmtlci5waWQpO1xuICAgICAgfVxuICAgICAgdGhpcy5pZGxlVGltZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIH0sIHRoaXMuaWRsZVRpbWVNcyk7XG4gICAgdGhpcy5pZGxlVGltZXJzLnNldCh3b3JrZXIsIHRpbWVyKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQ2hpbGRQcm9jZXNzKCkge1xuICAgIGNvbnN0IHdvcmtlcjogQ2hpbGRQcm9jZXNzID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyLXByb2Nlc3MnKSwge3NlcmlhbGl6YXRpb246ICdhZHZhbmNlZCcsIHN0ZGlvOiAnaW5oZXJpdCd9KTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuXG4gICAgLy8gaWYgKHRoaXMud29ya2VyT3B0aW9ucyAmJiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UgfHwgdGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSkge1xuICAgIGNvbnN0IHZlcmJvc2UgPSAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZTtcbiAgICBpZiAodmVyYm9zZSlcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBjcmVhdGVDaGlsZFByb2Nlc3MnKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LmluaXRpYWxpemVyKSB7XG4gICAgICBjb25zdCBpbml0VGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrKHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXJcbiAgICAgIH0pO1xuICAgICAgaW5pdFRhc2sucnVuQnlQcm9jZXNzKHdvcmtlciwgISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuICAgICAgYXdhaXQgaW5pdFRhc2sucHJvbWlzZTtcbiAgICB9XG4gICAgLy8gfVxuICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcblxuICAgIGNvbnN0IG9uV29ya2VyRXhpdCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLmhhcyh3b3JrZXIpKSB7XG4gICAgICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmlkbGVXb3JrZXJzLmluZGV4T2Yod29ya2VyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uV29ya2VyRXhpdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25Xb3JrZXJFeGl0KTtcbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVXb3JrZXIodGFzazogUHJvbWlzZWRUYXNrPGFueT4pIHtcbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gY3JlYXRlV29ya2VyJyk7XG4gICAgfVxuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlcicpLCB7XG4gICAgICAuLi50aGlzLndvcmtlck9wdGlvbnMsXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICB3b3JrZXJEYXRhOiB7XG4gICAgICAgIGlkOiArK3RoaXMudG90YWxDcmVhdGVkV29ya2VycyArICcnLFxuICAgICAgICB2ZXJib3NlOiAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXIsXG4gICAgICAgIC4uLnRoaXMud29ya2VyT3B0aW9ucz8ud29ya2VyRGF0YSB8fCB7fVxuICAgICAgfVxuICAgIH0pO1xuICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcblxuICAgIGNvbnN0IG9uV29ya2VyRXhpdCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLmhhcyh3b3JrZXIpKSB7XG4gICAgICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmlkbGVXb3JrZXJzLmluZGV4T2Yod29ya2VyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uV29ya2VyRXhpdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25Xb3JrZXJFeGl0KTtcbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG59XG4iXX0=