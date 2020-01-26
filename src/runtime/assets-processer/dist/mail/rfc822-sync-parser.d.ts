/// <reference types="node" />
export declare enum RCF822TokenType {
    CRLF = 0,
    ':' = 1,
    ';' = 2,
    quoteStr = 3,
    ATOM = 4,
    BOUNDARY = 5,
    PART_BODY = 6,
    DOUBLE_DASH = 7
}
export interface RCF822ParseResult {
    headers: RCF822HeaderType[];
    parts: {
        headers: RCF822HeaderType[];
        body?: Buffer;
        file?: string;
    }[];
}
export interface RCF822HeaderType {
    key: string;
    value: string[];
}
export declare function parse(readable: Buffer): RCF822ParseResult;
