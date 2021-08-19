import * as rx from 'rxjs';
export declare enum HtmlTokenType {
    '<' = 0,
    '>' = 1,
    '/>' = 2,
    '(' = 3,
    ')' = 4,
    '[' = 5,
    ']' = 6,
    '</' = 7,
    '=' = 8,
    qm = 9,
    identity = 10,
    stringLiteral = 11,
    any = 12,
    space = 13,
    comment = 14
}
declare class Context<T, U> {
    output: rx.Subscriber<U>;
    currValue: T;
    index: number;
    error?: string;
    rootScope: HandlerScope<T, U>;
    currScope: HandlerScope<T, U>;
    _needRestore: boolean;
    _cacheData: T[];
    _cacheStartPos: number;
    _marker: number[];
    constructor(rootScopeCreator: () => HandlerScope<T, U>, output: rx.Subscriber<U>);
    mark(): void;
    clearMark(): void;
    restore(): void;
    _onNext(inputValue: T, index: number): void;
}
interface Step<T, U> {
    next?: Step<T, U>;
    scope: HandlerScope<T, U>;
}
interface HandlerScope<T, U> {
    name: string;
    startStep: Step<T, U>;
    curreStep: Step<T, U>;
    parent?: HandlerScope<T, U>;
    run(ctx: Context<T, U>): void;
}
declare type StateHandler<T, U> = (ctx: Context<T, U>) => boolean;
interface HandlerFactory<T, U> {
    (): {
        name: string;
        handler: StateHandler<T, U>;
    };
    _isHandler: true;
}
export declare function createParseOperator<T, U>(rootHandler: StateHandler<T, U>): (input: rx.Observable<T>) => rx.Observable<U>;
export declare function createPath<T extends string | {
    toString(): string;
}, U>(name: string, ...values: (T | HandlerFactory<T, U>)[]): ReturnType<HandlerFactory<T, U>>;
interface Choice<T, U> {
    /** look ahead */
    la: T | HandlerFactory<T, U>;
    path: T | HandlerFactory<T, U>;
}
export declare function createBranch<T extends string | {
    toString(): string;
}, U>(name: string, ...choices: Choice<T, U>[]): ReturnType<HandlerFactory<T, U>>;
export {};
