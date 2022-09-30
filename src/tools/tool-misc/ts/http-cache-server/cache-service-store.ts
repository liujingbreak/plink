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

export function startStore() {
  const action$ = new rx.Subject<'listening' | 'shutdown'>();
  const req$ = new rx.Subject<[http.IncomingMessage, http.OutgoingMessage]>();
  const server = http.createServer({keepAlive: true});
  server.keepAliveTimeout = 60000;
  server.listen(14401);
  server.once('listening', () => action$.next('listening'));
  server.on('error', err => action$.error(err));
  server.on('request', (req, res) => req$.next([req, res]));

  rx.merge(
    req$.pipe(
      op.mergeMap(async ([req, res]) => {
        log.info(req.url, req.method);
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
          log.info('server', jsonStr);
          res.end('ok');
        }
      }))
  ).pipe(
    op.takeUntil(action$.pipe(
      op.filter(ac => ac === 'shutdown'),
      op.take(1),
      op.map(() => {
        log.info('shuting down');
        server.close();
      })
    )),
    op.catchError((err, src) => {
      log.error(err);
      return src;
    })
  ).subscribe();

  return {
    shutdown() {
      action$.next('shutdown');
    },
    started: action$.pipe(
      op.filter((act): act is 'listening' => act === 'listening'),
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
  _requestSubscribe(key: string): void;
  // requestError(key: string, req: http.ClientRequest, err: unknown): void;
} & ServerResponseMsg;

export function createClient() {
  const agent = new http.Agent({keepAlive: true});
  const longPollAgent = new http.Agent({keepAlive: true});

  const slice = createActionStreamByType<ClientMessage>();
  const subscribingKeys$ = new rx.BehaviorSubject<Set<string>>(new Set());
  rx.merge(
    slice.actionOfType('subscribeChange').pipe(
      op.map(act => {
        subscribingKeys$.getValue().add(act.payload);
        subscribingKeys$.next(subscribingKeys$.getValue());
      })
    ),
    subscribingKeys$.pipe(
      // TODO
      op.mergeMap(act => new rx.Observable(sub => {
        const req = http.request('http://localhost:14401/cache', {
          method: 'POST',
          agent: longPollAgent
        }, res => {
          log.info('client recieving');
          res.on('end', () => {
            // slice.dispatcher._done(, act.payload as string);
            sub.complete();
          });
          // TODO
          res.resume();
        });
        req.on('error', err => {
          if (req.reusedSocket && (err as unknown as {code: string}).code === 'ECONNRESET') {
            log.info('Connection closed by server "ECONNRESET", create new request');
            (slice.dispatchFactory(slice.nameOfAction(act) as unknown as 'ping'))(act.payload as string);
          } else {
            sub.error(err);
          }
        });
        req.end(JSON.stringify(act));
      }).pipe(
        // op.takeUntil(slice.actionOfType('unsubscribe').pipe(
        //   op.filter(act => act.payload === key),
        //   op.take(1)
        // ))
      ))
    ),
    slice.action$.pipe(
      op.filter(act => typeof act.payload === 'string' && !slice.isActionType(act, 'subscribeChange')),
      op.mergeMap(act => new rx.Observable<http.IncomingMessage>(sub => {
        log.info('client', act.type);
        const req = http.request('http://localhost:14401/cache', {
          method: 'POST',
          agent
        }, res => {
          log.info('client recieving');
          res.on('end', () => {
            sub.next(res);
            sub.complete();
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
        req.end(JSON.stringify(act));
      }).pipe(
        op.mergeMap(res => readToBuffer(res)),
        op.map(out => slice.dispatcher.onRespond(slice.nameOfAction(act)!, act.payload as string, out))
      ))
    )
  ).pipe(
    op.catchError((err, src) => {
      log.error('client error', err);
      return src;
    })
  ).subscribe();
  return slice;
}

async function readToBuffer(input: Readable) {
  const buf = [] as Array<string | Buffer>;
  let encoding: string | undefined;
  const writable = new Writable({
    write(chunk, enc, cb) {
      encoding = enc;
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

