import {RxController} from '../control';
import {ReactorComposite} from '../epic';

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

export class DefaultComparator implements ForkSortComparator<Uint32Array> {
  input: RxController<ForkSortComparatorInput>;
  output: RxController<ForkSortComparatorOutput>;
  protected compositeCtrl = new ReactorComposite<ForkSortComparatorInput, ForkSortComparatorOutput>();

  constructor() {
    this.input = this.compositeCtrl.i;
    this.output = this.compositeCtrl.o;
    // this.compositeCtrl.startAll();
  }

  compare(a: number, b: number): number {
    return a - b;
  }

  createTypedArray(buf: SharedArrayBuffer | ArrayBuffer, offset?: number, len?: number): Uint32Array {
    return offset != null && len != null ?
      new Uint32Array(buf, offset * Uint32Array.BYTES_PER_ELEMENT, len) :
      new Uint32Array(buf);
  }

  createArrayBufferOfSize(num: number) {
    return new ArrayBuffer(num * Uint32Array.BYTES_PER_ELEMENT);
  }
}

// export const defaultComparator = new DefaultComparator();
