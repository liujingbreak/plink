export interface Input<T> {
    at(index: number): T;
}
export declare abstract class LookaheadQ<T> {
    inputPos: number;
    cached: T[];
    constructor();
    la(count: number): T;
    next(): T;
    isNext(...compare: T[]): boolean;
    abstract fetch(): T;
}
