/// <reference types="node" />
import { Token, LookAhead } from 'dr-comp-package/wfh/dist/async-LLn-parser';
import { Observable } from 'rxjs';
export declare enum ImapTokenType {
    number = 1,
    stringLit = 2,
    stringQuote = 3,
    '(' = 4,
    ')' = 5,
    atom = 6,
    CRLF = 7
}
export interface StringLit {
    data: Buffer;
}
export declare function createServerDataHandler(): {
    input: (buf: Buffer | null) => void;
    output: Observable<Token<ImapTokenType>[]>;
};
/**
 *
 * @param lines createServerDataHandler().output
 * @param parseLine return null/undefined to continue to wait for next line, or it will stop waiting for next line.
 */
export declare function parseLinesOfTokens(lines: Observable<Token<ImapTokenType>[]>, parseLine: (la: LookAhead<Token<ImapTokenType>>) => Promise<any | null | void>): Promise<any>;
export declare function connectImap(address: string): Promise<void>;
