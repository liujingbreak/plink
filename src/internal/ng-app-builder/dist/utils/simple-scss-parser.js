"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const base_LLn_parser_1 = require("dr-comp-package/wfh/dist/base-LLn-parser");
var TokenType;
(function (TokenType) {
    TokenType[TokenType["skip"] = 0] = "skip";
    TokenType[TokenType["function"] = 1] = "function";
    TokenType[TokenType["stringLiteral"] = 2] = "stringLiteral";
    TokenType[TokenType["any"] = 3] = "any";
    TokenType[TokenType["space"] = 4] = "space";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
class ScssLexer extends base_LLn_parser_1.BaseLexer {
    *[Symbol.iterator]() {
        while (true) {
            let char = this.la();
            const start = this.position;
            if (char == null) {
                return;
            }
            if (this.la() === '/' && (this.la(2) === '/' || this.la(2) === '*')) {
                this.comments();
                continue;
            }
            if (/\s/.test(this.la())) {
                this.spaces();
                continue;
            }
            switch (char) {
                case '"':
                    yield this.stringLit('"');
                    break;
                case '\'':
                    yield this.stringLit('\'');
                    break;
                case '@':
                    yield this.identity();
                    break;
                default:
                    this.advance();
                    yield new base_LLn_parser_1.Token(TokenType.any, this, start);
                    break;
            }
        }
    }
    identity() {
        const start = this.position;
        this.advance();
        while (/[a-zA-Z0-9_-]/.test(this.la())) {
            this.advance();
        }
        return new base_LLn_parser_1.Token(TokenType.function, this, start);
    }
    stringLit(quote) {
        this.advance();
        const start = this.position;
        while (this.la() !== quote) {
            if (this.la() == null)
                this.throwError();
            // console.log(':', this.la());
            if (this.la() === '\\') {
                this.advance();
            }
            this.advance();
        }
        const tk = new base_LLn_parser_1.Token(TokenType.stringLiteral, this, start);
        this.advance();
        return tk;
    }
    spaces() {
        const start = this.position;
        while (this.la() != null && /\s/.test(this.la())) {
            this.advance();
        }
        return new base_LLn_parser_1.Token(TokenType.skip, this, start);
    }
    comments() {
        const start = this.position;
        this.advance();
        if (this.isNext('/')) {
            this.advance(2);
            while (this.la() !== '\n' && this.la() != null) {
                this.advance();
            }
            this.advance();
        }
        else if (this.isNext('*')) {
            this.advance(2);
            while (!this.isNext('*/') && this.la() != null) {
                this.advance();
            }
            this.advance(2);
        }
        return new base_LLn_parser_1.Token(TokenType.skip, this, start);
    }
}
exports.ScssLexer = ScssLexer;
class ScssParser extends base_LLn_parser_1.BaseParser {
    getAllImport() {
        const res = [];
        while (this.la() != null) {
            if (this.isNextTypes(TokenType.function, TokenType.stringLiteral) && this.la().text === '@import') {
                res.push(this.la(2));
                this.advance(2);
            }
            else if (this.la() != null)
                this.advance();
        }
        return res;
    }
}
exports.ScssParser = ScssParser;

//# sourceMappingURL=simple-scss-parser.js.map
