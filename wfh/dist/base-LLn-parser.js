"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sortedIndex = require("lodash/sortedIndex");
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
        const lineIndex = sortedIndex(this.lineBeginPositions, pos) - 1;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0RBQW1EO0FBRW5ELE1BQWEsS0FBSztJQUtqQixZQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdkMsS0FBYTtRQURGLFNBQUksR0FBSixJQUFJLENBQUc7UUFDbEIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBQ0Q7QUFYRCxzQkFXQztBQUVELElBQVksT0FHWDtBQUhELFdBQVksT0FBTztJQUNsQix5Q0FBTSxDQUFBO0lBQ04scUNBQUksQ0FBQTtBQUNMLENBQUMsRUFIVyxPQUFPLEdBQVAsZUFBTyxLQUFQLGVBQU8sUUFHbEI7QUFFRCxNQUFzQixTQUFTO0lBUzlCLFlBQVksTUFBbUI7UUFIL0IsWUFBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDZixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDakQsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxFQUFFLENBQUMs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