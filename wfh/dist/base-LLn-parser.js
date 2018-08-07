"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        const readPos = this.currPos + num;
        return this.read(readPos);
    }
    lb(num = 1) {
        const pos = this.currPos - (num - 1);
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
        let i = 0;
        const l = compareTo.length;
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
            const next = this.sourceIterator.next();
            if (next.done)
                return null;
            this.cached.push(next.value);
        }
        return this.cached[pos];
    }
}
exports.LookAhead = LookAhead;
class BaseLexer extends LookAhead {
    constructor(source) {
        super(source);
        this.source = source;
        this.lineBeginPositions = [-1];
        const originNext = this.sourceIterator.next;
        const it = this.sourceIterator;
        // - Monkey patch iterator's next() method to track beginning position of each line
        let nextCount = 0;
        const self = this;
        this.sourceIterator.next = function () {
            const nextRes = originNext.call(it);
            const chr = nextRes.value;
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
        const [line, col] = this.getLineColumn(this.currPos);
        return `get ${JSON.stringify(this.la())}, at line ${line + 1}, column ${col + 1}, after ${JSON.stringify(this.lb())}`;
    }
    /**
     * @return zero-based [line, column] value
     * */
    getLineColumn(pos) {
        const lineIndex = sortedIndex(this.lineBeginPositions, pos) - 1;
        const linePos = this.lineBeginPositions[lineIndex];
        // console.log(`pos = ${pos}, lineIndex = ${lineIndex}, linePos=${linePos}`);
        return [lineIndex, pos - (linePos + 1)];
    }
}
exports.BaseLexer = BaseLexer;
class BaseParser extends LookAhead {
    constructor(lexer) {
        super(lexer);
        this.lexer = lexer;
    }
    getCurrentPosInfo() {
        const start = this.la() ? this.la().start : null;
        if (start) {
            const lineCol = this.lexer.getLineColumn(start);
            return `Line ${lineCol[0] + 1} column ${lineCol[1] + 1}`;
        }
        return '';
    }
}
exports.BaseParser = BaseParser;
//# sourceMappingURL=base-LLn-parser.js.map