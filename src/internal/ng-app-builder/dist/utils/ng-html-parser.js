"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-classes-per-file max-line-length no-console jsdoc-format */
const base_LLn_parser_1 = require("dr-comp-package/wfh/dist/base-LLn-parser");
var HtmlTokenType;
(function (HtmlTokenType) {
    // comments,
    HtmlTokenType[HtmlTokenType["<"] = 0] = "<";
    HtmlTokenType[HtmlTokenType[">"] = 1] = ">";
    HtmlTokenType[HtmlTokenType["/>"] = 2] = "/>";
    HtmlTokenType[HtmlTokenType["("] = 3] = "(";
    HtmlTokenType[HtmlTokenType[")"] = 4] = ")";
    HtmlTokenType[HtmlTokenType["["] = 5] = "[";
    HtmlTokenType[HtmlTokenType["]"] = 6] = "]";
    HtmlTokenType[HtmlTokenType["</"] = 7] = "</";
    HtmlTokenType[HtmlTokenType["="] = 8] = "=";
    HtmlTokenType[HtmlTokenType["qm"] = 9] = "qm";
    HtmlTokenType[HtmlTokenType["identity"] = 10] = "identity";
    HtmlTokenType[HtmlTokenType["stringLiteral"] = 11] = "stringLiteral";
    HtmlTokenType[HtmlTokenType["any"] = 12] = "any";
    HtmlTokenType[HtmlTokenType["space"] = 13] = "space";
})(HtmlTokenType = exports.HtmlTokenType || (exports.HtmlTokenType = {}));
exports.TokenType = HtmlTokenType;
class TemplateLexer extends base_LLn_parser_1.BaseLexer {
    *[Symbol.iterator]() {
        while (true) {
            this.skip();
            let char = this.la();
            const start = this.position;
            if (char == null) {
                return;
            }
            switch (char) {
                case '>':
                case '(':
                case ')':
                case '[':
                case ']':
                case '=':
                    this.advance();
                    yield new base_LLn_parser_1.Token(HtmlTokenType[char], this, start);
                    continue;
                case '"':
                case '\'':
                    this.advance();
                    yield new base_LLn_parser_1.Token(HtmlTokenType.qm, this, start);
                    continue;
                default:
            }
            if (char === '<' && this.isIdStart(2)) {
                yield this.openTagStart();
            }
            else if (this.isNext('</')) {
                yield this.closeTagStart();
            }
            else if (this.isNext('/>')) {
                this.advance(2);
                yield new base_LLn_parser_1.Token(HtmlTokenType['/>'], this, start);
            }
            else if (this.isIdStart()) {
                do {
                    this.advance();
                    char = this.la();
                } while (this.isIdStart());
                yield new base_LLn_parser_1.Token(HtmlTokenType.identity, this, start);
                // } else if (char === '"') {
                // 	yield this.stringLit('"');
                // } else if (char === '\'') {
                // 	yield this.stringLit('\'');
                // } else if (char === '`') {
                // 	yield this.stringLit('`');
            }
            else if (this.isWhitespace()) {
                do {
                    this.advance();
                } while (this.isWhitespace());
                yield new base_LLn_parser_1.Token(HtmlTokenType.space, this, start);
                continue;
            }
            else {
                yield new base_LLn_parser_1.Token(HtmlTokenType.any, this, start);
                this.advance();
            }
        }
    }
    openTagStart() {
        const start = this.position;
        this.advance();
        do {
            this.advance();
        } while (this.isIdStart());
        return new base_LLn_parser_1.Token(HtmlTokenType['<'], this, start);
    }
    closeTagStart() {
        const start = this.position;
        this.advance(2);
        while (this.la() !== '>') {
            this.advance();
        }
        return new base_LLn_parser_1.Token(HtmlTokenType['</'], this, start);
    }
    isIdStart(laIdx = 1) {
        const char = this.la(laIdx);
        if (!char) {
            this.throwError('EOF');
            return;
        }
        return /[^<>()\[\]"'=`/]/.test(char) && /\S/.test(char);
    }
    isWhitespace() {
        const chr = this.la();
        return chr && /\s/.test(chr);
    }
    stringLit(quote) {
        this.advance();
        const start = this.position;
        const [line, col] = this.getLineColumn(start);
        while (this.la() !== quote) {
            if (this.la() == null) {
                console.log('endless string literal begin with line %s, col %s', line, col);
                this.throwError();
            }
            // console.log(':', this.la());
            if (this.la() === '\\') {
                this.advance();
            }
            this.advance();
        }
        const tk = new base_LLn_parser_1.Token(HtmlTokenType.stringLiteral, this, start);
        this.advance();
        return tk;
    }
    skip() {
        let chr = this.la();
        while (chr != null) {
            if (this.isComment()) {
                this.comment();
            }
            else if (this.isSwigComment()) {
                this.swigComment();
            }
            else {
                break;
            }
            chr = this.la();
        }
        return this.la();
    }
    isComment() {
        return this.isNext('<!--');
    }
    comment() {
        this.advance(4);
        while (!this.isNext('-->')) {
            if (this.la() == null)
                throw new Error('Comment is not closed, ' + this.getCurrentPosInfo());
            this.advance();
        }
        this.advance(3);
        return true;
    }
    isSwigComment() {
        return this.isNext('{#');
    }
    swigComment() {
        this.advance(2);
        while (!this.isNext('#}')) {
            this.advance();
        }
    }
}
exports.TemplateLexer = TemplateLexer;
class TemplateParser extends base_LLn_parser_1.BaseParser {
    constructor(input) {
        const lexer = new TemplateLexer(input);
        super(lexer);
        this.lexer = lexer;
        this.text = input;
    }
    getCurrentPosInfo() {
        const start = this.la() ? this.la().start : null;
        if (start) {
            const lineCol = this.lexer.getLineColumn(start);
            return `Line ${lineCol[0] + 1} column ${lineCol[1] + 1}`;
        }
        return '<end of file>';
    }
    skip() {
        while (this.la() != null && this.la().type === HtmlTokenType.space) {
            this.advance();
        }
    }
    parse() {
        const ast = [];
        while (this.la() != null) {
            if (this.la().type === HtmlTokenType['<']) {
                ast.push(this.tag());
            }
            else if (this.la().type === HtmlTokenType['</']) {
                this.advance();
            }
            else {
                this.advance();
            }
        }
        return ast;
    }
    tag() {
        const first = this.advance();
        const name = first.text.substring(1);
        const attrs = this.attributes();
        if (this.la() == null) {
            this.throwError('EOF');
        }
        const last = this.advance(); // >
        return { name, attrs, start: first.start, end: last.end };
    }
    attributes() {
        const attrs = {};
        while (this.la() && !this.isNextTypes(HtmlTokenType['>']) && !this.isNextTypes(HtmlTokenType['/>'])) {
            if (this.isNgAttrName()) {
                const key = this.ngAttrName();
                attrs[key] = { isNg: true, value: this.attrValue() };
            }
            else if (this.la().type === HtmlTokenType.identity) {
                const key = this.attrName();
                attrs[key] = { isNg: false, value: this.attrValue() };
            }
            else if (this.isNextTypes(HtmlTokenType.space)) {
                this.advance();
            }
            else {
                console.log('Previous tokens: ', this.lb().text);
                this.throwError(this.la().text);
            }
        }
        return attrs;
    }
    isNgAttrName() {
        if (this.la() == null)
            this.throwError('End of file');
        const type = this.la().type;
        return type === HtmlTokenType['['] || type === HtmlTokenType['('];
    }
    ngAttrName() {
        if (this.la() == null)
            this.throwError('End of file');
        const kind = this.la().type === HtmlTokenType['['] ? HtmlTokenType[']'] : HtmlTokenType[')'];
        let name;
        this.advance();
        if (this.isNgAttrName())
            name = this.ngAttrName();
        else
            name = this.attrName();
        if (this.la().type !== kind)
            this.throwError(this.la().text);
        this.advance();
        return name;
    }
    attrName() {
        return this.advance().text;
    }
    attrValue() {
        if (this.la() && this.la().type === HtmlTokenType['=']) {
            // let {text, start, end} = this.advance(2);
            // return {text, start, end};
            this.advance();
            let start = this.la() && this.la().start;
            if (this.isNextTypes(HtmlTokenType.qm)) {
                const endText = this.advance().text;
                start = this.la() && this.la().start;
                while (this.la() && !this.isNextTokenText(endText)) {
                    this.advance();
                }
                if (this.la() == null) {
                    this.throwError('end of file');
                }
                const end = this.lb().end;
                this.advance();
                // console.log('value:', this.text.slice(start, end));
                return {
                    text: this.text.slice(start, end),
                    start: start,
                    end
                };
            }
            while (this.la() && !this.isNextTypes(HtmlTokenType.space) &&
                !this.isNextTypes(HtmlTokenType['>'])) {
                this.advance();
            }
            if (this.la() == null) {
                this.throwError('end of file');
            }
            const end = this.lb().end;
            // console.log('value:', this.text.slice(start, end));
            return {
                text: this.text.slice(start, end),
                start: start,
                end
            };
        }
        else {
            return;
        }
    }
}
exports.TemplateParser = TemplateParser;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9uZy1odG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlGQUFpRjtBQUNqRiw4RUFBc0Y7QUFFdEYsSUFBWSxhQWdCWDtBQWhCRCxXQUFZLGFBQWE7SUFDeEIsWUFBWTtJQUNaLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsNkNBQUksQ0FBQTtJQUNKLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCw2Q0FBSSxDQUFBO0lBQ0osMkNBQUcsQ0FBQTtJQUNILDZDQUFFLENBQUE7SUFDRiwwREFBUSxDQUFBO0lBQ1Isb0VBQWEsQ0FBQTtJQUNiLGdEQUFHLENBQUE7SUFDSCxvREFBSyxDQUFBO0FBQ04sQ0FBQyxFQWhCVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQWdCeEI7QUFFd0Isa0NBQVM7QUFDbEMsTUFBYSxhQUFjLFNBQVEsMkJBQXdCO0lBQzFELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2pCLE9BQU8sSUFBSSxFQUFFO1lBQ1osSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUNqQixPQUFPO2FBQ1A7WUFDRCxRQUFRLElBQUksRUFBRTtnQkFDYixLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUc7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1B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O1lBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUN0QixJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2FBQy9CO1lBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRyxDQUFDLEdBQUcsQ0FBQztZQUMzQixzREFBc0Q7WUFDdEQsT0FBTztnQkFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBTSxFQUFFLEdBQUcsQ0FBQztnQkFDbEMsS0FBSyxFQUFFLEtBQU07Z0JBQ2IsR0FBRzthQUNILENBQUM7U0FDRjthQUFNO1lBQ04sT0FBTztTQUNQO0lBQ0YsQ0FBQztDQUNEO0FBbklELHdDQW1JQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy9uZy1odG1sLXBhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlIG1heC1saW5lLWxlbmd0aCBuby1jb25zb2xlIGpzZG9jLWZvcm1hdCAqL1xuaW1wb3J0IHtUb2tlbiwgQmFzZVBhcnNlciwgQmFzZUxleGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYmFzZS1MTG4tcGFyc2VyJztcblxuZXhwb3J0IGVudW0gSHRtbFRva2VuVHlwZSB7XG5cdC8vIGNvbW1lbnRzLFxuXHQnPCcsXG5cdCc+Jyxcblx0Jy8+Jyxcblx0JygnLFxuXHQnKScsXG5cdCdbJyxcblx0J10nLFxuXHQnPC8nLFxuXHQnPScsXG5cdHFtLCAvLyBxdW90YXRpb24gbWFya1xuXHRpZGVudGl0eSxcblx0c3RyaW5nTGl0ZXJhbCxcblx0YW55LCAvLyAuKlxuXHRzcGFjZVxufVxuXG5leHBvcnQge0h0bWxUb2tlblR5cGUgYXMgVG9rZW5UeXBlfTtcbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUxleGVyIGV4dGVuZHMgQmFzZUxleGVyPEh0bWxUb2tlblR5cGU+IHtcblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPEh0bWxUb2tlblR5cGU+PiB7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdHRoaXMuc2tpcCgpO1xuXHRcdFx0bGV0IGNoYXIgPSB0aGlzLmxhKCk7XG5cdFx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0XHRpZiAoY2hhciA9PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHN3aXRjaCAoY2hhcikge1xuXHRcdFx0XHRjYXNlICc+Jzpcblx0XHRcdFx0Y2FzZSAnKCc6XG5cdFx0XHRcdGNhc2UgJyknOlxuXHRcdFx0XHRjYXNlICdbJzpcblx0XHRcdFx0Y2FzZSAnXSc6XG5cdFx0XHRcdGNhc2UgJz0nOlxuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlW2NoYXJdLCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdGNhc2UgJ1wiJzpcblx0XHRcdFx0Y2FzZSAnXFwnJzpcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZS5xbSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0fVxuXHRcdFx0aWYgKGNoYXIgPT09ICc8JyAmJiB0aGlzLmlzSWRTdGFydCgyKSkge1xuXHRcdFx0XHR5aWVsZCB0aGlzLm9wZW5UYWdTdGFydCgpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmlzTmV4dCgnPC8nKSkge1xuXHRcdFx0XHR5aWVsZCB0aGlzLmNsb3NlVGFnU3RhcnQoKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc05leHQoJy8+JykpIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVsnLz4nXSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmlzSWRTdGFydCgpKSB7XG5cdFx0XHRcdGRvIHtcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHRjaGFyID0gdGhpcy5sYSgpO1xuXHRcdFx0XHR9IHdoaWxlICh0aGlzLmlzSWRTdGFydCgpKTtcblx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGUuaWRlbnRpdHksIHRoaXMsIHN0YXJ0KTtcblx0XHRcdC8vIH0gZWxzZSBpZiAoY2hhciA9PT0gJ1wiJykge1xuXHRcdFx0Ly8gXHR5aWVsZCB0aGlzLnN0cmluZ0xpdCgnXCInKTtcblx0XHRcdC8vIH0gZWxzZSBpZiAoY2hhciA9PT0gJ1xcJycpIHtcblx0XHRcdC8vIFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1xcJycpO1xuXHRcdFx0Ly8gfSBlbHNlIGlmIChjaGFyID09PSAnYCcpIHtcblx0XHRcdC8vIFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ2AnKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc1doaXRlc3BhY2UoKSkge1xuXHRcdFx0XHRkbyB7XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdH0gd2hpbGUgKHRoaXMuaXNXaGl0ZXNwYWNlKCkpO1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZS5zcGFjZSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLmFueSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0b3BlblRhZ1N0YXJ0KCkge1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRkbyB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9IHdoaWxlICh0aGlzLmlzSWRTdGFydCgpKTtcblx0XHRyZXR1cm4gbmV3IFRva2VuKEh0bWxUb2tlblR5cGVbJzwnXSwgdGhpcywgc3RhcnQpO1xuXHR9XG5cdGNsb3NlVGFnU3RhcnQoKSB7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdHRoaXMuYWR2YW5jZSgyKTtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9PSAnPicpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gbmV3IFRva2VuKEh0bWxUb2tlblR5cGVbJzwvJ10sIHRoaXMsIHN0YXJ0KTtcblx0fVxuXHRpc0lkU3RhcnQobGFJZHggPSAxKSB7XG5cdFx0Y29uc3QgY2hhciA9IHRoaXMubGEobGFJZHgpO1xuXHRcdGlmICghY2hhcikge1xuXHRcdFx0dGhpcy50aHJvd0Vycm9yKCdFT0YnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0cmV0dXJuIC9bXjw+KClcXFtcXF1cIic9YC9dLy50ZXN0KGNoYXIpICYmIC9cXFMvLnRlc3QoY2hhcik7XG5cdH1cblx0aXNXaGl0ZXNwYWNlKCkge1xuXHRcdGNvbnN0IGNociA9IHRoaXMubGEoKTtcblx0XHRyZXR1cm4gY2hyICYmIC9cXHMvLnRlc3QoY2hyKTtcblx0fVxuXG5cdHN0cmluZ0xpdChxdW90ZTogc3RyaW5nKSB7XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdGNvbnN0IFtsaW5lLCBjb2xdID0gdGhpcy5nZXRMaW5lQ29sdW1uKHN0YXJ0KTtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9PSBxdW90ZSkge1xuXHRcdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdlbmRsZXNzIHN0cmluZyBsaXRlcmFsIGJlZ2luIHdpdGggbGluZSAlcywgY29sICVzJywgbGluZSwgY29sKTtcblx0XHRcdFx0dGhpcy50aHJvd0Vycm9yKCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBjb25zb2xlLmxvZygnOicsIHRoaXMubGEoKSk7XG5cdFx0XHRpZiAodGhpcy5sYSgpID09PSAnXFxcXCcpIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdFx0Y29uc3QgdGsgPSBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZS5zdHJpbmdMaXRlcmFsLCB0aGlzLCBzdGFydCk7XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0cmV0dXJuIHRrO1xuXHR9XG5cblx0c2tpcCgpIHtcblx0XHRsZXQgY2hyID0gdGhpcy5sYSgpO1xuXHRcdHdoaWxlKGNociAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pc0NvbW1lbnQoKSkge1xuXHRcdFx0XHR0aGlzLmNvbW1lbnQoKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc1N3aWdDb21tZW50KCkpIHtcblx0XHRcdFx0dGhpcy5zd2lnQ29tbWVudCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjaHIgPSB0aGlzLmxhKCk7XG5cdFx0IH1cblx0XHQgcmV0dXJuIHRoaXMubGEoKTtcblx0fVxuXG5cdGlzQ29tbWVudCgpIHtcblx0XHRyZXR1cm4gdGhpcy5pc05leHQoJzwhLS0nKTtcblx0fVxuXHRjb21tZW50KCkge1xuXHRcdHRoaXMuYWR2YW5jZSg0KTtcblx0XHR3aGlsZSghdGhpcy5pc05leHQoJy0tPicpKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpID09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignQ29tbWVudCBpcyBub3QgY2xvc2VkLCAnICsgdGhpcy5nZXRDdXJyZW50UG9zSW5mbygpKTtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHR0aGlzLmFkdmFuY2UoMyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0aXNTd2lnQ29tbWVudCgpIHtcblx0XHRyZXR1cm4gdGhpcy5pc05leHQoJ3sjJyk7XG5cdH1cblx0c3dpZ0NvbW1lbnQoKSB7XG5cdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdHdoaWxlICghdGhpcy5pc05leHQoJyN9JykpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhZ0FzdCB7XG5cdG5hbWU6IHN0cmluZztcblx0YXR0cnM/OiB7W2tleTogc3RyaW5nXToge2lzTmc6IGJvb2xlYW4sIHZhbHVlPzogQXR0cmlidXRlVmFsdWVBc3R9fTtcblx0c3RhcnQ6IG51bWJlcjtcblx0ZW5kOiBudW1iZXI7XG5cdFtrZXk6IHN0cmluZ106IGFueTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlVmFsdWVBc3Qge1xuXHR0ZXh0OiBzdHJpbmc7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyO1xufVxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlUGFyc2VyIGV4dGVuZHMgQmFzZVBhcnNlcjxIdG1sVG9rZW5UeXBlPiB7XG5cdGxleGVyOiBUZW1wbGF0ZUxleGVyO1xuXHR0ZXh0OiBzdHJpbmc7XG5cdGNvbnN0cnVjdG9yKGlucHV0OiBzdHJpbmcpIHtcblx0XHRjb25zdCBsZXhlciA9IG5ldyBUZW1wbGF0ZUxleGVyKGlucHV0KTtcblx0XHRzdXBlcihsZXhlcik7XG5cdFx0dGhpcy5sZXhlciA9IGxleGVyO1xuXHRcdHRoaXMudGV4dCA9IGlucHV0O1xuXHR9XG5cblx0Z2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMubGEoKSA/IHRoaXMubGEoKSEuc3RhcnQgOiBudWxsO1xuXHRcdGlmIChzdGFydCkge1xuXHRcdFx0Y29uc3QgbGluZUNvbCA9IHRoaXMubGV4ZXIuZ2V0TGluZUNvbHVtbihzdGFydCk7XG5cdFx0XHRyZXR1cm4gYExpbmUgJHtsaW5lQ29sWzBdICsgMX0gY29sdW1uICR7bGluZUNvbFsxXSArIDF9YDtcblx0XHR9XG5cdFx0cmV0dXJuICc8ZW5kIG9mIGZpbGU+Jztcblx0fVxuXHRza2lwKCkge1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT0gbnVsbCAmJiB0aGlzLmxhKCkhLnR5cGUgPT09IEh0bWxUb2tlblR5cGUuc3BhY2UpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0fVxuXHRwYXJzZSgpOiBUYWdBc3RbXSB7XG5cdFx0Y29uc3QgYXN0OiBUYWdBc3RbXSA9IFtdO1xuXHRcdHdoaWxlKHRoaXMubGEoKSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpIS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc8J10pIHtcblx0XHRcdFx0YXN0LnB1c2godGhpcy50YWcoKSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMubGEoKSEudHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnPC8nXSkge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYXN0O1xuXHR9XG5cdHRhZygpOiBUYWdBc3Qge1xuXHRcdGNvbnN0IGZpcnN0ID0gdGhpcy5hZHZhbmNlKCkhO1xuXHRcdGNvbnN0IG5hbWUgPSBmaXJzdC50ZXh0LnN1YnN0cmluZygxKTtcblx0XHRjb25zdCBhdHRycyA9IHRoaXMuYXR0cmlidXRlcygpO1xuXHRcdGlmICh0aGlzLmxhKCkgPT1udWxsKSB7XG5cdFx0XHR0aGlzLnRocm93RXJyb3IoJ0VPRicpO1xuXHRcdH1cblx0XHRjb25zdCBsYXN0ID0gdGhpcy5hZHZhbmNlKCk7IC8vID5cblx0XHRyZXR1cm4ge25hbWUsIGF0dHJzLCBzdGFydDogZmlyc3Quc3RhcnQsIGVuZDogbGFzdCEuZW5kfTtcblx0fVxuXHRhdHRyaWJ1dGVzKCk6IHtba2V5OiBzdHJpbmddOiB7aXNOZzogYm9vbGVhbiwgdmFsdWU6IEF0dHJpYnV0ZVZhbHVlQXN0IHwgdW5kZWZpbmVkfX0ge1xuXHRcdGNvbnN0IGF0dHJzOiB7W2tleTogc3RyaW5nXToge2lzTmc6IGJvb2xlYW4sIHZhbHVlOiBBdHRyaWJ1dGVWYWx1ZUFzdCB8IHVuZGVmaW5lZH19ID0ge307XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAmJiAhdGhpcy5pc05leHRUeXBlcyhIdG1sVG9rZW5UeXBlWyc+J10pICYmICF0aGlzLmlzTmV4dFR5cGVzKEh0bWxUb2tlblR5cGVbJy8+J10pKSB7XG5cdFx0XHRpZiAodGhpcy5pc05nQXR0ck5hbWUoKSkge1xuXHRcdFx0XHRjb25zdCBrZXkgPSB0aGlzLm5nQXR0ck5hbWUoKTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHtpc05nOiB0cnVlLCB2YWx1ZTogdGhpcy5hdHRyVmFsdWUoKX07XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMubGEoKSEudHlwZSA9PT0gSHRtbFRva2VuVHlwZS5pZGVudGl0eSkge1xuXHRcdFx0XHRjb25zdCBrZXkgPSB0aGlzLmF0dHJOYW1lKCk7XG5cdFx0XHRcdGF0dHJzW2tleV0gPSB7aXNOZzogZmFsc2UsIHZhbHVlOiB0aGlzLmF0dHJWYWx1ZSgpfTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc05leHRUeXBlcyhIdG1sVG9rZW5UeXBlLnNwYWNlKSkge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdQcmV2aW91cyB0b2tlbnM6ICcsIHRoaXMubGIoKSEudGV4dCk7XG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkhLnRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYXR0cnM7XG5cdH1cblx0aXNOZ0F0dHJOYW1lKCkge1xuXHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbClcblx0XHRcdHRoaXMudGhyb3dFcnJvcignRW5kIG9mIGZpbGUnKTtcblx0XHRjb25zdCB0eXBlID0gdGhpcy5sYSgpIS50eXBlO1xuXHRcdHJldHVybiB0eXBlID09PSBIdG1sVG9rZW5UeXBlWydbJ10gfHwgdHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnKCddO1xuXHR9XG5cdG5nQXR0ck5hbWUoKSB7XG5cdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKVxuXHRcdFx0dGhpcy50aHJvd0Vycm9yKCdFbmQgb2YgZmlsZScpO1xuXHRcdGNvbnN0IGtpbmQgPSB0aGlzLmxhKCkhLnR5cGUgPT09IEh0bWxUb2tlblR5cGVbJ1snXSA/IEh0bWxUb2tlblR5cGVbJ10nXSA6IEh0bWxUb2tlblR5cGVbJyknXTtcblx0XHRsZXQgbmFtZTogc3RyaW5nO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGlmICh0aGlzLmlzTmdBdHRyTmFtZSgpKVxuXHRcdFx0bmFtZSA9IHRoaXMubmdBdHRyTmFtZSgpO1xuXHRcdGVsc2Vcblx0XHRcdG5hbWUgPSB0aGlzLmF0dHJOYW1lKCk7XG5cdFx0aWYgKHRoaXMubGEoKSEudHlwZSAhPT0ga2luZClcblx0XHRcdHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkhLnRleHQpO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdHJldHVybiBuYW1lO1xuXHR9XG5cdGF0dHJOYW1lKCkge1xuXHRcdHJldHVybiB0aGlzLmFkdmFuY2UoKSEudGV4dDtcblx0fVxuXHRhdHRyVmFsdWUoKTogQXR0cmlidXRlVmFsdWVBc3QgfCB1bmRlZmluZWQge1xuXHRcdGlmICh0aGlzLmxhKCkgJiYgdGhpcy5sYSgpIS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc9J10pIHtcblx0XHRcdC8vIGxldCB7dGV4dCwgc3RhcnQsIGVuZH0gPSB0aGlzLmFkdmFuY2UoMik7XG5cdFx0XHQvLyByZXR1cm4ge3RleHQsIHN0YXJ0LCBlbmR9O1xuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRsZXQgc3RhcnQgPSB0aGlzLmxhKCkgJiYgdGhpcy5sYSgpIS5zdGFydDtcblx0XHRcdGlmICh0aGlzLmlzTmV4dFR5cGVzKEh0bWxUb2tlblR5cGUucW0pKSB7XG5cdFx0XHRcdGNvbnN0IGVuZFRleHQgPSB0aGlzLmFkdmFuY2UoKSEudGV4dDtcblx0XHRcdFx0c3RhcnQgPSB0aGlzLmxhKCkgJiYgdGhpcy5sYSgpIS5zdGFydDtcblx0XHRcdFx0d2hpbGUgKHRoaXMubGEoKSAmJiAhdGhpcy5pc05leHRUb2tlblRleHQoZW5kVGV4dCkpIHtcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGhpcy5sYSgpID09IG51bGwpIHtcblx0XHRcdFx0XHR0aGlzLnRocm93RXJyb3IoJ2VuZCBvZiBmaWxlJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgZW5kID0gdGhpcy5sYigpIS5lbmQ7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygndmFsdWU6JywgdGhpcy50ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHR0ZXh0OiB0aGlzLnRleHQuc2xpY2Uoc3RhcnQhLCBlbmQpLFxuXHRcdFx0XHRcdHN0YXJ0OiBzdGFydCEsXG5cdFx0XHRcdFx0ZW5kXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdHdoaWxlICh0aGlzLmxhKCkgJiYgIXRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5zcGFjZSkgJiZcblx0XHRcdFx0IXRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZVsnPiddKSkge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLnRocm93RXJyb3IoJ2VuZCBvZiBmaWxlJyk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBlbmQgPSB0aGlzLmxiKCkhLmVuZDtcblx0XHRcdC8vIGNvbnNvbGUubG9nKCd2YWx1ZTonLCB0aGlzLnRleHQuc2xpY2Uoc3RhcnQsIGVuZCkpO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dGV4dDogdGhpcy50ZXh0LnNsaWNlKHN0YXJ0ISwgZW5kKSxcblx0XHRcdFx0c3RhcnQ6IHN0YXJ0ISxcblx0XHRcdFx0ZW5kXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG59XG4iXX0=
