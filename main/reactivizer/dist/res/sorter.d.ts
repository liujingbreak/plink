import { ForkTransferablePayload } from '../fork-join/node-worker';
import type { SimplexReactorOptions } from '../index';
import { ForkWorkerInput, ForkWorkerOutput } from '../fork-join/types';
import { ForkSortComparator, WritableArray } from './sort-comparator-interf';
export declare function createSorter<D extends WritableArray>(comparator?: ForkSortComparator<D> | null, opts?: SimplexReactorOptions<ForkWorkerInput & ForkWorkerOutput>): import("../fork-join/types").WorkerControl<{
    sortAllInWorkerResolved: (p: [number, number]) => import("../action-factory").SingleActionFactory;
    sortResolved: (p: [offset: number, len: number]) => import("../action-factory").SingleActionFactory;
    mergeResolved: (p: ForkTransferablePayload<ArrayBuffer | null> | null) => import("../action-factory").SingleActionFactory;
} & {
    sortAllInWorkerCompleted: () => import("../action-factory").SingleActionFactory;
    sortCompleted: () => import("../action-factory").SingleActionFactory;
    mergeCompleted: () => import("../action-factory").SingleActionFactory;
} & import("../inferred-types").ActionFactoryOfPlainType<{
    sortAllInWorker(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold: number): Promise<[number, number]>;
    /**
     * @param noForkThreshold if `len` is larger than this number, `sort` function should fork half of array to recursive call, otherwise it just go with Array.sort() directly in current worker/thread
     */
    sort(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold?: number): Promise<[offset: number, len: number]>;
    merge(buf: SharedArrayBuffer, offset1: number, len1: number, offset2: number, len2: number, noForkThreshold?: number, targetBuffer?: SharedArrayBuffer, targetOffset?: number): Promise<null | ForkTransferablePayload<ArrayBuffer | null>>;
}>>;
