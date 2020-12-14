import { BaseLexer, Token } from '../base-LLn-parser';
import trim from 'lodash/trim';
import get from 'lodash/get';
import _ from 'lodash';
import * as Path from 'path';
// import * as fs from 'fs';
import {PlinkEnv} from '../node-path';
import * as cfonts from 'cfonts';
import Table from 'cli-table3';

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

export function boxString(text: string, lineWidth = 70, whitespaceWrap = true): string {
  const tb = createCliTable({
    colWidths: [lineWidth],
    wordWrap: whitespaceWrap
  });
  tb.push([text]);
  return tb.toString();
  // const lexer = new WordLexer(text);

  // lineWidth = lineWidth - 4;
  // let updated = `+${'-'.repeat(lineWidth + 2)}+\n`;
  // let column = 0;
  // for (const word of lexer) {
  //   if (word.type === WordTokenType.word || word.type === WordTokenType.eos || word.type === WordTokenType.other ||
  //     word.type === WordTokenType.tab) {
  //     if (column === 0) {
  //       updated += '| ';
  //     }
  //     if (column + word.text.length > lineWidth) {
  //       updated += ' '.repeat(lineWidth - column);
  //       updated += ' |\n| ';
  //       // pad
  //       column = 0;
  //     }
  //     updated += word.type === WordTokenType.tab ? '  ' : word.text;
  //     column += word.type === WordTokenType.tab ? 2 : word.text.length;
  //   } else if (word.type === WordTokenType.eol) {
  //     if (column === 0) {
  //       updated += '| ';
  //     }
  //     updated += ' '.repeat(lineWidth - column);
  //     updated += ' |\n';
  //     column = 0;
  //   }
  // }
  // if (column !== 0) {
  //   updated += ' '.repeat(lineWidth - column);
  //   updated += ' |\n';
  // }
  // updated += `+${'-'.repeat(lineWidth + 2)}+`;
  // return updated.replace(/^(?=.)/mg, '  ');
}

export function sexyFont(text: string, color = '#99a329', font: cfonts.FontOption['font'] = 'block') {
  return cfonts.render(text, {font, colors: [color]});
}

export interface CliTableOption extends NonNullable<ConstructorParameters<Table>[0]> {
  horizontalLines?: boolean;
}

export function createCliTable(opt?: CliTableOption) {
  const tableOpt: CliTableOption = {
    // style: {head: []},
    wordWrap: true,
    ...opt
  };
  delete tableOpt.horizontalLines;

  if (opt && opt.horizontalLines === false) {
    tableOpt.chars = {mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '', 'top-mid': ''};
  }
  if (opt && opt.horizontalLines) {
    tableOpt.colAligns = opt.colAligns;
  }
  return new Table(tableOpt);
}

export interface PackageTsDirs {
  srcDir: string;
  destDir: string;
  isomDir?: string;
  globs?: string[];
}

export function getTscConfigOfPkg(json: any): PackageTsDirs {
  const globs: string[] | undefined = get(json, 'dr.ts.globs');
  const srcDir = get(json, 'dr.ts.src', 'ts');
  const isomDir = get(json, 'dr.ts.isom', 'isom');
  let destDir = get(json, 'dr.ts.dest', 'dist');

  destDir = trim(trim(destDir, '\\'), '/');
  return {
    srcDir, destDir, isomDir, globs
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

export class SimpleLinkedListNode<T> {
  constructor(
    public prev: SimpleLinkedListNode<T> | null,
    public next: SimpleLinkedListNode<T> | null,
    public value: T
  ) {}
}

export class SimpleLinkedList<T> {
  first: SimpleLinkedListNode<T> | null;
  last: SimpleLinkedListNode<T> | null;

  removeNode(node: SimpleLinkedListNode<T>) {
    if (node.prev)
      node.prev.next = node.next;
    if (node.next)
      node.next.prev = node.prev;
    if (this.first === node) {
      this.first = node.next;
    }
    if (this.last === node) {
      this.last = node.prev;
    }
  }

  push(value: T): SimpleLinkedListNode<T> {
    const node = new SimpleLinkedListNode<T>(this.last, null, value);
    if (this.last)
      this.last.next = node;
    this.last = node;
    if (this.first == null) {
      this.first = node;
    }
    return node;
  }

  *traverse() {
    for (let curr = this.first; curr != null; curr = curr.next) {
      yield curr.value;
    }
  }
}
