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
exports.toLines = exports.sendAppZip = void 0;
const rxjs_1 = require("rxjs");
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const url_1 = __importDefault(require("url"));
const __api_1 = __importDefault(require("__api"));
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
// import PromQ from 'promise-queue';
const log = require('log4js').getLogger(__api_1.default.packageName + '.cd-client');
const RES_SKIP = 'Skip sending';
function sendAppZip(opt = {}, file) {
    return __awaiter(this, void 0, void 0, function* () {
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
            function send() {
                return __awaiter(this, void 0, void 0, function* () {
                    sendCount++;
                    try {
                        log.info('#%s sending App: %s', sendCount, sha);
                        const reply = yield sendRequest(opt, sha, bufferToSend);
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
                });
            }
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2QtY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2QtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFrRDtBQUNsRCxnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLDhDQUFzQjtBQUN0QixrREFBd0I7QUFFeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixvREFBNEI7QUFDNUIscUNBQXFDO0FBQ3JDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUV4RSxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUM7QUFlaEMsU0FBc0IsVUFBVSxDQUFDLE1BQWUsRUFBYSxFQUFFLElBQWE7O1FBQzFFLE1BQU0sSUFBSSxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ1YsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBRXJCLElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtRQUVELElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtR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Q0FBQzthQUN2QztRQUNILENBQUMsRUFDRCxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQ3JCLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FDckIsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBekJELDBCQXlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlZmVyLCBPYnNlcnZhYmxlLCBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCBodHRwcyBmcm9tICdodHRwcyc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IENoZWNrc3VtIH0gZnJvbSAnLi4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuLy8gaW1wb3J0IFByb21RIGZyb20gJ3Byb21pc2UtcXVldWUnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY2QtY2xpZW50Jyk7XG5cbmNvbnN0IFJFU19TS0lQID0gJ1NraXAgc2VuZGluZyc7XG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICB1cmw6IHN0cmluZztcbiAgLyoqIE5hbWUgb2YgdGhlIGZpbGUgdG8gYmUgY3JlYXRlZCBvciByZXBsYWNlZCBpbiByZW1vdGUgc2VydmVyKi9cbiAgcmVtb3RlRmlsZTogc3RyaW5nO1xuICBudW1PZk5vZGU6IG51bWJlcjtcbiAgbnVtT2ZDb25jOiBudW1iZXI7IC8vIG51bWJlciBvZiBjb25jdXJyZW50IHJlcXVlc3RcbiAgc2VjcmV0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlck1ldGFJbmZvIHtcbiAgY2hlY2tzdW06IENoZWNrc3VtO1xuICBpZDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZEFwcFppcChvcHQ6IE9wdGlvbnMgPSB7fSBhcyBPcHRpb25zLCBmaWxlPzogc3RyaW5nKSB7XG4gIGNvbnN0IGFyZ3YgPSBhcGkuYXJndjtcbiAgaWYgKCFvcHQudXJsKVxuICAgIG9wdC51cmwgPSBhcmd2LnVybDtcblxuICBpZiAob3B0Lm51bU9mTm9kZSA9PSBudWxsKSB7XG4gICAgaWYgKGFyZ3YubnVtT2ZOb2RlID09IG51bGwpXG4gICAgICBvcHQubnVtT2ZOb2RlID0gMTtcbiAgICBlbHNlXG4gICAgICBvcHQubnVtT2ZOb2RlID0gcGFyc2VJbnQoYXJndi5udW1PZk5vZGUsIDEwKTtcbiAgfVxuXG4gIGlmIChvcHQubnVtT2ZDb25jID09IG51bGwpIHtcbiAgICBpZiAoYXJndi5udW1PZkNvbmMgPT0gbnVsbClcbiAgICAgIG9wdC5udW1PZkNvbmMgPSAyO1xuICAgIGVsc2VcbiAgICAgIG9wdC5udW1PZkNvbmMgPSBwYXJzZUludChhcmd2Lm51bU9mQ29uYywgMTApO1xuICB9XG5cbiAgaWYgKGZpbGUgPT0gbnVsbClcbiAgICBmaWxlID0gYXBpLmFyZ3YuZmlsZTtcblxuICBpZiAoIW9wdC51cmwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgYXJndW1lbnRzOiB1cmwuLi4gaW4gJHtvcHR9YCk7XG4gIH1cbiAgbG9nLmluZm8ob3B0KTtcblxuICBsZXQgc2VuZENvdW50ID0gMDtcblxuICBjb25zdCBidWZmZXJUb1NlbmQgPSBmaWxlID8gZnMucmVhZEZpbGVTeW5jKGZpbGUpIDogdW5kZWZpbmVkO1xuICBsZXQgc2hhID0gJyc7XG4gIGlmIChidWZmZXJUb1NlbmQpIHtcbiAgICBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgIGhhc2gudXBkYXRlKGJ1ZmZlclRvU2VuZCk7XG4gICAgc2hhID0gaGFzaC5kaWdlc3QoJ2hleCcpO1xuICB9XG5cblxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIC8vIGNvbnN0IGNvbmN1clEgPSBuZXcgUHJvbVEob3B0Lm51bU9mQ29uYywgMjApO1xuXG4gICAgbGV0IGZpbmlzaGVkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IG9wdC5udW1PZkNvbmM7IGkgPCBsOyBpKyspIHtcbiAgICAgIHNlbmQoKTtcbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBzZW5kKCkge1xuICAgICAgc2VuZENvdW50Kys7XG4gICAgICB0cnkge1xuICAgICAgICBsb2cuaW5mbygnIyVzIHNlbmRpbmcgQXBwOiAlcycsIHNlbmRDb3VudCwgc2hhKTtcbiAgICAgICAgY29uc3QgcmVwbHkgPSBhd2FpdCBzZW5kUmVxdWVzdChvcHQsIHNoYSwgYnVmZmVyVG9TZW5kKTtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXlxcW0FDQ0VQVFxcXSBcXHMqKFxcUyspXFxzK3BpZDovLmV4ZWMocmVwbHkpO1xuICAgICAgICBpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pXG4gICAgICAgIGZpbmlzaGVkU2V0LmFkZChtYXRjaFsxXSk7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBpZiAoZXgubWVzc2FnZSAhPT0gUkVTX1NLSVApXG4gICAgICAgICAgbG9nLndhcm4oZXgpO1xuICAgICAgfVxuICAgICAgaWYgKGZpbmlzaGVkU2V0LnNpemUgPj0gb3B0Lm51bU9mTm9kZSkge1xuICAgICAgICBsb2cuaW5mbyhgQWxsIHNlcnZlciByZWNpZXZlZCAke2ZpbmlzaGVkU2V0LnNpemV9IGZpbmlzaGVkOiAke0FycmF5LmZyb20oZmluaXNoZWRTZXQudmFsdWVzKCkpLmpvaW4oJ1xcbicpfWApO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9IGVsc2UgaWYgKHNlbmRDb3VudCA+IDE1KSB7XG4gICAgICAgIGNvbnN0IG1zZyA9IGBUcmllZCAxNSB0aW1lcywgJHtmaW5pc2hlZFNldC5zaXplfSBmaW5pc2hlZDogJHtBcnJheS5mcm9tKGZpbmlzaGVkU2V0LnZhbHVlcygpKS5qb2luKCdcXG4nKX1gO1xuICAgICAgICBsb2cuaW5mbyhtc2cpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKG1zZykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VuZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmVudW0gU2VuZFN0YXRlIHtcbiAgcmVhZHkgPSAwLCBzZW5kaW5nLCBzZW50XG59XG5mdW5jdGlvbiBzZW5kUmVxdWVzdChvcHQ6IE9wdGlvbnMsIHNoYTogc3RyaW5nLCBidWZmZXI/OiBCdWZmZXIpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB1cmxPYmogPSBVcmwucGFyc2Uob3B0LnVybCwgdHJ1ZSk7XG4gIGxldCB1cmwgPSBvcHQudXJsICsgYC8ke2VuY29kZVVSSUNvbXBvbmVudChvcHQucmVtb3RlRmlsZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHNoYSl9YDtcblxuICBpZiAob3B0LnNlY3JldCkge1xuICAgIHVybCArPSAnP3doaXNwZXI9JyArIGVuY29kZVVSSUNvbXBvbmVudChvcHQuc2VjcmV0KTtcbiAgfVxuXG4gIGxldCBzZW5kU3RhdGUgPSBTZW5kU3RhdGUucmVhZHk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCByZXE6IGh0dHAuQ2xpZW50UmVxdWVzdDtcbiAgICBjb25zdCByZXFPcHQ6IGh0dHAuUmVxdWVzdE9wdGlvbnMgPSB7XG4gICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHVybE9iai5wcm90b2NvbCA9PT0gJ2h0dHA6Jykge1xuICAgICAgcmVxID0gaHR0cC5yZXF1ZXN0KHVybCwgcmVxT3B0LCBvblJlc3BvbnNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxID0gaHR0cHMucmVxdWVzdCh1cmwsIHJlcU9wdCwgb25SZXNwb25zZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZXNwb25zZShyZXM6IGh0dHAuSW5jb21pbmdNZXNzYWdlKSB7XG4gICAgICBjb25zdCBzdGF0dXMgPSByZXMuc3RhdHVzQ29kZTtcbiAgICAgIGlmIChzdGF0dXMgPT0gbnVsbCkge1xuICAgICAgICByZWplY3QobmV3IEVycm9yKCdyZXNwb25zZSBzdGF0dXMgTnVsbCcpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXMuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgICAgIGxldCBidWYgPSAnJztcbiAgICAgIHJlcy5vbignZGF0YScsIChjaHVuazogc3RyaW5nKSA9PiB7XG4gICAgICAgIGJ1ZiArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgICAgcmVzLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdyZWNpZXZlOiAnLCBidWYpO1xuXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDQwOSkge1xuICAgICAgICAgIGlmICh0aW1lcikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgIHJlcS5lbmQoKTtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdTa2lwIHNlbmRpbmcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihSRVNfU0tJUCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPCAyMDAgfHwgc3RhdHVzID4gMjk5KSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgc3RhdHVzOiAke3N0YXR1c30gJHtyZXMuc3RhdHVzTWVzc2FnZX0sIGhlYWRlcnM6ICR7dXRpbC5pbnNwZWN0KHJlcy5oZWFkZXJzKX1gKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUoYnVmKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlcS5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpO1xuICAgIGxldCB0aW1lcjogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aW1lciA9IG51bGw7XG4gICAgICBzZW5kU3RhdGUrKztcbiAgICAgIGlmIChidWZmZXIpXG4gICAgICAgIGxvZy5pbmZvKCdzZW5kaW5nLi4uLiVzIGInLCBidWZmZXIhLmJ5dGVMZW5ndGgpO1xuICAgICAgcmVxLmVuZChidWZmZXIgPyBidWZmZXIgOiAnb2snLCAoKSA9PiB7XG4gICAgICAgIHNlbmRTdGF0ZSsrO1xuICAgICAgICBsb2cuaW5mbygnZG9uZSBzZW5kaW5nIGJvZHkgJywgc2VuZFN0YXRlKTtcbiAgICAgIH0pO1xuICAgIH0sIDEwMDApO1xuICB9KTtcbn1cblxuY29uc3QgTFIgPSAnXFxuJy5jaGFyQ29kZUF0KDApO1xuXG4vLyBhc3luYyBmdW5jdGlvbiBjb25uZWN0VG9Db250ZW50U2VydmVyKG9wdDogT3B0aW9ucykge1xuLy8gICBlbnVtIFN0YXRlIHtcbi8vICAgICB3YWl0NFNlcnZlckluZm8gPSAwLFxuLy8gICAgIHdhaXQ0VXBsb2FkQWNrXG4vLyAgIH1cbi8vICAgbGV0IHN0YXRlID0gU3RhdGUud2FpdDRTZXJ2ZXJJbmZvO1xuLy8gICBsZXQgc29ja2V0OiBUTFNTb2NrZXR8dW5kZWZpbmVkO1xuLy8gICB0cnkge1xuLy8gICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4vLyAgICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbi8vICAgICAgICAgaG9zdDogb3B0Lmhvc3QsIHBvcnQ6IG9wdC5wb3J0LFxuLy8gICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuLy8gICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbi8vICAgICAgIGZyb21FdmVudFBhdHRlcm48QnVmZmVyPihoYW5kbGVyID0+IHtcbi8vICAgICAgICAgc29ja2V0IS5vbignZGF0YScsIGhhbmRsZXIpO1xuLy8gICAgICAgfSlcbi8vICAgICAgIC5waXBlKFxuLy8gICAgICAgICB0b0xpbmVzLFxuLy8gICAgICAgICB0YXAob25FYWNoUmVwbHkpXG4vLyAgICAgICApLnN1YnNjcmliZSgpO1xuXG4vLyAgICAgICBzb2NrZXQub24oJ3NlY3VyZUNvbm5lY3QnLCAoKSA9PiB7XG4vLyAgICAgICAgIGxvZy5pbmZvKCdjb25uZWN0ZWQnLCBzb2NrZXQuYXV0aG9yaXplZCA/ICdhdXRob3JpemVkJyA6ICd1bmF1dGhvcml6ZWQnKTtcbi8vICAgICAgICAgcmVzb2x2ZShzb2NrZXQpO1xuLy8gICAgICAgfSlcbi8vICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpXG4vLyAgICAgICAub24oJ3RpbWVvdXQnLCAoKSA9PiByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpKTtcbi8vICAgICB9KTtcbi8vICAgfSBjYXRjaCAoZXgpIHtcbi8vICAgICBpZiAoc29ja2V0KVxuLy8gICAgICAgc29ja2V0LmVuZCgpO1xuLy8gICB9XG5cbi8vICAgZnVuY3Rpb24gb25FYWNoUmVwbHkobGluZTogc3RyaW5nKSB7XG4vLyAgICAgbG9nLmluZm8oJzw9JywgbGluZSk7XG4vLyAgICAgc3dpdGNoIChzdGF0ZSkge1xuLy8gICAgICAgY2FzZSBTdGF0ZS53YWl0NFNlcnZlckluZm86XG4vLyAgICAgICAgIHN0YXRlKys7XG5cbi8vICAgICAgICAgYnJlYWs7XG4vLyAgICAgICBjYXNlIFN0YXRlLndhaXQ0VXBsb2FkQWNrOlxuLy8gICAgICAgZGVmYXVsdDpcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvTGluZXMoc3JjOiBPYnNlcnZhYmxlPEJ1ZmZlcj4pIHtcbiAgbGV0IGNoYXJzID0gQnVmZmVyLmFsbG9jKDEwMCk7XG4gICAgbGV0IGNoYXJzT2Zmc2V0ID0gMDtcbiAgICByZXR1cm4gZGVmZXIoKCkgPT4ge1xuICAgICAgY29uc3Qgc3ViID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICAgICAgc3JjLnN1YnNjcmliZShkYXRhID0+IHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGJ5dGUgb2YgZGF0YSkge1xuICAgICAgICAgICAgaWYgKGJ5dGUgPT09IExSKSB7XG4gICAgICAgICAgICAgIHN1Yi5uZXh0KGNoYXJzLnRvU3RyaW5nKCd1dGY4JywgMCwgY2hhcnNPZmZzZXQpKTtcbiAgICAgICAgICAgICAgY2hhcnNPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGFycy5ieXRlTGVuZ3RoID09PSBjaGFyc09mZnNldCkge1xuICAgICAgICAgICAgICBsZXQgbmV3Q2hhcnMgPSBCdWZmZXIuYWxsb2MoTWF0aC5jZWlsKGNoYXJzLmJ5dGVMZW5ndGggKiAxLjMpKTtcbiAgICAgICAgICAgICAgY2hhcnMuY29weShuZXdDaGFycywgMCwgMCwgY2hhcnMuYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgICAgIGNoYXJzID0gbmV3Q2hhcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGFycy53cml0ZVVJbnQ4KGJ5dGUsIGNoYXJzT2Zmc2V0KyspO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiBzdWIuY29tcGxldGUoKVxuICAgICAgKTtcbiAgICAgIHJldHVybiBzdWI7XG4gICAgfSk7XG59XG4iXX0=