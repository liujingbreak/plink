import {Observable, Subscriber, from, OperatorFunction} from 'rxjs';
import {map} from 'rxjs/operators';
export class Chunk<V> {
  type: any;
  values?: V[] = [];
  end?: number;
  isClosed = false;

  constructor(
    public pos: number, public line: number, public col: number
  ) {}

  close(position: number) {
    this.isClosed = true;
    this.end = position;
    return this;
  }
}

export class Token extends Chunk<string> {
  text: string;
}

export type ParseLex<I> = (la: LookAheadObservable<I>, sub: Subscriber<Chunk<I>>) => Promise<any>;
export type ParseGrammar<A> = (la: LookAhead<Token>) => Promise<A>;
/**
 * Parser
 * @param input string type
 * @param parseLex 
 * @param parseGrammar 
 */
export function parser<I, A>(
  name: string,
  input: Observable<I[]>,
  parseLex: ParseLex<I>,
  pipeOperators: OperatorFunction<Token, Token>[] | null,
  parseGrammar: ParseGrammar<A>
): Promise<A> {

  const _parseGrammarObs = (la: LookAhead<Token>) => {
    return from(parseGrammar(la));
  };

  let tokens = input.pipe(mapChunks<I>(name + '-lexer', parseLex))
  .pipe(
    map(chunk => {
      (chunk as Token).text = chunk.values!.join('');
      delete chunk.values;
      return chunk as Token;
    })
  );
  if (pipeOperators) {
    for (const operator of pipeOperators)
      tokens = tokens.pipe(operator);
  }

  return tokens.pipe(
    map(token => [token]),
    mapChunksObs(name + '-parser', _parseGrammarObs)
  ).toPromise();
}

export function mapChunksObs<I, O>(name: string, parse: (la: LookAhead<I>) => Observable<O>):
(input: Observable<I[]>)=> Observable<O> {

  return function(input: Observable<I[]>) {
    return new Observable<O>(sub => {
      const la = new LookAhead<I>(name);
      input.subscribe(input => la._write(input),
        err => sub.error(err),
        () => la._final()
      );
      parse(la).subscribe(
        ouput => sub.next(ouput),
        err => sub.error(err),
        () => sub.complete()
      );
    });
  };
}

export function mapChunks<I>(
  name: string,
  parse: ParseLex<I>
): (input: Observable<I[]>)=> Observable<Chunk<I>> {

  return function(input: Observable<I[]>) {
    return new Observable<Chunk<I>>(sub => {
      const la = new LookAhead<I>(name);
      input.subscribe(input => la._write(input),
        err => sub.error(err),
        () => la._final()
      );
      const la$: LookAheadObservable<I> = la as any;
      la$.startToken = la.startChunk;
      la$.emitToken = function(this: LookAheadObservable<I>) {
        sub.next(this.closeChunk());
      };
      parse(la$, sub)
      .then(() => sub.complete());
    });
  };
}

export class LookAhead<T> {
  cached: Array<T|null>;
  lastConsumed: T|undefined|null;
  isString: boolean;
  line = 1;
  column = 1;
  protected currPos = 0;
  private cacheStartPos = 0; // Currently is always same as currPos
  private readResolve: (value: T | null) => void | undefined;
  private waitForPos: number | undefined;
  private currChunk: Chunk<T>;

  constructor(protected name: string) {
    this.cached = [];
  }

  _write(values: Array<T|null>) {
    this.cached.push(...values);

    if (this.readResolve != null) {
      const resolve = this.readResolve;
      const cacheOffset = this.waitForPos! - this.cacheStartPos;
      if (cacheOffset < this.cached.length) {
        delete this.readResolve;
        delete this.waitForPos;
        resolve(this.cached[cacheOffset]);
      }
    }
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
  la(num = 1): Promise<T | null> {
    const readPos = this.currPos + num - 1;
    return this.read(readPos);
  }

  // lb(num = 1): T | null {
  //   const pos = this.currPos - (num - 1);
  //   if (pos < 0)
  //     return null;
  //   return this.read(pos);
  // }

  advance(count = 1): Promise<T> {
    // const stack = new Error().stack;
    return new Promise(resolve => {
      let currValue: T;
      let i = 0;

      const read = () => {
        if (i++ < count) {
          this.la(1)
          .then(value => {
            if (value == null) {
              return this.throwError('Unexpect EOF'); // , stack);
            }
            this.currPos++;
            this.column++;
            if ((value as any) === '\n') {
              this.line++;
              this.column = 1;
            }
            this.cached.shift();
            this.cacheStartPos++;
            if (this.currChunk && !this.currChunk.isClosed) {
              this.currChunk.values!.push(value);
            }
            currValue = value;
            read();
          });
        } else {
          this.lastConsumed = currValue;
          resolve(currValue);
        }
      };
      read();
    });
  }

  /**
	 * Same as `return la(1) === values[0] && la(2) === values[1]...`
	 * @param values lookahead string or tokens
	 */
  async isNext(...values: T[]): Promise<boolean> {
    return this._isNext<T>(values);
  }

  async _isNext<C>(values: C[], isEqual = (a: T, b: C) => a as any === b): Promise<boolean> {
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
    let next = await this.la(i + 1);
    while (true) {
      if (i === l)
        return true;
      next = await this.la(i + 1);
      if (next == null)
        return false; // EOF
      else if (!compareFn(next, compareTo[i]))
        return false;
      i++;
    }
  }

  throwError(unexpected = 'End-of-stream', stack?: any) {
    // tslint:disable-next-line: max-line-length
    throw new Error(`In ${this.name} unexpected ${JSON.stringify(unexpected)} at ${this.getCurrentPosInfo()}, ${stack ? 'previous stack:' + stack : ''}`);
  }

  getCurrentPosInfo(): string {
    return `offset ${this.currPos} [${this.line}:${this.column}]`;
  }

  startChunk<TK>(type: TK) {
    if (this.currChunk && !this.currChunk.isClosed)
      this.currChunk.close(this.currPos);
    this.currChunk = new Chunk<T>(this.currPos, this.line, this.column);
    this.currChunk.type = type;
  }

  closeChunk() {
    return this.currChunk.close(this.currPos);
  }

  /**
	 * Do not read postion less than 0
	 * @param pos 
	 */
  protected read(pos: number): Promise<T | null> {
    const cacheOffset = pos - this.cacheStartPos;
    if (cacheOffset < 0) {
      throw new Error(`Can not read behind stream cache, at position: ${pos}`);
    }
    if (cacheOffset < this.cached.length) {
      return Promise.resolve(this.cached[cacheOffset]);
    } else {
      this.waitForPos = pos;
      return new Promise(resolve => {
        this.readResolve = resolve;
      });
    }
  }
}

export interface LookAheadObservable<T> extends LookAhead<T> {
  startToken: LookAhead<T>['startChunk'];
  emitToken(): void;
}

