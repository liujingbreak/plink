import * as tty from 'node:tty';
import * as stream from 'node:stream';
import * as rx from 'rxjs';

const stdoutWriter$ = new rx.Subject<any>();

const mainProcOut = new stream.Writable({
  write(chunk, enc, cb) {
    // fout.write(chunk);
    stdoutWriter$.next(chunk);
    cb();
  },
  final(cb) {
    cb();
  }
}) as tty.WriteStream;
Object.assign(process.stdout, mainProcOut);
Object.assign(process.stderr, mainProcOut);

export function createCurrentProcessOutputReader() {
  const stdoutWriterReadStop$ = new rx.Subject<void>();
  const stdoutWriterReadReq$ = new rx.Subject<stream.Readable>();
  stdoutWriterReadReq$.pipe(
    // Ignore furture "readable.read" request"
    rx.exhaustMap((readable) => {
      return stdoutWriter$.pipe(
        rx.tap(chunk => readable.push(chunk)),
        rx.takeWhile(chunk => chunk != null),
        rx.takeUntil(stdoutWriterReadStop$),
        rx.finalize(() => readable.push(null))
      );
    }),
    rx.takeUntil(stdoutWriterReadStop$)
  ).subscribe();

  return [
    new stream.Readable({
      read() {
        stdoutWriterReadReq$.next(this);
      }
    }), () => {
      stdoutWriterReadStop$.next();
      stdoutWriterReadStop$.complete();
    }
  ] as const;
}
