"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseParser = exports.TokenFilter = exports.BaseLexer = exports.LookAhead = exports.Token = void 0;
/**
 * @Deprecated use LLn-parser instead
 */
const sortedIndex_1 = __importDefault(require("lodash/sortedIndex"));
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
class LookAhead {
    constructor(source) {
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
            return null;
        return this.read(pos);
    }
    advance(count = 1) {
        let current = null;
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
        // tslint:disable-next-line:max-line-length
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
    isNextTokenText(...text) {
        const comparator = (a, b) => {
            if (a == null)
                return false;
            return a.text === b;
        };
        return this._isNext(text, comparator);
    }
}
exports.BaseParser = BaseParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztHQUVHO0FBQ0gscUVBQTZDO0FBRTdDLE1BQWEsS0FBSztJQUtoQixZQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdEMsS0FBYTtRQURILFNBQUksR0FBSixJQUFJLENBQUc7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0Y7QUFYRCxzQkFXQztBQUVELE1BQXNCLFNBQVM7SUFRN0IsWUFBWSxNQUFtQjtRQUZyQixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVELElBQUksUUFBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVEOzs7O1NBSUU7SUFDRixFQUFFLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDUixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELEVB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QkFDWCxPQUFPLEtBQUssQ0FBQztZQUNmLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFTLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUE3QkQsZ0NBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBARGVwcmVjYXRlZCB1c2UgTExuLXBhcnNlciBpbnN0ZWFkXG4gKi9cbmltcG9ydCBzb3J0ZWRJbmRleCBmcm9tICdsb2Rhc2gvc29ydGVkSW5kZXgnO1xuXG5leHBvcnQgY2xhc3MgVG9rZW48VD4ge1xuICB0ZXh0OiBzdHJpbmc7XG4gIGVuZDogbnVtYmVyO1xuICBsaW5lQ29sdW1uOiBbbnVtYmVyLCBudW1iZXJdO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB0eXBlOiBULCBsZXhlcjogQmFzZUxleGVyPFQ+LFxuICAgIHB1YmxpYyBzdGFydDogbnVtYmVyKSB7XG4gICAgdGhpcy50ZXh0ID0gbGV4ZXIuZ2V0VGV4dChzdGFydCk7XG4gICAgdGhpcy5lbmQgPSBsZXhlci5wb3NpdGlvbjtcbiAgICB0aGlzLmxpbmVDb2x1bW4gPSBsZXhlci5nZXRMaW5lQ29sdW1uKHN0YXJ0KTtcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTG9va0FoZWFkPFQ+IHtcbiAgY2FjaGVkOiBUW107XG4gIC8vIGNoYW5uZWxzOiB7W2NoYW5uZWw6IHN0cmluZ106IFRbXX0gPSB7fTtcbiAgLy8gY2hhbm5lbFBvczoge1tjaGFubmVsOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG4gIHNvdXJjZUl0ZXJhdG9yOiBJdGVyYXRvcjxUPjtcbiAgaXNTdHJpbmc6IGJvb2xlYW47XG4gIHByb3RlY3RlZCBjdXJyUG9zID0gLTE7XG5cbiAgY29uc3RydWN0b3Ioc291cmNlOiBJdGVyYWJsZTxUPikge1xuICAgIHRoaXMuaXNTdHJpbmcgPSB0eXBlb2Ygc291cmNlID09PSAnc3RyaW5nJztcbiAgICB0aGlzLmNhY2hlZCA9IFtdO1xuICAgIHRoaXMuc291cmNlSXRlcmF0b3IgPSBzb3VyY2VbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICB9XG5cbiAgZ2V0IHBvc2l0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuY3VyclBvcyArIDE7XG4gIH1cblxuICAvKipcblx0ICogbG9vayBhaGVhZCBmb3IgMSBjaGFyYWN0ZXJcblx0ICogQHBhcmFtIG51bSBkZWZhdWx0IGlzIDFcblx0ICogQHJldHVybiBudWxsIGlmIEVPRiBpcyByZWFjaGVkXG5cdCAqL1xuICBsYShudW0gPSAxKTogVCB8IG51bGwge1xuICAgIGNvbnN0IHJlYWRQb3MgPSB0aGlzLmN1cnJQb3MgKyBudW07XG4gICAgcmV0dXJuIHRoaXMucmVhZChyZWFkUG9zKTtcbiAgfVxuXG4gIGxiKG51bSA9IDEpOiBUIHwgbnVsbCB7XG4gICAgY29uc3QgcG9zID0gdGhpcy5jdXJyUG9zIC0gKG51bSAtIDEpO1xuICAgIGlmIChwb3MgPCAwKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMucmVhZChwb3MpO1xuICB9XG5cbiAgYWR2YW5jZShjb3VudCA9IDEpOiBUIHwgbnVsbCB7XG4gICAgbGV0IGN1cnJlbnQgPSBudWxsO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgY3VycmVudCA9IHRoaXMubGEoMSk7XG4gICAgICBpZiAoY3VycmVudCA9PSBudWxsKVxuICAgICAgICB0aGlzLnRocm93RXJyb3IoKTtcbiAgICAgIHRoaXMuY3VyclBvcysrO1xuICAgIH1cbiAgICByZXR1cm4gY3VycmVudDtcbiAgfVxuXG4gIC8qKlxuXHQgKiBTYW1lIGFzIGByZXR1cm4gbGEoMSkgPT09IHZhbHVlc1swXSAmJiBsYSgyKSA9PT0gdmFsdWVzWzFdLi4uYFxuXHQgKiBAcGFyYW0gdmFsdWVzIGxvb2thaGVhZCBzdHJpbmcgb3IgdG9rZW5zXG5cdCAqL1xuICBpc05leHQoLi4udmFsdWVzOiBUW10pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5faXNOZXh0PFQ+KHZhbHVlcyk7XG4gIH1cblxuICBfaXNOZXh0PEM+KHZhbHVlczogQ1tdLCBpc0VxdWFsID0gKGE6IFQsIGI6IEMpID0+IGEgYXMgYW55ID09PSBiKTogYm9vbGVhbiB7XG4gICAgbGV0IGNvbXBhcmVUbzogQ1tdfCBzdHJpbmc7XG4gICAgbGV0IGNvbXBhcmVGbjogKC4uLmFyZzogYW55W10pID0+IGJvb2xlYW47XG4gICAgaWYgKHRoaXMuaXNTdHJpbmcpIHtcbiAgICAgIGNvbXBhcmVUbyA9IHZhbHVlcy5qb2luKCcnKTtcbiAgICAgIGNvbXBhcmVGbiA9IChhOiBzdHJpbmcsIGI6IHN0cmluZykgPT4gYSA9PT0gYjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGFyZVRvID0gdmFsdWVzO1xuICAgICAgY29tcGFyZUZuID0gaXNFcXVhbDtcbiAgICB9XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IGwgPSBjb21wYXJlVG8ubGVuZ3RoO1xuICAgIGxldCBuZXh0ID0gdGhpcy5sYShpICsgMSk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChpID09PSBsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIG5leHQgPSB0aGlzLmxhKGkgKyAxKTtcbiAgICAgIGlmIChuZXh0ID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gRU9GXG4gICAgICBlbHNlIGlmICghY29tcGFyZUZuKG5leHQsIGNvbXBhcmVUb1tpXSkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHVuZXhwZWN0ZWQgPSAnRW5kLW9mLWZpbGUnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkICR7SlNPTi5zdHJpbmdpZnkodW5leHBlY3RlZCl9IGF0IGAgKyB0aGlzLmdldEN1cnJlbnRQb3NJbmZvKCkpO1xuICB9XG5cbiAgYWJzdHJhY3QgZ2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nO1xuXG4gIC8qKlxuXHQgKiBEbyBub3QgcmVhZCBwb3N0aW9uIGxlc3MgdGhhbiAwXG5cdCAqIEBwYXJhbSBwb3MgXG5cdCAqL1xuICBwcm90ZWN0ZWQgcmVhZChwb3M6IG51bWJlcik6IFQgfCBudWxsIHtcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmNhY2hlZDtcbiAgICB3aGlsZSAoY2FjaGVkLmxlbmd0aCA8PSBwb3MpIHtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnNvdXJjZUl0ZXJhdG9yLm5leHQoKTtcbiAgICAgIGlmIChuZXh0LmRvbmUpXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgY2FjaGVkLnB1c2gobmV4dC52YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiBjYWNoZWRbcG9zXTtcbiAgfVxufVxuXG4vKipcbiAqIDEuIERlZmluZSBhIFwiVG9rZW5UeXBlXCIgZW51bVxuICogMi4gSW1wbGVtZW50IHlvdXIgb3duIFwiTGV4ZXJcIiB3aGljaCBleHRlbmRzIFwiQmFzZUxleGVyXCIgd2l0aCB0eXBlIHBhcmVtZXRlciBvZiB5b3VyIGVudW0gXCJUb2tlblR5cGVcIlxuICogMy4gSW1wbGVtZW50IGBbU3ltYm9sLmludGVyYXRvcl0oKWAgZnVuY3Rpb24gaW4geW91ciBMZXhlcjpcbmBgYHRzXG5cdCpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxUb2tlblR5cGU+PiB7XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG5cdFx0XHRjb25zdCBzdGFydCA9IHRoaXMucG9zaXRpb247XG5cdFx0XHRpZiAodGhpcy5sYSgpID09PSAnXFxuJykge1xuXHRcdFx0XHR0aGlzLmFkdmFuY2UoKTtcblx0XHRcdFx0eWllbGQgbmV3IFRva2VuKFRva2VuVHlwZS5FT0wsIHRoaXMsIHN0YXJ0KTtcblx0XHRcdH1cblx0XHRcdC4uLlxuXHRcdH1cblx0fVxuYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCYXNlTGV4ZXI8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8c3RyaW5nPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFRva2VuPFQ+PiB7XG4gIGxpbmVCZWdpblBvc2l0aW9uczogbnVtYmVyW10gPSBbLTFdO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBzb3VyY2U6IHN0cmluZykge1xuICAgIHN1cGVyKHNvdXJjZSk7XG4gICAgY29uc3Qgb3JpZ2luTmV4dCA9IHRoaXMuc291cmNlSXRlcmF0b3IubmV4dDtcbiAgICBjb25zdCBpdCA9IHRoaXMuc291cmNlSXRlcmF0b3I7XG4gICAgLy8gLSBNb25rZXkgcGF0Y2ggaXRlcmF0b3IncyBuZXh0KCkgbWV0aG9kIHRvIHRyYWNrIGJlZ2lubmluZyBwb3NpdGlvbiBvZiBlYWNoIGxpbmVcbiAgICBsZXQgbmV4dENvdW50ID0gMDtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICB0aGlzLnNvdXJjZUl0ZXJhdG9yLm5leHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IG5leHRSZXMgPSBvcmlnaW5OZXh0LmNhbGwoaXQpO1xuICAgICAgY29uc3QgY2hyID0gbmV4dFJlcy52YWx1ZTtcbiAgICAgIGlmICghbmV4dFJlcy5kb25lICYmIGNociA9PT0gJ1xcbicpXG4gICAgICAgIHNlbGYubGluZUJlZ2luUG9zaXRpb25zLnB1c2gobmV4dENvdW50KTtcbiAgICAgIG5leHRDb3VudCsrO1xuICAgICAgcmV0dXJuIG5leHRSZXM7XG4gICAgfTtcbiAgfVxuXG4gIGFic3RyYWN0IFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFQ+PjtcblxuICBnZXRUZXh0KHN0YXJ0UG9zOiBudW1iZXIpIHtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc2xpY2Uoc3RhcnRQb3MsIHRoaXMucG9zaXRpb24pO1xuICB9XG5cbiAgZ2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcbiAgICBjb25zdCBbbGluZSwgY29sXSA9IHRoaXMuZ2V0TGluZUNvbHVtbih0aGlzLmN1cnJQb3MpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICByZXR1cm4gYGdldCAke0pTT04uc3RyaW5naWZ5KHRoaXMubGEoKSl9LCBhdCBsaW5lICR7bGluZSArIDF9LCBjb2x1bW4gJHtjb2wgKyAxfSwgYWZ0ZXIgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmxiKCkpfWA7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiB6ZXJvLWJhc2VkIFtsaW5lLCBjb2x1bW5dIHZhbHVlXG5cdCAqICovXG4gIGdldExpbmVDb2x1bW4ocG9zOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgICBjb25zdCBsaW5lSW5kZXggPSBzb3J0ZWRJbmRleCh0aGlzLmxpbmVCZWdpblBvc2l0aW9ucywgcG9zKSAtIDE7XG4gICAgY29uc3QgbGluZVBvcyA9IHRoaXMubGluZUJlZ2luUG9zaXRpb25zW2xpbmVJbmRleF07XG4gICAgcmV0dXJuIFtsaW5lSW5kZXgsIHBvcyAtIChsaW5lUG9zICsgMSldO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlbkZpbHRlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxUb2tlbjxUPj4gaW1wbGVtZW50cyBJdGVyYWJsZTxUb2tlbjxUPj4ge1xuICBjb25zdHJ1Y3RvcihsZXhlcjogSXRlcmFibGU8VG9rZW48VD4+LCBwdWJsaWMgc2tpcFR5cGU6IFQpIHtcbiAgICBzdXBlcihsZXhlcik7XG4gIH1cblxuICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VD4+IHtcbiAgICB3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcbiAgICAgIGlmICh0aGlzLmxhKCkhLnR5cGUgPT09IHRoaXMuc2tpcFR5cGUpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB5aWVsZCB0aGlzLmxhKCkhO1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpO1xuICAgIGlmIChzdGFydCA9PSBudWxsKVxuICAgICAgcmV0dXJuICdFT0YnO1xuICAgIHJldHVybiBgbGluZSAke3N0YXJ0LmxpbmVDb2x1bW5bMF0gKyAxfSBjb2x1bW4gJHtzdGFydC5saW5lQ29sdW1uWzFdICsgMX1gO1xuICB9XG59XG4vKipcbiAqIFRUIC0gdG9rZW4gdHlwZVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZVBhcnNlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxUb2tlbjxUPj4ge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgbGV4ZXI6IEl0ZXJhYmxlPFRva2VuPFQ+Pikge1xuICAgIHN1cGVyKGxleGVyKTtcbiAgfVxuXG4gIGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmxhKCk7XG4gICAgaWYgKHN0YXJ0ID09IG51bGwpXG4gICAgICByZXR1cm4gJ0VPRic7XG4gICAgcmV0dXJuIGBsaW5lICR7c3RhcnQubGluZUNvbHVtblswXSArIDF9IGNvbHVtbiAke3N0YXJ0LmxpbmVDb2x1bW5bMV0gKyAxfWA7XG4gIH1cblxuICBpc05leHRUeXBlcyguLi50eXBlczogVFtdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY29tcGFyYXRvciA9IChhOiBUb2tlbjxUPiwgYjogVCkgPT4ge1xuICAgICAgaWYgKGEgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIGEudHlwZSA9PT0gYjtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8VD4odHlwZXMsIGNvbXBhcmF0b3IpO1xuICB9XG5cbiAgaXNOZXh0VG9rZW5UZXh0KC4uLnRleHQ6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY29tcGFyYXRvciA9IChhOiBUb2tlbjxUPiwgYjogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoYSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gYS50ZXh0ID09PSBiO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuX2lzTmV4dDxzdHJpbmc+KHRleHQsIGNvbXBhcmF0b3IpO1xuICB9XG59XG4iXX0=