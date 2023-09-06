import { ForkTransferablePayload } from '../forkJoin-node-worker';
import { CoreOptions } from '../control';
import { ForkWorkerInput, ForkWorkerOutput } from '../types';
export declare function createSorter(opts?: CoreOptions<ForkWorkerInput & ForkWorkerOutput>): import("..").ReactorComposite<{
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & import("../control").ActionFunctions & ForkWorkerInput & {
    /**
     * @param noForkThreshold if `len` is larger than this number, `sort` function should fork half of array to recursive call, otherwise it just go with Array.sort() directly in current worker/thread
     */
    sort(buf: SharedArrayBuffer, offset: number | undefined, len: number, noForkThreshold?: number): Promise<[number, number]>;
    merge(buf: SharedArrayBuffer, offset1: number | undefined, len1: number, offset2: number | undefined, len2: number, noForkThreshold?: number): Promise<null | ForkTransferablePayload<ArrayBuffer | null>>;
}, {
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & ForkWorkerOutput<import("../control").ActionFunctions>>;
