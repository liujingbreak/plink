import { Token, BaseLexer, BaseParser } from './base-LLn-parser';
export declare enum JsonTokenType {
    primitive = 0,
    stringLit = 1,
    [','] = 2,
    ['['] = 3,
    [']'] = 4,
    ['{'] = 5,
    ['}'] = 6,
    [':'] = 7,
    any = 8,
}
export declare class JsonLexer extends BaseLexer<JsonTokenType> {
    constructor(source: string);
    [Symbol.iterator](): Iterator<Token<JsonTokenType>>;
    stringLit(quote: string): Token<JsonTokenType>;
    skip(): void;
}
export declare class JsonParser extends BaseParser<JsonTokenType, JsonLexer> {
    skip(): void;
}
