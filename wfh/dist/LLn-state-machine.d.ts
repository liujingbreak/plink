export interface StateHandler<V> {
    name?: string;
    handle(machine: LLStateMachine<V>, value: V): Promise<any> | any;
    [stateName: string]: any;
}
export declare class LLStateMachine<V> {
    debugOn: boolean;
    stack: StateHandler<V>[];
    cache: V[];
    currValue: V;
    position: number;
    line: number;
    column: number;
    private currChunk;
    private switchDone;
    private cacheReadIdx;
    constructor(firstHandler: StateHandler<V>);
    consume(): void;
    /**
     * Reset to the position after last consumed
     */
    reset(): void;
    push(handler: StateHandler<V>): void;
    /**
     * popup current machine from stack, next time it will go to last machine.
     */
    pop(): void;
    startChunk<T>(type: T): Chunk<V, T>;
    closeChunk(): Chunk<V, any>;
    onNext(values: V[]): void;
    done(): Promise<void>;
    private callHandler;
}
export declare class Chunk<V, T> {
    type: T;
    private machine;
    values: V[];
    start: Postion;
    end?: number;
    isClosed: boolean;
    constructor(type: T, machine: LLStateMachine<V>);
    open(): this;
    close(): this;
    toString(): string;
}
export interface Postion {
    pos: number;
    line: number;
    column: number;
}
