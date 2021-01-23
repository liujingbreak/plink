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
    constructor(task) {
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
            unsubscribeWorker();
            if (code !== 0) {
                this.reject('Thread exist with code ' + code);
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
    runByProcess(worker) {
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
        const msg = Object.assign({}, this.task);
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
        var _a;
        // 1. Bind a task with a promise
        const promisedTask = new PromisedTask(task);
        if ((_a = this.workerOptions) === null || _a === void 0 ? void 0 : _a.verbose) {
            console.log(`[thread-pool] submit task, idle workers: ${this.idleWorkers.length}, running workers: ${this.runningWorkers.size}`);
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            const worker = this.idleWorkers.pop();
            this.runWorker(worker);
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
            console.log(`[thread-pool] submit child process, idle process: ${this.idleWorkers.length}, ` +
                `running process or workers: ${this.runningWorkers.size}`);
        }
        this.tasks.push(promisedTask);
        if (this.idleWorkers.length > 0) {
            // 2. Look for availabe idle worker
            const worker = this.idleWorkers.pop();
            this.runWorker(worker);
        }
        else if (this.runningWorkers.size < this.maxParalle) {
            // 3. Create new worker if number of them is less than maxParalle
            this.createChildProcess();
        }
        return promisedTask.promise;
    }
    runWorker(worker) {
        return __awaiter(this, void 0, void 0, function* () {
            this.idleTimers.delete(worker);
            this.runningWorkers.add(worker);
            while (this.tasks.length > 0) {
                const task = this.tasks.shift();
                if (worker instanceof worker_threads_1.Worker)
                    task.runByWorker(worker);
                else
                    task.runByProcess(worker);
                yield task.promise;
            }
            // No more task, put worker in idle
            this.runningWorkers.delete(worker);
            this.idleWorkers.push(worker);
            // setup idle timer
            const timer = setTimeout(() => {
                const cmd = { exit: true };
                if (worker instanceof worker_threads_1.Worker) {
                    worker.postMessage(cmd);
                }
                else {
                    worker.send(cmd);
                }
                this.idleTimers.delete(worker);
            }, this.idleTimeMs);
            this.idleTimers.set(worker, timer);
        });
    }
    createChildProcess() {
        return __awaiter(this, void 0, void 0, function* () {
            let worker = child_process_1.fork(require.resolve('./worker-process'), { serialization: 'advanced', stdio: 'inherit' });
            this.runningWorkers.add(worker);
            if (this.workerOptions && (this.workerOptions.verbose || this.workerOptions.initializer)) {
                if (this.workerOptions.verbose)
                    console.log('[thread-pool] createChildProcess');
                if (this.workerOptions.initializer) {
                    const initTask = new PromisedProcessTask({
                        verbose: this.workerOptions.verbose,
                        initializer: this.workerOptions.initializer
                    });
                    initTask.runByProcess(worker);
                    yield initTask.promise;
                }
            }
            this.runWorker(worker);
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
        });
    }
    createWorker(task) {
        let worker;
        if (this.workerOptions && (this.workerOptions.verbose || this.workerOptions.initializer)) {
            if (this.workerOptions.verbose)
                console.log('[thread-pool] createWorker');
            worker = new worker_threads_1.Worker(require.resolve('./worker'), Object.assign({ workerData: {
                    id: ++this.totalCreatedWorkers + '',
                    verbose: this.workerOptions.verbose,
                    initializer: this.workerOptions.initializer
                } }, this.workerOptions));
        }
        else {
            worker = new worker_threads_1.Worker(require.resolve('./worker'), this.workerOptions);
        }
        this.runWorker(worker);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkLXBvb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aHJlYWQtcG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsbURBQXFEO0FBQ3JELGlEQUFpRDtBQU1qRCw0Q0FBb0I7QUFHcEIsTUFBTSxZQUFZO0lBTWhCLFlBQW9CLElBQVU7UUFBVixTQUFJLEdBQUosSUFBSSxDQUFNO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsV0FBVyxDQUFDLE1BQWM7UUFFeEIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFzQyxFQUFFLEVBQUU7WUFDM0QsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDdkIsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtnQkFDL0IsaUJBQWlCLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7UUFDSCxDQUFDLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQzlCLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNkLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLENBQUM7YUFDL0M7UUFDSCxDQUFDLENBQUM7UUFFRixN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QUFJLHVCQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDdEU7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXZCLE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRTtZQUN4QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNuQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNwQztpQkFBTTtnQkFDTCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFO29CQUNaLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDakM7YUFDRjtRQUNILENBQUMsQ0FBQztRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQXZKRCxvQkF1SkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlXG5pbXBvcnQge1dvcmtlciwgV29ya2VyT3B0aW9uc30gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHtDaGlsZFByb2Nlc3MsIGZvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gaW1wb3J0IHtxdWV1ZX0gZnJvbSAnLi9wcm9taXNlLXF1ZXF1ZSc7XG5pbXBvcnQge1Rhc2ssIENvbW1hbmQsIEluaXRpYWxPcHRpb25zfSBmcm9tICcuL3dvcmtlcic7XG5cbmltcG9ydCB7VGFzayBhcyBQcm9jZXNzVGFzaywgSW5pdGlhbE9wdGlvbnMgYXMgSW5pdGlhbE9wdGlvbnM0UHJvY30gZnJvbSAnLi93b3JrZXItcHJvY2Vzcyc7XG5cbmltcG9ydCBvcyBmcm9tICdvcyc7XG5leHBvcnQge1Rhc2t9O1xuXG5jbGFzcyBQcm9taXNlZFRhc2s8VD4ge1xuICBwcm9taXNlOiBQcm9taXNlPFQ+O1xuXG4gIHJlc29sdmU6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMF07XG4gIHJlamVjdDogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlsxXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRhc2s6IFRhc2spIHtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cblxuICBydW5CeVdvcmtlcih3b3JrZXI6IFdvcmtlcikge1xuXG4gICAgY29uc3Qgb25NZXNzYWdlID0gKG1zZzoge3R5cGU6ICdlcnJvcicgfCAnd2FpdCcsIGRhdGE6IFR9KSA9PiB7XG4gICAgICBpZiAobXNnLnR5cGUgPT09ICd3YWl0Jykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICB1bnN1YnNjcmliZVdvcmtlcigpO1xuICAgICAgICB0aGlzLnJlamVjdChtc2cuZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IG9uRXhpdCA9IChjb2RlOiBudW1iZXIpID0+IHtcbiAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICB0aGlzLnJlamVjdCgnVGhyZWFkIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0KGVycik7XG4gICAgfTtcblxuICAgIHdvcmtlci5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgd29ya2VyLm9uKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrfTtcbiAgICBkZWxldGUgbXNnLnRyYW5zZmVyTGlzdDtcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UobXNnLCBtc2cudHJhbnNmZXJMaXN0KTtcbiAgfVxufVxuXG5jbGFzcyBQcm9taXNlZFByb2Nlc3NUYXNrPFQ+IHtcbiAgcHJvbWlzZTogUHJvbWlzZTxUPjtcblxuICByZXNvbHZlOiBQYXJhbWV0ZXJzPENvbnN0cnVjdG9yUGFyYW1ldGVyczx0eXBlb2YgUHJvbWlzZT5bMF0+WzBdO1xuICByZWplY3Q6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMV07XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0YXNrOiBQcm9jZXNzVGFzayB8IEluaXRpYWxPcHRpb25zNFByb2MpIHtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cbiAgcnVuQnlQcm9jZXNzKHdvcmtlcjogQ2hpbGRQcm9jZXNzKSB7XG5cbiAgICBjb25zdCBvbk1lc3NhZ2UgPSAobXNnOiB7dHlwZTogJ2Vycm9yJyB8ICd3YWl0JywgZGF0YTogVH0pID0+IHtcbiAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3dhaXQnKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVzb2x2ZShtc2cuZGF0YSk7XG4gICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgIHVuc3Vic2NyaWJlV29ya2VyKCk7XG4gICAgICAgIHRoaXMucmVqZWN0KG1zZy5kYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgb25FeGl0ID0gKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgIHRoaXMucmVqZWN0KCdDaGlsZCBwcm9jZXNzIGV4aXN0IHdpdGggY29kZSAnICsgY29kZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHVuc3Vic2NyaWJlV29ya2VyID0gKCkgPT4ge1xuICAgICAgd29ya2VyLm9mZignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgICB3b3JrZXIub2ZmKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgLy8gd29ya2VyLm9mZignbWVzc2FnZWVycm9yJywgb25FcnJvcik7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FcnJvciA9IChlcnI6IGFueSkgPT4ge1xuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIHRoaXMucmVqZWN0KGVycik7XG4gICAgfTtcblxuICAgIHdvcmtlci5vbignbWVzc2FnZScsIG9uTWVzc2FnZSk7XG4gICAgLy8gd29ya2VyLm9uKCdtZXNzYWdlZXJyb3InLCBvbkVycm9yKTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgd29ya2VyLm9uKCdleGl0Jywgb25FeGl0KTtcbiAgICBjb25zdCBtc2cgPSB7Li4udGhpcy50YXNrfTtcbiAgICBpZiAoIXdvcmtlci5zZW5kKG1zZykpIHtcbiAgICAgIHRoaXMucmVqZWN0KCdJcyBDaGlsZCBwcm9jZXNzIGV2ZW50IHRocmVzaG9sZCBmdWxsPyBUaGlzIGlzIHdlaXJkLicpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9vbCB7XG4gIHByaXZhdGUgcnVubmluZ1dvcmtlcnMgPSBuZXcgU2V0PFdvcmtlcnxDaGlsZFByb2Nlc3M+KCk7XG4gIC8qKiBMYXN0IGluIGZpcnN0IHJ1biwgYWx3YXlzIHJ1biB0aGUgbGF0ZXN0IGNyZWF0ZWQgd29ya2VyLCBnaXZlIGNoYW5jZSBmb3Igb2xkIG9uZXMgdG8gYmUgcmVtb3ZlZCBhZnRlciB0aW1lb3V0ICovXG4gIHByaXZhdGUgaWRsZVdvcmtlcnM6IChXb3JrZXJ8Q2hpbGRQcm9jZXNzKVtdID0gW107XG5cbiAgcHJpdmF0ZSBpZGxlVGltZXJzID0gbmV3IFdlYWtNYXA8V29ya2VyIHwgQ2hpbGRQcm9jZXNzLCBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0Pj4oKTtcblxuICBwcml2YXRlIHRhc2tzOiAoUHJvbWlzZWRUYXNrPGFueT4gfCBQcm9taXNlZFByb2Nlc3NUYXNrPGFueT4pW10gPSBbXTtcbiAgcHJpdmF0ZSB0b3RhbENyZWF0ZWRXb3JrZXJzID0gMDtcbiAgLyoqXG4gICAqIEBwYXJhbSBtYXhQYXJhbGxlIG1heCBudW1iZXIgb2YgcGFyYWxsZSB3b3JrZXJzLCBkZWZhdWx0IGlzIGBvcy5jcHVzKCkubGVuZ3RoIC0gMWBcbiAgICogQHBhcmFtIGlkbGVUaW1lTXMgbGV0IHdvcmtlciBleGl0IHRvIHJlbGVhc2UgbWVtb3J5LCBhZnRlciBhIHdvcmtlciBiZWluZyBpZGxlIGZvciBzb21lIHRpbWUgKGluIG1zKVxuICAgKiBAcGFyYW0gd29ya2VyT3B0aW9ucyB0aHJlYWQgd29ya2VyIG9wdGlvbnMsIGUuZy4gaW5pdGlhbGl6aW5nIHNvbWUgZW52aXJvbm1lbnRcbiAgICogc3R1ZmZcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbWF4UGFyYWxsZSA9IG9zLmNwdXMoKS5sZW5ndGggLSAxLCBwcml2YXRlIGlkbGVUaW1lTXMgPSAwLCBwcml2YXRlIHdvcmtlck9wdGlvbnM/OiBXb3JrZXJPcHRpb25zICYgSW5pdGlhbE9wdGlvbnMpIHtcbiAgfVxuXG4gIHN1Ym1pdDxUPih0YXNrOiBUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRUYXNrPFQ+KHRhc2spO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucz8udmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gc3VibWl0IHRhc2ssIGlkbGUgd29ya2VyczogJHt0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aH0sIHJ1bm5pbmcgd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZVdvcmtlcihwcm9taXNlZFRhc2spO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrLnByb21pc2U7XG4gIH1cblxuICBzdWJtaXRQcm9jZXNzPFQ+KHRhc2s6IFByb2Nlc3NUYXNrKTogUHJvbWlzZTxUPiB7XG4gICAgLy8gMS4gQmluZCBhIHRhc2sgd2l0aCBhIHByb21pc2VcbiAgICBjb25zdCBwcm9taXNlZFRhc2sgPSBuZXcgUHJvbWlzZWRQcm9jZXNzVGFzazxUPih0YXNrKTtcblxuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnM/LnZlcmJvc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIHN1Ym1pdCBjaGlsZCBwcm9jZXNzLCBpZGxlIHByb2Nlc3M6ICR7dGhpcy5pZGxlV29ya2Vycy5sZW5ndGh9LCBgICtcbiAgICAgIGBydW5uaW5nIHByb2Nlc3Mgb3Igd29ya2VyczogJHt0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemV9YCk7XG4gICAgfVxuICAgIHRoaXMudGFza3MucHVzaChwcm9taXNlZFRhc2spO1xuICAgIGlmICh0aGlzLmlkbGVXb3JrZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIDIuIExvb2sgZm9yIGF2YWlsYWJlIGlkbGUgd29ya2VyXG4gICAgICBjb25zdCB3b3JrZXIgPSB0aGlzLmlkbGVXb3JrZXJzLnBvcCgpITtcbiAgICAgIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZUNoaWxkUHJvY2VzcygpO1xuICAgIH1cbiAgICByZXR1cm4gcHJvbWlzZWRUYXNrLnByb21pc2U7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJ1bldvcmtlcih3b3JrZXI6IFdvcmtlciB8IENoaWxkUHJvY2Vzcykge1xuICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuICAgIHdoaWxlICh0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tzLnNoaWZ0KCkhO1xuICAgICAgaWYgKHdvcmtlciBpbnN0YW5jZW9mIFdvcmtlcilcbiAgICAgICAgKHRhc2sgYXMgUHJvbWlzZWRUYXNrPGFueT4pLnJ1bkJ5V29ya2VyKHdvcmtlcik7XG4gICAgICBlbHNlXG4gICAgICAgICh0YXNrIGFzIFByb21pc2VkUHJvY2Vzc1Rhc2s8YW55PikucnVuQnlQcm9jZXNzKHdvcmtlcik7XG4gICAgICBhd2FpdCB0YXNrLnByb21pc2U7XG4gICAgfVxuICAgIC8vIE5vIG1vcmUgdGFzaywgcHV0IHdvcmtlciBpbiBpZGxlXG4gICAgdGhpcy5ydW5uaW5nV29ya2Vycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLmlkbGVXb3JrZXJzLnB1c2god29ya2VyKTtcblxuICAgIC8vIHNldHVwIGlkbGUgdGltZXJcbiAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc3QgY21kOiBDb21tYW5kID0ge2V4aXQ6IHRydWV9O1xuICAgICAgaWYgKHdvcmtlciBpbnN0YW5jZW9mIFdvcmtlcikge1xuICAgICAgICB3b3JrZXIucG9zdE1lc3NhZ2UoY21kKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdvcmtlci5zZW5kKGNtZCk7XG4gICAgICB9XG4gICAgICB0aGlzLmlkbGVUaW1lcnMuZGVsZXRlKHdvcmtlcik7XG4gICAgfSwgdGhpcy5pZGxlVGltZU1zKTtcbiAgICB0aGlzLmlkbGVUaW1lcnMuc2V0KHdvcmtlciwgdGltZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVDaGlsZFByb2Nlc3MoKSB7XG4gICAgbGV0IHdvcmtlcjogQ2hpbGRQcm9jZXNzID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyLXByb2Nlc3MnKSwge3NlcmlhbGl6YXRpb246ICdhZHZhbmNlZCcsIHN0ZGlvOiAnaW5oZXJpdCd9KTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuXG4gICAgaWYgKHRoaXMud29ya2VyT3B0aW9ucyAmJiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UgfHwgdGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSkge1xuXG4gICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UpXG4gICAgICAgIGNvbnNvbGUubG9nKCdbdGhyZWFkLXBvb2xdIGNyZWF0ZUNoaWxkUHJvY2VzcycpO1xuXG4gICAgICBpZiAodGhpcy53b3JrZXJPcHRpb25zLmluaXRpYWxpemVyKSB7XG4gICAgICAgIGNvbnN0IGluaXRUYXNrID0gbmV3IFByb21pc2VkUHJvY2Vzc1Rhc2soe1xuICAgICAgICAgIHZlcmJvc2U6IHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlLFxuICAgICAgICAgIGluaXRpYWxpemVyOiB0aGlzLndvcmtlck9wdGlvbnMuaW5pdGlhbGl6ZXJcbiAgICAgICAgICB9KTtcbiAgICAgICAgaW5pdFRhc2sucnVuQnlQcm9jZXNzKHdvcmtlcik7XG4gICAgICAgIGF3YWl0IGluaXRUYXNrLnByb21pc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG5cbiAgICBjb25zdCBvbldvcmtlckV4aXQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5oYXMod29ya2VyKSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5pZGxlV29ya2Vycy5pbmRleE9mKHdvcmtlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuaWRsZVdvcmtlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdvcmtlci5vbignZXJyb3InLCBvbldvcmtlckV4aXQpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uV29ya2VyRXhpdCk7XG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlV29ya2VyKHRhc2s6IFByb21pc2VkVGFzazxhbnk+KSB7XG4gICAgbGV0IHdvcmtlcjogV29ya2VyO1xuICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnMgJiYgKHRoaXMud29ya2VyT3B0aW9ucy52ZXJib3NlIHx8IHRoaXMud29ya2VyT3B0aW9ucy5pbml0aWFsaXplcikpIHtcbiAgICAgIGlmICh0aGlzLndvcmtlck9wdGlvbnMudmVyYm9zZSlcbiAgICAgICAgY29uc29sZS5sb2coJ1t0aHJlYWQtcG9vbF0gY3JlYXRlV29ya2VyJyk7XG4gICAgICB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi93b3JrZXInKSwge1xuICAgICAgICB3b3JrZXJEYXRhOiB7XG4gICAgICAgICAgaWQ6ICsrdGhpcy50b3RhbENyZWF0ZWRXb3JrZXJzICsgJycsXG4gICAgICAgICAgdmVyYm9zZTogdGhpcy53b3JrZXJPcHRpb25zLnZlcmJvc2UsXG4gICAgICAgICAgaW5pdGlhbGl6ZXI6IHRoaXMud29ya2VyT3B0aW9ucy5pbml0aWFsaXplcn0sXG4gICAgICAgICAgLi4udGhpcy53b3JrZXJPcHRpb25zXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyJyksIHRoaXMud29ya2VyT3B0aW9ucyk7XG4gICAgfVxuICAgIHRoaXMucnVuV29ya2VyKHdvcmtlcik7XG5cbiAgICBjb25zdCBvbldvcmtlckV4aXQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5oYXMod29ya2VyKSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5pZGxlV29ya2Vycy5pbmRleE9mKHdvcmtlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuaWRsZVdvcmtlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdvcmtlci5vbignZXJyb3InLCBvbldvcmtlckV4aXQpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uV29ya2VyRXhpdCk7XG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxufVxuIl19