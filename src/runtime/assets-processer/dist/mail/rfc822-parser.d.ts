/// <reference types="node" />
import { Readable } from 'stream';
export declare enum RCF822TokenType {
    CRLF = 0,
    ':' = 1,
    ';' = 2,
    quoteStr = 3,
    CONTENT = 4
}
export declare function parse(readable: Readable | Buffer): Promise<void>;
