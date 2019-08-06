"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
var Channel;
(function (Channel) {
    Channel[Channel["normal"] = 0] = "normal";
    Channel[Channel["full"] = 1] = "full";
})(Channel = exports.Channel || (exports.Channel = {}));
var LookAhead = /** @class */ (function () {
    function LookAhead(source) {
        this.channel = Channel.normal;
        this.currPos = -1;
        this.isString = typeof source === 'string';
        this.cached = [];
        this.sourceIterator = source[Symbol.iterator]();
    }
    Object.defineProperty(LookAhead.prototype, "position", {
        get: function () {
            return this.currPos + 1;
        },
        enumerable: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtRUFBNkM7QUFFN0M7SUFLRSxlQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdEMsS0FBYTtRQURILFNBQUksR0FBSixJQUFJLENBQUc7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0gsWUFBQztBQUFELENBQUMsQUFYRCxJQVdDO0FBWFksc0JBQUs7QUFhbEIsSUFBWSxPQUdYO0FBSEQsV0FBWSxPQUFPO0lBQ2pCLHlDQUFNLENBQUE7SUFDTixxQ0FBSSxDQUFBO0FBQ04sQ0FBQyxFQUhXLE9BQU8sR0FBUCxlQUFPLEtBQVAsZUFBTyxRQUdsQjtBQUVEO0lBU0UsbUJBQVksTUFBbUI7UUFIL0IsWUFBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDZixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVELHNCQUFJLCtCQUFRO2FBQVo7WUFDRSxPQUFP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USxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsa0JBQVcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUUsQ0FBQztJQUM3RSxDQUFDO0lBRUQsZ0NBQVcsR0FBWDtRQUFZLGVBQWE7YUFBYixVQUFhLEVBQWIscUJBQWEsRUFBYixJQUFhO1lBQWIsMEJBQWE7O1FBQ3ZCLElBQU0sVUFBVSxHQUFHLFVBQUMsQ0FBVyxFQUFFLENBQUk7WUFDbkMsSUFBSSxDQUFDLElBQUksSUFBSTtnQkFDWCxPQUFPLEtBQUssQ0FBQztZQUNmLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFJLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsb0NBQWUsR0FBZjtRQUFnQixjQUFpQjthQUFqQixVQUFpQixFQUFqQixxQkFBaUIsRUFBakIsSUFBaUI7WUFBakIseUJBQWlCOztRQUMvQixJQUFNLFVBQVUsR0FBRyxVQUFDLENBQVcsRUFBRSxDQUFTO1lBQ3hDLElBQUksQ0FBQyxJQUFJLElBQUk7Z0JBQ1gsT0FBTyxLQUFLLENBQUM7WUFDZixPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO1FBQ3RCLENBQUMsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBUyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUNILGlCQUFDO0FBQUQsQ0FBQyxBQTdCRCxDQUE0QyxTQUFTLEdBNkJwRDtBQTdCcUIsZ0NBQVUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc29ydGVkSW5kZXggZnJvbSAnbG9kYXNoL3NvcnRlZEluZGV4JztcblxuZXhwb3J0IGNsYXNzIFRva2VuPFQ+IHtcbiAgdGV4dDogc3RyaW5nO1xuICBlbmQ6IG51bWJlcjtcbiAgbGluZUNvbHVtbjogW251bWJlciwgbnVtYmVyXTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgdHlwZTogVCwgbGV4ZXI6IEJhc2VMZXhlcjxUPixcbiAgICBwdWJsaWMgc3RhcnQ6IG51bWJlcikge1xuICAgIHRoaXMudGV4dCA9IGxleGVyLmdldFRleHQoc3RhcnQpO1xuICAgIHRoaXMuZW5kID0gbGV4ZXIucG9zaXRpb247XG4gICAgdGhpcy5saW5lQ29sdW1uID0gbGV4ZXIuZ2V0TGluZUNvbHVtbihzdGFydCk7XG4gIH1cbn1cblxuZXhwb3J0IGVudW0gQ2hhbm5lbCB7XG4gIG5vcm1hbCxcbiAgZnVsbFxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTG9va0FoZWFkPFQ+IHtcbiAgY2FjaGVkOiBUW107XG4gIC8vIGNoYW5uZWxzOiB7W2NoYW5uZWw6IHN0cmluZ106IFRbXX0gPSB7fTtcbiAgLy8gY2hhbm5lbFBvczoge1tjaGFubmVsOiBzdHJpbmddOiBudW1iZXJ9ID0ge307XG4gIHNvdXJjZUl0ZXJhdG9yOiBJdGVyYXRvcjxUPjtcbiAgaXNTdHJpbmc6IGJvb2xlYW47XG4gIGNoYW5uZWwgPSBDaGFubmVsLm5vcm1hbDtcbiAgcHJvdGVjdGVkIGN1cnJQb3MgPSAtMTtcblxuICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEl0ZXJhYmxlPFQ+KSB7XG4gICAgdGhpcy5pc1N0cmluZyA9IHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnO1xuICAgIHRoaXMuY2FjaGVkID0gW107XG4gICAgdGhpcy5zb3VyY2VJdGVyYXRvciA9IHNvdXJjZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cblxuICBnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyUG9zICsgMTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBsb29rIGFoZWFkIGZvciAxIGNoYXJhY3RlclxuXHQgKiBAcGFyYW0gbnVtIGRlZmF1bHQgaXMgMVxuXHQgKiBAcmV0dXJuIG51bGwgaWYgRU9GIGlzIHJlYWNoZWRcblx0ICovXG4gIGxhKG51bSA9IDEpOiBUIHwgbnVsbCB7XG4gICAgY29uc3QgcmVhZFBvcyA9IHRoaXMuY3VyclBvcyArIG51bTtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuICB9XG5cbiAgbGIobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgICBjb25zdCBwb3MgPSB0aGlzLmN1cnJQb3MgLSAobnVtIC0gMSk7XG4gICAgaWYgKHBvcyA8IDApXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHBvcyk7XG4gIH1cblxuICBhZHZhbmNlKGNvdW50ID0gMSk6IFQgfCBudWxsIHtcbiAgICBsZXQgY3VycmVudCA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICBjdXJyZW50ID0gdGhpcy5sYSgxKTtcbiAgICAgIGlmIChjdXJyZW50ID09IG51bGwpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcigpO1xuICAgICAgdGhpcy5jdXJyUG9zKys7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50O1xuICB9XG5cbiAgLyoqXG5cdCAqIFNhbWUgYXMgYHJldHVybiBsYSgxKSA9PT0gdmFsdWVzWzBdICYmIGxhKDIpID09PSB2YWx1ZXNbMV0uLi5gXG5cdCAqIEBwYXJhbSB2YWx1ZXMgbG9va2FoZWFkIHN0cmluZyBvciB0b2tlbnNcblx0ICovXG4gIGlzTmV4dCguLi52YWx1ZXM6IFRbXSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8VD4odmFsdWVzKTtcbiAgfVxuXG4gIF9pc05leHQ8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpOiBib29sZWFuIHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcbiAgICBsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcbiAgICBpZiAodGhpcy5pc1N0cmluZykge1xuICAgICAgY29tcGFyZVRvID0gdmFsdWVzLmpvaW4oJycpO1xuICAgICAgY29tcGFyZUZuID0gKGE6IHN0cmluZywgYjogc3RyaW5nKSA9PiBhID09PSBiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wYXJlVG8gPSB2YWx1ZXM7XG4gICAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIH1cbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG4gICAgbGV0IG5leHQgPSB0aGlzLmxhKGkgKyAxKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgbmV4dCA9IHRoaXMubGEoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3IodW5leHBlY3RlZCA9ICdFbmQtb2YtZmlsZScpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeSh1bmV4cGVjdGVkKX0gYXQgYCArIHRoaXMuZ2V0Q3VycmVudFBvc0luZm8oKSk7XG4gIH1cblxuICBhYnN0cmFjdCBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmc7XG5cbiAgLyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG4gIHByb3RlY3RlZCByZWFkKHBvczogbnVtYmVyKTogVCB8IG51bGwge1xuICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuY2FjaGVkO1xuICAgIHdoaWxlIChjYWNoZWQubGVuZ3RoIDw9IHBvcykge1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCgpO1xuICAgICAgaWYgKG5leHQuZG9uZSlcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICBjYWNoZWQucHVzaChuZXh0LnZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGNhY2hlZFtwb3NdO1xuICB9XG59XG5cbi8qKlxuICogMS4gRGVmaW5lIGEgXCJUb2tlblR5cGVcIiBlbnVtXG4gKiAyLiBJbXBsZW1lbnQgeW91ciBvd24gXCJMZXhlclwiIHdoaWNoIGV4dGVuZHMgXCJCYXNlTGV4ZXJcIiB3aXRoIHR5cGUgcGFyZW1ldGVyIG9mIHlvdXIgZW51bSBcIlRva2VuVHlwZVwiXG4gKiAzLiBJbXBsZW1lbnQgYFtTeW1ib2wuaW50ZXJhdG9yXSgpYCBmdW5jdGlvbiBpbiB5b3VyIExleGVyOlxuYGBgdHNcblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFRva2VuVHlwZT4+IHtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT09ICdcXG4nKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oVG9rZW5UeXBlLkVPTCwgdGhpcywgc3RhcnQpO1xuXHRcdFx0fVxuXHRcdFx0Li4uXG5cdFx0fVxuXHR9XG5gYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VMZXhlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxzdHJpbmc+IGltcGxlbWVudHMgSXRlcmFibGU8VG9rZW48VD4+IHtcbiAgbGluZUJlZ2luUG9zaXRpb25zOiBudW1iZXJbXSA9IFstMV07XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHNvdXJjZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoc291cmNlKTtcbiAgICBjb25zdCBvcmlnaW5OZXh0ID0gdGhpcy5zb3VyY2VJdGVyYXRvci5uZXh0O1xuICAgIGNvbnN0IGl0ID0gdGhpcy5zb3VyY2VJdGVyYXRvcjtcbiAgICAvLyAtIE1vbmtleSBwYXRjaCBpdGVyYXRvcidzIG5leHQoKSBtZXRob2QgdG8gdHJhY2sgYmVnaW5uaW5nIHBvc2l0aW9uIG9mIGVhY2ggbGluZVxuICAgIGxldCBuZXh0Q291bnQgPSAwO1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgbmV4dFJlcyA9IG9yaWdpbk5leHQuY2FsbChpdCk7XG4gICAgICBjb25zdCBjaHIgPSBuZXh0UmVzLnZhbHVlO1xuICAgICAgaWYgKCFuZXh0UmVzLmRvbmUgJiYgY2hyID09PSAnXFxuJylcbiAgICAgICAgc2VsZi5saW5lQmVnaW5Qb3NpdGlvbnMucHVzaChuZXh0Q291bnQpO1xuICAgICAgbmV4dENvdW50Kys7XG4gICAgICByZXR1cm4gbmV4dFJlcztcbiAgICB9O1xuICB9XG5cbiAgYWJzdHJhY3QgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VD4+O1xuXG4gIGdldFRleHQoc3RhcnRQb3M6IG51bWJlcikge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5zbGljZShzdGFydFBvcywgdGhpcy5wb3NpdGlvbik7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IFtsaW5lLCBjb2xdID0gdGhpcy5nZXRMaW5lQ29sdW1uKHRoaXMuY3VyclBvcyk7XG4gICAgcmV0dXJuIGBnZXQgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmxhKCkpfSwgYXQgbGluZSAke2xpbmUgKyAxfSwgY29sdW1uICR7Y29sICsgMX0sIGFmdGVyICR7SlNPTi5zdHJpbmdpZnkodGhpcy5sYigpKX1gO1xuICB9XG5cbiAgLyoqXG5cdCAqIEByZXR1cm4gemVyby1iYXNlZCBbbGluZSwgY29sdW1uXSB2YWx1ZVxuXHQgKiAqL1xuICBnZXRMaW5lQ29sdW1uKHBvczogbnVtYmVyKTogW251bWJlciwgbnVtYmVyXSB7XG4gICAgY29uc3QgbGluZUluZGV4ID0gc29ydGVkSW5kZXgodGhpcy5saW5lQmVnaW5Qb3NpdGlvbnMsIHBvcykgLSAxO1xuICAgIGNvbnN0IGxpbmVQb3MgPSB0aGlzLmxpbmVCZWdpblBvc2l0aW9uc1tsaW5lSW5kZXhdO1xuICAgIHJldHVybiBbbGluZUluZGV4LCBwb3MgLSAobGluZVBvcyArIDEpXTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5GaWx0ZXI8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8VG9rZW48VD4+IGltcGxlbWVudHMgSXRlcmFibGU8VG9rZW48VD4+IHtcbiAgY29uc3RydWN0b3IobGV4ZXI6IEl0ZXJhYmxlPFRva2VuPFQ+PiwgcHVibGljIHNraXBUeXBlOiBUKSB7XG4gICAgc3VwZXIobGV4ZXIpO1xuICB9XG5cbiAgKltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFQ+PiB7XG4gICAgd2hpbGUgKHRoaXMubGEoKSAhPSBudWxsKSB7XG4gICAgICBpZiAodGhpcy5sYSgpIS50eXBlID09PSB0aGlzLnNraXBUeXBlKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeWllbGQgdGhpcy5sYSgpITtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0Q3VycmVudFBvc0luZm8oKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMubGEoKTtcbiAgICBpZiAoc3RhcnQgPT0gbnVsbClcbiAgICAgIHJldHVybiAnRU9GJztcbiAgICByZXR1cm4gYGxpbmUgJHtzdGFydC5saW5lQ29sdW1uWzBdICsgMX0gY29sdW1uICR7c3RhcnQubGluZUNvbHVtblsxXSArIDF9YDtcbiAgfVxufVxuLyoqXG4gKiBUVCAtIHRva2VuIHR5cGVcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VQYXJzZXI8VD4gZXh0ZW5kcyBMb29rQWhlYWQ8VG9rZW48VD4+IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGxleGVyOiBJdGVyYWJsZTxUb2tlbjxUPj4pIHtcbiAgICBzdXBlcihsZXhlcik7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpO1xuICAgIGlmIChzdGFydCA9PSBudWxsKVxuICAgICAgcmV0dXJuICdFT0YnO1xuICAgIHJldHVybiBgbGluZSAke3N0YXJ0LmxpbmVDb2x1bW5bMF0gKyAxfSBjb2x1bW4gJHtzdGFydC5saW5lQ29sdW1uWzFdICsgMX1gO1xuICB9XG5cbiAgaXNOZXh0VHlwZXMoLi4udHlwZXM6IFRbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3IgPSAoYTogVG9rZW48VD4sIGI6IFQpID0+IHtcbiAgICAgIGlmIChhID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiBhLnR5cGUgPT09IGI7XG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5faXNOZXh0PFQ+KHR5cGVzLCBjb21wYXJhdG9yKTtcbiAgfVxuXG4gIGlzTmV4dFRva2VuVGV4dCguLi50ZXh0OiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3IgPSAoYTogVG9rZW48VD4sIGI6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKGEgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIGEudGV4dCA9PT0gYjtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8c3RyaW5nPih0ZXh0LCBjb21wYXJhdG9yKTtcbiAgfVxufVxuIl19