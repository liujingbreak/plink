"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseParser = exports.TokenFilter = exports.BaseLexer = exports.LookAhead = exports.Token = void 0;
/**
 * @deprecated use LLn-parser instead
 */
var sortedIndex_1 = __importDefault(require("lodash/sortedIndex"));
var Token = /** @class */ (function () {
    function Token(type, lexer, start) {
        this.type = type;
        this.start = start;
        this.text = lexer.getText(start);
        this.end = lexer.position;
        this.lineColumn = lexer.getLineColumn(start);
    }
    return Token;
}());
exports.Token = Token;
var LookAhead = /** @class */ (function () {
    function LookAhead(source) {
        this.currPos = -1;
        this.isString = typeof source === 'string';
        this.cached = [];
        this.sourceIterator = source[Symbol.iterator]();
    }
    Object.defineProperty(LookAhead.prototype, "position", {
        get: function () {
            return this.currPos + 1;
        },
        enumerable: false,
        configurable: true
    });
    /**
       * look ahead for 1 character
       * @param num default is 1
       * @return null if EOF is reached
       */
    LookAhead.prototype.la = function (num) {
        if (num === void 0) { num = 1; }
        var readPos = this.currPos + num;
        return this.read(readPos);
    };
    LookAhead.prototype.lb = function (num) {
        if (num === void 0) { num = 1; }
        var pos = this.currPos - (num - 1);
        if (pos < 0)
            return null;
        return this.read(pos);
    };
    LookAhead.prototype.advance = function (count) {
        if (count === void 0) { count = 1; }
        var current = null;
        for (var i = 0; i < count; i++) {
            current = this.la(1);
            if (current == null)
                this.throwError();
            this.currPos++;
        }
        return current;
    };
    /**
       * Same as `return la(1) === values[0] && la(2) === values[1]...`
       * @param values lookahead string or tokens
       */
    LookAhead.prototype.isNext = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        return this._isNext(values);
    };
    LookAhead.prototype._isNext = function (values, isEqual) {
        if (isEqual === void 0) { isEqual = function (a, b) { return a === b; }; }
        var compareTo;
        var compareFn;
        if (this.isString) {
            compareTo = values.join('');
            compareFn = function (a, b) { return a === b; };
        }
        else {
            compareTo = values;
            compareFn = isEqual;
        }
        var i = 0;
        var l = compareTo.length;
        var next = this.la(i + 1);
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
    };
    LookAhead.prototype.throwError = function (unexpected) {
        if (unexpected === void 0) { unexpected = 'End-of-file'; }
        throw new Error("Unexpected " + JSON.stringify(unexpected) + " at " + this.getCurrentPosInfo());
    };
    /**
       * Do not read postion less than 0
       * @param pos
       */
    LookAhead.prototype.read = function (pos) {
        var cached = this.cached;
        while (cached.length <= pos) {
            var next = this.sourceIterator.next();
            if (next.done)
                return null;
            cached.push(next.value);
        }
        return cached[pos];
    };
    return LookAhead;
}());
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
var BaseLexer = /** @class */ (function (_super) {
    __extends(BaseLexer, _super);
    function BaseLexer(source) {
        var _this = _super.call(this, source) || this;
        _this.source = source;
        _this.lineBeginPositions = [-1];
        var originNext = _this.sourceIterator.next;
        var it = _this.sourceIterator;
        // - Monkey patch iterator's next() method to track beginning position of each line
        var nextCount = 0;
        var self = _this;
        _this.sourceIterator.next = function () {
            var nextRes = originNext.call(it);
            var chr = nextRes.value;
            if (!nextRes.done && chr === '\n')
                self.lineBeginPositions.push(nextCount);
            nextCount++;
            return nextRes;
        };
        return _this;
    }
    BaseLexer.prototype.getText = function (startPos) {
        return this.source.slice(startPos, this.position);
    };
    BaseLexer.prototype.getCurrentPosInfo = function () {
        var _a = __read(this.getLineColumn(this.currPos), 2), line = _a[0], col = _a[1];
        // tslint:disable-next-line:max-line-length
        return "get " + JSON.stringify(this.la()) + ", at line " + (line + 1) + ", column " + (col + 1) + ", after " + JSON.stringify(this.lb());
    };
    /**
       * @return zero-based [line, column] value
       * */
    BaseLexer.prototype.getLineColumn = function (pos) {
        var lineIndex = sortedIndex_1.default(this.lineBeginPositions, pos) - 1;
        var linePos = this.lineBeginPositions[lineIndex];
        return [lineIndex, pos - (linePos + 1)];
    };
    return BaseLexer;
}(LookAhead));
exports.BaseLexer = BaseLexer;
var TokenFilter = /** @class */ (function (_super) {
    __extends(TokenFilter, _super);
    function TokenFilter(lexer, skipType) {
        var _this = _super.call(this, lexer) || this;
        _this.skipType = skipType;
        return _this;
    }
    TokenFilter.prototype[Symbol.iterator] = function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(this.la() != null)) return [3 /*break*/, 4];
                    if (!(this.la().type === this.skipType)) return [3 /*break*/, 1];
                    this.advance();
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, this.la()];
                case 2:
                    _a.sent();
                    this.advance();
                    _a.label = 3;
                case 3: return [3 /*break*/, 0];
                case 4: return [2 /*return*/];
            }
        });
    };
    TokenFilter.prototype.getCurrentPosInfo = function () {
        var start = this.la();
        if (start == null)
            return 'EOF';
        return "line " + (start.lineColumn[0] + 1) + " column " + (start.lineColumn[1] + 1);
    };
    return TokenFilter;
}(LookAhead));
exports.TokenFilter = TokenFilter;
/**
 * TT - token type
 */
