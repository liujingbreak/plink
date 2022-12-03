/**
 * To support cluster mode, this module should run inside Master process
 */
import http from 'node:http';
import {promises, Writable, Readable} from 'node:stream';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {log4File} from '@wfh/plink';
import {ActionTypes, createActionStreamByType} from '@wfh/redux-toolkit-observable/dist/rx-utils';

const log = log4File(__filename);

// type MemoStore = {
//   keyMap: Map<string, {expiration: number; data: any}>;
// };

type ServerActions = {
  listening(): void;
  shutdown(): void;
  request(req: http.IncomingMessage, res: http.OutgoingMessage): void;
  emitStateChange(clientId: string, key: string, value: any): void;
  onClientUnsubscribe(clientId: string, key: string | null): void;
  // keepSubsAlive(clientId: string, key: string): void;
  sendChange(clientId: string, key: string, value: any): void;
  error(err: Error): void;
};

type RequestBody<
  T extends 'subscribe' | Exclude<keyof ClientMessage, 'subscribeChange' | '_responseEnd' | '_reconnectForSubs'> =
  'subscribe' | Exclude<keyof ClientMessage, 'subscribeChange' | '_responseEnd' | '_reconnectForSubs'>
> = T extends 'subscribe' ? {
  type: 'subscribe';
  payload: {
    client: number;
    keys: string[];
  }
} : T extends Exclude<keyof ClientMessage, 'subscribeChange' | '_responseEnd' | '_reconnectForSubs'> ? {
  type: T;
  client: number;
  payload: ActionTypes<ClientMessage>[T]['payload'];
} : unknown;

export function startStore() {
  const slice = createActionStreamByType<ServerActions>();
  const server = http.createServer({keepAlive: true});
  server.keepAliveTimeout = 60000;
  server.listen(14401);
  server.once('listening', () => slice.dispatcher.listening());
  server.on('error', err => slice.dispatcher.error(err));
  server.on('request', (req, res) => slice.dispatcher.request(req, res));

  // key is clientId + ':' + data key, value is changed data value
  const subscribedMsgQByObsKey = new Map<string, {
    res$: rx.BehaviorSubject<http.OutgoingMessage | null>,
    changedValues$: rx.BehaviorSubject<any[]>
  }>();

  const store = new rx.BehaviorSubject<Map<string, any>>(new Map());
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
    const action = JSON.parse(jsonStr) as RequestBody;
    if (action.type === 'subscribe') {
      const {client, keys} = action.payload as unknown as {client: string; keys: string[]};
      const responseOpenTimeup$ = new rx.Subject();
      const res$ = new rx.BehaviorSubject<http.OutgoingMessage | null>(res);
      // TODO: When unsubscribe, end response; when duration reaches 1 minute, end response

      for (const key of keys) {
        const observeKey = client + ':' + key;
        if (!subscribedMsgQByObsKey.has(observeKey)) {
          const changedValues$ = new rx.BehaviorSubject<any[]>([]);
          subscribedMsgQByObsKey.set(observeKey, {res$, changedValues$});
          rx.merge(
            store.pipe(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              op.filter(s => s.get(key)),
              op.distinctUntilChanged(),
              op.map(value => {
                changedValues$.getValue().push(value);
                changedValues$.next(changedValues$.getValue());
              })
            ),
            res$.pipe(
              op.filter(res => res == null),
              // op.filter(({payload: [client0, key0]}) => client0 === client && key0 === key),
              op.debounceTime(2 * 60000), // wait for 2 minutes to auto close subscription,
              op.take(1),
              op.map(() => slice.dispatcher.onClientUnsubscribe(client, key))
            ),
            rx.combineLatest(changedValues$, res$).pipe(
              op.filter(([values, res]) => values.length > 0 && res != null),
              op.map(([values, res]) => {
                for (const value of values) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  res!.write(JSON.stringify({key, value}));
                  slice.dispatcher.sendChange(client, key, value);
                }
                changedValues$.getValue().splice(0);
              })
            )
          ).pipe(
            op.takeUntil(slice.actionOfType('onClientUnsubscribe').pipe(
              op.filter(({payload: [clientId, unsubscribeKey]}) => clientId === client && (key == null || unsubscribeKey === key)),
              op.tap(({payload: [clientId, unsubscribeKey]}) => {
                log.info(`unsubscribed from ${clientId}: ${unsubscribeKey || 'all'}`);
              })
            ))
          ).subscribe();

          responseOpenTimeup$.next();
        } else {
          const {res$} = subscribedMsgQByObsKey.get(observeKey)!;
          res$.next(res);
          // slice.dispatcher.keepSubsAlive(client, key);
        }
      }
    } else {
      if (action.type === 'setForNonexist') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const {payload: [key, value]} = action;
        if (store.getValue().has(key)) {
          res.end(JSON.stringify(store.getValue().get(key)));
          return;
        } else {
          store.getValue().set(key, value);
          store.next(store.getValue());
        }
      } else if (action.type === 'increase') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const {payload: [key, value]} = action as ActionTypes<ClientMessage>['increase'];
        const state = store.getValue();
        if (state.has(key)) {
          state.set(key, state.get(key) + value);
        } else {
          state.set(key, value);
        }
        store.next(state);
        res.end(JSON.stringify(state.get(key)));
        return;
      } else if (action.type === 'unsubscribe') {
        slice.dispatcher.onClientUnsubscribe('' + action.client, action.payload);
      }
      res.end('ok');
    }
  }

  return {
    shutdown() {
      slice.dispatcher.shutdown();
    },
    started: slice.actionOfType('listening').pipe(
      op.take(1)
    ).toPromise()
  };
}

type ServerResponseMsg = {
  onRespond(type: keyof ClientMessage, key: string, content: string | Buffer): void;
  /** subscribed changes */
  onChange(key: string): void;
};

type ClientMessage = {
  ping(key: string): void;
  setForNonexist(key: string, value: any): void;
  increase(key: string, value: number): void;
  subscribeChange(key: string): void;
  unsubscribe(key: string): void;
  _reconnectForSubs(): void;
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
      op.filter(
        act => !slice.isActionType(act, 'subscribeChange') &&
         !slice.isActionType(act, '_reconnectForSubs') &&
         !slice.isActionType(act, '_responseEnd')
      ),
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
        // req.on('close', () => {
        //   slice.dispatcher._requestClose(req);
        // });
        const requestBody = {...act, type: slice.nameOfAction(act)};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (requestBody.payload as any).client = process.pid;
        req.end(JSON.stringify(requestBody));

      }).pipe(
        op.take(1),
        op.map(out => slice.dispatcher.onRespond(slice.nameOfAction(act)!, act.payload as string, out))
      ))
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

