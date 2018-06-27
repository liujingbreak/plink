/* tslint:disable max-classes-per-file max-line-length no-console jsdoc-format */
import sortedIndex = require('lodash/sortedIndex');

export class Token {
	text: string;
	end: number;
	constructor(public type: TokenType, lexer: LookAheadString,
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
		let readPos = this.currPos + num;
		return this.read(readPos);
	}

	lb(num = 1): T {
		let pos = this.currPos - (num - 1);
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
			let next = this.sourceIterator.next();
			if (next.done)
				return null;
			this.cached.push(next.value);
		}
		return this.cached[pos];
	}
}

export abstract class LookAheadString extends LookAhead<string, string> {
	lineBeginPositions: number[] = [-1];

	constructor(protected source: string) {
		super(source);
		let originNext = this.sourceIterator.next;
		let it = this.sourceIterator;
		// - Monkey patch iterator's next() method to track beginning position of each line
		let nextCount = 0;
		let self = this;
		this.sourceIterator.next = function() {
			let nextRes = originNext.call(it);
			let chr = nextRes.value;
			if (!nextRes.done && chr === '\n')
				self.lineBeginPositions.push(nextCount);
			nextCount++;
			return nextRes;
		};
	}

	getText(startPos: number) {
		return this.source.substring(startPos, this.position);
	}

	getCurrentPosInfo(): string {
		let [line, col] = this.getLineColumn(this.currPos);
		return `get ${JSON.stringify(this.la())}, at line ${line + 1}, column ${col + 1}, after ${JSON.stringify(this.lb())}`;
	}

	/**
	 * @return zero-based [line, column] value
	 * */
	getLineColumn(pos: number): [number, number] {
		let lineIndex = sortedIndex(this.lineBeginPositions, pos) - 1;
		let linePos = this.lineBeginPositions[lineIndex];
		// console.log(`pos = ${pos}, lineIndex = ${lineIndex}, linePos=${linePos}`);
		return [lineIndex, pos - (linePos + 1)];
	}
}

export class BaseLexer extends LookAheadString implements Iterable<Token> {

	constructor(source: string) {
		super(source);
	}

	*[Symbol.iterator](): Iterator<Token> {}

	skip() {
		let chr = this.la();
		while(chr != null) {
			if (this.isComment()) {
				this.comment();
			} else if (this.isSwigComment()) {
				this.swigComment();
			} else {
				break;
			}
			chr = this.la();
 		}
	}

	isComment() {
		return this.isNext('<!--');
	}
	comment() {
		this.advance(4);
		while(!this.isNext('-->')) {
			if (this.la() == null)
				throw new Error('Comment is not closed, ' + this.getCurrentPosInfo());
			this.advance();
		}
		this.advance(3);
		return true;
	}
	isSwigComment() {
		return this.isNext('{#');
	}
	swigComment() {
		this.advance(2);
		while (!this.isNext('#}')) {
			this.advance();
		}
	}
}

