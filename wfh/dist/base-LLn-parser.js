"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sortedIndex_1 = tslib_1.__importDefault(require("lodash/sortedIndex"));
class Token {
    constructor(type, lexer, start) {
        this.type = type;
        this.start = start;
        this.text = lexer.getText(start);
        this.end = lexer.position;
        this.lineColumn = lexer.getLineColumn(start);
    }
}
exports.Token = Token;
var Channel;
(function (Channel) {
    Channel[Channel["normal"] = 0] = "normal";
    Channel[Channel["full"] = 1] = "full";
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
    /**
     * look ahead for 1 character
     * @param num default is 1
     * @return null if EOF is reached
     */
    la(num = 1) {
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
    /**
     * Same as `return la(1) === values[0] && la(2) === values[1]...`
     * @param values lookahead string or tokens
     */
    isNext(...values) {
        return this._isNext(values);
    }
    _isNext(values, isEqual = (a, b) => a === b) {
        let compareTo;
        let compareFn;
        if (this.isString) {
            compareTo = values.join('');
            compareFn = (a, b) => a === b;
        }
        else {
            compareTo = values;
            compareFn = isEqual;
        }
        let i = 0;
        const l = compareTo.length;
        let next = this.la(i + 1);
        while (true) {
            if (i === l)
                return true;
            next = this.la(i + 1);
            if (next == null)
                return false; // EOF
            else if (!compareFn(next, compareTo[i]))
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
        const cached = this.cached;
        while (cached.length <= pos) {
            const next = this.sourceIterator.next();
            if (next.done)
                return null;
            cached.push(next.value);
        }
        return cached[pos];
    }
}
exports.LookAhead = LookAhead;
/**
 * 1. Define a "TokenType" enum
 * 2. Implement your own "Lexer" which extends "BaseLexer" with type paremeter of your enum "TokenType"
 * 3. Implement `[Symbol.interator]()` function in your Lexer:
```ts
    *[Symbol.iterator](): Iterator<Token<TokenType>> {
        while (this.la() != null) {
            const start = this.position;
            if (this.la() === '\n') {
                this.advance();
                yield new Token(TokenType.EOL, this, start);
            }
            ...
        }
    }
```
 */
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
        return this.source.slice(startPos, this.position);
    }
    getCurrentPosInfo() {
        const [line, col] = this.getLineColumn(this.currPos);
        return `get ${JSON.stringify(this.la())}, at line ${line + 1}, column ${col + 1}, after ${JSON.stringify(this.lb())}`;
    }
    /**
     * @return zero-based [line, column] value
     * */
    getLineColumn(pos) {
        const lineIndex = sortedIndex_1.default(this.lineBeginPositions, pos) - 1;
        const linePos = this.lineBeginPositions[lineIndex];
        return [lineIndex, pos - (linePos + 1)];
    }
}
exports.BaseLexer = BaseLexer;
class TokenFilter extends LookAhead {
    constructor(lexer, skipType) {
        super(lexer);
        this.skipType = skipType;
    }
    *[Symbol.iterator]() {
        while (this.la() != null) {
            if (this.la().type === this.skipType) {
                this.advance();
            }
            else {
                yield this.la();
                this.advance();
            }
        }
    }
    getCurrentPosInfo() {
        const start = this.la();
        if (start == null)
            return 'EOF';
        return `line ${start.lineColumn[0] + 1} column ${start.lineColumn[1] + 1}`;
    }
}
exports.TokenFilter = TokenFilter;
/**
 * TT - token type
 */
class BaseParser extends LookAhead {
    constructor(lexer) {
        super(lexer);
        this.lexer = lexer;
    }
    getCurrentPosInfo() {
        const start = this.la();
        if (start == null)
            return 'EOF';
        return `line ${start.lineColumn[0] + 1} column ${start.lineColumn[1] + 1}`;
    }
    isNextTypes(...types) {
        const comparator = (a, b) => {
            if (a == null)
                return false;
            return a.type === b;
        };
        return this._isNext(types, comparator);
    }
}
exports.BaseParser = BaseParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZFQUE2QztBQUU3QyxNQUFhLEtBQUs7SUFLakIsWUFBbUIsSUFBTyxFQUFFLEtBQW1CLEVBQ3ZDLEtBQWE7UUFERixTQUFJLEdBQUosSUFBSSxDQUFHO1FBQ2xCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDcEIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNEO0FBWEQsc0JBV0M7QUFFRCxJQUFZLE9BR1g7QUFIRCxXQUFZLE9BQU87SUFDbEIseUNBQU0sQ0FBQTtJQUNOLHFDQUFJLENBQUE7QUFDTCxDQUFDLEVBSFcsT0FBTyxHQUFQLGVBQU8sS0FBUCxlQUFPLFFBR2xCO0FBRUQsTUFBc0IsU0FBUztJQVM5QixZQUFZLE1BQW1CO1FBSC9CLFlBQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ2YsWUFBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBR3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDO1FBQzNDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO0lBQ2pELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsRUFBRSxDQUFD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