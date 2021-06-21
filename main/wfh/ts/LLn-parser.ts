import util from 'util';

/**
 * T - Token Types
 * AST - type of returned AST object
 */
export function createStringParser<T, AST>(parserName: string, lexer: Lexer<string, T>,
  grammar: Grammar<Token<T>, AST>) {

  return function(input: string) {
    const p = parser(parserName, lexer, grammar);
    p.write(input);
    p.end();
    return p.getResult();
  };
}

/**
 * Help for testing result of lexer function
 * @param lexer 
 */
export function listTokens<T>(debugName: string, input: string, lexer: Lexer<string, T>): Token<T>[] {
  const lexerLa = new LookAhead<string, T>(debugName, () => {
    lexerLa._write(input);
    lexerLa._final();
  });

  const tokens = [] as Token<T>[];
  lexer(lexerLa, {
    emit() {
      const token = strChunk2Token(lexerLa.currChunk);
      token.close(lexerLa.position);
      tokens.push(token);
    },
    end() {}
  });

  return tokens;
}
export class Chunk<V, T> {
  type: T;
  values?: V[] = [];
  end: number;
  isClosed = false;
  trackValue = true;

  constructor(
    public pos: number, public line: number, public col: number
  ) {}

  close(position: number) {
    this.isClosed = true;
    this.end = position;
    return this;
  }
}

export class Token<T> extends Chunk<string, T> {
  text: string;
}

/**
 *  V is type of each `character`, e.g. string, number
 *  T is Token Type, e.g. string or a enum
 *  C could be omit
 */
export type Lexer<V,T, C extends Chunk<V, T> = Chunk<V, T>> =
  (la: LookAhead<V,T>, emitter: TokenEmitter<V, T, C>) => void;
export type Grammar<C, A> = (tokenLa: LookAhead<C>) => A;

interface TokenEmitter<V, T, C> {
  emit(): void;
  end(): void;
}

export function parser<V, T, C extends Chunk<V, T>, A>(parserName: string,
  lexer: Lexer<V, T, C>,
  grammar: Grammar<C, A>,
  chunkConverter?: (chunk: Chunk<V, T>) => C):
  {
    write: LookAhead<V, T>['_write'];
    end: LookAhead<V, T>['_final'];
    getResult: () => A;
  } {

  let isString: boolean;
  const lexerLa = new LookAhead<V, T>(parserName+ ' lexer');
  const tokenEmitter: TokenEmitter<V, T, C> = {
    emit() {
      if (isString === undefined && lexerLa.currChunk.values != null)
        isString = typeof lexerLa.currChunk.values[0] === 'string';
      const token: C = chunkConverter ? chunkConverter(lexerLa.currChunk) :
        (isString ?
          strChunk2Token(lexerLa.currChunk as unknown as Chunk<string, T>) as unknown as C :
          lexerLa.currChunk as C);
      tokenLa._write([token]);
      token.close(lexerLa.position);
    },
    end() {
      tokenLa._final();
    }
  };
  const tokenLa = new LookAhead<C>(parserName + ' grammar', function() {
    lexer(lexerLa, tokenEmitter);
  });
  return {
    write: lexerLa._write.bind(lexerLa) as LookAhead<V, T>['_write'],
    end: lexerLa._final.bind(lexerLa) as LookAhead<V, T>['_final'],
    getResult() {
      return grammar(tokenLa);
    }
  };
}


export class LookAhead<V, T = void> {
  static WAIT_ERROR: 'WAIT_ERROR';
  cached: Array<V|null>;
  line = 1;
  column = 1;
  lastConsumed: V;
  currChunk: Chunk<V, T>;

  private currPos = 0;
  private cacheStartPos = 0;

  constructor(protected name: string, private onDrain?: (this: LookAhead<V, T>) => void) {
    this.cached = [];
  }

  _write(values: Iterable<V|null>) {
    for (const v of values)
      this.cached.push(v);
  }

  _final() {
    this._write([null]);
  }

  get position(): number {
    return this.currPos;
  }

  /**
	 * look ahead for 1 character
	 * @param num default is 1
	 * @return null if EOF is reached
	 */
  la(num = 1): V | null {
    const readPos = this.currPos + num - 1;
    return this.read(readPos);
  }

