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

//# sourceMappingURL=rfc822-sync-parser.js.map
