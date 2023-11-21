declare const sorter: import("..").ReactorComposite<{
    sortAllInWorkerResolved: (p: [p: [number, number]]) => void;
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: import("../fork-join/node-worker").ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortAllInWorkerCompleted: () => void;
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & import("../fork-join/types").ForkWorkerInput & Record<string, never> & {
    sortAllInWorker(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold: number): Promise<[p: [number, number]]>;
    sort(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold?: number): Promise<[number, number]>;
    merge(buf: SharedArrayBuffer, offset1: number, len1: number, offset2: number, len2: number, noForkThreshold?: number, targetBuffer?: SharedArrayBuffer | undefined, targetOffset?: number | undefined): Promise<import("../fork-join/node-worker").ForkTransferablePayload<ArrayBuffer | null> | null>;
}, {
    sortAllInWorkerResolved: (p: [p: [number, number]]) => void;
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: import("../fork-join/node-worker").ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortAllInWorkerCompleted: () => void;
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & import("../fork-join/types").ForkWorkerOutput & Record<string, never>, readonly ("setLiftUpActions" | "exit")[], readonly ("workerInited" | "log" | "warn")[]>;
export { sorter };
