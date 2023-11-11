import { ForkTransferablePayload } from '../forkJoin-node-worker';
import { DuplexOptions } from '../duplex';
import { ForkWorkerInput, ForkWorkerOutput } from '../types';
import { ForkSortComparator, WritableArray } from './sort-comparator-interf';
type SorterInput = {
    sortInWorker(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold: number): void;
};
export declare function createSorter<D extends WritableArray>(comparator?: ForkSortComparator<D> | null, opts?: DuplexOptions<ForkWorkerInput & ForkWorkerOutput>): Promise<import("..").ReactorComposite<{
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & ForkWorkerInput & SorterInput & {
    /**
     * @param noForkThreshold if `len` is larger than this number, `sort` function should fork half of array to recursive call, otherwise it just go with Array.sort() directly in current worker/thread
     */
    sort(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold?: number): Promise<[
        number,
        number
    ]>;
    merge(buf: SharedArrayBuffer, offset1: number, len1: number, offset2: number, len2: number, noForkThreshold?: number, targetBuffer?: SharedArrayBuffer, targetOffset?: number): Promise<null | ForkTransferablePayload<ArrayBuffer | null>>;
}, {
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & ForkWorkerOutput, readonly [], readonly []>>;
export {};
