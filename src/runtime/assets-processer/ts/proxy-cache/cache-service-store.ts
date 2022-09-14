/**
 * To support cluster mode, this module should run inside Master process
 */
import http from 'node:http';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {log4File} from '@wfh/plink';
import {ProxyCacheState} from './types';

const log = log4File(__filename);

type ProcessMsg = {
  topic?: string;
  srcPid: number;
  destPid: number;
  path?: keyof ProxyCacheState;
  method?: 'subscribe' | 'updateIf' | 'unsubscribe' | 'update' | 'changed';
  ifValue?: any;
};

export function startStore() {
  const msg$ = new rx.Observable<ProcessMsg>(sub => {
    const server = http.createServer({}, (req, res) => {
    });
    server.listen(14401);
    server.on('', '');
    return () => {
    };
  });
  const store = new rx.BehaviorSubject<ProxyCacheState>({
    cacheByUri: new Map(),
    memCacheLength: opts.memCacheLength == null ? Number.MAX_VALUE : opts.memCacheLength
  });

  rx.merge(
    msg$.pipe(
      op.filter(msg => msg.method === 'update')
    )
  ).pipe(
    op.catchError((err, src) => {
      log.error(err);
      return src;
    })
  ).subscribe();
}
