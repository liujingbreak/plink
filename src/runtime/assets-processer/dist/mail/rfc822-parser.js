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
    const done = rxjs_1.of(readable).pipe(operators_1.observeOn(rxjs_1.queueScheduler), async_LLn_parser_1.mapChunks('RCF822-lexer', (la, sub) => pctx.parseLexer(la, sub)), operators_1.map(chunk => {
        if (chunk.values)
            chunk.text = Buffer.from(Uint8Array.from(chunk.values)).toString();
        delete chunk.values;
        return [chunk];
    }), async_LLn_parser_1.mapChunksObs('RCF822-parser', la => rxjs_1.from(pctx.parseGrammar(la))), operators_1.share()).toPromise();
    return done;
}
exports.parse = parse;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmZjODIyLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJmYzgyMi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMkVBQzZGO0FBQzdGLCtCQUE4QztBQUM5Qyw4Q0FBcUQ7QUFFckQsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7QUFFL0UsSUFBWSxlQVNYO0FBVEQsV0FBWSxlQUFlO0lBQ3pCLHFEQUFJLENBQUE7SUFDSiwrQ0FBRyxDQUFBO0lBQ0gsK0NBQUcsQ0FBQTtJQUNILDZEQUFRLENBQUE7SUFDUixxREFBSSxDQUFBO0lBQ0osNkRBQVEsQ0FBQTtJQUNSLCtEQUFTLENBQUE7SUFDVCxtRUFBVyxDQUFBO0FBQ2IsQ0FBQyxFQVRXLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBUzFCO0FBTUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFD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QUEwRTtBQUMxRSx3Q0FBd0M7QUFDeEMsSUFBSTtBQUNKLFNBQVMsZ0JBQWdCLENBQUksRUFBWSxFQUFFLElBQU87SUFDL0MsT0FBTyxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQztBQUMzQixDQUFDO0FBR0QsU0FBZ0IsS0FBSyxDQUFDLFFBQWdCO0lBQ3BDLHlFQUF5RTtJQUV6RSxNQUFNLElBQUksR0FBRyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRTVDLE1BQU0sSUFBSSxHQUFHLFNBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQzVCLHFCQUFTLENBQUMscUJBQWMsQ0FBQyxFQUN6Qiw0QkFBUyxDQUEwQixjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUN6RixlQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDVixJQUFJLEtBQUssQ0FBQyxNQUFNO1lBQ2IsS0FBZ0MsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2xHLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBK0IsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxFQUNGLCtCQUFZLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUNoRSxpQkFBSyxFQUFFLENBQ1IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNkLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQWxCRCxzQkFrQkMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IFBhcnNlR3JhbW1hciwgUGFyc2VMZXgsIFRva2VuLFxuICBtYXBDaHVua3MsIG1hcENodW5rc09icywgTG9va0FoZWFkT2JzZXJ2YWJsZSB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvYXN5bmMtTExuLXBhcnNlcic7XG5pbXBvcnQge3F1ZXVlU2NoZWR1bGVyLCBmcm9tLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge29ic2VydmVPbiwgbWFwLCBzaGFyZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQHdmaC9hc3NldHMtcHJvY2Vzc2VyLnJmYzgyMi1wYXJzZXInKTtcblxuZXhwb3J0IGVudW0gUkNGODIyVG9rZW5UeXBlIHtcbiAgQ1JMRixcbiAgJzonLFxuICAnOycsXG4gIHF1b3RlU3RyLFxuICBBVE9NLFxuICBCT1VOREFSWSxcbiAgUEFSVF9CT0RZLFxuICBET1VCTEVfREFTSFxufVxuXG5pbnRlcmZhY2UgUGFydEJvZHlUb2tlbiBleHRlbmRzIFRva2VuPFJDRjgyMlRva2VuVHlwZT4ge1xuICBkYXRhOiBCdWZmZXI7XG59XG5cbmNvbnN0IENSID0gJ1xccicuY2hhckNvZGVBdCgwKTtcbmNvbnN0IExGID0gJ1xcbicuY2hhckNvZGVBdCgwKTtcbmNvbnN0IEJBQ0tfU0xBU0ggPSAnXFxcXCcuY2hhckNvZGVBdCgwKTtcbmNvbnN0IFFVT1RFX01BUksxID0gJ1wiJy5jaGFyQ29kZUF0KDApO1xuY29uc3QgUVVPVEVfTUFSSzIgPSAnXFwnJy5jaGFyQ29kZUF0KDApO1xuY29uc3QgQ09MT05fTUFSSyA9ICc6Jy5jaGFyQ29kZUF0KDApO1xuY29uc3QgU0VNSV9DT0wgPSAnOycuY2hhckNvZGVBdCgwKTtcbmNvbnN0IFdTID0gJyAnLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBUQUIgPSAnXFx0Jy5jaGFyQ29kZUF0KDApO1xuY29uc3QgREFTSCA9ICctJy5jaGFyQ29kZUF0KDApO1xuLy8gY29uc3QgREFTSCA9ICctJy5jaGFyQ29kZUF0KDApO1xuXG5jb25zdCBURU1QX0RJUiA9ICdkaXN0L2Fzc2V0cy1wcm9jZXNzZXIvcmZjODIyJztcbmV4cG9ydCBpbnRlcmZhY2UgUkNGODIyUGFyc2VSZXN1bHQge1xuICBoZWFkZXJzOiBSQ0Y4MjJIZWFkZXJUeXBlW107XG4gIHBhcnRzOiB7XG4gICAgaGVhZGVyczogUkNGODIySGVhZGVyVHlwZVtdO1xuICAgIGJvZHk/OiBCdWZmZXI7XG4gICAgZmlsZT86IHN0cmluZztcbiAgfVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJDRjgyMkhlYWRlclR5cGUge1xuICBrZXk6IHN0cmluZztcbiAgdmFsdWU6IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBSZmNQYXJzZXJDb250ZXh0IHtcbiAgcHJpdmF0ZSBib3VuZGFyeTogbnVtYmVyW10gfCB1bmRlZmluZWQ7XG5cbiAgcHJpdmF0ZSBtdWx0aXBhcnRTdGFydGVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBvcmlnQnVmZmVyOiBVaW50OEFycmF5KSB7XG4gIH1cblxuXG5cbiAgcGFyc2VMZXhlcjogUGFyc2VMZXg8bnVtYmVyLCBSQ0Y4MjJUb2tlblR5cGU+ID0gYXN5bmMgKGxhKSA9PiB7XG4gICAgbGV0IGNockNvZGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgIHdoaWxlIChjaHJDb2RlICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IGNociA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyQ29kZSk7XG4gICAgICBpZiAodGhpcy5tdWx0aXBhcnRTdGFydGVkICYmIGF3YWl0IGxhLmlzTmV4dChDUiwgTEYsIENSLCBMRikpIHtcbiAgICAgICAgLy8gcGFydCBoZWFkZXIgbXVzdCBiZSBvdmVyXG4gICAgICAgIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKDIpO1xuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcblxuICAgICAgICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5DUkxGKTtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTtcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucGFyc2VQYXJ0Qm9keVRva2VuKGxhKTtcblxuICAgICAgfSBlbHNlIGlmICh0aGlzLm11bHRpcGFydFN0YXJ0ZWQgJiYgYXdhaXQgbGEuaXNOZXh0KERBU0gsIERBU0gpKSB7XG4gICAgICAgIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlLkRPVUJMRV9EQVNIKTtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTsgLy8gZW5kIG9mIHdob2xlIG1lc3NhZ2VcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmJvdW5kYXJ5ICYmIGF3YWl0IGxhLmlzTmV4dCguLi50aGlzLmJvdW5kYXJ5KSkge1xuICAgICAgICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5CT1VOREFSWSk7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UodGhpcy5ib3VuZGFyeS5sZW5ndGgpO1xuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcbiAgICAgICAgdGhpcy5tdWx0aXBhcnRTdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ211bHRpcGFydFN0YXJ0ZWQgdHJ1ZScpO1xuICAgICAgfSBlbHNlIGlmIChhd2FpdCBsYS5pc05leHQoQ1IsIExGKSkge1xuICAgICAgICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5DUkxGKTtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTtcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICB9IGVsc2UgaWYgKChhd2FpdCBsYS5sYSgpKSA9PT0gTEYpIHtcbiAgICAgICAgbGEuc3RhcnRUb2tlbihSQ0Y4MjJUb2tlblR5cGUuQ1JMRik7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICB9IGVsc2UgaWYgKGNociA9PT0gJzonIHx8IGNociA9PT0gJzsnKSB7XG4gICAgICAgIGxhLnN0YXJ0VG9rZW4oUkNGODIyVG9rZW5UeXBlW2Nocl0pO1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgIGxhLmVtaXRUb2tlbigpO1xuICAgICAgICBhd2FpdCBza2lwV2hpdGVTcGFjZShsYSk7XG4gICAgICB9IGVsc2UgaWYgKC9cXHMvLnRlc3QoY2hyKSkge1xuICAgICAgICBhd2FpdCBza2lwV2hpdGVTcGFjZShsYSk7XG4gICAgICB9IGVsc2UgaWYgKGNociA9PT0gJ1wiJyB8fCBjaHIgPT09ICdcXCcnKSB7XG4gICAgICAgIGF3YWl0IHF1b3RlU3RyKGxhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGNvbnN1bWVBdG9tKGxhKTtcbiAgICAgIH1cbiAgICAgIGNockNvZGUgPSBhd2FpdCBsYS5sYSgpO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlR3JhbW1hcjogUGFyc2VHcmFtbWFyPFJDRjgyMlBhcnNlUmVzdWx0LCBSQ0Y4MjJUb2tlblR5cGU+ID0gYXN5bmMgKGxhKSA9PiB7XG4gICAgbGV0IHJlc3VsdDogUkNGODIyUGFyc2VSZXN1bHQgPSB7XG4gICAgICBoZWFkZXJzOiBhd2FpdCB0aGlzLnBhcnNlSGVhZGVycyhsYSksXG4gICAgICBwYXJ0czogW11cbiAgICB9O1xuXG4gICAgLy8gY29uc29sZS5sb2coJ2JvdW5kYXJ5OicsIFN0cmluZy5mcm9tQ2hhckNvZGUoLi4udGhpcy5ib3VuZGFyeSEpKTtcblxuICAgIGxldCB0ayA9IGF3YWl0IGxhLmxhKCk7XG4gICAgd2hpbGUgKHRrICE9IG51bGwpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCd0azonLCB0ay50ZXh0KTtcbiAgICAgIGF3YWl0IGxhLmFzc2VydEFkdmFuY2VXaXRoKFtSQ0Y4MjJUb2tlblR5cGUuQk9VTkRBUlldLCBjb21wYXJlVG9rZW5UeXBlKTtcbiAgICAgIGlmICgoYXdhaXQgbGEubGEoKSkhLnR5cGUgPT09IFJDRjgyMlRva2VuVHlwZS5ET1VCTEVfREFTSCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcnRIZWFkZXJzID0gYXdhaXQgdGhpcy5wYXJzZUhlYWRlcnMobGEpO1xuICAgICAgY29uc3QgcGFydEJvZHkgPSBhd2FpdCBsYS5hZHZhbmNlKCkgYXMgUGFydEJvZHlUb2tlbjtcbiAgICAgIGF3YWl0IGxhLmFzc2VydEFkdmFuY2VXaXRoKFtSQ0Y4MjJUb2tlblR5cGUuQ1JMRl0sIGNvbXBhcmVUb2tlblR5cGUpO1xuXG4gICAgICB0aGlzLm9uUGFyc2VFYWNoUGFydChyZXN1bHQsIHBhcnRIZWFkZXJzLCBwYXJ0Qm9keSk7XG4gICAgICAvLyBjb25zb2xlLmxvZygncmZjIHRva2VuOiAnICsgUkNGODIyVG9rZW5UeXBlWyhhd2FpdCBsYS5hZHZhbmNlKCkpLnR5cGVdKTtcbiAgICAgIHRrID0gYXdhaXQgbGEubGEoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBSQ0Y4MjJQYXJzZVJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgb25QYXJzZUVhY2hQYXJ0KHJlc3VsdDogUkNGODIyUGFyc2VSZXN1bHQsXG4gICAgcGFydEhlYWRlcnM6IFJDRjgyMlBhcnNlUmVzdWx0WydoZWFkZXJzJ10sXG4gICAgcGFydEJvZHk6IFBhcnRCb2R5VG9rZW4pIHtcbiAgICBjb25zdCBlbmNvZGluZ0hlYWRlciA9IHBhcnRIZWFkZXJzLmZpbmQoaGVhZGVyID0+IGhlYWRlci5rZXkgPT09ICdDb250ZW50LVRyYW5zZmVyLUVuY29kaW5nJyk7XG4gICAgY29uc3QgaXNCYXNlNjQgPSBlbmNvZGluZ0hlYWRlciAmJiBlbmNvZGluZ0hlYWRlci52YWx1ZVswXSA9PT0gJ2Jhc2U2NCc7XG5cbiAgICBpZiAoaXNCYXNlNjQpIHtcbiAgICAgIHBhcnRCb2R5LmRhdGEgPSBCdWZmZXIuZnJvbShwYXJ0Qm9keS5kYXRhLnRvU3RyaW5nKCksICdiYXNlNjQnKTtcbiAgICB9XG4gICAgY29uc3QgYXR0YWNobWVudEhlYWRlciA9IHBhcnRIZWFkZXJzLmZpbmQoaGVhZGVyID0+IGhlYWRlci5rZXkgPT09ICdDb250ZW50LURpc3Bvc2l0aW9uJyk7XG4gICAgbGV0IGF0dGFjaG1lbnROYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAoYXR0YWNobWVudEhlYWRlciAmJiBhdHRhY2htZW50SGVhZGVyLnZhbHVlWzBdID09PSAnYXR0YWNobWVudCcpIHtcbiAgICAgIGNvbnN0IG0gPSAvXihbXj1dKik9W1wiXT8oW15cIl0qKVtcIl0/JC8uZXhlYyhhdHRhY2htZW50SGVhZGVyLnZhbHVlWzFdKTtcbiAgICAgIGlmIChtICYmIG1bMV0gPT09ICdmaWxlbmFtZScpIHtcbiAgICAgICAgYXR0YWNobWVudE5hbWUgPSBQYXRoLnJlc29sdmUoVEVNUF9ESVIsIG1bMl0pO1xuICAgICAgICBmcy5ta2RpcnBTeW5jKFRFTVBfRElSKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhhdHRhY2htZW50TmFtZSwgcGFydEJvZHkuZGF0YSk7XG4gICAgICAgIGxvZy5pbmZvKGF0dGFjaG1lbnROYW1lICsgJyBpcyB3cml0dGVuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmVzdWx0LnBhcnRzLnB1c2goe1xuICAgICAgaGVhZGVyczogcGFydEhlYWRlcnMsXG4gICAgICBib2R5OiBhdHRhY2htZW50TmFtZSA/IHVuZGVmaW5lZCA6IHBhcnRCb2R5LmRhdGEsXG4gICAgICBmaWxlOiBhdHRhY2htZW50TmFtZSA/IGF0dGFjaG1lbnROYW1lIDogdW5kZWZpbmVkXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNldEJvdW5kYXJ5KHN0cjogc3RyaW5nKSB7XG4gICAgY29uc3QgY2hyczogbnVtYmVyW10gPSBuZXcgQXJyYXkoc3RyLmxlbmd0aCk7XG5cbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHN0ci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNocnNbaV0gPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICB9XG4gICAgdGhpcy5ib3VuZGFyeSA9IGNocnM7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHBhcnNlSGVhZGVycyhsYTogUGFyYW1ldGVyczxSZmNQYXJzZXJDb250ZXh0WydwYXJzZUdyYW1tYXInXT5bMF0pIHtcbiAgICBjb25zdCBoZWFkZXJzOiB7a2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmdbXX1bXSA9IFtdO1xuICAgIGxldCBuZXh0VGsgPSBhd2FpdCBsYS5sYSgpO1xuXG4gICAgd2hpbGUgKG5leHRUayAhPSBudWxsKSB7XG4gICAgICBpZiAobmV4dFRrLnR5cGUgPT09IFJDRjgyMlRva2VuVHlwZS5BVE9NICYmIChhd2FpdCBsYS5sYSgyKSkgJiYgKGF3YWl0IGxhLmxhKDIpKSEudHlwZSA9PT0gUkNGODIyVG9rZW5UeXBlWyc6J10pIHtcbiAgICAgICAgY29uc3Qga2V5ID0gbmV4dFRrLnRleHQ7XG5cbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTtcbiAgICAgICAgbmV4dFRrID0gYXdhaXQgbGEubGEoKTtcblxuICAgICAgICBsZXQgdmFsdWUgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgY29uc3QgaGVhZGVyID0ge2tleSwgdmFsdWV9O1xuICAgICAgICBoZWFkZXJzLnB1c2goaGVhZGVyKTtcbiAgICAgICAgbGV0IGxhc3RWYWx1ZUl0ZW0gPSAnJztcbiAgICAgICAgd2hpbGUgKG5leHRUayAhPSBudWxsICYmIG5leHRUay50eXBlICE9PSBSQ0Y4MjJUb2tlblR5cGUuQ1JMRikge1xuICAgICAgICAgIGlmIChuZXh0VGsudHlwZSA9PT0gUkNGODIyVG9rZW5UeXBlWyc7J10pIHtcbiAgICAgICAgICAgIHZhbHVlLnB1c2gobGFzdFZhbHVlSXRlbSk7XG4gICAgICAgICAgICBsYXN0VmFsdWVJdGVtID0gJyc7XG4gICAgICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICAgICAgICBuZXh0VGsgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RWYWx1ZUl0ZW0gKz0gKGF3YWl0IGxhLmFkdmFuY2UoKSkudGV4dDtcbiAgICAgICAgICBuZXh0VGsgPSBhd2FpdCBsYS5sYSgpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlLnB1c2gobGFzdFZhbHVlSXRlbSk7XG4gICAgICAgIGlmIChrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2NvbnRlbnQtdHlwZScgJiYgdmFsdWVbMF0gPT09ICdtdWx0aXBhcnQvbWl4ZWQnKSB7XG4gICAgICAgICAgbGV0IGJvdW5kYXJ5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgZm9yIChjb25zdCB2YWx1ZUl0ZW0gb2YgdmFsdWUuc2xpY2UoMSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPSAvXihbXj1dKik9W1wiXT8oW15cIl0qKVtcIl0/JC8uZXhlYyh2YWx1ZUl0ZW0pO1xuICAgICAgICAgICAgaWYgKG0gJiYgbVsxXSA9PT0gJ2JvdW5kYXJ5Jykge1xuICAgICAgICAgICAgICBib3VuZGFyeSA9IG1bMl07XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYm91bmRhcnkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0Qm91bmRhcnkoJy0tJyArIGJvdW5kYXJ5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIGlmIChhd2FpdCBsYS5pc05leHRXaXRoPFJDRjgyMlRva2VuVHlwZT4oW1JDRjgyMlRva2VuVHlwZS5DUkxGLCBSQ0Y4MjJUb2tlblR5cGUuQ1JMRl0sIGNvbXBhcmVUb2tlblR5cGUpKSB7XG4gICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoMik7XG4gICAgICAgIGxldCBuZXh0ID0gYXdhaXQgbGEubGEoKTtcbiAgICAgICAgd2hpbGUgKG5leHQgJiYgbmV4dC50eXBlID09PSBSQ0Y4MjJUb2tlblR5cGUuQ1JMRikge1xuICAgICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICAgICAgICBuZXh0ID0gYXdhaXQgbGEubGEoKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAoYXdhaXQgbGEuaXNOZXh0V2l0aChbUkNGODIyVG9rZW5UeXBlLkNSTEZdLCBjb21wYXJlVG9rZW5UeXBlKSkge1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYS50aHJvd0Vycm9yKChhd2FpdCBsYS5hZHZhbmNlKCkpLnRleHQpO1xuICAgICAgICAvLyBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICB9XG4gICAgICBuZXh0VGsgPSBhd2FpdCBsYS5sYSgpO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0b2tlbnM6IFBBUlRfQk9EWSBDUkxGIEJPVU5EQVJZXG4gICAqIEBwYXJhbSBsYSBcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcGFyc2VQYXJ0Qm9keVRva2VuKGxhOiBMb29rQWhlYWRPYnNlcnZhYmxlPG51bWJlciwgUkNGODIyVG9rZW5UeXBlPikge1xuICAgIGNvbnN0IHRrID0gbGEuc3RhcnRUb2tlbihSQ0Y4MjJUb2tlblR5cGUuUEFSVF9CT0RZKTtcbiAgICB0ay50cmFja1ZhbHVlID0gZmFsc2U7XG4gICAgY29uc3Qgb3JpZ0J1ZmZlck9mZnNldCA9IGxhLnBvc2l0aW9uO1xuXG4gICAgd2hpbGUgKChhd2FpdCBsYS5sYSgpKSAhPSBudWxsKSB7XG5cbiAgICAgIGlmIChhd2FpdCBsYS5pc05leHQoQ1IsIExGLCAuLi50aGlzLmJvdW5kYXJ5ISkpIHtcbiAgICAgICAgKHRrIGFzIHVua25vd24gYXMgUGFydEJvZHlUb2tlbikuZGF0YSA9IEJ1ZmZlci5mcm9tKHRoaXMub3JpZ0J1ZmZlciwgb3JpZ0J1ZmZlck9mZnNldCwgbGEucG9zaXRpb24gLSBvcmlnQnVmZmVyT2Zmc2V0KTtcblxuICAgICAgICBsYS5lbWl0VG9rZW4oKTtcblxuICAgICAgICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5DUkxGKTtcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTtcbiAgICAgICAgbGEuZW1pdFRva2VuKCk7XG5cbiAgICAgICAgbGEuc3RhcnRUb2tlbihSQ0Y4MjJUb2tlblR5cGUuQk9VTkRBUlkpO1xuICAgICAgICBhd2FpdCBsYS5hZHZhbmNlKHRoaXMuYm91bmRhcnkhLmxlbmd0aCk7XG4gICAgICAgIGxhLmVtaXRUb2tlbigpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICB9XG4gIH1cblxufVxuXG5hc3luYyBmdW5jdGlvbiBxdW90ZVN0cihsYTogTG9va0FoZWFkT2JzZXJ2YWJsZTxudW1iZXIsIFJDRjgyMlRva2VuVHlwZT4pIHtcbiAgbGEuc3RhcnRUb2tlbihSQ0Y4MjJUb2tlblR5cGUucXVvdGVTdHIpO1xuICBjb25zdCBvcGVuQ2hhciA9IGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBuZXh0ID0gYXdhaXQgbGEubGEoKTtcbiAgICBpZiAobmV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbGEudGhyb3dFcnJvcigpO1xuICAgIH1cbiAgICBpZiAobmV4dCA9PT0gQkFDS19TTEFTSCkge1xuICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTtcbiAgICB9IGVsc2UgaWYgKG5leHQgPT09IG9wZW5DaGFyKSB7XG4gICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICBsYS5lbWl0VG9rZW4oKTtcbiAgICAgIGJyZWFrO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNraXBXaGl0ZVNwYWNlKGxhOiBMb29rQWhlYWRPYnNlcnZhYmxlPG51bWJlciwgUkNGODIyVG9rZW5UeXBlPikge1xuICBkbyB7XG4gICAgY29uc3QgY29kZSA9IGF3YWl0IGxhLmxhKCk7XG4gICAgaWYgKGNvZGUgPT0gbnVsbCkgcmV0dXJuO1xuICAgIGlmICgvXFxzLy50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkpKSB7XG4gICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSB3aGlsZSAodHJ1ZSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvbnN1bWVBdG9tKGxhOiBMb29rQWhlYWRPYnNlcnZhYmxlPG51bWJlciwgUkNGODIyVG9rZW5UeXBlPikge1xuICBsYS5zdGFydFRva2VuKFJDRjgyMlRva2VuVHlwZS5BVE9NKTtcbiAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICBsZXQgY29kZSA9IGF3YWl0IGxhLmxhKCk7XG4gIGxldCBlbWl0ID0gZmFsc2U7XG4gIHdoaWxlIChjb2RlICE9IG51bGwpIHtcbiAgICBzd2l0Y2ggKGNvZGUpIHtcbiAgICAgIGNhc2UgQ09MT05fTUFSSzpcbiAgICAgIGNhc2UgU0VNSV9DT0w6XG4gICAgICBjYXNlIFFVT1RFX01BUksxOlxuICAgICAgY2FzZSBRVU9URV9NQVJLMjpcbiAgICAgICAgZW1pdCA9IHRydWU7XG4gICAgICAgIGxhLmVtaXRUb2tlbigpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQ1I6XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKChhd2FpdCBsYS5sYSgpKSwgKGF3YWl0IGxhLmxhKDIpKSwgKGF3YWl0IGxhLmxhKDMpKSk7XG4gICAgICAgIGlmICghKGF3YWl0IGxhLmlzTmV4dChDUiwgTEYsIFdTKSkgJiYgIShhd2FpdCBsYS5pc05leHQoQ1IsIFdTKSkgJiZcbiAgICAgICAgICAhKGF3YWl0IGxhLmlzTmV4dChDUiwgTEYsIFRBQikpICYmICEoYXdhaXQgbGEuaXNOZXh0KENSLCBUQUIpKSkge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdlbWl0OiAnLCAoYXdhaXQgbGEubGEoKSksIChhd2FpdCBsYS5sYSgyKSksIChhd2FpdCBsYS5sYSgzKSkpO1xuICAgICAgICAgIGVtaXQgPSB0cnVlO1xuICAgICAgICAgIGxhLmVtaXRUb2tlbigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGxhLmFkdmFuY2UoMyk7XG4gICAgICAgICAgY29kZSA9IGF3YWl0IGxhLmxhKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIGNhc2UgTEY6XG4gICAgICAgIGlmICghIGF3YWl0IGxhLmlzTmV4dChMRiwgV1MpICYmICEgYXdhaXQgbGEuaXNOZXh0KExGLCBUQUIpKSB7XG4gICAgICAgICAgZW1pdCA9IHRydWU7XG4gICAgICAgICAgbGEuZW1pdFRva2VuKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgyKTtcbiAgICAgICAgICBjb2RlID0gYXdhaXQgbGEubGEoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgICBjb2RlID0gYXdhaXQgbGEubGEoKTtcbiAgICB9XG4gICAgaWYgKGVtaXQpIGJyZWFrO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHBhcnNlTXVsdGlwYXJ0KGxhOiBQYXJhbWV0ZXJzPHR5cGVvZiBwYXJzZUdyYW1tYXI+WzBdKSB7XG4vLyAgIHdoaWxlIChhd2FpdCBsYS5pc05leHQoREFTSCwgREFTSCkpXG4vLyB9XG5mdW5jdGlvbiBjb21wYXJlVG9rZW5UeXBlPFQ+KHRrOiBUb2tlbjxUPiwgdHlwZTogVCkge1xuICAgcmV0dXJuIHRrLnR5cGUgPT09IHR5cGU7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHJlYWRhYmxlOiBCdWZmZXIpIHtcbiAgLy8gZnMud3JpdGVGaWxlU3luYygnZW1haWwtdGVtcC50eHQnLCByZWFkYWJsZS50b1N0cmluZygndXRmOCcpLCAndXRmOCcpO1xuXG4gIGNvbnN0IHBjdHggPSBuZXcgUmZjUGFyc2VyQ29udGV4dChyZWFkYWJsZSk7XG5cbiAgY29uc3QgZG9uZSA9IG9mKHJlYWRhYmxlKS5waXBlKFxuICAgIG9ic2VydmVPbihxdWV1ZVNjaGVkdWxlciksXG4gICAgbWFwQ2h1bmtzPG51bWJlciwgUkNGODIyVG9rZW5UeXBlPignUkNGODIyLWxleGVyJywgKGxhLCBzdWIpID0+IHBjdHgucGFyc2VMZXhlcihsYSwgc3ViKSksXG4gICAgbWFwKGNodW5rID0+IHtcbiAgICAgIGlmIChjaHVuay52YWx1ZXMpXG4gICAgICAgIChjaHVuayBhcyBUb2tlbjxSQ0Y4MjJUb2tlblR5cGU+KS50ZXh0ID0gQnVmZmVyLmZyb20oVWludDhBcnJheS5mcm9tKGNodW5rLnZhbHVlcyEpKS50b1N0cmluZygpO1xuICAgICAgZGVsZXRlIGNodW5rLnZhbHVlcztcbiAgICAgIHJldHVybiBbY2h1bmsgYXMgVG9rZW48UkNGODIyVG9rZW5UeXBlPl07XG4gICAgfSksXG4gICAgbWFwQ2h1bmtzT2JzKCdSQ0Y4MjItcGFyc2VyJywgbGEgPT4gZnJvbShwY3R4LnBhcnNlR3JhbW1hcihsYSkpKSxcbiAgICBzaGFyZSgpXG4gICkudG9Qcm9taXNlKCk7XG4gIHJldHVybiBkb25lO1xufVxuIl19