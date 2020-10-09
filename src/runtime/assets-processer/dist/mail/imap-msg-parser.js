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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9tYWlsL2ltYXAtbXNnLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwyRUFBeUg7QUFDekgsK0JBQWlFO0FBQ2pFLDhDQUFxRjtBQUNyRiw2QkFBMEU7QUFDMUUsdUJBQXVCO0FBRXZCLDBCQUEwQjtBQUMxQixtQ0FBbUM7QUFFbkMsSUFBWSxhQVNYO0FBVEQsV0FBWSxhQUFhO0lBQ3ZCLHFEQUFVLENBQUE7SUFDViwyREFBUyxDQUFBO0lBQ1QsK0RBQVcsQ0FBQTtJQUNYLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsaURBQUksQ0FBQTtJQUNKLGlEQUFJLENBQUE7SUFDSixNQUFNO0FBQ1IsQ0FBQyxFQVRXLGFBQWEsR0FBYixxQkFBYSxLQUFiLHFCQUFhLFFBU3hCO0FBT0QsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFOUIsTUFBTSxRQUFRLEdBQW9DLFVBQWUsS0FBSyxFQUFFLEdBQUc7O1FBQ3pFLDRDQUE0QztRQUM1Qyw2Q0FBNkM7UUFDN0Msd0hBQXdIO1FBQ3hILHNDQUFzQztRQUN0QyxLQUFLO1FBRUwsSUFBSSxRQUFRLEdBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakMsT0FBTyxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0MsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO2dCQUNoQixNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUs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QkFDOUIsdUNBQXVDO29CQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUM1RSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQztxQkFDRCxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUMvQixFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQyxDQUFDLENBQUM7U0FFSjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsSUFBSSxNQUFNO2dCQUNSLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNmLE1BQU0sRUFBRSxDQUFDO1NBQ1Y7UUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztDQUFBO0FBNUJELGtDQTRCQyIsImZpbGUiOiJydW50aW1lL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9tYWlsL2ltYXAtbXNnLXBhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
