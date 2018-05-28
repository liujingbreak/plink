"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-classes-per-file */
var TokenType;
(function (TokenType) {
    TokenType[TokenType["comments"] = 0] = "comments";
    TokenType[TokenType["openTag"] = 1] = "openTag";
    TokenType[TokenType["closeTag"] = 2] = "closeTag";
    TokenType[TokenType["identity"] = 3] = "identity";
    TokenType[TokenType["stringLiteral"] = 4] = "stringLiteral";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
class LookAhead {
    constructor(source) {
        this.currPos = -1;
        this.isString = typeof source === 'string';
        this.cached = [];
        this.sourceIterator = source[Symbol.iterator]();
    }
    la(num = 1) {
        let readPos = this.currPos + num;
        return this.read(readPos);
    }
    advance(count = 1) {
        let current;
        for (let i = 0; i < count; i++) {
            current = this.la(1);
            this.currPos++;
        }
        return current;
    }
    isNext(...values) {
        let compareTo;
        if (this.isString) {
            compareTo = values.join('');
        }
        else
            compareTo = values;
        let i = 0, l = compareTo.length;
        let next = this.la(i + 1);
        while (true) {
            if (i === l)
                return true;
            next = this.la(i + 1);
            if (next == null)
                return false; // EOF
            else if (next !== compareTo[i])
                return false;
            i++;
        }
    }
    read(pos) {
        while (this.cached.length <= pos) {
            let next = this.sourceIterator.next();
            if (next.done)
                return null;
            this.cached.push(next.value);
        }
        return this.cached[pos];
    }
}
exports.LookAhead = LookAhead;
class BaseLexer extends LookAhead {
    constructor(source) {
        super(source);
    }
    *[Symbol.iterator]() {
    }
    isComment() {
        if (this.isNext('<!--')) {
            this.advance(4);
            while (!this.isNext('-->')) {
                if (this.la() == null)
                    throw new Error('Comment is not closed');
                this.advance();
            }
            return true;
        }
        return false;
    }
}
exports.BaseLexer = BaseLexer;
// class Parser extends LookaheadQ<TokenType> {
// 	constructor(protected lexer: Lexer) {}
// 	parse() {
// 	}
// 	fetch(): TokenType {
// 		return this.lexer[this.currPos];
// 	}
// }
// export function parse(source: string) {
// 	return new Parser(new Lexer(source)).parse();
// }

//# sourceMappingURL=ng-html-parser.js.map
