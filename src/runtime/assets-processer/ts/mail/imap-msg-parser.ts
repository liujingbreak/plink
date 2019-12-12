import { ParseGrammar, ParseLex, Token, LookAhead, mapChunks, mapChunksObs } from 'dr-comp-package/wfh/dist/async-LLn-parser';
import { Subject, Observable, queueScheduler, from } from 'rxjs';
import {observeOn, map, takeWhile, concatMap, takeLast, share} from 'rxjs/operators';
import { connect as tslConnect, ConnectionOptions, TLSSocket } from 'tls';
import fs from 'fs';

let fileWritingIdx = 1;
// import {Subscriber} from 'rxjs';

export enum ImapTokenType {
  number = 1,
  stringLit,
  stringQuote,
  '(',
  ')',
  atom, // ATOM or NIL
  CRLF
  // nil
}

export interface StringLit {
  data: Buffer;
}


const R_BRACE = '}'.charCodeAt(0);
const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);

const parseLex: ParseLex<number, ImapTokenType> = async function(reply, sub) {
  let nextByte =  await reply.la();
  while (nextByte != null) {
    const next = String.fromCharCode(nextByte);
    if (' ' === next) {
      await reply.advance();
      // skip space char
    } else if (/[0-9]/.test(next)) {
      reply.startToken(ImapTokenType.number);
      await reply.advance();
      nextByte = await reply.la();
      while (nextByte != null && /[0-9.]/.test(String.fromCharCode(nextByte))) {
        await reply.advance();
        nextByte = await reply.la();
      }
      reply.emitToken();
    } else if ('\r' === next) {
      reply.startToken(ImapTokenType.CRLF);
      await reply.advance();
      const b = await reply.la();
      if (b != null && String.fromCharCode(b) === '\n')
        await reply.advance();
      reply.emitToken();
    } else if ('\n' === next) {
      reply.startToken(ImapTokenType.CRLF);
      await reply.advance();
      reply.emitToken();
    } else if ('"' === next) {
      reply.startToken(ImapTokenType.stringQuote);
      const openChar = await reply.advance();
      while (true) {
        const la = await reply.la();
        if (la == null) {
          return reply.throwError();
        }
        if (String.fromCharCode(la) === '\\') {
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
      if (next2 != null && /\d/.test(String.fromCharCode(next2))) {
        await parseLiteralString(reply);
      } else {
        await parseAtom(reply);
      }
    } else if ('(' === next || ')' === next) {
      reply.startToken(ImapTokenType[next]);
      await reply.advance();
      reply.emitToken();
    } else {
      await parseAtom(reply);
    }
    nextByte =  await reply.la();
  }
};

async function parseAtom(la: Parameters<ParseLex<number, ImapTokenType>>[0]) {
  la.startToken(ImapTokenType.atom);
  await la.advance();
  let nextByte = await la.la();
  while (nextByte != null && /[^\s{[()"]/.test(String.fromCharCode(nextByte))) {
    await la.advance();
    nextByte = await la.la();
  }
  la.emitToken();
}

async function parseLiteralString(reply: Parameters<ParseLex<number, ImapTokenType>>[0]) {
  const chunk = reply.startToken(ImapTokenType.stringLit, false);
  await reply.advance();
  let numStr = String.fromCharCode(await reply.advance());
  let next = await reply.la();
  while (next && next !== R_BRACE) {
    numStr += String.fromCharCode(next);
    await reply.advance();
    next = await reply.la();
  }
  await reply.advance();
  next = await reply.la();
  if (next == null)
    return reply.throwError();
  while (next === CR || next === LF) {
    await reply.advance();
    next = await reply.la();
  }

  const numByte = parseInt(numStr, 10);
  const buf = Buffer.alloc(numByte);  // console.log('numByte', numByte);

  let i = 0;
  while (i < numByte) {
    next = await reply.la();
    if (next == null) {
      return reply.throwError();
    }
    const char = await reply.advance();
    buf.writeUInt8(char, i);
    i++;
  }
  (chunk as unknown as StringLit).data = buf;
  // console.log('parseLiteralString()', chunk);
  fs.writeFile(`temp-${process.pid}-${fileWritingIdx++}.txt`, buf, () => {});
  reply.emitToken();
}

async function parseLine(la: Parameters<(typeof parseLines)>[1]):
Promise<Token<ImapTokenType>[] | undefined> {
  let buf: Token<ImapTokenType>[] | undefined;
  let word = await la.la();
  while (true) {
    if (word == null) {
      return;
    }
    if (buf == null) buf = [];
    if (word.type === ImapTokenType.CRLF) {
      await la.advance();
      return buf;
    }
    buf.push(word);
    await la.advance();
    word = await la.la();
  }
}

async function parseLines(lineSubject: Subject<Token<ImapTokenType>[]>, la: LookAhead<Token<ImapTokenType>, any>) {
  let line: Token<ImapTokenType>[] | undefined;
  do {
    line = await parseLine(la);
    if (line == null) {
      lineSubject.complete();
      break;
    }
    lineSubject.next(line);
  } while (true);
}

export function createServerDataHandler(): {input: (buf: Buffer | null) =>void, output: Observable<Token<ImapTokenType>[]>} {
  const input = new Subject<Uint8Array | null>();

  const parseServerReply: ParseGrammar<Subject<Token<ImapTokenType>[]>, ImapTokenType> = async (la) => {
    const lineSubject = new Subject<Token<ImapTokenType>[]>();
    parseLines(lineSubject, la);
    return lineSubject;
  };

  // parser('IMAP', input, parseLex, null, parseServerReply);
  const name = 'IMAP';

  const output = input.pipe(
    observeOn(queueScheduler),
    takeWhile<Uint8Array>(data => data != null),
    // tap(data => console.log('##### input buffer length: ', data.length)),
    mapChunks(name + '-lexer', parseLex),
    map(chunk => {
      const buf = Buffer.from(Uint8Array.from(chunk.values!));
      (chunk as Token<ImapTokenType>).text = buf.toString('utf8');
      delete chunk.values;
      return chunk as Token<ImapTokenType>;
    }),
    map(token => [token]),
    mapChunksObs(name + '-parser', (la) => from(parseServerReply(la))),
    concatMap(lines => lines),
    share()
  );

  return {
    input: (data) => input.next(data),
    output
  };
}

/**
 * 
 * @param lines createServerDataHandler().output
 * @param parseLine return null/undefined to continue to wait for next line, or it will stop waiting for next line.
 */
export function parseLinesOfTokens(lines: Observable<Token<ImapTokenType>[]>,
  parseLine: (la: LookAhead<Token<ImapTokenType>>) => Promise<any | null | void>) {
  return lines.pipe(
    concatMap(line => {
      const la = new LookAhead<Token<ImapTokenType>>('imap reply line');
      la._write(line);
      la._final();
      return from(parseLine(la));
    }),
    // filter(res => res == null),
    takeWhile(res => res == null, true),
    takeLast(1)
  ).toPromise();
}

export async function connectImap(address: string) {
  const handler = createServerDataHandler();
  let socket: TLSSocket|undefined;
  try {
    socket = await new Promise<ReturnType<typeof tslConnect>>((resolve, reject) => {
      const socket = tslConnect({
        host: address, port: 993,
        enableTrace: true
      } as ConnectionOptions);

      socket.on('secureConnect', () => {
        // tslint:disable-next-line: no-console
        console.log('connected', socket.authorized ? 'authorized' : 'unauthorized');
        resolve(socket);
      })
      .on('error', err => reject(err))
      .on('timeout', () => reject(new Error('Timeout')));
      socket.on('data', (data: Buffer) => handler.input(data));
    });

  } catch (ex) {
    if (socket)
      socket.end();
    throw ex;
  }
  await new Promise(resolve => setTimeout(resolve, 3000));
  handler.input(null);
  socket.end();
}
