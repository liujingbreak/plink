export declare function queueUp<T>(parallel: number, actions: Array<() => Promise<T>>): Promise<T[]>;
export declare function queue(maxParallel: number): {
    add<T>(action: () => Promise<T>): Promise<T>;
};
