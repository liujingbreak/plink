/* eslint-disable @typescript-eslint/indent */
import fs from 'fs';
import * as cp from 'child_process';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import chokida from 'chokidar';

type ChildProcessFactory = () => cp.ChildProcess[] | rx.Observable<cp.ChildProcess>;

export default function(dirOrFile: string[], forkJsFiles: string[] | ChildProcessFactory) {
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
  const serverState$ = new rx.BehaviorSubject<'stopped' | 'started' | 'starting' | 'stopping'>('stopped');

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
    // restart -> (after stopped) -> stop, start
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
        let child$: rx.Observable<cp.ChildProcess>;
        if (forkJsFiles.length > 0 && typeof forkJsFiles[0] === 'string') {
          child$ = rx.from(forkJsFiles as string[]).pipe(op.map(forkJsFile => cp.fork(forkJsFile)));
        } else {
          child$ = rx.from((forkJsFiles as ChildProcessFactory)());
        }
        serverState$.next('started');

        const store = new rx.BehaviorSubject<{numOfChild?: number; numOfExited: number}>({
          numOfExited: 0
        });

        return rx.merge(
          store.pipe(
            op.filter(s => s.numOfExited === s.numOfChild),
            op.take(1),
            op.tap(() => {
              serverState$.next('stopped');
            })
          ),
          child$.pipe(
            op.tap(child => {
              child.on('error', err => {
                // action$.error(err);
                const state = store.getValue();
                store.next({...state, numOfExited: state.numOfExited + 1});
                console.error('[watch-dir-restart] child process error', err);
              });
              child.on('exit', () => {
                const state = store.getValue();
                store.next({...state, numOfExited: state.numOfExited + 1});
              });
            }),
            op.count(),
            op.map(count => {
              store.next({...store.getValue(), numOfChild: count});
            })
          ),
          action$.pipe(
            op.filter(type => type === 'stop'),
            op.take(1),
            op.mergeMap(() => child$),
            op.map(child => child.kill('SIGINT'))
          )
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
