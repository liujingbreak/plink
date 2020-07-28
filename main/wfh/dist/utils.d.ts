import { BaseLexer, Token } from './base-LLn-parser';
import { isDrcpSymlink } from './node-path';
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
export interface PackageTsDirs {
    srcDir: string;
    destDir: string;
    isomDir: string;
}
export declare function getTsDirsOfPackage(json: any): PackageTsDirs;
export declare const getRootDir: () => string;
export { isDrcpSymlink };
