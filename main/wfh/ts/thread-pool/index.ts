import { timeStamp } from 'console';
import {Worker} from 'worker_threads';
// import {queue} from './promise-queque';
import {Task, Command} from './worker';
export {Task};

class PromisedTask<T> {
  promise: Promise<T>;

  resolve: Parameters<ConstructorParameters<typeof Promise>[0]>[0];
  reject: Parameters<ConstructorParameters<typeof Promise>[0]>[1];

  constructor(private task: Task) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  runByWorker(worker: Worker, next: () => void) {
    const onMessage = (msg: {type: 'error' | 'wait', data: T}) => {
      if (msg.type === 'wait') {
        this.resolve(msg.data);
      } else if (msg.type === 'error') {
        this.reject(msg.data);
      }
      unsubscribeWorker();
      next();
    };

    const onExit = (code: number) => {
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
    const msg = {...this.task};
    delete msg.transferList;
    worker.postMessage(msg, msg.transferList);
  }
}

export class Pool {
  private runningWorkers = new Set<Worker>();
  /** Last in first run, always run the latest created worker, give chance for old ones to be removed after timeout */
  private idleWorkers: Worker[] = [];

  private idleTimers = new WeakMap<Worker, ReturnType<typeof setTimeout>>();

  private tasks: PromisedTask<any>[];

  /**
   * @param maxParalle max number of paralle workers
   * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
   * @param workerInitTaskFactory generate initial task for a newly created woker, like initialize some environment
   * stuff
   */
  constructor(private maxParalle: number, private idleTimeMs: number, private workerInitTaskFactory?: () => Task) {
  }

  async submit<T>(task: Task): Promise<T> {
    // 1. Bind a task with a promise
    const promisedTask = new PromisedTask<T>(task);

    if (this.idleWorkers.length > 0) {
      // 2. Look for availabe idle worker
      const worker = this.idleWorkers.pop()!;
      this.runWorker(promisedTask, worker);
    } else if (this.runningWorkers.size < this.maxParalle) {
      // 3. Create new worker if number of them is less than maxParalle
      this.createWorker(promisedTask);
    } else {
      // 4. put task with promise in the queue/channel to wait
      this.tasks.push(promisedTask);
    }
    return promisedTask.promise;
  }

  private runWorker(task: PromisedTask<any>, worker: Worker) {
    this.idleTimers.delete(worker);
    this.runningWorkers.add(worker);
    task.runByWorker(worker, () => {
      if (this.tasks.length > 0) {
        // continue work on next task
        this.runWorker(this.tasks.shift()!, worker);
      } else {
        // No more task, put worker in idle
        this.runningWorkers.delete(worker);
        this.idleWorkers.push(worker);

        // setup idle timer
        const timer = setTimeout(() => {
          const cmd: Command = {exit: true};
          worker.postMessage(cmd);
          this.idleTimers.delete(worker);
        }, this.idleTimeMs);
        this.idleTimers.set(worker, timer);
      }
    });
  }

  private createWorker(task: PromisedTask<any>) {
    const worker = new Worker(require.resolve('./worker'));
    if (this.workerInitTaskFactory) {
      this.tasks.push(task);
      const promisedInitTask = new PromisedTask(this.workerInitTaskFactory());
      this.runWorker(promisedInitTask, worker);
    } else {
      this.runWorker(task, worker);
    }
    const onWorkerExit = () => {
      if (this.runningWorkers.has(worker)) {
        this.runningWorkers.delete(worker);
      } else {
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
