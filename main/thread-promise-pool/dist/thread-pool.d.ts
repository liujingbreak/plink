/// <reference types="node" />
import { WorkerOptions } from 'worker_threads';
import { Task, InitialOptions } from './worker';
import { Task as ProcessTask } from './worker-process';
export { Task };
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
    submit<T>(task: Task): Promise<T>;
    submitProcess<T>(task: ProcessTask): Promise<T>;
    private runWorker;
    private createChildProcess;
    private createWorker;
}
