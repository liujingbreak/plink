import { BaseLexer, Token } from './base-LLn-parser';
import trim from 'lodash/trim';
import get from 'lodash/get';

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
  let updated = `${'-'.repeat(lineWidth + 4)}\n`;
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
  updated += `${'-'.repeat(lineWidth + 4)}`;
  return updated;
}

export interface PackageTsDirs {
  srcDir: string;
  destDir: string;
  isomDir: string;
}

export function getTsDirsOfPackage(json: any): PackageTsDirs {
  let srcDir = get(json, 'dr.ts.src', 'ts');
  let destDir = get(json, 'dr.ts.dest', 'dist');
  let isomDir = get(json, 'dr.ts.isom', 'isom');

  destDir = trim(trim(destDir, '\\'), '/');
  srcDir = trim(trim(srcDir, '/'), '\\');
  isomDir = trim(trim(isomDir, '/'), '\\');
  return {
    srcDir, destDir, isomDir
  };
}

