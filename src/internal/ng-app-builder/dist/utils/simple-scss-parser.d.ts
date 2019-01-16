import { Token, BaseParser, BaseLexer } from 'dr-comp-package/wfh/dist/base-LLn-parser';
export declare enum TokenType {
    skip = 0,
    id = 1,
    function = 2,
    stringLiteral = 3,
    any = 4,
    space = 5,
    '(' = 6,
    ')' = 7
}
export declare class ScssLexer extends BaseLexer<TokenType> {
    inParentheses: boolean;
    [Symbol.iterator](): Iterator<Token<TokenType>>;
    identity(type?: TokenType): Token<TokenType>;
    stringLit(quote: string): Token<TokenType>;
    spaces(): Token<TokenType>;
    comments(): Token<TokenType>;
}
export declare class ScssParser extends BaseParser<TokenType> {
    getResUrl(text: string): Array<{
        start: number;
        end: number;
        text: string;
    }>;
    getAllImport(text: string): Array<{
        start: number;
        end: number;
        text: string;
    }>;
}
//# sourceMappingURL=simple-scss-parser.d.ts.map