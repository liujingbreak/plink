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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0QkFBNEI7QUFDNUIsOEVBQXNGO0FBRXRGLElBQVksU0FTWDtBQVRELFdBQVksU0FBUztJQUNwQix5Q0FBSSxDQUFBO0lBQ0oscUNBQUUsQ0FBQTtJQUNGLGlEQUFRLENBQUE7SUFDUiwyREFBYSxDQUFBO0lBQ2IsdUNBQUcsQ0FBQTtJQUNILDJDQUFLLENBQUE7SUFDTCxtQ0FBRyxDQUFBO0lBQ0gsbUNBQUcsQ0FBQTtBQUNKLENBQUMsRUFUVyxTQUFTLEdBQVQsaUJBQVMsS0FBVCxpQkFBUyxRQVNwQjtBQUVELE1BQWEsU0FBVSxTQUFRLDJCQUFvQjtJQUFuRDs7UUFDQyxrQkFBYSxHQUFHLEtBQUssQ0FBQztJQWtHdkIsQ0FBQztJQWpHQSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNqQixPQUFPLElBQUksRUFBRTtZQUNaLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDakIsT0FBTzthQUNQO1lBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtnQkFDcEUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO29CQUNsQixTQUFTO2FBQ1Y7WUFDRCxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pCLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFD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QUU7b0JBQzlELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDZjtnQkFDRCxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJO29CQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQ3pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUcsQ0FBQyxLQUFLLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUMsQ0FBQyxDQUFDO2FBQ3REOztnQkFDQSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDaEI7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7Q0FDRDtBQXJERCxnQ0FxREMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvc2ltcGxlLXNjc3MtcGFyc2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuaW1wb3J0IHtUb2tlbiwgQmFzZVBhcnNlciwgQmFzZUxleGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYmFzZS1MTG4tcGFyc2VyJztcblxuZXhwb3J0IGVudW0gVG9rZW5UeXBlIHtcblx0c2tpcCxcblx0aWQsXG5cdGZ1bmN0aW9uLFxuXHRzdHJpbmdMaXRlcmFsLFxuXHRhbnksXG5cdHNwYWNlLFxuXHQnKCcsXG5cdCcpJ1xufVxuXG5leHBvcnQgY2xhc3MgU2Nzc0xleGVyIGV4dGVuZHMgQmFzZUxleGVyPFRva2VuVHlwZT4ge1xuXHRpblBhcmVudGhlc2VzID0gZmFsc2U7XG5cdCpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxUb2tlblR5cGU+PiB7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGxldCBjaGFyID0gdGhpcy5sYSgpO1xuXHRcdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdFx0aWYgKGNoYXIgPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5sYSgpID09PSAnLycgJiYgKHRoaXMubGEoMikgPT09ICcvJyB8fCB0aGlzLmxhKDIpID09PSAnKicpKSB7XG5cdFx0XHRcdGlmICh0aGlzLmNvbW1lbnRzKCkpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRjaGFyID0gdGhpcy5sYSgpO1xuXHRcdFx0aWYgKGNoYXIgJiYgL1xccy8udGVzdChjaGFyKSkge1xuXHRcdFx0XHR0aGlzLnNwYWNlcygpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdHN3aXRjaCAoY2hhcikge1xuXHRcdFx0XHRjYXNlICdcIic6XG5cdFx0XHRcdFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1wiJyk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ1xcJyc6XG5cdFx0XHRcdFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1xcJycpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdAJzpcblx0XHRcdFx0XHR5aWVsZCB0aGlzLmlkZW50aXR5KCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJygnOlxuXHRcdFx0XHRcdHRoaXMuaW5QYXJlbnRoZXNlcyA9IHRydWU7XG5cdFx0XHRcdGNhc2UgJyknOlxuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihUb2tlblR5cGVbY2hhcl0sIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRpZiAoY2hhciAmJiAvW2EtekEtWjAtOV9cXC06XFwkXS8udGVzdChjaGFyKSkge1xuXHRcdFx0XHRcdFx0eWllbGQgdGhpcy5pZGVudGl0eShUb2tlblR5cGUuaWQpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihUb2tlblR5cGUuYW55LCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWRlbnRpdHkodHlwZSA9IFRva2VuVHlwZS5mdW5jdGlvbikge1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR3aGlsZSAodGhpcy5sYSgpICYmIC9bYS16QS1aMC05Xy1dLy50ZXN0KHRoaXMubGEoKSEpKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdFx0cmV0dXJuIG5ldyBUb2tlbih0eXBlLCB0aGlzLCBzdGFydCk7XG5cdH1cblxuXHRzdHJpbmdMaXQocXVvdGU6IHN0cmluZykge1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9PSBxdW90ZSkge1xuXHRcdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKVxuXHRcdFx0XHR0aGlzLnRocm93RXJyb3IoKTtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCc6JywgdGhpcy5sYSgpKTtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT09ICdcXFxcJykge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHRjb25zdCB0ayA9IG5ldyBUb2tlbihUb2tlblR5cGUuc3RyaW5nTGl0ZXJhbCwgdGhpcywgc3RhcnQpO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdHJldHVybiB0aztcblx0fVxuXG5cdHNwYWNlcygpIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPSBudWxsICYmIC9cXHMvLnRlc3QodGhpcy5sYSgpISkpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gbmV3IFRva2VuKFRva2VuVHlwZS5za2lwLCB0aGlzLCBzdGFydCk7XG5cdH1cblx0Y29tbWVudHMoKSB7XG5cdFx0aWYgKHRoaXMuaW5QYXJlbnRoZXNlcyAmJiB0aGlzLmlzTmV4dCgnLycsICcvJykpXG5cdFx0XHRyZXR1cm4gbnVsbDsgLy8gRG8gbm90IGNvbnNpZGVyICcvLycgYXMgY29tbWVudCBpbiBhIHBhcmVudGhlc2VzIGxpa2UgdWxyKGh0dHA6Ly8uLi4pXG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGlmICh0aGlzLmlzTmV4dCgnLycpKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoMik7XG5cdFx0XHR3aGlsZSAodGhpcy5sYSgpICE9PSAnXFxuJyAmJiB0aGlzLmxhKCkgIT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLmlzTmV4dCgnKicpKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoMik7XG5cdFx0XHR3aGlsZSAoIXRoaXMuaXNOZXh0KCcqLycpICYmIHRoaXMubGEoKSAhPSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdH1cblx0XHRyZXR1cm4gbmV3IFRva2VuKFRva2VuVHlwZS5za2lwLCB0aGlzLCBzdGFydCk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIFNjc3NQYXJzZXIgZXh0ZW5kcyBCYXNlUGFyc2VyPFRva2VuVHlwZT4ge1xuXHRnZXRSZXNVcmwodGV4dDogc3RyaW5nKTogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCB0ZXh0OiBzdHJpbmd9PiB7XG5cdFx0Y29uc3QgcmVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHRleHQ6IHN0cmluZ30+ID0gW107XG5cdFx0d2hpbGUodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmlzTmV4dFR5cGVzKFRva2VuVHlwZS5pZCwgVG9rZW5UeXBlWycoJ10pICYmXG5cdFx0XHRcdHRoaXMubGEoKSEudGV4dCA9PT0gJ3VybCcgJiYgdGhpcy5sYigpLnRleHQgIT09ICdAaW1wb3J0Jykge1xuXHRcdFx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgyKSEuZW5kO1xuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgyKTsgLy8ganVtcCBvdmVyICcoJ1xuXHRcdFx0XHRcdGlmICh0aGlzLmlzTmV4dFR5cGVzKFRva2VuVHlwZS5zdHJpbmdMaXRlcmFsKSkge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc3RyaW5nTGl0ID0gdGhpcy5sYSgpO1xuXHRcdFx0XHRcdFx0aWYgKHN0cmluZ0xpdCA9PSBudWxsKVxuXHRcdFx0XHRcdFx0XHR0aGlzLnRocm93RXJyb3IoJ0VuZCBvZiBmaWxlJyk7XG5cdFx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHRcdHJlcy5wdXNoKHN0cmluZ0xpdCEpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCAmJiB0aGlzLmxhKCkhLnR5cGUgIT09IFRva2VuVHlwZVsnKSddKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKVxuXHRcdFx0XHRcdFx0XHR0aGlzLnRocm93RXJyb3IoJ0VuZCBvZiBmaWxlJyk7XG5cdFx0XHRcdFx0XHRjb25zdCBlbmQgPSB0aGlzLmxhKCkhLnN0YXJ0O1xuXHRcdFx0XHRcdFx0cmVzLnB1c2goe3N0YXJ0LCBlbmQsIHRleHQ6IHRleHQuc2xpY2Uoc3RhcnQsIGVuZCl9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXG5cdGdldEFsbEltcG9ydCh0ZXh0OiBzdHJpbmcpOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHRleHQ6IHN0cmluZ30+IHtcblx0XHRjb25zdCByZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgdGV4dDogc3RyaW5nfT4gPSBbXTtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmlzTmV4dFR5cGVzKFRva2VuVHlwZS5mdW5jdGlvbiwgVG9rZW5UeXBlLnN0cmluZ0xpdGVyYWwpICYmIHRoaXMubGEoKSEudGV4dCA9PT0gJ0BpbXBvcnQnKSB7XG5cdFx0XHRcdHJlcy5wdXNoKHRoaXMubGEoMikhKTtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmlzTmV4dFR5cGVzKFRva2VuVHlwZS5mdW5jdGlvbiwgVG9rZW5UeXBlLmlkLCBUb2tlblR5cGVbJygnXSkgJiZcblx0XHRcdFx0dGhpcy5sYSgpIS50ZXh0ID09PSAnQGltcG9ydCcgJiYgdGhpcy5sYSgyKSEudGV4dCA9PT0gJ3VybCcpIHtcblx0XHRcdFx0XHRjb25zdCBzdGFydCA9IHRoaXMubGEoMykhLmVuZDtcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoMyk7XG5cdFx0XHRcdFx0d2hpbGUodGhpcy5sYSgpICE9IG51bGwgJiYgdGhpcy5sYSgpIS50eXBlICE9PSBUb2tlblR5cGVbJyknXSkge1xuXHRcdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbClcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5leHBlY3QgZW5kIG9mIGZpbGUnKTtcblx0XHRcdFx0XHRjb25zdCBlbmQgPSB0aGlzLmxhKCkhLnN0YXJ0O1xuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdHJlcy5wdXNoKHtzdGFydCwgZW5kLCB0ZXh0OiB0ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpfSk7XG5cdFx0XHR9IGVsc2Vcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHRcdHJldHVybiByZXM7XG5cdH1cbn1cbiJdfQ==
