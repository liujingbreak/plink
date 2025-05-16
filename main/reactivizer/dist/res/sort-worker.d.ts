declare const sorter: import("../fork-join/types").WorkerControl<import("..").ActionFactoryOfPlainType<{
    sortAllInWorker(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold: number): Promise<[number, number]>;
    sort(buf: SharedArrayBuffer, offset: number, len: number, noForkThreshold?: number): Promise<[offset: number, len: number]>;
    merge(buf: SharedArrayBuffer, offset1: number, len1: number, offset2: number, len2: number, noForkThreshold?: number, targetBuffer?: SharedArrayBuffer, targetOffset?: number): Promise<null | import("../fork-join/node-worker").ForkTransferablePayload<ArrayBuffer | null>>;
}> & {
    sortAllInWorkerResolved: (p: [number, number]) => import("..").SingleActionFactory;
    sortResolved: (p: [offset: number, len: number]) => import("..").SingleActionFactory;
    mergeResolved: (p: import("../fork-join/node-worker").ForkTransferablePayload<ArrayBuffer | null> | null) => import("..").SingleActionFactory;
} & {
    sortAllInWorkerCompleted: () => import("..").SingleActionFactory;
    sortCompleted: () => import("..").SingleActionFactory;
    mergeCompleted: () => import("..").SingleActionFactory;
}>;
export { sorter };
