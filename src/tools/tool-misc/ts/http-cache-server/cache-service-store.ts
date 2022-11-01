/**
 * To support cluster mode, this module should run inside Master process
 */
import http from 'node:http';
import {promises, Writable, Readable} from 'node:stream';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {log4File} from '@wfh/plink';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/dist/rx-utils';

const log = log4File(__filename);

// type MemoStore = {
//   keyMap: Map<string, {expiration: number; data: any}>;
// };

type ServerActions = {
  listening(): void;
  shutdown(): void;
  request(req: http.IncomingMessage, res: http.OutgoingMessage): void;
  error(err: Error): void;
};

export function startStore() {
  const slice = createActionStreamByType<ServerActions>();
  const server = http.createServer({keepAlive: true});
  server.keepAliveTimeout = 60000;
  server.listen(14401);
  server.once('listening', () => slice.dispatcher.listening());
  server.on('error', err => slice.dispatcher.error(err));
  server.on('request', (req, res) => slice.dispatcher.request(req, res));

  rx.merge(
    slice.actionOfType('request').pipe(
      op.mergeMap(async ({payload: [req, res]}) => {
        log.info('[server] ' + req.method, req.url);
        if (req.url === '/cache' && req.method === 'POST') {
          let jsonStr = '';
          const writable = new Writable({
            write(chunk, _encoding, callback) {
              jsonStr += (chunk as Buffer).toString('utf-8');
              callback(null);
            },
            final(cb) {
              cb(null);
            }
          });
          await promises.pipeline(req, writable);
          onMessage(jsonStr, res);
        }
      })
    ),
    slice.actionOfType('error').pipe(
      op.map(err => log.warn('[server] runtime error', err))
    )
  ).pipe(
    op.takeUntil(slice.actionOfType('shutdown').pipe(
      op.take(1),
      op.map(() => {
        log.info('[server] shuting down');
        server.close();
      })
    )),
    op.catchError((err, src) => {
      log.error('[server]', err);
      return src;
    })
  ).subscribe();

  function onMessage(jsonStr: string, res: http.OutgoingMessage) {
    log.info('[server] got', jsonStr);
    res.end('ok');
  }

  return {
    shutdown() {
      slice.dispatcher.shutdown();
    },
    started: slice.actionOfType('listening').pipe(
      op.take(1)
    ).toPromise()
  };
  // const store = new rx.BehaviorSubject<MemoStore>({
  //   keyMap: new Map()
  // });
}

type ServerResponseMsg = {
  onRespond(type: keyof ClientMessage, key: string, content: string | Buffer): void;
  /** subscribed changes */
  onChange(key: string): void;
};

type ClientMessage = {
  ping(key: string): void;
  setForNonexist(key: string): void;
  subscribeChange(key: string): void;
  unsubscribe(key: string): void;
  _reconnectForSubs(): void;
  _requestClose(req: http.ClientRequest): void;
  _responseEnd(req: http.ClientRequest, resContent: string | Buffer): void;
} & ServerResponseMsg;

export function createClient() {
  const agent = new http.Agent({keepAlive: true});
  const longPollAgent = new http.Agent({keepAlive: true});

  const slice = createActionStreamByType<ClientMessage>({debug: true});
  const subscribingKeys$ = new rx.BehaviorSubject<Set<string>>(new Set());
  rx.merge(
    slice.actionOfType('subscribeChange').pipe(
      op.map(act => {
        subscribingKeys$.getValue().add(act.payload);
        subscribingKeys$.next(subscribingKeys$.getValue());
      })
    ),
    rx.merge(
      subscribingKeys$,
      slice.actionOfType('_reconnectForSubs').pipe(op.subscribeOn(rx.queueScheduler))
    ).pipe(
      op.switchMap(() => new rx.Observable<Buffer>(sub => {
        const req = http.request('http://localhost:14401/cache', {
          method: 'POST',
          agent: longPollAgent,
          headers: {
            'Transfer-Encoding': 'chunked'
          }
        }, res => {
          log.info('client recieving');
          res.on('end', () => {
            // slice.dispatcher._done(, act.payload as string);
            sub.complete();
          });
          res.on('data', (chunk) => sub.next(chunk));
          res.on('error', err => {
            req.end();
            sub.error(err);
          });
        });
        req.on('error', err => {
          if (req.reusedSocket && (err as unknown as {code: string}).code === 'ECONNRESET') {
            log.info('Connection closed by server "ECONNRESET", create new request');
            slice.dispatcher._reconnectForSubs();
          } else {
            sub.error(err);
          }
        });
        req.write(JSON.stringify({
          type: 'subscribe',
          payload: {
            client: '' + process.pid,
            keys: [...subscribingKeys$.getValue().keys()]
          }
        }));

        return () => {
          req.end();
        };
      }))
    ),
    slice.action$.pipe(
      op.filter(act => typeof act.payload === 'string' && !slice.isActionType(act, 'subscribeChange') && !slice.isActionType(act, '_reconnectForSubs')),
      op.mergeMap(act => new rx.Observable<string | Buffer>(sub => {
        log.info('client', act.type);
        const req = http.request('http://localhost:14401/cache', {
          method: 'POST',
          agent
        }, res => {
          log.info('client recieving');
          void readToBuffer(res).then(content => {
            sub.next(content);
            sub.complete();
            slice.dispatcher._responseEnd(req, content);
          });
        });
        if (req.reusedSocket) {
          log.info('Socket is reused for', act.type, act.payload);
        }
        req.on('error', err => {
          if (req.reusedSocket && (err as unknown as {code: string}).code === 'ECONNRESET') {
            log.info('Connection closed by server "ECONNRESET", retry request');
            sub.complete();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            (slice.dispatchFactory(act.type as keyof ClientMessage) as any)(act.payload as string);
          } else {
            sub.error(err);
          }
        });
        req.on('close', () => {
          slice.dispatcher._requestClose(req);
        });
        req.end(JSON.stringify({...act, type: slice.nameOfAction(act)}));

        rx.combineLatest(
          slice.actionOfType('_requestClose').pipe(
            op.map(({payload}) => payload),
            op.filter(payload => payload === req)
          ),
          slice.actionOfType('_responseEnd').pipe(
            op.map(({payload}) => payload),
            op.filter(([req0]) => req0 === req)
          )
        ).pipe(
          op.take(1),
          op.map(([, [, out]]) => slice.dispatcher.onRespond(slice.nameOfAction(act)!, act.payload as string, out))
        ).subscribe();
      }))
    )
  ).pipe(
    op.catchError((err, src) => {
      log.error('[client] error', err);
      return src;
    })
  ).subscribe();
  return slice;
}

async function readToBuffer(input: Readable) {
  const buf = [] as Array<string | Buffer>;
  let encoding: string | undefined;
  const writable = new Writable({
    write(chunk: Buffer, enc, cb) {
      encoding = enc;
      // log.info('[client] recieve', chunk.toString());
      buf.push(chunk);
      cb();
    },
    final(cb) {
      cb();
    }
  });

  await promises.pipeline(input, writable);
  if (encoding)
    return (buf as string[]).join('');
  else
    return Buffer.concat(buf as Buffer[]);
}

