"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCurrentProcessOutputReader = void 0;
const tslib_1 = require("tslib");
const stream = tslib_1.__importStar(require("node:stream"));
const rx = tslib_1.__importStar(require("rxjs"));
const stdoutWriter$ = new rx.Subject();
const mainProcOut = new stream.Writable({
    write(chunk, enc, cb) {
        // fout.write(chunk);
        stdoutWriter$.next(chunk);
        cb();
    },
    final(cb) {
        cb();
    }
});
Object.assign(process.stdout, mainProcOut);
Object.assign(process.stderr, mainProcOut);
function createCurrentProcessOutputReader() {
    const stdoutWriterReadStop$ = new rx.Subject();
    const stdoutWriterReadReq$ = new rx.Subject();
    stdoutWriterReadReq$.pipe(
    // Ignore furture "readable.read" request"
    rx.exhaustMap((readable) => {
        return stdoutWriter$.pipe(rx.tap(chunk => readable.push(chunk)), rx.takeWhile(chunk => chunk != null), rx.takeUntil(stdoutWriterReadStop$), rx.finalize(() => readable.push(null)));
    }), rx.takeUntil(stdoutWriterReadStop$)).subscribe();
    return [
        new stream.Readable({
            read() {
                stdoutWriterReadReq$.next(this);
            }
        }), () => {
            stdoutWriterReadStop$.next();
            stdoutWriterReadStop$.complete();
        }
    ];
}
exports.createCurrentProcessOutputReader = createCurrentProcessOutputReader;
//# sourceMappingURL=server-process-stdout.js.map