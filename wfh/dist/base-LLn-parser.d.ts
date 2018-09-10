export declare class Token<T> {
    type: T;
    start: number;
    text: string;
    end: number;
    lineColumn: [number, number];
    constructor(type: T, lexer: BaseLexer<T>, start: number);
}
export declare enum Channel {
    normal = 0,
    full = 1
}
export declare abstract class LookAhead<T> {
    cached: T[];
    sourceIterator: Iterator<T>;
    isString: boolean;
    channel: Channel;
    protected currPos: number;
    constructor(source: Iterable<T>);
    readonly position: number;
    /**
     * look ahead for 1 character
     * @param num default is 1
     */
    la(num?: number): T;
    lb(num?: number): T;
    advance(count?: number): T;
    /**
     * Same as `return la(1) === values[0] && la(2) === values[1]...`
     * @param values lookahead string or tokens
     */
    isNext(...values: T[]): boolean;
    _isNext<NEXT, C>(values: C[], isEqual?: (a: NEXT, b: C) => boolean): boolean;
    throwError(unexpected?: string): void;
    abstract getCurrentPosInfo(): string;
    /**
     * Do not read postion less than 0
     * @param pos
     */
    protected read(pos: number): T;
}
export declare abstract class BaseLexer<T> extends LookAhead<string> implements Iterable<Token<T>> {
    protected source: string;
    lineBeginPositions: number[];
    constructor(source: string);
    abstract [Symbol.iterator](): Iterator<Token<T>>;
    getText(startPos: number): string;
    getCurrentPosInfo(): string;
    /**
     * @return zero-based [line, column] value
     * */
    getLineColumn(pos: number): [number, number];
}
export declare class TokenFilter<T> extends LookAhead<Token<T>> implements Iterable<Token<T>> {
    skipType: T;
    constructor(lexer: Iterable<Token<T>>, skipType: T);
    [Symbol.iterator](): Iterator<Token<T>>;
    getCurrentPosInfo(): string;
}
/**
 * TT - token type
 */
export declare abstract class BaseParser<T> extends LookAhead<Token<T>> {
    protected lexer: Iterable<Token<T>>;
    constructor(lexer: Iterable<Token<T>>);
    getCurrentPosInfo(): string;
    isNextTypes(...types: T[]): boolean;
}
