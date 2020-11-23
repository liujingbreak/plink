import { Task } from './worker';
export { Task };
export declare class Pool {
    private maxParalle;
    private idleTimeMs;
    private workerInitTaskFactory?;
    private runningWorkers;
    /** Last in first run, always run the latest created worker, give chance for old ones to be removed after timeout */
    private idleWorkers;
    private idleTimers;
    private tasks;
    /**
     * @param maxParalle max number of paralle workers
     * @param idleTimeMs let worker exit to release memory, after a worker being idle for some time (in ms)
     * @param workerInitTaskFactory generate initial task for a newly created woker, like initialize some environment
     * stuff
     */
    constructor(maxParalle: number, idleTimeMs: number, workerInitTaskFactory?: (() => Task) | undefined);
    submit<T>(task: Task): Promise<T>;
    private runWorker;
    private createWorker;
}
