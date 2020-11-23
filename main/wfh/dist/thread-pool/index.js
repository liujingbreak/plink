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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy90aHJlYWQtcG9vbC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSxtREFBc0M7QUFLdEMsTUFBTSxZQUFZO0lBTWhCLFlBQW9CLElBQVU7UUFBVixTQUFJLEdBQUosSUFBSSxDQUFNO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsV0FBVyxDQUFDLE1BQWMsRUFBRSxJQUFnQjtRQUMxQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQXNDLEVBQUUsRUFBRTtZQUMzRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO2dCQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN4QjtpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFO2dCQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN2QjtZQUNELGlCQUFpQixFQUFFLENBQUM7WUFDcEIsSUFBSSxFQUFFLENBQUM7UUFDVCxDQUFDLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQzlCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLEVBQUU7WUFDN0IsTUFBTSxDQUFDLEdBQUcsQ0FB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aUJBQU07Z0JBQ0wsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRTtvQkFDWixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2pDO2FBQ0Y7UUFDSCxDQUFDLENBQUM7UUFDRixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoQyxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUFsRkQsb0JBa0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbi8vIGltcG9ydCB7cXVldWV9IGZyb20gJy4vcHJvbWlzZS1xdWVxdWUnO1xuaW1wb3J0IHtUYXNrLCBDb21tYW5kfSBmcm9tICcuL3dvcmtlcic7XG5leHBvcnQge1Rhc2t9O1xuXG5jbGFzcyBQcm9taXNlZFRhc2s8VD4ge1xuICBwcm9taXNlOiBQcm9taXNlPFQ+O1xuXG4gIHJlc29sdmU6IFBhcmFtZXRlcnM8Q29uc3RydWN0b3JQYXJhbWV0ZXJzPHR5cGVvZiBQcm9taXNlPlswXT5bMF07XG4gIHJlamVjdDogUGFyYW1ldGVyczxDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFByb21pc2U+WzBdPlsxXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRhc2s6IFRhc2spIHtcbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cblxuICBydW5CeVdvcmtlcih3b3JrZXI6IFdvcmtlciwgbmV4dDogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IG9uTWVzc2FnZSA9IChtc2c6IHt0eXBlOiAnZXJyb3InIHwgJ3dhaXQnLCBkYXRhOiBUfSkgPT4ge1xuICAgICAgaWYgKG1zZy50eXBlID09PSAnd2FpdCcpIHtcbiAgICAgICAgdGhpcy5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgdGhpcy5yZWplY3QobXNnLmRhdGEpO1xuICAgICAgfVxuICAgICAgdW5zdWJzY3JpYmVXb3JrZXIoKTtcbiAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgY29uc3Qgb25FeGl0ID0gKGNvZGU6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgdGhpcy5yZWplY3QoJ1RocmVhZCBleGlzdCB3aXRoIGNvZGUgJyArIGNvZGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB1bnN1YnNjcmliZVdvcmtlciA9ICgpID0+IHtcbiAgICAgIHdvcmtlci5vZmYoJ21lc3NhZ2UnLCBvbk1lc3NhZ2UpO1xuICAgICAgd29ya2VyLm9mZignZXJyb3InLCB0aGlzLnJlamVjdCk7XG4gICAgICB3b3JrZXIub2ZmKCdtZXNzYWdlZXJyb3InLCB0aGlzLnJlamVjdCk7XG4gICAgICB3b3JrZXIub2ZmKCdleGl0Jywgb25FeGl0KTtcbiAgICB9O1xuXG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgb25NZXNzYWdlKTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2VlcnJvcicsIHRoaXMucmVqZWN0KTsgLy8gVE9ETzogbm90IHN1cmUgaWYgd29yayB3aWxsIGV4aXRcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgdGhpcy5yZWplY3QpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uRXhpdCk7XG4gICAgY29uc3QgbXNnID0gey4uLnRoaXMudGFza307XG4gICAgZGVsZXRlIG1zZy50cmFuc2Zlckxpc3Q7XG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKG1zZywgbXNnLnRyYW5zZmVyTGlzdCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBvb2wge1xuICBwcml2YXRlIHJ1bm5pbmdXb3JrZXJzID0gbmV3IFNldDxXb3JrZXI+KCk7XG4gIC8qKiBMYXN0IGluIGZpcnN0IHJ1biwgYWx3YXlzIHJ1biB0aGUgbGF0ZXN0IGNyZWF0ZWQgd29ya2VyLCBnaXZlIGNoYW5jZSBmb3Igb2xkIG9uZXMgdG8gYmUgcmVtb3ZlZCBhZnRlciB0aW1lb3V0ICovXG4gIHByaXZhdGUgaWRsZVdvcmtlcnM6IFdvcmtlcltdID0gW107XG5cbiAgcHJpdmF0ZSBpZGxlVGltZXJzID0gbmV3IFdlYWtNYXA8V29ya2VyLCBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0Pj4oKTtcblxuICBwcml2YXRlIHRhc2tzOiBQcm9taXNlZFRhc2s8YW55PltdO1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gbWF4UGFyYWxsZSBtYXggbnVtYmVyIG9mIHBhcmFsbGUgd29ya2Vyc1xuICAgKiBAcGFyYW0gaWRsZVRpbWVNcyBsZXQgd29ya2VyIGV4aXQgdG8gcmVsZWFzZSBtZW1vcnksIGFmdGVyIGEgd29ya2VyIGJlaW5nIGlkbGUgZm9yIHNvbWUgdGltZSAoaW4gbXMpXG4gICAqIEBwYXJhbSB3b3JrZXJJbml0VGFza0ZhY3RvcnkgZ2VuZXJhdGUgaW5pdGlhbCB0YXNrIGZvciBhIG5ld2x5IGNyZWF0ZWQgd29rZXIsIGxpa2UgaW5pdGlhbGl6ZSBzb21lIGVudmlyb25tZW50XG4gICAqIHN0dWZmXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG1heFBhcmFsbGU6IG51bWJlciwgcHJpdmF0ZSBpZGxlVGltZU1zOiBudW1iZXIsIHByaXZhdGUgd29ya2VySW5pdFRhc2tGYWN0b3J5PzogKCkgPT4gVGFzaykge1xuICB9XG5cbiAgYXN5bmMgc3VibWl0PFQ+KHRhc2s6IFRhc2spOiBQcm9taXNlPFQ+IHtcbiAgICAvLyAxLiBCaW5kIGEgdGFzayB3aXRoIGEgcHJvbWlzZVxuICAgIGNvbnN0IHByb21pc2VkVGFzayA9IG5ldyBQcm9taXNlZFRhc2s8VD4odGFzayk7XG5cbiAgICBpZiAodGhpcy5pZGxlV29ya2Vycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyAyLiBMb29rIGZvciBhdmFpbGFiZSBpZGxlIHdvcmtlclxuICAgICAgY29uc3Qgd29ya2VyID0gdGhpcy5pZGxlV29ya2Vycy5wb3AoKSE7XG4gICAgICB0aGlzLnJ1bldvcmtlcihwcm9taXNlZFRhc2ssIHdvcmtlcik7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bm5pbmdXb3JrZXJzLnNpemUgPCB0aGlzLm1heFBhcmFsbGUpIHtcbiAgICAgIC8vIDMuIENyZWF0ZSBuZXcgd29ya2VyIGlmIG51bWJlciBvZiB0aGVtIGlzIGxlc3MgdGhhbiBtYXhQYXJhbGxlXG4gICAgICB0aGlzLmNyZWF0ZVdvcmtlcihwcm9taXNlZFRhc2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyA0LiBwdXQgdGFzayB3aXRoIHByb21pc2UgaW4gdGhlIHF1ZXVlL2NoYW5uZWwgdG8gd2FpdFxuICAgICAgdGhpcy50YXNrcy5wdXNoKHByb21pc2VkVGFzayk7XG4gICAgfVxuICAgIHJldHVybiBwcm9taXNlZFRhc2sucHJvbWlzZTtcbiAgfVxuXG4gIHByaXZhdGUgcnVuV29ya2VyKHRhc2s6IFByb21pc2VkVGFzazxhbnk+LCB3b3JrZXI6IFdvcmtlcikge1xuICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmFkZCh3b3JrZXIpO1xuICAgIHRhc2sucnVuQnlXb3JrZXIod29ya2VyLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy50YXNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIGNvbnRpbnVlIHdvcmsgb24gbmV4dCB0YXNrXG4gICAgICAgIHRoaXMucnVuV29ya2VyKHRoaXMudGFza3Muc2hpZnQoKSEsIHdvcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBObyBtb3JlIHRhc2ssIHB1dCB3b3JrZXIgaW4gaWRsZVxuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgICB0aGlzLmlkbGVXb3JrZXJzLnB1c2god29ya2VyKTtcblxuICAgICAgICAvLyBzZXR1cCBpZGxlIHRpbWVyXG4gICAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY21kOiBDb21tYW5kID0ge2V4aXQ6IHRydWV9O1xuICAgICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZShjbWQpO1xuICAgICAgICAgIHRoaXMuaWRsZVRpbWVycy5kZWxldGUod29ya2VyKTtcbiAgICAgICAgfSwgdGhpcy5pZGxlVGltZU1zKTtcbiAgICAgICAgdGhpcy5pZGxlVGltZXJzLnNldCh3b3JrZXIsIHRpbWVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlV29ya2VyKHRhc2s6IFByb21pc2VkVGFzazxhbnk+KSB7XG4gICAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vd29ya2VyJykpO1xuICAgIGlmICh0aGlzLndvcmtlckluaXRUYXNrRmFjdG9yeSkge1xuICAgICAgdGhpcy50YXNrcy5wdXNoKHRhc2spO1xuICAgICAgY29uc3QgcHJvbWlzZWRJbml0VGFzayA9IG5ldyBQcm9taXNlZFRhc2sodGhpcy53b3JrZXJJbml0VGFza0ZhY3RvcnkoKSk7XG4gICAgICB0aGlzLnJ1bldvcmtlcihwcm9taXNlZEluaXRUYXNrLCB3b3JrZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJ1bldvcmtlcih0YXNrLCB3b3JrZXIpO1xuICAgIH1cbiAgICBjb25zdCBvbldvcmtlckV4aXQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5ydW5uaW5nV29ya2Vycy5oYXMod29ya2VyKSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmdXb3JrZXJzLmRlbGV0ZSh3b3JrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5pZGxlV29ya2Vycy5pbmRleE9mKHdvcmtlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuaWRsZVdvcmtlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdvcmtlci5vbignZXJyb3InLCBvbldvcmtlckV4aXQpO1xuICAgIHdvcmtlci5vbignZXhpdCcsIG9uV29ya2VyRXhpdCk7XG4gICAgcmV0dXJuIHdvcmtlcjtcbiAgfVxufVxuIl19