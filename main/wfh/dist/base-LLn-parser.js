"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseParser = exports.TokenFilter = exports.BaseLexer = exports.LookAhead = exports.Token = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @deprecated use LLn-parser instead
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
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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
        // eslint-disable-next-line max-len
        return `get ${JSON.stringify(this.la())}, at line ${line + 1}, column ${col + 1}, after ${JSON.stringify(this.lb())}`;
    }
    /**
       * @return zero-based [line, column] value
       * */
    getLineColumn(pos) {
        const lineIndex = (0, sortedIndex_1.default)(this.lineBeginPositions, pos) - 1;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHdEQUF3RDtBQUN4RCwrREFBK0Q7QUFDL0QsNERBQTREO0FBQzVEOztHQUVHO0FBQ0gscUVBQTZDO0FBRTdDLE1BQWEsS0FBSztJQUtoQixZQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdEMsS0FBYTtRQURILFNBQUksR0FBSixJQUFJLENBQUc7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0Y7QUFYRCxzQkFXQztBQUVELE1BQXNCLFNBQVM7SUFRN0IsWUFBWSxNQUFtQjtRQUZyQixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVELElBQUksUUFBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVEOzs7O1NBSUU7SUFDRixFQUFFLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDUixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQyxJQUFJ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Q0FBQyxDQUFXLEVBQUUsQ0FBUyxFQUFFLEVBQUU7WUFDNUMsSUFBSSxDQUFDLElBQUksSUFBSTtnQkFDWCxPQUFPLEtBQUssQ0FBQztZQUNmLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFTLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUE3QkQsZ0NBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4gKi9cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2VzcyAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG4vKipcbiAqIEBkZXByZWNhdGVkIHVzZSBMTG4tcGFyc2VyIGluc3RlYWRcbiAqL1xuaW1wb3J0IHNvcnRlZEluZGV4IGZyb20gJ2xvZGFzaC9zb3J0ZWRJbmRleCc7XG5cbmV4cG9ydCBjbGFzcyBUb2tlbjxUPiB7XG4gIHRleHQ6IHN0cmluZztcbiAgZW5kOiBudW1iZXI7XG4gIGxpbmVDb2x1bW46IFtudW1iZXIsIG51bWJlcl07XG5cbiAgY29uc3RydWN0b3IocHVibGljIHR5cGU6IFQsIGxleGVyOiBCYXNlTGV4ZXI8VD4sXG4gICAgcHVibGljIHN0YXJ0OiBudW1iZXIpIHtcbiAgICB0aGlzLnRleHQgPSBsZXhlci5nZXRUZXh0KHN0YXJ0KTtcbiAgICB0aGlzLmVuZCA9IGxleGVyLnBvc2l0aW9uO1xuICAgIHRoaXMubGluZUNvbHVtbiA9IGxleGVyLmdldExpbmVDb2x1bW4oc3RhcnQpO1xuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMb29rQWhlYWQ8VD4ge1xuICBjYWNoZWQ6IFRbXTtcbiAgLy8gY2hhbm5lbHM6IHtbY2hhbm5lbDogc3RyaW5nXTogVFtdfSA9IHt9O1xuICAvLyBjaGFubmVsUG9zOiB7W2NoYW5uZWw6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcbiAgc291cmNlSXRlcmF0b3I6IEl0ZXJhdG9yPFQ+O1xuICBpc1N0cmluZzogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIGN1cnJQb3MgPSAtMTtcblxuICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEl0ZXJhYmxlPFQ+KSB7XG4gICAgdGhpcy5pc1N0cmluZyA9IHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnO1xuICAgIHRoaXMuY2FjaGVkID0gW107XG4gICAgdGhpcy5zb3VyY2VJdGVyYXRvciA9IHNvdXJjZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cblxuICBnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyUG9zICsgMTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBsb29rIGFoZWFkIGZvciAxIGNoYXJhY3RlclxuXHQgKiBAcGFyYW0gbnVtIGRlZmF1bHQgaXMgMVxuXHQgKiBAcmV0dXJuIG51bGwgaWYgRU9GIGlzIHJlYWNoZWRcblx0ICovXG4gIGxhKG51bSA9IDEpOiBUIHwgbnVsbCB7XG4gICAgY29uc3QgcmVhZFBvcyA9IHRoaXMuY3VyclBvcyArIG51bTtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuICB9XG5cbiAgbGIobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgICBjb25zdCBwb3MgPSB0aGlzLmN1cnJQb3MgLSAobnVtIC0gMSk7XG4gICAgaWYgKHBvcyA8IDApXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHBvcyk7XG4gIH1cblxuICBhZHZhbmNlKGNvdW50ID0gMSk6IFQgfCBudWxsIHtcbiAgICBsZXQgY3VycmVudCA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICBjdXJyZW50ID0gdGhpcy5sYSgxKTtcbiAgICAgIGlmIChjdXJyZW50ID09IG51bGwpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcigpO1xuICAgICAgdGhpcy5jdXJyUG9zKys7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50O1xuICB9XG5cbiAgLyoqXG5cdCAqIFNhbWUgYXMgYHJldHVybiBsYSgxKSA9PT0gdmFsdWVzWzBdICYmIGxhKDIpID09PSB2YWx1ZXNbMV0uLi5gXG5cdCAqIEBwYXJhbSB2YWx1ZXMgbG9va2FoZWFkIHN0cmluZyBvciB0b2tlbnNcblx0ICovXG4gIGlzTmV4dCguLi52YWx1ZXM6IFRbXSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8VD4odmFsdWVzKTtcbiAgfVxuXG4gIF9pc05leHQ8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpOiBib29sZWFuIHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcbiAgICBsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcbiAgICBpZiAodGhpcy5pc1N0cmluZykge1xuICAgICAgY29tcGFyZVRvID0gdmFsdWVzLmpvaW4oJycpO1xuICAgICAgY29tcGFyZUZuID0gKGE6IHN0cmluZywgYjogc3RyaW5nKSA9PiBhID09PSBiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wYXJlVG8gPSB2YWx1ZXM7XG4gICAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIH1cbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG4gICAgbGV0IG5leHQgPSB0aGlzLmxhKGkgKyAxKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgbmV4dCA9IHRoaXMubGEoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3IodW5leHBlY3RlZCA9ICdFbmQtb2YtZmlsZScpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeSh1bmV4cGVjdGVkKX0gYXQgYCArIHRoaXMuZ2V0Q3VycmVudFBvc0luZm8oKSk7XG4gIH1cblxuICBhYnN0cmFjdCBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmc7XG5cbiAgLyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG4gIHByb3RlY3RlZCByZWFkKHBvczogbnVtYmVyKTogVCB8IG51bGwge1xuICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuY2FjaGVkO1xuICAgIHdoaWxlIChjYWNoZWQubGVuZ3RoIDw9IHBvcykge1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCgpO1xuICAgICAgaWYgKG5leHQuZG9uZSlcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICBjYWNoZWQucHVzaChuZXh0LnZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGNhY2hlZFtwb3NdO1xuICB9XG59XG5cbi8qKlxuICogMS4gRGVmaW5lIGEgXCJUb2tlblR5cGVcIiBlbnVtXG4gKiAyLiBJbXBsZW1lbnQgeW91ciBvd24gXCJMZXhlclwiIHdoaWNoIGV4dGVuZHMgXCJCYXNlTGV4ZXJcIiB3aXRoIHR5cGUgcGFyZW1ldGVyIG9mIHlvdXIgZW51bSBcIlRva2VuVHlwZVwiXG4gKiAzLiBJbXBsZW1lbnQgYFtTeW1ib2wuaW50ZXJhdG9yXSgpYCBmdW5jdGlvbiBpbiB5b3VyIExleGVyOlxuYGBgdHNcblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFRva2VuVHlwZT4+IHtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT09ICdcXG4nKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oVG9rZW5UeXBlLkVPTCwgdGhpcywgc3RhcnQpO1xuXHRcdFx0fVxuXHRcdFx0Li4uXG5cdFx0fVxuXHR9XG5gYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VMZXhlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxzdHJpbmc+IGltcGxlbWVudHMgSXRlcmFibGU8VG9rZW48VD4+IHtcbiAgbGluZUJlZ2luUG9zaXRpb25zOiBudW1iZXJbXSA9IFstMV07XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHNvdXJjZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoc291cmNlKTtcbiAgICBjb25zdCBvcmlnaW5OZXh0ID0gdGhpcy5zb3VyY2VJdGVyYXRvci5uZXh0O1xuICAgIGNvbnN0IGl0ID0gdGhpcy5zb3VyY2VJdGVyYXRvcjtcbiAgICAvLyAtIE1vbmtleSBwYXRjaCBpdGVyYXRvcidzIG5leHQoKSBtZXRob2QgdG8gdHJhY2sgYmVnaW5uaW5nIHBvc2l0aW9uIG9mIGVhY2ggbGluZVxuICAgIGxldCBuZXh0Q291bnQgPSAwO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgbmV4dFJlcyA9IG9yaWdpbk5leHQuY2FsbChpdCk7XG4gICAgICBjb25zdCBjaHIgPSBuZXh0UmVzLnZhbHVlO1xuICAgICAgaWYgKCFuZXh0UmVzLmRvbmUgJiYgY2hyID09PSAnXFxuJylcbiAgICAgICAgc2VsZi5saW5lQmVnaW5Qb3NpdGlvbnMucHVzaChuZXh0Q291bnQpO1xuICAgICAgbmV4dENvdW50Kys7XG4gICAgICByZXR1cm4gbmV4dFJlcztcbiAgICB9O1xuICB9XG5cbiAgYWJzdHJhY3QgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VD4+O1xuXG4gIGdldFRleHQoc3RhcnRQb3M6IG51bWJlcikge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5zbGljZShzdGFydFBvcywgdGhpcy5wb3NpdGlvbik7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IFtsaW5lLCBjb2xdID0gdGhpcy5nZXRMaW5lQ29sdW1uKHRoaXMuY3VyclBvcyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICByZXR1cm4gYGdldCAke0pTT04uc3RyaW5naWZ5KHRoaXMubGEoKSl9LCBhdCBsaW5lICR7bGluZSArIDF9LCBjb2x1bW4gJHtjb2wgKyAxfSwgYWZ0ZXIgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmxiKCkpfWA7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiB6ZXJvLWJhc2VkIFtsaW5lLCBjb2x1bW5dIHZhbHVlXG5cdCAqICovXG4gIGdldExpbmVDb2x1bW4ocG9zOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgICBjb25zdCBsaW5lSW5kZXggPSBzb3J0ZWRJbmRleCh0aGlzLmxpbmVCZWdpblBvc2l0aW9ucywgcG9zKSAtIDE7XG4gICAgY29uc3QgbGluZVBvcyA9IHRoaXMubGluZUJlZ2luUG9zaXRpb25zW2xpbmVJbmRleF07XG4gICAgcmV0dXJuIFtsaW5lSW5kZXgsIHBvcyAtIChsaW5lUG9zICsgMSldO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlbkZpbHRlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxUb2tlbjxUPj4gaW1wbGVtZW50cyBJdGVyYWJsZTxUb2tlbjxUPj4ge1xuICBjb25zdHJ1Y3RvcihsZXhlcjogSXRlcmFibGU8VG9rZW48VD4+LCBwdWJsaWMgc2tpcFR5cGU6IFQpIHtcbiAgICBzdXBlcihsZXhlcik7XG4gIH1cblxuICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VD4+IHtcbiAgICB3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcbiAgICAgIGlmICh0aGlzLmxhKCkhLnR5cGUgPT09IHRoaXMuc2tpcFR5cGUpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB5aWVsZCB0aGlzLmxhKCkhO1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpO1xuICAgIGlmIChzdGFydCA9PSBudWxsKVxuICAgICAgcmV0dXJuICdFT0YnO1xuICAgIHJldHVybiBgbGluZSAke3N0YXJ0LmxpbmVDb2x1bW5bMF0gKyAxfSBjb2x1bW4gJHtzdGFydC5saW5lQ29sdW1uWzFdICsgMX1gO1xuICB9XG59XG4vKipcbiAqIFRUIC0gdG9rZW4gdHlwZVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZVBhcnNlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxUb2tlbjxUPj4ge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgbGV4ZXI6IEl0ZXJhYmxlPFRva2VuPFQ+Pikge1xuICAgIHN1cGVyKGxleGVyKTtcbiAgfVxuXG4gIGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmxhKCk7XG4gICAgaWYgKHN0YXJ0ID09IG51bGwpXG4gICAgICByZXR1cm4gJ0VPRic7XG4gICAgcmV0dXJuIGBsaW5lICR7c3RhcnQubGluZUNvbHVtblswXSArIDF9IGNvbHVtbiAke3N0YXJ0LmxpbmVDb2x1bW5bMV0gKyAxfWA7XG4gIH1cblxuICBpc05leHRUeXBlcyguLi50eXBlczogVFtdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY29tcGFyYXRvciA9IChhOiBUb2tlbjxUPiwgYjogVCkgPT4ge1xuICAgICAgaWYgKGEgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIGEudHlwZSA9PT0gYjtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8VD4odHlwZXMsIGNvbXBhcmF0b3IpO1xuICB9XG5cbiAgaXNOZXh0VG9rZW5UZXh0KC4uLnRleHQ6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY29tcGFyYXRvciA9IChhOiBUb2tlbjxUPiwgYjogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoYSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gYS50ZXh0ID09PSBiO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuX2lzTmV4dDxzdHJpbmc+KHRleHQsIGNvbXBhcmF0b3IpO1xuICB9XG59XG4iXX0=