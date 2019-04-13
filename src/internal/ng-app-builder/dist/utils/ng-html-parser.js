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
        return /[^<>()\[\]"'=`/]/.test(char) && /\S/.test(char);
    }
    isWhitespace() {
        const chr = this.la();
        return /\s/.test(chr);
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
        const type = this.la().type;
        return type === HtmlTokenType['['] || type === HtmlTokenType['('];
    }
    ngAttrName() {
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
                    start,
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
                start,
                end
            };
        }
        else {
            return null;
        }
    }
}
exports.TemplateParser = TemplateParser;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9uZy1odG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlGQUFpRjtBQUNqRiw4RUFBc0Y7QUFFdEYsSUFBWSxhQWdCWDtBQWhCRCxXQUFZLGFBQWE7SUFDeEIsWUFBWTtJQUNaLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsNkNBQUksQ0FBQTtJQUNKLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCw2Q0FBSSxDQUFBO0lBQ0osMkNBQUcsQ0FBQTtJQUNILDZDQUFFLENBQUE7SUFDRiwwREFBUSxDQUFBO0lBQ1Isb0VBQWEsQ0FBQTtJQUNiLGdEQUFHLENBQUE7SUFDSCxvREFBSyxDQUFBO0FBQ04sQ0FBQyxFQWhCVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQWdCeEI7QUFFd0Isa0NBQVM7QUFDbEMsTUFBYSxhQUFjLFNBQVEsMkJBQXdCO0lBQzFELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2pCLE9BQU8sSUFBSSxFQUFFO1lBQ1osSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osSUFBSSxJQUFJLEdBQVcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUNqQixPQUFPO2FBQ1A7WUFDRCxRQUFRLElBQUksRUFBRTtnQkFDYixLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUc7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1B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ZXIvZGlzdC91dGlscy9uZy1odG1sLXBhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlIG1heC1saW5lLWxlbmd0aCBuby1jb25zb2xlIGpzZG9jLWZvcm1hdCAqL1xuaW1wb3J0IHtUb2tlbiwgQmFzZVBhcnNlciwgQmFzZUxleGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYmFzZS1MTG4tcGFyc2VyJztcblxuZXhwb3J0IGVudW0gSHRtbFRva2VuVHlwZSB7XG5cdC8vIGNvbW1lbnRzLFxuXHQnPCcsXG5cdCc+Jyxcblx0Jy8+Jyxcblx0JygnLFxuXHQnKScsXG5cdCdbJyxcblx0J10nLFxuXHQnPC8nLFxuXHQnPScsXG5cdHFtLCAvLyBxdW90YXRpb24gbWFya1xuXHRpZGVudGl0eSxcblx0c3RyaW5nTGl0ZXJhbCxcblx0YW55LCAvLyAuKlxuXHRzcGFjZVxufVxuXG5leHBvcnQge0h0bWxUb2tlblR5cGUgYXMgVG9rZW5UeXBlfTtcbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUxleGVyIGV4dGVuZHMgQmFzZUxleGVyPEh0bWxUb2tlblR5cGU+IHtcblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPEh0bWxUb2tlblR5cGU+PiB7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdHRoaXMuc2tpcCgpO1xuXHRcdFx0bGV0IGNoYXI6IHN0cmluZyA9IHRoaXMubGEoKTtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdGlmIChjaGFyID09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0c3dpdGNoIChjaGFyKSB7XG5cdFx0XHRcdGNhc2UgJz4nOlxuXHRcdFx0XHRjYXNlICcoJzpcblx0XHRcdFx0Y2FzZSAnKSc6XG5cdFx0XHRcdGNhc2UgJ1snOlxuXHRcdFx0XHRjYXNlICddJzpcblx0XHRcdFx0Y2FzZSAnPSc6XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGVbY2hhcl0sIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0Y2FzZSAnXCInOlxuXHRcdFx0XHRjYXNlICdcXCcnOlxuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLnFtLCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2hhciA9PT0gJzwnICYmIHRoaXMuaXNJZFN0YXJ0KDIpKSB7XG5cdFx0XHRcdHlpZWxkIHRoaXMub3BlblRhZ1N0YXJ0KCk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNOZXh0KCc8LycpKSB7XG5cdFx0XHRcdHlpZWxkIHRoaXMuY2xvc2VUYWdTdGFydCgpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmlzTmV4dCgnLz4nKSkge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoMik7XG5cdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlWycvPiddLCB0aGlzLCBzdGFydCk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNJZFN0YXJ0KCkpIHtcblx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHRcdGNoYXIgPSB0aGlzLmxhKCk7XG5cdFx0XHRcdH0gd2hpbGUgKHRoaXMuaXNJZFN0YXJ0KCkpO1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZS5pZGVudGl0eSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0Ly8gfSBlbHNlIGlmIChjaGFyID09PSAnXCInKSB7XG5cdFx0XHQvLyBcdHlpZWxkIHRoaXMuc3RyaW5nTGl0KCdcIicpO1xuXHRcdFx0Ly8gfSBlbHNlIGlmIChjaGFyID09PSAnXFwnJykge1xuXHRcdFx0Ly8gXHR5aWVsZCB0aGlzLnN0cmluZ0xpdCgnXFwnJyk7XG5cdFx0XHQvLyB9IGVsc2UgaWYgKGNoYXIgPT09ICdgJykge1xuXHRcdFx0Ly8gXHR5aWVsZCB0aGlzLnN0cmluZ0xpdCgnYCcpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmlzV2hpdGVzcGFjZSgpKSB7XG5cdFx0XHRcdGRvIHtcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0fSB3aGlsZSAodGhpcy5pc1doaXRlc3BhY2UoKSk7XG5cdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLnNwYWNlLCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGUuYW55LCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRvcGVuVGFnU3RhcnQoKSB7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGRvIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH0gd2hpbGUgKHRoaXMuaXNJZFN0YXJ0KCkpO1xuXHRcdHJldHVybiBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVsnPCddLCB0aGlzLCBzdGFydCk7XG5cdH1cblx0Y2xvc2VUYWdTdGFydCgpIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT09ICc+Jykge1xuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHRcdHJldHVybiBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVsnPC8nXSwgdGhpcywgc3RhcnQpO1xuXHR9XG5cdGlzSWRTdGFydChsYUlkeCA9IDEpIHtcblx0XHRjb25zdCBjaGFyID0gdGhpcy5sYShsYUlkeCk7XG5cdFx0cmV0dXJuIC9bXjw+KClcXFtcXF1cIic9YC9dLy50ZXN0KGNoYXIpICYmIC9cXFMvLnRlc3QoY2hhcik7XG5cdH1cblx0aXNXaGl0ZXNwYWNlKCkge1xuXHRcdGNvbnN0IGNociA9IHRoaXMubGEoKTtcblx0XHRyZXR1cm4gL1xccy8udGVzdChjaHIpO1xuXHR9XG5cblx0c3RyaW5nTGl0KHF1b3RlOiBzdHJpbmcpIHtcblx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0Y29uc3QgW2xpbmUsIGNvbF0gPSB0aGlzLmdldExpbmVDb2x1bW4oc3RhcnQpO1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT09IHF1b3RlKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpID09IG51bGwpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2VuZGxlc3Mgc3RyaW5nIGxpdGVyYWwgYmVnaW4gd2l0aCBsaW5lICVzLCBjb2wgJXMnLCBsaW5lLCBjb2wpO1xuXHRcdFx0XHR0aGlzLnRocm93RXJyb3IoKTtcblx0XHRcdH1cblx0XHRcdC8vIGNvbnNvbGUubG9nKCc6JywgdGhpcy5sYSgpKTtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT09ICdcXFxcJykge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHRjb25zdCB0ayA9IG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLnN0cmluZ0xpdGVyYWwsIHRoaXMsIHN0YXJ0KTtcblx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRyZXR1cm4gdGs7XG5cdH1cblxuXHRza2lwKCkge1xuXHRcdGxldCBjaHIgPSB0aGlzLmxhKCk7XG5cdFx0d2hpbGUoY2hyICE9IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmlzQ29tbWVudCgpKSB7XG5cdFx0XHRcdHRoaXMuY29tbWVudCgpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmlzU3dpZ0NvbW1lbnQoKSkge1xuXHRcdFx0XHR0aGlzLnN3aWdDb21tZW50KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGNociA9IHRoaXMubGEoKTtcblx0XHQgfVxuXHRcdCByZXR1cm4gdGhpcy5sYSgpO1xuXHR9XG5cblx0aXNDb21tZW50KCkge1xuXHRcdHJldHVybiB0aGlzLmlzTmV4dCgnPCEtLScpO1xuXHR9XG5cdGNvbW1lbnQoKSB7XG5cdFx0dGhpcy5hZHZhbmNlKDQpO1xuXHRcdHdoaWxlKCF0aGlzLmlzTmV4dCgnLS0+JykpIHtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDb21tZW50IGlzIG5vdCBjbG9zZWQsICcgKyB0aGlzLmdldEN1cnJlbnRQb3NJbmZvKCkpO1xuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHRcdHRoaXMuYWR2YW5jZSgzKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXHRpc1N3aWdDb21tZW50KCkge1xuXHRcdHJldHVybiB0aGlzLmlzTmV4dCgneyMnKTtcblx0fVxuXHRzd2lnQ29tbWVudCgpIHtcblx0XHR0aGlzLmFkdmFuY2UoMik7XG5cdFx0d2hpbGUgKCF0aGlzLmlzTmV4dCgnI30nKSkge1xuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHR9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFnQXN0IHtcblx0bmFtZT86IHN0cmluZztcblx0YXR0cnM/OiB7W2tleTogc3RyaW5nXToge2lzTmc6IGJvb2xlYW4sIHZhbHVlOiBBdHRyaWJ1dGVWYWx1ZUFzdH19O1xuXHRzdGFydDogbnVtYmVyO1xuXHRlbmQ6IG51bWJlcjtcblx0W2tleTogc3RyaW5nXTogYW55O1xufVxuZXhwb3J0IGludGVyZmFjZSBBdHRyaWJ1dGVWYWx1ZUFzdCB7XG5cdHRleHQ6IHN0cmluZzsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXI7XG59XG5leHBvcnQgY2xhc3MgVGVtcGxhdGVQYXJzZXIgZXh0ZW5kcyBCYXNlUGFyc2VyPEh0bWxUb2tlblR5cGU+IHtcblx0bGV4ZXI6IFRlbXBsYXRlTGV4ZXI7XG5cdHRleHQ6IHN0cmluZztcblx0Y29uc3RydWN0b3IoaW5wdXQ6IHN0cmluZykge1xuXHRcdGNvbnN0IGxleGVyID0gbmV3IFRlbXBsYXRlTGV4ZXIoaW5wdXQpO1xuXHRcdHN1cGVyKGxleGVyKTtcblx0XHR0aGlzLmxleGVyID0gbGV4ZXI7XG5cdFx0dGhpcy50ZXh0ID0gaW5wdXQ7XG5cdH1cblxuXHRnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpID8gdGhpcy5sYSgpLnN0YXJ0IDogbnVsbDtcblx0XHRpZiAoc3RhcnQpIHtcblx0XHRcdGNvbnN0IGxpbmVDb2wgPSB0aGlzLmxleGVyLmdldExpbmVDb2x1bW4oc3RhcnQpO1xuXHRcdFx0cmV0dXJuIGBMaW5lICR7bGluZUNvbFswXSArIDF9IGNvbHVtbiAke2xpbmVDb2xbMV0gKyAxfWA7XG5cdFx0fVxuXHR9XG5cdHNraXAoKSB7XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPSBudWxsICYmIHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlLnNwYWNlKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdH1cblx0cGFyc2UoKTogVGFnQXN0W10ge1xuXHRcdGNvbnN0IGFzdDogVGFnQXN0W10gPSBbXTtcblx0XHR3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc8J10pIHtcblx0XHRcdFx0YXN0LnB1c2godGhpcy50YWcoKSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc8LyddKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhc3Q7XG5cdH1cblx0dGFnKCk6IFRhZ0FzdCB7XG5cdFx0Y29uc3QgZmlyc3QgPSB0aGlzLmFkdmFuY2UoKTtcblx0XHRjb25zdCBuYW1lID0gZmlyc3QudGV4dC5zdWJzdHJpbmcoMSk7XG5cdFx0Y29uc3QgYXR0cnMgPSB0aGlzLmF0dHJpYnV0ZXMoKTtcblx0XHRjb25zdCBsYXN0ID0gdGhpcy5hZHZhbmNlKCk7IC8vID5cblx0XHRyZXR1cm4ge25hbWUsIGF0dHJzLCBzdGFydDogZmlyc3Quc3RhcnQsIGVuZDogbGFzdC5lbmR9O1xuXHR9XG5cdGF0dHJpYnV0ZXMoKToge1trZXk6IHN0cmluZ106IHtpc05nOiBib29sZWFuLCB2YWx1ZTogQXR0cmlidXRlVmFsdWVBc3R9fSB7XG5cdFx0Y29uc3QgYXR0cnM6IHtba2V5OiBzdHJpbmddOiB7aXNOZzogYm9vbGVhbiwgdmFsdWU6IEF0dHJpYnV0ZVZhbHVlQXN0fX0gPSB7fTtcblx0XHR3aGlsZSAodGhpcy5sYSgpICYmICF0aGlzLmlzTmV4dFR5cGVzKEh0bWxUb2tlblR5cGVbJz4nXSkgJiYgIXRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZVsnLz4nXSkpIHtcblx0XHRcdGlmICh0aGlzLmlzTmdBdHRyTmFtZSgpKSB7XG5cdFx0XHRcdGNvbnN0IGtleSA9IHRoaXMubmdBdHRyTmFtZSgpO1xuXHRcdFx0XHRhdHRyc1trZXldID0ge2lzTmc6IHRydWUsIHZhbHVlOiB0aGlzLmF0dHJWYWx1ZSgpfTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5sYSgpLnR5cGUgPT09IEh0bWxUb2tlblR5cGUuaWRlbnRpdHkpIHtcblx0XHRcdFx0Y29uc3Qga2V5ID0gdGhpcy5hdHRyTmFtZSgpO1xuXHRcdFx0XHRhdHRyc1trZXldID0ge2lzTmc6IGZhbHNlLCB2YWx1ZTogdGhpcy5hdHRyVmFsdWUoKX07XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5zcGFjZSkpIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnUHJldmlvdXMgdG9rZW5zOiAnLCB0aGlzLmxiKCkudGV4dCk7XG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkudGV4dCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBhdHRycztcblx0fVxuXHRpc05nQXR0ck5hbWUoKSB7XG5cdFx0Y29uc3QgdHlwZSA9IHRoaXMubGEoKS50eXBlO1xuXHRcdHJldHVybiB0eXBlID09PSBIdG1sVG9rZW5UeXBlWydbJ10gfHwgdHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnKCddO1xuXHR9XG5cdG5nQXR0ck5hbWUoKSB7XG5cdFx0Y29uc3Qga2luZCA9IHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWydbJ10gPyBIdG1sVG9rZW5UeXBlWyddJ10gOiBIdG1sVG9rZW5UeXBlWycpJ107XG5cdFx0bGV0IG5hbWU6IHN0cmluZztcblx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRpZiAodGhpcy5pc05nQXR0ck5hbWUoKSlcblx0XHRcdG5hbWUgPSB0aGlzLm5nQXR0ck5hbWUoKTtcblx0XHRlbHNlXG5cdFx0XHRuYW1lID0gdGhpcy5hdHRyTmFtZSgpO1xuXHRcdGlmICh0aGlzLmxhKCkudHlwZSAhPT0ga2luZClcblx0XHRcdHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkudGV4dCk7XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0cmV0dXJuIG5hbWU7XG5cdH1cblx0YXR0ck5hbWUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuYWR2YW5jZSgpLnRleHQ7XG5cdH1cblx0YXR0clZhbHVlKCk6IEF0dHJpYnV0ZVZhbHVlQXN0IHtcblx0XHRpZiAodGhpcy5sYSgpICYmIHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc9J10pIHtcblx0XHRcdC8vIGxldCB7dGV4dCwgc3RhcnQsIGVuZH0gPSB0aGlzLmFkdmFuY2UoMik7XG5cdFx0XHQvLyByZXR1cm4ge3RleHQsIHN0YXJ0LCBlbmR9O1xuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRsZXQgc3RhcnQgPSB0aGlzLmxhKCkgJiYgdGhpcy5sYSgpLnN0YXJ0O1xuXHRcdFx0aWYgKHRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5xbSkpIHtcblx0XHRcdFx0Y29uc3QgZW5kVGV4dCA9IHRoaXMuYWR2YW5jZSgpLnRleHQ7XG5cdFx0XHRcdHN0YXJ0ID0gdGhpcy5sYSgpICYmIHRoaXMubGEoKS5zdGFydDtcblx0XHRcdFx0d2hpbGUgKHRoaXMubGEoKSAmJiAhdGhpcy5pc05leHRUb2tlblRleHQoZW5kVGV4dCkpIHtcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGhpcy5sYSgpID09IG51bGwpIHtcblx0XHRcdFx0XHR0aGlzLnRocm93RXJyb3IoJ2VuZCBvZiBmaWxlJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgZW5kID0gdGhpcy5sYigpLmVuZDtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKCd2YWx1ZTonLCB0aGlzLnRleHQuc2xpY2Uoc3RhcnQsIGVuZCkpO1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHRleHQ6IHRoaXMudGV4dC5zbGljZShzdGFydCwgZW5kKSxcblx0XHRcdFx0XHRzdGFydCxcblx0XHRcdFx0XHRlbmRcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0d2hpbGUgKHRoaXMubGEoKSAmJiAhdGhpcy5pc05leHRUeXBlcyhIdG1sVG9rZW5UeXBlLnNwYWNlKSAmJlxuXHRcdFx0XHQhdGhpcy5pc05leHRUeXBlcyhIdG1sVG9rZW5UeXBlWyc+J10pKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKSB7XG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcignZW5kIG9mIGZpbGUnKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGVuZCA9IHRoaXMubGIoKS5lbmQ7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygndmFsdWU6JywgdGhpcy50ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHRleHQ6IHRoaXMudGV4dC5zbGljZShzdGFydCwgZW5kKSxcblx0XHRcdFx0c3RhcnQsXG5cdFx0XHRcdGVuZFxuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHR9XG59XG4iXX0=