var BaseParser = /** @class */ (function (_super) {
    __extends(BaseParser, _super);
    function BaseParser(lexer) {
        var _this = _super.call(this, lexer) || this;
        _this.lexer = lexer;
        return _this;
    }
    BaseParser.prototype.getCurrentPosInfo = function () {
        var start = this.la();
        if (start == null)
            return 'EOF';
        return "line " + (start.lineColumn[0] + 1) + " column " + (start.lineColumn[1] + 1);
    };
    BaseParser.prototype.isNextTypes = function () {
        var types = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            types[_i] = arguments[_i];
        }
        var comparator = function (a, b) {
            if (a == null)
                return false;
            return a.type === b;
        };
        return this._isNext(types, comparator);
    };
    BaseParser.prototype.isNextTokenText = function () {
        var text = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            text[_i] = arguments[_i];
        }
        var comparator = function (a, b) {
            if (a == null)
                return false;
            return a.text === b;
        };
        return this._isNext(text, comparator);
    };
    return BaseParser;
}(LookAhead));
exports.BaseParser = BaseParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7O0dBRUc7QUFDSCxtRUFBNkM7QUFFN0M7SUFLRSxlQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdEMsS0FBYTtRQURILFNBQUksR0FBSixJQUFJLENBQUc7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0gsWUFBQztBQUFELENBQUMsQUFYRCxJQVdDO0FBWFksc0JBQUs7QUFhbEI7SUFRRSxtQkFBWSxNQUFtQjtRQUZyQixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVELHNCQUFJLCtCQUFRO2FBQVo7WUFDRSxPQUFPLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUM7OztPQUFBO0lBRUQ7Ozs7U0FJRTtJQUNGLHNCQUFFLEdBQUYsVUFBRyxHQUFPO1FBQVAsb0JBQUEsRUFBQSxPQUFPO1FBQ1IsSUFBTSxPQUFPLEdBQUcsSUFB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VSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBRSxDQUFDO0lBQzdFLENBQUM7SUFFRCxnQ0FBVyxHQUFYO1FBQVksZUFBYTthQUFiLFVBQWEsRUFBYixxQkFBYSxFQUFiLElBQWE7WUFBYiwwQkFBYTs7UUFDdkIsSUFBTSxVQUFVLEdBQUcsVUFBQyxDQUFXLEVBQUUsQ0FBSTtZQUNuQyxJQUFJLENBQUMsSUFBSSxJQUFJO2dCQUNYLE9BQU8sS0FBSyxDQUFDO1lBQ2YsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUksS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxvQ0FBZSxHQUFmO1FBQWdCLGNBQWlCO2FBQWpCLFVBQWlCLEVBQWpCLHFCQUFpQixFQUFqQixJQUFpQjtZQUFqQix5QkFBaUI7O1FBQy9CLElBQU0sVUFBVSxHQUFHLFVBQUMsQ0FBVyxFQUFFLENBQVM7WUFDeEMsSUFBSSxDQUFDLElBQUksSUFBSTtnQkFDWCxPQUFPLEtBQUssQ0FBQztZQUNmLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFTLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBQ0gsaUJBQUM7QUFBRCxDQUFDLEFBN0JELENBQTRDLFNBQVMsR0E2QnBEO0FBN0JxQixnQ0FBVSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGRlcHJlY2F0ZWQgdXNlIExMbi1wYXJzZXIgaW5zdGVhZFxuICovXG5pbXBvcnQgc29ydGVkSW5kZXggZnJvbSAnbG9kYXNoL3NvcnRlZEluZGV4JztcblxuZXhwb3J0IGNsYXNzIFRva2VuPFQ+IHtcbiAgdGV4dDogc3RyaW5nO1xuICBlbmQ6IG51bWJlcjtcbiAgbGluZUNvbHVtbjogW251bWJlciwgbnVtYmVyXTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgdHlwZTogVCwgbGV4ZXI6IEJhc2VMZXhlcjxUPixcbiAgICBwdWJsaWMgc3RhcnQ6IG51bWJlcikge1xuICAgIHRoaXMudGV4dCA9IGxleGVyLmdldFRleHQoc3RhcnQpO1xuICAgIHRoaXMuZW5kID0gbGV4ZXIucG9zaXRpb247XG4gICAgdGhpcy5saW5lQ29sdW1uID0gbGV4ZXIuZ2V0TGluZUNvbHVtbihzdGFydCk7XG4gIH1cbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIExvb2tBaGVhZDxUPiB7XG4gIGNhY2hlZDogVFtdO1xuICAvLyBjaGFubmVsczoge1tjaGFubmVsOiBzdHJpbmddOiBUW119ID0ge307XG4gIC8vIGNoYW5uZWxQb3M6IHtbY2hhbm5lbDogc3RyaW5nXTogbnVtYmVyfSA9IHt9O1xuICBzb3VyY2VJdGVyYXRvcjogSXRlcmF0b3I8VD47XG4gIGlzU3RyaW5nOiBib29sZWFuO1xuICBwcm90ZWN0ZWQgY3VyclBvcyA9IC0xO1xuXG4gIGNvbnN0cnVjdG9yKHNvdXJjZTogSXRlcmFibGU8VD4pIHtcbiAgICB0aGlzLmlzU3RyaW5nID0gdHlwZW9mIHNvdXJjZSA9PT0gJ3N0cmluZyc7XG4gICAgdGhpcy5jYWNoZWQgPSBbXTtcbiAgICB0aGlzLnNvdXJjZUl0ZXJhdG9yID0gc291cmNlW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgfVxuXG4gIGdldCBwb3NpdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmN1cnJQb3MgKyAxO1xuICB9XG5cbiAgLyoqXG5cdCAqIGxvb2sgYWhlYWQgZm9yIDEgY2hhcmFjdGVyXG5cdCAqIEBwYXJhbSBudW0gZGVmYXVsdCBpcyAxXG5cdCAqIEByZXR1cm4gbnVsbCBpZiBFT0YgaXMgcmVhY2hlZFxuXHQgKi9cbiAgbGEobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgICBjb25zdCByZWFkUG9zID0gdGhpcy5jdXJyUG9zICsgbnVtO1xuICAgIHJldHVybiB0aGlzLnJlYWQocmVhZFBvcyk7XG4gIH1cblxuICBsYihudW0gPSAxKTogVCB8IG51bGwge1xuICAgIGNvbnN0IHBvcyA9IHRoaXMuY3VyclBvcyAtIChudW0gLSAxKTtcbiAgICBpZiAocG9zIDwgMClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0aGlzLnJlYWQocG9zKTtcbiAgfVxuXG4gIGFkdmFuY2UoY291bnQgPSAxKTogVCB8IG51bGwge1xuICAgIGxldCBjdXJyZW50ID0gbnVsbDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgIGN1cnJlbnQgPSB0aGlzLmxhKDEpO1xuICAgICAgaWYgKGN1cnJlbnQgPT0gbnVsbClcbiAgICAgICAgdGhpcy50aHJvd0Vycm9yKCk7XG4gICAgICB0aGlzLmN1cnJQb3MrKztcbiAgICB9XG4gICAgcmV0dXJuIGN1cnJlbnQ7XG4gIH1cblxuICAvKipcblx0ICogU2FtZSBhcyBgcmV0dXJuIGxhKDEpID09PSB2YWx1ZXNbMF0gJiYgbGEoMikgPT09IHZhbHVlc1sxXS4uLmBcblx0ICogQHBhcmFtIHZhbHVlcyBsb29rYWhlYWQgc3RyaW5nIG9yIHRva2Vuc1xuXHQgKi9cbiAgaXNOZXh0KC4uLnZhbHVlczogVFtdKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2lzTmV4dDxUPih2YWx1ZXMpO1xuICB9XG5cbiAgX2lzTmV4dDxDPih2YWx1ZXM6IENbXSwgaXNFcXVhbCA9IChhOiBULCBiOiBDKSA9PiBhIGFzIGFueSA9PT0gYik6IGJvb2xlYW4ge1xuICAgIGxldCBjb21wYXJlVG86IENbXXwgc3RyaW5nO1xuICAgIGxldCBjb21wYXJlRm46ICguLi5hcmc6IGFueVtdKSA9PiBib29sZWFuO1xuICAgIGlmICh0aGlzLmlzU3RyaW5nKSB7XG4gICAgICBjb21wYXJlVG8gPSB2YWx1ZXMuam9pbignJyk7XG4gICAgICBjb21wYXJlRm4gPSAoYTogc3RyaW5nLCBiOiBzdHJpbmcpID0+IGEgPT09IGI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBhcmVUbyA9IHZhbHVlcztcbiAgICAgIGNvbXBhcmVGbiA9IGlzRXF1YWw7XG4gICAgfVxuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBsID0gY29tcGFyZVRvLmxlbmd0aDtcbiAgICBsZXQgbmV4dCA9IHRoaXMubGEoaSArIDEpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoaSA9PT0gbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBuZXh0ID0gdGhpcy5sYShpICsgMSk7XG4gICAgICBpZiAobmV4dCA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIEVPRlxuICAgICAgZWxzZSBpZiAoIWNvbXBhcmVGbihuZXh0LCBjb21wYXJlVG9baV0pKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcih1bmV4cGVjdGVkID0gJ0VuZC1vZi1maWxlJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCAke0pTT04uc3RyaW5naWZ5KHVuZXhwZWN0ZWQpfSBhdCBgICsgdGhpcy5nZXRDdXJyZW50UG9zSW5mbygpKTtcbiAgfVxuXG4gIGFic3RyYWN0IGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZztcblxuICAvKipcblx0ICogRG8gbm90IHJlYWQgcG9zdGlvbiBsZXNzIHRoYW4gMFxuXHQgKiBAcGFyYW0gcG9zIFxuXHQgKi9cbiAgcHJvdGVjdGVkIHJlYWQocG9zOiBudW1iZXIpOiBUIHwgbnVsbCB7XG4gICAgY29uc3QgY2FjaGVkID0gdGhpcy5jYWNoZWQ7XG4gICAgd2hpbGUgKGNhY2hlZC5sZW5ndGggPD0gcG9zKSB7XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy5zb3VyY2VJdGVyYXRvci5uZXh0KCk7XG4gICAgICBpZiAobmV4dC5kb25lKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIGNhY2hlZC5wdXNoKG5leHQudmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gY2FjaGVkW3Bvc107XG4gIH1cbn1cblxuLyoqXG4gKiAxLiBEZWZpbmUgYSBcIlRva2VuVHlwZVwiIGVudW1cbiAqIDIuIEltcGxlbWVudCB5b3VyIG93biBcIkxleGVyXCIgd2hpY2ggZXh0ZW5kcyBcIkJhc2VMZXhlclwiIHdpdGggdHlwZSBwYXJlbWV0ZXIgb2YgeW91ciBlbnVtIFwiVG9rZW5UeXBlXCJcbiAqIDMuIEltcGxlbWVudCBgW1N5bWJvbC5pbnRlcmF0b3JdKClgIGZ1bmN0aW9uIGluIHlvdXIgTGV4ZXI6XG5gYGB0c1xuXHQqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VG9rZW5UeXBlPj4ge1xuXHRcdHdoaWxlICh0aGlzLmxhKCkgIT0gbnVsbCkge1xuXHRcdFx0Y29uc3Qgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXHRcdFx0aWYgKHRoaXMubGEoKSA9PT0gJ1xcbicpIHtcblx0XHRcdFx0dGhpcy5hZHZhbmNlKCk7XG5cdFx0XHRcdHlpZWxkIG5ldyBUb2tlbihUb2tlblR5cGUuRU9MLCB0aGlzLCBzdGFydCk7XG5cdFx0XHR9XG5cdFx0XHQuLi5cblx0XHR9XG5cdH1cbmBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZUxleGVyPFQ+IGV4dGVuZHMgTG9va0FoZWFkPHN0cmluZz4gaW1wbGVtZW50cyBJdGVyYWJsZTxUb2tlbjxUPj4ge1xuICBsaW5lQmVnaW5Qb3NpdGlvbnM6IG51bWJlcltdID0gWy0xXTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgc291cmNlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzb3VyY2UpO1xuICAgIGNvbnN0IG9yaWdpbk5leHQgPSB0aGlzLnNvdXJjZUl0ZXJhdG9yLm5leHQ7XG4gICAgY29uc3QgaXQgPSB0aGlzLnNvdXJjZUl0ZXJhdG9yO1xuICAgIC8vIC0gTW9ua2V5IHBhdGNoIGl0ZXJhdG9yJ3MgbmV4dCgpIG1ldGhvZCB0byB0cmFjayBiZWdpbm5pbmcgcG9zaXRpb24gb2YgZWFjaCBsaW5lXG4gICAgbGV0IG5leHRDb3VudCA9IDA7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5zb3VyY2VJdGVyYXRvci5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBuZXh0UmVzID0gb3JpZ2luTmV4dC5jYWxsKGl0KTtcbiAgICAgIGNvbnN0IGNociA9IG5leHRSZXMudmFsdWU7XG4gICAgICBpZiAoIW5leHRSZXMuZG9uZSAmJiBjaHIgPT09ICdcXG4nKVxuICAgICAgICBzZWxmLmxpbmVCZWdpblBvc2l0aW9ucy5wdXNoKG5leHRDb3VudCk7XG4gICAgICBuZXh0Q291bnQrKztcbiAgICAgIHJldHVybiBuZXh0UmVzO1xuICAgIH07XG4gIH1cblxuICBhYnN0cmFjdCBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUb2tlbjxUPj47XG5cbiAgZ2V0VGV4dChzdGFydFBvczogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlLnNsaWNlKHN0YXJ0UG9zLCB0aGlzLnBvc2l0aW9uKTtcbiAgfVxuXG4gIGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG4gICAgY29uc3QgW2xpbmUsIGNvbF0gPSB0aGlzLmdldExpbmVDb2x1bW4odGhpcy5jdXJyUG9zKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgcmV0dXJuIGBnZXQgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmxhKCkpfSwgYXQgbGluZSAke2xpbmUgKyAxfSwgY29sdW1uICR7Y29sICsgMX0sIGFmdGVyICR7SlNPTi5zdHJpbmdpZnkodGhpcy5sYigpKX1gO1xuICB9XG5cbiAgLyoqXG5cdCAqIEByZXR1cm4gemVyby1iYXNlZCBbbGluZSwgY29sdW1uXSB2YWx1ZVxuXHQgKiAqL1xuICBnZXRMaW5lQ29sdW1uKHBvczogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XG4gICAgY29uc3QgbGluZUluZGV4ID0gc29ydGVkSW5kZXgodGhpcy5saW5lQmVnaW5Qb3NpdGlvbnMsIHBvcykgLSAxO1xuICAgIGNvbnN0IGxpbmVQb3MgPSB0aGlzLmxpbmVCZWdpblBvc2l0aW9uc1tsaW5lSW5kZXhdO1xuICAgIHJldHVybiBbbGluZUluZGV4LCBwb3MgLSAobGluZVBvcyArIDEpXTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5GaWx0ZXI8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8VG9rZW48VD4+IGltcGxlbWVudHMgSXRlcmFibGU8VG9rZW48VD4+IHtcbiAgY29uc3RydWN0b3IobGV4ZXI6IEl0ZXJhYmxlPFRva2VuPFQ+PiwgcHVibGljIHNraXBUeXBlOiBUKSB7XG4gICAgc3VwZXIobGV4ZXIpO1xuICB9XG5cbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFQ+PiB7XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG4gICAgICBpZiAodGhpcy5sYSgpIS50eXBlID09PSB0aGlzLnNraXBUeXBlKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeWllbGQgdGhpcy5sYSgpITtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMubGEoKTtcbiAgICBpZiAoc3RhcnQgPT0gbnVsbClcbiAgICAgIHJldHVybiAnRU9GJztcbiAgICByZXR1cm4gYGxpbmUgJHtzdGFydC5saW5lQ29sdW1uWzBdICsgMX0gY29sdW1uICR7c3RhcnQubGluZUNvbHVtblsxXSArIDF9YDtcbiAgfVxufVxuLyoqXG4gKiBUVCAtIHRva2VuIHR5cGVcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VQYXJzZXI8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8VG9rZW48VD4+IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGxleGVyOiBJdGVyYWJsZTxUb2tlbjxUPj4pIHtcbiAgICBzdXBlcihsZXhlcik7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpO1xuICAgIGlmIChzdGFydCA9PSBudWxsKVxuICAgICAgcmV0dXJuICdFT0YnO1xuICAgIHJldHVybiBgbGluZSAke3N0YXJ0LmxpbmVDb2x1bW5bMF0gKyAxfSBjb2x1bW4gJHtzdGFydC5saW5lQ29sdW1uWzFdICsgMX1gO1xuICB9XG5cbiAgaXNOZXh0VHlwZXMoLi4udHlwZXM6IFRbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3IgPSAoYTogVG9rZW48VD4sIGI6IFQpID0+IHtcbiAgICAgIGlmIChhID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiBhLnR5cGUgPT09IGI7XG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5faXNOZXh0PFQ+KHR5cGVzLCBjb21wYXJhdG9yKTtcbiAgfVxuXG4gIGlzTmV4dFRva2VuVGV4dCguLi50ZXh0OiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3IgPSAoYTogVG9rZW48VD4sIGI6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKGEgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIGEudGV4dCA9PT0gYjtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8c3RyaW5nPih0ZXh0LCBjb21wYXJhdG9yKTtcbiAgfVxufVxuIl19