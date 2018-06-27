"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-classes-per-file max-line-length no-console jsdoc-format */
const sortedIndex = require("lodash/sortedIndex");
class Token {
    constructor(type, lexer, start) {
        this.type = type;
        this.start = start;
        this.text = lexer.getText(start);
        this.end = lexer.position;
    }
}
exports.Token = Token;
var Channel;
(function (Channel) {
    Channel[Channel["normal"] = 0] = "normal";
    Channel[Channel["skip"] = 1] = "skip";
})(Channel = exports.Channel || (exports.Channel = {}));
class LookAhead {
    constructor(source) {
        this.channel = Channel.normal;
        this.currPos = -1;
        this.isString = typeof source === 'string';
        this.cached = [];
        this.sourceIterator = source[Symbol.iterator]();
    }
    get position() {
        return this.currPos + 1;
    }
    la(num = 1) {
        if (this.channel === Channel.normal) {
            this.channel = Channel.skip;
            this.skip();
            this.channel = Channel.normal;
        }
        let readPos = this.currPos + num;
        return this.read(readPos);
    }
    lb(num = 1) {
        let pos = this.currPos - (num - 1);
        if (pos < 0)
            return undefined;
        return this.read(pos);
    }
    advance(count = 1) {
        let current;
        for (let i = 0; i < count; i++) {
            current = this.la(1);
            if (current == null)
                this.throwError();
            this.currPos++;
        }
        return current;
    }
    isNext(...values) {
        let compareTo;
        if (this.isString) {
            compareTo = values.join('');
        }
        else
            compareTo = values;
        let i = 0, l = compareTo.length;
        let next = this.la(i + 1);
        while (true) {
            if (i === l)
                return true;
            next = this.la(i + 1);
            if (next == null)
                return false; // EOF
            else if (next !== compareTo[i])
                return false;
            i++;
        }
    }
    throwError(unexpected = 'End-of-file') {
        throw new Error(`Unexpected ${JSON.stringify(unexpected)} at ` + this.getCurrentPosInfo());
    }
    /**
     * Do not read postion less than 0
     * @param pos
     */
    read(pos) {
        while (this.cached.length <= pos) {
            let next = this.sourceIterator.next();
            if (next.done)
                return null;
            this.cached.push(next.value);
        }
        return this.cached[pos];
    }
}
exports.LookAhead = LookAhead;
class LookAheadString extends LookAhead {
    constructor(source) {
        super(source);
        this.source = source;
        this.lineBeginPositions = [-1];
        let originNext = this.sourceIterator.next;
        let it = this.sourceIterator;
        // - Monkey patch iterator's next() method to track beginning position of each line
        let nextCount = 0;
        let self = this;
        this.sourceIterator.next = function () {
            let nextRes = originNext.call(it);
            let chr = nextRes.value;
            if (!nextRes.done && chr === '\n')
                self.lineBeginPositions.push(nextCount);
            nextCount++;
            return nextRes;
        };
    }
    getText(startPos) {
        return this.source.substring(startPos, this.position);
    }
    getCurrentPosInfo() {
        let [line, col] = this.getLineColumn(this.currPos);
        return `get ${JSON.stringify(this.la())}, at line ${line + 1}, column ${col + 1}, after ${JSON.stringify(this.lb())}`;
    }
    /**
     * @return zero-based [line, column] value
     * */
    getLineColumn(pos) {
        let lineIndex = sortedIndex(this.lineBeginPositions, pos) - 1;
        let linePos = this.lineBeginPositions[lineIndex];
        // console.log(`pos = ${pos}, lineIndex = ${lineIndex}, linePos=${linePos}`);
        return [lineIndex, pos - (linePos + 1)];
    }
}
exports.LookAheadString = LookAheadString;
class BaseLexer extends LookAheadString {
    constructor(source) {
        super(source);
    }
    *[Symbol.iterator]() { }
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
exports.BaseLexer = BaseLexer;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["comments"] = 0] = "comments";
    TokenType[TokenType['<'] = 1] = '<';
    TokenType[TokenType['>'] = 2] = '>';
    TokenType[TokenType['('] = 3] = '(';
    TokenType[TokenType[')'] = 4] = ')';
    TokenType[TokenType['['] = 5] = '[';
    TokenType[TokenType[']'] = 6] = ']';
    TokenType[TokenType['</'] = 7] = '</';
    TokenType[TokenType['='] = 8] = '=';
    TokenType[TokenType["identity"] = 9] = "identity";
    TokenType[TokenType["stringLiteral"] = 10] = "stringLiteral";
    TokenType[TokenType["any"] = 11] = "any";
    TokenType[TokenType["space"] = 12] = "space";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
