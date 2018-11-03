"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable no-console
const base_LLn_parser_1 = require("dr-comp-package/wfh/dist/base-LLn-parser");
var TokenType;
(function (TokenType) {
    TokenType[TokenType["skip"] = 0] = "skip";
    TokenType[TokenType["id"] = 1] = "id";
    TokenType[TokenType["function"] = 2] = "function";
    TokenType[TokenType["stringLiteral"] = 3] = "stringLiteral";
    TokenType[TokenType["any"] = 4] = "any";
    TokenType[TokenType["space"] = 5] = "space";
    TokenType[TokenType["("] = 6] = "(";
    TokenType[TokenType[")"] = 7] = ")";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
class ScssLexer extends base_LLn_parser_1.BaseLexer {
    *[Symbol.iterator]() {
        while (true) {
            const char = this.la();
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
                case '(':
                case ')':
                    this.advance();
                    yield new base_LLn_parser_1.Token(TokenType[char], this, start);
                    break;
                default:
                    if (/[a-zA-Z0-9_-]/.test(char)) {
                        yield this.identity(TokenType.id);
                        break;
                    }
                    this.advance();
                    yield new base_LLn_parser_1.Token(TokenType.any, this, start);
                    break;
            }
        }
    }
    identity(type = TokenType.function) {
        const start = this.position;
        this.advance();
        while (/[a-zA-Z0-9_-]/.test(this.la())) {
            this.advance();
        }
        return new base_LLn_parser_1.Token(type, this, start);
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
    getResUrl(text) {
        const res = [];
        while (this.la() != null) {
            if (this.isNextTypes(TokenType.id, TokenType['(']) &&
                this.la().text === 'url' && this.lb().text !== '@import') {
                const start = this.la(2).end;
                this.advance(2);
                while (this.la() != null && this.la().type !== TokenType[')']) {
                    this.advance();
                }
                if (this.la() == null)
                    throw new Error('Unexpect end of file');
                const end = this.la().start;
                res.push({ start, end, text: text.slice(start, end) });
            }
            else {
                this.advance();
            }
        }
        return res;
    }
    getAllImport(text) {
        const res = [];
        while (this.la() != null) {
            if (this.isNextTypes(TokenType.function, TokenType.stringLiteral) && this.la().text === '@import') {
                res.push(this.la(2));
                this.advance(2);
            }
            else if (this.isNextTypes(TokenType.function, TokenType.id, TokenType['(']) &&
                this.la().text === '@import' && this.la(2).text === 'url') {
                const start = this.la(3).end;
                this.advance(3);
                while (this.la() != null && this.la().type !== TokenType[')']) {
                    this.advance();
                }
                if (this.la() == null)
                    throw new Error('Unexpect end of file');
                const end = this.la().start;
                this.advance();
                res.push({ start, end, text: text.slice(start, end) });
            }
            else
                this.advance();
        }
        return res;
    }
}
exports.ScssParser = ScssParser;

//# sourceMappingURL=simple-scss-parser.js.map
