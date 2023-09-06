export declare const sorter: import("..").ReactorComposite<{
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: import("..").ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & import("..").ActionFunctions & import("../types").ForkWorkerInput & {
    sort(buf: SharedArrayBuffer, offset: number | undefined, len: number, noForkThreshold?: number): Promise<[number, number]>;
    merge(buf: SharedArrayBuffer, offset1: number | undefined, len1: number, offset2: number | undefined, len2: number, noForkThreshold?: number): Promise<import("..").ForkTransferablePayload<ArrayBuffer | null> | null>;
}, {
    sortResolved: (p: [number, number]) => void;
    mergeResolved: (p: import("..").ForkTransferablePayload<ArrayBuffer | null> | null) => void;
} & {
    sortCompleted: () => void;
    mergeCompleted: () => void;
} & import("../types").ForkWorkerOutput<import("..").ActionFunctions>>;
