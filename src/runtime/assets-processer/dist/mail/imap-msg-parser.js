"use strict";
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
const parseLex = async function (reply, sub) {
    // const origWrite = reply._writeAndResolve;
    // reply._writeAndResolve = function(bytes) {
    //   fs.writeFileSync('imap-msg-parser.parseLex.log.txt', Buffer.from(Array.from(bytes)).toString('utf8'), {flag: 'a'});
    //   origWrite.apply(this, arguments);
    // };
    let nextByte = await reply.la();
    while (nextByte != null) {
        const next = String.fromCharCode(nextByte);
        if (' ' === next) {
            await reply.advance();
            // skip space char
        }
        else if (/[0-9]/.test(next)) {
            reply.startToken(ImapTokenType.number);
            await reply.advance();
            nextByte = await reply.la();
            while (nextByte != null && /[0-9.]/.test(String.fromCharCode(nextByte))) {
                await reply.advance();
                nextByte = await reply.la();
            }
            reply.emitToken();
        }
        else if ('\r' === next) {
            reply.startToken(ImapTokenType.CRLF);
            await reply.advance();
            const b = await reply.la();
            if (b != null && String.fromCharCode(b) === '\n')
                await reply.advance();
            reply.emitToken();
        }
        else if ('\n' === next) {
            reply.startToken(ImapTokenType.CRLF);
            await reply.advance();
            reply.emitToken();
        }
        else if ('"' === next) {
            reply.startToken(ImapTokenType.stringQuote);
            const openChar = await reply.advance();
            while (true) {
                const la = await reply.la();
                if (la == null) {
                    return reply.throwError();
                }
                if (String.fromCharCode(la) === '\\') {
                    await reply.advance(2);
                }
                else if (la === openChar) {
                    await reply.advance();
                    reply.emitToken();
                    break;
                }
                else {
                    await reply.advance();
                }
            }
        }
        else if ('{' === next) {
            const next2 = await reply.la(2);
            if (next2 != null && /\d/.test(String.fromCharCode(next2))) {
                await parseLiteralString(reply);
            }
            else {
                await parseAtom(reply);
            }
        }
        else if ('(' === next || ')' === next) {
            reply.startToken(ImapTokenType[next]);
            await reply.advance();
            reply.emitToken();
        }
        else {
            await parseAtom(reply);
        }
        nextByte = await reply.la();
    }
};
async function parseAtom(la) {
    la.startToken(ImapTokenType.atom);
    await la.advance();
    let nextByte = await la.la();
    while (nextByte != null && /[^\s{[()"]/.test(String.fromCharCode(nextByte))) {
        await la.advance();
        nextByte = await la.la();
    }
    la.emitToken();
}
async function parseLiteralString(reply) {
    const chunk = reply.startToken(ImapTokenType.stringLit, false);
    await reply.advance();
    let numStr = String.fromCharCode(await reply.advance());
    let next = await reply.la();
    while (next && next !== R_BRACE) {
        numStr += String.fromCharCode(next);
        await reply.advance();
        next = await reply.la();
    }
    await reply.advance();
    next = await reply.la();
    if (next == null)
        return reply.throwError();
    while (next === CR || next === LF) {
        await reply.advance();
        next = await reply.la();
    }
    const numByte = parseInt(numStr, 10);
    const buf = Buffer.alloc(numByte);
    let i = 0;
    // console.time('stringlit');
    while (i < numByte) {
        next = await reply.la();
        if (next == null) {
            return reply.throwError();
        }
        const char = await reply.advance();
        buf.writeUInt8(char, i);
        i++;
    }
    // console.timeEnd('stringlit');
    chunk.data = buf;
    reply.emitToken();
}
async function parseLine(la) {
    let buf;
    let word = await la.la();
    while (true) {
        if (word == null) {
            return;
        }
        if (buf == null)
            buf = [];
        if (word.type === ImapTokenType.CRLF) {
            await la.advance();
            return buf;
        }
        buf.push(word);
        await la.advance();
        word = await la.la();
    }
}
async function parseLines(lineSubject, la) {
    let line;
    do {
        line = await parseLine(la);
        if (line == null) {
            lineSubject.complete();
            break;
        }
        lineSubject.next(line);
    } while (true);
}
function createServerDataHandler() {
    const input = new rxjs_1.Subject();
    const parseServerReply = async (la) => {
        const lineSubject = new rxjs_1.Subject();
        parseLines(lineSubject, la);
        return lineSubject;
    };
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
async function connectImap(address) {
    const handler = createServerDataHandler();
    let socket;
    try {
        socket = await new Promise((resolve, reject) => {
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    handler.input(null);
    socket.end();
}
exports.connectImap = connectImap;
//# sourceMappingURL=imap-msg-parser.js.map