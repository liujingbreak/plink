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

//# sourceMappingURL=ng-html-parser.js.map
