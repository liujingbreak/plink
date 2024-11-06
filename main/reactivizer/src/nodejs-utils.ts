import {inspect} from 'node:util';
import {Writable} from 'node:stream';
import * as rx from 'rxjs';
import {ReactorCompositeOpt} from './reactor-base';

export const conciseConsoleLogger: ReactorCompositeOpt<any, any, any, any>['log'] = (...msgs) => {
  // eslint-disable-next-line no-console
  console.log(formatToConcise(...msgs));
};
export const conciseNocolorConsoleLogger: ReactorCompositeOpt<any, any, any, any>['log'] = (...msgs) => {
  // eslint-disable-next-line no-console
  console.log(formatToConciseNoColor(...msgs));
};

export function formatToConcise(...messageItems: any[]) {
  return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, true)).join(' ');
}
export function formatToConciseNoColor(...messageItems: any[]) {
  return messageItems.map(msg => typeof msg === 'string' ? msg : inspect(msg, false, 0, false)).join(' ');
}
export function createSimpleIndentLogger(colorful: boolean, timestamp: boolean, out: Writable) {
  let lastPrefix: string | undefined;
  const out$ = new rx.Subject<string>();
  const stop$ = new rx.BehaviorSubject<boolean>(false);

  const buf = [] as unknown[];

  rx.merge(
    stop$.pipe(
      rx.switchMap(stop => {
        if (!stop)
          return rx.concat(
            new rx.Observable(sub => {
              while (buf.length > 0) {
                const d = buf.shift();
                const wait = out.write(d);
                if (!wait) {
                  stop$.next(true);
                  return;
                }
              }
              sub.complete();
            }),
            out$.pipe(
              rx.map(d => {
                const wait = out.write(d);
                if (!wait)
                  stop$.next(true);
              })
            ));
        else
          return out$.pipe(
            rx.map(d => buf.push(d))
          );
      })
    ),
    new rx.Observable(_sub => {
      const h = () => stop$.next(false);
      out.on('drain', h);
      return () => out.off('drain', h);
    })
    // out$.pipe(
    //   rx.map(d => console.log(d))
    // )
  ).subscribe();

  return function(prefix: string, ...msgs: any[]) {
    function printTime() {
      const date = new Date();
      out$.next('[');
      out$.next(date.getHours() + ':');
      out$.next(date.getMinutes() + ':');
      out$.next(date.getSeconds() + '.');
      out$.next(date.getMilliseconds() + '] ');
    }
    if (lastPrefix === prefix) {
      const hashPos = prefix.indexOf('@');
      out$.next('  ');
      if (timestamp) {
        printTime();
      }
      if (hashPos >= 0) {
        out$.next(prefix.slice(hashPos));
        out$.next(' ');
      }
    } else {
      if (timestamp) {
        printTime();
      }
      out$.next(prefix);
      out$.next(' ');
      lastPrefix = prefix;
    }
    const rawMsg = colorful ? formatToConcise(...msgs) : formatToConciseNoColor(...msgs);
    out$.next(rawMsg.replaceAll(/\r?\n/g, '\n    '));
    out$.next('\n');
  };
}
