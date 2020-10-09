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

//# sourceMappingURL=imap-msg-parser.js.map
