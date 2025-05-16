import * as tty from 'node:tty';
import * as stream from 'node:stream';
// import util from 'node:util';
import * as rx from 'rxjs';

const stdoutWriter$ = new rx.Subject<Buffer>();

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
  }) as tty.WriteStream;
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

export function createCurrentProcessOutputReader(base64 = false) {
  const stdoutWriterReadStop$ = new rx.Subject<void>();
  const latestStdoutWriterReadReq$ = new rx.ReplaySubject<stream.Readable>(1);

  stdoutWriter$.pipe(
    rx.concatMap(chunk => latestStdoutWriterReadReq$.pipe(
      rx.take(1),
      rx.tap(readable => readable.push(base64 ? Buffer.from(chunk).toString('base64') : chunk))
    )),
    rx.takeUntil(stdoutWriterReadStop$),
    rx.finalize(() => {
      latestStdoutWriterReadReq$.pipe(
        rx.take(1),
        rx.tap(readable => {
          readable.push(null);
        })
      ).subscribe();
    })
  ).subscribe();
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
  ] as const;
}
