"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCurrentProcessOutputReader = void 0;
const tslib_1 = require("tslib");
// import * as tty from 'node:tty';
const stream = tslib_1.__importStar(require("node:stream"));
const node_util_1 = tslib_1.__importDefault(require("node:util"));
const rx = tslib_1.__importStar(require("rxjs"));
const stdoutWriter$ = new rx.Subject();
let inited = false;
function interceptorStdout() {
    inited = true;
    // const mainProcOut = new stream.Writable({
    //   write(chunk, enc, cb) {
    //     // fout.write(chunk);
    //     stdoutWriter$.next(chunk);
    //     cb();
    //   },
    //   final(cb) {
    //     cb();
    //   }
    // }) as tty.WriteStream;
    // Object.assign(process.stdout, mainProcOut);
    // Object.assign(process.stderr, mainProcOut);
    // eslint-disable-next-line no-console
    console.error = console.log = (...data) => {
        data.forEach(it => {
            stdoutWriter$.next(typeof it === 'string' ? it : node_util_1.default.inspect(it, false, 0));
            stdoutWriter$.next(' ');
        });
        stdoutWriter$.next('\n');
    };
}
function createCurrentProcessOutputReader(debug = false) {
    const stdoutWriterReadStop$ = new rx.Subject();
    const latestStdoutWriterReadReq$ = new rx.ReplaySubject(1);
    // const stdoutWriterReadReq$ = new rx.Subject<stream.Readable>();
    // stdoutWriterReadReq$.subscribe(latestStdoutWriterReadReq$);
    stdoutWriter$.pipe(
    // rx.bufferWhen(() => rx.merge(stdoutWriterReadReq$, stdoutWriterReadStop$)),
    // rx.map(buf => Buffer.isBuffer(buf[0]) ? Buffer.concat(buf as Buffer[]) : (buf as string[]).join('')),
    rx.concatMap(chunk => latestStdoutWriterReadReq$.pipe(rx.take(1), rx.tap(readable => readable.push(chunk)))), rx.takeUntil(stdoutWriterReadStop$.pipe(rx.skip(1))), rx.finalize(() => {
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
        }), () => {
            stdoutWriterReadStop$.next(); // first message signals "last read request"
            setTimeout(() => {
                stdoutWriterReadStop$.next(); // second message signals "takeUntil" operator
                stdoutWriterReadStop$.complete();
            }, 350);
        }
    ];
}
exports.createCurrentProcessOutputReader = createCurrentProcessOutputReader;
//# sourceMappingURL=server-process-stdout.js.map