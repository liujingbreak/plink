/**
 * To support cluster mode, this module should run inside Master process
 */
import http from 'node:http';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {log4File} from '@wfh/plink';

const log = log4File(__filename);

type MemoStore = {
  updateLock: Map<string, boolean>;
  data: Map<string, unknown>;
};

export function startStore() {
  const action$ = new rx.Subject<'listening' | 'shutdown'>();
  const req$ = new rx.Subject<[http.IncomingMessage, http.OutgoingMessage]>();
  const server$ = new rx.Observable<unknown>(sub => {
    const server = http.createServer();
    server.keepAliveTimeout = 60000;
    server.listen(14401);
    server.once('listening', () => action$.next('listening'));
    server.on('error', err => sub.error(err));
    server.on('request', (req, res) => req$.next([req, res]));

    rx.merge(
      req$.pipe()
    ).pipe(
      op.takeUntil(action$.pipe(op.filter(ac => ac === 'shutdown'))),
      op.catchError((err, src) => {
        log.error(err);
        return src;
      })
    ).subscribe();

    return () => {
      server.close();
      action$.next('shutdown');
    };
  });
  const store = new rx.BehaviorSubject<MemoStore>({
    updateLock: new Map(),
    data: new Map()
  });

  return server$;
}
