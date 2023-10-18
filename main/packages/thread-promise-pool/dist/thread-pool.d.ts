/// <reference types="node" />
import { Worker, WorkerOptions } from 'worker_threads';
import { Task, InitialOptions } from './worker';
import { Task as ProcessTask } from './worker-process';
export { Task };
declare class PromisedTask<T> {
    private task;
    thread: Worker | undefined;
    promise: Promise<T>;
    resolve: Parameters<ConstructorParameters<typeof Promise>[0]>[0] | undefined;
    reject: Parameters<ConstructorParameters<typeof Promise>[0]>[1] | undefined;
    constructor(task: Task, verbose?: boolean);
    runByWorker(worker: Worker): void;
}
export declare class Pool {
    private maxParalle;
    private idleTimeMs;
    workerOptions?: (WorkerOptions & InitialOptions) | undefined;
    private runningWorkers;
    /** Last in first run, always run the latest created worker, give chance for old ones to be removed after timeout */
    private idleWorkers;
    private idleTimers;
    private tasks;
    private totalCreatedWorkers;
    /**
     * @param maxParalle max number of paralle workers, default is `os.cpus().length - 1`
     * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
     * @param workerOptions thread worker options, e.g. initializing some environment
     * stuff
     */
    constructor(maxParalle?: number, idleTimeMs?: number, workerOptions?: (WorkerOptions & InitialOptions) | undefined);
    /**
     * The difference from `submit(task)` is that this function returns not only `promise` but also
     * `Task` which contains a property "thread" of type Worker
     */
    submitAndReturnTask<T>(task: Task): PromisedTask<T>;
    submit<T>(task: Task): Promise<T>;
    submitProcess<T>(task: ProcessTask): Promise<T>;
    private runWorker;
    private createChildProcess;
    private createWorker;
}
