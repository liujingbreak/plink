"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScssParser = exports.ScssLexer = exports.TokenType = void 0;
// tslint:disable no-console
const base_LLn_parser_1 = require("@wfh/plink/wfh/dist/base-LLn-parser");
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
    constructor() {
        super(...arguments);
        this.inParentheses = false;
    }
    *[Symbol.iterator]() {
        while (true) {
            let char = this.la();
            const start = this.position;
            if (char == null) {
                return;
            }
            if (this.la() === '/' && (this.la(2) === '/' || this.la(2) === '*')) {
                if (this.comments())
                    continue;
            }
            char = this.la();
            if (char && /\s/.test(char)) {
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
                    this.inParentheses = true;
                case ')':
                    this.advance();
                    yield new base_LLn_parser_1.Token(TokenType[char], this, start);
                    break;
                default:
                    if (char && /[a-zA-Z0-9_\-:\$]/.test(char)) {
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
        while (this.la() && /[a-zA-Z0-9_-]/.test(this.la())) {
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
        if (this.inParentheses && this.isNext('/', '/'))
            return null; // Do not consider '//' as comment in a parentheses like ulr(http://...)
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
                this.advance(2); // jump over '('
                if (this.isNextTypes(TokenType.stringLiteral)) {
                    const stringLit = this.la();
                    if (stringLit == null)
                        this.throwError('End of file');
                    this.advance();
                    res.push(stringLit);
                }
                else {
                    while (this.la() != null && this.la().type !== TokenType[')']) {
                        this.advance();
                    }
                    if (this.la() == null)
                        this.throwError('End of file');
                    const end = this.la().start;
                    res.push({ start, end, text: text.slice(start, end) });
                }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEJBQTRCO0FBQzVCLHlFQUFpRjtBQUVqRixJQUFZLFNBU1g7QUFURCxXQUFZLFNBQVM7SUFDbkIseUNBQUksQ0FBQTtJQUNKLHFDQUFFLENBQUE7SUFDRixpREFBUSxDQUFBO0lBQ1IsMkRBQWEsQ0FBQTtJQUNiLHVDQUFHLENBQUE7SUFDSCwyQ0FBSyxDQUFBO0lBQ0wsbUNBQUcsQ0FBQTtJQUNILG1DQUFHLENBQUE7QUFDTCxDQUFDLEVBVFcsU0FBUyxHQUFULGlCQUFTLEtBQVQsaUJBQVMsUUFTcEI7QUFFRCxNQUFhLFNBQVUsU0FBUSwyQkFBb0I7SUFBbkQ7O1FBQ0Usa0JBQWEsR0FBRyxLQUFLLENBQUM7SUFrR3hCLENBQUM7SUFqR0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDaEIsT0FBTyxJQUFJLEVBQUU7WUFDWCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM1QixJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLE9BQU87YUFDUjtZQUNELElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUU7Z0JBQ25FLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtvQkFDakIsU0FBUzthQUNaO1lBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQixJQUFJLElBQUksSUFBSSxJQUFJLENB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QUksS0FBSyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQzdELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDaEI7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSTtvQkFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFHLENBQUMsS0FBSyxDQUFDO2dCQUM3QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQzthQUN4RDs7Z0JBQ0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2xCO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0Y7QUFyREQsZ0NBcURDIiwiZmlsZSI6ImRpc3QvdXRpbHMvc2ltcGxlLXNjc3MtcGFyc2VyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
