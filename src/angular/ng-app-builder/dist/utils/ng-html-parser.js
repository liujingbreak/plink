"use strict";
/* tslint:disable max-classes-per-file */
// enum TokenType {
// 	EOF = -1,
// 	comments,
// 	openTag,
// 	closeTag,
// 	identity,
// 	stringLiteral
// }
Object.defineProperty(exports, "__esModule", { value: true });
const EOF = null;
class LookaheadQ {
    constructor() {
        this.inputPos = -1;
    }
    la(count) {
        let laIndex = this.inputPos + count;
        if (this.cached.length > laIndex) {
            return this.cached[laIndex];
        }
        while (this.cached.length <= laIndex) {
            let next = this.fetch();
            this.cached.push(next);
            if (next === EOF)
                break;
        }
    }
    next() {
        if (this.cached[this.inputPos] !== EOF) {
            return this.cached[this.inputPos++];
        }
    }
    isNext(...compare) {
        var index = 1;
        while (true) {
            if (this.la(index) !== compare[index - 1])
                return;
        }
    }
}
exports.LookaheadQ = LookaheadQ;
// class Lexer extends LookaheadQ<string> {
// 	constructor(protected source: string) {
// 		super();
// 		this.cached = source as any;
// 	}
// 	fetch(): string {
// 		return this.source[this.inputPos];
// 	}
// }
// class Parser extends LookaheadQ<TokenType> {
// 	constructor(protected lexer: Lexer) {}
// 	parse() {
// 	}
// 	fetch(): TokenType {
// 		return this.lexer[this.inputPos];
// 	}
// }
// export function parse(source: string) {
// 	return new Parser(new Lexer(source)).parse();
// }

//# sourceMappingURL=ng-html-parser.js.map
