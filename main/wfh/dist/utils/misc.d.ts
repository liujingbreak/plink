import { BaseLexer, Token } from '../base-LLn-parser';
import * as cfonts from 'cfonts';
import Table from 'cli-table3';
declare const isDrcpSymlink: boolean;
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
export declare type CliTableOption = {
    horizontalLines?: boolean;
} & NonNullable<ConstructorParameters<Table>[0]>;
export declare function createCliTable(opt?: CliTableOption): Table.Table;
export interface PackageTsDirs {
    srcDir: string;
    destDir: string;
    isomDir?: string;
    globs?: string[];
}
export declare function getTscConfigOfPkg(json: any): PackageTsDirs;
export declare const getRootDir: () => string;
export declare function closestCommonParentDir(paths: Iterable<string>): string;
export declare function isEqualMapSet<T>(set1: Set<T> | Map<T, any>, set2: Set<T> | Map<T, any>): boolean;
