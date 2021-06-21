
import { Chunk, Grammar, Lexer, parser } from '../LLn-parser';

export type Token = Chunk<string, string> & {/** string literal contains "" or '' */text: string};

const lexer: Lexer<string, string, Token> = function(
  strLookAhead, emitter) {
  let char = strLookAhead.la();
  if (char == null) {
    emitter.end();
    return;
  }
  if (/[{}\[\],:]/.test(char)) {
    strLookAhead.startChunk(char);
    strLookAhead.advance();
    emitter.emit();
  } else if (/\s/.test(char)) {
    do {
      strLookAhead.advance();
      char = strLookAhead.la();
    } while (char && /\s/.test(char));
  } else if (/["']/.test(char)) {
    strLookAhead.startChunk('stringLiteral');
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
        emitter.emit();
        return;
      } else {
        strLookAhead.advance();
      }
    }
  } else {
    strLookAhead.startChunk('other');
    let next: string | null;
    do {
      strLookAhead.advance();
      next = strLookAhead.la();
    } while (next != null && !/[{}\[\],:\s'"]/.test(next));
    emitter.emit();
  }
  char = strLookAhead.la();
};

enum AstType {
  object = 0,
  array,
  property,
  value
}

export interface Ast {
  type: AstType;
  start: number;
  end: number;
}

export interface ObjectAst extends Ast {
  properties: {name: Token; value: Ast|Token}[];
}

export interface ArrayAst extends Ast {
  items: Array<Ast | Token>;
}

export function isObjectAst(ast: Ast | Token): ast is ObjectAst {
  return ast.type === AstType.object;
}

export function isArrayAst(ast: Ast | Token): ast is ArrayAst {
  return ast.type === AstType.array;
}

export function isToken(ast: Ast | Token): ast is Token {
  return (ast as Token).text != null;
}

const grammar: Grammar<Token, ObjectAst> = function(tokenLa) {
  return doObject(tokenLa);
};

function doObject(lexer: Parameters<Grammar<Token, ObjectAst>>[0]): ObjectAst {
  const ast: Partial<ObjectAst> = {
    type: AstType.object,
    properties: []
  };
  const lp = lexer.advance();
  ast.start = lp.pos;
  let next = lexer.la();
  while (next != null && next.type !== '}') {
    const propToken = lexer.advance();
    const colon = lexer.advance();
    if (colon.type !== ':') {
      throw new Error(`Expect ':' but recieve '${colon.text}' at ${colon.line}:${colon.col}`);
    }

    ast.properties!.push({name: propToken, value: doValue(lexer)});
    next = lexer.la();
    if (next && next.type === ',')
      lexer.advance();
    next = lexer.la();
  }
  const rp = lexer.advance(); // }
  ast.end = rp.end;
  return ast as ObjectAst;
}

function doArray(lexer: Parameters<Grammar<Token, ObjectAst>>[0]): ArrayAst {
  const ast: Partial<ArrayAst> = {
    type: AstType.array,
    items: []
  };
  const lp = lexer.advance();
  ast.start = lp.pos;
  let next = lexer.la();
  while (next != null && next.type !== ']') {

    if (next.type !== ',') {
      ast.items!.push(doValue(lexer));
    } else {
      lexer.advance();
    }
    next = lexer.la();
  }
  if (next && next.type === ']') {
    ast.end = lexer.advance().end; // ]

  } else if (next == null)
    throw new Error('Unexpect EOF after ' + lexer.lastConsumed.text);
  else
    throw new Error(`Unexpect ${next.text} at ${next.line}:${next.col}`);
  return ast as ArrayAst;
}

function doValue(lexer: Parameters<Grammar<Token, ObjectAst>>[0]) {
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

export default function parse(content: string) {
  const jsonParser = parser<string, string, Token, ObjectAst>(
    'JSON', lexer, grammar);
  jsonParser.write(content);
  jsonParser.end();
  return jsonParser.getResult();
}
