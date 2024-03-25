"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http = tslib_1.__importStar(require("node:http"));
const util = tslib_1.__importStar(require("node:util"));
const stream = tslib_1.__importStar(require("node:stream"));
const worker_threads_1 = require("worker_threads");
const fs_1 = tslib_1.__importDefault(require("fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const reactivizer_1 = require("../../../packages/reactivizer");
const bootstrap_process_1 = require("../utils/bootstrap-process");
const server_process_1 = require("./server-process");
const startTime = new Date().getTime();
process.env.__plinkLogMainPid = process.pid + '';
(0, bootstrap_process_1.initProcess)('save');
process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
        chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
});
const fout = fs_1.default.createWriteStream('plink-daemon.log', {
    flags: 'a',
    encoding: 'binary'
});
const inputTableFor = ['setTTYSize'];
const outputTableFor = ['isStarted'];
process.stdout.on('data', chunk => fout.write(chunk));
function reatorLog(msg, ...args) {
    fout.write(new Date().toLocaleTimeString());
    fout.write(' ');
    fout.write(msg);
    for (const arg of args) {
        fout.write(' ');
        fout.write(util.inspect(arg, false, 0));
    }
    fout.write('\n');
}
const service = new reactivizer_1.ReactorComposite2({
    name: 'PlinkCliServer',
    inputTableFor,
    outputTableFor,
    log: reatorLog,
    debug: true
});
const processService = (0, server_process_1.createProcessService)(reatorLog);
const { i, o, r, inputTable } = service;
let server;
r('start', i.pt.start.pipe(rx.exhaustMap(([m, port]) => {
    return rx.merge(
    // Ignore until "isStarted: false"
    o.pt.isStarted.pipe(rx.filter(([, yes]) => !yes), rx.distinctUntilChanged(), rx.take(1)), new rx.Observable(sub => {
        const actPort = port !== null && port !== void 0 ? port : 14329;
        server = http.createServer((req, res) => {
            let buf = [];
            // cmdBufferByReq.set(req, buf);
            req.on('data', chunk => {
                const str = chunk.toString();
                const eol = str.indexOf('\n');
                if (eol >= 0) {
                    buf.push(str.slice(0, eol));
                    o.ft.onRequestLine(req, res, buf.join('')).dp();
                    buf = [str.slice(eol)];
                }
                else {
                    buf.push(str);
                }
            });
            req.on('end', () => {
                o.ft.onRequestLine(req, res, buf.join('')).dp();
                // res.end('ok');
            });
            req.on('error', err => o.ft.onReqError(err).dp());
            req.on('close', () => o.ft.onReqClose().dp());
        });
        server.on('listening', () => {
            sub.complete();
            o.ft.started(actPort).dp(m);
            o.ft.isStarted(true).dp(m);
        });
        server.on('error', (err) => console.error(err));
        server.listen(actPort);
    }));
})));
r('processService.onChildProcessExit', processService.destory$.pipe(rx.exhaustMap(() => service.outputTable.l.isStarted.pipe(rx.filter(([, yes]) => yes), rx.take(1), rx.concatMap(() => rx.timer(500)), rx.map(() => {
    service.dispose();
    server === null || server === void 0 ? void 0 : server.close();
})))));
r('onRequestLine', o.pt.onRequestLine.pipe(rx.mergeMap(([m, , res, line]) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = JSON.parse(line);
    const [cmd] = json;
    if (cmd === 'setSize') {
        const [, cols, rows] = json;
        i.ft.setTTYSize(cols - 2, rows).dp();
        fout.write(`screen size: ${cols}, ${rows}\n`);
        return rx.EMPTY;
    }
    const [dir, args] = json;
    if (args[0] === 'SIGINT') {
        processService.i.ft.interrupt(dir).dp(m);
        res.end();
        return rx.EMPTY;
    }
    const out = new stream.Writable({
        write(chunk, _enc, cb) {
            res.write(chunk);
            fout.write(chunk);
            cb();
        },
        final(cb) {
            // res.end();
            cb();
        }
    });
    return processService.i.ft.sendCommand(inputTable.getData().setTTYSize, dir, args, out).ddo(processService.o.pt.onCommandDoneAnyway).pipe(rx.take(1), rx.finalize(() => {
        void Promise.resolve().then(() => res.end());
    }));
})));
i.ft.setTTYSize(150, 50).dp();
i.ft.start().dp();
//# sourceMappingURL=cmd-server.js.map