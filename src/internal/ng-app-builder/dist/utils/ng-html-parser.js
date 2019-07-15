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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9uZy1odG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlGQUFpRjtBQUNqRiw4RUFBc0Y7QUFFdEYsSUFBWSxhQWdCWDtBQWhCRCxXQUFZLGFBQWE7SUFDdkIsWUFBWTtJQUNaLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsNkNBQUksQ0FBQTtJQUNKLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCw2Q0FBSSxDQUFBO0lBQ0osMkNBQUcsQ0FBQTtJQUNILDZDQUFFLENBQUE7SUFDRiwwREFBUSxDQUFBO0lBQ1Isb0VBQWEsQ0FBQTtJQUNiLGdEQUFHLENBQUE7SUFDSCxvREFBSyxDQUFBO0FBQ1AsQ0FBQyxFQWhCVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQWdCeEI7QUFFd0Isa0NBQVM7QUFDbEMsTUFBYSxhQUFjLFNBQVEsMkJBQXdCO0lBQ3pELENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxFQUFFO1lBQ1gsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osSUFBSSxJQUFJLEdBQVcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDNUIsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUNoQixPQUFPO2FBQ1I7WUFDRCxRQUFRLElBQUksRUFBRTtnQkFDWixLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUcsQ0FBQztnQkFDVCxLQUFLLEdBQUc7b0JBQ04sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2xELFNBQVM7Z0JBQ1gsS0FBSyxHQUFHLENBQUM7Z0JBQ1QsS0FBSyxJQUFJO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDL0MsU0FBUztnQkFDWCxRQUFRO2FBQ1Q7WUFDRCxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDckMsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7YUFDM0I7aUJBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QixNQUFNLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzthQUM1QjtpQkFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDbkQ7aUJBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUU7Z0JBQzNCLEdBQUc7b0JBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNmLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7aUJBQ2xCLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFO2dCQUMzQixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDdkQsNkJBQTZCO2dCQUM3Qiw4QkFBOEI7Z0JBQzlCLDhCQUE4QjtnQkFDOUIsK0JBQStCO2dCQUMvQiw2QkFBNkI7Z0JBQzdCLDhCQUE4QjthQUM3QjtpQkFBTSxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRTtnQkFDOUIsR0FBRztvQkFDRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7aUJBQ2hCLFFBQVEsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO2dCQUM5QixNQUFNLElBQUksdUJBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDbEQsU0FBUzthQUNWO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDaEI7U0FDRjtJQUNILENBQUM7SUFDRCxZQUFZO1FBQ1YsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUM1QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixHQUFHO1lBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2hCLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQzNCLE9BQU8sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUNELGFBQWE7UUFDWCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNoQjtRQUNELE9BQU8sSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUNELFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztRQUNqQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVCLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUNELFlBQVk7UUFDVixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBYTtRQUNyQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxLQUFLLEVBQUU7WUFDMUIsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDNUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2FBQ25CO1lBQ0QsK0JBQStCO1lBQy9CLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDdEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQ2hCO1FBQ0QsTUFBTSxFQUFFLEdBQUcsSUFBSSx1QkFBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELElBQUk7UUFDRixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDcEIsT0FBTSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2pCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFO2dCQUNwQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDaEI7aUJBQU0sSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUNwQjtpQkFBTTtnQkFDTCxNQUFNO2FBQ1A7WUFDRCxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2hCO1FBQ0QsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUNELE9BQU87UUFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLE9BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUk7Z0JBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDaEI7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNELGFBQWE7UUFDWCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUNELFdBQVc7UUFDVCxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUNoQjtJQUNILENBQUM7Q0FDRjtBQTNJRCxzQ0EySUM7QUFZRCxNQUFhLGNBQWUsU0FBUSw0QkFBeUI7SUFHM0QsWUFBWSxLQUFhO1FBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNiLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxpQkFBaUI7UUFDZixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNqRCxJQUFJLEtBQUssRUFBRTtZQUNULE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hELE9BQU8sUUFBUSxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFDRCxJQUFJO1FBQ0YsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLEtBQUssRUFBRTtZQUNsRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDaEI7SUFDSCxDQUFDO0lBQ0QsS0FBSztRQUNILE1BQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQztRQUN6QixPQUFNLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDdkIsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDekMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQzthQUN0QjtpQkFBTSxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNqRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDaEI7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2hCO1NBQ0Y7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFDRCxHQUFHO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNoQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJO1FBQ2pDLE9BQU8sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFDLENBQUM7SUFDMUQsQ0FBQztJQUNELFVBQVU7UUFDUixNQUFNLEtBQUssR0FBK0QsRUFBRSxDQUFDO1FBQzdFLE9BQU8sSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7WUFDbkcsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUU7Z0JBQ3ZCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDOUIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFDLENBQUM7YUFDcEQ7aUJBQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3BELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDNUIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFDLENBQUM7YUFDckQ7aUJBQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2hCO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNqQztTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBQ0QsWUFBWTtRQUNWLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUM7UUFDNUIsT0FBTyxJQUFJLEtBQUssYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksS0FBSyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUNELFVBQVU7UUFDUixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0YsSUFBSSxJQUFZLENBQUM7UUFDakIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3JCLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7O1lBRXpCLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDekIsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUk7WUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQ0QsUUFBUTtRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQztJQUM3QixDQUFDO0lBQ0QsU0FBUztRQUNQLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RELDRDQUE0QztZQUM1Qyw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2YsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUM7WUFDekMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDcEMsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDO2dCQUNyQyxPQUFPLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ2xELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDaEI7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO29CQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2lCQUNoQztnQkFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUMxQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2Ysc0RBQXNEO2dCQUN0RCxPQUFPO29CQUNMLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO29CQUNqQyxLQUFLO29CQUNMLEdBQUc7aUJBQ0osQ0FBQzthQUNIO1lBRUQsT0FBTyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7Z0JBQ3hELENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtnQkFDdkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2FBQ2hDO1lBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUMxQixzREFBc0Q7WUFDdEQsT0FBTztnQkFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztnQkFDakMsS0FBSztnQkFDTCxHQUFHO2FBQ0osQ0FBQztTQUNIO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztDQUNGO0FBM0hELHdDQTJIQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy9uZy1odG1sLXBhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlIG1heC1saW5lLWxlbmd0aCBuby1jb25zb2xlIGpzZG9jLWZvcm1hdCAqL1xuaW1wb3J0IHtUb2tlbiwgQmFzZVBhcnNlciwgQmFzZUxleGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYmFzZS1MTG4tcGFyc2VyJztcblxuZXhwb3J0IGVudW0gSHRtbFRva2VuVHlwZSB7XG4gIC8vIGNvbW1lbnRzLFxuICAnPCcsXG4gICc+JyxcbiAgJy8+JyxcbiAgJygnLFxuICAnKScsXG4gICdbJyxcbiAgJ10nLFxuICAnPC8nLFxuICAnPScsXG4gIHFtLCAvLyBxdW90YXRpb24gbWFya1xuICBpZGVudGl0eSxcbiAgc3RyaW5nTGl0ZXJhbCxcbiAgYW55LCAvLyAuKlxuICBzcGFjZVxufVxuXG5leHBvcnQge0h0bWxUb2tlblR5cGUgYXMgVG9rZW5UeXBlfTtcbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUxleGVyIGV4dGVuZHMgQmFzZUxleGVyPEh0bWxUb2tlblR5cGU+IHtcbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPEh0bWxUb2tlblR5cGU+PiB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHRoaXMuc2tpcCgpO1xuICAgICAgbGV0IGNoYXI6IHN0cmluZyA9IHRoaXMubGEoKTtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcbiAgICAgIGlmIChjaGFyID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc3dpdGNoIChjaGFyKSB7XG4gICAgICAgIGNhc2UgJz4nOlxuICAgICAgICBjYXNlICcoJzpcbiAgICAgICAgY2FzZSAnKSc6XG4gICAgICAgIGNhc2UgJ1snOlxuICAgICAgICBjYXNlICddJzpcbiAgICAgICAgY2FzZSAnPSc6XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgeWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGVbY2hhcl0sIHRoaXMsIHN0YXJ0KTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgY2FzZSAnXCInOlxuICAgICAgICBjYXNlICdcXCcnOlxuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLnFtLCB0aGlzLCBzdGFydCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICB9XG4gICAgICBpZiAoY2hhciA9PT0gJzwnICYmIHRoaXMuaXNJZFN0YXJ0KDIpKSB7XG4gICAgICAgIHlpZWxkIHRoaXMub3BlblRhZ1N0YXJ0KCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNOZXh0KCc8LycpKSB7XG4gICAgICAgIHlpZWxkIHRoaXMuY2xvc2VUYWdTdGFydCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzTmV4dCgnLz4nKSkge1xuICAgICAgICB0aGlzLmFkdmFuY2UoMik7XG4gICAgICAgIHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlWycvPiddLCB0aGlzLCBzdGFydCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNJZFN0YXJ0KCkpIHtcbiAgICAgICAgZG8ge1xuICAgICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICAgIGNoYXIgPSB0aGlzLmxhKCk7XG4gICAgICAgIH0gd2hpbGUgKHRoaXMuaXNJZFN0YXJ0KCkpO1xuICAgICAgICB5aWVsZCBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZS5pZGVudGl0eSwgdGhpcywgc3RhcnQpO1xuICAgICAgLy8gfSBlbHNlIGlmIChjaGFyID09PSAnXCInKSB7XG4gICAgICAvLyBcdHlpZWxkIHRoaXMuc3RyaW5nTGl0KCdcIicpO1xuICAgICAgLy8gfSBlbHNlIGlmIChjaGFyID09PSAnXFwnJykge1xuICAgICAgLy8gXHR5aWVsZCB0aGlzLnN0cmluZ0xpdCgnXFwnJyk7XG4gICAgICAvLyB9IGVsc2UgaWYgKGNoYXIgPT09ICdgJykge1xuICAgICAgLy8gXHR5aWVsZCB0aGlzLnN0cmluZ0xpdCgnYCcpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzV2hpdGVzcGFjZSgpKSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgfSB3aGlsZSAodGhpcy5pc1doaXRlc3BhY2UoKSk7XG4gICAgICAgIHlpZWxkIG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLnNwYWNlLCB0aGlzLCBzdGFydCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeWllbGQgbmV3IFRva2VuKEh0bWxUb2tlblR5cGUuYW55LCB0aGlzLCBzdGFydCk7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBvcGVuVGFnU3RhcnQoKSB7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIGRvIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH0gd2hpbGUgKHRoaXMuaXNJZFN0YXJ0KCkpO1xuICAgIHJldHVybiBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVsnPCddLCB0aGlzLCBzdGFydCk7XG4gIH1cbiAgY2xvc2VUYWdTdGFydCgpIHtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgdGhpcy5hZHZhbmNlKDIpO1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT09ICc+Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgVG9rZW4oSHRtbFRva2VuVHlwZVsnPC8nXSwgdGhpcywgc3RhcnQpO1xuICB9XG4gIGlzSWRTdGFydChsYUlkeCA9IDEpIHtcbiAgICBjb25zdCBjaGFyID0gdGhpcy5sYShsYUlkeCk7XG4gICAgcmV0dXJuIC9bXjw+KClcXFtcXF1cIic9YC9dLy50ZXN0KGNoYXIpICYmIC9cXFMvLnRlc3QoY2hhcik7XG4gIH1cbiAgaXNXaGl0ZXNwYWNlKCkge1xuICAgIGNvbnN0IGNociA9IHRoaXMubGEoKTtcbiAgICByZXR1cm4gL1xccy8udGVzdChjaHIpO1xuICB9XG5cbiAgc3RyaW5nTGl0KHF1b3RlOiBzdHJpbmcpIHtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG4gICAgY29uc3QgW2xpbmUsIGNvbF0gPSB0aGlzLmdldExpbmVDb2x1bW4oc3RhcnQpO1xuICAgIHdoaWxlICh0aGlzLmxhKCkgIT09IHF1b3RlKSB7XG4gICAgICBpZiAodGhpcy5sYSgpID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VuZGxlc3Mgc3RyaW5nIGxpdGVyYWwgYmVnaW4gd2l0aCBsaW5lICVzLCBjb2wgJXMnLCBsaW5lLCBjb2wpO1xuICAgICAgICB0aGlzLnRocm93RXJyb3IoKTtcbiAgICAgIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKCc6JywgdGhpcy5sYSgpKTtcbiAgICAgIGlmICh0aGlzLmxhKCkgPT09ICdcXFxcJykge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cbiAgICBjb25zdCB0ayA9IG5ldyBUb2tlbihIdG1sVG9rZW5UeXBlLnN0cmluZ0xpdGVyYWwsIHRoaXMsIHN0YXJ0KTtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gdGs7XG4gIH1cblxuICBza2lwKCkge1xuICAgIGxldCBjaHIgPSB0aGlzLmxhKCk7XG4gICAgd2hpbGUoY2hyICE9IG51bGwpIHtcbiAgICAgIGlmICh0aGlzLmlzQ29tbWVudCgpKSB7XG4gICAgICAgIHRoaXMuY29tbWVudCgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzU3dpZ0NvbW1lbnQoKSkge1xuICAgICAgICB0aGlzLnN3aWdDb21tZW50KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNociA9IHRoaXMubGEoKTtcbiAgICAgfVxuICAgICByZXR1cm4gdGhpcy5sYSgpO1xuICB9XG5cbiAgaXNDb21tZW50KCkge1xuICAgIHJldHVybiB0aGlzLmlzTmV4dCgnPCEtLScpO1xuICB9XG4gIGNvbW1lbnQoKSB7XG4gICAgdGhpcy5hZHZhbmNlKDQpO1xuICAgIHdoaWxlKCF0aGlzLmlzTmV4dCgnLS0+JykpIHtcbiAgICAgIGlmICh0aGlzLmxhKCkgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21tZW50IGlzIG5vdCBjbG9zZWQsICcgKyB0aGlzLmdldEN1cnJlbnRQb3NJbmZvKCkpO1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICAgIHRoaXMuYWR2YW5jZSgzKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpc1N3aWdDb21tZW50KCkge1xuICAgIHJldHVybiB0aGlzLmlzTmV4dCgneyMnKTtcbiAgfVxuICBzd2lnQ29tbWVudCgpIHtcbiAgICB0aGlzLmFkdmFuY2UoMik7XG4gICAgd2hpbGUgKCF0aGlzLmlzTmV4dCgnI30nKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFnQXN0IHtcbiAgbmFtZT86IHN0cmluZztcbiAgYXR0cnM/OiB7W2tleTogc3RyaW5nXToge2lzTmc6IGJvb2xlYW4sIHZhbHVlOiBBdHRyaWJ1dGVWYWx1ZUFzdH19O1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbiAgW2tleTogc3RyaW5nXTogYW55O1xufVxuZXhwb3J0IGludGVyZmFjZSBBdHRyaWJ1dGVWYWx1ZUFzdCB7XG4gIHRleHQ6IHN0cmluZzsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXI7XG59XG5leHBvcnQgY2xhc3MgVGVtcGxhdGVQYXJzZXIgZXh0ZW5kcyBCYXNlUGFyc2VyPEh0bWxUb2tlblR5cGU+IHtcbiAgbGV4ZXI6IFRlbXBsYXRlTGV4ZXI7XG4gIHRleHQ6IHN0cmluZztcbiAgY29uc3RydWN0b3IoaW5wdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IGxleGVyID0gbmV3IFRlbXBsYXRlTGV4ZXIoaW5wdXQpO1xuICAgIHN1cGVyKGxleGVyKTtcbiAgICB0aGlzLmxleGVyID0gbGV4ZXI7XG4gICAgdGhpcy50ZXh0ID0gaW5wdXQ7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpID8gdGhpcy5sYSgpLnN0YXJ0IDogbnVsbDtcbiAgICBpZiAoc3RhcnQpIHtcbiAgICAgIGNvbnN0IGxpbmVDb2wgPSB0aGlzLmxleGVyLmdldExpbmVDb2x1bW4oc3RhcnQpO1xuICAgICAgcmV0dXJuIGBMaW5lICR7bGluZUNvbFswXSArIDF9IGNvbHVtbiAke2xpbmVDb2xbMV0gKyAxfWA7XG4gICAgfVxuICB9XG4gIHNraXAoKSB7XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsICYmIHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlLnNwYWNlKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG4gIH1cbiAgcGFyc2UoKTogVGFnQXN0W10ge1xuICAgIGNvbnN0IGFzdDogVGFnQXN0W10gPSBbXTtcbiAgICB3aGlsZSh0aGlzLmxhKCkgIT0gbnVsbCkge1xuICAgICAgaWYgKHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc8J10pIHtcbiAgICAgICAgYXN0LnB1c2godGhpcy50YWcoKSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc8LyddKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhc3Q7XG4gIH1cbiAgdGFnKCk6IFRhZ0FzdCB7XG4gICAgY29uc3QgZmlyc3QgPSB0aGlzLmFkdmFuY2UoKTtcbiAgICBjb25zdCBuYW1lID0gZmlyc3QudGV4dC5zdWJzdHJpbmcoMSk7XG4gICAgY29uc3QgYXR0cnMgPSB0aGlzLmF0dHJpYnV0ZXMoKTtcbiAgICBjb25zdCBsYXN0ID0gdGhpcy5hZHZhbmNlKCk7IC8vID5cbiAgICByZXR1cm4ge25hbWUsIGF0dHJzLCBzdGFydDogZmlyc3Quc3RhcnQsIGVuZDogbGFzdC5lbmR9O1xuICB9XG4gIGF0dHJpYnV0ZXMoKToge1trZXk6IHN0cmluZ106IHtpc05nOiBib29sZWFuLCB2YWx1ZTogQXR0cmlidXRlVmFsdWVBc3R9fSB7XG4gICAgY29uc3QgYXR0cnM6IHtba2V5OiBzdHJpbmddOiB7aXNOZzogYm9vbGVhbiwgdmFsdWU6IEF0dHJpYnV0ZVZhbHVlQXN0fX0gPSB7fTtcbiAgICB3aGlsZSAodGhpcy5sYSgpICYmICF0aGlzLmlzTmV4dFR5cGVzKEh0bWxUb2tlblR5cGVbJz4nXSkgJiYgIXRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZVsnLz4nXSkpIHtcbiAgICAgIGlmICh0aGlzLmlzTmdBdHRyTmFtZSgpKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IHRoaXMubmdBdHRyTmFtZSgpO1xuICAgICAgICBhdHRyc1trZXldID0ge2lzTmc6IHRydWUsIHZhbHVlOiB0aGlzLmF0dHJWYWx1ZSgpfTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5sYSgpLnR5cGUgPT09IEh0bWxUb2tlblR5cGUuaWRlbnRpdHkpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gdGhpcy5hdHRyTmFtZSgpO1xuICAgICAgICBhdHRyc1trZXldID0ge2lzTmc6IGZhbHNlLCB2YWx1ZTogdGhpcy5hdHRyVmFsdWUoKX07XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5zcGFjZSkpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygnUHJldmlvdXMgdG9rZW5zOiAnLCB0aGlzLmxiKCkudGV4dCk7XG4gICAgICAgIHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkudGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhdHRycztcbiAgfVxuICBpc05nQXR0ck5hbWUoKSB7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMubGEoKS50eXBlO1xuICAgIHJldHVybiB0eXBlID09PSBIdG1sVG9rZW5UeXBlWydbJ10gfHwgdHlwZSA9PT0gSHRtbFRva2VuVHlwZVsnKCddO1xuICB9XG4gIG5nQXR0ck5hbWUoKSB7XG4gICAgY29uc3Qga2luZCA9IHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWydbJ10gPyBIdG1sVG9rZW5UeXBlWyddJ10gOiBIdG1sVG9rZW5UeXBlWycpJ107XG4gICAgbGV0IG5hbWU6IHN0cmluZztcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICBpZiAodGhpcy5pc05nQXR0ck5hbWUoKSlcbiAgICAgIG5hbWUgPSB0aGlzLm5nQXR0ck5hbWUoKTtcbiAgICBlbHNlXG4gICAgICBuYW1lID0gdGhpcy5hdHRyTmFtZSgpO1xuICAgIGlmICh0aGlzLmxhKCkudHlwZSAhPT0ga2luZClcbiAgICAgIHRoaXMudGhyb3dFcnJvcih0aGlzLmxhKCkudGV4dCk7XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cbiAgYXR0ck5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWR2YW5jZSgpLnRleHQ7XG4gIH1cbiAgYXR0clZhbHVlKCk6IEF0dHJpYnV0ZVZhbHVlQXN0IHtcbiAgICBpZiAodGhpcy5sYSgpICYmIHRoaXMubGEoKS50eXBlID09PSBIdG1sVG9rZW5UeXBlWyc9J10pIHtcbiAgICAgIC8vIGxldCB7dGV4dCwgc3RhcnQsIGVuZH0gPSB0aGlzLmFkdmFuY2UoMik7XG4gICAgICAvLyByZXR1cm4ge3RleHQsIHN0YXJ0LCBlbmR9O1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICBsZXQgc3RhcnQgPSB0aGlzLmxhKCkgJiYgdGhpcy5sYSgpLnN0YXJ0O1xuICAgICAgaWYgKHRoaXMuaXNOZXh0VHlwZXMoSHRtbFRva2VuVHlwZS5xbSkpIHtcbiAgICAgICAgY29uc3QgZW5kVGV4dCA9IHRoaXMuYWR2YW5jZSgpLnRleHQ7XG4gICAgICAgIHN0YXJ0ID0gdGhpcy5sYSgpICYmIHRoaXMubGEoKS5zdGFydDtcbiAgICAgICAgd2hpbGUgKHRoaXMubGEoKSAmJiAhdGhpcy5pc05leHRUb2tlblRleHQoZW5kVGV4dCkpIHtcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sYSgpID09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLnRocm93RXJyb3IoJ2VuZCBvZiBmaWxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW5kID0gdGhpcy5sYigpLmVuZDtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCd2YWx1ZTonLCB0aGlzLnRleHQuc2xpY2Uoc3RhcnQsIGVuZCkpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHRleHQ6IHRoaXMudGV4dC5zbGljZShzdGFydCwgZW5kKSxcbiAgICAgICAgICBzdGFydCxcbiAgICAgICAgICBlbmRcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKHRoaXMubGEoKSAmJiAhdGhpcy5pc05leHRUeXBlcyhIdG1sVG9rZW5UeXBlLnNwYWNlKSAmJlxuICAgICAgICAhdGhpcy5pc05leHRUeXBlcyhIdG1sVG9rZW5UeXBlWyc+J10pKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubGEoKSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMudGhyb3dFcnJvcignZW5kIG9mIGZpbGUnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGVuZCA9IHRoaXMubGIoKS5lbmQ7XG4gICAgICAvLyBjb25zb2xlLmxvZygndmFsdWU6JywgdGhpcy50ZXh0LnNsaWNlKHN0YXJ0LCBlbmQpKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRleHQ6IHRoaXMudGV4dC5zbGljZShzdGFydCwgZW5kKSxcbiAgICAgICAgc3RhcnQsXG4gICAgICAgIGVuZFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG4iXX0=
