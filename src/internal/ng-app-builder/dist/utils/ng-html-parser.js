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
    HtmlTokenType[HtmlTokenType["identity"] = 9] = "identity";
    HtmlTokenType[HtmlTokenType["stringLiteral"] = 10] = "stringLiteral";
    HtmlTokenType[HtmlTokenType["any"] = 11] = "any";
    HtmlTokenType[HtmlTokenType["space"] = 12] = "space";
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
            }
            else if (char === '"') {
                yield this.stringLit('"');
            }
            else if (char === '\'') {
                yield this.stringLit('\'');
            }
            else if (char === '`') {
                yield this.stringLit('`');
            }
            else if (this.isWhitespace()) {
                do {
                    this.advance();
                } while (this.isWhitespace());
                // yield new Token(HtmlTokenType.space, ' ');
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
        while (this.la() !== quote) {
            if (this.la() == null)
                this.throwError();
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
        while (this.la() != null && this.la().type !== HtmlTokenType['>'] && this.la().type !== HtmlTokenType['/>']) {
            if (this.isNgAttrName()) {
                const key = this.ngAttrName();
                attrs[key] = { isNg: true, value: this.attrValue() };
            }
            else if (this.la().type === HtmlTokenType.identity) {
                const key = this.attrName();
                attrs[key] = { isNg: false, value: this.attrValue() };
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
            return this.advance(2);
        }
        else {
            return null;
        }
    }
}
exports.TemplateParser = TemplateParser;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9uZy1odG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlGQUFpRjtBQUNqRiw4RUFBc0Y7QUFFdEYsSUFBWSxhQWVYO0FBZkQsV0FBWSxhQUFhO0lBQ3hCLFlBQVk7SUFDWiwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDZDQUFJLENBQUE7SUFDSiwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsNkNBQUksQ0FBQTtJQUNKLDJDQUFHLENBQUE7SUFDSCx5REFBUSxDQUFBO0lBQ1Isb0VBQWEsQ0FBQTtJQUNiLGdEQUFHLENBQUE7SUFDSCxvREFBSyxDQUFBO0FBQ04sQ0FBQyxFQWZXLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBZXhCO0FBRXdCLGtDQUFTO0FBQ2xDLE1BQWEsYUFBYyxTQUFRLDJCQUF3QjtJQUMxRCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNqQixPQUFPLElBQUksRUFBRTtZQUNaLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLElBQUksSUFBSSxHQUFXLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzVCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDakIsT0FBTzthQUNQO1lBQ0QsUUFBUSxJQUFJLEVBQUU7Z0JBQ2IsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxHQUFHO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixNQUFNLElBQUksdUJBQUssQ0FBQyxh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LFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUNELFNBQVM7UUFDUixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2RCw0Q0FBNEM7WUFDNUMsNkJBQTZCO1lBQzdCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN2QjthQUFNO1lBQ04sT0FBTyxJQUFJLENBQUM7U0FDWjtJQUNGLENBQUM7Q0FDRDtBQXJGRCx3Q0FxRkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvbmctaHRtbC1wYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZSBtYXgtbGluZS1sZW5ndGggbm8tY29uc29sZSBqc2RvYy1mb3JtYXQgKi9cbmltcG9ydCB7VG9rZW4sIEJhc2VQYXJzZXIsIEJhc2VMZXhlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2Jhc2UtTExuLXBhcnNlcic7XG5cbmV4cG9ydCBlbnVtIEh0bWxUb2tlblR5cGUge1xuXHQvLyBjb21tZW50cyxcblx0JzwnLFxuXHQnPicsXG5cdCcvPicsXG5cdCcoJyxcblx0JyknLFxuXHQnWycsXG5cdCddJyxcblx0JzwvJyxcblx0Jz0nLFxuXHRpZGVudGl0eSxcblx0c3RyaW5nTGl0ZXJhbCxcblx0YW55LCAvLyAuKlxuXHRzcGFjZVxufVxuXG5leHBvcnQge0h0bWxUb2tlblR5cGUgYXMgVG9rZW5UeXBlfTtcbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUxleGVyIGV4dGVuZHMgQmFzZUxleGVyPEh0bWxUb2tlblR5cGU+IHtcblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPEh0bWxUb2tlblR5cGU+PiB7XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdHRoaXMuc2tpcCgpO1xuXHRcdFx0bGV0IGNoYXI6IHN0cmluZyA9IHRoaXMubGEoKTtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdGlmIChjaGFyID09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0c3dpdGNoIChjaGFyKSB7XG5cdFx0XHRcdGNhc2UgJz4nOlxuXHRcdFx0XHRjYXNlICcoJzpcblx0XHRcdFx0Y2FzZSAnKSc6XG5cdFx0XHRcdGNhc2UgJ1snOlxuXHRcdFx0XHRjYXNlICddJzpcblx0XHRcdFx0Y2FzZSAnPSc6XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGVbY2hhcl0sIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdH1cblx0XHRcdGlmIChjaGFyID09PSAnPCcgJiYgdGhpcy5pc0lkU3RhcnQoMikpIHtcblx0XHRcdFx0eWllbGQgdGhpcy5vcGVuVGFnU3RhcnQoKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc05leHQoJzwvJykpIHtcblx0XHRcdFx0eWllbGQgdGhpcy5jbG9zZVRhZ1N0YXJ0KCk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNOZXh0KCcvPicpKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgyKTtcblx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGVbJy8+J10sIHRoaXMsIHN0YXJ0KTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc0lkU3RhcnQoKSkge1xuXHRcdFx0XHRkbyB7XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0Y2hhciA9IHRoaXMubGEoKTtcblx0XHRcdFx0fSB3aGlsZSAodGhpcy5pc0lkU3RhcnQoKSk7XG5cdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLmlkZW50aXR5LCB0aGlzLCBzdGFydCk7XG5cdFx0XHR9IGVsc2UgaWYgKGNoYXIgPT09ICdcIicpIHtcblx0XHRcdFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1wiJyk7XG5cdFx0XHR9IGVsc2UgaWYgKGNoYXIgPT09ICdcXCcnKSB7XG5cdFx0XHRcdHlpZWxkIHRoaXMuc3RyaW5nTGl0KCdcXCcnKTtcblx0XHRcdH0gZWxzZSBpZiAoY2hhciA9PT0gJ2AnKSB7XG5cdFx0XHRcdHlpZWxkIHRoaXMuc3RyaW5nTGl0KCdgJyk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNXaGl0ZXNwYWNlKCkpIHtcblx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHR9IHdoaWxlICh0aGlzLmlzV2hpdGVzcGFjZSgpKTtcblx0XHRcdFx0Ly8geWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGUuc3BhY2UsICcgJyk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGUuYW55LCB0aGlzLCBzdGFydCk7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRvcGVuVGFnU3RhcnQoKSB7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGRvIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH0gd2hpbGUgKHRoaXMuaXNJZFN0YXJ0KCkpO1xuXHRcdHJldHVybiBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVsnPCddLCB0aGlzLCBzdGFydCk7XG5cdH1cblx0Y2xvc2VUYWdTdGFydCgpIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT09ICc+Jykge1xuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHRcdHJldHVybiBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVsnPC8nXSwgdGhpcywgc3RhcnQpO1xuXHR9XG5cdGlzSWRTdGFydChsYUlkeCA9IDEpIHtcblx0XHRjb25zdCBjaGFyID0gdGhpcy5sYShsYUlkeCk7XG5cdFx0cmV0dXJuIC9bXjw+KClcXFtcXF1cIic9YC9dLy50ZXN0KGNoYXIpICYmIC9cXFMvLnRlc3QoY2hhcik7XG5cdH1cblx0aXNXaGl0ZXNwYWNlKCkge1xuXHRcdGNvbnN0IGNociA9IHRoaXMubGEoKTtcblx0XHRyZXR1cm4gL1xccy8udGVzdChjaHIpO1xuXHR9XG5cblx0c3RyaW5nTGl0KHF1b3RlOiBzdHJpbmcpIHtcblx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPT0gcXVvdGUpIHtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbClcblx0XHRcdFx0dGhpcy50aHJvd0Vycm9yKCk7XG5cdFx0XHQvLyBjb25zb2xlLmxvZygnOicsIHRoaXMubGEoKSk7XG5cdFx0XHRpZiAodGhpcy5sYSgpID09PSAnXFxcXCcpIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdFx0Y29uc3QgdGsgPSBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZS5zdHJpbmdMaXRlcmFsLCB0aGlzLCBzdGFydCk7XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0cmV0dXJuIHRrO1xuXHR9XG5cblx0c2tpcCgpIHtcblx0XHRsZXQgY2hyID0gdGhpcy5sYSgpO1xuXHRcdHdoaWxlKGNociAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5pc0NvbW1lbnQoKSkge1xuXHRcdFx0XHR0aGlzLmNvbW1lbnQoKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc1N3aWdDb21tZW50KCkpIHtcblx0XHRcdFx0dGhpcy5zd2lnQ29tbWVudCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjaHIgPSB0aGlzLmxhKCk7XG5cdFx0IH1cblx0XHQgcmV0dXJuIHRoaXMubGEoKTtcblx0fVxuXG5cdGlzQ29tbWVudCgpIHtcblx0XHRyZXR1cm4gdGhpcy5pc05leHQoJzwhLS0nKTtcblx0fVxuXHRjb21tZW50KCkge1xuXHRcdHRoaXMuYWR2YW5jZSg0KTtcblx0XHR3aGlsZSghdGhpcy5pc05leHQoJy0tPicpKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpID09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignQ29tbWVudCBpcyBub3QgY2xvc2VkLCAnICsgdGhpcy5nZXRDdXJyZW50UG9zSW5mbygpKTtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0XHR0aGlzLmFkdmFuY2UoMyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0aXNTd2lnQ29tbWVudCgpIHtcblx0XHRyZXR1cm4gdGhpcy5pc05leHQoJ3sjJyk7XG5cdH1cblx0c3dpZ0NvbW1lbnQoKSB7XG5cdFx0dGhpcy5hZHZhbmNlKDIpO1xuXHRcdHdoaWxlICghdGhpcy5pc05leHQoJyN9JykpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhZ0FzdCB7XG5cdG5hbWU/OiBzdHJpbmc7XG5cdGF0dHJzPzoge1trZXk6IHN0cmluZ106IHtpc05nOiBib29sZWFuLCB2YWx1ZTogQXR0cmlidXRlVmFsdWVBc3R9fTtcblx0c3RhcnQ6IG51bWJlcjtcblx0ZW5kOiBudW1iZXI7XG5cdFtrZXk6IHN0cmluZ106IGFueTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlVmFsdWVBc3Qge1xuXHR0ZXh0OiBzdHJpbmc7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyO1xufVxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlUGFyc2VyIGV4dGVuZHMgQmFzZVBhcnNlcjxIdG1sVG9rZW5UeXBlPiB7XG5cdGxleGVyOiBUZW1wbGF0ZUxleGVyO1xuXHRjb25zdHJ1Y3RvcihpbnB1dDogc3RyaW5nKSB7XG5cdFx0Y29uc3QgbGV4ZXIgPSBuZXcgVGVtcGxhdGVMZXhlcihpbnB1dCk7XG5cdFx0c3VwZXIobGV4ZXIpO1xuXHRcdHRoaXMubGV4ZXIgPSBsZXhlcjtcblx0fVxuXG5cdGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLmxhKCkgPyB0aGlzLmxhKCkuc3RhcnQgOiBudWxsO1xuXHRcdGlmIChzdGFydCkge1xuXHRcdFx0Y29uc3QgbGluZUNvbCA9IHRoaXMubGV4ZXIuZ2V0TGluZUNvbHVtbihzdGFydCk7XG5cdFx0XHRyZXR1cm4gYExpbmUgJHtsaW5lQ29sWzBdICsgMX0gY29sdW1uICR7bGluZUNvbFsxXSArIDF9YDtcblx0XHR9XG5cdH1cblx0c2tpcCgpIHtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwgJiYgdGhpcy5sYSgpLnR5cGUgPT09IEh0bWxUb2tlblR5cGUuc3BhY2UpIHtcblx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdH1cblx0fVxuXHRwYXJzZSgpOiBUYWdBc3RbXSB7XG5cdFx0Y29uc3QgYXN0OiBUYWdBc3RbXSA9IFtdO1xuXHRcdHdoaWxlKHRoaXMubGEoKSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpLnR5cGUgPT09IEh0bWxUb2tlblR5cGVbJzwnXSkge1xuXHRcdFx0XHRhc3QucHVzaCh0aGlzLnRhZygpKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5sYSgpLnR5cGUgPT09IEh0bWxUb2tlblR5cGVbJzwvJ10pIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFzdDtcblx0fVxuXHR0YWcoKTogVGFnQXN0IHtcblx0XHRjb25zdCBmaXJzdCA9IHRoaXMuYWR2YW5jZSgpO1xuXHRcdGNvbnN0IG5hbWUgPSBmaXJzdC50ZXh0LnN1YnN0cmluZygxKTtcblx0XHRjb25zdCBhdHRycyA9IHRoaXMuYXR0cmlidXRlcygpO1xuXHRcdGNvbnN0IGxhc3QgPSB0aGlzLmFkdmFuY2UoKTsgLy8gPlxuXHRcdHJldHVybiB7bmFtZSwgYXR0cnMsIHN0YXJ0OiBmaXJzdC5zdGFydCwgZW5kOiBsYXN0LmVuZH07XG5cdH1cblx0YXR0cmlidXRlcygpOiB7W2tleTogc3RyaW5nXToge2lzTmc6IGJvb2xlYW4sIHZhbHVlOiBBdHRyaWJ1dGVWYWx1ZUFzdH19IHtcblx0XHRjb25zdCBhdHRyczoge1trZXk6IHN0cmluZ106IHtpc05nOiBib29sZWFuLCB2YWx1ZTogQXR0cmlidXRlVmFsdWVBc3R9fSA9IHt9O1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT0gbnVsbCAmJiB0aGlzLmxhKCkudHlwZSAhPT0gSHRtbFRva2VuVHlwZVsnPiddICYmIHRoaXMubGEoKS50eXBlICE9PSBIdG1sVG9rZW5UeXBlWycvPiddKSB7XG5cdFx0XHRpZiAodGhpcy5pc05nQXR0ck5hbWUoKSkge1xuXHRcdFx0XHRjb25zdCBrZXkgPSB0aGlzLm5nQXR0ck5hbWUoKTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHtpc05nOiB0cnVlLCB2YWx1ZTogdGhpcy5hdHRyVmFsdWUoKX07XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlLmlkZW50aXR5KSB7XG5cdFx0XHRcdGNvbnN0IGtleSA9IHRoaXMuYXR0ck5hbWUoKTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHtpc05nOiBmYWxzZSwgdmFsdWU6IHRoaXMuYXR0clZhbHVlKCl9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1ByZXZpb3VzIHRva2VuczogJywgdGhpcy5sYigpLnRleHQpO1xuXHRcdFx0XHR0aGlzLnRocm93RXJyb3IodGhpcy5sYSgpLnRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYXR0cnM7XG5cdH1cblx0aXNOZ0F0dHJOYW1lKCkge1xuXHRcdGNvbnN0IHR5cGUgPSB0aGlzLmxhKCkudHlwZTtcblx0XHRyZXR1cm4gdHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnWyddIHx8IHR5cGUgPT09IEh0bWxUb2tlblR5cGVbJygnXTtcblx0fVxuXHRuZ0F0dHJOYW1lKCkge1xuXHRcdGNvbnN0IGtpbmQgPSB0aGlzLmxhKCkudHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnWyddID8gSHRtbFRva2VuVHlwZVsnXSddIDogSHRtbFRva2VuVHlwZVsnKSddO1xuXHRcdGxldCBuYW1lOiBzdHJpbmc7XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0aWYgKHRoaXMuaXNOZ0F0dHJOYW1lKCkpXG5cdFx0XHRuYW1lID0gdGhpcy5uZ0F0dHJOYW1lKCk7XG5cdFx0ZWxzZVxuXHRcdFx0bmFtZSA9IHRoaXMuYXR0ck5hbWUoKTtcblx0XHRpZiAodGhpcy5sYSgpLnR5cGUgIT09IGtpbmQpXG5cdFx0XHR0aGlzLnRocm93RXJyb3IodGhpcy5sYSgpLnRleHQpO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdHJldHVybiBuYW1lO1xuXHR9XG5cdGF0dHJOYW1lKCkge1xuXHRcdHJldHVybiB0aGlzLmFkdmFuY2UoKS50ZXh0O1xuXHR9XG5cdGF0dHJWYWx1ZSgpOiBBdHRyaWJ1dGVWYWx1ZUFzdCB7XG5cdFx0aWYgKHRoaXMubGEoKSAmJiB0aGlzLmxhKCkudHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnPSddKSB7XG5cdFx0XHQvLyBsZXQge3RleHQsIHN0YXJ0LCBlbmR9ID0gdGhpcy5hZHZhbmNlKDIpO1xuXHRcdFx0Ly8gcmV0dXJuIHt0ZXh0LCBzdGFydCwgZW5kfTtcblx0XHRcdHJldHVybiB0aGlzLmFkdmFuY2UoMik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0fVxufVxuIl19
