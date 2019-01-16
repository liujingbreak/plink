import { Token, BaseParser, BaseLexer } from 'dr-comp-package/wfh/dist/base-LLn-parser';
export declare enum HtmlTokenType {
    ['<'] = 0,
    ['>'] = 1,
    ['('] = 2,
    [')'] = 3,
    ['['] = 4,
    [']'] = 5,
    ['</'] = 6,
    ['='] = 7,
    identity = 8,
    stringLiteral = 9,
    any = 10,
    space = 11
}
export { HtmlTokenType as TokenType };
export declare class TemplateLexer extends BaseLexer<HtmlTokenType> {
    [Symbol.iterator](): Iterator<Token<HtmlTokenType>>;
    openTagStart(): Token<HtmlTokenType>;
    closeTagStart(): Token<HtmlTokenType>;
    isIdStart(laIdx?: number): boolean;
    isWhitespace(): boolean;
    stringLit(quote: string): Token<HtmlTokenType>;
    skip(): string;
    isComment(): boolean;
    comment(): boolean;
    isSwigComment(): boolean;
    swigComment(): void;
}
export interface TagAst {
    name?: string;
    attrs?: {
        [key: string]: {
            isNg: boolean;
            value: AttributeValueAst;
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
    constructor(input: string);
    getCurrentPosInfo(): string;
    skip(): void;
    parse(): TagAst[];
    tag(): TagAst;
    attributes(): {
        [key: string]: {
            isNg: boolean;
            value: AttributeValueAst;
        };
    };
    isNgAttrName(): boolean;
    ngAttrName(): string;
    attrName(): string;
    attrValue(): AttributeValueAst;
}
//# sourceMappingURL=ng-html-parser.d.ts.map