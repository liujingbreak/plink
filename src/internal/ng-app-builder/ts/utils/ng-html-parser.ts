/* tslint:disable max-classes-per-file max-line-length no-console jsdoc-format */
/**
 * TODO: Support parsing file with <script></script> tag contains special JS character like "<" and ">"
 */
import {Token, BaseParser, BaseLexer} from 'dr-comp-package/wfh/dist/base-LLn-parser';

export enum HtmlTokenType {
  // comments,
  '<',
  '>',
  '/>',
  '(',
  ')',
  '[',
  ']',
  '</',
  '=',
  qm, // quotation mark
  identity,
  stringLiteral,
  any, // .*
  space
}

export {HtmlTokenType as TokenType};
export class TemplateLexer extends BaseLexer<HtmlTokenType> {
  *[Symbol.iterator](): Iterator<Token<HtmlTokenType>> {
    while (true) {
      this.skip();
      let char = this.la();
      const start = this.position;
      if (char == null) {
        return;
      }
      switch (char) {
        case '>':
        case '(':
        case ')':
        case '[':
        case ']':
        case '=':
          this.advance();
          yield new Token(HtmlTokenType[char], this, start);
          continue;
        case '"':
        case '\'':
          this.advance();
          yield new Token(HtmlTokenType.qm, this, start);
          continue;
        default:
      }
      if (char === '<' && this.isIdStart(2)) {
        yield this.openTagStart();
      } else if (this.isNext('</')) {
        yield this.closeTagStart();
      } else if (this.isNext('/>')) {
        this.advance(2);
        yield new Token(HtmlTokenType['/>'], this, start);
      } else if (this.isIdStart()) {
        do {
          this.advance();
          char = this.la();
        } while (this.isIdStart());
        yield new Token(HtmlTokenType.identity, this, start);
      // } else if (char === '"') {
      // 	yield this.stringLit('"');
      // } else if (char === '\'') {
      // 	yield this.stringLit('\'');
      // } else if (char === '`') {
      // 	yield this.stringLit('`');
      } else if (this.isWhitespace()) {
        do {
          this.advance();
        } while (this.isWhitespace());
        yield new Token(HtmlTokenType.space, this, start);
        continue;
      } else {
        yield new Token(HtmlTokenType.any, this, start);
        this.advance();
      }
    }
  }
  openTagStart() {
    const start = this.position;
    this.advance();
    do {
      this.advance();
    } while (this.isIdStart());
    return new Token(HtmlTokenType['<'], this, start);
  }
  closeTagStart() {
    const start = this.position;
    this.advance(2);
    while (this.la() !== '>') {
      this.advance();
    }
    return new Token(HtmlTokenType['</'], this, start);
  }
  isIdStart(laIdx = 1) {
    const char = this.la(laIdx);
    if (!char) {
      this.throwError('EOF');
      return;
    }
    return /[^<>()\[\]"'=`/]/.test(char) && /\S/.test(char);
  }
  isWhitespace() {
    const chr = this.la();
    return chr && /\s/.test(chr);
  }

  stringLit(quote: string) {
    this.advance();
    const start = this.position;
    const [line, col] = this.getLineColumn(start);
    while (this.la() !== quote) {
      if (this.la() == null) {
        console.log('endless string literal begin with line %s, col %s', line, col);
        this.throwError();
      }
      // console.log(':', this.la());
      if (this.la() === '\\') {
        this.advance();
      }
      this.advance();
    }
    const tk = new Token(HtmlTokenType.stringLiteral, this, start);
    this.advance();
    return tk;
  }

  skip() {
    let chr = this.la();
    while(chr != null) {
      if (this.isComment()) {
        this.comment();
      } else if (this.isSwigComment()) {
        this.swigComment();
      } else {
        break;
      }
      chr = this.la();
     }
     return this.la();
  }

  isComment() {
    return this.isNext('<!--');
  }
  comment() {
    this.advance(4);
    while(!this.isNext('-->')) {
      if (this.la() == null)
        throw new Error('Comment is not closed, ' + this.getCurrentPosInfo());
      this.advance();
    }
    this.advance(3);
    return true;
  }
  isSwigComment() {
    return this.isNext('{#');
  }
  swigComment() {
    this.advance(2);
    while (!this.isNext('#}')) {
      this.advance();
    }
  }
}

export interface TagAst {
  name: string;
  attrs?: {[key: string]: {isNg: boolean, value?: AttributeValueAst}};
  start: number;
  end: number;
  [key: string]: any;
}
export interface AttributeValueAst {
  text: string; start: number; end: number;
}
export class TemplateParser extends BaseParser<HtmlTokenType> {
  lexer: TemplateLexer;
  text: string;
  constructor(input: string) {
    const lexer = new TemplateLexer(input);
    super(lexer);
    this.lexer = lexer;
    this.text = input;
  }

