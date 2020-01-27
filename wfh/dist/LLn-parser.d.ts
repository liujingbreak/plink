import { Observable, OperatorFunction, Subscriber } from 'rxjs';
export declare class Chunk<V, T> {
    pos: number;
    line: number;
    col: number;
    type: T;
    values?: V[];
    end?: number;
    isClosed: boolean;
    trackValue: boolean;
    constructor(pos: number, line: number, col: number);
    close(position: number): this;
}
export declare class Token<T> extends Chunk<string, T> {
    text: string;
}
/**
 * You can define a lexer as a function
 */
export declare type ParseLex<I, T> = (la: LookAheadObservable<I, T>, sub: Subscriber<Chunk<I, T>>) => void;
export declare type ParseGrammar<A, T> = (la: LookAhead<Token<T>, T>) => A;
/**
 * Parser
 * @param input string type
 * @param parseLex
 * @param parseGrammar
 */
export declare function parser<I, A, T>(name: string, input: Observable<Iterable<I>>, parseLex: ParseLex<I, T>, pipeOperators: Iterable<OperatorFunction<Token<T>, Token<T>>> | null, parseGrammar: ParseGrammar<A, T>): A | undefined;
export declare function mapChunksObs<I, O>(name: string, parse: (la: LookAhead<I>) => O): (input: Observable<Iterable<I>>) => Observable<O>;
export declare function mapChunks<I, T>(name: string, parse: ParseLex<I, T>): (input: Observable<Iterable<I>>) => Observable<Chunk<I, T>>;
export declare class LookAhead<T, TT = any> {
    protected name: string;
    private onDrain?;
    static WAIT_ERROR: 'WAIT_ERROR';
    cached: Array<T | null>;
    line: number;
    column: number;
    lastConsumed: T;
    private currPos;
    private cacheStartPos;
    private currChunk;
    constructor(name: string, onDrain?: (() => void) | undefined);
    _write(values: Iterable<T | null>): void;
    _final(): void;
    readonly position: number;
    /**
       * look ahead for 1 character
       * @param num default is 1
       * @return null if EOF is reached
       */
    la(num?: number): T | null;
    advance(count?: number): T;
    isNext(...values: T[]): boolean;
    /**
       * Same as `return la(1) === values[0] && la(2) === values[1]...`
       * @param values lookahead string or tokens
       */
    isNextWith<C>(values: C[], isEqual?: (a: T, b: C) => boolean): boolean;
    assertAdvance(...values: T[]): Promise<boolean>;
    assertAdvanceWith<C>(values: C[], isEqual?: (a: T, b: C) => boolean): Promise<boolean>;
    throwError(unexpected?: string, stack?: any, expect?: string): void;
    getCurrentPosInfo(): string;
    startChunk(type: TT, trackValue?: boolean): Chunk<T, TT>;
    closeChunk(): Chunk<T, TT>;
    /**
       * Do not read postion less than 0
       * @param pos
       */
    private read;
}
export interface LookAheadObservable<V, T> extends LookAhead<V, T> {
    startToken: LookAhead<V, T>['startChunk'];
    emitToken(): Chunk<V, T>;
}
