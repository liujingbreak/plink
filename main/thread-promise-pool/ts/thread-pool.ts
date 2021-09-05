// tslint:disable no-console
import {Worker, WorkerOptions} from 'worker_threads';
import {ChildProcess, fork} from 'child_process';
// import {queue} from './promise-queque';
import {Task, Command, InitialOptions} from './worker';

import {Task as ProcessTask, InitialOptions as InitialOptions4Proc} from './worker-process';

import os from 'os';
export {Task};

class PromisedTask<T> {
  promise: Promise<T>;

  resolve: Parameters<ConstructorParameters<typeof Promise>[0]>[0];
  reject: Parameters<ConstructorParameters<typeof Promise>[0]>[1];

  constructor(private task: Task, verbose = false) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  runByWorker(worker: Worker) {

    const onMessage = (msg: {type: 'error' | 'wait'; data: T}) => {
      if (msg.type === 'wait') {
        unsubscribeWorker();
        this.resolve(msg.data);
      } else if (msg.type === 'error') {
        unsubscribeWorker();
        this.reject(msg.data);
      }
    };

    const onExit = (code: number) => {
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

    const onError = (err: any) => {
      unsubscribeWorker();
      this.reject(err);
    };

    worker.on('message', onMessage);
    worker.on('messageerror', onError); // TODO: not sure if work will exit
    worker.on('error', onError);
    worker.on('exit', onExit);
    const msg = {...this.task};
    delete msg.transferList;
    worker.postMessage(msg, msg.transferList);
  }
}

class PromisedProcessTask<T> {
  promise: Promise<T>;

  resolve: Parameters<ConstructorParameters<typeof Promise>[0]>[0];
  reject: Parameters<ConstructorParameters<typeof Promise>[0]>[1];

  constructor(private task: ProcessTask | InitialOptions4Proc) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  runByProcess(worker: ChildProcess, verbose: boolean) {

    const onMessage = (msg: {type: 'error' | 'wait'; data: T}) => {
      if (msg.type === 'wait') {
        this.resolve(msg.data);
        unsubscribeWorker();
      } else if (msg.type === 'error') {
        this.reject(msg.data);
        unsubscribeWorker();
      }
    };

    const onExit = (code: number) => {
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

    const onError = (err: any) => {
      unsubscribeWorker();
      this.reject(err);
    };

    worker.on('message', onMessage);
    // worker.on('messageerror', onError); // TODO: not sure if work will exit
    worker.on('error', onError);
    worker.on('exit', onExit);
    const msg = {...this.task, verbose};
    if (!worker.send(msg)) {
      this.reject('Is Child process event threshold full? This is weird.');
    }
  }
}

export class Pool {
  private runningWorkers = new Set<Worker | ChildProcess>();
  /** Last in first run, always run the latest created worker, give chance for old ones to be removed after timeout */
  private idleWorkers: (Worker | ChildProcess)[] = [];

  private idleTimers = new WeakMap<Worker | ChildProcess, ReturnType<typeof setTimeout>>();

  private tasks: (PromisedTask<any> | PromisedProcessTask<any>)[] = [];
  private totalCreatedWorkers = 0;
  /**
   * @param maxParalle max number of paralle workers, default is `os.cpus().length - 1`
   * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
   * @param workerOptions thread worker options, e.g. initializing some environment
   * stuff
   */
  constructor(private maxParalle = os.cpus().length - 1, private idleTimeMs = 0, public workerOptions?: WorkerOptions & InitialOptions) {
  }

  submit<T>(task: Task): Promise<T> {
    // 1. Bind a task with a promise
    const promisedTask = new PromisedTask<T>(task, this.workerOptions?.verbose);

    if (this.workerOptions?.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[thread-pool] submit task, idle workers: ${this.idleWorkers.length}, running workers: ${this.runningWorkers.size}`);
    }
    this.tasks.push(promisedTask);
    if (this.idleWorkers.length > 0) {
      // 2. Look for availabe idle worker
      const worker = this.idleWorkers.pop()!;
      void this.runWorker(worker);
    } else if (this.runningWorkers.size < this.maxParalle) {
      // 3. Create new worker if number of them is less than maxParalle
      this.createWorker(promisedTask);
    }
    return promisedTask.promise;
  }

  submitProcess<T>(task: ProcessTask): Promise<T> {
    // 1. Bind a task with a promise
    const promisedTask = new PromisedProcessTask<T>(task);

    if (this.workerOptions?.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[thread-pool] submit child process, idle process: ${this.idleWorkers.length}, ` +
      `running process or workers: ${this.runningWorkers.size}`);
    }
    this.tasks.push(promisedTask);
    if (this.idleWorkers.length > 0) {
      // 2. Look for availabe idle worker
      const worker = this.idleWorkers.pop()!;
      void this.runWorker(worker);
    } else if (this.runningWorkers.size < this.maxParalle) {
      // 3. Create new worker if number of them is less than maxParalle
      void this.createChildProcess();
    }
    return promisedTask.promise;
  }

  private async runWorker(worker: Worker | ChildProcess) {
    this.idleTimers.delete(worker);
    this.runningWorkers.add(worker);
    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      if (worker instanceof Worker)
        (task as PromisedTask<any>).runByWorker(worker);
      else
        (task as PromisedProcessTask<any>).runByProcess(worker, !!this.workerOptions?.verbose);
      await task.promise.catch(e => {});
    }
    // No more task, put worker in idle
    this.runningWorkers.delete(worker);
    this.idleWorkers.push(worker);

    // setup idle timer
    const timer = setTimeout(() => {
      const cmd: Command = {exit: true};
      if (worker instanceof Worker) {
        worker.postMessage(cmd);
        if (this.workerOptions?.verbose)
          // eslint-disable-next-line no-console
          console.log('[thread-pool] Remove expired worker thread:', worker.threadId);
      } else {
        worker.send(cmd);
        if (this.workerOptions?.verbose)
          // eslint-disable-next-line no-console
          console.log('[thread-pool] Remove expired child process:', worker.pid);
      }
      this.idleTimers.delete(worker);
    }, this.idleTimeMs);
    this.idleTimers.set(worker, timer);
  }

  private async createChildProcess() {
    let worker: ChildProcess = fork(require.resolve('./worker-process'), {serialization: 'advanced', stdio: 'inherit'});
    this.runningWorkers.add(worker);

    // if (this.workerOptions && (this.workerOptions.verbose || this.workerOptions.initializer)) {
    const verbose = !!this.workerOptions?.verbose;
    if (verbose)
      // eslint-disable-next-line no-console
      console.log('[thread-pool] createChildProcess');

    if (this.workerOptions?.initializer) {
      const initTask = new PromisedProcessTask({
        verbose,
        initializer: this.workerOptions?.initializer
        });
      initTask.runByProcess(worker, !!this.workerOptions?.verbose);
      await initTask.promise;
    }
    // }
    void this.runWorker(worker);

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

  private createWorker(task: PromisedTask<any>) {
    let worker: Worker;
    if (this.workerOptions?.verbose) {
        // eslint-disable-next-line no-console
        console.log('[thread-pool] createWorker');
    }
    worker = new Worker(require.resolve('./worker'), {
      ...this.workerOptions,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      workerData: {
        id: ++this.totalCreatedWorkers + '',
        verbose: !!this.workerOptions?.verbose,
        initializer: this.workerOptions?.initializer,
        ...this.workerOptions?.workerData || {}
      }
    });
    void this.runWorker(worker);

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
