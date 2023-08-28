export declare const sortActions: {
    sort(buf: SharedArrayBuffer, offset: number | undefined, len: number): Promise<void>;
    merge(_buf: SharedArrayBuffer, offset1: number | undefined, len1: number, _arr2: SharedArrayBuffer, offset2: number | undefined, len2: number): void;
};
export declare const sorter: import("..").ReactorComposite<{
    sortResolved: (p: void, callerActionId: number) => void;
    mergeResolved: (p: void, callerActionId: number) => void;
} & {
    sortCompleted: (callerActionId: number) => void;
    mergeCompleted: (callerActionId: number) => void;
} & Record<string, never> & import("../types").ForkWorkerInput & {
    sort(buf: SharedArrayBuffer, offset: number | undefined, len: number): Promise<void>;
    merge(_buf: SharedArrayBuffer, offset1: number | undefined, len1: number, _arr2: SharedArrayBuffer, offset2: number | undefined, len2: number): void;
}, {
    sortResolved: (p: void, callerActionId: number) => void;
    mergeResolved: (p: void, callerActionId: number) => void;
} & {
    sortCompleted: (callerActionId: number) => void;
    mergeCompleted: (callerActionId: number) => void;
} & import("../types").ForkWorkerOutput<Record<string, never>>>;
