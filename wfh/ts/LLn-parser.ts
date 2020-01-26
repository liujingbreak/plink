import { Observable, OperatorFunction, Subscriber } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import util from 'util';
export class Chunk<V, T> {
  type: T;
  values?: V[] = [];
  end?: number;
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
 * You can define a lexer as a function
 */
export type ParseLex<I, T> = (la: LookAheadObservable<I,T>, sub: Subscriber<Chunk<I, T>>) => void;
export type ParseGrammar<A, T> = (la: LookAhead<Token<T>, T>) => A;
/**
 * Parser
 * @param input string type
 * @param parseLex 
 * @param parseGrammar 
 */
export function parser<I, A, T>(
  name: string,
  input: Observable<Iterable<I>>,
  parseLex: ParseLex<I, T>,
  pipeOperators: Iterable<OperatorFunction<Token<T>, Token<T>>> | null,
  parseGrammar: ParseGrammar<A, T>
): A | undefined {

  const _parseGrammarObs = (la: LookAhead<Token<T>, T>) => {
    return parseGrammar(la);
  };

  let tokens = input.pipe(
    // observeOn(queueScheduler),
    mapChunks(name + '-lexer', parseLex),
    map(chunk => {
      (chunk as Token<T>).text = chunk.values!.join('');
      delete chunk.values;
      return chunk as Token<T>;
    })
  );
  if (pipeOperators) {
    for (const operator of pipeOperators)
      tokens = tokens.pipe(operator);
  }

  let result: A | undefined;
  tokens.pipe(
    map(token => [token]),
    mapChunksObs(name + '-parser', _parseGrammarObs),
    tap(ast => {
      result = ast;
    })
  ).subscribe();
  return result;
}

export function mapChunksObs<I, O>(name: string, parse: (la: LookAhead<I>) => O):
(input: Observable<Iterable<I>>)=> Observable<O> {

  return function(input: Observable<Iterable<I>>) {
    return new Observable<O>(sub => {
      const la = new LookAhead<I>(name);
      input.subscribe(input => la._write(input),
        err => sub.error(err),
        () => {
          la._final();
        }
      );
      try {
        sub.next(parse(la));
        sub.complete();
      } catch (err) {
        sub.error(err);
      }

    });
  };
}

export function mapChunks<I, T>(
  name: string,
  parse: ParseLex<I, T>
): (input: Observable<Iterable<I>>)=> Observable<Chunk<I, T>> {

  return function(input: Observable<Iterable<I>>) {
    return new Observable<Chunk<I, T>>(sub => {
      const la = new LookAhead<I, T>(name);

      input.subscribe(input => la._write(input),
        err => sub.error(err),
        () => {
          la._final();
          const la$ = la as LookAheadObservable<I, T>;
          la$.startToken = la.startChunk;

          la$.emitToken = function(this: LookAheadObservable<I, T>) {
            const chunk = this.closeChunk();
            sub.next(chunk);
            return chunk;
          };
          parse(la$, sub);
          sub.complete();
        }
      );
    });
  };
}

interface LookAheadState<T, TT> {
  line: number;
  column: number;
  currPos: number;
  cacheStartPos: number;
  currChunk: Chunk<T, TT>;
}
export class LookAhead<T, TT = any> {
  static WAIT_ERROR: 'WAIT_ERROR';
  cached: Array<T|null>;
  line = 1;
  column = 1;
  lastConsumed: T;
  private currPos = 0;
  private cacheStartPos = 0;
  private readResolve: () => void | undefined;
  private waitForPos: number | undefined;
  private currChunk: Chunk<T, TT>;

  private savedState: LookAheadState<T, TT> = {} as LookAheadState<T, TT>;

  constructor(protected name: string) {
    this.cached = [];
  }

  // _retryOnRefuel<R>(parseCb: (ctx: LookAhead<T, TT>) => R): R | Promise<R> {
  //   this.saveState();
  //   try {
  //     return parseCb(this);
  //   } catch (e) {
  //     if (e.message === LookAhead.WAIT_ERROR) {
  //       return new Promise(resolve => {
  //         this.readResolve = resolve;
  //         this.restoreState();
  //       }).then(() => {
  //         return this.retryOnRefuel(parseCb);
  //       }).catch(e => {

  //       });
  //     }
  //     throw e;
  //   }
  // }

