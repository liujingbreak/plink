export declare class Chunk<V, T> {
    pos: number;
    line: number;
    col: number;
    type: T;
    values?: V[];
    end: number;
    isClosed: boolean;
    trackValue: boolean;
    constructor(pos: number, line: number, col: number);
    close(position: number): this;
}
export declare class Token<T> extends Chunk<string, T> {
    text: string;
}
export declare type Lexer<V, T, C extends Chunk<V, T> = Chunk<V, T>> = (la: LookAhead<V, T>, emitter: TokenEmitter<V, T, C>) => void;
export declare type Grammar<C, A> = (tokenLa: LookAhead<C>) => A;
interface TokenEmitter<V, T, C> {
    emit(): void;
    end(): void;
}
export declare function parser<V, T, C extends Chunk<V, T>, A>(parserName: string, lexer: Lexer<V, T, C>, grammar: Grammar<C, A>, chunkConverter?: (chunk: Chunk<V, T>) => C): {
    write: LookAhead<V, T>['_write'];
    end: LookAhead<V, T>['_final'];
    getResult: () => A;
};
export declare class LookAhead<V, T = any> {
    protected name: string;
    private onDrain?;
    static WAIT_ERROR: 'WAIT_ERROR';
    cached: Array<V | null>;
    line: number;
    column: number;
    lastConsumed: V;
    currChunk: Chunk<V, T>;
    private currPos;
    private cacheStartPos;
    constructor(name: string, onDrain?: ((this: LookAhead<V, T>) => void) | undefined);
    _write(values: Iterable<V | null>): void;
    _final(): void;
    readonly position: number;
    /**
       * look ahead for 1 character
       * @param num default is 1
       * @return null if EOF is reached
       */
    la(num?: number): V | null;
    advance(count?: number): V;
    isNext(...values: V[]): boolean;
    /**
       * Same as `return la(1) === values[0] && la(2) === values[1]...`
       * @param values lookahead string or tokens
       */
    isNextWith<C>(values: C[], isEqual?: (a: V, b: C) => boolean): boolean;
    assertAdvance(...values: V[]): boolean;
    assertAdvanceWith<C>(values: C[], isEqual?: (a: V, b: C) => boolean): boolean;
    throwError(unexpected?: string, stack?: any, expect?: string): void;
    getCurrentPosInfo(): string;
    startChunk(type: T, trackValue?: boolean): Chunk<V, T>;
    protected closeChunk(): Chunk<V, T>;
    /**
       * Do not read postion less than 0
       * @param pos
       */
    private read;
}
export {};
