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
const async_LLn_parser_1 = require("@wfh/plink/wfh/dist/async-LLn-parser");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const log = require('log4js').getLogger('@wfh/assets-processer.rfc822-parser');
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
    const done = (0, rxjs_1.of)(readable).pipe((0, operators_1.observeOn)(rxjs_1.queueScheduler), (0, async_LLn_parser_1.mapChunks)('RCF822-lexer', (la, sub) => pctx.parseLexer(la, sub)), (0, operators_1.map)(chunk => {
        if (chunk.values)
            chunk.text = Buffer.from(Uint8Array.from(chunk.values)).toString();
        delete chunk.values;
        return [chunk];
    }), (0, async_LLn_parser_1.mapChunksObs)('RCF822-parser', la => (0, rxjs_1.from)(pctx.parseGrammar(la))), (0, operators_1.share)()).toPromise();
    return done;
}
exports.parse = parse;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmZjODIyLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJmYzgyMi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMkVBQzZGO0FBQzdGLCtCQUE4QztBQUM5Qyw4Q0FBcUQ7QUFFckQsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7QUFFL0UsSUFBWSxlQVNYO0FBVEQsV0FBWSxlQUFlO0lBQ3pCLHFEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILDZEQUFRLENBQUE7SUFDUixxREFBSSxDQUFBO0lBQ0osNkRBQVEsQ0FBQTtJQUNSLCtEQUFTLENBQUE7SUFDVCxtRUFBVyxDQUFBO0FBQ2IsQ0FBQyxFQVRXLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBUzFCO0FBTUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFD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bWFyLCBQYXJzZUxleCwgVG9rZW4sXG4gIG1hcENodW5rcywgbWFwQ2h1bmtzT2JzLCBMb29rQWhlYWRPYnNlcnZhYmxlIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7cXVldWVTY2hlZHVsZXIsIGZyb20sIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7b2JzZXJ2ZU9uLCBtYXAsIHNoYXJlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIucmZjODIyLXBhcnNlcicpO1xuXG5leHBvcnQgZW51bSBSQ0Y4MjJUb2tlblR5cGUge1xuICBDUkxGLFxuICAnOicsXG4gICc7JyxcbiAgcXVvdGVTdHIsXG4gIEFUT00sXG4gIEJPVU5EQVJZLFxuICBQQVJUX0JPRFksXG4gIERPVUJMRV9EQVNIXG59XG5cbmludGVyZmFjZSBQYXJ0Qm9keVRva2VuIGV4dGVuZHMgVG9rZW48UkNGODIyVG9rZW5UeXBlPiB7XG4gIGRhdGE6IEJ1ZmZlcjtcbn1cblxuY29uc3QgQ1IgPSAnXFxyJy5jaGFyQ29kZUF0KDApO1xuY29uc3QgTEYgPSAnXFxuJy5jaGFyQ29kZUF0KDApO1xuY29uc3QgQkFDS19TTEFTSCA9ICdcXFxcJy5jaGFyQ29kZUF0KDApO1xuY29uc3QgUVVPVEVfTUFSSzEgPSAnXCInLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBRVU9URV9NQVJLMiA9ICdcXCcnLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBDT0xPTl9NQVJLID0gJzonLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBTRU1JX0NPTCA9ICc7Jy5jaGFyQ29kZUF0KDApO1xuY29uc3QgV1MgPSAnICcuY2hhckNvZGVBdCgwKTtcbmNvbnN0IFRBQiA9ICdcXHQnLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBEQVNIID0gJy0nLmNoYXJDb2RlQXQoMCk7XG4vLyBjb25zdCBEQVNIID0gJy0nLmNoYXJDb2RlQXQoMCk7XG5cbmNvbnN0IFRFTVBfRElSID0gJ2Rpc3QvYXNzZXRzLXByb2Nlc3Nlci9yZmM4MjInO1xuZXhwb3J0IGludGVyZmFjZSBSQ0Y4MjJQYXJzZVJlc3VsdCB7XG4gIGhlYWRlcnM6IFJDRjgyMkhlYWRlclR5cGVbXTtcbiAgcGFydHM6IHtcbiAgICBoZWFkZXJzOiBSQ0Y4MjJIZWFkZXJUeXBlW107XG4gICAgYm9keT86IEJ1ZmZlcjtcbiAgICBmaWxlPzogc3RyaW5nO1xuICB9W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUkNGODIySGVhZGVyVHlwZSB7XG4gIGtleTogc3RyaW5nO1xuICB2YWx1ZTogc3RyaW5nW107XG59XG5cbmNsYXNzIFJmY1BhcnNlckNvbnRleHQge1xuICBwcml2YXRlIGJvdW5kYXJ5OiBudW1iZXJbXSB8IHVuZGVmaW5lZDtcblxuICBwcml2YXRlIG11bHRpcGFydFN0YXJ0ZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG9yaWdCdWZmZXI6IFVpbnQ4QXJyYXkpIHtcbiAgfVxuXG5cblxuICBwYXJzZUxleGVyOiBQYXJzZUxleDxudW1iZXIsIFJDRjgyMlRva2VuVHlwZT4gPSBhc3luYyAobGEpID0+IHtcbiAgICBsZXQgY2hyQ29kZSA9IGF3YWl0IGxhLmxhKCk7XG4gICAgd2hpbGUgKGNockNvZGUgIT0gbnVsbCkge1xuICAgICAgY29uc3QgY2hyID0gU3RyaW5nLmZyb21DaGFyQ29kZShjaHJDb2RlKTtcbiAgICAgIGlmICh0aGlzLm11bHRpcGFydFN0YXJ0ZWQgJiYgYXdhaXQgbGEuaXNOZXh0KENSLCBMRiwgQ1IsIExGKSkge1xuICAgICAgICAvLyBwYXJ0IGhlYWRlciBtdXN0IGJlIG92ZXJcbiAgICAgICAgbGEuc3RhcnRUb2tlbihSQ0Y4MjJUb2tlblR5cGUuQ1JMRik7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoMik7XG4gICAgICAgIGxhLmVtaXRUb2tlbigpO1xuXG4gICAgICAgIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpO1xuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcbiAgICAgICAgYXdhaXQgdGhpcy5wYXJzZVBhcnRCb2R5VG9rZW4obGEpO1xuXG4gICAgICB9IGVsc2UgaWYgKHRoaXMubXVsdGlwYXJ0U3RhcnRlZCAmJiBhd2FpdCBsYS5pc05leHQoREFTSCwgREFTSCkpIHtcbiAgICAgICAgbGEuc3RhcnRUb2tlbihSQ0Y4MjJUb2tlblR5cGUuRE9VQkxFX0RBU0gpO1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpOyAvLyBlbmQgb2Ygd2hvbGUgbWVzc2FnZVxuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuYm91bmRhcnkgJiYgYXdhaXQgbGEuaXNOZXh0KC4uLnRoaXMuYm91bmRhcnkpKSB7XG4gICAgICAgIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlLkJPVU5EQVJZKTtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSh0aGlzLmJvdW5kYXJ5Lmxlbmd0aCk7XG4gICAgICAgIGxhLmVtaXRUb2tlbigpO1xuICAgICAgICB0aGlzLm11bHRpcGFydFN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnbXVsdGlwYXJ0U3RhcnRlZCB0cnVlJyk7XG4gICAgICB9IGVsc2UgaWYgKGF3YWl0IGxhLmlzTmV4dChDUiwgTEYpKSB7XG4gICAgICAgIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpO1xuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoKGF3YWl0IGxhLmxhKCkpID09PSBMRikge1xuICAgICAgICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5DUkxGKTtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hyID09PSAnOicgfHwgY2hyID09PSAnOycpIHtcbiAgICAgICAgbGEuc3RhcnRUb2tlbihSQ0Y4MjJUb2tlblR5cGVbY2hyXSk7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICAgIGF3YWl0IHNraXBXaGl0ZVNwYWNlKGxhKTtcbiAgICAgIH0gZWxzZSBpZiAoL1xccy8udGVzdChjaHIpKSB7XG4gICAgICAgIGF3YWl0IHNraXBXaGl0ZVNwYWNlKGxhKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hyID09PSAnXCInIHx8IGNociA9PT0gJ1xcJycpIHtcbiAgICAgICAgYXdhaXQgcXVvdGVTdHIobGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgY29uc3VtZUF0b20obGEpO1xuICAgICAgfVxuICAgICAgY2hyQ29kZSA9IGF3YWl0IGxhLmxhKCk7XG4gICAgfVxuICB9XG5cbiAgcGFyc2VHcmFtbWFyOiBQYXJzZUdyYW1tYXI8UkNGODIyUGFyc2VSZXN1bHQsIFJDRjgyMlRva2VuVHlwZT4gPSBhc3luYyAobGEpID0+IHtcbiAgICBsZXQgcmVzdWx0OiBSQ0Y4MjJQYXJzZVJlc3VsdCA9IHtcbiAgICAgIGhlYWRlcnM6IGF3YWl0IHRoaXMucGFyc2VIZWFkZXJzKGxhKSxcbiAgICAgIHBhcnRzOiBbXVxuICAgIH07XG5cbiAgICAvLyBjb25zb2xlLmxvZygnYm91bmRhcnk6JywgU3RyaW5nLmZyb21DaGFyQ29kZSguLi50aGlzLmJvdW5kYXJ5ISkpO1xuXG4gICAgbGV0IHRrID0gYXdhaXQgbGEubGEoKTtcbiAgICB3aGlsZSAodGsgIT0gbnVsbCkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ3RrOicsIHRrLnRleHQpO1xuICAgICAgYXdhaXQgbGEuYXNzZXJ0QWR2YW5jZVdpdGgoW1JDRjgyMlRva2VuVHlwZS5CT1VOREFSWV0sIGNvbXBhcmVUb2tlblR5cGUpO1xuICAgICAgaWYgKChhd2FpdCBsYS5sYSgpKSEudHlwZSA9PT0gUkNGODIyVG9rZW5UeXBlLkRPVUJMRV9EQVNIKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY29uc3QgcGFydEhlYWRlcnMgPSBhd2FpdCB0aGlzLnBhcnNlSGVhZGVycyhsYSk7XG4gICAgICBjb25zdCBwYXJ0Qm9keSA9IGF3YWl0IGxhLmFkdmFuY2UoKSBhcyBQYXJ0Qm9keVRva2VuO1xuICAgICAgYXdhaXQgbGEuYXNzZXJ0QWR2YW5jZVdpdGgoW1JDRjgyMlRva2VuVHlwZS5DUkxGXSwgY29tcGFyZVRva2VuVHlwZSk7XG5cbiAgICAgIHRoaXMub25QYXJzZUVhY2hQYXJ0KHJlc3VsdCwgcGFydEhlYWRlcnMsIHBhcnRCb2R5KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdyZmMgdG9rZW46ICcgKyBSQ0Y4MjJUb2tlblR5cGVbKGF3YWl0IGxhLmFkdmFuY2UoKSkudHlwZV0pO1xuICAgICAgdGsgPSBhd2FpdCBsYS5sYSgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IGFzIFJDRjgyMlBhcnNlUmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSBvblBhcnNlRWFjaFBhcnQocmVzdWx0OiBSQ0Y4MjJQYXJzZVJlc3VsdCxcbiAgICBwYXJ0SGVhZGVyczogUkNGODIyUGFyc2VSZXN1bHRbJ2hlYWRlcnMnXSxcbiAgICBwYXJ0Qm9keTogUGFydEJvZHlUb2tlbikge1xuICAgIGNvbnN0IGVuY29kaW5nSGVhZGVyID0gcGFydEhlYWRlcnMuZmluZChoZWFkZXIgPT4gaGVhZGVyLmtleSA9PT0gJ0NvbnRlbnQtVHJhbnNmZXItRW5jb2RpbmcnKTtcbiAgICBjb25zdCBpc0Jhc2U2NCA9IGVuY29kaW5nSGVhZGVyICYmIGVuY29kaW5nSGVhZGVyLnZhbHVlWzBdID09PSAnYmFzZTY0JztcblxuICAgIGlmIChpc0Jhc2U2NCkge1xuICAgICAgcGFydEJvZHkuZGF0YSA9IEJ1ZmZlci5mcm9tKHBhcnRCb2R5LmRhdGEudG9TdHJpbmcoKSwgJ2Jhc2U2NCcpO1xuICAgIH1cbiAgICBjb25zdCBhdHRhY2htZW50SGVhZGVyID0gcGFydEhlYWRlcnMuZmluZChoZWFkZXIgPT4gaGVhZGVyLmtleSA9PT0gJ0NvbnRlbnQtRGlzcG9zaXRpb24nKTtcbiAgICBsZXQgYXR0YWNobWVudE5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIGlmIChhdHRhY2htZW50SGVhZGVyICYmIGF0dGFjaG1lbnRIZWFkZXIudmFsdWVbMF0gPT09ICdhdHRhY2htZW50Jykge1xuICAgICAgY29uc3QgbSA9IC9eKFtePV0qKT1bXCJdPyhbXlwiXSopW1wiXT8kLy5leGVjKGF0dGFjaG1lbnRIZWFkZXIudmFsdWVbMV0pO1xuICAgICAgaWYgKG0gJiYgbVsxXSA9PT0gJ2ZpbGVuYW1lJykge1xuICAgICAgICBhdHRhY2htZW50TmFtZSA9IFBhdGgucmVzb2x2ZShURU1QX0RJUiwgbVsyXSk7XG4gICAgICAgIGZzLm1rZGlycFN5bmMoVEVNUF9ESVIpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGF0dGFjaG1lbnROYW1lLCBwYXJ0Qm9keS5kYXRhKTtcbiAgICAgICAgbG9nLmluZm8oYXR0YWNobWVudE5hbWUgKyAnIGlzIHdyaXR0ZW4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXN1bHQucGFydHMucHVzaCh7XG4gICAgICBoZWFkZXJzOiBwYXJ0SGVhZGVycyxcbiAgICAgIGJvZHk6IGF0dGFjaG1lbnROYW1lID8gdW5kZWZpbmVkIDogcGFydEJvZHkuZGF0YSxcbiAgICAgIGZpbGU6IGF0dGFjaG1lbnROYW1lID8gYXR0YWNobWVudE5hbWUgOiB1bmRlZmluZWRcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0Qm91bmRhcnkoc3RyOiBzdHJpbmcpIHtcbiAgICBjb25zdCBjaHJzOiBudW1iZXJbXSA9IG5ldyBBcnJheShzdHIubGVuZ3RoKTtcblxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gc3RyLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgY2hyc1tpXSA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgIH1cbiAgICB0aGlzLmJvdW5kYXJ5ID0gY2hycztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcGFyc2VIZWFkZXJzKGxhOiBQYXJhbWV0ZXJzPFJmY1BhcnNlckNvbnRleHRbJ3BhcnNlR3JhbW1hciddPlswXSkge1xuICAgIGNvbnN0IGhlYWRlcnM6IHtrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZ1tdfVtdID0gW107XG4gICAgbGV0IG5leHRUayA9IGF3YWl0IGxhLmxhKCk7XG5cbiAgICB3aGlsZSAobmV4dFRrICE9IG51bGwpIHtcbiAgICAgIGlmIChuZXh0VGsudHlwZSA9PT0gUkNGODIyVG9rZW5UeXBlLkFUT00gJiYgKGF3YWl0IGxhLmxhKDIpKSAmJiAoYXdhaXQgbGEubGEoMikpIS50eXBlID09PSBSQ0Y4MjJUb2tlblR5cGVbJzonXSkge1xuICAgICAgICBjb25zdCBrZXkgPSBuZXh0VGsudGV4dDtcblxuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpO1xuICAgICAgICBuZXh0VGsgPSBhd2FpdCBsYS5sYSgpO1xuXG4gICAgICAgIGxldCB2YWx1ZSA9IFtdIGFzIHN0cmluZ1tdO1xuICAgICAgICBjb25zdCBoZWFkZXIgPSB7a2V5LCB2YWx1ZX07XG4gICAgICAgIGhlYWRlcnMucHVzaChoZWFkZXIpO1xuICAgICAgICBsZXQgbGFzdFZhbHVlSXRlbSA9ICcnO1xuICAgICAgICB3aGlsZSAobmV4dFRrICE9IG51bGwgJiYgbmV4dFRrLnR5cGUgIT09IFJDRjgyMlRva2VuVHlwZS5DUkxGKSB7XG4gICAgICAgICAgaWYgKG5leHRUay50eXBlID09PSBSQ0Y4MjJUb2tlblR5cGVbJzsnXSkge1xuICAgICAgICAgICAgdmFsdWUucHVzaChsYXN0VmFsdWVJdGVtKTtcbiAgICAgICAgICAgIGxhc3RWYWx1ZUl0ZW0gPSAnJztcbiAgICAgICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICAgIG5leHRUayA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdFZhbHVlSXRlbSArPSAoYXdhaXQgbGEuYWR2YW5jZSgpKS50ZXh0O1xuICAgICAgICAgIG5leHRUayA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUucHVzaChsYXN0VmFsdWVJdGVtKTtcbiAgICAgICAgaWYgKGtleS50b0xvd2VyQ2FzZSgpID09PSAnY29udGVudC10eXBlJyAmJiB2YWx1ZVswXSA9PT0gJ211bHRpcGFydC9taXhlZCcpIHtcbiAgICAgICAgICBsZXQgYm91bmRhcnk6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICBmb3IgKGNvbnN0IHZhbHVlSXRlbSBvZiB2YWx1ZS5zbGljZSgxKSkge1xuICAgICAgICAgICAgY29uc3QgbSA9IC9eKFtePV0qKT1bXCJdPyhbXlwiXSopW1wiXT8kLy5leGVjKHZhbHVlSXRlbSk7XG4gICAgICAgICAgICBpZiAobSAmJiBtWzFdID09PSAnYm91bmRhcnknKSB7XG4gICAgICAgICAgICAgIGJvdW5kYXJ5ID0gbVsyXTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChib3VuZGFyeSkge1xuICAgICAgICAgICAgdGhpcy5zZXRCb3VuZGFyeSgnLS0nICsgYm91bmRhcnkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKGF3YWl0IGxhLmlzTmV4dFdpdGg8UkNGODIyVG9rZW5UeXBlPihbUkNGODIyVG9rZW5UeXBlLkNSTEYsIFJDRjgyMlRva2VuVHlwZS5DUkxGXSwgY29tcGFyZVRva2VuVHlwZSkpIHtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTtcbiAgICAgICAgbGV0IG5leHQgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICB3aGlsZSAobmV4dCAmJiBuZXh0LnR5cGUgPT09IFJDRjgyMlRva2VuVHlwZS5DUkxGKSB7XG4gICAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICAgIG5leHQgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmIChhd2FpdCBsYS5pc05leHRXaXRoKFtSQ0Y4MjJUb2tlblR5cGUuQ1JMRl0sIGNvbXBhcmVUb2tlblR5cGUpKSB7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhLnRocm93RXJyb3IoKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dCk7XG4gICAgICAgIC8vIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgIH1cbiAgICAgIG5leHRUayA9IGF3YWl0IGxhLmxhKCk7XG4gICAgfVxuICAgIHJldHVybiBoZWFkZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIHRva2VuczogUEFSVF9CT0RZIENSTEYgQk9VTkRBUllcbiAgICogQHBhcmFtIGxhIFxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwYXJzZVBhcnRCb2R5VG9rZW4obGE6IExvb2tBaGVhZE9ic2VydmFibGU8bnVtYmVyLCBSQ0Y4MjJUb2tlblR5cGU+KSB7XG4gICAgY29uc3QgdGsgPSBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5QQVJUX0JPRFkpO1xuICAgIHRrLnRyYWNrVmFsdWUgPSBmYWxzZTtcbiAgICBjb25zdCBvcmlnQnVmZmVyT2Zmc2V0ID0gbGEucG9zaXRpb247XG5cbiAgICB3aGlsZSAoKGF3YWl0IGxhLmxhKCkpICE9IG51bGwpIHtcblxuICAgICAgaWYgKGF3YWl0IGxhLmlzTmV4dChDUiwgTEYsIC4uLnRoaXMuYm91bmRhcnkhKSkge1xuICAgICAgICAodGsgYXMgdW5rbm93biBhcyBQYXJ0Qm9keVRva2VuKS5kYXRhID0gQnVmZmVyLmZyb20odGhpcy5vcmlnQnVmZmVyLCBvcmlnQnVmZmVyT2Zmc2V0LCBsYS5wb3NpdGlvbiAtIG9yaWdCdWZmZXJPZmZzZXQpO1xuXG4gICAgICAgIGxhLmVtaXRUb2tlbigpO1xuXG4gICAgICAgIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpO1xuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcblxuICAgICAgICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5CT1VOREFSWSk7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UodGhpcy5ib3VuZGFyeSEubGVuZ3RoKTtcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgIH1cbiAgfVxuXG59XG5cbmFzeW5jIGZ1bmN0aW9uIHF1b3RlU3RyKGxhOiBMb29rQWhlYWRPYnNlcnZhYmxlPG51bWJlciwgUkNGODIyVG9rZW5UeXBlPikge1xuICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5xdW90ZVN0cik7XG4gIGNvbnN0IG9wZW5DaGFyID0gYXdhaXQgbGEuYWR2YW5jZSgpO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IG5leHQgPSBhd2FpdCBsYS5sYSgpO1xuICAgIGlmIChuZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBsYS50aHJvd0Vycm9yKCk7XG4gICAgfVxuICAgIGlmIChuZXh0ID09PSBCQUNLX1NMQVNIKSB7XG4gICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpO1xuICAgIH0gZWxzZSBpZiAobmV4dCA9PT0gb3BlbkNoYXIpIHtcbiAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgIGxhLmVtaXRUb2tlbigpO1xuICAgICAgYnJlYWs7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICB9XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc2tpcFdoaXRlU3BhY2UobGE6IExvb2tBaGVhZE9ic2VydmFibGU8bnVtYmVyLCBSQ0Y4MjJUb2tlblR5cGU+KSB7XG4gIGRvIHtcbiAgICBjb25zdCBjb2RlID0gYXdhaXQgbGEubGEoKTtcbiAgICBpZiAoY29kZSA9PSBudWxsKSByZXR1cm47XG4gICAgaWYgKC9cXHMvLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSkpIHtcbiAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9IHdoaWxlICh0cnVlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29uc3VtZUF0b20obGE6IExvb2tBaGVhZE9ic2VydmFibGU8bnVtYmVyLCBSQ0Y4MjJUb2tlblR5cGU+KSB7XG4gIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlLkFUT00pO1xuICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gIGxldCBjb2RlID0gYXdhaXQgbGEubGEoKTtcbiAgbGV0IGVtaXQgPSBmYWxzZTtcbiAgd2hpbGUgKGNvZGUgIT0gbnVsbCkge1xuICAgIHN3aXRjaCAoY29kZSkge1xuICAgICAgY2FzZSBDT0xPTl9NQVJLOlxuICAgICAgY2FzZSBTRU1JX0NPTDpcbiAgICAgIGNhc2UgUVVPVEVfTUFSSzE6XG4gICAgICBjYXNlIFFVT1RFX01BUksyOlxuICAgICAgICBlbWl0ID0gdHJ1ZTtcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBDUjpcbiAgICAgICAgLy8gY29uc29sZS5sb2coKGF3YWl0IGxhLmxhKCkpLCAoYXdhaXQgbGEubGEoMikpLCAoYXdhaXQgbGEubGEoMykpKTtcbiAgICAgICAgaWYgKCEoYXdhaXQgbGEuaXNOZXh0KENSLCBMRiwgV1MpKSAmJiAhKGF3YWl0IGxhLmlzTmV4dChDUiwgV1MpKSAmJlxuICAgICAgICAgICEoYXdhaXQgbGEuaXNOZXh0KENSLCBMRiwgVEFCKSkgJiYgIShhd2FpdCBsYS5pc05leHQoQ1IsIFRBQikpKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ2VtaXQ6ICcsIChhd2FpdCBsYS5sYSgpKSwgKGF3YWl0IGxhLmxhKDIpKSwgKGF3YWl0IGxhLmxhKDMpKSk7XG4gICAgICAgICAgZW1pdCA9IHRydWU7XG4gICAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgzKTtcbiAgICAgICAgICBjb2RlID0gYXdhaXQgbGEubGEoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgY2FzZSBMRjpcbiAgICAgICAgaWYgKCEgYXdhaXQgbGEuaXNOZXh0KExGLCBXUykgJiYgISBhd2FpdCBsYS5pc05leHQoTEYsIFRBQikpIHtcbiAgICAgICAgICBlbWl0ID0gdHJ1ZTtcbiAgICAgICAgICBsYS5lbWl0VG9rZW4oKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpO1xuICAgICAgICAgIGNvZGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGNvZGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgIH1cbiAgICBpZiAoZW1pdCkgYnJlYWs7XG4gIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gcGFyc2VNdWx0aXBhcnQobGE6IFBhcmFtZXRlcnM8dHlwZW9mIHBhcnNlR3JhbW1hcj5bMF0pIHtcbi8vICAgd2hpbGUgKGF3YWl0IGxhLmlzTmV4dChEQVNILCBEQVNIKSlcbi8vIH1cbmZ1bmN0aW9uIGNvbXBhcmVUb2tlblR5cGU8VD4odGs6IFRva2VuPFQ+LCB0eXBlOiBUKSB7XG4gICByZXR1cm4gdGsudHlwZSA9PT0gdHlwZTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2UocmVhZGFibGU6IEJ1ZmZlcikge1xuICAvLyBmcy53cml0ZUZpbGVTeW5jKCdlbWFpbC10ZW1wLnR4dCcsIHJlYWRhYmxlLnRvU3RyaW5nKCd1dGY4JyksICd1dGY4Jyk7XG5cbiAgY29uc3QgcGN0eCA9IG5ldyBSZmNQYXJzZXJDb250ZXh0KHJlYWRhYmxlKTtcblxuICBjb25zdCBkb25lID0gb2YocmVhZGFibGUpLnBpcGUoXG4gICAgb2JzZXJ2ZU9uKHF1ZXVlU2NoZWR1bGVyKSxcbiAgICBtYXBDaHVua3M8bnVtYmVyLCBSQ0Y4MjJUb2tlblR5cGU+KCdSQ0Y4MjItbGV4ZXInLCAobGEsIHN1YikgPT4gcGN0eC5wYXJzZUxleGVyKGxhLCBzdWIpKSxcbiAgICBtYXAoY2h1bmsgPT4ge1xuICAgICAgaWYgKGNodW5rLnZhbHVlcylcbiAgICAgICAgKGNodW5rIGFzIFRva2VuPFJDRjgyMlRva2VuVHlwZT4pLnRleHQgPSBCdWZmZXIuZnJvbShVaW50OEFycmF5LmZyb20oY2h1bmsudmFsdWVzISkpLnRvU3RyaW5nKCk7XG4gICAgICBkZWxldGUgY2h1bmsudmFsdWVzO1xuICAgICAgcmV0dXJuIFtjaHVuayBhcyBUb2tlbjxSQ0Y4MjJUb2tlblR5cGU+XTtcbiAgICB9KSxcbiAgICBtYXBDaHVua3NPYnMoJ1JDRjgyMi1wYXJzZXInLCBsYSA9PiBmcm9tKHBjdHgucGFyc2VHcmFtbWFyKGxhKSkpLFxuICAgIHNoYXJlKClcbiAgKS50b1Byb21pc2UoKTtcbiAgcmV0dXJuIGRvbmU7XG59XG4iXX0=