  advance(count = 1): V {
    // return new Promise(resolve => {
    let currValue: V;
    let i = 0;
    while (i++ < count) {
      const value = this.la(1);
      if (value == null) {
        this.throwError('Unexpect EOF'); // , stack);
        break;
      }
      this.currPos++;
      this.column++;
      if ((value as any) === '\n') {
        this.line++;
        this.column = 1;
      }
      if (this.currPos - this.cacheStartPos > 0x100000) {
        this.cached.splice(0, 0x100000);
        this.cacheStartPos += 0x100000;
      }
      if (this.currChunk && !this.currChunk.isClosed && this.currChunk.trackValue) {
        this.currChunk.values!.push(value);
      }
      currValue = value;
    }
    this.lastConsumed = currValue!;
    return currValue!;
  }

  isNext(...values: V[]) {
    return this.isNextWith(values);
  }
  /**
	 * Same as `return la(1) === values[0] && la(2) === values[1]...`
	 * @param values lookahead string or tokens
	 */
  isNextWith<C>(values: C[], isEqual = (a: V, b: C) => a as any === b): boolean {
    let compareTo: C[]| string;
    let compareFn: (...arg: any[]) => boolean;
    compareTo = values;
    compareFn = isEqual;
    let i = 0;
    const l = compareTo.length;
    while (true) {
      if (i === l)
        return true;
      const next = this.la(i + 1);
      if (next == null)
        return false; // EOF
      else if (!compareFn(next, compareTo[i]))
        return false;
      i++;
    }
  }

  assertAdvance(...values: V[]) {
    return this.assertAdvanceWith(values);
  }

  assertAdvanceWith<C>(values: C[], isEqual = (a: V, b: C) => a as any === b) {
    let compareTo: C[]| string;
    let compareFn: (...arg: any[]) => boolean;
    compareTo = values;
    compareFn = isEqual;
    let i = 0;
    const l = compareTo.length;
    while (true) {
      if (i === l)
        return true;
      const next = this.advance(i + 1);
      if (next == null)
        this.throwError('EOF', new Error().stack); // EOF
      else if (!compareFn(next, compareTo[i]))
        this.throwError(util.inspect(next), new Error().stack, compareTo[i] + '');
      i++;
    }
  }

  throwError(unexpected = 'End-of-stream', stack?: any, expect?: string) {
    // eslint-disable-next-line max-len
    throw new Error(`In ${this.name} unexpected ${JSON.stringify(unexpected)}`+
    (expect ? `(expecting "${expect}")` : '') +
    `at ${this.getCurrentPosInfo()}, ${stack ? 'previous stack:' + stack : ''}`);
  }

  getCurrentPosInfo(): string {
    return `offset ${this.currPos} [${this.line}:${this.column}]`;
  }

  startChunk(type: T, trackValue = true) {
    if (this.currChunk && !this.currChunk.isClosed)
      this.currChunk.close(this.currPos);
    this.currChunk = new Chunk<V, T>(this.currPos, this.line, this.column);
    this.currChunk.trackValue = trackValue;
    this.currChunk.type = type;
    return this.currChunk;
  }

  protected closeChunk() {
    return this.currChunk.close(this.currPos);
  }

  /**
	 * Do not read postion less than 0
	 * @param pos 
	 */
  private read(pos: number): V | null {
    const cacheOffset = pos - this.cacheStartPos;
    if (cacheOffset < 0) {
      throw new Error(`Can not read behind stream cache, at position: ${pos}`);
    }
    while (true) {
      if (cacheOffset < this.cached.length) {
        return this.cached[cacheOffset];
      } else {
        if (this.onDrain) {
          this.onDrain();
          continue;
        }
        throw new Error(`The internal buffer is drained early at ${pos}`);
        // this.waitForPos = pos;
        // const err = new WaitError();
        // throw err;
        // return new Promise(resolve => {
        //   this.readResolve = resolve;
        // });
      }
    }
  }
}

function strChunk2Token<T>(chunk: Chunk<string, T>) {
  if (chunk.values) {
    (chunk as Token<T>).text = chunk.values.join('');
    delete chunk.values;
  }
  return chunk as Token<T>;
}

/**
 * Convenient function for creating a text based parser,
 * you only need to define Token types, lexer function, grammar function
 */
export function createTextParser() {

}