class TemplateLexer extends BaseLexer {
    *[Symbol.iterator]() {
        while (true) {
            let start = this.position;
            let char = this.la();
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
                    yield new Token(TokenType[char], this, start);
                    continue;
            }
            if (char === '<' && this.isIdStart(2)) {
                yield this.openTagStart();
            }
            else if (this.isNext('</')) {
                yield this.closeTagStart();
            }
            else if (this.isIdStart()) {
                do {
                    this.advance();
                    char = this.la();
                } while (this.isIdStart());
                yield new Token(TokenType.identity, this, start);
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
                // yield new Token(TokenType.space, ' ');
                continue;
            }
            else {
                yield new Token(TokenType.any, this, start);
                this.advance();
            }
        }
    }
    openTagStart() {
        let start = this.position;
        this.advance();
        do {
            this.advance();
        } while (this.isIdStart());
        return new Token(TokenType['<'], this, start);
    }
    closeTagStart() {
        this.advance(2);
        let start = this.position;
        while (this.la() !== '>') {
            this.advance();
        }
        return new Token(TokenType['</'], this, start);
    }
    isIdStart(laIdx = 1) {
        let char = this.la(laIdx);
        return /[^<>()\[\]"'=`/]/.test(char) && /\S/.test(char);
    }
    isWhitespace() {
        let chr = this.la();
        return /\s/.test(chr);
    }
    stringLit(quote) {
        this.advance();
        let start = this.position;
        while (this.la() !== quote) {
            if (this.la() == null)
                this.throwError();
            // console.log(':', this.la());
            if (this.la() === '\\') {
                this.advance();
            }
            this.advance();
        }
        let tk = new Token(TokenType.stringLiteral, this, start);
        this.advance();
        return tk;
    }
}
exports.TemplateLexer = TemplateLexer;
class TemplateParser extends LookAhead {
    constructor(input) {
        let lexer = new TemplateLexer(input);
        super(lexer);
        this.lexer = lexer;
    }
    getCurrentPosInfo() {
        let start = this.la() ? this.la().start : null;
        if (start) {
            let lineCol = this.lexer.getLineColumn(start);
            return `Line ${lineCol[0] + 1} column ${lineCol[1] + 1}`;
        }
    }
    skip() {
        while (this.la() != null && this.la().type === TokenType.space) {
            this.advance();
        }
    }
    parse() {
        let ast = [];
        while (this.la() != null) {
            if (this.la().type === TokenType['<']) {
                ast.push(this.tag());
            }
            else if (this.la().type === TokenType['</']) {
                this.advance();
            }
            else {
                this.advance();
            }
        }
        return ast;
    }
    tag() {
        let first = this.advance();
        let name = first.text.substring(1);
        let attrs = this.attributes();
        let last = this.advance(); // >
        return { name, attrs, start: first.start, end: last.end };
    }
    attributes() {
        let attrs = {};
        while (this.la() != null && this.la().type !== TokenType['>']) {
            if (this.isNgAttrName()) {
                let key = this.ngAttrName();
                attrs[key] = this.attrValue();
            }
            else if (this.la().type === TokenType.identity) {
                let key = this.attrName();
                attrs[key] = this.attrValue();
            }
            else {
                console.log('Previous tokens: ', this.lb().text);
                this.throwError(this.la().text);
            }
        }
        return attrs;
    }
    isNgAttrName() {
        let type = this.la().type;
        return type === TokenType['['] || type === TokenType['('];
    }
    ngAttrName() {
        let kind = this.la().type === TokenType['['] ? TokenType[']'] : TokenType[')'];
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
        if (this.la() && this.la().type === TokenType['=']) {
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

//# sourceMappingURL=ng-html-parser.js.map
