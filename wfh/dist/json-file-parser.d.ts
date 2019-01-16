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
    skip = 8,
    any = 9
}
export declare class JsonLexer extends BaseLexer<JsonTokenType> {
    [Symbol.iterator](): Iterator<Token<JsonTokenType>>;
    stringLit(quote: string): Token<JsonTokenType>;
    skip(): Token<JsonTokenType>;
}
export declare class JsonParser extends BaseParser<JsonTokenType> {
    skip(): void;
}
//# sourceMappingURL=json-file-parser.d.ts.map