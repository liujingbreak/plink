import { BaseLexer, Token } from '../base-LLn-parser';
import trim from 'lodash/trim';
import get from 'lodash/get';
import _ from 'lodash';
import * as Path from 'path';
// import * as fs from 'fs';
import {PlinkEnv} from '../node-path';

const {isDrcpSymlink, rootDir} = JSON.parse(process.env.__plink!) as PlinkEnv;

export {isDrcpSymlink};

export enum WordTokenType {
  eol = 0,
  word,
  tab,
  eos, // end of sentence
  other
}

export class WordLexer extends BaseLexer<WordTokenType> {
  *[Symbol.iterator](): Iterator<Token<WordTokenType>> {
    while (this.la() != null) {
      const start = this.position;
      switch (this.la()) {
        case '\n':
          this.advance();
          if (this.la() === '\r')
            this.advance();
          yield new Token(WordTokenType.eol, this, start);
          break;
        case '\t':
          this.advance();
          yield new Token(WordTokenType.tab, this, start);
          break;
        default:
          const first = this.la()!;
          if (/[a-zA-Z$_]/.test(first)) {
            this.advance();
            while(this.la() != null && /[a-zA-Z$_0-9]/.test(this.la()!)) {
              this.advance();
            }
            if (/-/.test(this.la()!))
              this.advance();
            yield new Token(WordTokenType.word, this, start);
            break;
          }
          if (/[0-9]/.test(this.la()!)) {
            this.consumeNumbers();
            yield new Token(WordTokenType.word, this, start);
            break;
          }
          if (first === '-' && this.la(2) && /[0-9]/.test(this.la(2)!)) {
            this.advance();
            this.consumeNumbers();
            yield new Token(WordTokenType.word, this, start);
            break;
          }
          if (/[,.]/.test(first)) {
            this.advance();
            yield new Token(WordTokenType.eos, this, start);
            break;
          }
          this.advance();
          yield new Token(WordTokenType.other, this, start);
      }
    }
  }

  consumeNumbers() {
    // if (/[0-9]/.test(this.la())) {
    this.advance();
    while(this.la() != null && /[0-9.]/.test(this.la()!)) {
      this.advance();
    }
    // }
  }
}

export function boxString(text: string, lineWidth = 60, whitespaceWrap = true): string {
  const lexer = new WordLexer(text);

  lineWidth = lineWidth - 4;
  let updated = `+${'-'.repeat(lineWidth + 2)}+\n`;
  let column = 0;
  for (const word of lexer) {
    if (word.type === WordTokenType.word || word.type === WordTokenType.eos || word.type === WordTokenType.other ||
      word.type === WordTokenType.tab) {
      if (column === 0) {
        updated += '| ';
      }
      if (column + word.text.length > lineWidth) {
        updated += ' '.repeat(lineWidth - column);
        updated += ' |\n| ';
        // pad
        column = 0;
      }
      updated += word.type === WordTokenType.tab ? '  ' : word.text;
      column += word.type === WordTokenType.tab ? 2 : word.text.length;
    } else if (word.type === WordTokenType.eol) {
      if (column === 0) {
        updated += '| ';
      }
      updated += ' '.repeat(lineWidth - column);
      updated += ' |\n';
      column = 0;
    }
  }
  if (column !== 0) {
    updated += ' '.repeat(lineWidth - column);
    updated += ' |\n';
  }
  updated += `+${'-'.repeat(lineWidth + 2)}+`;
  return updated.replace(/^(?=.)/mg, '  ');
}

export interface PackageTsDirs {
  /** Entry TS file list  */
  tsEntry?: string[] | null;
  /** Entry TS isomphic file list */
  isomEntry?: string[] | null;
  srcDir: string;
  destDir: string;
  isomDir?: string;
}

export function getTsDirsOfPackage(json: any): PackageTsDirs {
  const tsEntry: string[] | string | null = get(json, 'dr.tsEntry', null);
  const isomEntry: string[] | string | null = get(json, 'dr.isomEntry', null);
  let srcDir = get(json, 'dr.ts.src', 'ts');
  let isomDir = get(json, 'dr.ts.isom', 'isom');
  if (tsEntry == null) {
    srcDir = trim(trim(srcDir, '/'), '\\');
  }
  if (isomEntry == null) {
    isomDir = trim(trim(isomDir, '/'), '\\');
  }
  let destDir = get(json, 'dr.ts.dest', 'dist');

  destDir = trim(trim(destDir, '\\'), '/');
  return {
    tsEntry: typeof tsEntry === 'string' ? [tsEntry] : tsEntry,
    isomEntry: typeof isomEntry === 'string' ? [isomEntry] : isomEntry,
    srcDir, destDir, isomDir
  };
}

export const getRootDir = () => rootDir;

export function closestCommonParentDir(paths: Iterable<string>) {
  let commonDir: string[] | undefined;

  for (const realPath of paths) {
    if (commonDir == null) {
      commonDir = realPath.split(Path.sep);
      continue;
    }
    const dir = realPath.split(Path.sep);
    // Find the closest common parent directory, use it as rootDir
    for (let i = 0, l = commonDir.length; i < l; i++) {
      if (i >= dir.length || commonDir[i] !== dir[i]) {
        commonDir = commonDir.slice(0, i);
        break;
      }
    }
  }
  return commonDir ? commonDir.join(Path.sep) : process.cwd();
}

// interface MapOrSet extends Iterable<any> {
//   size: number;
//   has(el: any): boolean;
// }
export function isEqualMapSet<T>(set1: Set<T> | Map<T, any>, set2: Set<T> | Map<T, any>) {
  if (set1.size !== set2.size)
    return false;
  for (const el of set1 instanceof Map ? set1.keys() : set1) {
    if (!set2.has(el))
      return false;
  }
  for (const el of set2 instanceof Map ? set2.keys() : set2) {
    if (!set1.has(el))
      return false;
  }
  return true;
}
