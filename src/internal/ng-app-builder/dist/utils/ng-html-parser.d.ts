import { Token, BaseParser, BaseLexer } from 'dr-comp-package/wfh/dist/base-LLn-parser';
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
    space = 13
}
export { HtmlTokenType as TokenType };
export declare class TemplateLexer extends BaseLexer<HtmlTokenType> {
    [Symbol.iterator](): Iterator<Token<HtmlTokenType>>;
    openTagStart(): Token<HtmlTokenType>;
    closeTagStart(): Token<HtmlTokenType>;
    isIdStart(laIdx?: number): boolean | undefined;
    isWhitespace(): boolean | "" | null;
    stringLit(quote: string): Token<HtmlTokenType>;
    skip(): string | null;
    isComment(): boolean;
    comment(): boolean;
    isSwigComment(): boolean;
    swigComment(): void;
}
export interface TagAst {
    name: string;
    attrs?: {
        [key: string]: {
            isNg: boolean;
            value?: AttributeValueAst;
        };
    };
    start: number;
    end: number;
    [key: string]: any;
}
export interface AttributeValueAst {
    text: string;
    start: number;
    end: number;
}
export declare class TemplateParser extends BaseParser<HtmlTokenType> {
    lexer: TemplateLexer;
    text: string;
    constructor(input: string);
    getCurrentPosInfo(): string;
    skip(): void;
    parse(): TagAst[];
    tag(): TagAst;
    attributes(): {
        [key: string]: {
            isNg: boolean;
            value: AttributeValueAst | undefined;
        };
    };
    isNgAttrName(): boolean;
    ngAttrName(): string;
    attrName(): string;
    attrValue(): AttributeValueAst | undefined;
}
