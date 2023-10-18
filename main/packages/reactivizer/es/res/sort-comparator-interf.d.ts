import { RxController } from '../control';
import { ReactorComposite } from '../epic';
interface ForkSortComparatorInput {
    /** Tells whether current context is the main worker thread or a forked worker.
    * In case current thread is main, it's comparator's obligation to dispatch `setDataForWorkers` action
    * with proper shared data
    */
    setIsMain(yes: boolean): void;
    /** If current is in a forked worker, will recieve shared "workerData" */
    onWorkerData<T>(key: string, data: T): void;
}
interface ForkSortComparatorOutput {
    setDataForWorkers(key: string, data: SharedArrayBuffer): void;
}
export type WritableArray = {
    [index: number]: number;
    length: number;
    sort(cmpFn?: (a: number, b: number) => number): WritableArray;
} & Iterable<number>;
export interface ForkSortComparator<D extends WritableArray> {
    compare(a: D[number], b: D[number]): number;
    createTypedArray(buf: SharedArrayBuffer | ArrayBuffer, offset?: number, len?: number): D;
    createArrayBufferOfSize(numOfElement: number): ArrayBuffer;
    input: RxController<ForkSortComparatorInput>;
    output: RxController<ForkSortComparatorOutput>;
}
export declare class DefaultComparator implements ForkSortComparator<Uint32Array> {
    input: RxController<ForkSortComparatorInput>;
    output: RxController<ForkSortComparatorOutput>;
    protected compositeCtrl: ReactorComposite<ForkSortComparatorInput, ForkSortComparatorOutput, readonly [], readonly []>;
    constructor();
    compare(a: number, b: number): number;
    createTypedArray(buf: SharedArrayBuffer | ArrayBuffer, offset?: number, len?: number): Uint32Array;
    createArrayBufferOfSize(num: number): ArrayBuffer;
}
export {};
