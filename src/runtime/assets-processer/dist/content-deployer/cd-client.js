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
// import PromQ from 'promise-queue';
const log = require('log4js').getLogger(__api_1.default.packageName + '.cd-client');
const RES_SKIP = 'Skip sending';
function sendAppZip(opt = {}, file) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const argv = __api_1.default.argv;
        if (!opt.url)
            opt.url = argv.url;
        if (!opt.appName)
            opt.appName = argv.appName;
        if (!opt.version)
            opt.version = __api_1.default.argv.appVersion;
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
        if (!opt.url || !opt.appName || !opt.version) {
            throw new Error(`Missing arguments: app-name, appVersion, url... in ${opt}`);
        }
        log.info(opt);
        let sendCount = 0;
        const bufferToSend = file ? fs_1.default.readFileSync(file) : undefined;
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
                        log.info('#%s sending App: %s', sendCount, opt.appName);
                        const reply = yield sendRequest(opt, bufferToSend);
                        const match = /\[ACCEPT\] \s*(\S+)\s+pid:/.exec(reply);
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
function sendRequest(opt, buffer) {
    const urlObj = url_1.default.parse(opt.url, true);
    let url = opt.url + `/${opt.appName}/${opt.version}`;
    if (opt.secret) {
        url += '?whisper=' + encodeURIComponent(opt.secret);
    }
    // const urlObj = new URL(opt.url);
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
exports.sendRequest = sendRequest;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsMERBQTBCO0FBQzFCLHNEQUFzQjtBQUN0QiwwREFBd0I7QUFFeEIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQixxQ0FBcUM7QUFDckMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBRXhFLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQztBQWlCaEMsU0FBc0IsVUFBVSxDQUFDLE1BQWUsRUFBYSxFQUFFLElBQWE7O1FBQzFFLE1BQU0sSUFBSSxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ1YsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNkLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDZCxHQUFHLENBQUMsT0FBTyxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRXBDLElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtRQUVELElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJ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Q3ZDO1FBQ0gsQ0FBQyxFQUNELEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFDckIsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUNyQixDQUFDO1FBQ0YsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUF6QkQsMEJBeUJDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvY29udGVudC1kZXBsb3llci9jZC1jbGllbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZWZlciwgT2JzZXJ2YWJsZSwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBDaGVja3N1bSB9IGZyb20gJy4uL2ZldGNoLXR5cGVzJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCBQcm9tUSBmcm9tICdwcm9taXNlLXF1ZXVlJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNkLWNsaWVudCcpO1xuXG5jb25zdCBSRVNfU0tJUCA9ICdTa2lwIHNlbmRpbmcnO1xuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAgLy8gaG9zdDogc3RyaW5nO1xuICAvLyBwb3J0OiBudW1iZXI7XG4gIHVybDogc3RyaW5nO1xuICBhcHBOYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IG51bWJlcjtcbiAgbnVtT2ZOb2RlOiBudW1iZXI7XG4gIG51bU9mQ29uYzogbnVtYmVyOyAvLyBudW1iZXIgb2YgY29uY3VycmVudCByZXF1ZXN0XG4gIHNlY3JldD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJNZXRhSW5mbyB7XG4gIGNoZWNrc3VtOiBDaGVja3N1bTtcbiAgaWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlbmRBcHBaaXAob3B0OiBPcHRpb25zID0ge30gYXMgT3B0aW9ucywgZmlsZT86IHN0cmluZykge1xuICBjb25zdCBhcmd2ID0gYXBpLmFyZ3Y7XG4gIGlmICghb3B0LnVybClcbiAgICBvcHQudXJsID0gYXJndi51cmw7XG4gIGlmICghb3B0LmFwcE5hbWUpXG4gICAgb3B0LmFwcE5hbWUgPSBhcmd2LmFwcE5hbWU7XG4gIGlmICghb3B0LnZlcnNpb24pXG4gICAgb3B0LnZlcnNpb24gPSBhcGkuYXJndi5hcHBWZXJzaW9uO1xuXG4gIGlmIChvcHQubnVtT2ZOb2RlID09IG51bGwpIHtcbiAgICBpZiAoYXJndi5udW1PZk5vZGUgPT0gbnVsbClcbiAgICAgIG9wdC5udW1PZk5vZGUgPSAxO1xuICAgIGVsc2VcbiAgICAgIG9wdC5udW1PZk5vZGUgPSBwYXJzZUludChhcmd2Lm51bU9mTm9kZSwgMTApO1xuICB9XG5cbiAgaWYgKG9wdC5udW1PZkNvbmMgPT0gbnVsbCkge1xuICAgIGlmIChhcmd2Lm51bU9mQ29uYyA9PSBudWxsKVxuICAgICAgb3B0Lm51bU9mQ29uYyA9IDI7XG4gICAgZWxzZVxuICAgICAgb3B0Lm51bU9mQ29uYyA9IHBhcnNlSW50KGFyZ3YubnVtT2ZDb25jLCAxMCk7XG4gIH1cblxuICBpZiAoZmlsZSA9PSBudWxsKVxuICAgIGZpbGUgPSBhcGkuYXJndi5maWxlO1xuXG4gIGlmICghb3B0LnVybCB8fCAhb3B0LmFwcE5hbWUgfHwgIW9wdC52ZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGFyZ3VtZW50czogYXBwLW5hbWUsIGFwcFZlcnNpb24sIHVybC4uLiBpbiAke29wdH1gKTtcbiAgfVxuICBsb2cuaW5mbyhvcHQpO1xuXG4gIGxldCBzZW5kQ291bnQgPSAwO1xuXG4gIGNvbnN0IGJ1ZmZlclRvU2VuZCA9IGZpbGUgPyBmcy5yZWFkRmlsZVN5bmMoZmlsZSkgOiB1bmRlZmluZWQ7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAvLyBjb25zdCBjb25jdXJRID0gbmV3IFByb21RKG9wdC5udW1PZkNvbmMsIDIwKTtcblxuICAgIGxldCBmaW5pc2hlZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBvcHQubnVtT2ZDb25jOyBpIDwgbDsgaSsrKSB7XG4gICAgICBzZW5kKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZnVuY3Rpb24gc2VuZCgpIHtcbiAgICAgIHNlbmRDb3VudCsrO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nLmluZm8oJyMlcyBzZW5kaW5nIEFwcDogJXMnLCBzZW5kQ291bnQsIG9wdC5hcHBOYW1lKTtcbiAgICAgICAgY29uc3QgcmVwbHkgPSBhd2FpdCBzZW5kUmVxdWVzdChvcHQsIGJ1ZmZlclRvU2VuZCk7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gL1xcW0FDQ0VQVFxcXSBcXHMqKFxcUyspXFxzK3BpZDovLmV4ZWMocmVwbHkpO1xuICAgICAgICBpZiAobWF0Y2ggJiYgbWF0Y2hbMV0pXG4gICAgICAgIGZpbmlzaGVkU2V0LmFkZChtYXRjaFsxXSk7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBpZiAoZXgubWVzc2FnZSAhPT0gUkVTX1NLSVApXG4gICAgICAgICAgbG9nLndhcm4oZXgpO1xuICAgICAgfVxuICAgICAgaWYgKGZpbmlzaGVkU2V0LnNpemUgPj0gb3B0Lm51bU9mTm9kZSkge1xuICAgICAgICBsb2cuaW5mbyhgQWxsIHNlcnZlciByZWNpZXZlZCAke2ZpbmlzaGVkU2V0LnNpemV9IGZpbmlzaGVkOiAke0FycmF5LmZyb20oZmluaXNoZWRTZXQudmFsdWVzKCkpLmpvaW4oJ1xcbicpfWApO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9IGVsc2UgaWYgKHNlbmRDb3VudCA+IDE1KSB7XG4gICAgICAgIGNvbnN0IG1zZyA9IGBUcmllZCAxNSB0aW1lcywgJHtmaW5pc2hlZFNldC5zaXplfSBmaW5pc2hlZDogJHtBcnJheS5mcm9tKGZpbmlzaGVkU2V0LnZhbHVlcygpKS5qb2luKCdcXG4nKX1gO1xuICAgICAgICBsb2cuaW5mbyhtc2cpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKG1zZykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VuZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmVudW0gU2VuZFN0YXRlIHtcbiAgcmVhZHkgPSAwLCBzZW5kaW5nLCBzZW50XG59XG5leHBvcnQgZnVuY3Rpb24gc2VuZFJlcXVlc3Qob3B0OiBPcHRpb25zLCBidWZmZXI/OiBCdWZmZXIpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB1cmxPYmogPSBVcmwucGFyc2Uob3B0LnVybCwgdHJ1ZSk7XG4gIGxldCB1cmwgPSBvcHQudXJsICsgYC8ke29wdC5hcHBOYW1lfS8ke29wdC52ZXJzaW9ufWA7XG5cbiAgaWYgKG9wdC5zZWNyZXQpIHtcbiAgICB1cmwgKz0gJz93aGlzcGVyPScgKyBlbmNvZGVVUklDb21wb25lbnQob3B0LnNlY3JldCk7XG4gIH1cbiAgLy8gY29uc3QgdXJsT2JqID0gbmV3IFVSTChvcHQudXJsKTtcbiAgbGV0IHNlbmRTdGF0ZSA9IFNlbmRTdGF0ZS5yZWFkeTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IHJlcTogaHR0cC5DbGllbnRSZXF1ZXN0O1xuICAgIGNvbnN0IHJlcU9wdDogaHR0cC5SZXF1ZXN0T3B0aW9ucyA9IHtcbiAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAodXJsT2JqLnByb3RvY29sID09PSAnaHR0cDonKSB7XG4gICAgICByZXEgPSBodHRwLnJlcXVlc3QodXJsLCByZXFPcHQsIG9uUmVzcG9uc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXEgPSBodHRwcy5yZXF1ZXN0KHVybCwgcmVxT3B0LCBvblJlc3BvbnNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc3BvbnNlKHJlczogaHR0cC5JbmNvbWluZ01lc3NhZ2UpIHtcbiAgICAgIGNvbnN0IHN0YXR1cyA9IHJlcy5zdGF0dXNDb2RlO1xuICAgICAgaWYgKHN0YXR1cyA9PSBudWxsKSB7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ3Jlc3BvbnNlIHN0YXR1cyBOdWxsJykpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHJlcy5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgbGV0IGJ1ZiA9ICcnO1xuICAgICAgcmVzLm9uKCdkYXRhJywgKGNodW5rOiBzdHJpbmcpID0+IHtcbiAgICAgICAgYnVmICs9IGNodW5rO1xuICAgICAgfSk7XG4gICAgICByZXMub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ3JlY2lldmU6ICcsIGJ1Zik7XG5cbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gNDA5KSB7XG4gICAgICAgICAgaWYgKHRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICAgICAgcmVxLmVuZCgpO1xuICAgICAgICAgICAgbG9nLmluZm8oJ1NraXAgc2VuZGluZycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKFJFU19TS0lQKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXR1cyA8IDIwMCB8fCBzdGF0dXMgPiAyOTkpIHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBzdGF0dXM6ICR7c3RhdHVzfSAke3Jlcy5zdGF0dXNNZXNzYWdlfSwgaGVhZGVyczogJHt1dGlsLmluc3BlY3QocmVzLmhlYWRlcnMpfWApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZShidWYpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVxLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSk7XG4gICAgbGV0IHRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgIHNlbmRTdGF0ZSsrO1xuICAgICAgaWYgKGJ1ZmZlcilcbiAgICAgICAgbG9nLmluZm8oJ3NlbmRpbmcuLi4uJXMgYicsIGJ1ZmZlciEuYnl0ZUxlbmd0aCk7XG4gICAgICByZXEuZW5kKGJ1ZmZlciA/IGJ1ZmZlciA6ICdvaycsICgpID0+IHtcbiAgICAgICAgc2VuZFN0YXRlKys7XG4gICAgICAgIGxvZy5pbmZvKCdkb25lIHNlbmRpbmcgYm9keSAnLCBzZW5kU3RhdGUpO1xuICAgICAgfSk7XG4gICAgfSwgMTAwMCk7XG4gIH0pO1xufVxuXG5jb25zdCBMUiA9ICdcXG4nLmNoYXJDb2RlQXQoMCk7XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3RUb0NvbnRlbnRTZXJ2ZXIob3B0OiBPcHRpb25zKSB7XG4vLyAgIGVudW0gU3RhdGUge1xuLy8gICAgIHdhaXQ0U2VydmVySW5mbyA9IDAsXG4vLyAgICAgd2FpdDRVcGxvYWRBY2tcbi8vICAgfVxuLy8gICBsZXQgc3RhdGUgPSBTdGF0ZS53YWl0NFNlcnZlckluZm87XG4vLyAgIGxldCBzb2NrZXQ6IFRMU1NvY2tldHx1bmRlZmluZWQ7XG4vLyAgIHRyeSB7XG4vLyAgICAgc29ja2V0ID0gYXdhaXQgbmV3IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgdHNsQ29ubmVjdD4+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbi8vICAgICAgIGNvbnN0IHNvY2tldCA9IHRzbENvbm5lY3Qoe1xuLy8gICAgICAgICBob3N0OiBvcHQuaG9zdCwgcG9ydDogb3B0LnBvcnQsXG4vLyAgICAgICAgIGVuYWJsZVRyYWNlOiB0cnVlXG4vLyAgICAgICB9IGFzIENvbm5lY3Rpb25PcHRpb25zKTtcblxuLy8gICAgICAgZnJvbUV2ZW50UGF0dGVybjxCdWZmZXI+KGhhbmRsZXIgPT4ge1xuLy8gICAgICAgICBzb2NrZXQhLm9uKCdkYXRhJywgaGFuZGxlcik7XG4vLyAgICAgICB9KVxuLy8gICAgICAgLnBpcGUoXG4vLyAgICAgICAgIHRvTGluZXMsXG4vLyAgICAgICAgIHRhcChvbkVhY2hSZXBseSlcbi8vICAgICAgICkuc3Vic2NyaWJlKCk7XG5cbi8vICAgICAgIHNvY2tldC5vbignc2VjdXJlQ29ubmVjdCcsICgpID0+IHtcbi8vICAgICAgICAgbG9nLmluZm8oJ2Nvbm5lY3RlZCcsIHNvY2tldC5hdXRob3JpemVkID8gJ2F1dGhvcml6ZWQnIDogJ3VuYXV0aG9yaXplZCcpO1xuLy8gICAgICAgICByZXNvbHZlKHNvY2tldCk7XG4vLyAgICAgICB9KVxuLy8gICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiByZWplY3QoZXJyKSlcbi8vICAgICAgIC5vbigndGltZW91dCcsICgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSkpO1xuLy8gICAgIH0pO1xuLy8gICB9IGNhdGNoIChleCkge1xuLy8gICAgIGlmIChzb2NrZXQpXG4vLyAgICAgICBzb2NrZXQuZW5kKCk7XG4vLyAgIH1cblxuLy8gICBmdW5jdGlvbiBvbkVhY2hSZXBseShsaW5lOiBzdHJpbmcpIHtcbi8vICAgICBsb2cuaW5mbygnPD0nLCBsaW5lKTtcbi8vICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4vLyAgICAgICBjYXNlIFN0YXRlLndhaXQ0U2VydmVySW5mbzpcbi8vICAgICAgICAgc3RhdGUrKztcblxuLy8gICAgICAgICBicmVhaztcbi8vICAgICAgIGNhc2UgU3RhdGUud2FpdDRVcGxvYWRBY2s6XG4vLyAgICAgICBkZWZhdWx0OlxuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuXG5leHBvcnQgZnVuY3Rpb24gdG9MaW5lcyhzcmM6IE9ic2VydmFibGU8QnVmZmVyPikge1xuICBsZXQgY2hhcnMgPSBCdWZmZXIuYWxsb2MoMTAwKTtcbiAgICBsZXQgY2hhcnNPZmZzZXQgPSAwO1xuICAgIHJldHVybiBkZWZlcigoKSA9PiB7XG4gICAgICBjb25zdCBzdWIgPSBuZXcgU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgICBzcmMuc3Vic2NyaWJlKGRhdGEgPT4ge1xuICAgICAgICAgIGZvciAoY29uc3QgYnl0ZSBvZiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoYnl0ZSA9PT0gTFIpIHtcbiAgICAgICAgICAgICAgc3ViLm5leHQoY2hhcnMudG9TdHJpbmcoJ3V0ZjgnLCAwLCBjaGFyc09mZnNldCkpO1xuICAgICAgICAgICAgICBjaGFyc09mZnNldCA9IDA7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoYXJzLmJ5dGVMZW5ndGggPT09IGNoYXJzT2Zmc2V0KSB7XG4gICAgICAgICAgICAgIGxldCBuZXdDaGFycyA9IEJ1ZmZlci5hbGxvYyhNYXRoLmNlaWwoY2hhcnMuYnl0ZUxlbmd0aCAqIDEuMykpO1xuICAgICAgICAgICAgICBjaGFycy5jb3B5KG5ld0NoYXJzLCAwLCAwLCBjaGFycy5ieXRlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgY2hhcnMgPSBuZXdDaGFycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNoYXJzLndyaXRlVUludDgoYnl0ZSwgY2hhcnNPZmZzZXQrKyk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBlcnIgPT4gc3ViLmVycm9yKGVyciksXG4gICAgICAgICgpID0+IHN1Yi5jb21wbGV0ZSgpXG4gICAgICApO1xuICAgICAgcmV0dXJuIHN1YjtcbiAgICB9KTtcbn1cbiJdfQ==
