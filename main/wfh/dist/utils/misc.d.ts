import { BaseLexer, Token } from '../base-LLn-parser';
import '../node-path';
import type { PlinkEnv } from '../node-path';
import * as cfonts from 'cfonts';
import Table from 'cli-table3';
declare const isDrcpSymlink: boolean;
export declare const plinkEnv: PlinkEnv;
export { isDrcpSymlink };
export declare enum WordTokenType {
    eol = 0,
    word = 1,
    tab = 2,
    eos = 3,
    other = 4
}
export declare class WordLexer extends BaseLexer<WordTokenType> {
    [Symbol.iterator](): Iterator<Token<WordTokenType>>;
    consumeNumbers(): void;
}
export declare function boxString(text: string, lineWidth?: number, whitespaceWrap?: boolean): string;
export declare function sexyFont(text: string, color?: string, font?: cfonts.FontOption['font']): {
    string: string;
    array: string[];
    lines: number;
    options: cfonts.FontOption;
};
export interface CliTableOption extends NonNullable<ConstructorParameters<Table>[0]> {
    horizontalLines?: boolean;
}
export declare function createCliTable(opt?: CliTableOption): Table.Table;
export interface PackageTsDirs {
    /** srcDir works like "rootDir" in tsconfig compilerOptions */
    srcDir: string;
    destDir: string;
    isomDir?: string;
    /** For plink command tsc, "isomDir" will be ignored if "include" is set in package.json */
    include?: string[] | string;
    files?: string[] | string;
}
export declare function getTscConfigOfPkg(json: any): PackageTsDirs;
export declare const getRootDir: () => string;
/** get Plink work directory or process.cwd() */
export declare const getWorkDir: () => string;
export declare function getSymlinkForPackage(pkgName: string, workspaceDir?: string): string | null;
export declare function closestCommonParentDir(paths: Iterable<string>): string;
export declare function isEqualMapSet<T>(set1: Set<T> | Map<T, any>, set2: Set<T> | Map<T, any>): boolean;
export declare class SimpleLinkedListNode<T> {
    prev: SimpleLinkedListNode<T> | null;
    next: SimpleLinkedListNode<T> | null;
    value: T;
    constructor(prev: SimpleLinkedListNode<T> | null, next: SimpleLinkedListNode<T> | null, value: T);
}
export declare class SimpleLinkedList<T> {
    first: SimpleLinkedListNode<T> | null;
    last: SimpleLinkedListNode<T> | null;
    removeNode(node: SimpleLinkedListNode<T>): void;
    push(value: T): SimpleLinkedListNode<T>;
    traverse(): Generator<T, void, unknown>;
}
