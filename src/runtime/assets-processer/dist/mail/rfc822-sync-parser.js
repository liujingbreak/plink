"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.RCF822TokenType = void 0;
const LLn_parser_1 = require("@wfh/plink/wfh/dist/LLn-parser");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const log = require('log4js').getLogger('@wfh/assets-processer.rfc822-sync-parser');
var RCF822TokenType;
(function (RCF822TokenType) {
    RCF822TokenType[RCF822TokenType["CRLF"] = 0] = "CRLF";
    RCF822TokenType[RCF822TokenType[":"] = 1] = ":";
    RCF822TokenType[RCF822TokenType[";"] = 2] = ";";
    RCF822TokenType[RCF822TokenType["quoteStr"] = 3] = "quoteStr";
    RCF822TokenType[RCF822TokenType["ATOM"] = 4] = "ATOM";
    RCF822TokenType[RCF822TokenType["BOUNDARY"] = 5] = "BOUNDARY";
    RCF822TokenType[RCF822TokenType["PART_BODY"] = 6] = "PART_BODY";
    RCF822TokenType[RCF822TokenType["DOUBLE_DASH"] = 7] = "DOUBLE_DASH";
})(RCF822TokenType = exports.RCF822TokenType || (exports.RCF822TokenType = {}));
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
class RfcParserContext {
    constructor(origBuffer) {
        this.origBuffer = origBuffer;
        this.multipartStarted = false;
        this.textBodyStarted = false;
        this.parseLexer = (la, emitter) => {
            let chrCode = la.la();
            if (chrCode == null) {
                emitter.end();
                return;
            }
            const chr = String.fromCharCode(chrCode);
            if (this.multipartStarted && la.isNext(CR, LF, CR, LF)) {
                // part header must be over
                la.startChunk(RCF822TokenType.CRLF);
                la.advance(2);
                emitter.emit();
                la.startChunk(RCF822TokenType.CRLF);
                la.advance(2);
                emitter.emit();
                this.parsePartBodyToken(la, emitter);
            }
            else if (this.multipartStarted && la.isNext(DASH, DASH)) {
                la.startChunk(RCF822TokenType.DOUBLE_DASH);
                la.advance(2); // end of whole message
                emitter.emit();
                return;
            }
            else if (this.boundary && la.isNext(...this.boundary)) {
                la.startChunk(RCF822TokenType.BOUNDARY);
                la.advance(this.boundary.length);
                emitter.emit();
                this.multipartStarted = true;
                // console.log('multipartStarted true');
            }
            else if (this.textBodyStarted) {
                while (la.la() != null && la.la() === CR || la.la() === LF) {
                    la.advance();
                }
                la.startChunk(RCF822TokenType.PART_BODY, false);
                while (la.la() != null) {
                    la.advance();
                }
                emitter.emit();
                return;
            }
            else if (la.isNext(CR, LF)) {
                la.startChunk(RCF822TokenType.CRLF);
                la.advance(2);
                emitter.emit();
            }
            else if ((la.la()) === LF) {
                la.startChunk(RCF822TokenType.CRLF);
                la.advance();
                emitter.emit();
            }
            else if (chr === ':' || chr === ';') {
                la.startChunk(RCF822TokenType[chr]);
                la.advance();
                emitter.emit();
                skipWhiteSpace(la);
            }
            else if (/\s/.test(chr)) {
                skipWhiteSpace(la);
            }
            else if (chr === '"' || chr === '\'') {
                quoteStr(la, emitter);
            }
            else {
                consumeAtom(la, emitter);
            }
            chrCode = la.la();
        };
        this.parseGrammar = (la) => {
            let result = {
                headers: this.parseHeaders(la),
                parts: []
            };
            // console.log('boundary:', String.fromCharCode(...this.boundary!));
            if (this.boundary == null) {
                this.textBodyStarted = true;
                const tk = la.la();
                if (tk != null) {
                    la.advance();
                    result.textBody = Buffer.from(this.origBuffer.slice(tk.pos, tk.end)).toString('utf8');
                }
            }
            else {
                let tk = la.la();
                while (tk != null) {
                    // console.log('tk:', tk.text);
                    la.assertAdvanceWith([RCF822TokenType.BOUNDARY], compareTokenType);
                    if ((la.la()).type === RCF822TokenType.DOUBLE_DASH) {
                        break;
                    }
                    const partHeaders = this.parseHeaders(la);
                    const partBody = la.advance();
                    la.assertAdvanceWith([RCF822TokenType.CRLF], compareTokenType);
                    this.onParseEachPart(result, partHeaders, partBody);
                    // console.log('rfc token: ' + RCF822TokenType[(la.advance()).type]);
                    tk = la.la();
                }
            }
            return result;
        };
    }
    parse() {
        const ps = LLn_parser_1.parser('rfc822-messagee', (la, emitter) => this.parseLexer(la, emitter), (la) => this.parseGrammar(la), chunk => {
            chunk.text = chunk.values ?
                Buffer.from(Uint8Array.from(chunk.values)).toString() :
                '';
            return chunk;
        });
        ps.write(this.origBuffer);
        ps.end();
        try {
            return ps.getResult();
        }
        catch (err) {
            // tslint:disable-next-line: no-console
            log.error('Failed to parse:\n' + Buffer.from(this.origBuffer).toString('utf8'));
            throw err;
        }
    }
    onParseEachPart(result, partHeaders, partBody) {
        const encodingHeader = partHeaders.find(header => header.key === 'Content-Transfer-Encoding');
        const isBase64 = encodingHeader && encodingHeader.value[0] === 'base64';
        if (isBase64) {
            partBody.data = Buffer.from(partBody.data.toString(), 'base64');
        }
        const attachmentHeader = partHeaders.find(header => header.key === 'Content-Disposition');
        let attachmentName;
        if (attachmentHeader && attachmentHeader.value[0] === 'attachment') {
            const m = /^([^=]*)=["]?([^"]*)["]?$/.exec(attachmentHeader.value[1]);
            if (m && m[1] === 'filename') {
                attachmentName = path_1.default.resolve(TEMP_DIR, m[2]);
                fs_extra_1.default.mkdirpSync(TEMP_DIR);
                fs_extra_1.default.writeFileSync(attachmentName, partBody.data);
                log.info(attachmentName + ' is written');
            }
        }
        result.parts.push({
            headers: partHeaders,
            body: attachmentName ? undefined : partBody.data,
            file: attachmentName ? attachmentName : undefined
        });
    }
    setBoundary(str) {
        const chrs = new Array(str.length);
        for (let i = 0, l = str.length; i < l; i++) {
            chrs[i] = str.charCodeAt(i);
        }
        this.boundary = chrs;
    }
    parseHeaders(la) {
        const headers = [];
        let nextTk = la.la();
        while (nextTk != null) {
            if (la.isNextWith([RCF822TokenType.ATOM, RCF822TokenType[':']], compareTokenType)) {
                const key = nextTk.text;
                la.advance(2);
                nextTk = la.la();
                let value = [];
                const header = { key, value };
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
                    let boundary;
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
            }
            else if (la.isNextWith([RCF822TokenType.CRLF, RCF822TokenType.CRLF], compareTokenType)) {
                la.advance(2);
                let next = la.la();
                while (next && next.type === RCF822TokenType.CRLF) {
                    la.advance();
                    next = la.la();
                }
                break;
            }
            else if (la.isNextWith([RCF822TokenType.CRLF], compareTokenType)) {
                la.advance();
            }
            else {
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
    parsePartBodyToken(la, emitter) {
        const tk = la.startChunk(RCF822TokenType.PART_BODY);
        tk.trackValue = false;
        const origBufferOffset = la.position;
        while ((la.la()) != null) {
            if (la.isNext(CR, LF, ...this.boundary)) {
                tk.data = Buffer.from(this.origBuffer.slice(origBufferOffset, la.position));
                emitter.emit();
                la.startChunk(RCF822TokenType.CRLF);
                la.advance(2);
                emitter.emit();
                la.startChunk(RCF822TokenType.BOUNDARY);
                la.advance(this.boundary.length);
                emitter.emit();
                break;
            }
            la.advance();
        }
    }
}
function quoteStr(la, emitter) {
    la.startChunk(RCF822TokenType.quoteStr);
    const openChar = la.advance();
    while (true) {
        const next = la.la();
        if (next == null) {
            return la.throwError();
        }
        if (next === BACK_SLASH) {
            la.advance(2);
        }
        else if (next === openChar) {
            la.advance();
            emitter.emit();
            break;
        }
        else {
            la.advance();
        }
    }
}
function skipWhiteSpace(la) {
    do {
        const code = la.la();
        if (code == null)
            return;
        if (/\s/.test(String.fromCharCode(code))) {
            la.advance();
        }
        else {
            break;
        }
    } while (true);
}
function consumeAtom(la, emitter) {
    la.startChunk(RCF822TokenType.ATOM);
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
                emitter.emit();
                break;
            case CR:
                // console.log((la.la()), (la.la(2)), (la.la(3)));
                if (!(la.isNext(CR, LF, WS)) && !(la.isNext(CR, WS)) &&
                    !(la.isNext(CR, LF, TAB)) && !(la.isNext(CR, TAB))) {
                    // console.log('emit: ', (la.la()), (la.la(2)), (la.la(3)));
                    emit = true;
                    emitter.emit();
                    break;
                }
                else {
                    la.advance(3);
                    code = la.la();
                    break;
                }
            case LF:
                if (!la.isNext(LF, WS) && !la.isNext(LF, TAB)) {
                    emit = true;
                    emitter.emit();
                    break;
                }
                else {
                    la.advance(2);
                    code = la.la();
                    break;
                }
            default:
                la.advance();
                code = la.la();
        }
        if (emit)
            break;
    }
}
// function parseMultipart(la: Parameters<typeof parseGrammar>[0]) {
//   while (la.isNext(DASH, DASH))
// }
function compareTokenType(tk, type) {
    return tk.type === type;
}
function parse(readable) {
    const pctx = new RfcParserContext(readable);
    return pctx.parse();
}
exports.parse = parse;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9tYWlsL3JmYzgyMi1zeW5jLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSwrREFBK0U7QUFDL0Usd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7QUFFcEYsSUFBWSxlQVNYO0FBVEQsV0FBWSxlQUFlO0lBQ3pCLHFEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILDZEQUFRLENBQUE7SUFDUixxREFBSSxDQUFBO0lBQ0osNkRBQVEsQ0FBQTtJQUNSLCtEQUFTLENBQUE7SUFDVCxtRUFBVyxDQUFBO0FBQ2IsQ0FBQyxFQVRXLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBUzFCO0FBVUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FB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QkFDUDtZQUNIO2dCQUNFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2xCO1FBQ0QsSUFBSSxJQUFJO1lBQUUsTUFBTTtLQUNqQjtBQUNILENBQUM7QUFFRCxvRUFBb0U7QUFDcEUsa0NBQWtDO0FBQ2xDLElBQUk7QUFDSixTQUFTLGdCQUFnQixDQUFJLEVBQW9CLEVBQUUsSUFBTztJQUN2RCxPQUFPLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDO0FBQzNCLENBQUM7QUFHRCxTQUFnQixLQUFLLENBQUMsUUFBZ0I7SUFDcEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM1QyxPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUN0QixDQUFDO0FBSEQsc0JBR0MiLCJmaWxlIjoicnVudGltZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvbWFpbC9yZmM4MjItc3luYy1wYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
