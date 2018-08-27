export declare class Token<T> {
    type: T;
    start: number;
    text: string;
    end: number;
    constructor(type: T, lexer: BaseLexer<T>, start: number);
}
export declare enum Channel {
    normal = 0,
    skip = 1
}
export declare abstract class LookAhead<T, S extends Iterable<T>> {
    cached: T[];
    sourceIterator: Iterator<T>;
    isString: boolean;
    channel: Channel;
    protected currPos: number;
    constructor(source: S);
    readonly position: number;
    la(num?: number): T;
    lb(num?: number): T;
    advance(count?: number): T;
    isNext(...values: T[]): boolean;
    throwError(unexpected?: string): void;
    abstract getCurrentPosInfo(): string;
    abstract skip(): void;
    /**
     * Do not read postion less than 0
     * @param pos
     */
    protected read(pos: number): T;
}
export declare abstract class BaseLexer<Type> extends LookAhead<string, string> implements Iterable<Token<Type>> {
    protected source: string;
    lineBeginPositions: number[];
    constructor(source: string);
    abstract [Symbol.iterator](): Iterator<Token<Type>>;
    getText(startPos: number): string;
    getCurrentPosInfo(): string;
    /**
     * @return zero-based [line, column] value
     * */
    getLineColumn(pos: number): [number, number];
}
export declare abstract class BaseParser<T, S extends BaseLexer<T>> extends LookAhead<Token<T>, S> {
    protected lexer: S;
    constructor(lexer: S);
    getCurrentPosInfo(): string;
}
