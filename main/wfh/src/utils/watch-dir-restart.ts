/* eslint-disable @typescript-eslint/indent */
import fs from 'node:fs';
import * as cp from 'child_process';
import {Worker} from 'node:cluster';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import chokida from 'chokidar';

type ChildProcessFactory = () => cp.ChildProcess;

export type Options = {
  retryOnError?: number;
};

export default function(dirOrFile: string[], forkJsFiles: string[] | ChildProcessFactory[] | Worker[], opts: Options = {}) {
  const watcher = chokida.watch(dirOrFile, {ignoreInitial: true});
  const change$ = rx.fromEventPattern<[path: string, stats?: fs.Stats]>(h => watcher.on('change', h), h => watcher.off('change', h))
    .pipe(
      op.map(event => ({fileChangeType: 'change', data: event}))
    );
  const add$ = rx.fromEventPattern<string>(h => watcher.on('add', h), h => watcher.off('add', h))
    .pipe(
      op.map(event => ({fileChangeType: 'add', data: event}))
    );

  const action$ = new rx.Subject<'stop' | 'restart' | 'start'>();
  const serverState$ = new rx.BehaviorSubject<'stopped' | 'started' | 'stopping'>('stopped');

  rx.merge(
    action$.pipe(
      // eslint-disable-next-line no-console
      op.tap(type => console.log('[watch-dir-restart]:', type)),
      op.ignoreElements()
    ),
    // restart after started
    rx.merge( change$, add$).pipe(
      op.debounceTime(500),
      op.mapTo('request restart'),
      op.exhaustMap(() => {
        const wait = serverState$.pipe(
          op.filter(type => type === 'started'),
          op.take(1)
        );
        action$.next('restart');
        return wait;
      })
    ),
    // restart -> stop -> (after stopped) -> start
    action$.pipe(
      op.filter(type => type === 'restart'),
      op.concatMap(() => {
        const done = serverState$.pipe(
          op.filter(type => type === 'stopped'),
          op.take(1)
        );
        action$.next('stop');
        return done;
      }),
      op.tap(() => action$.next('start'))
    ),
    // start -> started, stop -> stopped
    action$.pipe(
      op.filter(type => type === 'start'),
      op.concatMap(() => {
        serverState$.next('started');
        return rx.from(forkJsFiles).pipe(
          op.mergeMap(forkJsFile => new rx.Observable(
            sub => {
              const fac = typeof forkJsFile === 'string' ? () => cp.fork(forkJsFile) : forkJsFile as ChildProcessFactory;
              const child = fac();
              const subStop = action$.pipe(
                op.filter(type => type === 'stop'),
                op.take(1),
                op.takeUntil(serverState$.pipe(op.filter(s => s === 'stopped'))),
                op.tap(() => {
                  child.kill('SIGINT');
                  serverState$.next('stopping');
                })
              ).subscribe();

              child.on('exit', (code, signal) => {
                // Send antion to kill other child process
                if (serverState$.getValue() !== 'stopping') {
                  const msg = `[watch-dir-restart]: Unexpected exit signal ${code + ''} - ${signal?.toString() || ''}`;
                  // eslint-disable-next-line no-console
                  console.log(msg);
                  sub.error(new Error(msg));
                } else {
                  sub.complete();
                }
              });

              child.on('error', (err) => {
                // eslint-disable-next-line no-console
                console.log('[watch-dir-restart]: Child process encounters error:', err);
                sub.error(err);
              });

              return () => subStop.unsubscribe();
            }).pipe(
              op.retry(opts.retryOnError != null ? opts.retryOnError : 10)
            )
          ),
          op.finalize(() => {
            serverState$.next('stopped');
          })
        );
      })
    ),
    rx.defer(() => {
      // initial
      action$.next('start');
      return rx.EMPTY;
    })
  ).subscribe();
  return {action$, serverState$};
}
