/// <reference types="node" />
import { Worker as NodeWorker } from 'node:worker_threads';
import type { createActionStreamByType, ActionStreamControl } from '@wfh/redux-toolkit-observable/es/rx-utils';
import { ForkWorkerPoolActions, PluginActions } from './forkJoin-baseWorker';
export type ForkWorkerActions = {
    createWorker(workNo: number): void;
    workerCrearted(workerNo: number, worker: Worker | NodeWorker): void;
    onWorkerError(worker: number, msg: any): void;
    workerLoadChange(worker: number, incrementOrDecline: boolean): void;
};
type StreamControlOptions = NonNullable<Parameters<typeof createActionStreamByType>[0]>;
/**
 * Fork worker pool is different from original worker poll about below features
 * - Pool can create and assign tasks to worker without waiting for worker finishing previous task
 * - Worker can itself fork new task to pool
 *   - Another or same worker can send response of task finishing message back to specific worker through pool
 * - TODO: try minimize duplicate transferred message data
 */
export declare function createForkWorkerPool(factory: () => Worker | NodeWorker, plugin: ActionStreamControl<PluginActions>, casbt: typeof createActionStreamByType, opts: {
    concurrent: number;
} & StreamControlOptions): ActionStreamControl<ForkWorkerPoolActions>;
export {};
