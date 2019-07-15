import sortedIndex from 'lodash/sortedIndex';

export class Token<T> {
  text: string;
  end: number;
  lineColumn: [number, number];

  constructor(public type: T, lexer: BaseLexer<T>,
    public start: number) {
    this.text = lexer.getText(start);
    this.end = lexer.position;
    this.lineColumn = lexer.getLineColumn(start);
  }
}

export enum Channel {
  normal,
  full
}

export abstract class LookAhead<T> {
  cached: T[];
  // channels: {[channel: string]: T[]} = {};
  // channelPos: {[channel: string]: number} = {};
  sourceIterator: Iterator<T>;
  isString: boolean;
  channel = Channel.normal;
  protected currPos = -1;

  constructor(source: Iterable<T>) {
    this.isString = typeof source === 'string';
    this.cached = [];
    this.sourceIterator = source[Symbol.iterator]();
  }

  get position(): number {
    return this.currPos + 1;
  }

  /**
	 * look ahead for 1 character
	 * @param num default is 1
	 * @return null if EOF is reached
	 */
  la(num = 1): T | null {
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

  /**
	 * Same as `return la(1) === values[0] && la(2) === values[1]...`
	 * @param values lookahead string or tokens
	 */
  isNext(...values: T[]): boolean {
    return this._isNext<T>(values);
  }

  _isNext<C>(values: C[], isEqual = (a: T, b: C) => a as any === b): boolean {
    let compareTo: C[]| string;
    let compareFn: (...arg: any[]) => boolean;
    if (this.isString) {
      compareTo = values.join('');
      compareFn = (a: string, b: string) => a === b;
    } else {
      compareTo = values;
      compareFn = isEqual;
    }
    let i = 0;
    const l = compareTo.length;
    let next = this.la(i + 1);
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
  }

  throwError(unexpected = 'End-of-file') {
    throw new Error(`Unexpected ${JSON.stringify(unexpected)} at ` + this.getCurrentPosInfo());
  }

  abstract getCurrentPosInfo(): string;

  /**
	 * Do not read postion less than 0
	 * @param pos 
	 */
  protected read(pos: number): T {
    const cached = this.cached;
    while (cached.length <= pos) {
      const next = this.sourceIterator.next();
      if (next.done)
        return null;
      cached.push(next.value);
    }
    return cached[pos];
  }
}

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
export abstract class BaseLexer<T> extends LookAhead<string> implements Iterable<Token<T>> {
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

  abstract [Symbol.iterator](): Iterator<Token<T>>;

  getText(startPos: number) {
    return this.source.slice(startPos, this.position);
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
    return [lineIndex, pos - (linePos + 1)];
  }
}

export class TokenFilter<T> extends LookAhead<Token<T>> implements Iterable<Token<T>> {
  constructor(lexer: Iterable<Token<T>>, public skipType: T) {
    super(lexer);
  }

  *[Symbol.iterator](): Iterator<Token<T>> {
    while (this.la() != null) {
      if (this.la().type === this.skipType) {
        this.advance();
      } else {
        yield this.la();
        this.advance();
      }
    }
  }

  getCurrentPosInfo(): string {
    const start = this.la();
    if (start == null)
      return 'EOF';
    return `line ${start.lineColumn[0] + 1} column ${start.lineColumn[1] + 1}`;
  }
}
/**
 * TT - token type
 */
export abstract class BaseParser<T> extends LookAhead<Token<T>> {
  constructor(protected lexer: Iterable<Token<T>>) {
    super(lexer);
  }

  getCurrentPosInfo(): string {
    const start = this.la();
    if (start == null)
      return 'EOF';
    return `line ${start.lineColumn[0] + 1} column ${start.lineColumn[1] + 1}`;
  }

  isNextTypes(...types: T[]): boolean {
    const comparator = (a: Token<T>, b: T) => {
      if (a == null)
        return false;
      return a.type === b;
    };
    return this._isNext<T>(types, comparator);
  }

  isNextTokenText(...text: string[]): boolean {
    const comparator = (a: Token<T>, b: string) => {
      if (a == null)
        return false;
      return a.text === b;
    };
    return this._isNext<string>(text, comparator);
  }
}
