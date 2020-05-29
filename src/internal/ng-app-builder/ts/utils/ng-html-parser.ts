/* tslint:disable max-classes-per-file max-line-length no-console jsdoc-format */
/**
 * TODO: Support parsing file with <script></script> tag contains special JS character like "<" and ">"
 */
// import {Token, BaseParser, BaseLexer} from 'dr-comp-package/wfh/dist/base-LLn-parser';
import {Lexer, Grammar, LookAhead, Token, createStringParser} from 'dr-comp-package/wfh/dist/LLn-parser';

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
  space,
  comment
}

export const lexer: Lexer<string, HtmlTokenType> = (la, emitter) => {
  let isLastCharUnknown = false;

  function emitUnknow() {
    if (isLastCharUnknown) {
      emitter.emit();
      isLastCharUnknown = false;
    }
  }

  const m = new LexerMemebers(la, emitter, emitUnknow);
  while (true) {
    let char = la.la();
    if (char == null) {
      emitUnknow();
      emitter.end();
      return;
    }
    if (m.isComment()) {
      la.startChunk(HtmlTokenType.comment);
      m.consumeComment();
      emitter.emit();
      continue;
    } else if (m.isSwigComment()) {
      la.startChunk(HtmlTokenType.comment);
      m.swigComment();
      emitter.emit();
      continue;
    }
    switch (char) {
      case '>':
      case '(':
      case ')':
      case '[':
      case ']':
      case '=':
        emitUnknow();
        la.startChunk(HtmlTokenType[char]);
        la.advance();
        emitter.emit();
        continue;
      case '"':
      case '\'':
        emitUnknow();
        la.startChunk(HtmlTokenType.qm);
        la.advance();
        emitter.emit();
        continue;
      default:
    }
    if (char === '<' && m.isIdStart(2)) {
      m.openTagStart();
    } else if (la.isNext('<', '/')) {
      m.closeTagStart();
    } else if (la.isNext('/', '>')) {
      emitUnknow();
      la.startChunk(HtmlTokenType['/>']);
      la.advance(2);
      emitter.emit();
    } else if (m.isIdStart()) {
      emitUnknow();
      la.startChunk(HtmlTokenType.identity);
      do {
        la.advance();
        char = la.la();
      } while (m.isIdStart());
      emitter.emit();
    } else if (m.isWhitespace()) {
      emitUnknow();
      la.startChunk(HtmlTokenType.space);
      do {
        la.advance();
      } while (m.isWhitespace());
      emitter.emit();
      // yield new Token(HtmlTokenType.space, this, start);
      continue;
    } else {
      if (!isLastCharUnknown) {
        la.startChunk(HtmlTokenType.any);
        isLastCharUnknown = true;
      }
      la.advance();
    }
  }
};

class LexerMemebers {
  constructor(private la: Parameters<Lexer<string, HtmlTokenType>>[0],
    private emitter: Parameters<Lexer<string, HtmlTokenType>>[1],
    private emitUnknow: () => void) {
  }

