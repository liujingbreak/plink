/* tslint:disable max-classes-per-file */
// enum TokenType {
// 	EOF = -1,
// 	comments,
// 	openTag,
// 	closeTag,
// 	identity,
// 	stringLiteral
// }

const EOF: null = null;

export interface Input<T> {
	at(index: number): T;
}

export abstract class LookaheadQ<T> {
	inputPos = -1;
	cached: T[];

	constructor() {}

	la(count: number): T {
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

	next(): T {
		if (this.cached[this.inputPos] !== EOF) {
			return this.cached[this.inputPos++];
		}
	}

	isNext(...compare: T[]): boolean {
		var index = 1;
		while(true) {
			if (this.la(index) !== compare[index - 1])
				return;
		}
	}

	abstract fetch(): T;
}

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
