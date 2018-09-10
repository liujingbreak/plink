import { Token, BaseParser, BaseLexer } from 'dr-comp-package/wfh/dist/base-LLn-parser';
export declare enum TokenType {
    skip = 0,
    function = 1,
    stringLiteral = 2,
    any = 3,
    space = 4
}
export declare class ScssLexer extends BaseLexer<TokenType> {
    [Symbol.iterator](): Iterator<Token<TokenType>>;
    identity(): Token<TokenType>;
    stringLit(quote: string): Token<TokenType>;
    spaces(): Token<TokenType>;
    comments(): Token<TokenType>;
}
export declare class ScssParser extends BaseParser<TokenType> {
    getAllImport(): Array<Token<TokenType>>;
}
