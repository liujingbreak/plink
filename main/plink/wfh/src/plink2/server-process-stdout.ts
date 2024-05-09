// import * as tty from 'node:tty';
import * as stream from 'node:stream';
import util from 'node:util';
import * as rx from 'rxjs';

const stdoutWriter$ = new rx.Subject<Buffer | string>();

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
      stdoutWriter$.next(typeof it === 'string' ? it : util.inspect(it, false, 0));
      stdoutWriter$.next(' ');
    });
    stdoutWriter$.next('\n');
  };
}

export function createCurrentProcessOutputReader(debug = false) {
  const stdoutWriterReadStop$ = new rx.Subject<void>();
  const latestStdoutWriterReadReq$ = new rx.ReplaySubject<stream.Readable>(1);
  // const stdoutWriterReadReq$ = new rx.Subject<stream.Readable>();

  // stdoutWriterReadReq$.subscribe(latestStdoutWriterReadReq$);

  stdoutWriter$.pipe(
    // rx.bufferWhen(() => rx.merge(stdoutWriterReadReq$, stdoutWriterReadStop$)),
    // rx.map(buf => Buffer.isBuffer(buf[0]) ? Buffer.concat(buf as Buffer[]) : (buf as string[]).join('')),
    rx.concatMap(chunk => latestStdoutWriterReadReq$.pipe(
      rx.take(1),
      rx.tap(readable => readable.push(chunk))
    )),
    rx.takeUntil(stdoutWriterReadStop$.pipe(rx.skip(1))),
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
    }), () => {
      stdoutWriterReadStop$.next(); // first message signals "last read request"
      setTimeout(() => {
        stdoutWriterReadStop$.next(); // second message signals "takeUntil" operator
        stdoutWriterReadStop$.complete();
      }, 350);
    }
  ] as const;
}
