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
    const url = opt.url + `/${opt.appName}/${opt.version}`;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsMERBQTBCO0FBQzFCLHNEQUFzQjtBQUN0QiwwREFBd0I7QUFFeEIsd0RBQXdCO0FBQ3hCLG9EQUFvQjtBQUNwQixxQ0FBcUM7QUFDckMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBRXhFLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQztBQWdCaEMsU0FBc0IsVUFBVSxDQUFDLE1BQWUsRUFBYSxFQUFFLElBQWE7O1FBQzFFLE1BQU0sSUFBSSxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ1YsR0FBRyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNkLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDZCxHQUFHLENBQUMsT0FBTyxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRXBDLElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUk7Z0JBQ3hCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDOztnQkFFbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtRQUVELElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJ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QyxRQUFRLEVBQUUsQ0FDckIsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBekJELDBCQXlCQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGVmZXIsIE9ic2VydmFibGUsIFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0IGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgQ2hlY2tzdW0gfSBmcm9tICcuLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgUHJvbVEgZnJvbSAncHJvbWlzZS1xdWV1ZSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jZC1jbGllbnQnKTtcblxuY29uc3QgUkVTX1NLSVAgPSAnU2tpcCBzZW5kaW5nJztcbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gIC8vIGhvc3Q6IHN0cmluZztcbiAgLy8gcG9ydDogbnVtYmVyO1xuICB1cmw6IHN0cmluZztcbiAgYXBwTmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBudW1iZXI7XG4gIG51bU9mTm9kZTogbnVtYmVyO1xuICBudW1PZkNvbmM6IG51bWJlcjsgLy8gbnVtYmVyIG9mIGNvbmN1cnJlbnQgcmVxdWVzdFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlck1ldGFJbmZvIHtcbiAgY2hlY2tzdW06IENoZWNrc3VtO1xuICBpZDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZEFwcFppcChvcHQ6IE9wdGlvbnMgPSB7fSBhcyBPcHRpb25zLCBmaWxlPzogc3RyaW5nKSB7XG4gIGNvbnN0IGFyZ3YgPSBhcGkuYXJndjtcbiAgaWYgKCFvcHQudXJsKVxuICAgIG9wdC51cmwgPSBhcmd2LnVybDtcbiAgaWYgKCFvcHQuYXBwTmFtZSlcbiAgICBvcHQuYXBwTmFtZSA9IGFyZ3YuYXBwTmFtZTtcbiAgaWYgKCFvcHQudmVyc2lvbilcbiAgICBvcHQudmVyc2lvbiA9IGFwaS5hcmd2LmFwcFZlcnNpb247XG5cbiAgaWYgKG9wdC5udW1PZk5vZGUgPT0gbnVsbCkge1xuICAgIGlmIChhcmd2Lm51bU9mTm9kZSA9PSBudWxsKVxuICAgICAgb3B0Lm51bU9mTm9kZSA9IDE7XG4gICAgZWxzZVxuICAgICAgb3B0Lm51bU9mTm9kZSA9IHBhcnNlSW50KGFyZ3YubnVtT2ZOb2RlLCAxMCk7XG4gIH1cblxuICBpZiAob3B0Lm51bU9mQ29uYyA9PSBudWxsKSB7XG4gICAgaWYgKGFyZ3YubnVtT2ZDb25jID09IG51bGwpXG4gICAgICBvcHQubnVtT2ZDb25jID0gMjtcbiAgICBlbHNlXG4gICAgICBvcHQubnVtT2ZDb25jID0gcGFyc2VJbnQoYXJndi5udW1PZkNvbmMsIDEwKTtcbiAgfVxuXG4gIGlmIChmaWxlID09IG51bGwpXG4gICAgZmlsZSA9IGFwaS5hcmd2LmZpbGU7XG5cbiAgaWYgKCFvcHQudXJsIHx8ICFvcHQuYXBwTmFtZSB8fCAhb3B0LnZlcnNpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgYXJndW1lbnRzOiBhcHAtbmFtZSwgYXBwVmVyc2lvbiwgdXJsLi4uIGluICR7b3B0fWApO1xuICB9XG4gIGxvZy5pbmZvKG9wdCk7XG5cbiAgbGV0IHNlbmRDb3VudCA9IDA7XG5cbiAgY29uc3QgYnVmZmVyVG9TZW5kID0gZmlsZSA/IGZzLnJlYWRGaWxlU3luYyhmaWxlKSA6IHVuZGVmaW5lZDtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIC8vIGNvbnN0IGNvbmN1clEgPSBuZXcgUHJvbVEob3B0Lm51bU9mQ29uYywgMjApO1xuXG4gICAgbGV0IGZpbmlzaGVkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IG9wdC5udW1PZkNvbmM7IGkgPCBsOyBpKyspIHtcbiAgICAgIHNlbmQoKTtcbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBzZW5kKCkge1xuICAgICAgc2VuZENvdW50Kys7XG4gICAgICB0cnkge1xuICAgICAgICBsb2cuaW5mbygnIyVzIHNlbmRpbmcgQXBwOiAlcycsIHNlbmRDb3VudCwgb3B0LmFwcE5hbWUpO1xuICAgICAgICBjb25zdCByZXBseSA9IGF3YWl0IHNlbmRSZXF1ZXN0KG9wdCwgYnVmZmVyVG9TZW5kKTtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXFxbQUNDRVBUXFxdIFxccyooXFxTKylcXHMrcGlkOi8uZXhlYyhyZXBseSk7XG4gICAgICAgIGlmIChtYXRjaCAmJiBtYXRjaFsxXSlcbiAgICAgICAgZmluaXNoZWRTZXQuYWRkKG1hdGNoWzFdKTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGlmIChleC5tZXNzYWdlICE9PSBSRVNfU0tJUClcbiAgICAgICAgICBsb2cud2FybihleCk7XG4gICAgICB9XG4gICAgICBpZiAoZmluaXNoZWRTZXQuc2l6ZSA+PSBvcHQubnVtT2ZOb2RlKSB7XG4gICAgICAgIGxvZy5pbmZvKGBBbGwgc2VydmVyIHJlY2lldmVkICR7ZmluaXNoZWRTZXQuc2l6ZX0gZmluaXNoZWQ6ICR7QXJyYXkuZnJvbShmaW5pc2hlZFNldC52YWx1ZXMoKSkuam9pbignXFxuJyl9YCk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VuZENvdW50ID4gMTUpIHtcbiAgICAgICAgY29uc3QgbXNnID0gYFRyaWVkIDE1IHRpbWVzLCAke2ZpbmlzaGVkU2V0LnNpemV9IGZpbmlzaGVkOiAke0FycmF5LmZyb20oZmluaXNoZWRTZXQudmFsdWVzKCkpLmpvaW4oJ1xcbicpfWA7XG4gICAgICAgIGxvZy5pbmZvKG1zZyk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IobXNnKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZW5kKCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZW51bSBTZW5kU3RhdGUge1xuICByZWFkeSA9IDAsIHNlbmRpbmcsIHNlbnRcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZW5kUmVxdWVzdChvcHQ6IE9wdGlvbnMsIGJ1ZmZlcj86IEJ1ZmZlcik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHVybE9iaiA9IFVybC5wYXJzZShvcHQudXJsLCB0cnVlKTtcbiAgY29uc3QgdXJsID0gb3B0LnVybCArIGAvJHtvcHQuYXBwTmFtZX0vJHtvcHQudmVyc2lvbn1gO1xuICAvLyBjb25zdCB1cmxPYmogPSBuZXcgVVJMKG9wdC51cmwpO1xuICBsZXQgc2VuZFN0YXRlID0gU2VuZFN0YXRlLnJlYWR5O1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgcmVxOiBodHRwLkNsaWVudFJlcXVlc3Q7XG4gICAgY29uc3QgcmVxT3B0OiBodHRwLlJlcXVlc3RPcHRpb25zID0ge1xuICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh1cmxPYmoucHJvdG9jb2wgPT09ICdodHRwOicpIHtcbiAgICAgIHJlcSA9IGh0dHAucmVxdWVzdCh1cmwsIHJlcU9wdCwgb25SZXNwb25zZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcSA9IGh0dHBzLnJlcXVlc3QodXJsLCByZXFPcHQsIG9uUmVzcG9uc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzcG9uc2UocmVzOiBodHRwLkluY29taW5nTWVzc2FnZSkge1xuICAgICAgY29uc3Qgc3RhdHVzID0gcmVzLnN0YXR1c0NvZGU7XG4gICAgICBpZiAoc3RhdHVzID09IG51bGwpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcigncmVzcG9uc2Ugc3RhdHVzIE51bGwnKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVzLnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICBsZXQgYnVmID0gJyc7XG4gICAgICByZXMub24oJ2RhdGEnLCAoY2h1bms6IHN0cmluZykgPT4ge1xuICAgICAgICBidWYgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICAgIHJlcy5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygncmVjaWV2ZTogJywgYnVmKTtcblxuICAgICAgICBpZiAoc3RhdHVzID09PSA0MDkpIHtcbiAgICAgICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICByZXEuZW5kKCk7XG4gICAgICAgICAgICBsb2cuaW5mbygnU2tpcCBzZW5kaW5nJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoUkVTX1NLSVApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzIDwgMjAwIHx8IHN0YXR1cyA+IDI5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYHN0YXR1czogJHtzdGF0dXN9ICR7cmVzLnN0YXR1c01lc3NhZ2V9LCBoZWFkZXJzOiAke3V0aWwuaW5zcGVjdChyZXMuaGVhZGVycyl9YCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKGJ1Zik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXEub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKTtcbiAgICBsZXQgdGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgc2VuZFN0YXRlKys7XG4gICAgICBpZiAoYnVmZmVyKVxuICAgICAgICBsb2cuaW5mbygnc2VuZGluZy4uLi4lcyBiJywgYnVmZmVyIS5ieXRlTGVuZ3RoKTtcbiAgICAgIHJlcS5lbmQoYnVmZmVyID8gYnVmZmVyIDogJ29rJywgKCkgPT4ge1xuICAgICAgICBzZW5kU3RhdGUrKztcbiAgICAgICAgbG9nLmluZm8oJ2RvbmUgc2VuZGluZyBib2R5ICcsIHNlbmRTdGF0ZSk7XG4gICAgICB9KTtcbiAgICB9LCAxMDAwKTtcbiAgfSk7XG59XG5cbmNvbnN0IExSID0gJ1xcbicuY2hhckNvZGVBdCgwKTtcblxuLy8gYXN5bmMgZnVuY3Rpb24gY29ubmVjdFRvQ29udGVudFNlcnZlcihvcHQ6IE9wdGlvbnMpIHtcbi8vICAgZW51bSBTdGF0ZSB7XG4vLyAgICAgd2FpdDRTZXJ2ZXJJbmZvID0gMCxcbi8vICAgICB3YWl0NFVwbG9hZEFja1xuLy8gICB9XG4vLyAgIGxldCBzdGF0ZSA9IFN0YXRlLndhaXQ0U2VydmVySW5mbztcbi8vICAgbGV0IHNvY2tldDogVExTU29ja2V0fHVuZGVmaW5lZDtcbi8vICAgdHJ5IHtcbi8vICAgICBzb2NrZXQgPSBhd2FpdCBuZXcgUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiB0c2xDb25uZWN0Pj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuLy8gICAgICAgY29uc3Qgc29ja2V0ID0gdHNsQ29ubmVjdCh7XG4vLyAgICAgICAgIGhvc3Q6IG9wdC5ob3N0LCBwb3J0OiBvcHQucG9ydCxcbi8vICAgICAgICAgZW5hYmxlVHJhY2U6IHRydWVcbi8vICAgICAgIH0gYXMgQ29ubmVjdGlvbk9wdGlvbnMpO1xuXG4vLyAgICAgICBmcm9tRXZlbnRQYXR0ZXJuPEJ1ZmZlcj4oaGFuZGxlciA9PiB7XG4vLyAgICAgICAgIHNvY2tldCEub24oJ2RhdGEnLCBoYW5kbGVyKTtcbi8vICAgICAgIH0pXG4vLyAgICAgICAucGlwZShcbi8vICAgICAgICAgdG9MaW5lcyxcbi8vICAgICAgICAgdGFwKG9uRWFjaFJlcGx5KVxuLy8gICAgICAgKS5zdWJzY3JpYmUoKTtcblxuLy8gICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuLy8gICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4vLyAgICAgICAgIHJlc29sdmUoc29ja2V0KTtcbi8vICAgICAgIH0pXG4vLyAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuLy8gICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4vLyAgICAgfSk7XG4vLyAgIH0gY2F0Y2ggKGV4KSB7XG4vLyAgICAgaWYgKHNvY2tldClcbi8vICAgICAgIHNvY2tldC5lbmQoKTtcbi8vICAgfVxuXG4vLyAgIGZ1bmN0aW9uIG9uRWFjaFJlcGx5KGxpbmU6IHN0cmluZykge1xuLy8gICAgIGxvZy5pbmZvKCc8PScsIGxpbmUpO1xuLy8gICAgIHN3aXRjaCAoc3RhdGUpIHtcbi8vICAgICAgIGNhc2UgU3RhdGUud2FpdDRTZXJ2ZXJJbmZvOlxuLy8gICAgICAgICBzdGF0ZSsrO1xuXG4vLyAgICAgICAgIGJyZWFrO1xuLy8gICAgICAgY2FzZSBTdGF0ZS53YWl0NFVwbG9hZEFjazpcbi8vICAgICAgIGRlZmF1bHQ6XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmV4cG9ydCBmdW5jdGlvbiB0b0xpbmVzKHNyYzogT2JzZXJ2YWJsZTxCdWZmZXI+KSB7XG4gIGxldCBjaGFycyA9IEJ1ZmZlci5hbGxvYygxMDApO1xuICAgIGxldCBjaGFyc09mZnNldCA9IDA7XG4gICAgcmV0dXJuIGRlZmVyKCgpID0+IHtcbiAgICAgIGNvbnN0IHN1YiA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICAgIHNyYy5zdWJzY3JpYmUoZGF0YSA9PiB7XG4gICAgICAgICAgZm9yIChjb25zdCBieXRlIG9mIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChieXRlID09PSBMUikge1xuICAgICAgICAgICAgICBzdWIubmV4dChjaGFycy50b1N0cmluZygndXRmOCcsIDAsIGNoYXJzT2Zmc2V0KSk7XG4gICAgICAgICAgICAgIGNoYXJzT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hhcnMuYnl0ZUxlbmd0aCA9PT0gY2hhcnNPZmZzZXQpIHtcbiAgICAgICAgICAgICAgbGV0IG5ld0NoYXJzID0gQnVmZmVyLmFsbG9jKE1hdGguY2VpbChjaGFycy5ieXRlTGVuZ3RoICogMS4zKSk7XG4gICAgICAgICAgICAgIGNoYXJzLmNvcHkobmV3Q2hhcnMsIDAsIDAsIGNoYXJzLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgICBjaGFycyA9IG5ld0NoYXJzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hhcnMud3JpdGVVSW50OChieXRlLCBjaGFyc09mZnNldCsrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gc3ViLmNvbXBsZXRlKClcbiAgICAgICk7XG4gICAgICByZXR1cm4gc3ViO1xuICAgIH0pO1xufVxuIl19
