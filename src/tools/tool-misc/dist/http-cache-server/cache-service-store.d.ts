export declare function startStore(opts?: {
    reconnInterval?: number;
}): {
    shutdown(): void;
    started: Promise<{
        type: string;
        payload: unknown;
    }>;
};
