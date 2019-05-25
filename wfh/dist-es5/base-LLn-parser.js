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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1MTG4tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvYmFzZS1MTG4tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtRUFBNkM7QUFFN0M7SUFLQyxlQUFtQixJQUFPLEVBQUUsS0FBbUIsRUFDdkMsS0FBYTtRQURGLFNBQUksR0FBSixJQUFJLENBQUc7UUFDbEIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBQ0YsWUFBQztBQUFELENBQUMsQUFYRCxJQVdDO0FBWFksc0JBQUs7QUFhbEIsSUFBWSxPQUdYO0FBSEQsV0FBWSxPQUFPO0lBQ2xCLHlDQUFNLENBQUE7SUFDTixxQ0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQUhXLE9BQU8sR0FBUCxlQUFPLEtBQVAsZUFBTyxRQUdsQjtBQUVEO0lBU0MsbUJBQVksTUFBbUI7UUFIL0IsWUFBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDZixZQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFHdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDakQsQ0FBQztJQUVELHNCQUFJLCtCQUFRO2FBQVo7WUFDQyxPQUFP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