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
    constructor() {
        super(...arguments);
        this.inParentheses = false;
    }
    *[Symbol.iterator]() {
        while (true) {
            const char = this.la();
            const start = this.position;
            if (char == null) {
                return;
            }
            if (this.la() === '/' && (this.la(2) === '/' || this.la(2) === '*')) {
                if (this.comments())
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
                    this.inParentheses = true;
                case ')':
                    this.advance();
                    yield new base_LLn_parser_1.Token(TokenType[char], this, start);
                    break;
                default:
                    if (/[a-zA-Z0-9_\-:\$]/.test(char)) {
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
                    this.advance();
                    res.push(stringLit);
                }
                else {
                    while (this.la() != null && this.la().type !== TokenType[')']) {
                        this.advance();
                    }
                    if (this.la() == null)
                        throw new Error('Unexpect end of file');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsOEVBQXNGO0FBRXRGLElBQVksU0FTWDtBQVRELFdBQVksU0FBUztJQUNuQix5Q0FBSSxDQUFBO0lBQ0oscUNBQUUsQ0FBQTtJQUNGLGlEQUFRLENBQUE7SUFDUiwyREFBYSxDQUFBO0lBQ2IsdUNBQUcsQ0FBQTtJQUNILDJDQUFLLENBQUE7SUFDTCxtQ0FBRyxDQUFBO0lBQ0gsbUNBQUcsQ0FBQTtBQUNMLENBQUMsRUFUVyxTQUFTLEdBQVQsaUJBQVMsS0FBVCxpQkFBUyxRQVNwQjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUFvQjtJQUFuRDs7UUFDRSxrQkFBYSxHQUFHLEtBQUssQ0FBQztJQWlHeEIsQ0FBQztJQWhHQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNoQixPQUFPLElBQUksRUFBRTtZQUNYLE1BQU0sSUFBSSxHQUFXLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsT0FBTzthQUNSO1lBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtnQkFDbkUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO29CQUNqQixTQUFTO2FBQ1o7WUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FB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QzFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUMsQ0FBQyxDQUFDO2FBQ3hEOztnQkFDQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDbEI7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRjtBQW5ERCxnQ0FtREMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvc2ltcGxlLXNjc3MtcGFyc2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IHtUb2tlbiwgQmFzZVBhcnNlciwgQmFzZUxleGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYmFzZS1MTG4tcGFyc2VyJztcblxuZXhwb3J0IGVudW0gVG9rZW5UeXBlIHtcbiAgc2tpcCxcbiAgaWQsXG4gIGZ1bmN0aW9uLFxuICBzdHJpbmdMaXRlcmFsLFxuICBhbnksXG4gIHNwYWNlLFxuICAnKCcsXG4gICcpJ1xufVxuXG5leHBvcnQgY2xhc3MgU2Nzc0xleGVyIGV4dGVuZHMgQmFzZUxleGVyPFRva2VuVHlwZT4ge1xuICBpblBhcmVudGhlc2VzID0gZmFsc2U7XG4gICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxUb2tlblR5cGU+PiB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IGNoYXI6IHN0cmluZyA9IHRoaXMubGEoKTtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcbiAgICAgIGlmIChjaGFyID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubGEoKSA9PT0gJy8nICYmICh0aGlzLmxhKDIpID09PSAnLycgfHwgdGhpcy5sYSgyKSA9PT0gJyonKSkge1xuICAgICAgICBpZiAodGhpcy5jb21tZW50cygpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKC9cXHMvLnRlc3QodGhpcy5sYSgpKSkge1xuICAgICAgICB0aGlzLnNwYWNlcygpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHN3aXRjaCAoY2hhcikge1xuICAgICAgICBjYXNlICdcIic6XG4gICAgICAgICAgeWllbGQgdGhpcy5zdHJpbmdMaXQoJ1wiJyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1xcJyc6XG4gICAgICAgICAgeWllbGQgdGhpcy5zdHJpbmdMaXQoJ1xcJycpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdAJzpcbiAgICAgICAgICB5aWVsZCB0aGlzLmlkZW50aXR5KCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJygnOlxuICAgICAgICAgIHRoaXMuaW5QYXJlbnRoZXNlcyA9IHRydWU7XG4gICAgICAgIGNhc2UgJyknOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihUb2tlblR5cGVbY2hhcl0sIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAoL1thLXpBLVowLTlfXFwtOlxcJF0vLnRlc3QoY2hhcikpIHtcbiAgICAgICAgICAgIHlpZWxkIHRoaXMuaWRlbnRpdHkoVG9rZW5UeXBlLmlkKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB5aWVsZCBuZXcgVG9rZW4oVG9rZW5UeXBlLmFueSwgdGhpcywgc3RhcnQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlkZW50aXR5KHR5cGUgPSBUb2tlblR5cGUuZnVuY3Rpb24pIHtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgd2hpbGUgKC9bYS16QS1aMC05Xy1dLy50ZXN0KHRoaXMubGEoKSkpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFRva2VuKHR5cGUsIHRoaXMsIHN0YXJ0KTtcbiAgfVxuXG4gIHN0cmluZ0xpdChxdW90ZTogc3RyaW5nKSB7XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT09IHF1b3RlKSB7XG4gICAgICBpZiAodGhpcy5sYSgpID09IG51bGwpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcigpO1xuICAgICAgLy8gY29uc29sZS5sb2coJzonLCB0aGlzLmxhKCkpO1xuICAgICAgaWYgKHRoaXMubGEoKSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIGNvbnN0IHRrID0gbmV3IFRva2VuKFRva2VuVHlwZS5zdHJpbmdMaXRlcmFsLCB0aGlzLCBzdGFydCk7XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIHRrO1xuICB9XG5cbiAgc3BhY2VzKCkge1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcbiAgICB3aGlsZSAodGhpcy5sYSgpICE9IG51bGwgJiYgL1xccy8udGVzdCh0aGlzLmxhKCkpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBUb2tlbihUb2tlblR5cGUuc2tpcCwgdGhpcywgc3RhcnQpO1xuICB9XG4gIGNvbW1lbnRzKCkge1xuICAgIGlmICh0aGlzLmluUGFyZW50aGVzZXMgJiYgdGhpcy5pc05leHQoJy8nLCAnLycpKVxuICAgICAgcmV0dXJuIG51bGw7IC8vIERvIG5vdCBjb25zaWRlciAnLy8nIGFzIGNvbW1lbnQgaW4gYSBwYXJlbnRoZXNlcyBsaWtlIHVscihodHRwOi8vLi4uKVxuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICBpZiAodGhpcy5pc05leHQoJy8nKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKDIpO1xuICAgICAgd2hpbGUgKHRoaXMubGEoKSAhPT0gJ1xcbicgJiYgdGhpcy5sYSgpICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc05leHQoJyonKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKDIpO1xuICAgICAgd2hpbGUgKCF0aGlzLmlzTmV4dCgnKi8nKSAmJiB0aGlzLmxhKCkgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYWR2YW5jZSgyKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBUb2tlbihUb2tlblR5cGUuc2tpcCwgdGhpcywgc3RhcnQpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTY3NzUGFyc2VyIGV4dGVuZHMgQmFzZVBhcnNlcjxUb2tlblR5cGU+IHtcbiAgZ2V0UmVzVXJsKHRleHQ6IHN0cmluZyk6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgdGV4dDogc3RyaW5nfT4ge1xuICAgIGNvbnN0IHJlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCB0ZXh0OiBzdHJpbmd9PiA9IFtdO1xuICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsKSB7XG4gICAgICBpZiAodGhpcy5pc05leHRUeXBlcyhUb2tlblR5cGUuaWQsIFRva2VuVHlwZVsnKCddKSAmJlxuICAgICAgICB0aGlzLmxhKCkudGV4dCA9PT0gJ3VybCcgJiYgdGhpcy5sYigpLnRleHQgIT09ICdAaW1wb3J0Jykge1xuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgyKS5lbmQ7XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKDIpOyAvLyBqdW1wIG92ZXIgJygnXG4gICAgICAgICAgaWYgKHRoaXMuaXNOZXh0VHlwZXMoVG9rZW5UeXBlLnN0cmluZ0xpdGVyYWwpKSB7XG4gICAgICAgICAgICBjb25zdCBzdHJpbmdMaXQgPSB0aGlzLmxhKCk7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIHJlcy5wdXNoKHN0cmluZ0xpdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIHRoaXMubGEoKS50eXBlICE9PSBUb2tlblR5cGVbJyknXSkge1xuICAgICAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmxhKCkgPT0gbnVsbClcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgY29uc3QgZW5kID0gdGhpcy5sYSgpLnN0YXJ0O1xuICAgICAgICAgICAgcmVzLnB1c2goe3N0YXJ0LCBlbmQsIHRleHQ6IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCl9KTtcbiAgICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGdldEFsbEltcG9ydCh0ZXh0OiBzdHJpbmcpOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHRleHQ6IHN0cmluZ30+IHtcbiAgICBjb25zdCByZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgdGV4dDogc3RyaW5nfT4gPSBbXTtcbiAgICB3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcbiAgICAgIGlmICh0aGlzLmlzTmV4dFR5cGVzKFRva2VuVHlwZS5mdW5jdGlvbiwgVG9rZW5UeXBlLnN0cmluZ0xpdGVyYWwpICYmIHRoaXMubGEoKS50ZXh0ID09PSAnQGltcG9ydCcpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5sYSgyKSk7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgyKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pc05leHRUeXBlcyhUb2tlblR5cGUuZnVuY3Rpb24sIFRva2VuVHlwZS5pZCwgVG9rZW5UeXBlWycoJ10pICYmXG4gICAgICAgIHRoaXMubGEoKS50ZXh0ID09PSAnQGltcG9ydCcgJiYgdGhpcy5sYSgyKS50ZXh0ID09PSAndXJsJykge1xuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgzKS5lbmQ7XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKDMpO1xuICAgICAgICAgIHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIHRoaXMubGEoKS50eXBlICE9PSBUb2tlblR5cGVbJyknXSkge1xuICAgICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzLmxhKCkgPT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3QgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICBjb25zdCBlbmQgPSB0aGlzLmxhKCkuc3RhcnQ7XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgcmVzLnB1c2goe3N0YXJ0LCBlbmQsIHRleHQ6IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCl9KTtcbiAgICAgIH0gZWxzZVxuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuIl19
