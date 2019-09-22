import { ParseLex } from 'dr-comp-package/wfh/dist/async-LLn-parser';
// import {Subscriber} from 'rxjs';

export enum ImapTokenType {
  number = 1,
  stringLit,
  stringQuote,
  binString,
  '(',
  ')',
  space,
  atom,
  CRLF,
  nil
}

export const parseLex: ParseLex<string> = async function(reply, sub) {
  let next =  await reply.la();
  while (next != null) {
    if (/[0-9]/.test(next)) {
      reply.startToken(ImapTokenType.number);
      await reply.advance();
      next = await reply.la();
      while (next != null && /[0-9.]/.test(next)) {
        await reply.advance();
        next = await reply.la();
      }
      reply.emitToken();
    } else if ('\r' === next) {
      reply.startToken(ImapTokenType.CRLF);
      await reply.advance();
      if ((await reply.la()) === '\n')
        await reply.advance();
      reply.emitToken();
    } else if ('\n' === next) {
      reply.startToken(ImapTokenType.CRLF);
      await reply.advance();
      reply.emitToken();
    } else if (/\s/.test(next)) {
      do {
        await reply.advance();
        next = await reply.la();
      } while (next && /\s/.test(next));
    } else if ('"' === next) {
      reply.startToken('stringQuote');
      const openChar = await reply.advance();
      while (true) {
        const la = await reply.la();
        if (la == null) {
          return reply.throwError();
        }
        if (la === '\\') {
          await reply.advance(2);
        } else if (la === openChar) {
          await reply.advance();
          reply.emitToken();
          break;
        } else {
          await reply.advance();
        }
      }
    } else if ('{' === next) {
      const next2 = await reply.la(2);
      if (next2 && /\d/.test(next2)) {
        parseLiteralString(reply, sub);
      }
    } else {
      reply.startToken(ImapTokenType.atom);
      await reply.advance();
      next = await reply.la();
      while (next != null && /[^0-9\s{"]/.test(next)) {
        await reply.advance();
        next = await reply.la();
      }
      reply.emitToken();
    }
    next =  await reply.la();
  }
};

async function parseLiteralString(reply: Parameters<ParseLex<string>>[0], sub: Parameters<ParseLex<string>>[1]) {
  reply.startToken(ImapTokenType.stringLit);

  await reply.advance();
  let numStr = await reply.advance();
  let next = await reply.la();
  while (next && next !== '}') {
    numStr += next;
    await reply.advance();
    next = await reply.la();
  }
  const numByte = parseInt(numStr, 10);

  for (let i = 0; i < numByte;) {
    next = await reply.la();
    if (next == null)
      return reply.throwError();
    if (!/\s/.test(next)) {
      i++;
    }
    await reply.advance();
  }
  const cr = await reply.advance();
  if (cr !== '\r')
    reply.throwError(cr);
  const lf = await reply.advance();
  if (lf !== '\n')
    reply.throwError(cr);
  reply.emitToken();
}
