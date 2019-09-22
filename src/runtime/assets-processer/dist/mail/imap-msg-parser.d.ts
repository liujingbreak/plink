import { ParseLex } from 'dr-comp-package/wfh/dist/async-LLn-parser';
export declare enum ImapTokenType {
    number = 1,
    stringLit = 2,
    stringQuote = 3,
    binString = 4,
    '(' = 5,
    ')' = 6,
    space = 7,
    atom = 8,
    CRLF = 9,
    nil = 10
}
export declare const parseLex: ParseLex<string>;
