import { createActionStreamByType } from '../../../../packages/redux-toolkit-observable/dist/rx-utils';
import { PluginActions } from './forkJoin-baseWorker';
export declare function createNodeThreadPlugin(): readonly [import("../../../../packages/redux-toolkit-observable/dist/rx-utils").ActionStreamControl<PluginActions>, typeof createActionStreamByType];
