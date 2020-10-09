// tslint:disable no-console
import {Token, BaseParser, BaseLexer} from '@wfh/plink/wfh/dist/base-LLn-parser';

export enum TokenType {
  skip,
  id,
  function,
  stringLiteral,
  any,
  space,
  '(',
  ')'
}

export class ScssLexer extends BaseLexer<TokenType> {
  inParentheses = false;
  *[Symbol.iterator](): Iterator<Token<TokenType>> {
    while (true) {
      let char = this.la();
      const start = this.position;
      if (char == null) {
        return;
      }
      if (this.la() === '/' && (this.la(2) === '/' || this.la(2) === '*')) {
        if (this.comments())
          continue;
      }
      char = this.la();
      if (char && /\s/.test(char)) {
        this.spaces();
        continue;
      }
      switch (char) {
        case '"':
          yield this.stringLit('"');
          break;
        case '\'':
          yield this.stringLit('\'');
          break;
        case '@':
          yield this.identity();
          break;
        case '(':
          this.inParentheses = true;
        case ')':
          this.advance();
          yield new Token(TokenType[char], this, start);
          break;
        default:
          if (char && /[a-zA-Z0-9_\-:\$]/.test(char)) {
            yield this.identity(TokenType.id);
            break;
          }
          this.advance();
          yield new Token(TokenType.any, this, start);
          break;
      }
    }
  }

  identity(type = TokenType.function) {
    const start = this.position;
    this.advance();
    while (this.la() && /[a-zA-Z0-9_-]/.test(this.la()!)) {
      this.advance();
    }
    return new Token(type, this, start);
  }

  stringLit(quote: string) {
    this.advance();
    const start = this.position;
    while (this.la() !== quote) {
      if (this.la() == null)
        this.throwError();
      // console.log(':', this.la());
      if (this.la() === '\\') {
        this.advance();
      }
      this.advance();
    }
    const tk = new Token(TokenType.stringLiteral, this, start);
    this.advance();
    return tk;
  }

  spaces() {
    const start = this.position;
    while (this.la() != null && /\s/.test(this.la()!)) {
      this.advance();
    }
    return new Token(TokenType.skip, this, start);
  }
  comments() {
    if (this.inParentheses && this.isNext('/', '/'))
      return null; // Do not consider '//' as comment in a parentheses like ulr(http://...)
    const start = this.position;
    this.advance();
    if (this.isNext('/')) {
      this.advance(2);
      while (this.la() !== '\n' && this.la() != null) {
        this.advance();
      }
        this.advance();
    } else if (this.isNext('*')) {
      this.advance(2);
      while (!this.isNext('*/') && this.la() != null) {
        this.advance();
      }
      this.advance(2);
    }
    return new Token(TokenType.skip, this, start);
  }
}

export class ScssParser extends BaseParser<TokenType> {
  getResUrl(text: string): Array<{start: number, end: number, text: string}> {
    const res: Array<{start: number, end: number, text: string}> = [];
    while(this.la() != null) {
      if (this.isNextTypes(TokenType.id, TokenType['(']) &&
        this.la()!.text === 'url' && this.lb()!.text !== '@import') {
          const start = this.la(2)!.end;
          this.advance(2); // jump over '('
          if (this.isNextTypes(TokenType.stringLiteral)) {
            const stringLit = this.la();
            if (stringLit == null)
              this.throwError('End of file');
            this.advance();
            res.push(stringLit!);
          } else {
            while(this.la() != null && this.la()!.type !== TokenType[')']) {
              this.advance();
            }
            if (this.la() == null)
              this.throwError('End of file');
            const end = this.la()!.start;
            res.push({start, end, text: text.slice(start, end)});
          }
      } else {
        this.advance();
      }
    }
    return res;
  }

  getAllImport(text: string): Array<{start: number, end: number, text: string}> {
    const res: Array<{start: number, end: number, text: string}> = [];
    while (this.la() != null) {
      if (this.isNextTypes(TokenType.function, TokenType.stringLiteral) && this.la()!.text === '@import') {
        res.push(this.la(2)!);
        this.advance(2);
      } else if (this.isNextTypes(TokenType.function, TokenType.id, TokenType['(']) &&
        this.la()!.text === '@import' && this.la(2)!.text === 'url') {
          const start = this.la(3)!.end;
          this.advance(3);
          while(this.la() != null && this.la()!.type !== TokenType[')']) {
            this.advance();
          }
          if (this.la() == null)
            throw new Error('Unexpect end of file');
          const end = this.la()!.start;
          this.advance();
          res.push({start, end, text: text.slice(start, end)});
      } else
        this.advance();
    }
    return res;
  }
}
