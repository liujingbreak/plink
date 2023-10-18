"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLines = exports.sendAppZip = void 0;
const tslib_1 = require("tslib");
const rxjs_1 = require("rxjs");
const http_1 = tslib_1.__importDefault(require("http"));
const https_1 = tslib_1.__importDefault(require("https"));
const url_1 = tslib_1.__importDefault(require("url"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const util_1 = tslib_1.__importDefault(require("util"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
// import PromQ from 'promise-queue';
const log = require('log4js').getLogger(__api_1.default.packageName + '.cd-client');
const RES_SKIP = 'Skip sending';
async function sendAppZip(opt = {}, file) {
    const argv = __api_1.default.argv;
    if (!opt.url)
        opt.url = argv.url;
    if (opt.numOfNode == null) {
        if (argv.numOfNode == null)
            opt.numOfNode = 1;
        else
            opt.numOfNode = parseInt(argv.numOfNode, 10);
    }
    if (opt.numOfConc == null) {
        if (argv.numOfConc == null)
            opt.numOfConc = 2;
        else
            opt.numOfConc = parseInt(argv.numOfConc, 10);
    }
    if (file == null)
        file = __api_1.default.argv.file;
    if (!opt.url) {
        throw new Error(`Missing arguments: url... in ${opt}`);
    }
    log.info(opt);
    let sendCount = 0;
    const bufferToSend = file ? fs_1.default.readFileSync(file) : undefined;
    let sha = '';
    if (bufferToSend) {
        const hash = crypto_1.default.createHash('sha256');
        hash.update(bufferToSend);
        sha = hash.digest('hex');
    }
    return new Promise((resolve, reject) => {
        // const concurQ = new PromQ(opt.numOfConc, 20);
        let finishedSet = new Set();
        for (let i = 0, l = opt.numOfConc; i < l; i++) {
            send();
        }
        async function send() {
            sendCount++;
            try {
                log.info('#%s sending App: %s', sendCount, sha);
                const reply = await sendRequest(opt, sha, bufferToSend);
                const match = /^\[ACCEPT\] \s*(\S+)\s+pid:/.exec(reply);
                if (match && match[1])
                    finishedSet.add(match[1]);
            }
            catch (ex) {
                if (ex.message !== RES_SKIP)
                    log.warn(ex);
            }
            if (finishedSet.size >= opt.numOfNode) {
                log.info(`All server recieved ${finishedSet.size} finished: ${Array.from(finishedSet.values()).join('\n')}`);
                resolve();
            }
            else if (sendCount > 15) {
                const msg = `Tried 15 times, ${finishedSet.size} finished: ${Array.from(finishedSet.values()).join('\n')}`;
                log.info(msg);
                reject(new Error(msg));
            }
            else {
                send();
            }
        }
    });
}
exports.sendAppZip = sendAppZip;
var SendState;
(function (SendState) {
    SendState[SendState["ready"] = 0] = "ready";
    SendState[SendState["sending"] = 1] = "sending";
    SendState[SendState["sent"] = 2] = "sent";
})(SendState || (SendState = {}));
function sendRequest(opt, sha, buffer) {
    const urlObj = url_1.default.parse(opt.url, true);
    let url = opt.url + `/${encodeURIComponent(opt.remoteFile)}/${encodeURIComponent(sha)}`;
    if (opt.secret) {
        url += '?whisper=' + encodeURIComponent(opt.secret);
    }
    let sendState = SendState.ready;
    return new Promise((resolve, reject) => {
        let req;
        const reqOpt = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        };
        if (urlObj.protocol === 'http:') {
            req = http_1.default.request(url, reqOpt, onResponse);
        }
        else {
            req = https_1.default.request(url, reqOpt, onResponse);
        }
        function onResponse(res) {
            const status = res.statusCode;
            if (status == null) {
                reject(new Error('response status Null'));
                return;
            }
            res.setEncoding('utf8');
            let buf = '';
            res.on('data', (chunk) => {
                buf += chunk;
            });
            res.on('end', () => {
                log.info('recieve: ', buf);
                if (status === 409) {
                    if (timer) {
                        clearTimeout(timer);
                        req.end();
                        log.info('Skip sending');
                    }
                    reject(new Error(RES_SKIP));
                    return;
                }
                else if (status < 200 || status > 299) {
                    reject(new Error(`status: ${status} ${res.statusMessage}, headers: ${util_1.default.inspect(res.headers)}`));
                    return;
                }
                resolve(buf);
            });
        }
        req.on('error', err => reject(err));
        let timer = setTimeout(() => {
            timer = null;
            sendState++;
            if (buffer)
                log.info('sending....%s b', buffer.byteLength);
            req.end(buffer ? buffer : 'ok', () => {
                sendState++;
                log.info('done sending body ', sendState);
            });
        }, 1000);
    });
}
const LR = '\n'.charCodeAt(0);
// async function connectToContentServer(opt: Options) {
//   enum State {
//     wait4ServerInfo = 0,
//     wait4UploadAck
//   }
//   let state = State.wait4ServerInfo;
//   let socket: TLSSocket|undefined;
//   try {
//     socket = await new Promise<ReturnType<typeof tslConnect>>((resolve, reject) => {
//       const socket = tslConnect({
//         host: opt.host, port: opt.port,
//         enableTrace: true
//       } as ConnectionOptions);
//       fromEventPattern<Buffer>(handler => {
//         socket!.on('data', handler);
//       })
//       .pipe(
//         toLines,
//         tap(onEachReply)
//       ).subscribe();
//       socket.on('secureConnect', () => {
//         log.info('connected', socket.authorized ? 'authorized' : 'unauthorized');
//         resolve(socket);
//       })
//       .on('error', err => reject(err))
//       .on('timeout', () => reject(new Error('Timeout')));
//     });
//   } catch (ex) {
//     if (socket)
//       socket.end();
//   }
//   function onEachReply(line: string) {
//     log.info('<=', line);
//     switch (state) {
//       case State.wait4ServerInfo:
//         state++;
//         break;
//       case State.wait4UploadAck:
//       default:
//     }
//   }
// }
function toLines(src) {
    let chars = Buffer.alloc(100);
    let charsOffset = 0;
    return (0, rxjs_1.defer)(() => {
        const sub = new rxjs_1.Subject();
        src.subscribe(data => {
            for (const byte of data) {
                if (byte === LR) {
                    sub.next(chars.toString('utf8', 0, charsOffset));
                    charsOffset = 0;
                    continue;
                }
                if (chars.byteLength === charsOffset) {
                    let newChars = Buffer.alloc(Math.ceil(chars.byteLength * 1.3));
                    chars.copy(newChars, 0, 0, chars.byteLength);
                    chars = newChars;
                }
                chars.writeUInt8(byte, charsOffset++);
            }
        }, err => sub.error(err), () => sub.complete());
        return sub;
    });
}
exports.toLines = toLines;
//# sourceMappingURL=cd-client.js.map