"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const async_LLn_parser_1 = require("dr-comp-package/wfh/dist/async-LLn-parser");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const tls_1 = require("tls");
const fs_1 = tslib_1.__importDefault(require("fs"));
let fileWritingIdx = 1;
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        const buf = Buffer.alloc(numByte); // console.log('numByte', numByte);
        let i = 0;
        while (i < numByte) {
            next = yield reply.la();
            if (next == null) {
                return reply.throwError();
            }
            const char = yield reply.advance();
            buf.writeUInt8(char, i);
            i++;
        }
        chunk.data = buf;
        // console.log('parseLiteralString()', chunk);
        fs_1.default.writeFile(`temp-${process.pid}-${fileWritingIdx++}.txt`, buf, () => { });
        reply.emitToken();
    });
}
function parseLine(la) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    const parseServerReply = (la) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const lineSubject = new rxjs_1.Subject();
        parseLines(lineSubject, la);
        return lineSubject;
    });
    // parser('IMAP', input, parseLex, null, parseServerReply);
    const name = 'IMAP';
    const output = input.pipe(operators_1.observeOn(rxjs_1.queueScheduler), operators_1.takeWhile(data => data != null), 
    // tap(data => console.log('##### input buffer length: ', data.length)),
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const handler = createServerDataHandler();
        let socket;
        try {
            socket = yield new Promise((resolve, reject) => {
                const socket = tls_1.connect({
                    host: address, port: 993,
                    enableTrace: true
                });
                socket.on('secureConnect', () => {
                    // tslint:disable-next-line: no-console
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL21haWwvaW1hcC1tc2ctcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdGQUE4SDtBQUM5SCwrQkFBaUU7QUFDakUsOENBQXFGO0FBQ3JGLDZCQUEwRTtBQUMxRSxvREFBb0I7QUFFcEIsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLG1DQUFtQztBQUVuQyxJQUFZLGFBU1g7QUFURCxXQUFZLGFBQWE7SUFDdkIscURBQVUsQ0FBQTtJQUNWLDJEQUFTLENBQUE7SUFDVCwrREFBVyxDQUFBO0lBQ1gsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCxpREFBSSxDQUFBO0lBQ0osaURBQUksQ0FBQTtJQUNKLE1BQU07QUFDUixDQUFDLEVBVFcsYUFBYSxHQUFiLHFCQUFhLEtBQWIscUJBQWEsUUFTeEI7QUFPRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU5QixNQUFNLFFBQVEsR0FBb0MsVUFBZSxLQUFLLEVBQUUsR0FBRzs7UUFDekUsSUFBSSxRQUFRLEdBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakMsT0FBTyxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0MsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO2dCQUNoQixNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsa0JBQWtCO2FBQ25CO2lCQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJ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QztnQkFFeEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO29CQUM5Qix1Q0FBdUM7b0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQzVFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEIsQ0FBQyxDQUFDO3FCQUNELEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQy9CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQztTQUVKO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxJQUFJLE1BQU07Z0JBQ1IsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2YsTUFBTSxFQUFFLENBQUM7U0FDVjtRQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDZixDQUFDO0NBQUE7QUE1QkQsa0NBNEJDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvbWFpbC9pbWFwLW1zZy1wYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXJzZUdyYW1tYXIsIFBhcnNlTGV4LCBUb2tlbiwgTG9va0FoZWFkLCBtYXBDaHVua3MsIG1hcENodW5rc09icyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9hc3luYy1MTG4tcGFyc2VyJztcbmltcG9ydCB7IFN1YmplY3QsIE9ic2VydmFibGUsIHF1ZXVlU2NoZWR1bGVyLCBmcm9tIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge29ic2VydmVPbiwgbWFwLCB0YWtlV2hpbGUsIGNvbmNhdE1hcCwgdGFrZUxhc3QsIHNoYXJlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBjb25uZWN0IGFzIHRzbENvbm5lY3QsIENvbm5lY3Rpb25PcHRpb25zLCBUTFNTb2NrZXQgfSBmcm9tICd0bHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxubGV0IGZpbGVXcml0aW5nSWR4ID0gMTtcbi8vIGltcG9ydCB7U3Vic2NyaWJlcn0gZnJvbSAncnhqcyc7XG5cbmV4cG9ydCBlbnVtIEltYXBUb2tlblR5cGUge1xuICBudW1iZXIgPSAxLFxuICBzdHJpbmdMaXQsXG4gIHN0cmluZ1F1b3RlLFxuICAnKCcsXG4gICcpJyxcbiAgYXRvbSwgLy8gQVRPTSBvciBOSUxcbiAgQ1JMRlxuICAvLyBuaWxcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdHJpbmdMaXQge1xuICBkYXRhOiBCdWZmZXI7XG59XG5cblxuY29uc3QgUl9CUkFDRSA9ICd9Jy5jaGFyQ29kZUF0KDApO1xuY29uc3QgQ1IgPSAnXFxyJy5jaGFyQ29kZUF0KDApO1xuY29uc3QgTEYgPSAnXFxuJy5jaGFyQ29kZUF0KDApO1xuXG5jb25zdCBwYXJzZUxleDogUGFyc2VMZXg8bnVtYmVyLCBJbWFwVG9rZW5UeXBlPiA9IGFzeW5jIGZ1bmN0aW9uKHJlcGx5LCBzdWIpIHtcbiAgbGV0IG5leHRCeXRlID0gIGF3YWl0IHJlcGx5LmxhKCk7XG4gIHdoaWxlIChuZXh0Qnl0ZSAhPSBudWxsKSB7XG4gICAgY29uc3QgbmV4dCA9IFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dEJ5dGUpO1xuICAgIGlmICgnICcgPT09IG5leHQpIHtcbiAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIC8vIHNraXAgc3BhY2UgY2hhclxuICAgIH0gZWxzZSBpZiAoL1swLTldLy50ZXN0KG5leHQpKSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUubnVtYmVyKTtcbiAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIG5leHRCeXRlID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgICAgIHdoaWxlIChuZXh0Qnl0ZSAhPSBudWxsICYmIC9bMC05Ll0vLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0Qnl0ZSkpKSB7XG4gICAgICAgIGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgICAgbmV4dEJ5dGUgPSBhd2FpdCByZXBseS5sYSgpO1xuICAgICAgfVxuICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgfSBlbHNlIGlmICgnXFxyJyA9PT0gbmV4dCkge1xuICAgICAgcmVwbHkuc3RhcnRUb2tlbihJbWFwVG9rZW5UeXBlLkNSTEYpO1xuICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgY29uc3QgYiA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gICAgICBpZiAoYiAhPSBudWxsICYmIFN0cmluZy5mcm9tQ2hhckNvZGUoYikgPT09ICdcXG4nKVxuICAgICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9IGVsc2UgaWYgKCdcXG4nID09PSBuZXh0KSB7XG4gICAgICByZXBseS5zdGFydFRva2VuKEltYXBUb2tlblR5cGUuQ1JMRik7XG4gICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9IGVsc2UgaWYgKCdcIicgPT09IG5leHQpIHtcbiAgICAgIHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5zdHJpbmdRdW90ZSk7XG4gICAgICBjb25zdCBvcGVuQ2hhciA9IGF3YWl0IHJlcGx5LmFkdmFuY2UoKTtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGNvbnN0IGxhID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgICAgICAgaWYgKGxhID09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gcmVwbHkudGhyb3dFcnJvcigpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChTdHJpbmcuZnJvbUNoYXJDb2RlKGxhKSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgyKTtcbiAgICAgICAgfSBlbHNlIGlmIChsYSA9PT0gb3BlbkNoYXIpIHtcbiAgICAgICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICAgICAgcmVwbHkuZW1pdFRva2VuKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgneycgPT09IG5leHQpIHtcbiAgICAgIGNvbnN0IG5leHQyID0gYXdhaXQgcmVwbHkubGEoMik7XG4gICAgICBpZiAobmV4dDIgIT0gbnVsbCAmJiAvXFxkLy50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dDIpKSkge1xuICAgICAgICBhd2FpdCBwYXJzZUxpdGVyYWxTdHJpbmcocmVwbHkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgcGFyc2VBdG9tKHJlcGx5KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCcoJyA9PT0gbmV4dCB8fCAnKScgPT09IG5leHQpIHtcbiAgICAgIHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZVtuZXh0XSk7XG4gICAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgICByZXBseS5lbWl0VG9rZW4oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgcGFyc2VBdG9tKHJlcGx5KTtcbiAgICB9XG4gICAgbmV4dEJ5dGUgPSAgYXdhaXQgcmVwbHkubGEoKTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VBdG9tKGxhOiBQYXJhbWV0ZXJzPFBhcnNlTGV4PG51bWJlciwgSW1hcFRva2VuVHlwZT4+WzBdKSB7XG4gIGxhLnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5hdG9tKTtcbiAgYXdhaXQgbGEuYWR2YW5jZSgpO1xuICBsZXQgbmV4dEJ5dGUgPSBhd2FpdCBsYS5sYSgpO1xuICB3aGlsZSAobmV4dEJ5dGUgIT0gbnVsbCAmJiAvW15cXHN7WygpXCJdLy50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUobmV4dEJ5dGUpKSkge1xuICAgIGF3YWl0IGxhLmFkdmFuY2UoKTtcbiAgICBuZXh0Qnl0ZSA9IGF3YWl0IGxhLmxhKCk7XG4gIH1cbiAgbGEuZW1pdFRva2VuKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlTGl0ZXJhbFN0cmluZyhyZXBseTogUGFyYW1ldGVyczxQYXJzZUxleDxudW1iZXIsIEltYXBUb2tlblR5cGU+PlswXSkge1xuICBjb25zdCBjaHVuayA9IHJlcGx5LnN0YXJ0VG9rZW4oSW1hcFRva2VuVHlwZS5zdHJpbmdMaXQsIGZhbHNlKTtcbiAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICBsZXQgbnVtU3RyID0gU3RyaW5nLmZyb21DaGFyQ29kZShhd2FpdCByZXBseS5hZHZhbmNlKCkpO1xuICBsZXQgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gIHdoaWxlIChuZXh0ICYmIG5leHQgIT09IFJfQlJBQ0UpIHtcbiAgICBudW1TdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShuZXh0KTtcbiAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gIH1cbiAgYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICBuZXh0ID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgaWYgKG5leHQgPT0gbnVsbClcbiAgICByZXR1cm4gcmVwbHkudGhyb3dFcnJvcigpO1xuICB3aGlsZSAobmV4dCA9PT0gQ1IgfHwgbmV4dCA9PT0gTEYpIHtcbiAgICBhd2FpdCByZXBseS5hZHZhbmNlKCk7XG4gICAgbmV4dCA9IGF3YWl0IHJlcGx5LmxhKCk7XG4gIH1cblxuICBjb25zdCBudW1CeXRlID0gcGFyc2VJbnQobnVtU3RyLCAxMCk7XG4gIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5hbGxvYyhudW1CeXRlKTsgIC8vIGNvbnNvbGUubG9nKCdudW1CeXRlJywgbnVtQnl0ZSk7XG5cbiAgbGV0IGkgPSAwO1xuICB3aGlsZSAoaSA8IG51bUJ5dGUpIHtcbiAgICBuZXh0ID0gYXdhaXQgcmVwbHkubGEoKTtcbiAgICBpZiAobmV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHkudGhyb3dFcnJvcigpO1xuICAgIH1cbiAgICBjb25zdCBjaGFyID0gYXdhaXQgcmVwbHkuYWR2YW5jZSgpO1xuICAgIGJ1Zi53cml0ZVVJbnQ4KGNoYXIsIGkpO1xuICAgIGkrKztcbiAgfVxuICAoY2h1bmsgYXMgdW5rbm93biBhcyBTdHJpbmdMaXQpLmRhdGEgPSBidWY7XG4gIC8vIGNvbnNvbGUubG9nKCdwYXJzZUxpdGVyYWxTdHJpbmcoKScsIGNodW5rKTtcbiAgZnMud3JpdGVGaWxlKGB0ZW1wLSR7cHJvY2Vzcy5waWR9LSR7ZmlsZVdyaXRpbmdJZHgrK30udHh0YCwgYnVmLCAoKSA9PiB7fSk7XG4gIHJlcGx5LmVtaXRUb2tlbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwYXJzZUxpbmUobGE6IFBhcmFtZXRlcnM8KHR5cGVvZiBwYXJzZUxpbmVzKT5bMV0pOlxuUHJvbWlzZTxUb2tlbjxJbWFwVG9rZW5UeXBlPltdIHwgdW5kZWZpbmVkPiB7XG4gIGxldCBidWY6IFRva2VuPEltYXBUb2tlblR5cGU+W10gfCB1bmRlZmluZWQ7XG4gIGxldCB3b3JkID0gYXdhaXQgbGEubGEoKTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBpZiAod29yZCA9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChidWYgPT0gbnVsbCkgYnVmID0gW107XG4gICAgaWYgKHdvcmQudHlwZSA9PT0gSW1hcFRva2VuVHlwZS5DUkxGKSB7XG4gICAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgICByZXR1cm4gYnVmO1xuICAgIH1cbiAgICBidWYucHVzaCh3b3JkKTtcbiAgICBhd2FpdCBsYS5hZHZhbmNlKCk7XG4gICAgd29yZCA9IGF3YWl0IGxhLmxhKCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VMaW5lcyhsaW5lU3ViamVjdDogU3ViamVjdDxUb2tlbjxJbWFwVG9rZW5UeXBlPltdPiwgbGE6IExvb2tBaGVhZDxUb2tlbjxJbWFwVG9rZW5UeXBlPiwgYW55Pikge1xuICBsZXQgbGluZTogVG9rZW48SW1hcFRva2VuVHlwZT5bXSB8IHVuZGVmaW5lZDtcbiAgZG8ge1xuICAgIGxpbmUgPSBhd2FpdCBwYXJzZUxpbmUobGEpO1xuICAgIGlmIChsaW5lID09IG51bGwpIHtcbiAgICAgIGxpbmVTdWJqZWN0LmNvbXBsZXRlKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbGluZVN1YmplY3QubmV4dChsaW5lKTtcbiAgfSB3aGlsZSAodHJ1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpOiB7aW5wdXQ6IChidWY6IEJ1ZmZlciB8IG51bGwpID0+dm9pZCwgb3V0cHV0OiBPYnNlcnZhYmxlPFRva2VuPEltYXBUb2tlblR5cGU+W10+fSB7XG4gIGNvbnN0IGlucHV0ID0gbmV3IFN1YmplY3Q8VWludDhBcnJheSB8IG51bGw+KCk7XG5cbiAgY29uc3QgcGFyc2VTZXJ2ZXJSZXBseTogUGFyc2VHcmFtbWFyPFN1YmplY3Q8VG9rZW48SW1hcFRva2VuVHlwZT5bXT4sIEltYXBUb2tlblR5cGU+ID0gYXN5bmMgKGxhKSA9PiB7XG4gICAgY29uc3QgbGluZVN1YmplY3QgPSBuZXcgU3ViamVjdDxUb2tlbjxJbWFwVG9rZW5UeXBlPltdPigpO1xuICAgIHBhcnNlTGluZXMobGluZVN1YmplY3QsIGxhKTtcbiAgICByZXR1cm4gbGluZVN1YmplY3Q7XG4gIH07XG5cbiAgLy8gcGFyc2VyKCdJTUFQJywgaW5wdXQsIHBhcnNlTGV4LCBudWxsLCBwYXJzZVNlcnZlclJlcGx5KTtcbiAgY29uc3QgbmFtZSA9ICdJTUFQJztcblxuICBjb25zdCBvdXRwdXQgPSBpbnB1dC5waXBlKFxuICAgIG9ic2VydmVPbihxdWV1ZVNjaGVkdWxlciksXG4gICAgdGFrZVdoaWxlPFVpbnQ4QXJyYXk+KGRhdGEgPT4gZGF0YSAhPSBudWxsKSxcbiAgICAvLyB0YXAoZGF0YSA9PiBjb25zb2xlLmxvZygnIyMjIyMgaW5wdXQgYnVmZmVyIGxlbmd0aDogJywgZGF0YS5sZW5ndGgpKSxcbiAgICBtYXBDaHVua3MobmFtZSArICctbGV4ZXInLCBwYXJzZUxleCksXG4gICAgbWFwKGNodW5rID0+IHtcbiAgICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKFVpbnQ4QXJyYXkuZnJvbShjaHVuay52YWx1ZXMhKSk7XG4gICAgICAoY2h1bmsgYXMgVG9rZW48SW1hcFRva2VuVHlwZT4pLnRleHQgPSBidWYudG9TdHJpbmcoJ3V0ZjgnKTtcbiAgICAgIGRlbGV0ZSBjaHVuay52YWx1ZXM7XG4gICAgICByZXR1cm4gY2h1bmsgYXMgVG9rZW48SW1hcFRva2VuVHlwZT47XG4gICAgfSksXG4gICAgbWFwKHRva2VuID0+IFt0b2tlbl0pLFxuICAgIG1hcENodW5rc09icyhuYW1lICsgJy1wYXJzZXInLCAobGEpID0+IGZyb20ocGFyc2VTZXJ2ZXJSZXBseShsYSkpKSxcbiAgICBjb25jYXRNYXAobGluZXMgPT4gbGluZXMpLFxuICAgIHNoYXJlKClcbiAgKTtcblxuICByZXR1cm4ge1xuICAgIGlucHV0OiAoZGF0YSkgPT4gaW5wdXQubmV4dChkYXRhKSxcbiAgICBvdXRwdXRcbiAgfTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBsaW5lcyBjcmVhdGVTZXJ2ZXJEYXRhSGFuZGxlcigpLm91dHB1dFxuICogQHBhcmFtIHBhcnNlTGluZSByZXR1cm4gbnVsbC91bmRlZmluZWQgdG8gY29udGludWUgdG8gd2FpdCBmb3IgbmV4dCBsaW5lLCBvciBpdCB3aWxsIHN0b3Agd2FpdGluZyBmb3IgbmV4dCBsaW5lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMaW5lc09mVG9rZW5zKGxpbmVzOiBPYnNlcnZhYmxlPFRva2VuPEltYXBUb2tlblR5cGU+W10+LFxuICBwYXJzZUxpbmU6IChsYTogTG9va0FoZWFkPFRva2VuPEltYXBUb2tlblR5cGU+PikgPT4gUHJvbWlzZTxhbnkgfCBudWxsIHwgdm9pZD4pIHtcbiAgcmV0dXJuIGxpbmVzLnBpcGUoXG4gICAgY29uY2F0TWFwKGxpbmUgPT4ge1xuICAgICAgY29uc3QgbGEgPSBuZXcgTG9va0FoZWFkPFRva2VuPEltYXBUb2tlblR5cGU+PignaW1hcCByZXBseSBsaW5lJyk7XG4gICAgICBsYS5fd3JpdGUobGluZSk7XG4gICAgICBsYS5fZmluYWwoKTtcbiAgICAgIHJldHVybiBmcm9tKHBhcnNlTGluZShsYSkpO1xuICAgIH0pLFxuICAgIC8vIGZpbHRlcihyZXMgPT4gcmVzID09IG51bGwpLFxuICAgIHRha2VXaGlsZShyZXMgPT4gcmVzID09IG51bGwsIHRydWUpLFxuICAgIHRha2VMYXN0KDEpXG4gICkudG9Qcm9taXNlKCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25uZWN0SW1hcChhZGRyZXNzOiBzdHJpbmcpIHtcbiAgY29uc3QgaGFuZGxlciA9IGNyZWF0ZVNlcnZlckRhdGFIYW5kbGVyKCk7XG4gIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuICAgICAgICBob3N0OiBhZGRyZXNzLCBwb3J0OiA5OTMsXG4gICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4gICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbiAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuICAgICAgc29ja2V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4gaGFuZGxlci5pbnB1dChkYXRhKSk7XG4gICAgfSk7XG5cbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBpZiAoc29ja2V0KVxuICAgICAgc29ja2V0LmVuZCgpO1xuICAgIHRocm93IGV4O1xuICB9XG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwKSk7XG4gIGhhbmRsZXIuaW5wdXQobnVsbCk7XG4gIHNvY2tldC5lbmQoKTtcbn1cbiJdfQ==
