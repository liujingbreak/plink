export declare type IntervalKey = {
    low: number;
    high: number;
};
export declare class RangeSearcher<V extends IntervalKey> {
    #private;
    private constructor();
    addRange(value: V): void;
    removeRange(value: V): void;
}