  getCurrentPosInfo(): string {
    const start = this.la() ? this.la()!.start : null;
    if (start) {
      const lineCol = this.lexer.getLineColumn(start);
      return `Line ${lineCol[0] + 1} column ${lineCol[1] + 1}`;
    }
    return '<end of file>';
  }
  skip() {
    while (this.la() != null && this.la()!.type === HtmlTokenType.space) {
      this.advance();
    }
  }
  parse(): TagAst[] {
    const ast: TagAst[] = [];
    while(this.la() != null) {
      if (this.la()!.type === HtmlTokenType['<']) {
        ast.push(this.tag());
      } else if (this.la()!.type === HtmlTokenType['</']) {
        this.advance();
      } else {
        this.advance();
      }
    }
    return ast;
  }
  tag(): TagAst {
    const first = this.advance()!;
    const name = first.text.substring(1);
    const attrs = this.attributes();
    if (this.la() ==null) {
      this.throwError('EOF');
    }
    const last = this.advance(); // >
    return {name, attrs, start: first.start, end: last!.end};
  }
  attributes(): {[key: string]: {isNg: boolean, value: AttributeValueAst | undefined}} {
    const attrs: {[key: string]: {isNg: boolean, value: AttributeValueAst | undefined}} = {};
    while (this.la() && !this.isNextTypes(HtmlTokenType['>']) && !this.isNextTypes(HtmlTokenType['/>'])) {
      if (this.isNgAttrName()) {
        const key = this.ngAttrName();
        attrs[key] = {isNg: true, value: this.attrValue()};
      } else if (this.la()!.type === HtmlTokenType.identity) {
        const key = this.attrName();
        attrs[key] = {isNg: false, value: this.attrValue()};
      } else if (this.isNextTypes(HtmlTokenType.space)) {
        this.advance();
      } else {
        console.log('Previous tokens: ', this.lb()!.text);
        this.throwError(this.la()!.text);
      }
    }
    return attrs;
  }
  isNgAttrName() {
    if (this.la() == null)
      this.throwError('End of file');
    const type = this.la()!.type;
    return type === HtmlTokenType['['] || type === HtmlTokenType['('];
  }
  ngAttrName() {
    if (this.la() == null)
      this.throwError('End of file');
    const kind = this.la()!.type === HtmlTokenType['['] ? HtmlTokenType[']'] : HtmlTokenType[')'];
    let name: string;
    this.advance();
    if (this.isNgAttrName())
      name = this.ngAttrName();
    else
      name = this.attrName();
    if (this.la()!.type !== kind)
      this.throwError(this.la()!.text);
    this.advance();
    return name;
  }
  attrName() {
    return this.advance()!.text;
  }
  attrValue(): AttributeValueAst | undefined {
    if (this.la() && this.la()!.type === HtmlTokenType['=']) {
      // let {text, start, end} = this.advance(2);
      // return {text, start, end};
      this.advance();
      let start = this.la() && this.la()!.start;
      if (this.isNextTypes(HtmlTokenType.qm)) {
        const endText = this.advance()!.text;
        start = this.la() && this.la()!.start;
        while (this.la() && !this.isNextTokenText(endText)) {
          this.advance();
        }
        if (this.la() == null) {
          this.throwError('end of file');
        }
        const end = this.lb()!.end;
        this.advance();
        // console.log('value:', this.text.slice(start, end));
        return {
          text: this.text.slice(start!, end),
          start: start!,
          end
        };
      }

      while (this.la() && !this.isNextTypes(HtmlTokenType.space) &&
        !this.isNextTypes(HtmlTokenType['>'])) {
        this.advance();
      }
      if (this.la() == null) {
        this.throwError('end of file');
      }
      const end = this.lb()!.end;
      // console.log('value:', this.text.slice(start, end));
      return {
        text: this.text.slice(start!, end),
        start: start!,
        end
      };
    } else {
      return;
    }
  }
}
