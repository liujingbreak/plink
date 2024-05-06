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
        this.thread = worker;
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
        const msg = Object.assign({ type: 'plink:threadPool:task' }, this.task);
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
    /**
     * The difference from `submit(task)` is that this function returns not only `promise` but also
     * `Task` which contains a property "thread" of type Worker
     */
    submitAndReturnTask(task) {
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
        return promisedTask;
    }
    submit(task) {
        return this.submitAndReturnTask(task).promise;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsbURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCwwQ0FBMEM7QUFDMUMsNENBQW9CO0FBT3BCLE1BQU0sWUFBWTtJQU9oQixZQUFvQixJQUFVLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFBM0IsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2hELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBYyxDQUFDO1lBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFdBQVcsQ0FBQyxNQUFjO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBc0MsRUFBRSxFQUFFO1lBQzNELElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDeEIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE9BQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIsQ0FBQztpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ2hDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxNQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDSCxDQUFDLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQzlCLHNCQUFzQjtZQUN0QixxREFBcUQ7WUFDckQsSUFBSTtZQUVKLGlCQUFp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QyxDQUFDO1FBQ0gsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTVCLE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRTtZQUN4QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLENBQUM7aUJBQU0sQ0FBQztnQkFDTixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNsQyxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUMsQ0FBQztRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQXhLRCxvQkF3S0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQge1dvcmtlciwgV29ya2VyT3B0aW9uc30gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHtDaGlsZFByb2Nlc3MsIGZvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gaW1wb3J0IHtxdWV1ZX0gZnJvbSAnLi9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHtUYXNrLCBDb21tYW5kLCBJbml0aWFsT3B0aW9uc30gZnJvbSAnLi93b3JrZXInO1xuXG5pbXBvcnQge1Rhc2sgYXMgUHJvY2Vzc1Rhc2ssIEluaXRpYWxPcHRpb25zIGFzIEluaXRpYWxPcHRpb25zNFByb2N9IGZyb20gJy4vd29ya2VyLXByb2Nlc3MnO1xuXG5leHBvcnQge1Rhc2t9O1xuXG5jbGFzcyBQcm9taXNlZFRhc2s8VD4ge1xuICB0aHJlYWQ6IFdvcmtlciB8IHVuZGVmaW5lZDtcbiAgcHJvbWlzZTogUHJvbWlzZTxUPjtcblxuICByZXNvbHZlOiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzBdIHwgdW5kZWZpbmVkO1xuICByZWplY3Q6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMV0gfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0YXNrOiBUYXNrLCB2ZXJib3NlID0gZmFsc2UpIHtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlIGFzIGFueTtcbiAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG5cbiAgcnVuQnlXb3JrZXIod29ya2VyOiBXb3JrZXIpIHtcbiAgICB0aGlzLnRocmVhZCA9IHdvcmtlcjtcbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JzsgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVzb2x2ZSEobXNnLmRhdGEpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlamVjdCEobXNnLmRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICAvLyBpZiAodGhpcy52ZXJib3NlKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBQcm9taXNlZFRhc2sgb24gZXhpdCcpO1xuICAgICAgLy8gfVxuXG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QhKGBUaHJlYWQgJHt3b3JrZXIudGhyZWFkSWR9IGV4aXN0IHdpdGggY29kZSBgICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0IShlcnIpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgb25FcnJvcik7IC8vIFRPRE86IG5vdCBzdXJlIGlmIHdvcmsgd2lsbCBleGl0XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0ge3R5cGU6ICdwbGluazp0aHJlYWRQb29sOnRhc2snLCAuLi50aGlzLnRhc2t9O1xuICAgIGRlbGV0ZSBtc2cudHJhbnNmZXJMaXN0O1xuICAgIHdvcmtlci5wb3N0TWVzc2FnZShtc2csIG1zZy50cmFuc2Zlckxpc3QpO1xuICB9XG59XG5cbmNsYXNzIFByb21pc2VkUHJvY2Vzc1Rhc2s8VD4ge1xuICBwcm9taXNlOiBQcm9taXNlPFQ+O1xuXG4gIHJlc29sdmU6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMF0gfCB1bmRlZmluZWQ7XG4gIHJlamVjdDogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlsxXSB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRhc2s6IFByb2Nlc3NUYXNrIHwgSW5pdGlhbE9wdGlvbnM0UHJvYykge1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmUgYXMgYW55O1xuICAgICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cbiAgcnVuQnlQcm9jZXNzKHdvcmtlcjogQ2hpbGRQcm9jZXNzLCB2ZXJib3NlOiBib29sZWFuKSB7XG5cbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JzsgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZSEobXNnLmRhdGEpO1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB0aGlzLnJlamVjdCEobXNnLmRhdGEpO1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBvbkV4aXQgPSAoY29kZTogbnVtYmVyKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QhKCdDaGlsZCBwcm9jZXNzIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgLy8gd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0IShlcnIpO1xuICAgIH07XG5cbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgIC8vIHdvcmtlci5vbignbWVzc2FnZWVycm9yJywgb25FcnJvcik7IC8vIFRPRE86IG5vdCBzdXJlIGlmIHdvcmsgd2lsbCBleGl0XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0gey4uLnRoaXMudGFzaywgdmVyYm9zZX07XG4gICAgaWYgKCF3b3JrZXIuc2VuZChtc2cpKSB7XG4gICAgICB0aGlzLnJlamVjdCEoJ0lzIENoaWxkIHByb2Nlc3MgZXZlbnQgdGhyZXNob2xkIGZ1bGw/IFRoaXMgaXMgd2VpcmQuJyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQb29sIHtcbiAgcHJpdmF0ZSBydW5uaW5nV29ya2VycyA9IG5ldyBTZXQ8V29ya2VyIHwgQ2hpbGRQcm9jZXNzPigpO1xuICAvKiogTGFzdCBpbiBmaXJzdCBydW4sIGFsd2F5cyBydW4gdGhlIGxhdGVzdCBjcmVhdGVkIHdvcmtlciwgZ2l2ZSBjaGFuY2UgZm9yIG9sZCBvbmVzIHRvIGJlIHJlbW92ZWQgYWZ0ZXIgdGltZW91dCAqL1xuICBwcml2YXRlIGlkbGVXb3JrZXJzOiAoV29ya2VyIHwgQ2hpbGRQcm9jZXNzKVtdID0gW107XG5cbiAgcHJpdmF0ZSBpZGxlVGltZXJzID0gbmV3IFdlYWtNYXA8V29ya2VyIHwgQ2hpbGRQcm9jZXNzLCBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0Pj4oKTtcblxuICBwcml2YXRlIHRhc2tzOiAoUHJvbWlzZWRUYXNrPGFueT4gfCBQcm9taXNlZFByb2Nlc3NUYXNrPGFueT4pW10gPSBbXTtcbiAgcHJpdmF0ZSB0b3RhbENyZWF0ZWRXb3JrZXJzID0gMDtcbiAgLyoqXG4gICAqIEBwYXJhbSBtYXhQYXJhbGxlIG1heCBudW1iZXIgb2YgcGFyYWxsZSB3b3JrZXJzLCBkZWZhdWx0IGlzIGBvcy5jcHVzKCkubGVuZ3RoIC0gMWBcbiAgICogQHBhcmFtIGlkbGVUaW1lTXMgbGV0IHdvcmtlciBleGl0IHRvIHJlbGVhc2UgbWVtb3J5LCBhZnRlciBhIHdvcmtlciBiZWluZyBpZGxlIGZvciBzb21lIHRpbWUgKGluIG1zKVxuICAgKiBAcGFyYW0gd29ya2VyT3B0aW9ucyB0aHJlYWQgd29ya2VyIG9wdGlvbnMsIGUuZy4gaW5pdGlhbGl6aW5nIHNvbWUgZW52aXJvbm1lbnRcbiAgICogc3R1ZmZcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWF4UGFyYWxsZSA9IG9zLmNwdXMoKS5sZW5ndGggLSAxLCBwcml2YXRlIGlkbGVUaW1lTXMgPSAwLCBwdWJsaWMgd29ya2VyT3B0aW9ucz86IFdvcmtlck9wdGlvbnMgJiBJbml0aWFsT3B0aW9ucykge1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBkaWZmZXJlbmNlIGZyb20gYHN1Ym1pdCh0YXNrKWAgaXMgdGhhdCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgbm90IG9ubHkgYHByb21pc2VgIGJ1dCBhbHNvXG4gICAqIGBUYXNrYCB3aGljaCBjb250YWlucyBhIHByb3BlcnR5IFwidGhyZWFkXCIgb2YgdHlwZSBXb3JrZXJcbiAgICovXG4gIHN1Ym1pdEFuZFJldHVyblRhc2s8VD4odGFzazogVGFzaykge1xuICAgIC8vIDEuIEJpbmQgYSB0YXNrIHdpdGggYSBwcm9taXNlXG4gICAgY29uc3QgcHJvbWlzZWRUYXNrID0gbmV3IFByb21pc2VkVGFzazxUPih0YXNrLCB0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHN1Ym1pdCB0YXNrLCBpZGxlIHdvcmtlcnM6ICR7dGhpcy5pZGxlV29ya2Vycy5sZW5ndGh9LCBydW5uaW5nIHdvcmtlcnM6ICR7dGhpcy5ydW5uaW5nV29ya2Vycy5zaXplfWApO1xuICAgIH1cbiAgICB0aGlzLnRhc2tzLnB1c2gocHJvbWlzZWRUYXNrKTtcbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB2b2lkIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZVdvcmtlcihwcm9taXNlZFRhc2spO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrO1xuICB9XG5cbiAgc3VibWl0PFQ+KHRhc2s6IFRhc2spOiBQcm9taXNlPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5zdWJtaXRBbmRSZXR1cm5UYXNrPFQ+KHRhc2spLnByb21pc2U7XG4gIH1cblxuICBzdWJtaXRQcm9jZXNzPFQ+KHRhc2s6IFByb2Nlc3NUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRQcm9jZXNzVGFzazxUPih0YXNrKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBzdWJtaXQgY2hpbGQgcHJvY2VzcywgaWRsZSBwcm9jZXNzOiAke3RoaXMuaWRsZVdvcmtlcnMubGVuZ3RofSwgYCArXG4gICAgICBgcnVubmluZyBwcm9jZXNzIG9yIHdvcmtlcnM6ICR7dGhpcy5ydW5uaW5nV29ya2Vycy5zaXplfWApO1xuICAgIH1cbiAgICB0aGlzLnRhc2tzLnB1c2gocHJvbWlzZWRUYXNrKTtcbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB2b2lkIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB2b2lkIHRoaXMuY3JlYXRlQ2hpbGRQcm9jZXNzKCk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcnVuV29ya2VyKHdvcmtlcjogV29ya2VyIHwgQ2hpbGRQcm9jZXNzKSB7XG4gICAgdGhpcy5pZGxlVGltZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIHRoaXMucnVubmluZ1dvcmtlcnMuYWRkKHdvcmtlcik7XG4gICAgd2hpbGUgKHRoaXMudGFza3MubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgdGFzayA9IHRoaXMudGFza3Muc2hpZnQoKSE7XG4gICAgICBpZiAod29ya2VyIGluc3RhbmNlb2YgV29ya2VyKVxuICAgICAgICAodGFzayBhcyBQcm9taXNlZFRhc2s8YW55PikucnVuQnlXb3JrZXIod29ya2VyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgKHRhc2sgYXMgUHJvbWlzZWRQcm9jZXNzVGFzazxhbnk+KS5ydW5CeVByb2Nlc3Mod29ya2VyLCAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG4gICAgICBhd2FpdCB0YXNrLnByb21pc2UuY2F0Y2goZSA9PiB7fSk7XG4gICAgfVxuICAgIC8vIE5vIG1vcmUgdGFzaywgcHV0IHdvcmtlciBpbiBpZGxlXG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLmlkbGVXb3JrZXJzLnB1c2god29ya2VyKTtcblxuICAgIC8vIHNldHVwIGlkbGUgdGltZXJcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc3QgY21kOiBDb21tYW5kID0ge2V4aXQ6IHRydWV9O1xuICAgICAgaWYgKHdvcmtlciBpbnN0YW5jZW9mIFdvcmtlcikge1xuICAgICAgICB3b3JrZXIucG9zdE1lc3NhZ2UoY21kKTtcbiAgICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSlcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIFJlbW92ZSBleHBpcmVkIHdvcmtlciB0aHJlYWQ6Jywgd29ya2VyLnRocmVhZElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdvcmtlci5zZW5kKGNtZCk7XG4gICAgICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBSZW1vdmUgZXhwaXJlZCBjaGlsZCBwcm9jZXNzOicsIHdvcmtlci5waWQpO1xuICAgICAgfVxuICAgICAgdGhpcy5pZGxlVGltZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIH0sIHRoaXMuaWRsZVRpbWVNcyk7XG4gICAgdGhpcy5pZGxlVGltZXJzLnNldCh3b3JrZXIsIHRpbWVyKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQ2hpbGRQcm9jZXNzKCkge1xuICAgIGNvbnN0IHdvcmtlcjogQ2hpbGRQcm9jZXNzID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyLXByb2Nlc3MnKSwge3NlcmlhbGl6YXRpb246ICdhZHZhbmNlZCcsIHN0ZGlvOiAnaW5oZXJpdCd9KTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuXG4gICAgLy8gaWYgKHRoaXMud29ya2VyT3B0aW9ucyAmJiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UgfHwgdGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSkge1xuICAgIGNvbnN0IHZlcmJvc2UgPSAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZTtcbiAgICBpZiAodmVyYm9zZSlcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBjcmVhdGVDaGlsZFByb2Nlc3MnKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LmluaXRpYWxpemVyKSB7XG4gICAgICBjb25zdCBpbml0VGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrKHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXJcbiAgICAgIH0pO1xuICAgICAgaW5pdFRhc2sucnVuQnlQcm9jZXNzKHdvcmtlciwgISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpO1xuICAgICAgYXdhaXQgaW5pdFRhc2sucHJvbWlzZTtcbiAgICB9XG4gICAgLy8gfVxuICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcblxuICAgIGNvbnN0IG9uV29ya2VyRXhpdCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLmhhcyh3b3JrZXIpKSB7XG4gICAgICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmlkbGVXb3JrZXJzLmluZGV4T2Yod29ya2VyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uV29ya2VyRXhpdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25Xb3JrZXJFeGl0KTtcbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVXb3JrZXIodGFzazogUHJvbWlzZWRUYXNrPGFueT4pIHtcbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gY3JlYXRlV29ya2VyJyk7XG4gICAgfVxuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL3dvcmtlcicpLCB7XG4gICAgICAuLi50aGlzLndvcmtlck9wdGlvbnMsXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICB3b3JrZXJEYXRhOiB7XG4gICAgICAgIGlkOiArK3RoaXMudG90YWxDcmVhdGVkV29ya2VycyArICcnLFxuICAgICAgICB2ZXJib3NlOiAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXIsXG4gICAgICAgIC4uLnRoaXMud29ya2VyT3B0aW9ucz8ud29ya2VyRGF0YSB8fCB7fVxuICAgICAgfVxuICAgIH0pO1xuICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcblxuICAgIGNvbnN0IG9uV29ya2VyRXhpdCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLmhhcyh3b3JrZXIpKSB7XG4gICAgICAgIHRoaXMucnVubmluZ1dvcmtlcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLmlkbGVXb3JrZXJzLmluZGV4T2Yod29ya2VyKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgdGhpcy5pZGxlV29ya2Vycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIG9uV29ya2VyRXhpdCk7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25Xb3JrZXJFeGl0KTtcbiAgICByZXR1cm4gd29ya2VyO1xuICB9XG59XG4iXX0=