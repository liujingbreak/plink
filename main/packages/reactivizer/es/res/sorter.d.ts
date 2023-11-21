import { ForkTransferablePayload } from '../fork-join/node-worker';
import type { ReactorCompositeOpt } from '../epic';
import { ForkWorkerInput, ForkWorkerOutput } from '../fork-join/types';
import { ForkSortComparator, WritableArray } from './sort-comparator-interf';
export declare function createSorter<D extends WritableArray>(comparator?: ForkSortComparator<D> | null, opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput>): import("../epic").ReactorComposite<{
    sortAllInWorkerResolved: (p: [p: [number, number]]) => void;
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortAllInWorkerCompleted: () => void;
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & ForkWorkerInput & Record<string, never> & {
    sortAllInWorker(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold: number): Promise<[p: [number, number]]>;
    /**
     * @param noForkThreshold if `len` is larger than this number, `sort` function should fork half of array to recursive call, otherwise it just go with Array.sort() directly in current worker/thread
     */
    sort(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold?: number): Promise<[
        number,
        number
    ]>;
    merge(buf: SharedArrayBuffer, offset1: number, len1: number, offset2: number, len2: number, noForkThreshold?: number, targetBuffer?: SharedArrayBuffer, targetOffset?: number): Promise<null | ForkTransferablePayload<ArrayBuffer | null>>;
}, {
    sortAllInWorkerResolved: (p: [p: [number, number]]) => void;
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortAllInWorkerCompleted: () => void;
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & ForkWorkerOutput & Record<string, never>, readonly ("exit" | "setLiftUpActions")[], readonly ("workerInited" | "log" | "warn")[]>;
