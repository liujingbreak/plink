export declare enum TokenType {
    comments = 0,
    openTag = 1,
    closeTag = 2,
    identity = 3,
    stringLiteral = 4,
}
export declare class LookAhead<T, S extends Iterable<T>> {
    currPos: number;
    cached: T[];
    sourceIterator: Iterator<T>;
    isString: boolean;
    constructor(source: S);
    la(num?: number): T;
    advance(count?: number): T;
    isNext(...values: T[]): boolean;
    private read(pos);
}
export declare class BaseLexer extends LookAhead<string, string> implements Iterable<TokenType> {
    current: TokenType;
    constructor(source: string);
    [Symbol.iterator](): Iterator<TokenType>;
    isComment(): boolean;
}
