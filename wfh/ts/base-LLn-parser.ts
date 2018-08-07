import sortedIndex = require('lodash/sortedIndex');

export class Token<T> {
	text: string;
	end: number;
	constructor(public type: T, lexer: BaseLexer<T>,
		public start: number) {
		this.text = lexer.getText(start);
		this.end = lexer.position;
	}
}

export enum Channel {
	normal,
	skip
}

export abstract class LookAhead<T, S extends Iterable<T>> {
	cached: T[];
	sourceIterator: Iterator<T>;
	isString: boolean;
	channel = Channel.normal;
	protected currPos = -1;

	constructor(source: S) {
		this.isString = typeof source === 'string';
		this.cached = [];
		this.sourceIterator = source[Symbol.iterator]();
	}

	get position(): number {
		return this.currPos + 1;
	}

	la(num = 1): T {
		if (this.channel === Channel.normal) {
			this.channel = Channel.skip;
			this.skip();
			this.channel = Channel.normal;
		}
		const readPos = this.currPos + num;
		return this.read(readPos);
	}

	lb(num = 1): T {
		const pos = this.currPos - (num - 1);
		if (pos < 0)
			return undefined;
		return this.read(pos);
	}

	advance(count = 1): T {
		let current;
		for (let i = 0; i < count; i++) {
			current = this.la(1);
			if (current == null)
				this.throwError();
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
		let i = 0;
		const l = compareTo.length;
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
	throwError(unexpected = 'End-of-file') {
		throw new Error(`Unexpected ${JSON.stringify(unexpected)} at ` + this.getCurrentPosInfo());
	}

	abstract getCurrentPosInfo(): string;
	abstract skip(): void;

	/**
	 * Do not read postion less than 0
	 * @param pos 
	 */
	protected read(pos: number): T {
		while (this.cached.length <= pos) {
			const next = this.sourceIterator.next();
			if (next.done)
				return null;
			this.cached.push(next.value);
		}
		return this.cached[pos];
	}
}

export abstract class BaseLexer<Type> extends LookAhead<string, string> implements Iterable<Token<Type>> {
	lineBeginPositions: number[] = [-1];

	constructor(protected source: string) {
		super(source);
		const originNext = this.sourceIterator.next;
		const it = this.sourceIterator;
		// - Monkey patch iterator's next() method to track beginning position of each line
		let nextCount = 0;
		const self = this;
		this.sourceIterator.next = function() {
			const nextRes = originNext.call(it);
			const chr = nextRes.value;
			if (!nextRes.done && chr === '\n')
				self.lineBeginPositions.push(nextCount);
			nextCount++;
			return nextRes;
		};
	}

	abstract [Symbol.iterator](): Iterator<Token<Type>>;

	getText(startPos: number) {
		return this.source.substring(startPos, this.position);
	}

	getCurrentPosInfo(): string {
		const [line, col] = this.getLineColumn(this.currPos);
		return `get ${JSON.stringify(this.la())}, at line ${line + 1}, column ${col + 1}, after ${JSON.stringify(this.lb())}`;
	}

	/**
	 * @return zero-based [line, column] value
	 * */
	getLineColumn(pos: number): [number, number] {
		const lineIndex = sortedIndex(this.lineBeginPositions, pos) - 1;
		const linePos = this.lineBeginPositions[lineIndex];
		// console.log(`pos = ${pos}, lineIndex = ${lineIndex}, linePos=${linePos}`);
		return [lineIndex, pos - (linePos + 1)];
	}
}


export abstract class BaseParser<T, S extends BaseLexer<T>> extends LookAhead<Token<T>, S> {
	constructor(protected lexer: S) {
		super(lexer);
	}

	getCurrentPosInfo(): string {
		const start = this.la() ? this.la().start : null;
		if (start) {
			const lineCol = this.lexer.getLineColumn(start);
			return `Line ${lineCol[0] + 1} column ${lineCol[1] + 1}`;
		}
		return '';
	}
}