  openTagStart() {
    this.emitUnknow();
    this.la.startChunk(HtmlTokenType['<']);
    this.la.advance();
    do {
      this.la.advance();
    } while (this.isIdStart());
    this.emitter.emit();
  }
  closeTagStart() {
    this.emitUnknow();
    this.la.startChunk(HtmlTokenType['</']);
    this.la.advance(2);
    while (this.la.la() !== '>') {
      this.la.advance();
    }
    this.emitter.emit();
  }
  isIdStart(laIdx = 1) {
    const char = this.la.la(laIdx);
    if (!char) {
      this.la.throwError('EOF');
      return;
    }
    return /[^<>()\[\]"'=`/]/.test(char) && /\S/.test(char);
  }
  isWhitespace() {
    const chr = this.la.la();
    return chr && /\s/.test(chr);
  }

  stringLit(quote: string) {
    this.emitUnknow();
    this.la.advance();
    this.la.startChunk(HtmlTokenType.stringLiteral);
    const positionInfo = this.la.getCurrentPosInfo();
    while (this.la.la() !== quote) {
      if (this.la.la() == null) {
        console.log('endless string literal begin at', positionInfo);
        this.la.throwError();
      }
      // console.log(':', this.la());
      if (this.la.la() === '\\') {
        this.la.advance();
      }
      this.la.advance();
    }
    this.emitter.emit();
    // const tk = new Token(HtmlTokenType.stringLiteral, this, start);
    this.la.advance();
    // return tk;
  }

  isComment() {
    return this.la.isNext('<', '!', '-', '-');
  }
  consumeComment() {
    this.la.advance(4);
    while(!this.la.isNext('-', '-', '>')) {
      if (this.la.la() == null)
        throw new Error('Comment is not closed, ' + this.la.getCurrentPosInfo());
      this.la.advance();
    }
    this.la.advance(3);
    return true;
  }
  isSwigComment() {
    return this.la.isNext('{', '#');
  }
  swigComment() {
    this.la.advance(2);
    while (!this.la.isNext('#', '}')) {
      this.la.advance();
    }
    this.la.advance(2);
  }
}

export {HtmlTokenType as TokenType};

export interface ParseHtmlResult {
  /** Array only contains openning tags */
  tags: OpenTagAst[];
  allTags: BaseTagAst[];
  comments: Token<HtmlTokenType>[];
}

export enum TagKind {
  open, close
}

export interface BaseTagAst {
  kind: TagKind;
  name: string;
  start: number;
  end: number;
}

export interface OpenTagAst extends BaseTagAst {
  attrs?: {[key: string]: {isNg: boolean, value?: AttributeValueAst}};
  selfClosed: boolean;
  [key: string]: any;
}


export interface AttributeValueAst {
  text: string; start: number; end: number;
}

const grammar: Grammar<Token<HtmlTokenType>, ParseHtmlResult> = (tokenLa) => {
  const ast: OpenTagAst[] = [];
  const allTags: BaseTagAst[] = [];
  const comments: Token<HtmlTokenType>[] = [];
  while(tokenLa.la() != null) {
    if (tokenLa.la()!.type === HtmlTokenType['<']) {
      const tagAst = tag(tokenLa);
      ast.push(tagAst);
      allTags.push(tagAst);
    } else if (tokenLa.la()!.type === HtmlTokenType['</']) {
      const closingTagAst = closingTag(tokenLa);
      allTags.push(closingTagAst);
    } else if (tokenLa.la()!.type === HtmlTokenType.comment ) {
      comments.push(tokenLa.advance());
    } else {
      tokenLa.advance();
    }
  }
  return {
    tags: ast,
    comments,
    allTags
  };
};

function tag(tokenLa: LookAhead<Token<HtmlTokenType>>): OpenTagAst {
  const first = tokenLa.advance();
  const name = first.text.substring(1);
  const attrs = attributes(tokenLa);
  if (tokenLa.la() ==null) {
    this.throwError('EOF');
  }
  const last = tokenLa.advance(); // >
  return {kind: TagKind.open, name, attrs, start: first.pos, end: last!.end, selfClosed: last.type === HtmlTokenType['/>']};
}

function closingTag(tokenLa: LookAhead<Token<HtmlTokenType>>): BaseTagAst {
  const first = tokenLa.advance();
  const name = first.text.slice(2);
  const rightAngular = tokenLa.advance();
  return {kind: TagKind.close, name, start: first.pos, end: rightAngular.end};
}

function isSameType(token: Token<HtmlTokenType>, type: HtmlTokenType): boolean {
  return token.type === type;
}

function attributes(this: void, tokenLa: LookAhead<Token<HtmlTokenType>>): {[key: string]: {isNg: boolean, value: AttributeValueAst | undefined}} {
  const attrs: {[key: string]: {isNg: boolean, value: AttributeValueAst | undefined}} = {};
  while (tokenLa.la() && !tokenLa.isNextWith([HtmlTokenType['>']], isSameType) &&
    !tokenLa.isNextWith([HtmlTokenType['/>']], isSameType)) {
    if (isNgAttrName(tokenLa)) {
      const key = ngAttrName(tokenLa);
      attrs[key] = {isNg: true, value: attrValue(tokenLa)};
    } else if (tokenLa.la()!.type === HtmlTokenType.identity) {
      const key = attrName(tokenLa);
      attrs[key] = {isNg: false, value: attrValue(tokenLa)};
    } else if (tokenLa.isNextWith([HtmlTokenType.space], isSameType)) {
      tokenLa.advance();
    } else {
      const token = tokenLa.advance();
      throw new Error(`Unexpect token type: ${HtmlTokenType[token.type]}, text: ${token.text} at line: ${token.line}, column: ${token.col}`);
    }
  }
  return attrs;
}
function isNgAttrName(this: void, tokenLa: LookAhead<Token<HtmlTokenType>>) {
  if (tokenLa.la() == null)
    tokenLa.throwError('End of file');
  const type = tokenLa.la()!.type;
  return type === HtmlTokenType['['] || type === HtmlTokenType['('];
}
function ngAttrName(this: void, tokenLa: LookAhead<Token<HtmlTokenType>>) {
  if (tokenLa.la() == null)
    tokenLa.throwError('End of file');
  const kind = tokenLa.la()!.type === HtmlTokenType['['] ? HtmlTokenType[']'] : HtmlTokenType[')'];
  let name: string;
  tokenLa.advance();
  if (isNgAttrName(tokenLa))
    name = ngAttrName(tokenLa);
  else
    name = attrName(tokenLa);
  if (tokenLa.la()!.type !== kind)
    tokenLa.throwError(tokenLa.la()!.text);
  tokenLa.advance();
  return name;
}
function attrName(tokenLa: LookAhead<Token<HtmlTokenType>>) {
  return tokenLa.advance().text;
}
function attrValue(this: void, tokenLa: LookAhead<Token<HtmlTokenType>>): AttributeValueAst | undefined {
  if (tokenLa.la() && tokenLa.la()!.type === HtmlTokenType['=']) {
    // let {text, start, end} = this.advance(2);
    // return {text, start, end};
    tokenLa.advance();
    let start = tokenLa.la() && tokenLa.la()!.pos;
    let end = start!;
    if (tokenLa.la() && tokenLa.la()!.type === HtmlTokenType.qm) {
      const quoteMark = tokenLa.advance()!.text;
      start = tokenLa.la() && tokenLa.la()!.pos;
      while (tokenLa.la() && tokenLa.la()!.text !== quoteMark) {
        tokenLa.advance();
      }
      if (!tokenLa.isNextWith([quoteMark], (token, text) => token.text === text)) {
        throw new Error('Unexpect ' + tokenLa.la());
      }
      end = tokenLa.advance().pos;
      // console.log('value:', this.text.slice(start, end));
      return {
        start: start!,
        end,
        text: '(-,-)'
      };
    } else {
      let end = start!;
      while (tokenLa.la() && !tokenLa.isNextWith([HtmlTokenType.space], isSameType) &&
        !tokenLa.isNextWith([HtmlTokenType['>']], isSameType)) {
          end = tokenLa.advance().end;
      }
      if (tokenLa.la() == null) {
        tokenLa.throwError('end of file');
      }
      return {
        start: start!,
        end,
        text: '(-,-)'
      };
    }
  } else {
    return;
  }
}

const parseFunc = createStringParser<HtmlTokenType, ParseHtmlResult>('DrcpHtmlParser', lexer, grammar);

export default function parseHtml(input: string) {
  const result = parseFunc(input);
  for (const tag of result.tags) {
    if (tag.attrs) {
      for (const attrName in tag.attrs) {
        if (Object.prototype.hasOwnProperty.call(tag.attrs, attrName)) {
          const value = tag.attrs[attrName];
          if (value.value) {
            const {start, end} = value.value;
            value.value.text = input.slice(start, end);
          }
        }
      }
    }
  }
  return result;
}
