/**
 * TODO: Support parsing file with <script></script> tag contains special JS character like "<" and ">"
 */
import { Lexer, Token } from '@wfh/plink/wfh/dist/LLn-parser';
export declare enum HtmlTokenType {
    '<' = 0,
    '>' = 1,
    '/>' = 2,
    '(' = 3,
    ')' = 4,
    '[' = 5,
    ']' = 6,
    '</' = 7,
    '=' = 8,
    qm = 9,
    identity = 10,
    stringLiteral = 11,
    any = 12,
    space = 13,
    comment = 14
}
export declare const lexer: Lexer<string, HtmlTokenType>;
export { HtmlTokenType as TokenType };
export interface ParseHtmlResult {
    /** Array only contains openning tags */
    tags: OpenTagAst[];
    allTags: BaseTagAst[];
    comments: Token<HtmlTokenType>[];
}
export declare enum TagKind {
    open = 0,
    close = 1
}
export interface BaseTagAst {
    kind: TagKind;
    name: string;
    start: number;
    end: number;
}
export interface OpenTagAst extends BaseTagAst {
    attrs?: {
        [key: string]: {
            isNg: boolean;
            value?: AttributeValueAst;
        };
    };
    selfClosed: boolean;
    [key: string]: any;
}
export interface AttributeValueAst {
    text: string;
    start: number;
    end: number;
}
export default function parseHtml(input: string): ParseHtmlResult;
