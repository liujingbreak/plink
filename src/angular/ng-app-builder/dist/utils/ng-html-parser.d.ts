export declare class Token {
    type: TokenType;
    start: number;
    text: string;
    end: number;
    constructor(type: TokenType, lexer: LookAheadString, start: number);
}
export declare enum Channel {
    normal = 0,
    skip = 1,
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
export declare abstract class LookAheadString extends LookAhead<string, string> {
    protected source: string;
    lineBeginPositions: number[];
    constructor(source: string);
    getText(startPos: number): string;
    getCurrentPosInfo(): string;
    /**
     * @return zero-based [line, column] value
     * */
    getLineColumn(pos: number): [number, number];
}
export declare class BaseLexer extends LookAheadString implements Iterable<Token> {
    constructor(source: string);
    [Symbol.iterator](): Iterator<Token>;
    skip(): void;
    isComment(): boolean;
    comment(): boolean;
    isSwigComment(): boolean;
    swigComment(): void;
}
export declare enum TokenType {
    comments = 0,
    ['<'] = 1,
    ['>'] = 2,
    ['('] = 3,
    [')'] = 4,
    ['['] = 5,
    [']'] = 6,
    ['</'] = 7,
    ['='] = 8,
    identity = 9,
    stringLiteral = 10,
    any = 11,
    space = 12,
}
export declare class TemplateLexer extends BaseLexer {
    [Symbol.iterator](): Iterator<Token>;
    openTagStart(): Token;
    closeTagStart(): Token;
    isIdStart(laIdx?: number): boolean;
    isWhitespace(): boolean;
    stringLit(quote: string): Token;
}
export interface TagAst {
    name?: string;
    attrs?: {
        [key: string]: AttributeValueAst;
    };
}
export interface AttributeValueAst {
    text: string;
    start: number;
    end: number;
}
export declare class TemplateParser extends LookAhead<Token, TemplateLexer> {
    lexer: TemplateLexer;
    constructor(input: string);
    getCurrentPosInfo(): string;
    skip(): void;
    parse(): TagAst[];
    tag(): TagAst;
    attributes(): {
        [key: string]: AttributeValueAst;
    };
    isNgAttrName(): boolean;
    ngAttrName(): string;
    attrName(): string;
    attrValue(): AttributeValueAst;
}
