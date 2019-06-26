"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEscUVBQTZDO0FBRTdDLE1BQWEsS0FBSztJQUtqQixZQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdkMsS0FBYTtRQURGLFNBQUksR0FBSixJQUFJLENBQUc7UUFDbEIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBQ0Q7QUFYRCxzQkFXQztBQUVELElBQVksT0FHWDtBQUhELFdBQVksT0FBTztJQUNsQix5Q0FBTSxDQUFBO0lBQ04scUNBQUksQ0FBQTtBQUNMLENBQUMsRUFIVyxPQUFPLEdBQVAsZUFBTyxLQUFQLGVBQU8sUUFHbEI7QUFFRCxNQUFzQixTQUFTO0lBUzlCLFlBQVksTUFBbUI7UUFIL0IsWUFBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDZixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDakQsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxFQUFFLENB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QUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsZUFBZSxDQUFDLEdBQUcsSUFBYztRQUNoQyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQVcsRUFBRSxDQUFTLEVBQUUsRUFBRTtZQUM3QyxJQUFJLENBQUMsSUFBSSxJQUFJO2dCQUNaLE9BQU8sS0FBSyxDQUFDO1lBQ2QsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUNyQixDQUFDLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQyxPQUFPLENBQVMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRDtBQTdCRCxnQ0E2QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc29ydGVkSW5kZXggZnJvbSAnbG9kYXNoL3NvcnRlZEluZGV4JztcblxuZXhwb3J0IGNsYXNzIFRva2VuPFQ+IHtcblx0dGV4dDogc3RyaW5nO1xuXHRlbmQ6IG51bWJlcjtcblx0bGluZUNvbHVtbjogW251bWJlciwgbnVtYmVyXTtcblxuXHRjb25zdHJ1Y3RvcihwdWJsaWMgdHlwZTogVCwgbGV4ZXI6IEJhc2VMZXhlcjxUPixcblx0XHRwdWJsaWMgc3RhcnQ6IG51bWJlcikge1xuXHRcdHRoaXMudGV4dCA9IGxleGVyLmdldFRleHQoc3RhcnQpO1xuXHRcdHRoaXMuZW5kID0gbGV4ZXIucG9zaXRpb247XG5cdFx0dGhpcy5saW5lQ29sdW1uID0gbGV4ZXIuZ2V0TGluZUNvbHVtbihzdGFydCk7XG5cdH1cbn1cblxuZXhwb3J0IGVudW0gQ2hhbm5lbCB7XG5cdG5vcm1hbCxcblx0ZnVsbFxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTG9va0FoZWFkPFQ+IHtcblx0Y2FjaGVkOiBUW107XG5cdC8vIGNoYW5uZWxzOiB7W2NoYW5uZWw6IHN0cmluZ106IFRbXX0gPSB7fTtcblx0Ly8gY2hhbm5lbFBvczoge1tjaGFubmVsOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG5cdHNvdXJjZUl0ZXJhdG9yOiBJdGVyYXRvcjxUPjtcblx0aXNTdHJpbmc6IGJvb2xlYW47XG5cdGNoYW5uZWwgPSBDaGFubmVsLm5vcm1hbDtcblx0cHJvdGVjdGVkIGN1cnJQb3MgPSAtMTtcblxuXHRjb25zdHJ1Y3Rvcihzb3VyY2U6IEl0ZXJhYmxlPFQ+KSB7XG5cdFx0dGhpcy5pc1N0cmluZyA9IHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnO1xuXHRcdHRoaXMuY2FjaGVkID0gW107XG5cdFx0dGhpcy5zb3VyY2VJdGVyYXRvciA9IHNvdXJjZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG5cdH1cblxuXHRnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcblx0XHRyZXR1cm4gdGhpcy5jdXJyUG9zICsgMTtcblx0fVxuXG5cdC8qKlxuXHQgKiBsb29rIGFoZWFkIGZvciAxIGNoYXJhY3RlclxuXHQgKiBAcGFyYW0gbnVtIGRlZmF1bHQgaXMgMVxuXHQgKiBAcmV0dXJuIG51bGwgaWYgRU9GIGlzIHJlYWNoZWRcblx0ICovXG5cdGxhKG51bSA9IDEpOiBUIHwgbnVsbCB7XG5cdFx0Y29uc3QgcmVhZFBvcyA9IHRoaXMuY3VyclBvcyArIG51bTtcblx0XHRyZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuXHR9XG5cblx0bGIobnVtID0gMSk6IFQgfCBudWxsIHtcblx0XHRjb25zdCBwb3MgPSB0aGlzLmN1cnJQb3MgLSAobnVtIC0gMSk7XG5cdFx0aWYgKHBvcyA8IDApXG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRyZXR1cm4gdGhpcy5yZWFkKHBvcyk7XG5cdH1cblxuXHRhZHZhbmNlKGNvdW50ID0gMSk6IFQgfCBudWxsIHtcblx0XHRsZXQgY3VycmVudCA9IG51bGw7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG5cdFx0XHRjdXJyZW50ID0gdGhpcy5sYSgxKTtcblx0XHRcdGlmIChjdXJyZW50ID09IG51bGwpXG5cdFx0XHRcdHRoaXMudGhyb3dFcnJvcigpO1xuXHRcdFx0dGhpcy5jdXJyUG9zKys7XG5cdFx0fVxuXHRcdHJldHVybiBjdXJyZW50O1xuXHR9XG5cblx0LyoqXG5cdCAqIFNhbWUgYXMgYHJldHVybiBsYSgxKSA9PT0gdmFsdWVzWzBdICYmIGxhKDIpID09PSB2YWx1ZXNbMV0uLi5gXG5cdCAqIEBwYXJhbSB2YWx1ZXMgbG9va2FoZWFkIHN0cmluZyBvciB0b2tlbnNcblx0ICovXG5cdGlzTmV4dCguLi52YWx1ZXM6IFRbXSk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiB0aGlzLl9pc05leHQ8VD4odmFsdWVzKTtcblx0fVxuXG5cdF9pc05leHQ8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpOiBib29sZWFuIHtcblx0XHRsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcblx0XHRsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcblx0XHRpZiAodGhpcy5pc1N0cmluZykge1xuXHRcdFx0Y29tcGFyZVRvID0gdmFsdWVzLmpvaW4oJycpO1xuXHRcdFx0Y29tcGFyZUZuID0gKGE6IHN0cmluZywgYjogc3RyaW5nKSA9PiBhID09PSBiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb21wYXJlVG8gPSB2YWx1ZXM7XG5cdFx0XHRjb21wYXJlRm4gPSBpc0VxdWFsO1xuXHRcdH1cblx0XHRsZXQgaSA9IDA7XG5cdFx0Y29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG5cdFx0bGV0IG5leHQgPSB0aGlzLmxhKGkgKyAxKTtcblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0aWYgKGkgPT09IGwpXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0bmV4dCA9IHRoaXMubGEoaSArIDEpO1xuXHRcdFx0aWYgKG5leHQgPT0gbnVsbClcblx0XHRcdFx0cmV0dXJuIGZhbHNlOyAvLyBFT0Zcblx0XHRcdGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0aSsrO1xuXHRcdH1cblx0fVxuXG5cdHRocm93RXJyb3IodW5leHBlY3RlZCA9ICdFbmQtb2YtZmlsZScpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeSh1bmV4cGVjdGVkKX0gYXQgYCArIHRoaXMuZ2V0Q3VycmVudFBvc0luZm8oKSk7XG5cdH1cblxuXHRhYnN0cmFjdCBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmc7XG5cblx0LyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG5cdHByb3RlY3RlZCByZWFkKHBvczogbnVtYmVyKTogVCB8IG51bGwge1xuXHRcdGNvbnN0IGNhY2hlZCA9IHRoaXMuY2FjaGVkO1xuXHRcdHdoaWxlIChjYWNoZWQubGVuZ3RoIDw9IHBvcykge1xuXHRcdFx0Y29uc3QgbmV4dCA9IHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCgpO1xuXHRcdFx0aWYgKG5leHQuZG9uZSlcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRjYWNoZWQucHVzaChuZXh0LnZhbHVlKTtcblx0XHR9XG5cdFx0cmV0dXJuIGNhY2hlZFtwb3NdO1xuXHR9XG59XG5cbi8qKlxuICogMS4gRGVmaW5lIGEgXCJUb2tlblR5cGVcIiBlbnVtXG4gKiAyLiBJbXBsZW1lbnQgeW91ciBvd24gXCJMZXhlclwiIHdoaWNoIGV4dGVuZHMgXCJCYXNlTGV4ZXJcIiB3aXRoIHR5cGUgcGFyZW1ldGVyIG9mIHlvdXIgZW51bSBcIlRva2VuVHlwZVwiXG4gKiAzLiBJbXBsZW1lbnQgYFtTeW1ib2wuaW50ZXJhdG9yXSgpYCBmdW5jdGlvbiBpbiB5b3VyIExleGVyOlxuYGBgdHNcblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFRva2VuVHlwZT4+IHtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT09ICdcXG4nKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oVG9rZW5UeXBlLkVPTCwgdGhpcywgc3RhcnQpO1xuXHRcdFx0fVxuXHRcdFx0Li4uXG5cdFx0fVxuXHR9XG5gYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VMZXhlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxzdHJpbmc+IGltcGxlbWVudHMgSXRlcmFibGU8VG9rZW48VD4+IHtcblx0bGluZUJlZ2luUG9zaXRpb25zOiBudW1iZXJbXSA9IFstMV07XG5cblx0Y29uc3RydWN0b3IocHJvdGVjdGVkIHNvdXJjZTogc3RyaW5nKSB7XG5cdFx0c3VwZXIoc291cmNlKTtcblx0XHRjb25zdCBvcmlnaW5OZXh0ID0gdGhpcy5zb3VyY2VJdGVyYXRvci5uZXh0O1xuXHRcdGNvbnN0IGl0ID0gdGhpcy5zb3VyY2VJdGVyYXRvcjtcblx0XHQvLyAtIE1vbmtleSBwYXRjaCBpdGVyYXRvcidzIG5leHQoKSBtZXRob2QgdG8gdHJhY2sgYmVnaW5uaW5nIHBvc2l0aW9uIG9mIGVhY2ggbGluZVxuXHRcdGxldCBuZXh0Q291bnQgPSAwO1xuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc3QgbmV4dFJlcyA9IG9yaWdpbk5leHQuY2FsbChpdCk7XG5cdFx0XHRjb25zdCBjaHIgPSBuZXh0UmVzLnZhbHVlO1xuXHRcdFx0aWYgKCFuZXh0UmVzLmRvbmUgJiYgY2hyID09PSAnXFxuJylcblx0XHRcdFx0c2VsZi5saW5lQmVnaW5Qb3NpdGlvbnMucHVzaChuZXh0Q291bnQpO1xuXHRcdFx0bmV4dENvdW50Kys7XG5cdFx0XHRyZXR1cm4gbmV4dFJlcztcblx0XHR9O1xuXHR9XG5cblx0YWJzdHJhY3QgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VD4+O1xuXG5cdGdldFRleHQoc3RhcnRQb3M6IG51bWJlcikge1xuXHRcdHJldHVybiB0aGlzLnNvdXJjZS5zbGljZShzdGFydFBvcywgdGhpcy5wb3NpdGlvbik7XG5cdH1cblxuXHRnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuXHRcdGNvbnN0IFtsaW5lLCBjb2xdID0gdGhpcy5nZXRMaW5lQ29sdW1uKHRoaXMuY3VyclBvcyk7XG5cdFx0cmV0dXJuIGBnZXQgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmxhKCkpfSwgYXQgbGluZSAke2xpbmUgKyAxfSwgY29sdW1uICR7Y29sICsgMX0sIGFmdGVyICR7SlNPTi5zdHJpbmdpZnkodGhpcy5sYigpKX1gO1xuXHR9XG5cblx0LyoqXG5cdCAqIEByZXR1cm4gemVyby1iYXNlZCBbbGluZSwgY29sdW1uXSB2YWx1ZVxuXHQgKiAqL1xuXHRnZXRMaW5lQ29sdW1uKHBvczogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XG5cdFx0Y29uc3QgbGluZUluZGV4ID0gc29ydGVkSW5kZXgodGhpcy5saW5lQmVnaW5Qb3NpdGlvbnMsIHBvcykgLSAxO1xuXHRcdGNvbnN0IGxpbmVQb3MgPSB0aGlzLmxpbmVCZWdpblBvc2l0aW9uc1tsaW5lSW5kZXhdO1xuXHRcdHJldHVybiBbbGluZUluZGV4LCBwb3MgLSAobGluZVBvcyArIDEpXTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5GaWx0ZXI8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8VG9rZW48VD4+IGltcGxlbWVudHMgSXRlcmFibGU8VG9rZW48VD4+IHtcblx0Y29uc3RydWN0b3IobGV4ZXI6IEl0ZXJhYmxlPFRva2VuPFQ+PiwgcHVibGljIHNraXBUeXBlOiBUKSB7XG5cdFx0c3VwZXIobGV4ZXIpO1xuXHR9XG5cblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFQ+PiB7XG5cdFx0d2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG5cdFx0XHRpZiAodGhpcy5sYSgpIS50eXBlID09PSB0aGlzLnNraXBUeXBlKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0eWllbGQgdGhpcy5sYSgpITtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Z2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcblx0XHRjb25zdCBzdGFydCA9IHRoaXMubGEoKTtcblx0XHRpZiAoc3RhcnQgPT0gbnVsbClcblx0XHRcdHJldHVybiAnRU9GJztcblx0XHRyZXR1cm4gYGxpbmUgJHtzdGFydC5saW5lQ29sdW1uWzBdICsgMX0gY29sdW1uICR7c3RhcnQubGluZUNvbHVtblsxXSArIDF9YDtcblx0fVxufVxuLyoqXG4gKiBUVCAtIHRva2VuIHR5cGVcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VQYXJzZXI8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8VG9rZW48VD4+IHtcblx0Y29uc3RydWN0b3IocHJvdGVjdGVkIGxleGVyOiBJdGVyYWJsZTxUb2tlbjxUPj4pIHtcblx0XHRzdXBlcihsZXhlcik7XG5cdH1cblxuXHRnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuXHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpO1xuXHRcdGlmIChzdGFydCA9PSBudWxsKVxuXHRcdFx0cmV0dXJuICdFT0YnO1xuXHRcdHJldHVybiBgbGluZSAke3N0YXJ0LmxpbmVDb2x1bW5bMF0gKyAxfSBjb2x1bW4gJHtzdGFydC5saW5lQ29sdW1uWzFdICsgMX1gO1xuXHR9XG5cblx0aXNOZXh0VHlwZXMoLi4udHlwZXM6IFRbXSk6IGJvb2xlYW4ge1xuXHRcdGNvbnN0IGNvbXBhcmF0b3IgPSAoYTogVG9rZW48VD4sIGI6IFQpID0+IHtcblx0XHRcdGlmIChhID09IG51bGwpXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdHJldHVybiBhLnR5cGUgPT09IGI7XG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5faXNOZXh0PFQ+KHR5cGVzLCBjb21wYXJhdG9yKTtcblx0fVxuXG5cdGlzTmV4dFRva2VuVGV4dCguLi50ZXh0OiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuXHRcdGNvbnN0IGNvbXBhcmF0b3IgPSAoYTogVG9rZW48VD4sIGI6IHN0cmluZykgPT4ge1xuXHRcdFx0aWYgKGEgPT0gbnVsbClcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0cmV0dXJuIGEudGV4dCA9PT0gYjtcblx0XHR9O1xuXHRcdHJldHVybiB0aGlzLl9pc05leHQ8c3RyaW5nPih0ZXh0LCBjb21wYXJhdG9yKTtcblx0fVxufVxuIl19