"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.RCF822TokenType = void 0;
const async_LLn_parser_1 = require("dr-comp-package/wfh/dist/async-LLn-parser");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const log = require('log4js').getLogger('@dr-core/assets-processer.rfc822-parser');
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
        this.parseLexer = (la) => __awaiter(this, void 0, void 0, function* () {
            let chrCode = yield la.la();
            while (chrCode != null) {
                const chr = String.fromCharCode(chrCode);
                if (this.multipartStarted && (yield la.isNext(CR, LF, CR, LF))) {
                    // part header must be over
                    la.startToken(RCF822TokenType.CRLF);
                    yield la.advance(2);
                    la.emitToken();
                    la.startToken(RCF822TokenType.CRLF);
                    yield la.advance(2);
                    la.emitToken();
                    yield this.parsePartBodyToken(la);
                }
                else if (this.multipartStarted && (yield la.isNext(DASH, DASH))) {
                    la.startToken(RCF822TokenType.DOUBLE_DASH);
                    yield la.advance(2); // end of whole message
                    la.emitToken();
                    break;
                }
                else if (this.boundary && (yield la.isNext(...this.boundary))) {
                    la.startToken(RCF822TokenType.BOUNDARY);
                    yield la.advance(this.boundary.length);
                    la.emitToken();
                    this.multipartStarted = true;
                    // console.log('multipartStarted true');
                }
                else if (yield la.isNext(CR, LF)) {
                    la.startToken(RCF822TokenType.CRLF);
                    yield la.advance(2);
                    la.emitToken();
                }
                else if ((yield la.la()) === LF) {
                    la.startToken(RCF822TokenType.CRLF);
                    yield la.advance();
                    la.emitToken();
                }
                else if (chr === ':' || chr === ';') {
                    la.startToken(RCF822TokenType[chr]);
                    yield la.advance();
                    la.emitToken();
                    yield skipWhiteSpace(la);
                }
                else if (/\s/.test(chr)) {
                    yield skipWhiteSpace(la);
                }
                else if (chr === '"' || chr === '\'') {
                    yield quoteStr(la);
                }
                else {
                    yield consumeAtom(la);
                }
                chrCode = yield la.la();
            }
        });
        this.parseGrammar = (la) => __awaiter(this, void 0, void 0, function* () {
            let result = {
                headers: yield this.parseHeaders(la),
                parts: []
            };
            // console.log('boundary:', String.fromCharCode(...this.boundary!));
            let tk = yield la.la();
            while (tk != null) {
                // console.log('tk:', tk.text);
                yield la.assertAdvanceWith([RCF822TokenType.BOUNDARY], compareTokenType);
                if ((yield la.la()).type === RCF822TokenType.DOUBLE_DASH) {
                    break;
                }
                const partHeaders = yield this.parseHeaders(la);
                const partBody = yield la.advance();
                yield la.assertAdvanceWith([RCF822TokenType.CRLF], compareTokenType);
                this.onParseEachPart(result, partHeaders, partBody);
                // console.log('rfc token: ' + RCF822TokenType[(await la.advance()).type]);
                tk = yield la.la();
            }
            return result;
        });
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
        return __awaiter(this, void 0, void 0, function* () {
            const headers = [];
            let nextTk = yield la.la();
            while (nextTk != null) {
                if (nextTk.type === RCF822TokenType.ATOM && (yield la.la(2)) && (yield la.la(2)).type === RCF822TokenType[':']) {
                    const key = nextTk.text;
                    yield la.advance(2);
                    nextTk = yield la.la();
                    let value = [];
                    const header = { key, value };
                    headers.push(header);
                    let lastValueItem = '';
                    while (nextTk != null && nextTk.type !== RCF822TokenType.CRLF) {
                        if (nextTk.type === RCF822TokenType[';']) {
                            value.push(lastValueItem);
                            lastValueItem = '';
                            yield la.advance();
                            nextTk = yield la.la();
                            continue;
                        }
                        lastValueItem += (yield la.advance()).text;
                        nextTk = yield la.la();
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
                else if (yield la.isNextWith([RCF822TokenType.CRLF, RCF822TokenType.CRLF], compareTokenType)) {
                    yield la.advance(2);
                    let next = yield la.la();
                    while (next && next.type === RCF822TokenType.CRLF) {
                        yield la.advance();
                        next = yield la.la();
                    }
                    break;
                }
                else if (yield la.isNextWith([RCF822TokenType.CRLF], compareTokenType)) {
                    yield la.advance();
                }
                else {
                    la.throwError((yield la.advance()).text);
                    // await la.advance();
                }
                nextTk = yield la.la();
            }
            return headers;
        });
    }
    /**
     * Generate tokens: PART_BODY CRLF BOUNDARY
     * @param la
     */
    parsePartBodyToken(la) {
        return __awaiter(this, void 0, void 0, function* () {
            const tk = la.startToken(RCF822TokenType.PART_BODY);
            tk.trackValue = false;
            const origBufferOffset = la.position;
            while ((yield la.la()) != null) {
                if (yield la.isNext(CR, LF, ...this.boundary)) {
                    tk.data = Buffer.from(this.origBuffer, origBufferOffset, la.position - origBufferOffset);
                    la.emitToken();
                    la.startToken(RCF822TokenType.CRLF);
                    yield la.advance(2);
                    la.emitToken();
                    la.startToken(RCF822TokenType.BOUNDARY);
                    yield la.advance(this.boundary.length);
                    la.emitToken();
                    break;
                }
                yield la.advance();
            }
        });
    }
}
function quoteStr(la) {
    return __awaiter(this, void 0, void 0, function* () {
        la.startToken(RCF822TokenType.quoteStr);
        const openChar = yield la.advance();
        while (true) {
            const next = yield la.la();
            if (next == null) {
                return la.throwError();
            }
            if (next === BACK_SLASH) {
                yield la.advance(2);
            }
            else if (next === openChar) {
                yield la.advance();
                la.emitToken();
                break;
            }
            else {
                yield la.advance();
            }
        }
    });
}
function skipWhiteSpace(la) {
    return __awaiter(this, void 0, void 0, function* () {
        do {
            const code = yield la.la();
            if (code == null)
                return;
            if (/\s/.test(String.fromCharCode(code))) {
                yield la.advance();
            }
            else {
                break;
            }
        } while (true);
    });
}
function consumeAtom(la) {
    return __awaiter(this, void 0, void 0, function* () {
        la.startToken(RCF822TokenType.ATOM);
        yield la.advance();
        let code = yield la.la();
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
                    if (!(yield la.isNext(CR, LF, WS)) && !(yield la.isNext(CR, WS)) &&
                        !(yield la.isNext(CR, LF, TAB)) && !(yield la.isNext(CR, TAB))) {
                        // console.log('emit: ', (await la.la()), (await la.la(2)), (await la.la(3)));
                        emit = true;
                        la.emitToken();
                        break;
                    }
                    else {
                        yield la.advance(3);
                        code = yield la.la();
                        break;
                    }
                case LF:
                    if (!(yield la.isNext(LF, WS)) && !(yield la.isNext(LF, TAB))) {
                        emit = true;
                        la.emitToken();
                        break;
                    }
                    else {
                        yield la.advance(2);
                        code = yield la.la();
                        break;
                    }
                default:
                    yield la.advance();
                    code = yield la.la();
            }
            if (emit)
                break;
        }
    });
}
// async function parseMultipart(la: Parameters<typeof parseGrammar>[0]) {
//   while (await la.isNext(DASH, DASH))
// }
function compareTokenType(tk, type) {
    return tk.type === type;
}
function parse(readable) {
    // fs.writeFileSync('email-temp.txt', readable.toString('utf8'), 'utf8');
    const pctx = new RfcParserContext(readable);
    const done = rxjs_1.of(readable).pipe(operators_1.observeOn(rxjs_1.queueScheduler), async_LLn_parser_1.mapChunks('RCF822-lexer', (la, sub) => pctx.parseLexer(la, sub)), operators_1.map(chunk => {
        if (chunk.values)
            chunk.text = Buffer.from(Uint8Array.from(chunk.values)).toString();
        delete chunk.values;
        return [chunk];
    }), async_LLn_parser_1.mapChunksObs('RCF822-parser', la => rxjs_1.from(pctx.parseGrammar(la))), operators_1.share()).toPromise();
    return done;
}
exports.parse = parse;

//# sourceMappingURL=rfc822-parser.js.map
