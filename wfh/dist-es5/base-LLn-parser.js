"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var sortedIndex_1 = tslib_1.__importDefault(require("lodash/sortedIndex"));
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
            return undefined;
        return this.read(pos);
    };
    LookAhead.prototype.advance = function (count) {
        if (count === void 0) { count = 1; }
        var current;
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
    tslib_1.__extends(BaseLexer, _super);
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
        var _a = this.getLineColumn(this.currPos), line = _a[0], col = _a[1];
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
    tslib_1.__extends(TokenFilter, _super);
    function TokenFilter(lexer, skipType) {
        var _this = _super.call(this, lexer) || this;
        _this.skipType = skipType;
        return _this;
    }
    TokenFilter.prototype[Symbol.iterator] = function () {
        return tslib_1.__generator(this, function (_a) {
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
    tslib_1.__extends(BaseParser, _super);
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
    return BaseParser;
}(LookAhead));
exports.BaseParser = BaseParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJFQUE2QztBQUU3QztJQUtDLGVBQW1CLElBQU8sRUFBRSxLQUFtQixFQUN2QyxLQUFhO1FBREYsU0FBSSxHQUFKLElBQUksQ0FBRztRQUNsQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDRixZQUFDO0FBQUQsQ0FBQyxBQVhELElBV0M7QUFYWSxzQkFBSztBQWFsQixJQUFZLE9BR1g7QUFIRCxXQUFZLE9BQU87SUFDbEIseUNBQU0sQ0FBQTtJQUNOLHFDQUFJLENBQUE7QUFDTCxDQUFDLEVBSFcsT0FBTyxHQUFQLGVBQU8sS0FBUCxlQUFPLFFBR2xCO0FBRUQ7SUFTQyxtQkFBWSxNQUFtQjtRQUgvQixZQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNmLFlBQU8sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUd0QixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQztRQUMzQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUNqRCxDQUFDO0lBRUQsc0JBQUksK0JBQVE7YUFBWjtZQUNDLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDekIsQ0FBQzs7O09BQUE7SUFFRDs7OztP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