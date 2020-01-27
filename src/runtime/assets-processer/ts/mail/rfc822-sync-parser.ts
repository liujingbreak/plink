
import { LookAheadObservable, mapChunks, mapChunksObs, ParseGrammar, ParseLex, Token } from 'dr-comp-package/wfh/dist/LLn-parser';
import fs from 'fs-extra';
import Path from 'path';
import { of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
const log = require('log4js').getLogger('@dr-core/assets-processer.rfc822-sync-parser');

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

  constructor(private origBuffer: ArrayBuffer) {
  }



  parseLexer: ParseLex<number, RCF822TokenType> = (la) => {
    let chrCode = la.la();
    while (chrCode != null) {
      const chr = String.fromCharCode(chrCode);
      if (this.multipartStarted && la.isNext(CR, LF, CR, LF)) {
        // part header must be over
        la.startToken(RCF822TokenType.CRLF);
        la.advance(2);
        la.emitToken();

        la.startToken(RCF822TokenType.CRLF);
        la.advance(2);
        la.emitToken();
        this.parsePartBodyToken(la);

      } else if (this.multipartStarted && la.isNext(DASH, DASH)) {
        la.startToken(RCF822TokenType.DOUBLE_DASH);
        la.advance(2); // end of whole message
        la.emitToken();
        break;
      } else if (this.boundary && la.isNext(...this.boundary)) {
        la.startToken(RCF822TokenType.BOUNDARY);
        la.advance(this.boundary.length);
        la.emitToken();
        this.multipartStarted = true;
        // console.log('multipartStarted true');
      } else if (la.isNext(CR, LF)) {
        la.startToken(RCF822TokenType.CRLF);
        la.advance(2);
        la.emitToken();
      } else if ((la.la()) === LF) {
        la.startToken(RCF822TokenType.CRLF);
        la.advance();
        la.emitToken();
      } else if (chr === ':' || chr === ';') {
        la.startToken(RCF822TokenType[chr]);
        la.advance();
        la.emitToken();
        skipWhiteSpace(la);
      } else if (/\s/.test(chr)) {
        skipWhiteSpace(la);
      } else if (chr === '"' || chr === '\'') {
        quoteStr(la);
      } else {
        consumeAtom(la);
      }
      chrCode = la.la();
    }
  }

  parseGrammar: ParseGrammar<RCF822ParseResult, RCF822TokenType> = (la) => {
    let result: RCF822ParseResult = {
      headers: this.parseHeaders(la),
      parts: []
    };

    // console.log('boundary:', String.fromCharCode(...this.boundary!));

    let tk = la.la();
    while (tk != null) {
      // console.log('tk:', tk.text);
      la.assertAdvanceWith([RCF822TokenType.BOUNDARY], compareTokenType);
      if ((la.la())!.type === RCF822TokenType.DOUBLE_DASH) {
        break;
      }
      const partHeaders = this.parseHeaders(la);
      const partBody = la.advance() as PartBodyToken;
      la.assertAdvanceWith([RCF822TokenType.CRLF], compareTokenType);

      this.onParseEachPart(result, partHeaders, partBody);
      // console.log('rfc token: ' + RCF822TokenType[(la.advance()).type]);
      tk = la.la();
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

  private laToken(): Token<RCF822TokenType> | null {

  }

  private parseHeaders() {
    const headers: {key: string, value: string[]}[] = [];
    let nextTk = this.laToken();

    while (nextTk != null) {
      if (nextTk.type === RCF822TokenType.ATOM && (la.la(2)) && (la.la(2))!.type === RCF822TokenType[':']) {
        const key = nextTk.text;

        la.advance(2);
        nextTk = la.la();

        let value = [] as string[];
        const header = {key, value};
        headers.push(header);
        let lastValueItem = '';
        while (nextTk != null && nextTk.type !== RCF822TokenType.CRLF) {
          if (nextTk.type === RCF822TokenType[';']) {
            value.push(lastValueItem);
            lastValueItem = '';
            la.advance();
            nextTk = la.la();
            continue;
          }
          lastValueItem += (la.advance()).text;
          nextTk = la.la();
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

      } else if (la.isNextWith<RCF822TokenType>([RCF822TokenType.CRLF, RCF822TokenType.CRLF], compareTokenType)) {
        la.advance(2);
        let next = la.la();
        while (next && next.type === RCF822TokenType.CRLF) {
          la.advance();
          next = la.la();
        }
        break;
      } else if (la.isNextWith([RCF822TokenType.CRLF], compareTokenType)) {
        la.advance();
      } else {
        la.throwError((la.advance()).text);
        // la.advance();
      }
      nextTk = la.la();
    }
    return headers;
  }

  /**
   * Generate tokens: PART_BODY CRLF BOUNDARY
   * @param la 
   */
  private parsePartBodyToken(la: LookAheadObservable<number, RCF822TokenType>) {
    const tk = la.startToken(RCF822TokenType.PART_BODY);
    tk.trackValue = false;
    const origBufferOffset = la.position;

    while ((la.la()) != null) {

      if (la.isNext(CR, LF, ...this.boundary!)) {
        (tk as unknown as PartBodyToken).data = Buffer.from(this.origBuffer, origBufferOffset, la.position - origBufferOffset);

        la.emitToken();

        la.startToken(RCF822TokenType.CRLF);
        la.advance(2);
        la.emitToken();

        la.startToken(RCF822TokenType.BOUNDARY);
        la.advance(this.boundary!.length);
        la.emitToken();
        break;
      }
      la.advance();
    }
  }

}

function quoteStr(la: LookAheadObservable<number, RCF822TokenType>) {
  la.startToken(RCF822TokenType.quoteStr);
  const openChar = la.advance();
  while (true) {
    const next = la.la();
    if (next == null) {
      return la.throwError();
    }
    if (next === BACK_SLASH) {
      la.advance(2);
    } else if (next === openChar) {
      la.advance();
      la.emitToken();
      break;
    } else {
      la.advance();
    }
  }
}

function skipWhiteSpace(la: LookAheadObservable<number, RCF822TokenType>) {
  do {
    const code = la.la();
    if (code == null) return;
    if (/\s/.test(String.fromCharCode(code))) {
      la.advance();
    } else {
      break;
    }
  } while (true);
}

function consumeAtom(la: LookAheadObservable<number, RCF822TokenType>) {
  la.startToken(RCF822TokenType.ATOM);
  la.advance();
  let code = la.la();
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
        // console.log((la.la()), (la.la(2)), (la.la(3)));
        if (!(la.isNext(CR, LF, WS)) && !(la.isNext(CR, WS)) &&
          !(la.isNext(CR, LF, TAB)) && !(la.isNext(CR, TAB))) {
          // console.log('emit: ', (la.la()), (la.la(2)), (la.la(3)));
          emit = true;
          la.emitToken();
          break;
        } else {
          la.advance(3);
          code = la.la();
          break;
        }
      case LF:
        if (! la.isNext(LF, WS) && ! la.isNext(LF, TAB)) {
          emit = true;
          la.emitToken();
          break;
        } else {
          la.advance(2);
          code = la.la();
          break;
        }
      default:
        la.advance();
        code = la.la();
    }
    if (emit) break;
  }
}

// function parseMultipart(la: Parameters<typeof parseGrammar>[0]) {
//   while (la.isNext(DASH, DASH))
// }
function compareTokenType<T>(tk: Token<T>, type: T) {
   return tk.type === type;
}


export function parse(readable: Buffer): RCF822ParseResult {
  let result: RCF822ParseResult;
  const pctx = new RfcParserContext(readable.buffer);

  of(readable).pipe(
    // observeOn(queueScheduler),
    mapChunks<number, RCF822TokenType>('RCF822-lexer', (la, sub) => pctx.parseLexer(la, sub)),
    // tap(buf => console.log(buf)),
    map(chunk => {
      if (chunk.values)
        (chunk as Token<RCF822TokenType>).text = Buffer.from(Uint8Array.from(chunk.values!)).toString();
      delete chunk.values;
      return [chunk as Token<RCF822TokenType>];
    }),
    mapChunksObs('RCF822-parser', la => pctx.parseGrammar(la)),
    tap(value => result = value)
  ).subscribe();
  return result!;
}
