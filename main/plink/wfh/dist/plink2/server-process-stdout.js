"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCurrentProcessOutputReader = createCurrentProcessOutputReader;
const tslib_1 = require("tslib");
const stream = tslib_1.__importStar(require("node:stream"));
// import util from 'node:util';
const rx = tslib_1.__importStar(require("rxjs"));
const stdoutWriter$ = new rx.Subject();
let inited = false;
function interceptorStdout() {
    inited = true;
    const mainProcOut = new stream.Writable({
        write(chunk, enc, cb) {
            stdoutWriter$.next(chunk);
            cb();
        },
        final(cb) {
            cb();
        }
    });
    Object.assign(process.stdout, mainProcOut);
    Object.assign(process.stderr, mainProcOut);
    // console.error = console.log = (...data) => {
    //   data.forEach(it => {
    //     stdoutWriter$.next(typeof it === 'string' ? it : util.inspect(it, false, 0));
    //     stdoutWriter$.next(' ');
    //   });
    //   stdoutWriter$.next('\n');
    // };
}
function createCurrentProcessOutputReader(base64 = false) {
    const stdoutWriterReadStop$ = new rx.Subject();
    const latestStdoutWriterReadReq$ = new rx.ReplaySubject(1);
    stdoutWriter$.pipe(rx.concatMap(chunk => latestStdoutWriterReadReq$.pipe(rx.take(1), rx.tap(readable => readable.push(base64 ? Buffer.from(chunk).toString('base64') : chunk)))), rx.takeUntil(stdoutWriterReadStop$), rx.finalize(() => {
        latestStdoutWriterReadReq$.pipe(rx.take(1), rx.tap(readable => {
            readable.push(null);
        })).subscribe();
    })).subscribe();
    if (!inited)
        interceptorStdout();
    return [
        new stream.Readable({
            read() {
                latestStdoutWriterReadReq$.next(this);
            }
        }),
        function stop() {
            setTimeout(() => {
                stdoutWriterReadStop$.next();
                stdoutWriterReadStop$.complete();
            }, 350);
        }
    ];
}
//# sourceMappingURL=server-process-stdout.js.map