
import { from } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LookAhead, LookAheadObservable, parser, Token } from '../LLn-parser';

export default function parse(content: string, onToken?: (token: Token<string>) => void) {
  const operators = onToken ? [tap(onToken)] : null;

  // from([content.split('')]).pipe(observeOn(queueScheduler)).subscribe(s => console.log(s));
  return parser('JSON', from([content.split('')]), parseLex, operators, parseGrammar);
}

export { Token };

function parseLex(
  strLookAhead: LookAheadObservable<string, string>) {
  let char = strLookAhead.la();
  while (char != null) {
    if (/[{}\[\],:]/.test(char)) {
      strLookAhead.startToken(char);
      strLookAhead.advance();
      strLookAhead.emitToken();
    } else if (/\s/.test(char)) {
      do {
        strLookAhead.advance();
        char = strLookAhead.la();
      } while (char && /\s/.test(char));
    } else if (/["']/.test(char)) {
      strLookAhead.startToken('stringLiteral');
      const openChar = strLookAhead.advance();
      while (true) {
        const la = strLookAhead.la();
        if (la == null) {
          return strLookAhead.throwError();
        }
        if (la === '\\') {
          strLookAhead.advance(2);
        } else if (la === openChar) {
          strLookAhead.advance();
          strLookAhead.emitToken();
          break;
        } else {
          strLookAhead.advance();
        }
      }
    } else {
      strLookAhead.startToken('other');
      let next: string | null;
      do {
        strLookAhead.advance();
        next = strLookAhead.la();
      } while (next != null && !/[{}\[\],:\s'"]/.test(next));
      strLookAhead.emitToken();
    }
    char = strLookAhead.la();
  }
}

type Lexer = LookAhead<Token<string>, string>;

enum AstType {
  object = 0,
  array,
  property,
  value
}

export interface Ast {
  type: AstType;
}

export interface ObjectAst extends Ast {
  properties: {name: Token<string>, value: Ast|Token<string>}[];
}

export interface ArrayAst extends Ast {
  items: Array<Ast | Token<string>>;
}

export interface ValueAst extends Ast {
  value: Token<string>;
}

function parseGrammar(tokenLa: Lexer) {
  return doObject(tokenLa);
}

function doObject(lexer: Lexer): ObjectAst {
  const ast: ObjectAst = {
    type: AstType.object,
    properties: []
  };
  lexer.advance();
  let next = lexer.la();
  while (next != null && next.type !== '}') {
    const propToken = lexer.advance();
    const colon = lexer.advance();
    if (colon.type !== ':') {
      throw new Error(`Expect ':' but recieve '${colon.text}' at ${colon.line}:${colon.col}`);
    }

    ast.properties.push({name: propToken, value: doValue(lexer)});
    next = lexer.la();
    if (next && next.type === ',')
      lexer.advance();
    next = lexer.la();
  }
  lexer.advance(); // }
  return ast;
}

function doArray(lexer: Lexer): ArrayAst {
  const ast: ArrayAst = {
    type: AstType.array,
    items: []
  };
  lexer.advance();
  let next = lexer.la();
  while (next != null && next.type !== ']') {
    if (next.type !== ',') {
      ast.items.push(doValue(lexer));
    }
    next = lexer.la();
  }
  if (next && next.type === ']')
    lexer.advance(); // ]
  else if (next == null)
    throw new Error('Unexpect EOF after ' + lexer.lastConsumed!.text);
  else
    throw new Error(`Unexpect ${next.text} at ${next.line}:${next.col}`);
  return ast;
}

function doValue(lexer: Lexer) {
  const next = lexer.la();
  if (next === null) {
    throw new Error('Unexpect EOF');
  }
  if (next.type === '{') {
    return doObject(lexer);
  } else if (next.type === '[') {
    return doArray(lexer);
  } else if (next.type === 'stringLiteral' || next.type === 'other') {
    return lexer.advance();
  } else {
    throw new Error(`Unexpect '${next.text}' at ${next.line}:${next.col}`);
  }
}
