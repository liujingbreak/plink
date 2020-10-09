"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagKind = exports.TokenType = exports.lexer = exports.HtmlTokenType = void 0;
/* tslint:disable max-classes-per-file max-line-length no-console jsdoc-format */
/**
 * TODO: Support parsing file with <script></script> tag contains special JS character like "<" and ">"
 */
// import {Token, BaseParser, BaseLexer} from '@wfh/plink/wfh/dist/base-LLn-parser';
const LLn_parser_1 = require("@wfh/plink/wfh/dist/LLn-parser");
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
    HtmlTokenType[HtmlTokenType["comment"] = 14] = "comment";
})(HtmlTokenType = exports.HtmlTokenType || (exports.HtmlTokenType = {}));
exports.TokenType = HtmlTokenType;
exports.lexer = (la, emitter) => {
    let isLastCharUnknown = false;
    function emitUnknow() {
        if (isLastCharUnknown) {
            emitter.emit();
            isLastCharUnknown = false;
        }
    }
    const m = new LexerMemebers(la, emitter, emitUnknow);
    while (true) {
        let char = la.la();
        if (char == null) {
            emitUnknow();
            emitter.end();
            return;
        }
        if (m.isComment()) {
            la.startChunk(HtmlTokenType.comment);
            m.consumeComment();
            emitter.emit();
            continue;
        }
        else if (m.isSwigComment()) {
            la.startChunk(HtmlTokenType.comment);
            m.swigComment();
            emitter.emit();
            continue;
        }
        switch (char) {
            case '>':
            case '(':
            case ')':
            case '[':
            case ']':
            case '=':
                emitUnknow();
                la.startChunk(HtmlTokenType[char]);
                la.advance();
                emitter.emit();
                continue;
            case '"':
            case '\'':
                emitUnknow();
                la.startChunk(HtmlTokenType.qm);
                la.advance();
                emitter.emit();
                continue;
            default:
        }
        if (char === '<' && m.isIdStart(2)) {
            m.openTagStart();
        }
        else if (la.isNext('<', '/')) {
            m.closeTagStart();
        }
        else if (la.isNext('/', '>')) {
            emitUnknow();
            la.startChunk(HtmlTokenType['/>']);
            la.advance(2);
            emitter.emit();
        }
        else if (m.isIdStart()) {
            emitUnknow();
            la.startChunk(HtmlTokenType.identity);
            do {
                la.advance();
                char = la.la();
            } while (m.isIdStart());
            emitter.emit();
        }
        else if (m.isWhitespace()) {
            emitUnknow();
            la.startChunk(HtmlTokenType.space);
            do {
                la.advance();
            } while (m.isWhitespace());
            emitter.emit();
            // yield new Token(HtmlTokenType.space, this, start);
            continue;
        }
        else {
            if (!isLastCharUnknown) {
                la.startChunk(HtmlTokenType.any);
                isLastCharUnknown = true;
            }
            la.advance();
        }
    }
};
class LexerMemebers {
    constructor(la, emitter, emitUnknow) {
        this.la = la;
        this.emitter = emitter;
        this.emitUnknow = emitUnknow;
    }
    openTagStart() {
        this.emitUnknow();
        this.la.startChunk(HtmlTokenType['<']);
        this.la.advance();
        do {
            this.la.advance();
        } while (this.isIdStart());
        this.emitter.emit();
    }
    closeTagStart() {
        this.emitUnknow();
        this.la.startChunk(HtmlTokenType['</']);
        this.la.advance(2);
        while (this.la.la() !== '>') {
            this.la.advance();
        }
        this.emitter.emit();
    }
    isIdStart(laIdx = 1) {
        const char = this.la.la(laIdx);
        if (!char) {
            this.la.throwError('EOF');
            return;
        }
        return /[^<>()\[\]"'=`/]/.test(char) && /\S/.test(char);
    }
    isWhitespace() {
        const chr = this.la.la();
        return chr && /\s/.test(chr);
    }
    stringLit(quote) {
        this.emitUnknow();
        this.la.advance();
        this.la.startChunk(HtmlTokenType.stringLiteral);
        const positionInfo = this.la.getCurrentPosInfo();
        while (this.la.la() !== quote) {
            if (this.la.la() == null) {
                console.log('endless string literal begin at', positionInfo);
                this.la.throwError();
            }
            // console.log(':', this.la());
            if (this.la.la() === '\\') {
                this.la.advance();
            }
            this.la.advance();
        }
        this.emitter.emit();
        // const tk = new Token(HtmlTokenType.stringLiteral, this, start);
        this.la.advance();
        // return tk;
    }
    isComment() {
        return this.la.isNext('<', '!', '-', '-');
    }
    consumeComment() {
        this.la.advance(4);
        while (!this.la.isNext('-', '-', '>')) {
            if (this.la.la() == null)
                throw new Error('Comment is not closed, ' + this.la.getCurrentPosInfo());
            this.la.advance();
        }
        this.la.advance(3);
        return true;
    }
    isSwigComment() {
        return this.la.isNext('{', '#');
    }
    swigComment() {
        this.la.advance(2);
        while (!this.la.isNext('#', '}')) {
            this.la.advance();
        }
        this.la.advance(2);
    }
}
var TagKind;
(function (TagKind) {
    TagKind[TagKind["open"] = 0] = "open";
    TagKind[TagKind["close"] = 1] = "close";
})(TagKind = exports.TagKind || (exports.TagKind = {}));
const grammar = (tokenLa) => {
    const ast = [];
    const allTags = [];
    const comments = [];
    while (tokenLa.la() != null) {
        if (tokenLa.la().type === HtmlTokenType['<']) {
            const tagAst = tag(tokenLa);
            ast.push(tagAst);
            allTags.push(tagAst);
        }
        else if (tokenLa.la().type === HtmlTokenType['</']) {
            const closingTagAst = closingTag(tokenLa);
            allTags.push(closingTagAst);
        }
        else if (tokenLa.la().type === HtmlTokenType.comment) {
            comments.push(tokenLa.advance());
        }
        else {
            tokenLa.advance();
        }
    }
    return {
        tags: ast,
        comments,
        allTags
    };
};
function tag(tokenLa) {
    const first = tokenLa.advance();
    const name = first.text.substring(1);
    const attrs = attributes(tokenLa);
    if (tokenLa.la() == null) {
        this.throwError('EOF');
    }
    const last = tokenLa.advance(); // >
    return { kind: TagKind.open, name, attrs, start: first.pos, end: last.end, selfClosed: last.type === HtmlTokenType['/>'] };
}
function closingTag(tokenLa) {
    const first = tokenLa.advance();
    const name = first.text.slice(2);
    const rightAngular = tokenLa.advance();
    return { kind: TagKind.close, name, start: first.pos, end: rightAngular.end };
}
function isSameType(token, type) {
    return token.type === type;
}
function attributes(tokenLa) {
    const attrs = {};
    while (tokenLa.la() && !tokenLa.isNextWith([HtmlTokenType['>']], isSameType) &&
        !tokenLa.isNextWith([HtmlTokenType['/>']], isSameType)) {
        if (isNgAttrName(tokenLa)) {
            const key = ngAttrName(tokenLa);
            attrs[key] = { isNg: true, value: attrValue(tokenLa) };
        }
        else if (tokenLa.la().type === HtmlTokenType.identity) {
            const key = attrName(tokenLa);
            attrs[key] = { isNg: false, value: attrValue(tokenLa) };
        }
        else if (tokenLa.isNextWith([HtmlTokenType.space], isSameType)) {
            tokenLa.advance();
        }
        else {
            const token = tokenLa.advance();
            throw new Error(`Unexpect token type: ${HtmlTokenType[token.type]}, text: ${token.text} at line: ${token.line}, column: ${token.col}`);
        }
    }
    return attrs;
}
function isNgAttrName(tokenLa) {
    if (tokenLa.la() == null)
        tokenLa.throwError('End of file');
    const type = tokenLa.la().type;
    return type === HtmlTokenType['['] || type === HtmlTokenType['('];
}
function ngAttrName(tokenLa) {
    if (tokenLa.la() == null)
        tokenLa.throwError('End of file');
    const kind = tokenLa.la().type === HtmlTokenType['['] ? HtmlTokenType[']'] : HtmlTokenType[')'];
    let name;
    tokenLa.advance();
    if (isNgAttrName(tokenLa))
        name = ngAttrName(tokenLa);
    else
        name = attrName(tokenLa);
    if (tokenLa.la().type !== kind)
        tokenLa.throwError(tokenLa.la().text);
    tokenLa.advance();
    return name;
}
function attrName(tokenLa) {
    return tokenLa.advance().text;
}
function attrValue(tokenLa) {
    if (tokenLa.la() && tokenLa.la().type === HtmlTokenType['=']) {
        // let {text, start, end} = this.advance(2);
        // return {text, start, end};
        tokenLa.advance();
        let start = tokenLa.la() && tokenLa.la().pos;
        let end = start;
        if (tokenLa.la() && tokenLa.la().type === HtmlTokenType.qm) {
            const quoteMark = tokenLa.advance().text;
            start = tokenLa.la() && tokenLa.la().pos;
            while (tokenLa.la() && tokenLa.la().text !== quoteMark) {
                tokenLa.advance();
            }
            if (!tokenLa.isNextWith([quoteMark], (token, text) => token.text === text)) {
                throw new Error('Unexpect ' + tokenLa.la());
            }
            end = tokenLa.advance().pos;
            // console.log('value:', this.text.slice(start, end));
            return {
                start: start,
                end,
                text: '(-,-)'
            };
        }
        else {
            let end = start;
            while (tokenLa.la() && !tokenLa.isNextWith([HtmlTokenType.space], isSameType) &&
                !tokenLa.isNextWith([HtmlTokenType['>']], isSameType)) {
                end = tokenLa.advance().end;
            }
            if (tokenLa.la() == null) {
                tokenLa.throwError('end of file');
            }
            return {
                start: start,
                end,
                text: '(-,-)'
            };
        }
    }
    else {
        return;
    }
}
const parseFunc = LLn_parser_1.createStringParser('DrcpHtmlParser', exports.lexer, grammar);
function parseHtml(input) {
    const result = parseFunc(input);
    for (const tag of result.tags) {
        if (tag.attrs) {
            for (const attrName in tag.attrs) {
                if (Object.prototype.hasOwnProperty.call(tag.attrs, attrName)) {
                    const value = tag.attrs[attrName];
                    if (value.value) {
                        const { start, end } = value.value;
                        value.value.text = input.slice(start, end);
                    }
                }
            }
        }
    }
    return result;
}
exports.default = parseHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy9uZy1odG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpRkFBaUY7QUFDakY7O0dBRUc7QUFDSCxvRkFBb0Y7QUFDcEYsK0RBQW9HO0FBRXBHLElBQVksYUFpQlg7QUFqQkQsV0FBWSxhQUFhO0lBQ3ZCLFlBQVk7SUFDWiwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDZDQUFJLENBQUE7SUFDSiwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsNkNBQUksQ0FBQTtJQUNKLDJDQUFHLENBQUE7SUFDSCw2Q0FBRSxDQUFBO0lBQ0YsMERBQVEsQ0FBQTtJQUNSLG9FQUFhLENBQUE7SUFDYixnREFBRyxDQUFBO0lBQ0gsb0RBQUssQ0FBQTtJQUNMLHdEQUFPLENBQUE7QUFDVCxDQUFDLEVBakJXLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBaUJ4QjtBQTRLd0Isa0NBQVM7QUExS3JCLFFBQUEsS0FBSyxHQUFpQyxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUNqRSxJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUU5QixTQUFTLFVBQVU7UUFDakIsSUFBSSxpQkFBaUIsRUFBRTtZQUNyQixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixpQkFBaUIsR0FBRyxLQUFLLENBQUM7U0FDM0I7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxhQUFhLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNyRCxPQUFPLElBQUksRUFBRTtRQUNYLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNuQixJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7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LENBQWlDLGdCQUFnQixFQUFFLGFBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztBQUV2RyxTQUF3QixTQUFTLENBQUMsS0FBYTtJQUM3QyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFO1FBQzdCLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtZQUNiLEtBQUssTUFBTSxRQUFRLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtnQkFDaEMsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRTtvQkFDN0QsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO3dCQUNmLE1BQU0sRUFBQyxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQzt3QkFDakMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7cUJBQzVDO2lCQUNGO2FBQ0Y7U0FDRjtLQUNGO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQWhCRCw0QkFnQkMiLCJmaWxlIjoiZGlzdC91dGlscy9uZy1odG1sLXBhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
