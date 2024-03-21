import { SingleActionFactory } from '../../../packages/reactivizer';
import { PropertyMeta } from './config.types';
export interface WorkerInput {
    parseDts(dtsFileBase: string, typeExport: string): SingleActionFactory;
    parseDtsInWorker(dtsFileBase: string, typeExport: string): SingleActionFactory;
    parseDtsDone: WorkerOutput['parseDtsDone'];
}
export interface WorkerOutput {
    parseDtsDone(metas: PropertyMeta[], dfsFile: string): SingleActionFactory;
}
export declare function createService(debug?: boolean): import("../../../packages/reactivizer/dist/fork-join/types").WorkerControl<WorkerInput, WorkerOutput, readonly [], readonly []>;
