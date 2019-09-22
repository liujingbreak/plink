
import {parser, LookAhead, LookAheadObservable, Chunk, Token} from '../async-LLn-parser';
import {Observable, Subscriber} from 'rxjs';
import {tap} from 'rxjs/operators';
import {Readable} from 'stream';

export default function parse(reader: Readable, onToken?: (token: Token) => void) {
  const input = new Observable<string[]>(sub => {
    reader.on('data', (buf: string) => sub.next(buf.split('')));
    reader.on('end', () => sub.complete());
  });

  const operators = onToken ? [tap(onToken)] : null;

  return parser('JSON', input, parseLex, operators, parseGrammar);
}

export {Token};

async function parseLex(strLookAhead: LookAheadObservable<string>, tokenSub: Subscriber<Chunk<string>>) {
  let char = await strLookAhead.la();
  while (char != null) {
    if (/[{}\[\],:]/.test(char)) {
      strLookAhead.startToken(char);
      await strLookAhead.advance();
      strLookAhead.emitToken();
    } else if (/\s/.test(char)) {
      do {
        await strLookAhead.advance();
        char = await strLookAhead.la();
      } while (char && /\s/.test(char));
    } else if (/["']/.test(char)) {
      strLookAhead.startToken('stringLiteral');
      const openChar = await strLookAhead.advance();
      while (true) {
        const la = await strLookAhead.la();
        if (la == null) {
          return strLookAhead.throwError();
        }
        if (la === '\\') {
          await strLookAhead.advance(2);
        } else if (la === openChar) {
          await strLookAhead.advance();
          strLookAhead.emitToken();
          break;
        } else {
          await strLookAhead.advance();
        }
      }
    } else {
      strLookAhead.startToken('other');
      let next: string | null;
      do {
        await strLookAhead.advance();
        next = await strLookAhead.la();
      } while (next != null && !/[{}\[\],:\s'"]/.test(next));
      strLookAhead.emitToken();
    }
    char = await strLookAhead.la();
  }
}

type Lexer = LookAhead<Token>;

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
  properties: {name: Token, value: Ast|Token}[];
}

export interface ArrayAst extends Ast {
  items: Array<Ast | Token>;
}

export interface ValueAst extends Ast {
  value: Token;
}

async function parseGrammar(tokenLa: Lexer) {
  return doObject(tokenLa);
}

async function doObject(lexer: Lexer): Promise<ObjectAst> {
  const ast: ObjectAst = {
    type: AstType.object,
    properties: []
  };
  await lexer.advance();
  let next = await lexer.la();
  while (next != null && next.type !== '}') {
    const propToken = await lexer.advance();
    const colon = await lexer.advance();
    if (colon.type !== ':') {
      throw new Error(`Expect ':' but recieve '${colon.text}' at ${colon.line}:${colon.col}`);
    }

    ast.properties.push({name: propToken, value: await doValue(lexer)});
    next = await lexer.la();
    if (next && next.type === ',')
      await lexer.advance();
    next = await lexer.la();
  }
  await lexer.advance(); // }
  return ast;
}

async function doArray(lexer: Lexer): Promise<ArrayAst> {
  const ast: ArrayAst = {
    type: AstType.array,
    items: []
  };
  await lexer.advance();
  let next = await lexer.la();
  while (next != null && next.type !== ']') {
    if (next.type !== ',') {
      ast.items.push(await doValue(lexer));
    }
    next = await lexer.la();
  }
  if (next && next.type === ']')
    await lexer.advance(); // ]
  else if (next == null)
    throw new Error('Unexpect EOF after ' + lexer.lastConsumed!.text);
  else
    throw new Error(`Unexpect ${next.text} at ${next.line}:${next.col}`);
  return ast;
}

async function doValue(lexer: Lexer) {
  const next = await lexer.la();
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
