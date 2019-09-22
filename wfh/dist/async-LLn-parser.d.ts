import { Observable, Subscriber, OperatorFunction } from 'rxjs';
export declare class Chunk<V> {
    pos: number;
    line: number;
    col: number;
    type: any;
    values?: V[];
    end?: number;
    isClosed: boolean;
    constructor(pos: number, line: number, col: number);
    close(position: number): this;
}
export declare class Token extends Chunk<string> {
    text: string;
}
export declare type ParseLex<I> = (la: LookAheadObservable<I>, sub: Subscriber<Chunk<I>>) => Promise<any>;
export declare type ParseGrammar<A> = (la: LookAhead<Token>) => Promise<A>;
/**
 * Parser
 * @param input string type
 * @param parseLex
 * @param parseGrammar
 */
export declare function parser<I, A>(name: string, input: Observable<I[]>, parseLex: ParseLex<I>, pipeOperators: OperatorFunction<Token, Token>[] | null, parseGrammar: ParseGrammar<A>): Promise<A>;
export declare function mapChunksObs<I, O>(name: string, parse: (la: LookAhead<I>) => Observable<O>): (input: Observable<I[]>) => Observable<O>;
export declare function mapChunks<I>(name: string, parse: ParseLex<I>): (input: Observable<I[]>) => Observable<Chunk<I>>;
export declare class LookAhead<T> {
    protected name: string;
    cached: Array<T | null>;
    lastConsumed: T | undefined | null;
    isString: boolean;
    line: number;
    column: number;
    protected currPos: number;
    private cacheStartPos;
    private readResolve;
    private waitForPos;
    private currChunk;
    constructor(name: string);
    _write(values: Array<T | null>): void;
    _final(): void;
    readonly position: number;
    /**
       * look ahead for 1 character
       * @param num default is 1
       * @return null if EOF is reached
       */
    la(num?: number): Promise<T | null>;
    advance(count?: number): Promise<T>;
    /**
       * Same as `return la(1) === values[0] && la(2) === values[1]...`
       * @param values lookahead string or tokens
       */
    isNext(...values: T[]): Promise<boolean>;
    _isNext<C>(values: C[], isEqual?: (a: T, b: C) => boolean): Promise<boolean>;
    throwError(unexpected?: string, stack?: any): void;
    getCurrentPosInfo(): string;
    startChunk<TK>(type: TK): void;
    closeChunk(): Chunk<T>;
    /**
       * Do not read postion less than 0
       * @param pos
       */
    protected read(pos: number): Promise<T | null>;
}
export interface LookAheadObservable<T> extends LookAhead<T> {
    startToken: LookAhead<T>['startChunk'];
    emitToken(): void;
}
