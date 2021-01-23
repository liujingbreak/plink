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
    return rxjs_1.defer(() => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2QtY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2QtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFrRDtBQUNsRCxnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLDhDQUFzQjtBQUN0QixrREFBd0I7QUFFeEIsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixvREFBNEI7QUFDNUIscUNBQXFDO0FBQ3JDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUV4RSxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUM7QUFlaEMsU0FBc0IsVUFBVSxDQUFDLE1BQWUsRUFBYSxFQUFFLElBQWE7O1FBQzFFLE1BQU0sSUFBSSxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ1YsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBRXJCLElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtRQUVELElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtR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YUFDdkM7UUFDSCxDQUFDLEVBQ0QsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUNyQixHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQ3JCLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQXpCRCwwQkF5QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZWZlciwgT2JzZXJ2YWJsZSwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBDaGVja3N1bSB9IGZyb20gJy4uL2ZldGNoLXR5cGVzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbi8vIGltcG9ydCBQcm9tUSBmcm9tICdwcm9taXNlLXF1ZXVlJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNkLWNsaWVudCcpO1xuXG5jb25zdCBSRVNfU0tJUCA9ICdTa2lwIHNlbmRpbmcnO1xuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAgdXJsOiBzdHJpbmc7XG4gIC8qKiBOYW1lIG9mIHRoZSBmaWxlIHRvIGJlIGNyZWF0ZWQgb3IgcmVwbGFjZWQgaW4gcmVtb3RlIHNlcnZlciovXG4gIHJlbW90ZUZpbGU6IHN0cmluZztcbiAgbnVtT2ZOb2RlOiBudW1iZXI7XG4gIG51bU9mQ29uYzogbnVtYmVyOyAvLyBudW1iZXIgb2YgY29uY3VycmVudCByZXF1ZXN0XG4gIHNlY3JldD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJNZXRhSW5mbyB7XG4gIGNoZWNrc3VtOiBDaGVja3N1bTtcbiAgaWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRBcHBaaXAob3B0OiBPcHRpb25zID0ge30gYXMgT3B0aW9ucywgZmlsZT86IHN0cmluZykge1xuICBjb25zdCBhcmd2ID0gYXBpLmFyZ3Y7XG4gIGlmICghb3B0LnVybClcbiAgICBvcHQudXJsID0gYXJndi51cmw7XG5cbiAgaWYgKG9wdC5udW1PZk5vZGUgPT0gbnVsbCkge1xuICAgIGlmIChhcmd2Lm51bU9mTm9kZSA9PSBudWxsKVxuICAgICAgb3B0Lm51bU9mTm9kZSA9IDE7XG4gICAgZWxzZVxuICAgICAgb3B0Lm51bU9mTm9kZSA9IHBhcnNlSW50KGFyZ3YubnVtT2ZOb2RlLCAxMCk7XG4gIH1cblxuICBpZiAob3B0Lm51bU9mQ29uYyA9PSBudWxsKSB7XG4gICAgaWYgKGFyZ3YubnVtT2ZDb25jID09IG51bGwpXG4gICAgICBvcHQubnVtT2ZDb25jID0gMjtcbiAgICBlbHNlXG4gICAgICBvcHQubnVtT2ZDb25jID0gcGFyc2VJbnQoYXJndi5udW1PZkNvbmMsIDEwKTtcbiAgfVxuXG4gIGlmIChmaWxlID09IG51bGwpXG4gICAgZmlsZSA9IGFwaS5hcmd2LmZpbGU7XG5cbiAgaWYgKCFvcHQudXJsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGFyZ3VtZW50czogdXJsLi4uIGluICR7b3B0fWApO1xuICB9XG4gIGxvZy5pbmZvKG9wdCk7XG5cbiAgbGV0IHNlbmRDb3VudCA9IDA7XG5cbiAgY29uc3QgYnVmZmVyVG9TZW5kID0gZmlsZSA/IGZzLnJlYWRGaWxlU3luYyhmaWxlKSA6IHVuZGVmaW5lZDtcbiAgbGV0IHNoYSA9ICcnO1xuICBpZiAoYnVmZmVyVG9TZW5kKSB7XG4gICAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKTtcbiAgICBoYXNoLnVwZGF0ZShidWZmZXJUb1NlbmQpO1xuICAgIHNoYSA9IGhhc2guZGlnZXN0KCdoZXgnKTtcbiAgfVxuXG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAvLyBjb25zdCBjb25jdXJRID0gbmV3IFByb21RKG9wdC5udW1PZkNvbmMsIDIwKTtcblxuICAgIGxldCBmaW5pc2hlZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBvcHQubnVtT2ZDb25jOyBpIDwgbDsgaSsrKSB7XG4gICAgICBzZW5kKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gc2VuZCgpIHtcbiAgICAgIHNlbmRDb3VudCsrO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nLmluZm8oJyMlcyBzZW5kaW5nIEFwcDogJXMnLCBzZW5kQ291bnQsIHNoYSk7XG4gICAgICAgIGNvbnN0IHJlcGx5ID0gYXdhaXQgc2VuZFJlcXVlc3Qob3B0LCBzaGEsIGJ1ZmZlclRvU2VuZCk7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gL15cXFtBQ0NFUFRcXF0gXFxzKihcXFMrKVxccytwaWQ6Ly5leGVjKHJlcGx5KTtcbiAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoWzFdKVxuICAgICAgICBmaW5pc2hlZFNldC5hZGQobWF0Y2hbMV0pO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgaWYgKGV4Lm1lc3NhZ2UgIT09IFJFU19TS0lQKVxuICAgICAgICAgIGxvZy53YXJuKGV4KTtcbiAgICAgIH1cbiAgICAgIGlmIChmaW5pc2hlZFNldC5zaXplID49IG9wdC5udW1PZk5vZGUpIHtcbiAgICAgICAgbG9nLmluZm8oYEFsbCBzZXJ2ZXIgcmVjaWV2ZWQgJHtmaW5pc2hlZFNldC5zaXplfSBmaW5pc2hlZDogJHtBcnJheS5mcm9tKGZpbmlzaGVkU2V0LnZhbHVlcygpKS5qb2luKCdcXG4nKX1gKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfSBlbHNlIGlmIChzZW5kQ291bnQgPiAxNSkge1xuICAgICAgICBjb25zdCBtc2cgPSBgVHJpZWQgMTUgdGltZXMsICR7ZmluaXNoZWRTZXQuc2l6ZX0gZmluaXNoZWQ6ICR7QXJyYXkuZnJvbShmaW5pc2hlZFNldC52YWx1ZXMoKSkuam9pbignXFxuJyl9YDtcbiAgICAgICAgbG9nLmluZm8obXNnKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbmQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG5lbnVtIFNlbmRTdGF0ZSB7XG4gIHJlYWR5ID0gMCwgc2VuZGluZywgc2VudFxufVxuZnVuY3Rpb24gc2VuZFJlcXVlc3Qob3B0OiBPcHRpb25zLCBzaGE6IHN0cmluZywgYnVmZmVyPzogQnVmZmVyKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgdXJsT2JqID0gVXJsLnBhcnNlKG9wdC51cmwsIHRydWUpO1xuICBsZXQgdXJsID0gb3B0LnVybCArIGAvJHtlbmNvZGVVUklDb21wb25lbnQob3B0LnJlbW90ZUZpbGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChzaGEpfWA7XG5cbiAgaWYgKG9wdC5zZWNyZXQpIHtcbiAgICB1cmwgKz0gJz93aGlzcGVyPScgKyBlbmNvZGVVUklDb21wb25lbnQob3B0LnNlY3JldCk7XG4gIH1cblxuICBsZXQgc2VuZFN0YXRlID0gU2VuZFN0YXRlLnJlYWR5O1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgcmVxOiBodHRwLkNsaWVudFJlcXVlc3Q7XG4gICAgY29uc3QgcmVxT3B0OiBodHRwLlJlcXVlc3RPcHRpb25zID0ge1xuICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh1cmxPYmoucHJvdG9jb2wgPT09ICdodHRwOicpIHtcbiAgICAgIHJlcSA9IGh0dHAucmVxdWVzdCh1cmwsIHJlcU9wdCwgb25SZXNwb25zZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcSA9IGh0dHBzLnJlcXVlc3QodXJsLCByZXFPcHQsIG9uUmVzcG9uc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzcG9uc2UocmVzOiBodHRwLkluY29taW5nTWVzc2FnZSkge1xuICAgICAgY29uc3Qgc3RhdHVzID0gcmVzLnN0YXR1c0NvZGU7XG4gICAgICBpZiAoc3RhdHVzID09IG51bGwpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcigncmVzcG9uc2Ugc3RhdHVzIE51bGwnKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVzLnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICBsZXQgYnVmID0gJyc7XG4gICAgICByZXMub24oJ2RhdGEnLCAoY2h1bms6IHN0cmluZykgPT4ge1xuICAgICAgICBidWYgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICAgIHJlcy5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygncmVjaWV2ZTogJywgYnVmKTtcblxuICAgICAgICBpZiAoc3RhdHVzID09PSA0MDkpIHtcbiAgICAgICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICByZXEuZW5kKCk7XG4gICAgICAgICAgICBsb2cuaW5mbygnU2tpcCBzZW5kaW5nJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoUkVTX1NLSVApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzIDwgMjAwIHx8IHN0YXR1cyA+IDI5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYHN0YXR1czogJHtzdGF0dXN9ICR7cmVzLnN0YXR1c01lc3NhZ2V9LCBoZWFkZXJzOiAke3V0aWwuaW5zcGVjdChyZXMuaGVhZGVycyl9YCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKGJ1Zik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXEub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKTtcbiAgICBsZXQgdGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgc2VuZFN0YXRlKys7XG4gICAgICBpZiAoYnVmZmVyKVxuICAgICAgICBsb2cuaW5mbygnc2VuZGluZy4uLi4lcyBiJywgYnVmZmVyIS5ieXRlTGVuZ3RoKTtcbiAgICAgIHJlcS5lbmQoYnVmZmVyID8gYnVmZmVyIDogJ29rJywgKCkgPT4ge1xuICAgICAgICBzZW5kU3RhdGUrKztcbiAgICAgICAgbG9nLmluZm8oJ2RvbmUgc2VuZGluZyBib2R5ICcsIHNlbmRTdGF0ZSk7XG4gICAgICB9KTtcbiAgICB9LCAxMDAwKTtcbiAgfSk7XG59XG5cbmNvbnN0IExSID0gJ1xcbicuY2hhckNvZGVBdCgwKTtcblxuLy8gYXN5bmMgZnVuY3Rpb24gY29ubmVjdFRvQ29udGVudFNlcnZlcihvcHQ6IE9wdGlvbnMpIHtcbi8vICAgZW51bSBTdGF0ZSB7XG4vLyAgICAgd2FpdDRTZXJ2ZXJJbmZvID0gMCxcbi8vICAgICB3YWl0NFVwbG9hZEFja1xuLy8gICB9XG4vLyAgIGxldCBzdGF0ZSA9IFN0YXRlLndhaXQ0U2VydmVySW5mbztcbi8vICAgbGV0IHNvY2tldDogVExTU29ja2V0fHVuZGVmaW5lZDtcbi8vICAgdHJ5IHtcbi8vICAgICBzb2NrZXQgPSBhd2FpdCBuZXcgUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiB0c2xDb25uZWN0Pj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuLy8gICAgICAgY29uc3Qgc29ja2V0ID0gdHNsQ29ubmVjdCh7XG4vLyAgICAgICAgIGhvc3Q6IG9wdC5ob3N0LCBwb3J0OiBvcHQucG9ydCxcbi8vICAgICAgICAgZW5hYmxlVHJhY2U6IHRydWVcbi8vICAgICAgIH0gYXMgQ29ubmVjdGlvbk9wdGlvbnMpO1xuXG4vLyAgICAgICBmcm9tRXZlbnRQYXR0ZXJuPEJ1ZmZlcj4oaGFuZGxlciA9PiB7XG4vLyAgICAgICAgIHNvY2tldCEub24oJ2RhdGEnLCBoYW5kbGVyKTtcbi8vICAgICAgIH0pXG4vLyAgICAgICAucGlwZShcbi8vICAgICAgICAgdG9MaW5lcyxcbi8vICAgICAgICAgdGFwKG9uRWFjaFJlcGx5KVxuLy8gICAgICAgKS5zdWJzY3JpYmUoKTtcblxuLy8gICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuLy8gICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4vLyAgICAgICAgIHJlc29sdmUoc29ja2V0KTtcbi8vICAgICAgIH0pXG4vLyAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuLy8gICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4vLyAgICAgfSk7XG4vLyAgIH0gY2F0Y2ggKGV4KSB7XG4vLyAgICAgaWYgKHNvY2tldClcbi8vICAgICAgIHNvY2tldC5lbmQoKTtcbi8vICAgfVxuXG4vLyAgIGZ1bmN0aW9uIG9uRWFjaFJlcGx5KGxpbmU6IHN0cmluZykge1xuLy8gICAgIGxvZy5pbmZvKCc8PScsIGxpbmUpO1xuLy8gICAgIHN3aXRjaCAoc3RhdGUpIHtcbi8vICAgICAgIGNhc2UgU3RhdGUud2FpdDRTZXJ2ZXJJbmZvOlxuLy8gICAgICAgICBzdGF0ZSsrO1xuXG4vLyAgICAgICAgIGJyZWFrO1xuLy8gICAgICAgY2FzZSBTdGF0ZS53YWl0NFVwbG9hZEFjazpcbi8vICAgICAgIGRlZmF1bHQ6XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmV4cG9ydCBmdW5jdGlvbiB0b0xpbmVzKHNyYzogT2JzZXJ2YWJsZTxCdWZmZXI+KSB7XG4gIGxldCBjaGFycyA9IEJ1ZmZlci5hbGxvYygxMDApO1xuICAgIGxldCBjaGFyc09mZnNldCA9IDA7XG4gICAgcmV0dXJuIGRlZmVyKCgpID0+IHtcbiAgICAgIGNvbnN0IHN1YiA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICAgIHNyYy5zdWJzY3JpYmUoZGF0YSA9PiB7XG4gICAgICAgICAgZm9yIChjb25zdCBieXRlIG9mIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChieXRlID09PSBMUikge1xuICAgICAgICAgICAgICBzdWIubmV4dChjaGFycy50b1N0cmluZygndXRmOCcsIDAsIGNoYXJzT2Zmc2V0KSk7XG4gICAgICAgICAgICAgIGNoYXJzT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hhcnMuYnl0ZUxlbmd0aCA9PT0gY2hhcnNPZmZzZXQpIHtcbiAgICAgICAgICAgICAgbGV0IG5ld0NoYXJzID0gQnVmZmVyLmFsbG9jKE1hdGguY2VpbChjaGFycy5ieXRlTGVuZ3RoICogMS4zKSk7XG4gICAgICAgICAgICAgIGNoYXJzLmNvcHkobmV3Q2hhcnMsIDAsIDAsIGNoYXJzLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgICBjaGFycyA9IG5ld0NoYXJzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hhcnMud3JpdGVVSW50OChieXRlLCBjaGFyc09mZnNldCsrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gc3ViLmNvbXBsZXRlKClcbiAgICAgICk7XG4gICAgICByZXR1cm4gc3ViO1xuICAgIH0pO1xufVxuIl19