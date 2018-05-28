/* tslint:disable max-classes-per-file */
export enum TokenType {
	comments,
	openTag,
	closeTag,
	identity,
	stringLiteral
}

export class LookAhead<T, S extends Iterable<T>> {
	currPos = -1;
	cached: T[];
	sourceIterator: Iterator<T>;
	isString: boolean;

	constructor(source: S) {
		this.isString = typeof source === 'string';
		this.cached = [];
		this.sourceIterator = source[Symbol.iterator]();
	}

	la(num = 1): T {
		let readPos = this.currPos + num;
		return this.read(readPos);
	}

	advance(count = 1): T {
		let current;
		for (let i = 0; i < count; i++) {
			current = this.la(1);
			this.currPos++;
		}
		return current;
	}

	isNext(...values: T[]): boolean {
		let compareTo: T[]| string;
		if (this.isString) {
			compareTo = values.join('');
		} else
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

	private read(pos: number): T {
		while (this.cached.length <= pos) {
			let next = this.sourceIterator.next();
			if (next.done)
				return null;
			this.cached.push(next.value);
		}
		return this.cached[pos];
	}
}

export class BaseLexer extends LookAhead<string, string> implements Iterable<TokenType> {
	current: TokenType;

	constructor(source: string) {
		super(source);
	}

	*[Symbol.iterator](): Iterator<TokenType> {

	}

	isComment() {
		if(this.isNext('<!--')) {
			this.advance(4);
			while(!this.isNext('-->')) {
				if (this.la() == null)
					throw new Error('Comment is not closed');
				this.advance();
			}
			return true;
		}
		return false;
	}
}



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
