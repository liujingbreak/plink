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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9uZy1odG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlGQUFpRjtBQUNqRiw4RUFBc0Y7QUFFdEYsSUFBWSxhQWdCWDtBQWhCRCxXQUFZLGFBQWE7SUFDeEIsWUFBWTtJQUNaLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsNkNBQUksQ0FBQTtJQUNKLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCw2Q0FBSSxDQUFBO0lBQ0osMkNBQUcsQ0FBQTtJQUNILDZDQUFFLENBQUE7SUFDRiwwREFBUSxDQUFBO0lBQ1Isb0VBQWEsQ0FBQTtJQUNiLGdEQUFHLENBQUE7SUFDSCxvREFBSyxDQUFBO0FBQ04sQ0FBQyxFQWhCVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQWdCeEI7QUFFd0Isa0NBQVM7QUFDbEMsTUFBYSxhQUFjLFNBQVEsMkJBQXdCO0lBQzFELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2pCLE9BQU8sSUFBSSxFQUFFO1lBQ1osSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUNqQixPQUFPO2FBQ1A7WUFDRCxRQUFRLElBQUksRUFBRTtnQkFDYixLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUc7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1B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QjtZQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDMUIsc0RBQXNEO1lBQ3RELE9BQU87Z0JBQ04sSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQU0sRUFBRSxHQUFHLENBQUM7Z0JBQ2xDLEtBQUssRUFBRSxLQUFNO2dCQUNiLEdBQUc7YUFDSCxDQUFDO1NBQ0Y7YUFBTTtZQUNOLE9BQU87U0FDUDtJQUNGLENBQUM7Q0FDRDtBQWhJRCx3Q0FnSUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvbmctaHRtbC1wYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZSBtYXgtbGluZS1sZW5ndGggbm8tY29uc29sZSBqc2RvYy1mb3JtYXQgKi9cbmltcG9ydCB7VG9rZW4sIEJhc2VQYXJzZXIsIEJhc2VMZXhlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2Jhc2UtTExuLXBhcnNlcic7XG5cbmV4cG9ydCBlbnVtIEh0bWxUb2tlblR5cGUge1xuXHQvLyBjb21tZW50cyxcblx0JzwnLFxuXHQnPicsXG5cdCcvPicsXG5cdCcoJyxcblx0JyknLFxuXHQnWycsXG5cdCddJyxcblx0JzwvJyxcblx0Jz0nLFxuXHRxbSwgLy8gcXVvdGF0aW9uIG1hcmtcblx0aWRlbnRpdHksXG5cdHN0cmluZ0xpdGVyYWwsXG5cdGFueSwgLy8gLipcblx0c3BhY2Vcbn1cblxuZXhwb3J0IHtIdG1sVG9rZW5UeXBlIGFzIFRva2VuVHlwZX07XG5leHBvcnQgY2xhc3MgVGVtcGxhdGVMZXhlciBleHRlbmRzIEJhc2VMZXhlcjxIdG1sVG9rZW5UeXBlPiB7XG5cdCpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxIdG1sVG9rZW5UeXBlPj4ge1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHR0aGlzLnNraXAoKTtcblx0XHRcdGxldCBjaGFyID0gdGhpcy5sYSgpO1xuXHRcdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdFx0aWYgKGNoYXIgPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRzd2l0Y2ggKGNoYXIpIHtcblx0XHRcdFx0Y2FzZSAnPic6XG5cdFx0XHRcdGNhc2UgJygnOlxuXHRcdFx0XHRjYXNlICcpJzpcblx0XHRcdFx0Y2FzZSAnWyc6XG5cdFx0XHRcdGNhc2UgJ10nOlxuXHRcdFx0XHRjYXNlICc9Jzpcblx0XHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVtjaGFyXSwgdGhpcywgc3RhcnQpO1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRjYXNlICdcIic6XG5cdFx0XHRcdGNhc2UgJ1xcJyc6XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGUucW0sIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdH1cblx0XHRcdGlmIChjaGFyID09PSAnPCcgJiYgdGhpcy5pc0lkU3RhcnQoMikpIHtcblx0XHRcdFx0eWllbGQgdGhpcy5vcGVuVGFnU3RhcnQoKTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc05leHQoJzwvJykpIHtcblx0XHRcdFx0eWllbGQgdGhpcy5jbG9zZVRhZ1N0YXJ0KCk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNOZXh0KCcvPicpKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgyKTtcblx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGVbJy8+J10sIHRoaXMsIHN0YXJ0KTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5pc0lkU3RhcnQoKSkge1xuXHRcdFx0XHRkbyB7XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdFx0Y2hhciA9IHRoaXMubGEoKTtcblx0XHRcdFx0fSB3aGlsZSAodGhpcy5pc0lkU3RhcnQoKSk7XG5cdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLmlkZW50aXR5LCB0aGlzLCBzdGFydCk7XG5cdFx0XHQvLyB9IGVsc2UgaWYgKGNoYXIgPT09ICdcIicpIHtcblx0XHRcdC8vIFx0eWllbGQgdGhpcy5zdHJpbmdMaXQoJ1wiJyk7XG5cdFx0XHQvLyB9IGVsc2UgaWYgKGNoYXIgPT09ICdcXCcnKSB7XG5cdFx0XHQvLyBcdHlpZWxkIHRoaXMuc3RyaW5nTGl0KCdcXCcnKTtcblx0XHRcdC8vIH0gZWxzZSBpZiAoY2hhciA9PT0gJ2AnKSB7XG5cdFx0XHQvLyBcdHlpZWxkIHRoaXMuc3RyaW5nTGl0KCdgJyk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNXaGl0ZXNwYWNlKCkpIHtcblx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHR9IHdoaWxlICh0aGlzLmlzV2hpdGVzcGFjZSgpKTtcblx0XHRcdFx0eWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGUuc3BhY2UsIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZS5hbnksIHRoaXMsIHN0YXJ0KTtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdG9wZW5UYWdTdGFydCgpIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0ZG8ge1xuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fSB3aGlsZSAodGhpcy5pc0lkU3RhcnQoKSk7XG5cdFx0cmV0dXJuIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlWyc8J10sIHRoaXMsIHN0YXJ0KTtcblx0fVxuXHRjbG9zZVRhZ1N0YXJ0KCkge1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHR0aGlzLmFkdmFuY2UoMik7XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPT0gJz4nKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdFx0cmV0dXJuIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlWyc8LyddLCB0aGlzLCBzdGFydCk7XG5cdH1cblx0aXNJZFN0YXJ0KGxhSWR4ID0gMSkge1xuXHRcdGNvbnN0IGNoYXIgPSB0aGlzLmxhKGxhSWR4KTtcblx0XHRpZiAoIWNoYXIpIHtcblx0XHRcdHRoaXMudGhyb3dFcnJvcignRU9GJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHJldHVybiAvW148PigpXFxbXFxdXCInPWAvXS8udGVzdChjaGFyKSAmJiAvXFxTLy50ZXN0KGNoYXIpO1xuXHR9XG5cdGlzV2hpdGVzcGFjZSgpIHtcblx0XHRjb25zdCBjaHIgPSB0aGlzLmxhKCk7XG5cdFx0cmV0dXJuIGNociAmJiAvXFxzLy50ZXN0KGNocik7XG5cdH1cblxuXHRzdHJpbmdMaXQocXVvdGU6IHN0cmluZykge1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRjb25zdCBbbGluZSwgY29sXSA9IHRoaXMuZ2V0TGluZUNvbHVtbihzdGFydCk7XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPT0gcXVvdGUpIHtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZW5kbGVzcyBzdHJpbmcgbGl0ZXJhbCBiZWdpbiB3aXRoIGxpbmUgJXMsIGNvbCAlcycsIGxpbmUsIGNvbCk7XG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcigpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gY29uc29sZS5sb2coJzonLCB0aGlzLmxhKCkpO1xuXHRcdFx0aWYgKHRoaXMubGEoKSA9PT0gJ1xcXFwnKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0fVxuXHRcdGNvbnN0IHRrID0gbmV3IFRva2VuKEh0bWxUb2tlblR5cGUuc3RyaW5nTGl0ZXJhbCwgdGhpcywgc3RhcnQpO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdHJldHVybiB0aztcblx0fVxuXG5cdHNraXAoKSB7XG5cdFx0bGV0IGNociA9IHRoaXMubGEoKTtcblx0XHR3aGlsZShjaHIgIT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMuaXNDb21tZW50KCkpIHtcblx0XHRcdFx0dGhpcy5jb21tZW50KCk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNTd2lnQ29tbWVudCgpKSB7XG5cdFx0XHRcdHRoaXMuc3dpZ0NvbW1lbnQoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0Y2hyID0gdGhpcy5sYSgpO1xuXHRcdCB9XG5cdFx0IHJldHVybiB0aGlzLmxhKCk7XG5cdH1cblxuXHRpc0NvbW1lbnQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNOZXh0KCc8IS0tJyk7XG5cdH1cblx0Y29tbWVudCgpIHtcblx0XHR0aGlzLmFkdmFuY2UoNCk7XG5cdFx0d2hpbGUoIXRoaXMuaXNOZXh0KCctLT4nKSkge1xuXHRcdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NvbW1lbnQgaXMgbm90IGNsb3NlZCwgJyArIHRoaXMuZ2V0Q3VycmVudFBvc0luZm8oKSk7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdFx0dGhpcy5hZHZhbmNlKDMpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdGlzU3dpZ0NvbW1lbnQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNOZXh0KCd7IycpO1xuXHR9XG5cdHN3aWdDb21tZW50KCkge1xuXHRcdHRoaXMuYWR2YW5jZSgyKTtcblx0XHR3aGlsZSAoIXRoaXMuaXNOZXh0KCcjfScpKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYWdBc3Qge1xuXHRuYW1lOiBzdHJpbmc7XG5cdGF0dHJzPzoge1trZXk6IHN0cmluZ106IHtpc05nOiBib29sZWFuLCB2YWx1ZT86IEF0dHJpYnV0ZVZhbHVlQXN0fX07XG5cdHN0YXJ0OiBudW1iZXI7XG5cdGVuZDogbnVtYmVyO1xuXHRba2V5OiBzdHJpbmddOiBhbnk7XG59XG5leHBvcnQgaW50ZXJmYWNlIEF0dHJpYnV0ZVZhbHVlQXN0IHtcblx0dGV4dDogc3RyaW5nOyBzdGFydDogbnVtYmVyOyBlbmQ6IG51bWJlcjtcbn1cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZVBhcnNlciBleHRlbmRzIEJhc2VQYXJzZXI8SHRtbFRva2VuVHlwZT4ge1xuXHRsZXhlcjogVGVtcGxhdGVMZXhlcjtcblx0dGV4dDogc3RyaW5nO1xuXHRjb25zdHJ1Y3RvcihpbnB1dDogc3RyaW5nKSB7XG5cdFx0Y29uc3QgbGV4ZXIgPSBuZXcgVGVtcGxhdGVMZXhlcihpbnB1dCk7XG5cdFx0c3VwZXIobGV4ZXIpO1xuXHRcdHRoaXMubGV4ZXIgPSBsZXhlcjtcblx0XHR0aGlzLnRleHQgPSBpbnB1dDtcblx0fVxuXG5cdGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG5cdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLmxhKCkgPyB0aGlzLmxhKCkhLnN0YXJ0IDogbnVsbDtcblx0XHRpZiAoc3RhcnQpIHtcblx0XHRcdGNvbnN0IGxpbmVDb2wgPSB0aGlzLmxleGVyLmdldExpbmVDb2x1bW4oc3RhcnQpO1xuXHRcdFx0cmV0dXJuIGBMaW5lICR7bGluZUNvbFswXSArIDF9IGNvbHVtbiAke2xpbmVDb2xbMV0gKyAxfWA7XG5cdFx0fVxuXHRcdHJldHVybiAnPGVuZCBvZiBmaWxlPic7XG5cdH1cblx0c2tpcCgpIHtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwgJiYgdGhpcy5sYSgpIS50eXBlID09PSBIdG1sVG9rZW5UeXBlLnNwYWNlKSB7XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHR9XG5cdH1cblx0cGFyc2UoKTogVGFnQXN0W10ge1xuXHRcdGNvbnN0IGFzdDogVGFnQXN0W10gPSBbXTtcblx0XHR3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCkge1xuXHRcdFx0aWYgKHRoaXMubGEoKSEudHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnPCddKSB7XG5cdFx0XHRcdGFzdC5wdXNoKHRoaXMudGFnKCkpO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmxhKCkhLnR5cGUgPT09IEh0bWxUb2tlblR5cGVbJzwvJ10pIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGFzdDtcblx0fVxuXHR0YWcoKTogVGFnQXN0IHtcblx0XHRjb25zdCBmaXJzdCA9IHRoaXMuYWR2YW5jZSgpO1xuXHRcdGNvbnN0IG5hbWUgPSBmaXJzdC50ZXh0LnN1YnN0cmluZygxKTtcblx0XHRjb25zdCBhdHRycyA9IHRoaXMuYXR0cmlidXRlcygpO1xuXHRcdGNvbnN0IGxhc3QgPSB0aGlzLmFkdmFuY2UoKTsgLy8gPlxuXHRcdHJldHVybiB7bmFtZSwgYXR0cnMsIHN0YXJ0OiBmaXJzdC5zdGFydCwgZW5kOiBsYXN0LmVuZH07XG5cdH1cblx0YXR0cmlidXRlcygpOiB7W2tleTogc3RyaW5nXToge2lzTmc6IGJvb2xlYW4sIHZhbHVlOiBBdHRyaWJ1dGVWYWx1ZUFzdCB8IHVuZGVmaW5lZH19IHtcblx0XHRjb25zdCBhdHRyczoge1trZXk6IHN0cmluZ106IHtpc05nOiBib29sZWFuLCB2YWx1ZTogQXR0cmlidXRlVmFsdWVBc3QgfCB1bmRlZmluZWR9fSA9IHt9O1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgJiYgIXRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZVsnPiddKSAmJiAhdGhpcy5pc05leHRUeXBlcyhIdG1sVG9rZW5UeXBlWycvPiddKSkge1xuXHRcdFx0aWYgKHRoaXMuaXNOZ0F0dHJOYW1lKCkpIHtcblx0XHRcdFx0Y29uc3Qga2V5ID0gdGhpcy5uZ0F0dHJOYW1lKCk7XG5cdFx0XHRcdGF0dHJzW2tleV0gPSB7aXNOZzogdHJ1ZSwgdmFsdWU6IHRoaXMuYXR0clZhbHVlKCl9O1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmxhKCkhLnR5cGUgPT09IEh0bWxUb2tlblR5cGUuaWRlbnRpdHkpIHtcblx0XHRcdFx0Y29uc3Qga2V5ID0gdGhpcy5hdHRyTmFtZSgpO1xuXHRcdFx0XHRhdHRyc1trZXldID0ge2lzTmc6IGZhbHNlLCB2YWx1ZTogdGhpcy5hdHRyVmFsdWUoKX07XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5zcGFjZSkpIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnUHJldmlvdXMgdG9rZW5zOiAnLCB0aGlzLmxiKCkudGV4dCk7XG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkhLnRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gYXR0cnM7XG5cdH1cblx0aXNOZ0F0dHJOYW1lKCkge1xuXHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbClcblx0XHRcdHRoaXMudGhyb3dFcnJvcignRW5kIG9mIGZpbGUnKTtcblx0XHRjb25zdCB0eXBlID0gdGhpcy5sYSgpIS50eXBlO1xuXHRcdHJldHVybiB0eXBlID09PSBIdG1sVG9rZW5UeXBlWydbJ10gfHwgdHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnKCddO1xuXHR9XG5cdG5nQXR0ck5hbWUoKSB7XG5cdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKVxuXHRcdFx0dGhpcy50aHJvd0Vycm9yKCdFbmQgb2YgZmlsZScpO1xuXHRcdGNvbnN0IGtpbmQgPSB0aGlzLmxhKCkhLnR5cGUgPT09IEh0bWxUb2tlblR5cGVbJ1snXSA/IEh0bWxUb2tlblR5cGVbJ10nXSA6IEh0bWxUb2tlblR5cGVbJyknXTtcblx0XHRsZXQgbmFtZTogc3RyaW5nO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdGlmICh0aGlzLmlzTmdBdHRyTmFtZSgpKVxuXHRcdFx0bmFtZSA9IHRoaXMubmdBdHRyTmFtZSgpO1xuXHRcdGVsc2Vcblx0XHRcdG5hbWUgPSB0aGlzLmF0dHJOYW1lKCk7XG5cdFx0aWYgKHRoaXMubGEoKSEudHlwZSAhPT0ga2luZClcblx0XHRcdHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkhLnRleHQpO1xuXHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdHJldHVybiBuYW1lO1xuXHR9XG5cdGF0dHJOYW1lKCkge1xuXHRcdHJldHVybiB0aGlzLmFkdmFuY2UoKS50ZXh0O1xuXHR9XG5cdGF0dHJWYWx1ZSgpOiBBdHRyaWJ1dGVWYWx1ZUFzdCB8IHVuZGVmaW5lZCB7XG5cdFx0aWYgKHRoaXMubGEoKSAmJiB0aGlzLmxhKCkhLnR5cGUgPT09IEh0bWxUb2tlblR5cGVbJz0nXSkge1xuXHRcdFx0Ly8gbGV0IHt0ZXh0LCBzdGFydCwgZW5kfSA9IHRoaXMuYWR2YW5jZSgyKTtcblx0XHRcdC8vIHJldHVybiB7dGV4dCwgc3RhcnQsIGVuZH07XG5cdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdGxldCBzdGFydCA9IHRoaXMubGEoKSAmJiB0aGlzLmxhKCkhLnN0YXJ0O1xuXHRcdFx0aWYgKHRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5xbSkpIHtcblx0XHRcdFx0Y29uc3QgZW5kVGV4dCA9IHRoaXMuYWR2YW5jZSgpLnRleHQ7XG5cdFx0XHRcdHN0YXJ0ID0gdGhpcy5sYSgpICYmIHRoaXMubGEoKSEuc3RhcnQ7XG5cdFx0XHRcdHdoaWxlICh0aGlzLmxhKCkgJiYgIXRoaXMuaXNOZXh0VG9rZW5UZXh0KGVuZFRleHQpKSB7XG5cdFx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHRoaXMubGEoKSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0dGhpcy50aHJvd0Vycm9yKCdlbmQgb2YgZmlsZScpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IGVuZCA9IHRoaXMubGIoKS5lbmQ7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygndmFsdWU6JywgdGhpcy50ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHR0ZXh0OiB0aGlzLnRleHQuc2xpY2Uoc3RhcnQhLCBlbmQpLFxuXHRcdFx0XHRcdHN0YXJ0OiBzdGFydCEsXG5cdFx0XHRcdFx0ZW5kXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdHdoaWxlICh0aGlzLmxhKCkgJiYgIXRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5zcGFjZSkgJiZcblx0XHRcdFx0IXRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZVsnPiddKSkge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLmxhKCkgPT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLnRocm93RXJyb3IoJ2VuZCBvZiBmaWxlJyk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBlbmQgPSB0aGlzLmxiKCkuZW5kO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coJ3ZhbHVlOicsIHRoaXMudGV4dC5zbGljZShzdGFydCwgZW5kKSk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR0ZXh0OiB0aGlzLnRleHQuc2xpY2Uoc3RhcnQhLCBlbmQpLFxuXHRcdFx0XHRzdGFydDogc3RhcnQhLFxuXHRcdFx0XHRlbmRcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH1cbn1cbiJdfQ==
