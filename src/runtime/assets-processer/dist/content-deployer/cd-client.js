"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * For test purpose, run:
 *
drcp run ts/content-deployer/cd-client.ts#sendAppZip assets-processer --url http://localhost:14333/_install --app-version 1 --app-name test --num-of-conc 1 --num-of-node 2 --file ../webui-static.zip
drcp run ts/content-deployer/cd-client.ts#sendAppZip assets-processer --url https://credit-service.dev.bkjk.com/_install --app-version 1 --app-name bcl --num-of-conc 2 --num-of-node 1 --file ../webui-static.zip
drcp run ts/content-deployer/cd-client.ts#sendAppZip assets-processer --url https://credit-service.test.bkjk.com/_install --app-version 1 --app-name bcl --num-of-conc 2 --num-of-node 1 --file ../webui-static.zip

*/
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7Ozs7O0VBT0U7QUFDRiwrQkFBa0Q7QUFDbEQsd0RBQXdCO0FBQ3hCLDBEQUEwQjtBQUMxQixzREFBc0I7QUFDdEIsMERBQXdCO0FBRXhCLHdEQUF3QjtBQUN4QixvREFBb0I7QUFDcEIscUNBQXFDO0FBQ3JDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUV4RSxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUM7QUFnQmhDLFNBQXNCLFVBQVUsQ0FBQyxNQUFlLEVBQWEsRUFBRSxJQUFhOztRQUMxRSxNQUFNLElBQUksR0FBRyxlQUFHLENBQUMsSUFBSSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRztZQUNWLEdBQUcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDZCxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDN0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQ2QsR0FBRyxDQUFDLE9BQU8sR0FBRyxlQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUVwQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLElBQUksSUFBSSxFQUFFO1lBQ3pCLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJO2dCQUN4QixHQUFHLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQzs7Z0JBRWxCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDaEQ7UUFFRCxJQUFJLEdBQUcsQ0FB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QUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQ3JCLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQXpCRCwwQkF5QkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRm9yIHRlc3QgcHVycG9zZSwgcnVuOlxuICogXG5kcmNwIHJ1biB0cy9jb250ZW50LWRlcGxveWVyL2NkLWNsaWVudC50cyNzZW5kQXBwWmlwIGFzc2V0cy1wcm9jZXNzZXIgLS11cmwgaHR0cDovL2xvY2FsaG9zdDoxNDMzMy9faW5zdGFsbCAtLWFwcC12ZXJzaW9uIDEgLS1hcHAtbmFtZSB0ZXN0IC0tbnVtLW9mLWNvbmMgMSAtLW51bS1vZi1ub2RlIDIgLS1maWxlIC4uL3dlYnVpLXN0YXRpYy56aXBcbmRyY3AgcnVuIHRzL2NvbnRlbnQtZGVwbG95ZXIvY2QtY2xpZW50LnRzI3NlbmRBcHBaaXAgYXNzZXRzLXByb2Nlc3NlciAtLXVybCBodHRwczovL2NyZWRpdC1zZXJ2aWNlLmRldi5ia2prLmNvbS9faW5zdGFsbCAtLWFwcC12ZXJzaW9uIDEgLS1hcHAtbmFtZSBiY2wgLS1udW0tb2YtY29uYyAyIC0tbnVtLW9mLW5vZGUgMSAtLWZpbGUgLi4vd2VidWktc3RhdGljLnppcFxuZHJjcCBydW4gdHMvY29udGVudC1kZXBsb3llci9jZC1jbGllbnQudHMjc2VuZEFwcFppcCBhc3NldHMtcHJvY2Vzc2VyIC0tdXJsIGh0dHBzOi8vY3JlZGl0LXNlcnZpY2UudGVzdC5ia2prLmNvbS9faW5zdGFsbCAtLWFwcC12ZXJzaW9uIDEgLS1hcHAtbmFtZSBiY2wgLS1udW0tb2YtY29uYyAyIC0tbnVtLW9mLW5vZGUgMSAtLWZpbGUgLi4vd2VidWktc3RhdGljLnppcFxuXG4qL1xuaW1wb3J0IHsgZGVmZXIsIE9ic2VydmFibGUsIFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0IGh0dHBzIGZyb20gJ2h0dHBzJztcbmltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgQ2hlY2tzdW0gfSBmcm9tICcuLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgUHJvbVEgZnJvbSAncHJvbWlzZS1xdWV1ZSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jZC1jbGllbnQnKTtcblxuY29uc3QgUkVTX1NLSVAgPSAnU2tpcCBzZW5kaW5nJztcbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gIC8vIGhvc3Q6IHN0cmluZztcbiAgLy8gcG9ydDogbnVtYmVyO1xuICB1cmw6IHN0cmluZztcbiAgYXBwTmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBudW1iZXI7XG4gIG51bU9mTm9kZTogbnVtYmVyO1xuICBudW1PZkNvbmM6IG51bWJlcjsgLy8gbnVtYmVyIG9mIGNvbmN1cnJlbnQgcmVxdWVzdFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlck1ldGFJbmZvIHtcbiAgY2hlY2tzdW06IENoZWNrc3VtO1xuICBpZDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VuZEFwcFppcChvcHQ6IE9wdGlvbnMgPSB7fSBhcyBPcHRpb25zLCBmaWxlPzogc3RyaW5nKSB7XG4gIGNvbnN0IGFyZ3YgPSBhcGkuYXJndjtcbiAgaWYgKCFvcHQudXJsKVxuICAgIG9wdC51cmwgPSBhcmd2LnVybDtcbiAgaWYgKCFvcHQuYXBwTmFtZSlcbiAgICBvcHQuYXBwTmFtZSA9IGFyZ3YuYXBwTmFtZTtcbiAgaWYgKCFvcHQudmVyc2lvbilcbiAgICBvcHQudmVyc2lvbiA9IGFwaS5hcmd2LmFwcFZlcnNpb247XG5cbiAgaWYgKG9wdC5udW1PZk5vZGUgPT0gbnVsbCkge1xuICAgIGlmIChhcmd2Lm51bU9mTm9kZSA9PSBudWxsKVxuICAgICAgb3B0Lm51bU9mTm9kZSA9IDE7XG4gICAgZWxzZVxuICAgICAgb3B0Lm51bU9mTm9kZSA9IHBhcnNlSW50KGFyZ3YubnVtT2ZOb2RlLCAxMCk7XG4gIH1cblxuICBpZiAob3B0Lm51bU9mQ29uYyA9PSBudWxsKSB7XG4gICAgaWYgKGFyZ3YubnVtT2ZDb25jID09IG51bGwpXG4gICAgICBvcHQubnVtT2ZDb25jID0gMjtcbiAgICBlbHNlXG4gICAgICBvcHQubnVtT2ZDb25jID0gcGFyc2VJbnQoYXJndi5udW1PZkNvbmMsIDEwKTtcbiAgfVxuXG4gIGlmIChmaWxlID09IG51bGwpXG4gICAgZmlsZSA9IGFwaS5hcmd2LmZpbGU7XG5cbiAgaWYgKCFvcHQudXJsIHx8ICFvcHQuYXBwTmFtZSB8fCAhb3B0LnZlcnNpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgYXJndW1lbnRzOiBhcHAtbmFtZSwgYXBwVmVyc2lvbiwgdXJsLi4uIGluICR7b3B0fWApO1xuICB9XG4gIGxvZy5pbmZvKG9wdCk7XG5cbiAgbGV0IHNlbmRDb3VudCA9IDA7XG5cbiAgY29uc3QgYnVmZmVyVG9TZW5kID0gZmlsZSA/IGZzLnJlYWRGaWxlU3luYyhmaWxlKSA6IHVuZGVmaW5lZDtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIC8vIGNvbnN0IGNvbmN1clEgPSBuZXcgUHJvbVEob3B0Lm51bU9mQ29uYywgMjApO1xuXG4gICAgbGV0IGZpbmlzaGVkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IG9wdC5udW1PZkNvbmM7IGkgPCBsOyBpKyspIHtcbiAgICAgIHNlbmQoKTtcbiAgICB9XG5cbiAgICBhc3luYyBmdW5jdGlvbiBzZW5kKCkge1xuICAgICAgc2VuZENvdW50Kys7XG4gICAgICB0cnkge1xuICAgICAgICBsb2cuaW5mbygnIyVzIHNlbmRpbmcgQXBwOiAlcycsIHNlbmRDb3VudCwgb3B0LmFwcE5hbWUpO1xuICAgICAgICBjb25zdCByZXBseSA9IGF3YWl0IHNlbmRSZXF1ZXN0KG9wdCwgYnVmZmVyVG9TZW5kKTtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXFxbQUNDRVBUXFxdIFxccyooXFxTKylcXHMrcGlkOi8uZXhlYyhyZXBseSk7XG4gICAgICAgIGlmIChtYXRjaCAmJiBtYXRjaFsxXSlcbiAgICAgICAgZmluaXNoZWRTZXQuYWRkKG1hdGNoWzFdKTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGlmIChleC5tZXNzYWdlICE9PSBSRVNfU0tJUClcbiAgICAgICAgICBsb2cud2FybihleCk7XG4gICAgICB9XG4gICAgICBpZiAoZmluaXNoZWRTZXQuc2l6ZSA+PSBvcHQubnVtT2ZOb2RlKSB7XG4gICAgICAgIGxvZy5pbmZvKGBBbGwgc2VydmVyIHJlY2lldmVkICR7ZmluaXNoZWRTZXQuc2l6ZX0gZmluaXNoZWQ6ICR7QXJyYXkuZnJvbShmaW5pc2hlZFNldC52YWx1ZXMoKSkuam9pbignXFxuJyl9YCk7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VuZENvdW50ID4gMTUpIHtcbiAgICAgICAgY29uc3QgbXNnID0gYFRyaWVkIDE1IHRpbWVzLCAke2ZpbmlzaGVkU2V0LnNpemV9IGZpbmlzaGVkOiAke0FycmF5LmZyb20oZmluaXNoZWRTZXQudmFsdWVzKCkpLmpvaW4oJ1xcbicpfWA7XG4gICAgICAgIGxvZy5pbmZvKG1zZyk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IobXNnKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZW5kKCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZW51bSBTZW5kU3RhdGUge1xuICByZWFkeSA9IDAsIHNlbmRpbmcsIHNlbnRcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZW5kUmVxdWVzdChvcHQ6IE9wdGlvbnMsIGJ1ZmZlcj86IEJ1ZmZlcik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHVybE9iaiA9IFVybC5wYXJzZShvcHQudXJsLCB0cnVlKTtcbiAgY29uc3QgdXJsID0gb3B0LnVybCArIGAvJHtvcHQuYXBwTmFtZX0vJHtvcHQudmVyc2lvbn1gO1xuICAvLyBjb25zdCB1cmxPYmogPSBuZXcgVVJMKG9wdC51cmwpO1xuICBsZXQgc2VuZFN0YXRlID0gU2VuZFN0YXRlLnJlYWR5O1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgcmVxOiBodHRwLkNsaWVudFJlcXVlc3Q7XG4gICAgY29uc3QgcmVxT3B0OiBodHRwLlJlcXVlc3RPcHRpb25zID0ge1xuICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh1cmxPYmoucHJvdG9jb2wgPT09ICdodHRwOicpIHtcbiAgICAgIHJlcSA9IGh0dHAucmVxdWVzdCh1cmwsIHJlcU9wdCwgb25SZXNwb25zZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcSA9IGh0dHBzLnJlcXVlc3QodXJsLCByZXFPcHQsIG9uUmVzcG9uc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUmVzcG9uc2UocmVzOiBodHRwLkluY29taW5nTWVzc2FnZSkge1xuICAgICAgY29uc3Qgc3RhdHVzID0gcmVzLnN0YXR1c0NvZGU7XG4gICAgICBpZiAoc3RhdHVzID09IG51bGwpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcigncmVzcG9uc2Ugc3RhdHVzIE51bGwnKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmVzLnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICBsZXQgYnVmID0gJyc7XG4gICAgICByZXMub24oJ2RhdGEnLCAoY2h1bms6IHN0cmluZykgPT4ge1xuICAgICAgICBidWYgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICAgIHJlcy5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBsb2cuaW5mbygncmVjaWV2ZTogJywgYnVmKTtcblxuICAgICAgICBpZiAoc3RhdHVzID09PSA0MDkpIHtcbiAgICAgICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICByZXEuZW5kKCk7XG4gICAgICAgICAgICBsb2cuaW5mbygnU2tpcCBzZW5kaW5nJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoUkVTX1NLSVApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzIDwgMjAwIHx8IHN0YXR1cyA+IDI5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYHN0YXR1czogJHtzdGF0dXN9ICR7cmVzLnN0YXR1c01lc3NhZ2V9LCBoZWFkZXJzOiAke3V0aWwuaW5zcGVjdChyZXMuaGVhZGVycyl9YCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKGJ1Zik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXEub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKTtcbiAgICBsZXQgdGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgc2VuZFN0YXRlKys7XG4gICAgICBpZiAoYnVmZmVyKVxuICAgICAgICBsb2cuaW5mbygnc2VuZGluZy4uLi4lcyBiJywgYnVmZmVyIS5ieXRlTGVuZ3RoKTtcbiAgICAgIHJlcS5lbmQoYnVmZmVyID8gYnVmZmVyIDogJ29rJywgKCkgPT4ge1xuICAgICAgICBzZW5kU3RhdGUrKztcbiAgICAgICAgbG9nLmluZm8oJ2RvbmUgc2VuZGluZyBib2R5ICcsIHNlbmRTdGF0ZSk7XG4gICAgICB9KTtcbiAgICB9LCAxMDAwKTtcbiAgfSk7XG59XG5cbmNvbnN0IExSID0gJ1xcbicuY2hhckNvZGVBdCgwKTtcblxuLy8gYXN5bmMgZnVuY3Rpb24gY29ubmVjdFRvQ29udGVudFNlcnZlcihvcHQ6IE9wdGlvbnMpIHtcbi8vICAgZW51bSBTdGF0ZSB7XG4vLyAgICAgd2FpdDRTZXJ2ZXJJbmZvID0gMCxcbi8vICAgICB3YWl0NFVwbG9hZEFja1xuLy8gICB9XG4vLyAgIGxldCBzdGF0ZSA9IFN0YXRlLndhaXQ0U2VydmVySW5mbztcbi8vICAgbGV0IHNvY2tldDogVExTU29ja2V0fHVuZGVmaW5lZDtcbi8vICAgdHJ5IHtcbi8vICAgICBzb2NrZXQgPSBhd2FpdCBuZXcgUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiB0c2xDb25uZWN0Pj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuLy8gICAgICAgY29uc3Qgc29ja2V0ID0gdHNsQ29ubmVjdCh7XG4vLyAgICAgICAgIGhvc3Q6IG9wdC5ob3N0LCBwb3J0OiBvcHQucG9ydCxcbi8vICAgICAgICAgZW5hYmxlVHJhY2U6IHRydWVcbi8vICAgICAgIH0gYXMgQ29ubmVjdGlvbk9wdGlvbnMpO1xuXG4vLyAgICAgICBmcm9tRXZlbnRQYXR0ZXJuPEJ1ZmZlcj4oaGFuZGxlciA9PiB7XG4vLyAgICAgICAgIHNvY2tldCEub24oJ2RhdGEnLCBoYW5kbGVyKTtcbi8vICAgICAgIH0pXG4vLyAgICAgICAucGlwZShcbi8vICAgICAgICAgdG9MaW5lcyxcbi8vICAgICAgICAgdGFwKG9uRWFjaFJlcGx5KVxuLy8gICAgICAgKS5zdWJzY3JpYmUoKTtcblxuLy8gICAgICAgc29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0JywgKCkgPT4ge1xuLy8gICAgICAgICBsb2cuaW5mbygnY29ubmVjdGVkJywgc29ja2V0LmF1dGhvcml6ZWQgPyAnYXV0aG9yaXplZCcgOiAndW5hdXRob3JpemVkJyk7XG4vLyAgICAgICAgIHJlc29sdmUoc29ja2V0KTtcbi8vICAgICAgIH0pXG4vLyAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHJlamVjdChlcnIpKVxuLy8gICAgICAgLm9uKCd0aW1lb3V0JywgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSk7XG4vLyAgICAgfSk7XG4vLyAgIH0gY2F0Y2ggKGV4KSB7XG4vLyAgICAgaWYgKHNvY2tldClcbi8vICAgICAgIHNvY2tldC5lbmQoKTtcbi8vICAgfVxuXG4vLyAgIGZ1bmN0aW9uIG9uRWFjaFJlcGx5KGxpbmU6IHN0cmluZykge1xuLy8gICAgIGxvZy5pbmZvKCc8PScsIGxpbmUpO1xuLy8gICAgIHN3aXRjaCAoc3RhdGUpIHtcbi8vICAgICAgIGNhc2UgU3RhdGUud2FpdDRTZXJ2ZXJJbmZvOlxuLy8gICAgICAgICBzdGF0ZSsrO1xuXG4vLyAgICAgICAgIGJyZWFrO1xuLy8gICAgICAgY2FzZSBTdGF0ZS53YWl0NFVwbG9hZEFjazpcbi8vICAgICAgIGRlZmF1bHQ6XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmV4cG9ydCBmdW5jdGlvbiB0b0xpbmVzKHNyYzogT2JzZXJ2YWJsZTxCdWZmZXI+KSB7XG4gIGxldCBjaGFycyA9IEJ1ZmZlci5hbGxvYygxMDApO1xuICAgIGxldCBjaGFyc09mZnNldCA9IDA7XG4gICAgcmV0dXJuIGRlZmVyKCgpID0+IHtcbiAgICAgIGNvbnN0IHN1YiA9IG5ldyBTdWJqZWN0PHN0cmluZz4oKTtcbiAgICAgIHNyYy5zdWJzY3JpYmUoZGF0YSA9PiB7XG4gICAgICAgICAgZm9yIChjb25zdCBieXRlIG9mIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChieXRlID09PSBMUikge1xuICAgICAgICAgICAgICBzdWIubmV4dChjaGFycy50b1N0cmluZygndXRmOCcsIDAsIGNoYXJzT2Zmc2V0KSk7XG4gICAgICAgICAgICAgIGNoYXJzT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hhcnMuYnl0ZUxlbmd0aCA9PT0gY2hhcnNPZmZzZXQpIHtcbiAgICAgICAgICAgICAgbGV0IG5ld0NoYXJzID0gQnVmZmVyLmFsbG9jKE1hdGguY2VpbChjaGFycy5ieXRlTGVuZ3RoICogMS4zKSk7XG4gICAgICAgICAgICAgIGNoYXJzLmNvcHkobmV3Q2hhcnMsIDAsIDAsIGNoYXJzLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgICBjaGFycyA9IG5ld0NoYXJzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hhcnMud3JpdGVVSW50OChieXRlLCBjaGFyc09mZnNldCsrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGVyciA9PiBzdWIuZXJyb3IoZXJyKSxcbiAgICAgICAgKCkgPT4gc3ViLmNvbXBsZXRlKClcbiAgICAgICk7XG4gICAgICByZXR1cm4gc3ViO1xuICAgIH0pO1xufVxuIl19