  async retryOnRefuel<R>(parseCb: (ctx: LookAhead<T, TT>) => R): Promise<R> {
    while (true) {
      this.saveState();
      try {
        const res = await Promise.resolve(parseCb(this));
        return res;
      } catch (e) {
        if (e.code === 'WAIT') {
          this.restoreState();
          await new Promise(resolve => {
            this.readResolve = resolve;
          });
        } else {
          throw e;
        }
      }
    }
  }

  _write(values: Iterable<T|null>) {
    for (const v of values)
      this.cached.push(v);

    if (this.readResolve != null) {
      const resolve = this.readResolve;
      if (this.waitForPos! < this.cacheStartPos + this.cached.length) {
        delete this.readResolve;
        delete this.waitForPos;
        resolve();
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
  la(num = 1): T | null {
    const readPos = this.currPos + num - 1;
    return this.read(readPos);
  }

  advance(count = 1): T {
    // return new Promise(resolve => {
    let currValue: T;
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

  isNext(...values: T[]) {
    return this.isNextWith(values);
  }
  /**
	 * Same as `return la(1) === values[0] && la(2) === values[1]...`
	 * @param values lookahead string or tokens
	 */
  isNextWith<C>(values: C[], isEqual = (a: T, b: C) => a as any === b): boolean {
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

  assertAdvance(...values: T[]) {
    return this.assertAdvanceWith(values);
  }

  async assertAdvanceWith<C>(values: C[], isEqual = (a: T, b: C) => a as any === b) {
    let compareTo: C[]| string;
    let compareFn: (...arg: any[]) => boolean;
    compareTo = values;
    compareFn = isEqual;
    let i = 0;
    const l = compareTo.length;
    while (true) {
      if (i === l)
        return true;
      const next = await this.advance(i + 1);
      if (next == null)
        this.throwError('EOF', new Error().stack); // EOF
      else if (!compareFn(next, compareTo[i]))
        this.throwError(util.inspect(next), new Error().stack, compareTo[i] + '');
      i++;
    }
  }

  throwError(unexpected = 'End-of-stream', stack?: any, expect?: string) {
    // tslint:disable-next-line: max-line-length
    throw new Error(`In ${this.name} unexpected ${JSON.stringify(unexpected)}`+
    (expect ? `(expecting "${expect}")` : '') +
    `at ${this.getCurrentPosInfo()}, ${stack ? 'previous stack:' + stack : ''}`);
  }

  getCurrentPosInfo(): string {
    return `offset ${this.currPos} [${this.line}:${this.column}]`;
  }

  startChunk(type: TT, trackValue = true) {
    if (this.currChunk && !this.currChunk.isClosed)
      this.currChunk.close(this.currPos);
    this.currChunk = new Chunk<T, TT>(this.currPos, this.line, this.column);
    this.currChunk.trackValue = trackValue;
    this.currChunk.type = type;
    return this.currChunk;
  }

  closeChunk() {
    return this.currChunk.close(this.currPos);
  }

  private saveState() {
    this.savedState.line = this.line;
    this.savedState.column = this.column;
    this.savedState.currPos = this.currPos;
    this.savedState.currChunk = this.currChunk;
    this.savedState.cacheStartPos = this.cacheStartPos;
  }

  private restoreState() {
    this.line = this.savedState.line;
    this.column = this.savedState.column;
    this.currPos = this.savedState.currPos;
    this.currChunk = this.savedState.currChunk;
    this.cacheStartPos = this.savedState.cacheStartPos;
  }

  /**
	 * Do not read postion less than 0
	 * @param pos 
	 */
  private read(pos: number): T | null {
    const cacheOffset = pos - this.cacheStartPos;
    if (cacheOffset < 0) {
      throw new Error(`Can not read behind stream cache, at position: ${pos}`);
    }
    if (cacheOffset < this.cached.length) {
      return this.cached[cacheOffset];
    } else {
      this.waitForPos = pos;
      const err = new WaitError();
      throw err;
      // return new Promise(resolve => {
      //   this.readResolve = resolve;
      // });
    }
  }
}

class WaitError extends Error {
  code = 'WAIT';

  constructor() {
    super();
  }
}

export interface LookAheadObservable<V, T> extends LookAhead<V, T> {
  startToken: LookAhead<V, T>['startChunk'];
  emitToken(): Chunk<V, T>;
}

