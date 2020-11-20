export default function newThreadPool(maxParalle: number, idleTimeMs: number): void;
export declare class Pool {
    private promiseQ;
    private workers;
    constructor(maxParalle: number, idleTimeMs: number);
    submit<T>(task: () => Promise<T>): Promise<T>;
    protected createWorker(): void;
}
