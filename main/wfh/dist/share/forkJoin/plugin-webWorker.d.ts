import { createActionStreamByType } from '@wfh/redux-toolkit-observable/es/rx-utils';
import { ForkWorkerActions } from './forkJoin-pool';
import { PluginActions } from './forkJoin-baseWorker';
export declare function createWebWorkerPlugin(): readonly [import("@wfh/redux-toolkit-observable/es/rx-utils").ActionStreamControl<PluginActions & ForkWorkerActions>, typeof createActionStreamByType];
