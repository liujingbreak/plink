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
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectImap = exports.parseLinesOfTokens = exports.createServerDataHandler = exports.ImapTokenType = void 0;
const async_LLn_parser_1 = require("@wfh/plink/wfh/dist/async-LLn-parser");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const tls_1 = require("tls");
// import fs from 'fs';
// let fileWritingIdx = 1;
// import {Subscriber} from 'rxjs';
var ImapTokenType;
(function (ImapTokenType) {
    ImapTokenType[ImapTokenType["number"] = 1] = "number";
    ImapTokenType[ImapTokenType["stringLit"] = 2] = "stringLit";
    ImapTokenType[ImapTokenType["stringQuote"] = 3] = "stringQuote";
    ImapTokenType[ImapTokenType["("] = 4] = "(";
    ImapTokenType[ImapTokenType[")"] = 5] = ")";
    ImapTokenType[ImapTokenType["atom"] = 6] = "atom";
    ImapTokenType[ImapTokenType["CRLF"] = 7] = "CRLF";
    // nil
})(ImapTokenType = exports.ImapTokenType || (exports.ImapTokenType = {}));
const R_BRACE = '}'.charCodeAt(0);
const CR = '\r'.charCodeAt(0);
const LF = '\n'.charCodeAt(0);
const parseLex = function (reply, sub) {
    return __awaiter(this, void 0, void 0, function* () {
        // const origWrite = reply._writeAndResolve;
        // reply._writeAndResolve = function(bytes) {
        //   fs.writeFileSync('imap-msg-parser.parseLex.log.txt', Buffer.from(Array.from(bytes)).toString('utf8'), {flag: 'a'});
        //   origWrite.apply(this, arguments);
        // };
        let nextByte = yield reply.la();
        while (nextByte != null) {
            const next = String.fromCharCode(nextByte);
            if (' ' === next) {
                yield reply.advance();
                // skip space char
            }
            else if (/[0-9]/.test(next)) {
                reply.startToken(ImapTokenType.number);
                yield reply.advance();
                nextByte = yield reply.la();
                while (nextByte != null && /[0-9.]/.test(String.fromCharCode(nextByte))) {
                    yield reply.advance();
                    nextByte = yield reply.la();
                }
                reply.emitToken();
            }
            else if ('\r' === next) {
                reply.startToken(ImapTokenType.CRLF);
                yield reply.advance();
                const b = yield reply.la();
                if (b != null && String.fromCharCode(b) === '\n')
                    yield reply.advance();
                reply.emitToken();
            }
            else if ('\n' === next) {
                reply.startToken(ImapTokenType.CRLF);
                yield reply.advance();
                reply.emitToken();
            }
            else if ('"' === next) {
                reply.startToken(ImapTokenType.stringQuote);
                const openChar = yield reply.advance();
                while (true) {
                    const la = yield reply.la();
                    if (la == null) {
                        return reply.throwError();
                    }
                    if (String.fromCharCode(la) === '\\') {
                        yield reply.advance(2);
                    }
                    else if (la === openChar) {
                        yield reply.advance();
                        reply.emitToken();
                        break;
                    }
                    else {
                        yield reply.advance();
                    }
                }
            }
            else if ('{' === next) {
                const next2 = yield reply.la(2);
                if (next2 != null && /\d/.test(String.fromCharCode(next2))) {
                    yield parseLiteralString(reply);
                }
                else {
                    yield parseAtom(reply);
                }
            }
            else if ('(' === next || ')' === next) {
                reply.startToken(ImapTokenType[next]);
                yield reply.advance();
                reply.emitToken();
            }
            else {
                yield parseAtom(reply);
            }
            nextByte = yield reply.la();
        }
    });
};
function parseAtom(la) {
    return __awaiter(this, void 0, void 0, function* () {
        la.startToken(ImapTokenType.atom);
        yield la.advance();
        let nextByte = yield la.la();
        while (nextByte != null && /[^\s{[()"]/.test(String.fromCharCode(nextByte))) {
            yield la.advance();
            nextByte = yield la.la();
        }
        la.emitToken();
    });
}
function parseLiteralString(reply) {
    return __awaiter(this, void 0, void 0, function* () {
        const chunk = reply.startToken(ImapTokenType.stringLit, false);
        yield reply.advance();
        let numStr = String.fromCharCode(yield reply.advance());
        let next = yield reply.la();
        while (next && next !== R_BRACE) {
            numStr += String.fromCharCode(next);
            yield reply.advance();
            next = yield reply.la();
        }
        yield reply.advance();
        next = yield reply.la();
        if (next == null)
            return reply.throwError();
        while (next === CR || next === LF) {
            yield reply.advance();
            next = yield reply.la();
        }
        const numByte = parseInt(numStr, 10);
        const buf = Buffer.alloc(numByte);
        let i = 0;
        // console.time('stringlit');
        while (i < numByte) {
            next = yield reply.la();
            if (next == null) {
                return reply.throwError();
            }
            const char = yield reply.advance();
            buf.writeUInt8(char, i);
            i++;
        }
        // console.timeEnd('stringlit');
        chunk.data = buf;
        reply.emitToken();
    });
}
function parseLine(la) {
    return __awaiter(this, void 0, void 0, function* () {
        let buf;
        let word = yield la.la();
        while (true) {
            if (word == null) {
                return;
            }
            if (buf == null)
                buf = [];
            if (word.type === ImapTokenType.CRLF) {
                yield la.advance();
                return buf;
            }
            buf.push(word);
            yield la.advance();
            word = yield la.la();
        }
    });
}
function parseLines(lineSubject, la) {
    return __awaiter(this, void 0, void 0, function* () {
        let line;
        do {
            line = yield parseLine(la);
            if (line == null) {
                lineSubject.complete();
                break;
            }
            lineSubject.next(line);
        } while (true);
    });
}
function createServerDataHandler() {
    const input = new rxjs_1.Subject();
    const parseServerReply = (la) => __awaiter(this, void 0, void 0, function* () {
        const lineSubject = new rxjs_1.Subject();
        parseLines(lineSubject, la);
        return lineSubject;
    });
    // parser('IMAP', input, parseLex, null, parseServerReply);
    const name = 'IMAP';
    const output = input.pipe((0, operators_1.observeOn)(rxjs_1.queueScheduler), (0, operators_1.takeWhile)(data => data != null), 
    // tap(data => fs.writeFileSync('imap-msg-parser-log.txt', data.toString('utf8'), {flag: 'a'})),
    (0, async_LLn_parser_1.mapChunks)(name + '-lexer', parseLex), (0, operators_1.map)(chunk => {
        const buf = Buffer.from(Uint8Array.from(chunk.values));
        chunk.text = buf.toString('utf8');
        delete chunk.values;
        return chunk;
    }), (0, operators_1.map)(token => [token]), (0, async_LLn_parser_1.mapChunksObs)(name + '-parser', (la) => (0, rxjs_1.from)(parseServerReply(la))), (0, operators_1.concatMap)(lines => lines), (0, operators_1.share)());
    return {
        input: (data) => input.next(data),
        output
    };
}
exports.createServerDataHandler = createServerDataHandler;
/**
 *
 * @param lines createServerDataHandler().output
 * @param parseLine return null/undefined to continue to wait for next line, or it will stop waiting for next line.
 */
function parseLinesOfTokens(lines, parseLine) {
    return lines.pipe((0, operators_1.concatMap)(line => {
        const la = new async_LLn_parser_1.LookAhead('imap reply line');
        la._write(line);
        la._final();
        return (0, rxjs_1.from)(parseLine(la));
    }), 
    // filter(res => res == null),
    (0, operators_1.takeWhile)(res => res == null, true), (0, operators_1.takeLast)(1)).toPromise();
}
exports.parseLinesOfTokens = parseLinesOfTokens;
function connectImap(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const handler = createServerDataHandler();
        let socket;
        try {
            socket = yield new Promise((resolve, reject) => {
                const socket = (0, tls_1.connect)({
                    host: address, port: 993,
                    enableTrace: true
                });
                socket.on('secureConnect', () => {
                    // eslint-disable-next-line no-console
                    console.log('connected', socket.authorized ? 'authorized' : 'unauthorized');
                    resolve(socket);
                })
                    .on('error', err => reject(err))
                    .on('timeout', () => reject(new Error('Timeout')));
                socket.on('data', (data) => handler.input(data));
            });
        }
        catch (ex) {
            if (socket)
                socket.end();
            throw ex;
        }
        yield new Promise(resolve => setTimeout(resolve, 3000));
        handler.input(null);
        socket.end();
    });
}
exports.connectImap = connectImap;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hcC1tc2ctcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW1hcC1tc2ctcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDJFQUF5SDtBQUN6SCwrQkFBaUU7QUFDakUsOENBQXFGO0FBQ3JGLDZCQUEwRTtBQUMxRSx1QkFBdUI7QUFFdkIsMEJBQTBCO0FBQzFCLG1DQUFtQztBQUVuQyxJQUFZLGFBU1g7QUFURCxXQUFZLGFBQWE7SUFDdkIscURBQVUsQ0FBQTtJQUNWLDJEQUFTLENBQUE7SUFDVCwrREFBVyxDQUFBO0lBQ1gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCxpREFBSSxDQUFBO0lBQ0osaURBQUksQ0FBQTtJQUNKLE1BQU07QUFDUixDQUFDLEVBVFcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFTeEI7QUFPRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU5QixNQUFNLFFBQVEsR0FBb0MsVUFBZSxLQUFLLEVBQUUsR0FBRzs7UUFDekUsNENBQTRDO1FBQzVDLDZDQUE2QztRQUM3Qyx3SEFBd0g7UUFDeEgsc0NBQXNDO1FBQ3RDLEtBQUs7UUFFTCxJQUFJLFFBQVEsR0FBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNqQyxPQUFPLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7Z0JBQ2hCLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0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RyxDQUFDLENBQUM7Z0JBRXhCLE1BQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtvQkFDOUIsc0NBQXNDO29CQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUM1RSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQztxQkFDRCxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUMvQixFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQyxDQUFDLENBQUM7U0FFSjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxNQUFNO2dCQUNSLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNmLE1BQU0sRUFBRSxDQUFDO1NBQ1Y7UUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztDQUFBO0FBNUJELGtDQTRCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBhcnNlR3JhbW1hciwgUGFyc2VMZXgsIFRva2VuLCBMb29rQWhlYWQsIG1hcENodW5rcywgbWFwQ2h1bmtzT2JzIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7IFN1YmplY3QsIE9ic2VydmFibGUsIHF1ZXVlU2NoZWR1bGVyLCBmcm9tIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge29ic2VydmVPbiwgbWFwLCB0YWtlV2hpbGUsIGNvbmNhdE1hcCwgdGFrZUxhc3QsIHNoYXJlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBjb25uZWN0IGFzIHRzbENvbm5lY3QsIENvbm5lY3Rpb25PcHRpb25zLCBUTFNTb2NrZXQgfSBmcm9tICd0bHMnO1xuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuLy8gbGV0IGZpbGVXcml0aW5nSWR4ID0gMTtcbi8vIGltcG9ydCB7U3Vic2NyaWJlcn0gZnJvbSAncnhqcyc7XG5cbmV4cG9ydCBlbnVtIEltYXBUb2tlblR5cGUge1xuICBudW1iZXIgPSAxLFxuICBzdHJpbmdMaXQsXG4gIHN0cmluZ1F1b3RlLFxuICAnKCcsXG4gICcpJyxcbiAgYXRvbSwgLy8gQVRPTSBvciBOSUxcbiAgQ1JMRlxuICAvLyBuaWxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdHJpbmdMaXQgZXh0ZW5kcyBUb2tlbjxJbWFwVG9rZW5UeXBlLnN0cmluZ0xpdD4ge1xuICBkYXRhOiBCdWZmZXI7XG59XG5cblxuY29uc3QgUl9CUkFDRSA9ICd9Jy5jaGFyQ29kZUF0KDApO1xuY29uc3QgQ1IgPSAnXFxyJy5jaGFyQ29kZUF0KDApO1xuY29uc3QgTEYgPSAnXFxuJy5jaGFyQ29kZUF0KDApO1xuXG5jb25zdCBwYXJzZUxleDogUGFyc2VMZXg8bnVtYmVyLCBJbWFwVG9rZW5UeXBlPiA9IGFzeW5jIGZ1bmN0aW9uKHJlcGx5LCBzdWIpIHtcbiAgLy8gY29uc3Qgb3JpZ1dyaXRlID0gcmVwbHkuX3dyaXRlQW5kUmVzb2x2ZTtcbiAgLy8gcmVwbHkuX3dyaXRlQW5kUmVzb2x2ZSA9IGZ1bmN0aW9uKGJ5dGVzKSB7XG4gIC8vICAgZnMud3JpdGVGaWxlU3luYygnaW1hcC1tc2ctcGFyc2VyLnBhcnNlTGV4LmxvZy50eHQnLCBCdWZmZXIuZnJvbShBcnJheS5mcm9tKGJ5dGVzKSkudG9TdHJpbmcoJ3V0ZjgnKSwge2ZsYWc6ICdhJ30pO1xuICAvLyAgIG9yaWdXcml0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAvLyB9O1xuXG4gIGxldCBuZXh0Qnl0ZSA9ICBhd2FpdCByZXBseS5sYSgpO1xuICB3aGlsZSAobmV4dEJ5dGUgIT0gbnVsbCkge1xuICAgIGNvbnN0IG5leHQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHRCeXRlKTtcbiAgICBpZiAoJyAnID09PSBuZXh0KSB7XG4gICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICAvLyBza2lwIHNwYWNlIGNoYXJcbiAgICB9IGVsc2UgaWYgKC9bMC05XS8udGVzdChuZXh0KSkge1xuICAgICAgcmVwbHkuc3RhcnRUb2tlbihJbWFwVG9rZW5UeXBlLm51bWJlcik7XG4gICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICBuZXh0Qnl0ZSA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgICB3aGlsZSAobmV4dEJ5dGUgIT0gbnVsbCAmJiAvWzAtOS5dLy50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dEJ5dGUpKSkge1xuICAgICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICAgIG5leHRCeXRlID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgICAgIH1cbiAgICAgIHJlcGx5LmVtaXRUb2tlbigpO1xuICAgIH0gZWxzZSBpZiAoJ1xccicgPT09IG5leHQpIHtcbiAgICAgIHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5DUkxGKTtcbiAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIGNvbnN0IGIgPSBhd2FpdCByZXBseS5sYSgpO1xuICAgICAgaWYgKGIgIT0gbnVsbCAmJiBTdHJpbmcuZnJvbUNoYXJDb2RlKGIpID09PSAnXFxuJylcbiAgICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIGlmICgnXFxuJyA9PT0gbmV4dCkge1xuICAgICAgcmVwbHkuc3RhcnRUb2tlbihJbWFwVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIGlmICgnXCInID09PSBuZXh0KSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUuc3RyaW5nUXVvdGUpO1xuICAgICAgY29uc3Qgb3BlbkNoYXIgPSBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBjb25zdCBsYSA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgICAgIGlmIChsYSA9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlcGx5LnRocm93RXJyb3IoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoU3RyaW5nLmZyb21DaGFyQ29kZShsYSkgPT09ICdcXFxcJykge1xuICAgICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoMik7XG4gICAgICAgIH0gZWxzZSBpZiAobGEgPT09IG9wZW5DaGFyKSB7XG4gICAgICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgICAgIHJlcGx5LmVtaXRUb2tlbigpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoJ3snID09PSBuZXh0KSB7XG4gICAgICBjb25zdCBuZXh0MiA9IGF3YWl0IHJlcGx5LmxhKDIpO1xuICAgICAgaWYgKG5leHQyICE9IG51bGwgJiYgL1xcZC8udGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHQyKSkpIHtcbiAgICAgICAgYXdhaXQgcGFyc2VMaXRlcmFsU3RyaW5nKHJlcGx5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IHBhcnNlQXRvbShyZXBseSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgnKCcgPT09IG5leHQgfHwgJyknID09PSBuZXh0KSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGVbbmV4dF0pO1xuICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHBhcnNlQXRvbShyZXBseSk7XG4gICAgfVxuICAgIG5leHRCeXRlID0gIGF3YWl0IHJlcGx5LmxhKCk7XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlQXRvbShsYTogUGFyYW1ldGVyczxQYXJzZUxleDxudW1iZXIsIEltYXBUb2tlblR5cGU+PlswXSkge1xuICBsYS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUuYXRvbSk7XG4gIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgbGV0IG5leHRCeXRlID0gYXdhaXQgbGEubGEoKTtcbiAgd2hpbGUgKG5leHRCeXRlICE9IG51bGwgJiYgL1teXFxze1soKVwiXS8udGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKG5leHRCeXRlKSkpIHtcbiAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgbmV4dEJ5dGUgPSBhd2FpdCBsYS5sYSgpO1xuICB9XG4gIGxhLmVtaXRUb2tlbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUxpdGVyYWxTdHJpbmcocmVwbHk6IFBhcmFtZXRlcnM8UGFyc2VMZXg8bnVtYmVyLCBJbWFwVG9rZW5UeXBlPj5bMF0pIHtcbiAgY29uc3QgY2h1bmsgPSByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUuc3RyaW5nTGl0LCBmYWxzZSk7XG4gIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgbGV0IG51bVN0ciA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYXdhaXQgcmVwbHkuYWR2YW5jZSgpKTtcbiAgbGV0IG5leHQgPSBhd2FpdCByZXBseS5sYSgpO1xuICB3aGlsZSAobmV4dCAmJiBuZXh0ICE9PSBSX0JSQUNFKSB7XG4gICAgbnVtU3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dCk7XG4gICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgIG5leHQgPSBhd2FpdCByZXBseS5sYSgpO1xuICB9XG4gIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gIGlmIChuZXh0ID09IG51bGwpXG4gICAgcmV0dXJuIHJlcGx5LnRocm93RXJyb3IoKTtcbiAgd2hpbGUgKG5leHQgPT09IENSIHx8IG5leHQgPT09IExGKSB7XG4gICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgIG5leHQgPSBhd2FpdCByZXBseS5sYSgpO1xuICB9XG5cbiAgY29uc3QgbnVtQnl0ZSA9IHBhcnNlSW50KG51bVN0ciwgMTApO1xuICBjb25zdCBidWYgPSBCdWZmZXIuYWxsb2MobnVtQnl0ZSk7XG5cbiAgbGV0IGkgPSAwO1xuICAvLyBjb25zb2xlLnRpbWUoJ3N0cmluZ2xpdCcpO1xuICB3aGlsZSAoaSA8IG51bUJ5dGUpIHtcbiAgICBuZXh0ID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgICBpZiAobmV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHkudGhyb3dFcnJvcigpO1xuICAgIH1cbiAgICBjb25zdCBjaGFyID0gYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgIGJ1Zi53cml0ZVVJbnQ4KGNoYXIsIGkpO1xuICAgIGkrKztcbiAgfVxuICAvLyBjb25zb2xlLnRpbWVFbmQoJ3N0cmluZ2xpdCcpO1xuICAoY2h1bmsgYXMgU3RyaW5nTGl0KS5kYXRhID0gYnVmO1xuICByZXBseS5lbWl0VG9rZW4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VMaW5lKGxhOiBQYXJhbWV0ZXJzPCh0eXBlb2YgcGFyc2VMaW5lcyk+WzFdKTpcblByb21pc2U8VG9rZW48SW1hcFRva2VuVHlwZT5bXSB8IHVuZGVmaW5lZD4ge1xuICBsZXQgYnVmOiBUb2tlbjxJbWFwVG9rZW5UeXBlPltdIHwgdW5kZWZpbmVkO1xuICBsZXQgd29yZCA9IGF3YWl0IGxhLmxhKCk7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgaWYgKHdvcmQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoYnVmID09IG51bGwpIGJ1ZiA9IFtdO1xuICAgIGlmICh3b3JkLnR5cGUgPT09IEltYXBUb2tlblR5cGUuQ1JMRikge1xuICAgICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgICAgcmV0dXJuIGJ1ZjtcbiAgICB9XG4gICAgYnVmLnB1c2god29yZCk7XG4gICAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICAgIHdvcmQgPSBhd2FpdCBsYS5sYSgpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlTGluZXMobGluZVN1YmplY3Q6IFN1YmplY3Q8VG9rZW48SW1hcFRva2VuVHlwZT5bXT4sIGxhOiBMb29rQWhlYWQ8VG9rZW48SW1hcFRva2VuVHlwZT4sIGFueT4pIHtcbiAgbGV0IGxpbmU6IFRva2VuPEltYXBUb2tlblR5cGU+W10gfCB1bmRlZmluZWQ7XG4gIGRvIHtcbiAgICBsaW5lID0gYXdhaXQgcGFyc2VMaW5lKGxhKTtcbiAgICBpZiAobGluZSA9PSBudWxsKSB7XG4gICAgICBsaW5lU3ViamVjdC5jb21wbGV0ZSgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxpbmVTdWJqZWN0Lm5leHQobGluZSk7XG4gIH0gd2hpbGUgKHRydWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKToge2lucHV0OiAoYnVmOiBCdWZmZXIgfCBudWxsKSA9PnZvaWQsIG91dHB1dDogT2JzZXJ2YWJsZTxUb2tlbjxJbWFwVG9rZW5UeXBlPltdPn0ge1xuICBjb25zdCBpbnB1dCA9IG5ldyBTdWJqZWN0PEJ1ZmZlciB8IG51bGw+KCk7XG5cbiAgY29uc3QgcGFyc2VTZXJ2ZXJSZXBseTogUGFyc2VHcmFtbWFyPFN1YmplY3Q8VG9rZW48SW1hcFRva2VuVHlwZT5bXT4sIEltYXBUb2tlblR5cGU+ID0gYXN5bmMgKGxhKSA9PiB7XG4gICAgY29uc3QgbGluZVN1YmplY3QgPSBuZXcgU3ViamVjdDxUb2tlbjxJbWFwVG9rZW5UeXBlPltdPigpO1xuICAgIHBhcnNlTGluZXMobGluZVN1YmplY3QsIGxhKTtcbiAgICByZXR1cm4gbGluZVN1YmplY3Q7XG4gIH07XG5cbiAgLy8gcGFyc2VyKCdJTUFQJywgaW5wdXQsIHBhcnNlTGV4LCBudWxsLCBwYXJzZVNlcnZlclJlcGx5KTtcbiAgY29uc3QgbmFtZSA9ICdJTUFQJztcblxuICBjb25zdCBvdXRwdXQgPSBpbnB1dC5waXBlKFxuICAgIG9ic2VydmVPbihxdWV1ZVNjaGVkdWxlciksXG4gICAgdGFrZVdoaWxlPEJ1ZmZlcj4oZGF0YSA9PiBkYXRhICE9IG51bGwpLFxuICAgIC8vIHRhcChkYXRhID0+IGZzLndyaXRlRmlsZVN5bmMoJ2ltYXAtbXNnLXBhcnNlci1sb2cudHh0JywgZGF0YS50b1N0cmluZygndXRmOCcpLCB7ZmxhZzogJ2EnfSkpLFxuICAgIG1hcENodW5rcyhuYW1lICsgJy1sZXhlcicsIHBhcnNlTGV4KSxcbiAgICBtYXAoY2h1bmsgPT4ge1xuICAgICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oVWludDhBcnJheS5mcm9tKGNodW5rLnZhbHVlcyEpKTtcbiAgICAgIChjaHVuayBhcyBUb2tlbjxJbWFwVG9rZW5UeXBlPikudGV4dCA9IGJ1Zi50b1N0cmluZygndXRmOCcpO1xuICAgICAgZGVsZXRlIGNodW5rLnZhbHVlcztcbiAgICAgIHJldHVybiBjaHVuayBhcyBUb2tlbjxJbWFwVG9rZW5UeXBlPjtcbiAgICB9KSxcbiAgICBtYXAodG9rZW4gPT4gW3Rva2VuXSksXG4gICAgbWFwQ2h1bmtzT2JzKG5hbWUgKyAnLXBhcnNlcicsIChsYSkgPT4gZnJvbShwYXJzZVNlcnZlclJlcGx5KGxhKSkpLFxuICAgIGNvbmNhdE1hcChsaW5lcyA9PiBsaW5lcyksXG4gICAgc2hhcmUoKVxuICApO1xuXG4gIHJldHVybiB7XG4gICAgaW5wdXQ6IChkYXRhKSA9PiBpbnB1dC5uZXh0KGRhdGEpLFxuICAgIG91dHB1dFxuICB9O1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGxpbmVzIGNyZWF0ZVNlcnZlckRhdGFIYW5kbGVyKCkub3V0cHV0XG4gKiBAcGFyYW0gcGFyc2VMaW5lIHJldHVybiBudWxsL3VuZGVmaW5lZCB0byBjb250aW51ZSB0byB3YWl0IGZvciBuZXh0IGxpbmUsIG9yIGl0IHdpbGwgc3RvcCB3YWl0aW5nIGZvciBuZXh0IGxpbmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxpbmVzT2ZUb2tlbnMobGluZXM6IE9ic2VydmFibGU8VG9rZW48SW1hcFRva2VuVHlwZT5bXT4sXG4gIHBhcnNlTGluZTogKGxhOiBMb29rQWhlYWQ8VG9rZW48SW1hcFRva2VuVHlwZT4+KSA9PiBQcm9taXNlPGFueSB8IG51bGwgfCB2b2lkPikge1xuICByZXR1cm4gbGluZXMucGlwZShcbiAgICBjb25jYXRNYXAobGluZSA9PiB7XG4gICAgICBjb25zdCBsYSA9IG5ldyBMb29rQWhlYWQ8VG9rZW48SW1hcFRva2VuVHlwZT4+KCdpbWFwIHJlcGx5IGxpbmUnKTtcbiAgICAgIGxhLl93cml0ZShsaW5lKTtcbiAgICAgIGxhLl9maW5hbCgpO1xuICAgICAgcmV0dXJuIGZyb20ocGFyc2VMaW5lKGxhKSk7XG4gICAgfSksXG4gICAgLy8gZmlsdGVyKHJlcyA9PiByZXMgPT0gbnVsbCksXG4gICAgdGFrZVdoaWxlKHJlcyA9PiByZXMgPT0gbnVsbCwgdHJ1ZSksXG4gICAgdGFrZUxhc3QoMSlcbiAgKS50b1Byb21pc2UoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3RJbWFwKGFkZHJlc3M6IHN0cmluZykge1xuICBjb25zdCBoYW5kbGVyID0gY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKTtcbiAgbGV0IHNvY2tldDogVExTU29ja2V0fHVuZGVmaW5lZDtcbiAgdHJ5IHtcbiAgICBzb2NrZXQgPSBhd2FpdCBuZXcgUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiB0c2xDb25uZWN0Pj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc29ja2V0ID0gdHNsQ29ubmVjdCh7XG4gICAgICAgIGhvc3Q6IGFkZHJlc3MsIHBvcnQ6IDk5MyxcbiAgICAgICAgZW5hYmxlVHJhY2U6IHRydWVcbiAgICAgIH0gYXMgQ29ubmVjdGlvbk9wdGlvbnMpO1xuXG4gICAgICBzb2NrZXQub24oJ3NlY3VyZUNvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQnLCBzb2NrZXQuYXV0aG9yaXplZCA/ICdhdXRob3JpemVkJyA6ICd1bmF1dGhvcml6ZWQnKTtcbiAgICAgICAgcmVzb2x2ZShzb2NrZXQpO1xuICAgICAgfSlcbiAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpXG4gICAgICAub24oJ3RpbWVvdXQnLCAoKSA9PiByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpKTtcbiAgICAgIHNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IGhhbmRsZXIuaW5wdXQoZGF0YSkpO1xuICAgIH0pO1xuXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgaWYgKHNvY2tldClcbiAgICAgIHNvY2tldC5lbmQoKTtcbiAgICB0aHJvdyBleDtcbiAgfVxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMCkpO1xuICBoYW5kbGVyLmlucHV0KG51bGwpO1xuICBzb2NrZXQuZW5kKCk7XG59XG4iXX0=