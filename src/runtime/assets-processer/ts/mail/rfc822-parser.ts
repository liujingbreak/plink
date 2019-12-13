
import { ParseGrammar, ParseLex, Token,
  mapChunks, mapChunksObs, LookAheadObservable } from 'dr-comp-package/wfh/dist/async-LLn-parser';
import {Readable} from 'stream';
import {Subject, queueScheduler, from} from 'rxjs';
import {observeOn, map, share} from 'rxjs/operators';
import _ from 'lodash';
import util from 'util';

export enum RCF822TokenType {
  CRLF,
  ':',
  ';',
  quoteStr,
  ATOM,
  BOUNDARY,
  PART_BODY
}

interface PartBodyToken {
  data: Buffer;
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
// const DASH = '-'.charCodeAt(0);

class RfcParserContext {
  private boundary: number[] | undefined;

  private multipartStarted = false;

  setBoundary(str: string) {
    const chrs: number[] = new Array(str.length);

    for (let i = 0, l = str.length; i < l; i++) {
      chrs[i] = str.charCodeAt(i);
    }
    this.boundary = chrs;
  }

  parseLexer: ParseLex<number, RCF822TokenType> = async (la) => {
    let chrCode = await la.la();
    while (chrCode != null) {
      const chr = String.fromCharCode(chrCode);
      if (this.multipartStarted && await la.isNext(CR, LF, CR, LF)) {
        la.startToken(RCF822TokenType.CRLF);
        await la.advance(2);
        la.emitToken();

        la.startToken(RCF822TokenType.CRLF);
        await la.advance(2);
        la.emitToken();

        await this.parsePart(la);
        // console.log('>>>>>>>>>>>>>>>>>>>>', Buffer.from(arr).toString('utf8'));
      } else if (this.boundary && await la.isNext(...this.boundary)) {
        la.startToken(RCF822TokenType.BOUNDARY);
        await la.advance(this.boundary.length);
        la.emitToken();
        this.multipartStarted = true;
      } else if (await la.isNext(CR, LF)) {
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
        await consumeAtom(la);
      }
      chrCode = await la.la();
    }
  }

  async parsePart(la: LookAheadObservable<number, RCF822TokenType>) {
    const arr: number[] = [];
    const tk = la.startToken(RCF822TokenType.PART_BODY);
    tk.trackValue = false;
    while ((await la.la()) != null) {
      if (await la.isNext(CR, LF, CR, LF, ...this.boundary!)) {
        la.emitToken();
        this.multipartStarted = false;
        (tk as unknown as PartBodyToken).data = Buffer.from(arr);
        // await la.advance(4 + this.boundary!.length);
        break;
      }
      arr.push(await la.advance());
    }
  }

  async parseHeaders(la: Parameters<RfcParserContext['parseGrammar']>[0]) {
    const headers: {key: string, value: string[]}[] = [];
    let nextTk = await la.la();


    while (nextTk != null) {
      if (nextTk.type === RCF822TokenType.ATOM && (await la.la(2)) && (await la.la(2))!.type === RCF822TokenType[':']) {
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
        if (key.toLowerCase() === 'content-type' && value[0] === 'multipart/mixed') {
          let boundary: string | undefined;
          for (const valueItem of value.slice(1)) {
            const m = /^([^=]*)=["]?([^"]*)["]?$/.exec(valueItem);
            if (m) {
              boundary = m[2];
              break;
            }
          }
          if (boundary) {
            this.setBoundary('--' + boundary);
          }
        }

      } else if (await la.isNextWith<RCF822TokenType>([RCF822TokenType.CRLF, RCF822TokenType.CRLF], compareTokenType)) {
        await la.advance(2);
        break;
      } else if (await la.isNextWith([RCF822TokenType.CRLF], compareTokenType)) {
        await la.advance();
      } else {
        la.throwError((await la.advance()).text);
        // await la.advance();
      }
      nextTk = await la.la();
    }
    return headers;
  }

  parseGrammar: ParseGrammar<void, RCF822TokenType> = async (la) => {
    await this.parseHeaders(la);
    // console.log('headers', headers);
    // https://tools.ietf.org/html/rfc2387
    let tk = await la.la();
    while (tk != null) {
      if (tk.type === RCF822TokenType.BOUNDARY) {
        await la.advance();
        if (await la.isNextWith([RCF822TokenType.CRLF], compareTokenType)) {
          const partHeaders = await this.parseHeaders(la);
          // tslint:disable-next-line: no-console
          console.log(partHeaders);
        } else {
          await la.assertAdvanceWith(['--'], (tk, a) => tk.text === a);
          break;
        }
      } else if (tk.type === RCF822TokenType.PART_BODY) {
        // tslint:disable-next-line: no-console
        console.log((tk as unknown as PartBodyToken).data.toString('utf-8'));
        await la.advance();
      } else {
        await la.assertAdvanceWith([RCF822TokenType.CRLF], compareTokenType);
      }
      tk = await la.la();
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

async function consumeAtom(la: LookAheadObservable<number, RCF822TokenType>) {
  la.startToken(RCF822TokenType.ATOM);
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
function compareTokenType<T>(tk: Token<T>, type: T) {
   return tk.type === type;
}


export async function parse(readable: Readable | Buffer) {
  const input = new Subject<Uint8Array>();

  const pctx = new RfcParserContext();

  const done = input.pipe(
    observeOn(queueScheduler),
    mapChunks<number, RCF822TokenType>('RCF822-lexer', (la, sub) => pctx.parseLexer(la, sub)),
    map(chunk => {
      (chunk as Token<RCF822TokenType>).text = Buffer.from(Uint8Array.from(chunk.values!)).toString();
      // if (chunk.type === RCF822TokenType.ATOM)
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