export enum TokenType {
	comments,
	['<'],
	['>'],
	['('],
	[')'],
	['['],
	[']'],
	['</'],
	['='],
	identity,
	stringLiteral,
	any, // .*
	space
}
export class TemplateLexer extends BaseLexer {
	*[Symbol.iterator](): Iterator<Token> {
		while (true) {
			let start = this.position;
			let char: string = this.la();
			if (char == null) {
				return;
			}
			switch (char) {
				case '>':
				case '(':
				case ')':
				case '[':
				case ']':
				case '=':
				this.advance();
				yield new Token((TokenType as any)[char], this, start);
				continue;
			}
			if (char === '<' && this.isIdStart(2)) {
				yield this.openTagStart();
			} else if (this.isNext('</')) {
				yield this.closeTagStart();
			} else if (this.isIdStart()) {
				do {
					this.advance();
					char = this.la();
				} while (this.isIdStart());
				yield new Token(TokenType.identity, this, start);
			} else if (char === '"') {
				yield this.stringLit('"');
			} else if (char === '\'') {
				yield this.stringLit('\'');
			} else if (char === '`') {
				yield this.stringLit('`');
			} else if (this.isWhitespace()) {
				do {
					this.advance();
				} while (this.isWhitespace());
				// yield new Token(TokenType.space, ' ');
				continue;
			} else {
				yield new Token(TokenType.any, this, start);
				this.advance();
			}
		}
	}
	openTagStart() {
		let start = this.position;
		this.advance();
		do {
			this.advance();
		} while (this.isIdStart());
		return new Token(TokenType['<'], this, start);
	}
	closeTagStart() {
		this.advance(2);
		let start = this.position;
		while (this.la() !== '>') {
			this.advance();
		}
		return new Token(TokenType['</'], this, start);
	}
	isIdStart(laIdx = 1) {
		let char = this.la(laIdx);
		return /[^<>()\[\]"'=`/]/.test(char) && /\S/.test(char);
	}
	isWhitespace() {
		let chr = this.la();
		return /\s/.test(chr);
	}

	stringLit(quote: string) {
		this.advance();
		let start = this.position;
		while (this.la() !== quote) {
			if (this.la() == null)
				this.throwError();
			// console.log(':', this.la());
			if (this.la() === '\\') {
				this.advance();
			}
			this.advance();
		}
		let tk = new Token(TokenType.stringLiteral, this, start);
		this.advance();
		return tk;
	}
}

export interface TagAst {
	name?: string;
	attrs?: {[key: string]: AttributeValueAst};
	start: number;
	end: number;
	[key: string]: any;
}
export interface AttributeValueAst {
	text: string; start: number; end: number;
}
export class TemplateParser extends LookAhead<Token, TemplateLexer> {
	lexer: TemplateLexer;
	constructor(input: string) {
		let lexer = new TemplateLexer(input);
		super(lexer);
		this.lexer = lexer;
	}

	getCurrentPosInfo(): string {
		let start = this.la() ? this.la().start : null;
		if (start) {
			let lineCol = this.lexer.getLineColumn(start);
			return `Line ${lineCol[0] + 1} column ${lineCol[1] + 1}`;
		}
	}
	skip() {
		while (this.la() != null && this.la().type === TokenType.space) {
			this.advance();
		}
	}
	parse(): TagAst[] {
		let ast: TagAst[] = [];
		while(this.la() != null) {
			if (this.la().type === TokenType['<']) {
				ast.push(this.tag());
			} else if (this.la().type === TokenType['</']) {
				this.advance();
			} else {
				this.advance();
			}
		}
		return ast;
	}
	tag(): TagAst {
		let first = this.advance();
		let name = first.text.substring(1);
		let attrs = this.attributes();
		let last = this.advance(); // >
		return {name, attrs, start: first.start, end: last.end};
	}
	attributes() {
		let attrs: {[key: string]: AttributeValueAst} = {};
		while (this.la() != null && this.la().type !== TokenType['>']) {
			if (this.isNgAttrName()) {
				let key = this.ngAttrName();
				attrs[key] = this.attrValue();
			} else if (this.la().type === TokenType.identity) {
				let key = this.attrName();
				attrs[key] = this.attrValue();
			} else {
				console.log('Previous tokens: ', this.lb().text);
				this.throwError(this.la().text);
			}
		}
		return attrs;
	}
	isNgAttrName() {
		let type = this.la().type;
		return type === TokenType['['] || type === TokenType['('];
	}
	ngAttrName() {
		let kind = this.la().type === TokenType['['] ? TokenType[']'] : TokenType[')'];
		let name: string;
		this.advance();
		if (this.isNgAttrName())
			name = this.ngAttrName();
		else
			name = this.attrName();
		if (this.la().type !== kind)
			this.throwError(this.la().text);
		this.advance();
		return name;
	}
	attrName() {
		return this.advance().text;
	}
	attrValue(): AttributeValueAst {
		if (this.la() && this.la().type === TokenType['=']) {
			// let {text, start, end} = this.advance(2);
			// return {text, start, end};
			return this.advance(2);
		} else {
			return null;
		}
	}
}
