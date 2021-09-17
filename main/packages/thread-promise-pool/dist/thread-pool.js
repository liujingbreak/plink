"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pool = void 0;
// tslint:disable no-console
const worker_threads_1 = require("worker_threads");
const child_process_1 = require("child_process");
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
        let worker = (0, child_process_1.fork)(require.resolve('./worker-process'), { serialization: 'advanced', stdio: 'inherit' });
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
        let worker;
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
            // eslint-disable-next-line no-console
            console.log('[thread-pool] createWorker');
        }
        worker = new worker_threads_1.Worker(require.resolve('./worker'), Object.assign(Object.assign({}, this.workerOptions), { 
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsbURBQXFEO0FBQ3JELGlEQUFpRDtBQU1qRCw0Q0FBb0I7QUFHcEIsTUFBTSxZQUFZO0lBTWhCLFlBQW9CLElBQVUsRUFBRSxPQUFPLEdBQUcsS0FBSztRQUEzQixTQUFJLEdBQUosSUFBSSxDQUFNO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsV0FBVyxDQUFDLE1BQWM7UUFFeEIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFzQyxFQUFFLEVBQUU7WUFDM0QsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDdkIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDL0IsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7UUFDSCxDQUFDLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQzlCLHNCQUFzQjtZQUNwQixxREFBcUQ7WUFDdkQsSUFBSTtZQUVKLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNkLElBQUksQ0FBQyxNQUFNLENBQUMs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Q0Y7UUFDSCxDQUFDLENBQUM7UUFDRixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFqS0Qsb0JBaUtDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IHtXb3JrZXIsIFdvcmtlck9wdGlvbnN9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB7Q2hpbGRQcm9jZXNzLCBmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCB7cXVldWV9IGZyb20gJy4vcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0IHtUYXNrLCBDb21tYW5kLCBJbml0aWFsT3B0aW9uc30gZnJvbSAnLi93b3JrZXInO1xuXG5pbXBvcnQge1Rhc2sgYXMgUHJvY2Vzc1Rhc2ssIEluaXRpYWxPcHRpb25zIGFzIEluaXRpYWxPcHRpb25zNFByb2N9IGZyb20gJy4vd29ya2VyLXByb2Nlc3MnO1xuXG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuZXhwb3J0IHtUYXNrfTtcblxuY2xhc3MgUHJvbWlzZWRUYXNrPFQ+IHtcbiAgcHJvbWlzZTogUHJvbWlzZTxUPjtcblxuICByZXNvbHZlOiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzBdO1xuICByZWplY3Q6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMV07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0YXNrOiBUYXNrLCB2ZXJib3NlID0gZmFsc2UpIHtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cblxuICBydW5CeVdvcmtlcih3b3JrZXI6IFdvcmtlcikge1xuXG4gICAgY29uc3Qgb25NZXNzYWdlID0gKG1zZzoge3R5cGU6ICdlcnJvcicgfCAnd2FpdCc7IGRhdGE6IFR9KSA9PiB7XG4gICAgICBpZiAobXNnLnR5cGUgPT09ICd3YWl0Jykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlamVjdChtc2cuZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXhpdCA9IChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIC8vIGlmICh0aGlzLnZlcmJvc2UpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gUHJvbWlzZWRUYXNrIG9uIGV4aXQnKTtcbiAgICAgIC8vIH1cblxuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIHRoaXMucmVqZWN0KGBUaHJlYWQgJHt3b3JrZXIudGhyZWFkSWR9IGV4aXN0IHdpdGggY29kZSBgICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0KGVycik7XG4gICAgfTtcblxuICAgIHdvcmtlci5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgd29ya2VyLm9uKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrfTtcbiAgICBkZWxldGUgbXNnLnRyYW5zZmVyTGlzdDtcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UobXNnLCBtc2cudHJhbnNmZXJMaXN0KTtcbiAgfVxufVxuXG5jbGFzcyBQcm9taXNlZFByb2Nlc3NUYXNrPFQ+IHtcbiAgcHJvbWlzZTogUHJvbWlzZTxUPjtcblxuICByZXNvbHZlOiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzBdO1xuICByZWplY3Q6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMV07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0YXNrOiBQcm9jZXNzVGFzayB8IEluaXRpYWxPcHRpb25zNFByb2MpIHtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cbiAgcnVuQnlQcm9jZXNzKHdvcmtlcjogQ2hpbGRQcm9jZXNzLCB2ZXJib3NlOiBib29sZWFuKSB7XG5cbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JzsgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZShtc2cuZGF0YSk7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgIHRoaXMucmVqZWN0KG1zZy5kYXRhKTtcbiAgICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgb25FeGl0ID0gKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIHRoaXMucmVqZWN0KCdDaGlsZCBwcm9jZXNzIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgLy8gd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0KGVycik7XG4gICAgfTtcblxuICAgIHdvcmtlci5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgLy8gd29ya2VyLm9uKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrLCB2ZXJib3NlfTtcbiAgICBpZiAoIXdvcmtlci5zZW5kKG1zZykpIHtcbiAgICAgIHRoaXMucmVqZWN0KCdJcyBDaGlsZCBwcm9jZXNzIGV2ZW50IHRocmVzaG9sZCBmdWxsPyBUaGlzIGlzIHdlaXJkLicpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9vbCB7XG4gIHByaXZhdGUgcnVubmluZ1dvcmtlcnMgPSBuZXcgU2V0PFdvcmtlciB8IENoaWxkUHJvY2Vzcz4oKTtcbiAgLyoqIExhc3QgaW4gZmlyc3QgcnVuLCBhbHdheXMgcnVuIHRoZSBsYXRlc3QgY3JlYXRlZCB3b3JrZXIsIGdpdmUgY2hhbmNlIGZvciBvbGQgb25lcyB0byBiZSByZW1vdmVkIGFmdGVyIHRpbWVvdXQgKi9cbiAgcHJpdmF0ZSBpZGxlV29ya2VyczogKFdvcmtlciB8IENoaWxkUHJvY2VzcylbXSA9IFtdO1xuXG4gIHByaXZhdGUgaWRsZVRpbWVycyA9IG5ldyBXZWFrTWFwPFdvcmtlciB8IENoaWxkUHJvY2VzcywgUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4+KCk7XG5cbiAgcHJpdmF0ZSB0YXNrczogKFByb21pc2VkVGFzazxhbnk+IHwgUHJvbWlzZWRQcm9jZXNzVGFzazxhbnk+KVtdID0gW107XG4gIHByaXZhdGUgdG90YWxDcmVhdGVkV29ya2VycyA9IDA7XG4gIC8qKlxuICAgKiBAcGFyYW0gbWF4UGFyYWxsZSBtYXggbnVtYmVyIG9mIHBhcmFsbGUgd29ya2VycywgZGVmYXVsdCBpcyBgb3MuY3B1cygpLmxlbmd0aCAtIDFgXG4gICAqIEBwYXJhbSBpZGxlVGltZU1zIGxldCB3b3JrZXIgZXhpdCB0byByZWxlYXNlIG1lbW9yeSwgYWZ0ZXIgYSB3b3JrZXIgYmVpbmcgaWRsZSBmb3Igc29tZSB0aW1lIChpbiBtcylcbiAgICogQHBhcmFtIHdvcmtlck9wdGlvbnMgdGhyZWFkIHdvcmtlciBvcHRpb25zLCBlLmcuIGluaXRpYWxpemluZyBzb21lIGVudmlyb25tZW50XG4gICAqIHN0dWZmXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1heFBhcmFsbGUgPSBvcy5jcHVzKCkubGVuZ3RoIC0gMSwgcHJpdmF0ZSBpZGxlVGltZU1zID0gMCwgcHVibGljIHdvcmtlck9wdGlvbnM/OiBXb3JrZXJPcHRpb25zICYgSW5pdGlhbE9wdGlvbnMpIHtcbiAgfVxuXG4gIHN1Ym1pdDxUPih0YXNrOiBUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRUYXNrPFQ+KHRhc2ssIHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG5cbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gc3VibWl0IHRhc2ssIGlkbGUgd29ya2VyczogJHt0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aH0sIHJ1bm5pbmcgd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuc2l6ZSA8IHRoaXMubWF4UGFyYWxsZSkge1xuICAgICAgLy8gMy4gQ3JlYXRlIG5ldyB3b3JrZXIgaWYgbnVtYmVyIG9mIHRoZW0gaXMgbGVzcyB0aGFuIG1heFBhcmFsbGVcbiAgICAgIHRoaXMuY3JlYXRlV29ya2VyKHByb21pc2VkVGFzayk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHN1Ym1pdFByb2Nlc3M8VD4odGFzazogUHJvY2Vzc1Rhc2spOiBQcm9taXNlPFQ+IHtcbiAgICAvLyAxLiBCaW5kIGEgdGFzayB3aXRoIGEgcHJvbWlzZVxuICAgIGNvbnN0IHByb21pc2VkVGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrPFQ+KHRhc2spO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHN1Ym1pdCBjaGlsZCBwcm9jZXNzLCBpZGxlIHByb2Nlc3M6ICR7dGhpcy5pZGxlV29ya2Vycy5sZW5ndGh9LCBgICtcbiAgICAgIGBydW5uaW5nIHByb2Nlc3Mgb3Igd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHZvaWQgdGhpcy5ydW5Xb3JrZXIod29ya2VyKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuc2l6ZSA8IHRoaXMubWF4UGFyYWxsZSkge1xuICAgICAgLy8gMy4gQ3JlYXRlIG5ldyB3b3JrZXIgaWYgbnVtYmVyIG9mIHRoZW0gaXMgbGVzcyB0aGFuIG1heFBhcmFsbGVcbiAgICAgIHZvaWQgdGhpcy5jcmVhdGVDaGlsZFByb2Nlc3MoKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb21pc2VkVGFzay5wcm9taXNlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5Xb3JrZXIod29ya2VyOiBXb3JrZXIgfCBDaGlsZFByb2Nlc3MpIHtcbiAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5hZGQod29ya2VyKTtcbiAgICB3aGlsZSAodGhpcy50YXNrcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrcy5zaGlmdCgpITtcbiAgICAgIGlmICh3b3JrZXIgaW5zdGFuY2VvZiBXb3JrZXIpXG4gICAgICAgICh0YXNrIGFzIFByb21pc2VkVGFzazxhbnk+KS5ydW5CeVdvcmtlcih3b3JrZXIpO1xuICAgICAgZWxzZVxuICAgICAgICAodGFzayBhcyBQcm9taXNlZFByb2Nlc3NUYXNrPGFueT4pLnJ1bkJ5UHJvY2Vzcyh3b3JrZXIsICEhdGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKTtcbiAgICAgIGF3YWl0IHRhc2sucHJvbWlzZS5jYXRjaChlID0+IHt9KTtcbiAgICB9XG4gICAgLy8gTm8gbW9yZSB0YXNrLCBwdXQgd29ya2VyIGluIGlkbGVcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgIHRoaXMuaWRsZVdvcmtlcnMucHVzaCh3b3JrZXIpO1xuXG4gICAgLy8gc2V0dXAgaWRsZSB0aW1lclxuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjb25zdCBjbWQ6IENvbW1hbmQgPSB7ZXhpdDogdHJ1ZX07XG4gICAgICBpZiAod29ya2VyIGluc3RhbmNlb2YgV29ya2VyKSB7XG4gICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZShjbWQpO1xuICAgICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKVxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gUmVtb3ZlIGV4cGlyZWQgd29ya2VyIHRocmVhZDonLCB3b3JrZXIudGhyZWFkSWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29ya2VyLnNlbmQoY21kKTtcbiAgICAgICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSlcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIFJlbW92ZSBleHBpcmVkIGNoaWxkIHByb2Nlc3M6Jywgd29ya2VyLnBpZCk7XG4gICAgICB9XG4gICAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgfSwgdGhpcy5pZGxlVGltZU1zKTtcbiAgICB0aGlzLmlkbGVUaW1lcnMuc2V0KHdvcmtlciwgdGltZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVDaGlsZFByb2Nlc3MoKSB7XG4gICAgbGV0IHdvcmtlcjogQ2hpbGRQcm9jZXNzID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyLXByb2Nlc3MnKSwge3NlcmlhbGl6YXRpb246ICdhZHZhbmNlZCcsIHN0ZGlvOiAnaW5oZXJpdCd9KTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuXG4gICAgLy8gaWYgKHRoaXMud29ya2VyT3B0aW9ucyAmJiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UgfHwgdGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSkge1xuICAgIGNvbnN0IHZlcmJvc2UgPSAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZTtcbiAgICBpZiAodmVyYm9zZSlcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnW3RocmVhZC1wb29sXSBjcmVhdGVDaGlsZFByb2Nlc3MnKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LmluaXRpYWxpemVyKSB7XG4gICAgICBjb25zdCBpbml0VGFzayA9IG5ldyBQcm9taXNlZFByb2Nlc3NUYXNrKHtcbiAgICAgICAgdmVyYm9zZSxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucz8uaW5pdGlhbGl6ZXJcbiAgICAgICAgfSk7XG4gICAgICBpbml0VGFzay5ydW5CeVByb2Nlc3Mod29ya2VyLCAhIXRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSk7XG4gICAgICBhd2FpdCBpbml0VGFzay5wcm9taXNlO1xuICAgIH1cbiAgICAvLyB9XG4gICAgdm9pZCB0aGlzLnJ1bldvcmtlcih3b3JrZXIpO1xuXG4gICAgY29uc3Qgb25Xb3JrZXJFeGl0ID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMucnVubmluZ1dvcmtlcnMuaGFzKHdvcmtlcikpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuaWRsZVdvcmtlcnMuaW5kZXhPZih3b3JrZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25Xb3JrZXJFeGl0KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCBvbldvcmtlckV4aXQpO1xuICAgIHJldHVybiB3b3JrZXI7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVdvcmtlcih0YXNrOiBQcm9taXNlZFRhc2s8YW55Pikge1xuICAgIGxldCB3b3JrZXI6IFdvcmtlcjtcbiAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zPy52ZXJib3NlKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIGNyZWF0ZVdvcmtlcicpO1xuICAgIH1cbiAgICB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi93b3JrZXInKSwge1xuICAgICAgLi4udGhpcy53b3JrZXJPcHRpb25zLFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgd29ya2VyRGF0YToge1xuICAgICAgICBpZDogKyt0aGlzLnRvdGFsQ3JlYXRlZFdvcmtlcnMgKyAnJyxcbiAgICAgICAgdmVyYm9zZTogISF0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UsXG4gICAgICAgIGluaXRpYWxpemVyOiB0aGlzLndvcmtlck9wdGlvbnM/LmluaXRpYWxpemVyLFxuICAgICAgICAuLi50aGlzLndvcmtlck9wdGlvbnM/LndvcmtlckRhdGEgfHwge31cbiAgICAgIH1cbiAgICB9KTtcbiAgICB2b2lkIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG5cbiAgICBjb25zdCBvbldvcmtlckV4aXQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5oYXMod29ya2VyKSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5pZGxlV29ya2Vycy5pbmRleE9mKHdvcmtlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuaWRsZVdvcmtlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdvcmtlci5vbignZXJyb3InLCBvbldvcmtlckV4aXQpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uV29ya2VyRXhpdCk7XG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxufVxuIl19