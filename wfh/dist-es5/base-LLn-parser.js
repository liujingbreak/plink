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
        var _a = tslib_1.__read(this.getLineColumn(this.currPos), 2), line = _a[0], col = _a[1];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJFQUE2QztBQUU3QztJQUtDLGVBQW1CLElBQU8sRUFBRSxLQUFtQixFQUN2QyxLQUFhO1FBREYsU0FBSSxHQUFKLElBQUksQ0FBRztRQUNsQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDRixZQUFDO0FBQUQsQ0FBQyxBQVhELElBV0M7QUFYWSxzQkFBSztBQWFsQixJQUFZLE9BR1g7QUFIRCxXQUFZLE9BQU87SUFDbEIseUNBQU0sQ0FBQTtJQUNOLHFDQUFJLENBQUE7QUFDTCxDQUFDLEVBSFcsT0FBTyxHQUFQLGVBQU8sS0FBUCxlQUFPLFFBR2xCO0FBRUQ7SUFTQyxtQkFBWSxNQUFtQjtRQUgvQixZQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNmLFlBQU8sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUd0QixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQztRQUMzQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUNqRCxDQUFDO0lBRUQsc0JBQUksK0JBQVE7YUFBWjtZQUNDLE9BQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDekIsQ0FBQzs7O09BQUE7SUFFRDs7OztP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