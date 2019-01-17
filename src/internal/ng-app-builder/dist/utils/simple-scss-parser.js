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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsOEVBQXNGO0FBRXRGLElBQVksU0FTWDtBQVRELFdBQVksU0FBUztJQUNwQix5Q0FBSSxDQUFBO0lBQ0oscUNBQUUsQ0FBQTtJQUNGLGlEQUFRLENBQUE7SUFDUiwyREFBYSxDQUFBO0lBQ2IsdUNBQUcsQ0FBQTtJQUNILDJDQUFLLENBQUE7SUFDTCxtQ0FBRyxDQUFBO0lBQ0gsbUNBQUcsQ0FBQTtBQUNKLENBQUMsRUFUVyxTQUFTLEdBQVQsaUJBQVMsS0FBVCxpQkFBUyxRQVNwQjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUFvQjtJQUFuRDs7UUFDQyxrQkFBYSxHQUFHLEtBQUssQ0FBQztJQWlHdkIsQ0FBQztJQWhHQSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNqQixPQUFPLElBQUksRUFBRTtZQUNaLE1BQU0sSUFBSSxHQUFXLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDakIsT0FBTzthQUNQO1lBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtnQkFDcEUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO29CQUNsQixTQUFTO2FBQ1Y7WUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7Z0JBQ3pCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FB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R0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUMsQ0FBQyxDQUFDO2FBQ3REOztnQkFDQSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDaEI7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7Q0FDRDtBQW5ERCxnQ0FtREMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvc2ltcGxlLXNjc3MtcGFyc2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IHtUb2tlbiwgQmFzZVBhcnNlciwgQmFzZUxleGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYmFzZS1MTG4tcGFyc2VyJztcblxuZXhwb3J0IGVudW0gVG9rZW5UeXBlIHtcblx0c2tpcCxcblx0aWQsXG5cdGZ1bmN0aW9uLFxuXHRzdHJpbmdMaXRlcmFsLFxuXHRhbnksXG5cdHNwYWNlLFxuXHQnKCcsXG5cdCcpJ1xufVxuXG5leHBvcnQgY2xhc3MgU2Nzc0xleGVyIGV4dGVuZHMgQmFzZUxleGVyPFRva2VuVHlwZT4ge1xuXHRpblBhcmVudGhlc2VzID0gZmFsc2U7XG5cdCpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxUb2tlblR5cGU+PiB7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGNvbnN0IGNoYXI6IHN0cmluZyA9IHRoaXMubGEoKTtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdGlmIChjaGFyID09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMubGEoKSA9PT0gJy8nICYmICh0aGlzLmxhKDIpID09PSAnLycgfHwgdGhpcy5sYSgyKSA9PT0gJyonKSkge1xuXHRcdFx0XHRpZiAodGhpcy5jb21tZW50cygpKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKC9cXHMvLnRlc3QodGhpcy5sYSgpKSkge1xuXHRcdFx0XHR0aGlzLnNwYWNlcygpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdHN3aXRjaCAoY2hhcikge1xuXHRcdFx0XHRjYXNlICdcIic6XG5cdFx0XHRcdFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1wiJyk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ1xcJyc6XG5cdFx0XHRcdFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1xcJycpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdAJzpcblx0XHRcdFx0XHR5aWVsZCB0aGlzLmlkZW50aXR5KCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJygnOlxuXHRcdFx0XHRcdHRoaXMuaW5QYXJlbnRoZXNlcyA9IHRydWU7XG5cdFx0XHRcdGNhc2UgJyknOlxuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihUb2tlblR5cGVbY2hhcl0sIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRpZiAoL1thLXpBLVowLTlfXFwtOlxcJF0vLnRlc3QoY2hhcikpIHtcblx0XHRcdFx0XHRcdHlpZWxkIHRoaXMuaWRlbnRpdHkoVG9rZW5UeXBlLmlkKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oVG9rZW5UeXBlLmFueSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlkZW50aXR5KHR5cGUgPSBUb2tlblR5cGUuZnVuY3Rpb24pIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0d2hpbGUgKC9bYS16QS1aMC05Xy1dLy50ZXN0KHRoaXMubGEoKSkpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gbmV3IFRva2VuKHR5cGUsIHRoaXMsIHN0YXJ0KTtcblx0fVxuXG5cdHN0cmluZ0xpdChxdW90ZTogc3RyaW5nKSB7XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT09IHF1b3RlKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpID09IG51bGwpXG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcigpO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJzonLCB0aGlzLmxhKCkpO1xuXHRcdFx0aWYgKHRoaXMubGEoKSA9PT0gJ1xcXFwnKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHRcdGNvbnN0IHRrID0gbmV3IFRva2VuKFRva2VuVHlwZS5zdHJpbmdMaXRlcmFsLCB0aGlzLCBzdGFydCk7XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0cmV0dXJuIHRrO1xuXHR9XG5cblx0c3BhY2VzKCkge1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwgJiYgL1xccy8udGVzdCh0aGlzLmxhKCkpKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdFx0cmV0dXJuIG5ldyBUb2tlbihUb2tlblR5cGUuc2tpcCwgdGhpcywgc3RhcnQpO1xuXHR9XG5cdGNvbW1lbnRzKCkge1xuXHRcdGlmICh0aGlzLmluUGFyZW50aGVzZXMgJiYgdGhpcy5pc05leHQoJy8nLCAnLycpKVxuXHRcdFx0cmV0dXJuIG51bGw7IC8vIERvIG5vdCBjb25zaWRlciAnLy8nIGFzIGNvbW1lbnQgaW4gYSBwYXJlbnRoZXNlcyBsaWtlIHVscihodHRwOi8vLi4uKVxuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRpZiAodGhpcy5pc05leHQoJy8nKSkge1xuXHRcdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdFx0d2hpbGUgKHRoaXMubGEoKSAhPT0gJ1xcbicgJiYgdGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5pc05leHQoJyonKSkge1xuXHRcdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdFx0d2hpbGUgKCF0aGlzLmlzTmV4dCgnKi8nKSAmJiB0aGlzLmxhKCkgIT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuYWR2YW5jZSgyKTtcblx0XHR9XG5cdFx0cmV0dXJuIG5ldyBUb2tlbihUb2tlblR5cGUuc2tpcCwgdGhpcywgc3RhcnQpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBTY3NzUGFyc2VyIGV4dGVuZHMgQmFzZVBhcnNlcjxUb2tlblR5cGU+IHtcblx0Z2V0UmVzVXJsKHRleHQ6IHN0cmluZyk6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgdGV4dDogc3RyaW5nfT4ge1xuXHRcdGNvbnN0IHJlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCB0ZXh0OiBzdHJpbmd9PiA9IFtdO1xuXHRcdHdoaWxlKHRoaXMubGEoKSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pc05leHRUeXBlcyhUb2tlblR5cGUuaWQsIFRva2VuVHlwZVsnKCddKSAmJlxuXHRcdFx0XHR0aGlzLmxhKCkudGV4dCA9PT0gJ3VybCcgJiYgdGhpcy5sYigpLnRleHQgIT09ICdAaW1wb3J0Jykge1xuXHRcdFx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgyKS5lbmQ7XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKDIpOyAvLyBqdW1wIG92ZXIgJygnXG5cdFx0XHRcdFx0aWYgKHRoaXMuaXNOZXh0VHlwZXMoVG9rZW5UeXBlLnN0cmluZ0xpdGVyYWwpKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBzdHJpbmdMaXQgPSB0aGlzLmxhKCk7XG5cdFx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHRcdHJlcy5wdXNoKHN0cmluZ0xpdCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIHRoaXMubGEoKS50eXBlICE9PSBUb2tlblR5cGVbJyknXSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbClcblx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdCBlbmQgb2YgZmlsZScpO1xuXHRcdFx0XHRcdFx0Y29uc3QgZW5kID0gdGhpcy5sYSgpLnN0YXJ0O1xuXHRcdFx0XHRcdFx0cmVzLnB1c2goe3N0YXJ0LCBlbmQsIHRleHQ6IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCl9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXG5cdGdldEFsbEltcG9ydCh0ZXh0OiBzdHJpbmcpOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHRleHQ6IHN0cmluZ30+IHtcblx0XHRjb25zdCByZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgdGV4dDogc3RyaW5nfT4gPSBbXTtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmlzTmV4dFR5cGVzKFRva2VuVHlwZS5mdW5jdGlvbiwgVG9rZW5UeXBlLnN0cmluZ0xpdGVyYWwpICYmIHRoaXMubGEoKS50ZXh0ID09PSAnQGltcG9ydCcpIHtcblx0XHRcdFx0cmVzLnB1c2godGhpcy5sYSgyKSk7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgyKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc05leHRUeXBlcyhUb2tlblR5cGUuZnVuY3Rpb24sIFRva2VuVHlwZS5pZCwgVG9rZW5UeXBlWycoJ10pICYmXG5cdFx0XHRcdHRoaXMubGEoKS50ZXh0ID09PSAnQGltcG9ydCcgJiYgdGhpcy5sYSgyKS50ZXh0ID09PSAndXJsJykge1xuXHRcdFx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgzKS5lbmQ7XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKDMpO1xuXHRcdFx0XHRcdHdoaWxlKHRoaXMubGEoKSAhPSBudWxsICYmIHRoaXMubGEoKS50eXBlICE9PSBUb2tlblR5cGVbJyknXSkge1xuXHRcdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbClcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5leHBlY3QgZW5kIG9mIGZpbGUnKTtcblx0XHRcdFx0XHRjb25zdCBlbmQgPSB0aGlzLmxhKCkuc3RhcnQ7XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0cmVzLnB1c2goe3N0YXJ0LCBlbmQsIHRleHQ6IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCl9KTtcblx0XHRcdH0gZWxzZVxuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlcztcblx0fVxufVxuIl19
