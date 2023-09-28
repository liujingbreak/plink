export declare const sorter: import("..").ReactorComposite<{
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: import("../forkJoin-node-worker").ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & import("../types").ForkWorkerInput & {
    sortInWorker(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold: number): void;
} & {
    sort(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold?: number): Promise<[number, number]>;
    merge(buf: SharedArrayBuffer, offset1: number, len1: number, offset2: number, len2: number, noForkThreshold?: number, targetBuffer?: SharedArrayBuffer | undefined, targetOffset?: number | undefined): Promise<import("../forkJoin-node-worker").ForkTransferablePayload<ArrayBuffer | null> | null>;
}, {
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: import("../forkJoin-node-worker").ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & import("../types").ForkWorkerOutput>;
