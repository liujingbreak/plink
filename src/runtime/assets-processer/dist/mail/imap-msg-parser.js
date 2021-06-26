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
    const output = input.pipe(operators_1.observeOn(rxjs_1.queueScheduler), operators_1.takeWhile(data => data != null), 
    // tap(data => fs.writeFileSync('imap-msg-parser-log.txt', data.toString('utf8'), {flag: 'a'})),
    async_LLn_parser_1.mapChunks(name + '-lexer', parseLex), operators_1.map(chunk => {
        const buf = Buffer.from(Uint8Array.from(chunk.values));
        chunk.text = buf.toString('utf8');
        delete chunk.values;
        return chunk;
    }), operators_1.map(token => [token]), async_LLn_parser_1.mapChunksObs(name + '-parser', (la) => rxjs_1.from(parseServerReply(la))), operators_1.concatMap(lines => lines), operators_1.share());
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
    return lines.pipe(operators_1.concatMap(line => {
        const la = new async_LLn_parser_1.LookAhead('imap reply line');
        la._write(line);
        la._final();
        return rxjs_1.from(parseLine(la));
    }), 
    // filter(res => res == null),
    operators_1.takeWhile(res => res == null, true), operators_1.takeLast(1)).toPromise();
}
exports.parseLinesOfTokens = parseLinesOfTokens;
function connectImap(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const handler = createServerDataHandler();
        let socket;
        try {
            socket = yield new Promise((resolve, reject) => {
                const socket = tls_1.connect({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hcC1tc2ctcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW1hcC1tc2ctcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDJFQUF5SDtBQUN6SCwrQkFBaUU7QUFDakUsOENBQXFGO0FBQ3JGLDZCQUEwRTtBQUMxRSx1QkFBdUI7QUFFdkIsMEJBQTBCO0FBQzFCLG1DQUFtQztBQUVuQyxJQUFZLGFBU1g7QUFURCxXQUFZLGFBQWE7SUFDdkIscURBQVUsQ0FBQTtJQUNWLDJEQUFTLENBQUE7SUFDVCwrREFBVyxDQUFBO0lBQ1gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCxpREFBSSxDQUFBO0lBQ0osaURBQUksQ0FBQTtJQUNKLE1BQU07QUFDUixDQUFDLEVBVFcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFTeEI7QUFPRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU5QixNQUFNLFFBQVEsR0FBb0MsVUFBZSxLQUFLLEVBQUUsR0FBRzs7UUFDekUsNENBQTRDO1FBQzVDLDZDQUE2QztRQUM3Qyx3SEFBd0g7UUFDeEgsc0NBQXNDO1FBQ3RDLEtBQUs7UUFFTCxJQUFJLFFBQVEsR0FBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNqQyxPQUFPLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDdkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7Z0JBQ2hCLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0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c0M7b0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQzVFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEIsQ0FBQyxDQUFDO3FCQUNELEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQy9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQztTQUVKO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLE1BQU07Z0JBQ1IsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2YsTUFBTSxFQUFFLENBQUM7U0FDVjtRQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDZixDQUFDO0NBQUE7QUE1QkQsa0NBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGFyc2VHcmFtbWFyLCBQYXJzZUxleCwgVG9rZW4sIExvb2tBaGVhZCwgbWFwQ2h1bmtzLCBtYXBDaHVua3NPYnMgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FzeW5jLUxMbi1wYXJzZXInO1xuaW1wb3J0IHsgU3ViamVjdCwgT2JzZXJ2YWJsZSwgcXVldWVTY2hlZHVsZXIsIGZyb20gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7b2JzZXJ2ZU9uLCBtYXAsIHRha2VXaGlsZSwgY29uY2F0TWFwLCB0YWtlTGFzdCwgc2hhcmV9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGNvbm5lY3QgYXMgdHNsQ29ubmVjdCwgQ29ubmVjdGlvbk9wdGlvbnMsIFRMU1NvY2tldCB9IGZyb20gJ3Rscyc7XG4vLyBpbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG4vLyBsZXQgZmlsZVdyaXRpbmdJZHggPSAxO1xuLy8gaW1wb3J0IHtTdWJzY3JpYmVyfSBmcm9tICdyeGpzJztcblxuZXhwb3J0IGVudW0gSW1hcFRva2VuVHlwZSB7XG4gIG51bWJlciA9IDEsXG4gIHN0cmluZ0xpdCxcbiAgc3RyaW5nUXVvdGUsXG4gICcoJyxcbiAgJyknLFxuICBhdG9tLCAvLyBBVE9NIG9yIE5JTFxuICBDUkxGXG4gIC8vIG5pbFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0cmluZ0xpdCBleHRlbmRzIFRva2VuPEltYXBUb2tlblR5cGUuc3RyaW5nTGl0PiB7XG4gIGRhdGE6IEJ1ZmZlcjtcbn1cblxuXG5jb25zdCBSX0JSQUNFID0gJ30nLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBDUiA9ICdcXHInLmNoYXJDb2RlQXQoMCk7XG5jb25zdCBMRiA9ICdcXG4nLmNoYXJDb2RlQXQoMCk7XG5cbmNvbnN0IHBhcnNlTGV4OiBQYXJzZUxleDxudW1iZXIsIEltYXBUb2tlblR5cGU+ID0gYXN5bmMgZnVuY3Rpb24ocmVwbHksIHN1Yikge1xuICAvLyBjb25zdCBvcmlnV3JpdGUgPSByZXBseS5fd3JpdGVBbmRSZXNvbHZlO1xuICAvLyByZXBseS5fd3JpdGVBbmRSZXNvbHZlID0gZnVuY3Rpb24oYnl0ZXMpIHtcbiAgLy8gICBmcy53cml0ZUZpbGVTeW5jKCdpbWFwLW1zZy1wYXJzZXIucGFyc2VMZXgubG9nLnR4dCcsIEJ1ZmZlci5mcm9tKEFycmF5LmZyb20oYnl0ZXMpKS50b1N0cmluZygndXRmOCcpLCB7ZmxhZzogJ2EnfSk7XG4gIC8vICAgb3JpZ1dyaXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIC8vIH07XG5cbiAgbGV0IG5leHRCeXRlID0gIGF3YWl0IHJlcGx5LmxhKCk7XG4gIHdoaWxlIChuZXh0Qnl0ZSAhPSBudWxsKSB7XG4gICAgY29uc3QgbmV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dEJ5dGUpO1xuICAgIGlmICgnICcgPT09IG5leHQpIHtcbiAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIC8vIHNraXAgc3BhY2UgY2hhclxuICAgIH0gZWxzZSBpZiAoL1swLTldLy50ZXN0KG5leHQpKSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUubnVtYmVyKTtcbiAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIG5leHRCeXRlID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgICAgIHdoaWxlIChuZXh0Qnl0ZSAhPSBudWxsICYmIC9bMC05Ll0vLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0Qnl0ZSkpKSB7XG4gICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgICAgbmV4dEJ5dGUgPSBhd2FpdCByZXBseS5sYSgpO1xuICAgICAgfVxuICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIGlmICgnXFxyJyA9PT0gbmV4dCkge1xuICAgICAgcmVwbHkuc3RhcnRUb2tlbihJbWFwVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgY29uc3QgYiA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgICBpZiAoYiAhPSBudWxsICYmIFN0cmluZy5mcm9tQ2hhckNvZGUoYikgPT09ICdcXG4nKVxuICAgICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9IGVsc2UgaWYgKCdcXG4nID09PSBuZXh0KSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUuQ1JMRik7XG4gICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9IGVsc2UgaWYgKCdcIicgPT09IG5leHQpIHtcbiAgICAgIHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5zdHJpbmdRdW90ZSk7XG4gICAgICBjb25zdCBvcGVuQ2hhciA9IGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGNvbnN0IGxhID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgICAgICAgaWYgKGxhID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gcmVwbHkudGhyb3dFcnJvcigpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTdHJpbmcuZnJvbUNoYXJDb2RlKGxhKSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgyKTtcbiAgICAgICAgfSBlbHNlIGlmIChsYSA9PT0gb3BlbkNoYXIpIHtcbiAgICAgICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgneycgPT09IG5leHQpIHtcbiAgICAgIGNvbnN0IG5leHQyID0gYXdhaXQgcmVwbHkubGEoMik7XG4gICAgICBpZiAobmV4dDIgIT0gbnVsbCAmJiAvXFxkLy50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dDIpKSkge1xuICAgICAgICBhd2FpdCBwYXJzZUxpdGVyYWxTdHJpbmcocmVwbHkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgcGFyc2VBdG9tKHJlcGx5KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCcoJyA9PT0gbmV4dCB8fCAnKScgPT09IG5leHQpIHtcbiAgICAgIHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZVtuZXh0XSk7XG4gICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgcGFyc2VBdG9tKHJlcGx5KTtcbiAgICB9XG4gICAgbmV4dEJ5dGUgPSAgYXdhaXQgcmVwbHkubGEoKTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VBdG9tKGxhOiBQYXJhbWV0ZXJzPFBhcnNlTGV4PG51bWJlciwgSW1hcFRva2VuVHlwZT4+WzBdKSB7XG4gIGxhLnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5hdG9tKTtcbiAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICBsZXQgbmV4dEJ5dGUgPSBhd2FpdCBsYS5sYSgpO1xuICB3aGlsZSAobmV4dEJ5dGUgIT0gbnVsbCAmJiAvW15cXHN7WygpXCJdLy50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dEJ5dGUpKSkge1xuICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICBuZXh0Qnl0ZSA9IGF3YWl0IGxhLmxhKCk7XG4gIH1cbiAgbGEuZW1pdFRva2VuKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlTGl0ZXJhbFN0cmluZyhyZXBseTogUGFyYW1ldGVyczxQYXJzZUxleDxudW1iZXIsIEltYXBUb2tlblR5cGU+PlswXSkge1xuICBjb25zdCBjaHVuayA9IHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5zdHJpbmdMaXQsIGZhbHNlKTtcbiAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICBsZXQgbnVtU3RyID0gU3RyaW5nLmZyb21DaGFyQ29kZShhd2FpdCByZXBseS5hZHZhbmNlKCkpO1xuICBsZXQgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gIHdoaWxlIChuZXh0ICYmIG5leHQgIT09IFJfQlJBQ0UpIHtcbiAgICBudW1TdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0KTtcbiAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gIH1cbiAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICBuZXh0ID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgaWYgKG5leHQgPT0gbnVsbClcbiAgICByZXR1cm4gcmVwbHkudGhyb3dFcnJvcigpO1xuICB3aGlsZSAobmV4dCA9PT0gQ1IgfHwgbmV4dCA9PT0gTEYpIHtcbiAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gIH1cblxuICBjb25zdCBudW1CeXRlID0gcGFyc2VJbnQobnVtU3RyLCAxMCk7XG4gIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5hbGxvYyhudW1CeXRlKTtcblxuICBsZXQgaSA9IDA7XG4gIC8vIGNvbnNvbGUudGltZSgnc3RyaW5nbGl0Jyk7XG4gIHdoaWxlIChpIDwgbnVtQnl0ZSkge1xuICAgIG5leHQgPSBhd2FpdCByZXBseS5sYSgpO1xuICAgIGlmIChuZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXBseS50aHJvd0Vycm9yKCk7XG4gICAgfVxuICAgIGNvbnN0IGNoYXIgPSBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgYnVmLndyaXRlVUludDgoY2hhciwgaSk7XG4gICAgaSsrO1xuICB9XG4gIC8vIGNvbnNvbGUudGltZUVuZCgnc3RyaW5nbGl0Jyk7XG4gIChjaHVuayBhcyBTdHJpbmdMaXQpLmRhdGEgPSBidWY7XG4gIHJlcGx5LmVtaXRUb2tlbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUxpbmUobGE6IFBhcmFtZXRlcnM8KHR5cGVvZiBwYXJzZUxpbmVzKT5bMV0pOlxuUHJvbWlzZTxUb2tlbjxJbWFwVG9rZW5UeXBlPltdIHwgdW5kZWZpbmVkPiB7XG4gIGxldCBidWY6IFRva2VuPEltYXBUb2tlblR5cGU+W10gfCB1bmRlZmluZWQ7XG4gIGxldCB3b3JkID0gYXdhaXQgbGEubGEoKTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBpZiAod29yZCA9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChidWYgPT0gbnVsbCkgYnVmID0gW107XG4gICAgaWYgKHdvcmQudHlwZSA9PT0gSW1hcFRva2VuVHlwZS5DUkxGKSB7XG4gICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICByZXR1cm4gYnVmO1xuICAgIH1cbiAgICBidWYucHVzaCh3b3JkKTtcbiAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgd29yZCA9IGF3YWl0IGxhLmxhKCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VMaW5lcyhsaW5lU3ViamVjdDogU3ViamVjdDxUb2tlbjxJbWFwVG9rZW5UeXBlPltdPiwgbGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPiwgYW55Pikge1xuICBsZXQgbGluZTogVG9rZW48SW1hcFRva2VuVHlwZT5bXSB8IHVuZGVmaW5lZDtcbiAgZG8ge1xuICAgIGxpbmUgPSBhd2FpdCBwYXJzZUxpbmUobGEpO1xuICAgIGlmIChsaW5lID09IG51bGwpIHtcbiAgICAgIGxpbmVTdWJqZWN0LmNvbXBsZXRlKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbGluZVN1YmplY3QubmV4dChsaW5lKTtcbiAgfSB3aGlsZSAodHJ1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpOiB7aW5wdXQ6IChidWY6IEJ1ZmZlciB8IG51bGwpID0+dm9pZCwgb3V0cHV0OiBPYnNlcnZhYmxlPFRva2VuPEltYXBUb2tlblR5cGU+W10+fSB7XG4gIGNvbnN0IGlucHV0ID0gbmV3IFN1YmplY3Q8QnVmZmVyIHwgbnVsbD4oKTtcblxuICBjb25zdCBwYXJzZVNlcnZlclJlcGx5OiBQYXJzZUdyYW1tYXI8U3ViamVjdDxUb2tlbjxJbWFwVG9rZW5UeXBlPltdPiwgSW1hcFRva2VuVHlwZT4gPSBhc3luYyAobGEpID0+IHtcbiAgICBjb25zdCBsaW5lU3ViamVjdCA9IG5ldyBTdWJqZWN0PFRva2VuPEltYXBUb2tlblR5cGU+W10+KCk7XG4gICAgcGFyc2VMaW5lcyhsaW5lU3ViamVjdCwgbGEpO1xuICAgIHJldHVybiBsaW5lU3ViamVjdDtcbiAgfTtcblxuICAvLyBwYXJzZXIoJ0lNQVAnLCBpbnB1dCwgcGFyc2VMZXgsIG51bGwsIHBhcnNlU2VydmVyUmVwbHkpO1xuICBjb25zdCBuYW1lID0gJ0lNQVAnO1xuXG4gIGNvbnN0IG91dHB1dCA9IGlucHV0LnBpcGUoXG4gICAgb2JzZXJ2ZU9uKHF1ZXVlU2NoZWR1bGVyKSxcbiAgICB0YWtlV2hpbGU8QnVmZmVyPihkYXRhID0+IGRhdGEgIT0gbnVsbCksXG4gICAgLy8gdGFwKGRhdGEgPT4gZnMud3JpdGVGaWxlU3luYygnaW1hcC1tc2ctcGFyc2VyLWxvZy50eHQnLCBkYXRhLnRvU3RyaW5nKCd1dGY4JyksIHtmbGFnOiAnYSd9KSksXG4gICAgbWFwQ2h1bmtzKG5hbWUgKyAnLWxleGVyJywgcGFyc2VMZXgpLFxuICAgIG1hcChjaHVuayA9PiB7XG4gICAgICBjb25zdCBidWYgPSBCdWZmZXIuZnJvbShVaW50OEFycmF5LmZyb20oY2h1bmsudmFsdWVzISkpO1xuICAgICAgKGNodW5rIGFzIFRva2VuPEltYXBUb2tlblR5cGU+KS50ZXh0ID0gYnVmLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICBkZWxldGUgY2h1bmsudmFsdWVzO1xuICAgICAgcmV0dXJuIGNodW5rIGFzIFRva2VuPEltYXBUb2tlblR5cGU+O1xuICAgIH0pLFxuICAgIG1hcCh0b2tlbiA9PiBbdG9rZW5dKSxcbiAgICBtYXBDaHVua3NPYnMobmFtZSArICctcGFyc2VyJywgKGxhKSA9PiBmcm9tKHBhcnNlU2VydmVyUmVwbHkobGEpKSksXG4gICAgY29uY2F0TWFwKGxpbmVzID0+IGxpbmVzKSxcbiAgICBzaGFyZSgpXG4gICk7XG5cbiAgcmV0dXJuIHtcbiAgICBpbnB1dDogKGRhdGEpID0+IGlucHV0Lm5leHQoZGF0YSksXG4gICAgb3V0cHV0XG4gIH07XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gbGluZXMgY3JlYXRlU2VydmVyRGF0YUhhbmRsZXIoKS5vdXRwdXRcbiAqIEBwYXJhbSBwYXJzZUxpbmUgcmV0dXJuIG51bGwvdW5kZWZpbmVkIHRvIGNvbnRpbnVlIHRvIHdhaXQgZm9yIG5leHQgbGluZSwgb3IgaXQgd2lsbCBzdG9wIHdhaXRpbmcgZm9yIG5leHQgbGluZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTGluZXNPZlRva2VucyhsaW5lczogT2JzZXJ2YWJsZTxUb2tlbjxJbWFwVG9rZW5UeXBlPltdPixcbiAgcGFyc2VMaW5lOiAobGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4pID0+IFByb21pc2U8YW55IHwgbnVsbCB8IHZvaWQ+KSB7XG4gIHJldHVybiBsaW5lcy5waXBlKFxuICAgIGNvbmNhdE1hcChsaW5lID0+IHtcbiAgICAgIGNvbnN0IGxhID0gbmV3IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPj4oJ2ltYXAgcmVwbHkgbGluZScpO1xuICAgICAgbGEuX3dyaXRlKGxpbmUpO1xuICAgICAgbGEuX2ZpbmFsKCk7XG4gICAgICByZXR1cm4gZnJvbShwYXJzZUxpbmUobGEpKTtcbiAgICB9KSxcbiAgICAvLyBmaWx0ZXIocmVzID0+IHJlcyA9PSBudWxsKSxcbiAgICB0YWtlV2hpbGUocmVzID0+IHJlcyA9PSBudWxsLCB0cnVlKSxcbiAgICB0YWtlTGFzdCgxKVxuICApLnRvUHJvbWlzZSgpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29ubmVjdEltYXAoYWRkcmVzczogc3RyaW5nKSB7XG4gIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpO1xuICBsZXQgc29ja2V0OiBUTFNTb2NrZXR8dW5kZWZpbmVkO1xuICB0cnkge1xuICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbiAgICAgICAgaG9zdDogYWRkcmVzcywgcG9ydDogOTkzLFxuICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgICAgIHNvY2tldC5vbignc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbiAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuICAgICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4gaGFuZGxlci5pbnB1dChkYXRhKSk7XG4gICAgfSk7XG5cbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwKSk7XG4gIGhhbmRsZXIuaW5wdXQobnVsbCk7XG4gIHNvY2tldC5lbmQoKTtcbn1cbiJdfQ==