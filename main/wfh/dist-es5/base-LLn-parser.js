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
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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
        // eslint-disable-next-line max-len
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0RBQXdEO0FBQ3hELCtEQUErRDtBQUMvRCw0REFBNEQ7QUFDNUQ7O0dBRUc7QUFDSCxtRUFBNkM7QUFFN0M7SUFLRSxlQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdEMsS0FBYTtRQURILFNBQUksR0FBSixJQUFJLENBQUc7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0gsWUFBQztBQUFELENBQUMsQUFYRCxJQVdDO0FBWFksc0JBQUs7QUFhbEI7SUFRRSxtQkFBWSxNQUFtQjtRQUZyQixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVELHNCQUFJLCtCQUFRO2FBQVo7WUFDRSxPQUFPLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUM7OztPQUFBO0lBRUQ7Ozs7U0FJRTtJQUNGLHNCQUFFLEdBQUYsVUFBRyxHQUFPO1FBQVAs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QUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFXLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFFLENBQUM7SUFDN0UsQ0FBQztJQUVELGdDQUFXLEdBQVg7UUFBWSxlQUFhO2FBQWIsVUFBYSxFQUFiLHFCQUFhLEVBQWIsSUFBYTtZQUFiLDBCQUFhOztRQUN2QixJQUFNLFVBQVUsR0FBRyxVQUFDLENBQVcsRUFBRSxDQUFJO1lBQ25DLElBQUksQ0FBQyxJQUFJLElBQUk7Z0JBQ1gsT0FBTyxLQUFLLENBQUM7WUFDZixPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO1FBQ3RCLENBQUMsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBSSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELG9DQUFlLEdBQWY7UUFBZ0IsY0FBaUI7YUFBakIsVUFBaUIsRUFBakIscUJBQWlCLEVBQWpCLElBQWlCO1lBQWpCLHlCQUFpQjs7UUFDL0IsSUFBTSxVQUFVLEdBQUcsVUFBQyxDQUFXLEVBQUUsQ0FBUztZQUN4QyxJQUFJLENBQUMsSUFBSSxJQUFJO2dCQUNYLE9BQU8sS0FBSyxDQUFDO1lBQ2YsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQyxPQUFPLENBQVMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFDSCxpQkFBQztBQUFELENBQUMsQUE3QkQsQ0FBNEMsU0FBUyxHQTZCcEQ7QUE3QnFCLGdDQUFVIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4gKi9cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2VzcyAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG4vKipcbiAqIEBkZXByZWNhdGVkIHVzZSBMTG4tcGFyc2VyIGluc3RlYWRcbiAqL1xuaW1wb3J0IHNvcnRlZEluZGV4IGZyb20gJ2xvZGFzaC9zb3J0ZWRJbmRleCc7XG5cbmV4cG9ydCBjbGFzcyBUb2tlbjxUPiB7XG4gIHRleHQ6IHN0cmluZztcbiAgZW5kOiBudW1iZXI7XG4gIGxpbmVDb2x1bW46IFtudW1iZXIsIG51bWJlcl07XG5cbiAgY29uc3RydWN0b3IocHVibGljIHR5cGU6IFQsIGxleGVyOiBCYXNlTGV4ZXI8VD4sXG4gICAgcHVibGljIHN0YXJ0OiBudW1iZXIpIHtcbiAgICB0aGlzLnRleHQgPSBsZXhlci5nZXRUZXh0KHN0YXJ0KTtcbiAgICB0aGlzLmVuZCA9IGxleGVyLnBvc2l0aW9uO1xuICAgIHRoaXMubGluZUNvbHVtbiA9IGxleGVyLmdldExpbmVDb2x1bW4oc3RhcnQpO1xuICB9XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMb29rQWhlYWQ8VD4ge1xuICBjYWNoZWQ6IFRbXTtcbiAgLy8gY2hhbm5lbHM6IHtbY2hhbm5lbDogc3RyaW5nXTogVFtdfSA9IHt9O1xuICAvLyBjaGFubmVsUG9zOiB7W2NoYW5uZWw6IHN0cmluZ106IG51bWJlcn0gPSB7fTtcbiAgc291cmNlSXRlcmF0b3I6IEl0ZXJhdG9yPFQ+O1xuICBpc1N0cmluZzogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIGN1cnJQb3MgPSAtMTtcblxuICBjb25zdHJ1Y3Rvcihzb3VyY2U6IEl0ZXJhYmxlPFQ+KSB7XG4gICAgdGhpcy5pc1N0cmluZyA9IHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnO1xuICAgIHRoaXMuY2FjaGVkID0gW107XG4gICAgdGhpcy5zb3VyY2VJdGVyYXRvciA9IHNvdXJjZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cblxuICBnZXQgcG9zaXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyUG9zICsgMTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBsb29rIGFoZWFkIGZvciAxIGNoYXJhY3RlclxuXHQgKiBAcGFyYW0gbnVtIGRlZmF1bHQgaXMgMVxuXHQgKiBAcmV0dXJuIG51bGwgaWYgRU9GIGlzIHJlYWNoZWRcblx0ICovXG4gIGxhKG51bSA9IDEpOiBUIHwgbnVsbCB7XG4gICAgY29uc3QgcmVhZFBvcyA9IHRoaXMuY3VyclBvcyArIG51bTtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHJlYWRQb3MpO1xuICB9XG5cbiAgbGIobnVtID0gMSk6IFQgfCBudWxsIHtcbiAgICBjb25zdCBwb3MgPSB0aGlzLmN1cnJQb3MgLSAobnVtIC0gMSk7XG4gICAgaWYgKHBvcyA8IDApXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5yZWFkKHBvcyk7XG4gIH1cblxuICBhZHZhbmNlKGNvdW50ID0gMSk6IFQgfCBudWxsIHtcbiAgICBsZXQgY3VycmVudCA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICBjdXJyZW50ID0gdGhpcy5sYSgxKTtcbiAgICAgIGlmIChjdXJyZW50ID09IG51bGwpXG4gICAgICAgIHRoaXMudGhyb3dFcnJvcigpO1xuICAgICAgdGhpcy5jdXJyUG9zKys7XG4gICAgfVxuICAgIHJldHVybiBjdXJyZW50O1xuICB9XG5cbiAgLyoqXG5cdCAqIFNhbWUgYXMgYHJldHVybiBsYSgxKSA9PT0gdmFsdWVzWzBdICYmIGxhKDIpID09PSB2YWx1ZXNbMV0uLi5gXG5cdCAqIEBwYXJhbSB2YWx1ZXMgbG9va2FoZWFkIHN0cmluZyBvciB0b2tlbnNcblx0ICovXG4gIGlzTmV4dCguLi52YWx1ZXM6IFRbXSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8VD4odmFsdWVzKTtcbiAgfVxuXG4gIF9pc05leHQ8Qz4odmFsdWVzOiBDW10sIGlzRXF1YWwgPSAoYTogVCwgYjogQykgPT4gYSBhcyBhbnkgPT09IGIpOiBib29sZWFuIHtcbiAgICBsZXQgY29tcGFyZVRvOiBDW118IHN0cmluZztcbiAgICBsZXQgY29tcGFyZUZuOiAoLi4uYXJnOiBhbnlbXSkgPT4gYm9vbGVhbjtcbiAgICBpZiAodGhpcy5pc1N0cmluZykge1xuICAgICAgY29tcGFyZVRvID0gdmFsdWVzLmpvaW4oJycpO1xuICAgICAgY29tcGFyZUZuID0gKGE6IHN0cmluZywgYjogc3RyaW5nKSA9PiBhID09PSBiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wYXJlVG8gPSB2YWx1ZXM7XG4gICAgICBjb21wYXJlRm4gPSBpc0VxdWFsO1xuICAgIH1cbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgbCA9IGNvbXBhcmVUby5sZW5ndGg7XG4gICAgbGV0IG5leHQgPSB0aGlzLmxhKGkgKyAxKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGkgPT09IGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgbmV4dCA9IHRoaXMubGEoaSArIDEpO1xuICAgICAgaWYgKG5leHQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBFT0ZcbiAgICAgIGVsc2UgaWYgKCFjb21wYXJlRm4obmV4dCwgY29tcGFyZVRvW2ldKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3IodW5leHBlY3RlZCA9ICdFbmQtb2YtZmlsZScpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeSh1bmV4cGVjdGVkKX0gYXQgYCArIHRoaXMuZ2V0Q3VycmVudFBvc0luZm8oKSk7XG4gIH1cblxuICBhYnN0cmFjdCBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmc7XG5cbiAgLyoqXG5cdCAqIERvIG5vdCByZWFkIHBvc3Rpb24gbGVzcyB0aGFuIDBcblx0ICogQHBhcmFtIHBvcyBcblx0ICovXG4gIHByb3RlY3RlZCByZWFkKHBvczogbnVtYmVyKTogVCB8IG51bGwge1xuICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuY2FjaGVkO1xuICAgIHdoaWxlIChjYWNoZWQubGVuZ3RoIDw9IHBvcykge1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCgpO1xuICAgICAgaWYgKG5leHQuZG9uZSlcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICBjYWNoZWQucHVzaChuZXh0LnZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGNhY2hlZFtwb3NdO1xuICB9XG59XG5cbi8qKlxuICogMS4gRGVmaW5lIGEgXCJUb2tlblR5cGVcIiBlbnVtXG4gKiAyLiBJbXBsZW1lbnQgeW91ciBvd24gXCJMZXhlclwiIHdoaWNoIGV4dGVuZHMgXCJCYXNlTGV4ZXJcIiB3aXRoIHR5cGUgcGFyZW1ldGVyIG9mIHlvdXIgZW51bSBcIlRva2VuVHlwZVwiXG4gKiAzLiBJbXBsZW1lbnQgYFtTeW1ib2wuaW50ZXJhdG9yXSgpYCBmdW5jdGlvbiBpbiB5b3VyIExleGVyOlxuYGBgdHNcblx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRva2VuPFRva2VuVHlwZT4+IHtcblx0XHR3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcblx0XHRcdGNvbnN0IHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblx0XHRcdGlmICh0aGlzLmxhKCkgPT09ICdcXG4nKSB7XG5cdFx0XHRcdHRoaXMuYWR2YW5jZSgpO1xuXHRcdFx0XHR5aWVsZCBuZXcgVG9rZW4oVG9rZW5UeXBlLkVPTCwgdGhpcywgc3RhcnQpO1xuXHRcdFx0fVxuXHRcdFx0Li4uXG5cdFx0fVxuXHR9XG5gYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VMZXhlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxzdHJpbmc+IGltcGxlbWVudHMgSXRlcmFibGU8VG9rZW48VD4+IHtcbiAgbGluZUJlZ2luUG9zaXRpb25zOiBudW1iZXJbXSA9IFstMV07XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHNvdXJjZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoc291cmNlKTtcbiAgICBjb25zdCBvcmlnaW5OZXh0ID0gdGhpcy5zb3VyY2VJdGVyYXRvci5uZXh0O1xuICAgIGNvbnN0IGl0ID0gdGhpcy5zb3VyY2VJdGVyYXRvcjtcbiAgICAvLyAtIE1vbmtleSBwYXRjaCBpdGVyYXRvcidzIG5leHQoKSBtZXRob2QgdG8gdHJhY2sgYmVnaW5uaW5nIHBvc2l0aW9uIG9mIGVhY2ggbGluZVxuICAgIGxldCBuZXh0Q291bnQgPSAwO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuc291cmNlSXRlcmF0b3IubmV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgbmV4dFJlcyA9IG9yaWdpbk5leHQuY2FsbChpdCk7XG4gICAgICBjb25zdCBjaHIgPSBuZXh0UmVzLnZhbHVlO1xuICAgICAgaWYgKCFuZXh0UmVzLmRvbmUgJiYgY2hyID09PSAnXFxuJylcbiAgICAgICAgc2VsZi5saW5lQmVnaW5Qb3NpdGlvbnMucHVzaChuZXh0Q291bnQpO1xuICAgICAgbmV4dENvdW50Kys7XG4gICAgICByZXR1cm4gbmV4dFJlcztcbiAgICB9O1xuICB9XG5cbiAgYWJzdHJhY3QgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VD4+O1xuXG4gIGdldFRleHQoc3RhcnRQb3M6IG51bWJlcikge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5zbGljZShzdGFydFBvcywgdGhpcy5wb3NpdGlvbik7XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IFtsaW5lLCBjb2xdID0gdGhpcy5nZXRMaW5lQ29sdW1uKHRoaXMuY3VyclBvcyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICByZXR1cm4gYGdldCAke0pTT04uc3RyaW5naWZ5KHRoaXMubGEoKSl9LCBhdCBsaW5lICR7bGluZSArIDF9LCBjb2x1bW4gJHtjb2wgKyAxfSwgYWZ0ZXIgJHtKU09OLnN0cmluZ2lmeSh0aGlzLmxiKCkpfWA7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiB6ZXJvLWJhc2VkIFtsaW5lLCBjb2x1bW5dIHZhbHVlXG5cdCAqICovXG4gIGdldExpbmVDb2x1bW4ocG9zOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdIHtcbiAgICBjb25zdCBsaW5lSW5kZXggPSBzb3J0ZWRJbmRleCh0aGlzLmxpbmVCZWdpblBvc2l0aW9ucywgcG9zKSAtIDE7XG4gICAgY29uc3QgbGluZVBvcyA9IHRoaXMubGluZUJlZ2luUG9zaXRpb25zW2xpbmVJbmRleF07XG4gICAgcmV0dXJuIFtsaW5lSW5kZXgsIHBvcyAtIChsaW5lUG9zICsgMSldO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlbkZpbHRlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxUb2tlbjxUPj4gaW1wbGVtZW50cyBJdGVyYWJsZTxUb2tlbjxUPj4ge1xuICBjb25zdHJ1Y3RvcihsZXhlcjogSXRlcmFibGU8VG9rZW48VD4+LCBwdWJsaWMgc2tpcFR5cGU6IFQpIHtcbiAgICBzdXBlcihsZXhlcik7XG4gIH1cblxuICAqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VG9rZW48VD4+IHtcbiAgICB3aGlsZSAodGhpcy5sYSgpICE9IG51bGwpIHtcbiAgICAgIGlmICh0aGlzLmxhKCkhLnR5cGUgPT09IHRoaXMuc2tpcFR5cGUpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB5aWVsZCB0aGlzLmxhKCkhO1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRDdXJyZW50UG9zSW5mbygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5sYSgpO1xuICAgIGlmIChzdGFydCA9PSBudWxsKVxuICAgICAgcmV0dXJuICdFT0YnO1xuICAgIHJldHVybiBgbGluZSAke3N0YXJ0LmxpbmVDb2x1bW5bMF0gKyAxfSBjb2x1bW4gJHtzdGFydC5saW5lQ29sdW1uWzFdICsgMX1gO1xuICB9XG59XG4vKipcbiAqIFRUIC0gdG9rZW4gdHlwZVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZVBhcnNlcjxUPiBleHRlbmRzIExvb2tBaGVhZDxUb2tlbjxUPj4ge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgbGV4ZXI6IEl0ZXJhYmxlPFRva2VuPFQ+Pikge1xuICAgIHN1cGVyKGxleGVyKTtcbiAgfVxuXG4gIGdldEN1cnJlbnRQb3NJbmZvKCk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmxhKCk7XG4gICAgaWYgKHN0YXJ0ID09IG51bGwpXG4gICAgICByZXR1cm4gJ0VPRic7XG4gICAgcmV0dXJuIGBsaW5lICR7c3RhcnQubGluZUNvbHVtblswXSArIDF9IGNvbHVtbiAke3N0YXJ0LmxpbmVDb2x1bW5bMV0gKyAxfWA7XG4gIH1cblxuICBpc05leHRUeXBlcyguLi50eXBlczogVFtdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY29tcGFyYXRvciA9IChhOiBUb2tlbjxUPiwgYjogVCkgPT4ge1xuICAgICAgaWYgKGEgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIGEudHlwZSA9PT0gYjtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLl9pc05leHQ8VD4odHlwZXMsIGNvbXBhcmF0b3IpO1xuICB9XG5cbiAgaXNOZXh0VG9rZW5UZXh0KC4uLnRleHQ6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gICAgY29uc3QgY29tcGFyYXRvciA9IChhOiBUb2tlbjxUPiwgYjogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoYSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gYS50ZXh0ID09PSBiO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuX2lzTmV4dDxzdHJpbmc+KHRleHQsIGNvbXBhcmF0b3IpO1xuICB9XG59XG4iXX0=