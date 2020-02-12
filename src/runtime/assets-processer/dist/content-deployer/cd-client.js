"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
function sendAppZip(opt = {}, file) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                return tslib_1.__awaiter(this, void 0, void 0, function* () {
                    sendCount++;
                    try {
                        log.info('#%s sending App: %s', sendCount, opt.file, sha);
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
    let url = opt.url + `/${encodeURIComponent(opt.file)}/${encodeURIComponent(sha)}`;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsMERBQTBCO0FBQzFCLHNEQUFzQjtBQUN0QiwwREFBd0I7QUFFeEIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQiw0REFBNEI7QUFDNUIscUNBQXFDO0FBQ3JDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUV4RSxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUM7QUFjaEMsU0FBc0IsVUFBVSxDQUFDLE1BQWUsRUFBYSxFQUFFLElBQWE7O1FBQzFFLE1BQU0sSUFBSSxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ1YsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBRXJCLElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtRQUVELElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FB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QUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQzthQUN2QztRQUNILENBQUMsRUFDRCxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQ3JCLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FDckIsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBekJELDBCQXlCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGVmZXIsIE9ic2VydmFibGUsIFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0IGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgQ2hlY2tzdW0gfSBmcm9tICcuLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG4vLyBpbXBvcnQgUHJvbVEgZnJvbSAncHJvbWlzZS1xdWV1ZSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jZC1jbGllbnQnKTtcblxuY29uc3QgUkVTX1NLSVAgPSAnU2tpcCBzZW5kaW5nJztcbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gIHVybDogc3RyaW5nO1xuICBmaWxlOiBzdHJpbmc7XG4gIG51bU9mTm9kZTogbnVtYmVyO1xuICBudW1PZkNvbmM6IG51bWJlcjsgLy8gbnVtYmVyIG9mIGNvbmN1cnJlbnQgcmVxdWVzdFxuICBzZWNyZXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyTWV0YUluZm8ge1xuICBjaGVja3N1bTogQ2hlY2tzdW07XG4gIGlkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZW5kQXBwWmlwKG9wdDogT3B0aW9ucyA9IHt9IGFzIE9wdGlvbnMsIGZpbGU/OiBzdHJpbmcpIHtcbiAgY29uc3QgYXJndiA9IGFwaS5hcmd2O1xuICBpZiAoIW9wdC51cmwpXG4gICAgb3B0LnVybCA9IGFyZ3YudXJsO1xuXG4gIGlmIChvcHQubnVtT2ZOb2RlID09IG51bGwpIHtcbiAgICBpZiAoYXJndi5udW1PZk5vZGUgPT0gbnVsbClcbiAgICAgIG9wdC5udW1PZk5vZGUgPSAxO1xuICAgIGVsc2VcbiAgICAgIG9wdC5udW1PZk5vZGUgPSBwYXJzZUludChhcmd2Lm51bU9mTm9kZSwgMTApO1xuICB9XG5cbiAgaWYgKG9wdC5udW1PZkNvbmMgPT0gbnVsbCkge1xuICAgIGlmIChhcmd2Lm51bU9mQ29uYyA9PSBudWxsKVxuICAgICAgb3B0Lm51bU9mQ29uYyA9IDI7XG4gICAgZWxzZVxuICAgICAgb3B0Lm51bU9mQ29uYyA9IHBhcnNlSW50KGFyZ3YubnVtT2ZDb25jLCAxMCk7XG4gIH1cblxuICBpZiAoZmlsZSA9PSBudWxsKVxuICAgIGZpbGUgPSBhcGkuYXJndi5maWxlO1xuXG4gIGlmICghb3B0LnVybCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBhcmd1bWVudHM6IHVybC4uLiBpbiAke29wdH1gKTtcbiAgfVxuICBsb2cuaW5mbyhvcHQpO1xuXG4gIGxldCBzZW5kQ291bnQgPSAwO1xuXG4gIGNvbnN0IGJ1ZmZlclRvU2VuZCA9IGZpbGUgPyBmcy5yZWFkRmlsZVN5bmMoZmlsZSkgOiB1bmRlZmluZWQ7XG4gIGxldCBzaGEgPSAnJztcbiAgaWYgKGJ1ZmZlclRvU2VuZCkge1xuICAgIGNvbnN0IGhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2Jyk7XG4gICAgaGFzaC51cGRhdGUoYnVmZmVyVG9TZW5kKTtcbiAgICBzaGEgPSBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG4gIH1cblxuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgLy8gY29uc3QgY29uY3VyUSA9IG5ldyBQcm9tUShvcHQubnVtT2ZDb25jLCAyMCk7XG5cbiAgICBsZXQgZmluaXNoZWRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gb3B0Lm51bU9mQ29uYzsgaSA8IGw7IGkrKykge1xuICAgICAgc2VuZCgpO1xuICAgIH1cblxuICAgIGFzeW5jIGZ1bmN0aW9uIHNlbmQoKSB7XG4gICAgICBzZW5kQ291bnQrKztcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvZy5pbmZvKCcjJXMgc2VuZGluZyBBcHA6ICVzJywgc2VuZENvdW50LCBvcHQuZmlsZSwgc2hhKTtcbiAgICAgICAgY29uc3QgcmVwbHkgPSBhd2FpdCBzZW5kUmVxdWVzdChvcHQsIHNoYSwgYnVmZmVyVG9TZW5kKTtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXlxcW0FDQ0VQVFxcXSBcXHMqKFxcUyspXFxzK3BpZDovLmV4ZWMocmVwbHkpO1xuICAgICAgICBpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pXG4gICAgICAgIGZpbmlzaGVkU2V0LmFkZChtYXRjaFsxXSk7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBpZiAoZXgubWVzc2FnZSAhPT0gUkVTX1NLSVApXG4gICAgICAgICAgbG9nLndhcm4oZXgpO1xuICAgICAgfVxuICAgICAgaWYgKGZpbmlzaGVkU2V0LnNpemUgPj0gb3B0Lm51bU9mTm9kZSkge1xuICAgICAgICBsb2cuaW5mbyhgQWxsIHNlcnZlciByZWNpZXZlZCAke2ZpbmlzaGVkU2V0LnNpemV9IGZpbmlzaGVkOiAke0FycmF5LmZyb20oZmluaXNoZWRTZXQudmFsdWVzKCkpLmpvaW4oJ1xcbicpfWApO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9IGVsc2UgaWYgKHNlbmRDb3VudCA+IDE1KSB7XG4gICAgICAgIGNvbnN0IG1zZyA9IGBUcmllZCAxNSB0aW1lcywgJHtmaW5pc2hlZFNldC5zaXplfSBmaW5pc2hlZDogJHtBcnJheS5mcm9tKGZpbmlzaGVkU2V0LnZhbHVlcygpKS5qb2luKCdcXG4nKX1gO1xuICAgICAgICBsb2cuaW5mbyhtc2cpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKG1zZykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VuZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmVudW0gU2VuZFN0YXRlIHtcbiAgcmVhZHkgPSAwLCBzZW5kaW5nLCBzZW50XG59XG5mdW5jdGlvbiBzZW5kUmVxdWVzdChvcHQ6IE9wdGlvbnMsIHNoYTogc3RyaW5nLCBidWZmZXI/OiBCdWZmZXIpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB1cmxPYmogPSBVcmwucGFyc2Uob3B0LnVybCwgdHJ1ZSk7XG4gIGxldCB1cmwgPSBvcHQudXJsICsgYC8ke2VuY29kZVVSSUNvbXBvbmVudChvcHQuZmlsZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHNoYSl9YDtcblxuICBpZiAob3B0LnNlY3JldCkge1xuICAgIHVybCArPSAnP3doaXNwZXI9JyArIGVuY29kZVVSSUNvbXBvbmVudChvcHQuc2VjcmV0KTtcbiAgfVxuXG4gIGxldCBzZW5kU3RhdGUgPSBTZW5kU3RhdGUucmVhZHk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGxldCByZXE6IGh0dHAuQ2xpZW50UmVxdWVzdDtcbiAgICBjb25zdCByZXFPcHQ6IGh0dHAuUmVxdWVzdE9wdGlvbnMgPSB7XG4gICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHVybE9iai5wcm90b2NvbCA9PT0gJ2h0dHA6Jykge1xuICAgICAgcmVxID0gaHR0cC5yZXF1ZXN0KHVybCwgcmVxT3B0LCBvblJlc3BvbnNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVxID0gaHR0cHMucmVxdWVzdCh1cmwsIHJlcU9wdCwgb25SZXNwb25zZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZXNwb25zZShyZXM6IGh0dHAuSW5jb21pbmdNZXNzYWdlKSB7XG4gICAgICBjb25zdCBzdGF0dXMgPSByZXMuc3RhdHVzQ29kZTtcbiAgICAgIGlmIChzdGF0dXMgPT0gbnVsbCkge1xuICAgICAgICByZWplY3QobmV3IEVycm9yKCdyZXNwb25zZSBzdGF0dXMgTnVsbCcpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXMuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgICAgIGxldCBidWYgPSAnJztcbiAgICAgIHJlcy5vbignZGF0YScsIChjaHVuazogc3RyaW5nKSA9PiB7XG4gICAgICAgIGJ1ZiArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgICAgcmVzLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdyZWNpZXZlOiAnLCBidWYpO1xuXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDQwOSkge1xuICAgICAgICAgIGlmICh0aW1lcikge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgIHJlcS5lbmQoKTtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdTa2lwIHNlbmRpbmcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihSRVNfU0tJUCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPCAyMDAgfHwgc3RhdHVzID4gMjk5KSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgc3RhdHVzOiAke3N0YXR1c30gJHtyZXMuc3RhdHVzTWVzc2FnZX0sIGhlYWRlcnM6ICR7dXRpbC5pbnNwZWN0KHJlcy5oZWFkZXJzKX1gKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUoYnVmKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlcS5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpO1xuICAgIGxldCB0aW1lcjogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aW1lciA9IG51bGw7XG4gICAgICBzZW5kU3RhdGUrKztcbiAgICAgIGlmIChidWZmZXIpXG4gICAgICAgIGxvZy5pbmZvKCdzZW5kaW5nLi4uLiVzIGInLCBidWZmZXIhLmJ5dGVMZW5ndGgpO1xuICAgICAgcmVxLmVuZChidWZmZXIgPyBidWZmZXIgOiAnb2snLCAoKSA9PiB7XG4gICAgICAgIHNlbmRTdGF0ZSsrO1xuICAgICAgICBsb2cuaW5mbygnZG9uZSBzZW5kaW5nIGJvZHkgJywgc2VuZFN0YXRlKTtcbiAgICAgIH0pO1xuICAgIH0sIDEwMDApO1xuICB9KTtcbn1cblxuY29uc3QgTFIgPSAnXFxuJy5jaGFyQ29kZUF0KDApO1xuXG4vLyBhc3luYyBmdW5jdGlvbiBjb25uZWN0VG9Db250ZW50U2VydmVyKG9wdDogT3B0aW9ucykge1xuLy8gICBlbnVtIFN0YXRlIHtcbi8vICAgICB3YWl0NFNlcnZlckluZm8gPSAwLFxuLy8gICAgIHdhaXQ0VXBsb2FkQWNrXG4vLyAgIH1cbi8vICAgbGV0IHN0YXRlID0gU3RhdGUud2FpdDRTZXJ2ZXJJbmZvO1xuLy8gICBsZXQgc29ja2V0OiBUTFNTb2NrZXR8dW5kZWZpbmVkO1xuLy8gICB0cnkge1xuLy8gICAgIHNvY2tldCA9IGF3YWl0IG5ldyBQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIHRzbENvbm5lY3Q+PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4vLyAgICAgICBjb25zdCBzb2NrZXQgPSB0c2xDb25uZWN0KHtcbi8vICAgICAgICAgaG9zdDogb3B0Lmhvc3QsIHBvcnQ6IG9wdC5wb3J0LFxuLy8gICAgICAgICBlbmFibGVUcmFjZTogdHJ1ZVxuLy8gICAgICAgfSBhcyBDb25uZWN0aW9uT3B0aW9ucyk7XG5cbi8vICAgICAgIGZyb21FdmVudFBhdHRlcm48QnVmZmVyPihoYW5kbGVyID0+IHtcbi8vICAgICAgICAgc29ja2V0IS5vbignZGF0YScsIGhhbmRsZXIpO1xuLy8gICAgICAgfSlcbi8vICAgICAgIC5waXBlKFxuLy8gICAgICAgICB0b0xpbmVzLFxuLy8gICAgICAgICB0YXAob25FYWNoUmVwbHkpXG4vLyAgICAgICApLnN1YnNjcmliZSgpO1xuXG4vLyAgICAgICBzb2NrZXQub24oJ3NlY3VyZUNvbm5lY3QnLCAoKSA9PiB7XG4vLyAgICAgICAgIGxvZy5pbmZvKCdjb25uZWN0ZWQnLCBzb2NrZXQuYXV0aG9yaXplZCA/ICdhdXRob3JpemVkJyA6ICd1bmF1dGhvcml6ZWQnKTtcbi8vICAgICAgICAgcmVzb2x2ZShzb2NrZXQpO1xuLy8gICAgICAgfSlcbi8vICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcmVqZWN0KGVycikpXG4vLyAgICAgICAub24oJ3RpbWVvdXQnLCAoKSA9PiByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpKTtcbi8vICAgICB9KTtcbi8vICAgfSBjYXRjaCAoZXgpIHtcbi8vICAgICBpZiAoc29ja2V0KVxuLy8gICAgICAgc29ja2V0LmVuZCgpO1xuLy8gICB9XG5cbi8vICAgZnVuY3Rpb24gb25FYWNoUmVwbHkobGluZTogc3RyaW5nKSB7XG4vLyAgICAgbG9nLmluZm8oJzw9JywgbGluZSk7XG4vLyAgICAgc3dpdGNoIChzdGF0ZSkge1xuLy8gICAgICAgY2FzZSBTdGF0ZS53YWl0NFNlcnZlckluZm86XG4vLyAgICAgICAgIHN0YXRlKys7XG5cbi8vICAgICAgICAgYnJlYWs7XG4vLyAgICAgICBjYXNlIFN0YXRlLndhaXQ0VXBsb2FkQWNrOlxuLy8gICAgICAgZGVmYXVsdDpcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvTGluZXMoc3JjOiBPYnNlcnZhYmxlPEJ1ZmZlcj4pIHtcbiAgbGV0IGNoYXJzID0gQnVmZmVyLmFsbG9jKDEwMCk7XG4gICAgbGV0IGNoYXJzT2Zmc2V0ID0gMDtcbiAgICByZXR1cm4gZGVmZXIoKCkgPT4ge1xuICAgICAgY29uc3Qgc3ViID0gbmV3IFN1YmplY3Q8c3RyaW5nPigpO1xuICAgICAgc3JjLnN1YnNjcmliZShkYXRhID0+IHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGJ5dGUgb2YgZGF0YSkge1xuICAgICAgICAgICAgaWYgKGJ5dGUgPT09IExSKSB7XG4gICAgICAgICAgICAgIHN1Yi5uZXh0KGNoYXJzLnRvU3RyaW5nKCd1dGY4JywgMCwgY2hhcnNPZmZzZXQpKTtcbiAgICAgICAgICAgICAgY2hhcnNPZmZzZXQgPSAwO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaGFycy5ieXRlTGVuZ3RoID09PSBjaGFyc09mZnNldCkge1xuICAgICAgICAgICAgICBsZXQgbmV3Q2hhcnMgPSBCdWZmZXIuYWxsb2MoTWF0aC5jZWlsKGNoYXJzLmJ5dGVMZW5ndGggKiAxLjMpKTtcbiAgICAgICAgICAgICAgY2hhcnMuY29weShuZXdDaGFycywgMCwgMCwgY2hhcnMuYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgICAgIGNoYXJzID0gbmV3Q2hhcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGFycy53cml0ZVVJbnQ4KGJ5dGUsIGNoYXJzT2Zmc2V0KyspO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZXJyID0+IHN1Yi5lcnJvcihlcnIpLFxuICAgICAgICAoKSA9PiBzdWIuY29tcGxldGUoKVxuICAgICAgKTtcbiAgICAgIHJldHVybiBzdWI7XG4gICAgfSk7XG59XG4iXX0=
