// tslint:disable no-console
import {Worker, WorkerOptions} from 'worker_threads';
// import {queue} from './promise-queque';
import {Task, Command, InitialOptions} from './worker';
import os from 'os';
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

  private tasks: PromisedTask<any>[] = [];
  private totalCreatedWorkers = 0;

  /**
   * @param maxParalle max number of paralle workers, default is `os.cpus().length - 1`
   * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
   * @param workerOptions thread worker options, e.g. initializing some environment
   * stuff
   */
  constructor(private maxParalle = os.cpus().length - 1, private idleTimeMs = 0, private workerOptions?: WorkerOptions & InitialOptions) {
  }

  async submit<T>(task: Task): Promise<T> {
    // 1. Bind a task with a promise
    const promisedTask = new PromisedTask<T>(task);

    if (this.workerOptions?.verbose) {
      console.log(`[thread-pool] submit task, idle workers: ${this.idleWorkers.length}, running workers: ${this.runningWorkers.size}`);
    }

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
    let worker: Worker;
    if (this.workerOptions && (this.workerOptions.verbose || this.workerOptions.initializer)) {
      if (this.workerOptions.verbose)
        console.log('[thread-pool] createWorker');
      worker = new Worker(require.resolve('./worker'), {
        workerData: {
          id: ++this.totalCreatedWorkers + '',
          verbose: this.workerOptions.verbose,
          initializer: this.workerOptions.initializer},
          ...this.workerOptions
      });
    } else {
      worker = new Worker(require.resolve('./worker'), this.workerOptions);
    }
    this.runWorker(task, worker);

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
