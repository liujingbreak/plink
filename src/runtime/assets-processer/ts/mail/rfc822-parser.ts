
import { ParseGrammar, ParseLex, Token,
  mapChunks, mapChunksObs, LookAheadObservable } from 'dr-comp-package/wfh/dist/async-LLn-parser';
import {queueScheduler, from, of} from 'rxjs';
import {observeOn, map, share} from 'rxjs/operators';
import _ from 'lodash';
import fs from 'fs-extra';
import Path from 'path';
const log = require('log4js').getLogger('@dr-core/assets-processer.rfc822-parser');

export enum RCF822TokenType {
  CRLF,
  ':',
  ';',
  quoteStr,
  ATOM,
  BOUNDARY,
  PART_BODY,
  DOUBLE_DASH
}

interface PartBodyToken extends Token<RCF822TokenType> {
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
const DASH = '-'.charCodeAt(0);
// const DASH = '-'.charCodeAt(0);

const TEMP_DIR = 'dist/assets-processer/rfc822';
export interface RCF822ParseResult {
  headers: RCF822HeaderType[];
  parts: {
    headers: RCF822HeaderType[];
    body?: Buffer;
    file?: string;
  }[];
}

export interface RCF822HeaderType {
  key: string;
  value: string[];
}

class RfcParserContext {
  private boundary: number[] | undefined;

  private multipartStarted = false;

  constructor(private origBuffer: Uint8Array) {
  }



  parseLexer: ParseLex<number, RCF822TokenType> = async (la) => {
    let chrCode = await la.la();
    while (chrCode != null) {
      const chr = String.fromCharCode(chrCode);
      if (this.multipartStarted && await la.isNext(CR, LF, CR, LF)) {
        // part header must be over
        la.startToken(RCF822TokenType.CRLF);
        await la.advance(2);
        la.emitToken();

        la.startToken(RCF822TokenType.CRLF);
        await la.advance(2);
        la.emitToken();
        await this.parsePartBodyToken(la);

      } else if (this.multipartStarted && await la.isNext(DASH, DASH)) {
        la.startToken(RCF822TokenType.DOUBLE_DASH);
        await la.advance(2); // end of whole message
        la.emitToken();
        break;
      } else if (this.boundary && await la.isNext(...this.boundary)) {
        la.startToken(RCF822TokenType.BOUNDARY);
        await la.advance(this.boundary.length);
        la.emitToken();
        this.multipartStarted = true;
        // console.log('multipartStarted true');
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

  parseGrammar: ParseGrammar<RCF822ParseResult, RCF822TokenType> = async (la) => {
    let result: RCF822ParseResult = {
      headers: await this.parseHeaders(la),
      parts: []
    };

    // console.log('boundary:', String.fromCharCode(...this.boundary!));

    let tk = await la.la();
    while (tk != null) {
      // console.log('tk:', tk.text);
      await la.assertAdvanceWith([RCF822TokenType.BOUNDARY], compareTokenType);
      if ((await la.la())!.type === RCF822TokenType.DOUBLE_DASH) {
        break;
      }
      const partHeaders = await this.parseHeaders(la);
      const partBody = await la.advance() as PartBodyToken;
      await la.assertAdvanceWith([RCF822TokenType.CRLF], compareTokenType);

      this.onParseEachPart(result, partHeaders, partBody);
      // console.log('rfc token: ' + RCF822TokenType[(await la.advance()).type]);
      tk = await la.la();
    }
    return result as RCF822ParseResult;
  }

  private onParseEachPart(result: RCF822ParseResult,
    partHeaders: RCF822ParseResult['headers'],
    partBody: PartBodyToken) {
    const encodingHeader = partHeaders.find(header => header.key === 'Content-Transfer-Encoding');
    const isBase64 = encodingHeader && encodingHeader.value[0] === 'base64';

    if (isBase64) {
      partBody.data = Buffer.from(partBody.data.toString(), 'base64');
    }
    const attachmentHeader = partHeaders.find(header => header.key === 'Content-Disposition');
    let attachmentName: string | undefined;

    if (attachmentHeader && attachmentHeader.value[0] === 'attachment') {
      const m = /^([^=]*)=["]?([^"]*)["]?$/.exec(attachmentHeader.value[1]);
      if (m && m[1] === 'filename') {
        attachmentName = Path.resolve(TEMP_DIR, m[2]);
        fs.mkdirpSync(TEMP_DIR);
        fs.writeFileSync(attachmentName, partBody.data);
        log.info(attachmentName + ' is written');
      }
    }

    result.parts.push({
      headers: partHeaders,
      body: attachmentName ? undefined : partBody.data,
      file: attachmentName ? attachmentName : undefined
    });
  }

  private setBoundary(str: string) {
    const chrs: number[] = new Array(str.length);

    for (let i = 0, l = str.length; i < l; i++) {
      chrs[i] = str.charCodeAt(i);
    }
    this.boundary = chrs;
  }

  private async parseHeaders(la: Parameters<RfcParserContext['parseGrammar']>[0]) {
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
            if (m && m[1] === 'boundary') {
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
        let next = await la.la();
        while (next && next.type === RCF822TokenType.CRLF) {
          await la.advance();
          next = await la.la();
        }
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

  /**
   * Generate tokens: PART_BODY CRLF BOUNDARY
   * @param la 
   */
  private async parsePartBodyToken(la: LookAheadObservable<number, RCF822TokenType>) {
    const tk = la.startToken(RCF822TokenType.PART_BODY);
    tk.trackValue = false;
    const origBufferOffset = la.position;

    while ((await la.la()) != null) {

      if (await la.isNext(CR, LF, ...this.boundary!)) {
        (tk as unknown as PartBodyToken).data = Buffer.from(this.origBuffer, origBufferOffset, la.position - origBufferOffset);

        la.emitToken();

        la.startToken(RCF822TokenType.CRLF);
        await la.advance(2);
        la.emitToken();

        la.startToken(RCF822TokenType.BOUNDARY);
        await la.advance(this.boundary!.length);
        la.emitToken();
        break;
      }
      await la.advance();
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


export function parse(readable: Buffer) {
  // fs.writeFileSync('email-temp.txt', readable.toString('utf8'), 'utf8');

  const pctx = new RfcParserContext(readable);

  const done = of(readable).pipe(
    observeOn(queueScheduler),
    mapChunks<number, RCF822TokenType>('RCF822-lexer', (la, sub) => pctx.parseLexer(la, sub)),
    map(chunk => {
      if (chunk.values)
        (chunk as Token<RCF822TokenType>).text = Buffer.from(Uint8Array.from(chunk.values!)).toString();
      delete chunk.values;
      return [chunk as Token<RCF822TokenType>];
    }),
    mapChunksObs('RCF822-parser', la => from(pctx.parseGrammar(la))),
    share()
  ).toPromise();
  return done;
}
