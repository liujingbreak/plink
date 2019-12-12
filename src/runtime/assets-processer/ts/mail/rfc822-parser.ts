
import { ParseGrammar, ParseLex, Token,
  mapChunks, mapChunksObs, LookAheadObservable } from 'dr-comp-package/wfh/dist/async-LLn-parser';
import {Readable} from 'stream';
import {Subject, queueScheduler, from} from 'rxjs';
import {observeOn, map, share} from 'rxjs/operators';
import _ from 'lodash';

export enum RCF822TokenType {
  CRLF,
  ':',
  ';',
  quoteStr,
  CONTENT
}

const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);
const BACK_SLASH = '\\'.charCodeAt(0);
const QUOTE_MARK1 = '"'.charCodeAt(0);
const QUOTE_MARK2 = '\''.charCodeAt(0);
const COLON_MARK = ':'.charCodeAt(0);
const SEMI_COL = ';'.charCodeAt(0);
const WS = ' '.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);
const DASH = '-'.charCodeAt(0);

class RfcParserContext {
  boundary: string | undefined;

  parseLexer: ParseLex<number, RCF822TokenType> = async (la) => {
    let chrCode = await la.la();
    while (chrCode != null) {
      const chr = String.fromCharCode(chrCode);

      if (await la.isNext(CR, LF)) {
        la.startToken(RCF822TokenType.CRLF);
        await la.advance(2);
        la.emitToken();
      } else if ((await la.la()) === LF) {
        la.startToken(RCF822TokenType.CRLF);
        await la.advance();
        la.emitToken();
      } else if (chr === ':' || chr === ';') {
        la.startToken(RCF822TokenType[chr]);
        await la.advance();
        la.emitToken();
        await skipWhiteSpace(la);
      } else if (/\s/.test(chr)) {
        await skipWhiteSpace(la);
      } else if (chr === '"' || chr === '\'') {
        await quoteStr(la);
      } else {
        await consumeContent(la);
      }
      chrCode = await la.la();
    }
  }

  parseGrammar: ParseGrammar<void, RCF822TokenType> = async (la) => {
    const headers = await parseHeaders(la);
    // console.log('headers', headers);
    const foundCntTp = headers.find(pair => pair.key.toLowerCase() === 'content-type');
    if (foundCntTp && foundCntTp.value[0] === 'multipart/mixed') {
      let boundary: string | undefined;
      for (const value of foundCntTp.value.slice(1)) {
        const valueKeyPair = value.split('=');
        if (valueKeyPair.length > 1 && valueKeyPair[0].trim() === 'boundary') {
          boundary = _.trim(valueKeyPair[1].trim(), '"');
          break;
        }
      }
      if (boundary) {
        // https://tools.ietf.org/html/rfc2387
        // while ((await la.la()) != null) {
        //   await parseMultipart();
        // }
      }
    }
  }
}

async function quoteStr(la: LookAheadObservable<number, RCF822TokenType>) {
  la.startToken(RCF822TokenType.quoteStr);
  const openChar = await la.advance();
  while (true) {
    const next = await la.la();
    if (next == null) {
      return la.throwError();
    }
    if (next === BACK_SLASH) {
      await la.advance(2);
    } else if (next === openChar) {
      await la.advance();
      la.emitToken();
      break;
    } else {
      await la.advance();
    }
  }
}

async function skipWhiteSpace(la: LookAheadObservable<number, RCF822TokenType>) {
  do {
    const code = await la.la();
    if (code == null) return;
    if (/\s/.test(String.fromCharCode(code))) {
      await la.advance();
    } else {
      break;
    }
  } while (true);
}

async function consumeContent(la: LookAheadObservable<number, RCF822TokenType>) {
  la.startToken(RCF822TokenType.CONTENT);
  await la.advance();
  let code = await la.la();
  let emit = false;
  while (code != null) {
    switch (code) {
      case COLON_MARK:
      case SEMI_COL:
      case QUOTE_MARK1:
      case QUOTE_MARK2:
        emit = true;
        la.emitToken();
        break;
      case CR:
        // console.log((await la.la()), (await la.la(2)), (await la.la(3)));
        if (!(await la.isNext(CR, LF, WS)) && !(await la.isNext(CR, WS)) &&
          !(await la.isNext(CR, LF, TAB)) && !(await la.isNext(CR, TAB))) {
          // console.log('emit: ', (await la.la()), (await la.la(2)), (await la.la(3)));
          emit = true;
          la.emitToken();
          break;
        } else {
          await la.advance(3);
          code = await la.la();
          break;
        }
      case LF:
        if (! await la.isNext(LF, WS) && ! await la.isNext(LF, TAB)) {
          emit = true;
          la.emitToken();
          break;
        } else {
          await la.advance(2);
          code = await la.la();
          break;
        }
      default:
        await la.advance();
        code = await la.la();
    }
    if (emit) break;
  }
}

// async function parseMultipart(la: Parameters<typeof parseGrammar>[0]) {
//   while (await la.isNext(DASH, DASH))
// }

async function parseHeaders(la: Parameters<RfcParserContext['parseGrammar']>[0]) {
  const headers: {key: string, value: string[]}[] = [];
  let nextTk = await la.la();

  while (nextTk != null) {
    if (nextTk.type === RCF822TokenType.CONTENT && (await la.la(2)) && (await la.la(2))!.type === RCF822TokenType[':']) {
      const key = nextTk.text;
      await la.advance(2);
      nextTk = await la.la();

      let value = [] as string[];
      const header = {key, value};
      headers.push(header);
      let lastValueItem = '';
      while (nextTk != null && nextTk.type !== RCF822TokenType.CRLF) {
        if (nextTk.type === RCF822TokenType[';']) {
          value.push(lastValueItem);
          lastValueItem = '';
          await la.advance();
          nextTk = await la.la();
          continue;
        }
        lastValueItem += (await la.advance()).text;
        nextTk = await la.la();
      }
      value.push(lastValueItem);
    } else if ((await la.la())!.type === RCF822TokenType.CRLF) {
      const more = await la.la(2);
      if (more && more.type === RCF822TokenType.CRLF) {
        break; // There are 2 continuous white space, headers part is over
      }
      await la.advance();
    } else {
      la.throwError((await la.advance()).text);
      // await la.advance();
    }
    nextTk = await la.la();
  }
  return headers;
}

export async function parse(readable: Readable | Buffer) {
  const input = new Subject<Uint8Array>();

  const pctx = new RfcParserContext();

  const done = input.pipe(
    observeOn(queueScheduler),
    mapChunks<number, RCF822TokenType>('RCF822-lexer', (la, sub) => pctx.parseLexer(la, sub)),
    map(chunk => {
      (chunk as Token<RCF822TokenType>).text = Buffer.from(Uint8Array.from(chunk.values!)).toString();
      // if (chunk.type === RCF822TokenType.CONTENT)
      // (chunk as Token<RCF822TokenType>).text = chunk.values!.join();
      delete chunk.values;
      return [chunk as Token<RCF822TokenType>];
    }),
    mapChunksObs('RCF822-parser', la => from(pctx.parseGrammar(la))),
    share()
  ).toPromise();


  if (readable instanceof Buffer) {
    input.next(readable);
    input.complete();
  } else {
    // TODO:
  }
  await done;
}
