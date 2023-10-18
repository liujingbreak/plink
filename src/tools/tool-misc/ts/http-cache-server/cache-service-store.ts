/* eslint-disable @typescript-eslint/indent */
/**
 * To support cluster mode, this module should run inside Master process
 */
import http from 'node:http';
import {promises, Writable} from 'node:stream';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {log4File} from '@wfh/plink';
import {ActionTypes, createActionStreamByType} from '@wfh/redux-toolkit-observable/dist/rx-utils';
import {ClientMessage, ServerResponseContent} from './cache-service-client';

const log = log4File(__filename);
const logSlice = log4File(__filename, 'rx');

type ServerActions = {
  listening(): void;
  shutdown(): void;
  request(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>): void;
  emitStateChange(clientId: string, key: string, value: any): void;
  onClientSubscribe(clientId: string, keys: string[], res: http.OutgoingMessage): void;
  onClientUnsubscribe(clientId: string, keys: Set<string> | null): void;
  /** Temporarily cut off response */
  endSubscribeRes(clientId: string): void;
  onSubscribeResClosed(res: http.OutgoingMessage): void;
  // keepSubsAlive(clientId: string, key: string): void;
  // sendChange(clientId: string, key: string, value: any): void;
  subscribeResExpired(clientId: string, res: http.OutgoingMessage): void;
  error(err: Error): void;
};

type RequestBody<
  T extends 'subscribe' | Exclude<keyof ClientMessage, 'subscribeKey'> =
  'subscribe' | Exclude<keyof ClientMessage, 'subscribeKey'>
> = T extends 'subscribe' ? {
  type: 'subscribe';
  payload: {
    client: number;
    keys: string[];
  };
} : T extends Exclude<keyof ClientMessage, 'subscribeKey'> ? {
  type: T;
  client: number;
  payload: ActionTypes<ClientMessage>[T]['payload'];
} : unknown;

type ServerState = {
  responseByClientId: Map<string, http.OutgoingMessage | null>;
};

export function startStore(opts?: {reconnInterval?: number}) {
  const slice = createActionStreamByType<ServerActions>({
    debug: false,
    log: (...args) => logSlice.debug(...args)
  });
  const server = http.createServer({keepAlive: true});
  const reconnInterval = opts?.reconnInterval || 60000;
  server.keepAliveTimeout = 60000;
  server.listen(14401);
  server.once('listening', () => slice.dispatcher.listening());
  server.on('error', err => slice.dispatcher.error(err));
  server.on('request', (req, res) => slice.dispatcher.request(req, res));

  // key is clientId + ':' + data key, value is changed data value
  const subscribedMsgQByObsKey = new Map<string, {
    changedValue$: rx.Observable<any>;
  }>();

  const state$ = new rx.BehaviorSubject<ServerState>({
    responseByClientId: new Map()
  });

  const store = new rx.BehaviorSubject<Map<string, any>>(new Map());
  rx.merge(
    slice.actionOfType('request').pipe(
      op.mergeMap(async ({payload: [req, res]}) => {
        log.debug('on request ' + req.method, req.url);
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
    ),
    slice.actionOfType('onClientSubscribe').pipe(
      op.mergeMap(({payload: [client, keys, res]}) => {
        state$.getValue().responseByClientId.set(client, res);
        state$.next(state$.getValue());
        const hClose = () => {
          const byClient = state$.getValue().responseByClientId;
          byClient.delete(client);
          state$.next((state$.getValue()));
        };
        res.once('close', hClose);

        return rx.merge(
          // Remove "close" event listener from response
          slice.actionOfType('endSubscribeRes').pipe(
            op.map(({payload: clientId}) => {
              const byClient = state$.getValue().responseByClientId;
              return byClient.get(clientId);
            }),
            op.filter(res0 => res0 === res),
            op.map(() => res.off('close', hClose))
          ),
          state$.pipe(
            op.map(s => s.responseByClientId.get(client)),
            op.distinctUntilChanged(),
            op.switchMap(
              res => rx.timer(res == null ? 2 * 60000 : reconnInterval)
               .pipe(op.mapTo(res))
            ),
            op.map(res => {
              if (res == null) {
                // client does not reconnect, consider as "unsubscribe"
                slice.dispatcher.onClientUnsubscribe(client, new Set(keys));
              } else {
                logSlice.info('time to end response for', client, keys);
                slice.dispatcher.endSubscribeRes(client);
              }
            })
          ),
          rx.from(keys).pipe(
            op.mergeMap(key => {
              const observeKey = client + ':' + key;
              if (!subscribedMsgQByObsKey.has(observeKey)) {
                const changedValue$ = store.pipe(
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                  op.map(s => s.get(key)),
                  // op.filter(value => value != null),
                  op.distinctUntilChanged()
                );
                subscribedMsgQByObsKey.set(observeKey, {changedValue$});

                return rx.merge(
                  changedValue$.pipe(
                    op.buffer(
                      rx.combineLatest(
                        changedValue$.pipe(op.observeOn(rx.asyncScheduler)),
                        // It is important "asyncScheduler" being applied here to delay emitting (ensure it emits "changedValue$" slightly slower than the upstream changedValue$,
                        // make sure buffer() can work properly
                        state$.pipe(op.map(s => s.responseByClientId.get(client)))
                      ).pipe(
                        op.filter(([, res]) => res != null)
                      )
                    ),
                    op.filter(values => values.length > 0), // skip in case of no value changed between two subscription requests from client side
                    op.map(values => {
                      log.info('value changed for client', client, key, values);
                      const res = state$.getValue().responseByClientId.get(client);
                      for (const value of values) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        res!.write(JSON.stringify({key, value}));
                        // slice.dispatcher.sendChange(client, key, value);
                      }
                    })
                  )
                ).pipe(
                  op.takeUntil(slice.actionOfType('onClientUnsubscribe').pipe(
                    op.filter(({payload: [clientId, unsubscribeKeys]}) => clientId === client && (key == null || unsubscribeKeys == null || unsubscribeKeys.has(key))),
                    op.tap(({payload: [clientId, unsubscribeKey]}) => {
                      log.info(`unsubscribed from ${clientId}: ${unsubscribeKey ? [...unsubscribeKey.values()].join() : '' || 'all'}`);
                    })
                  ))
                );
              } else {
                return rx.EMPTY;
              }
            })
          )
        );
      })
    ),
    slice.actionOfType('endSubscribeRes').pipe(
      op.map(({payload: clientId}) => {
        const byClient = state$.getValue().responseByClientId;
        const res = byClient.get(clientId);
        if (res) {
          res.end();
          byClient.delete(clientId);
        }
      })
    )
  ).pipe(
    op.takeUntil(slice.actionOfType('shutdown').pipe(
      op.take(1),
      op.map(() => {
        log.info('shutting down');
        server.close();
        // process.exit(0);
      })
    )),
    op.catchError((err, src) => {
      log.error(err);
      return src;
    })
  ).subscribe();

  function onMessage(jsonStr: string, res: http.ServerResponse<http.IncomingMessage>) {
    // log.info(jsonStr);
    const action = JSON.parse(jsonStr) as RequestBody;
    if (action.type === 'subscribe') {
      const {client, keys} = action.payload as unknown as {client: string; keys: string[]};
      slice.dispatcher.onClientSubscribe(client, keys, res);
    } else {
      if (action.type === 'setForNonexist') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const {payload: [key, value]} = action;
        if (store.getValue().has(key)) {
          res.statusCode = 202;
          const content: ServerResponseContent['setForNonexist'] = {
            success: false,
            value: store.getValue().get(key)
          };
          res.end(JSON.stringify(content));
          return;
        } else {
          store.getValue().set(key, value);
          store.next(store.getValue());
          const content: ServerResponseContent['setForNonexist'] = {
            success: true,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            value
          };
          res.end(JSON.stringify(content));
          return;
        }
      } else if (action.type === 'delete') {
        const {payload: key} = action as ActionTypes<ClientMessage>['delete'];
        const state = store.getValue();
        if (state.has(key)) {
          state.delete(key);
        }
        store.next(state);
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        res.end(JSON.stringify({success: true, value: state.get(key)}));
        return;
      } else if (action.type === 'unsubscribeKey') {
        slice.dispatcher.onClientUnsubscribe('' + action.client, new Set([action.payload]));
      } else if (action.type === 'shutdownServer') {
        res.end('ok');
        slice.dispatcher.shutdown();
        store.getValue().set('__SERVER', 'shutting');
        store.next(store.getValue());
        return;
      }
      const defaultContent: ServerResponseContent['ping'] = {success: true};
      res.end(JSON.stringify(defaultContent));
    }
  }

  return {
    shutdown() {
      slice.dispatcher.shutdown();
    },
    started: slice.actionOfType('listening').pipe(
      op.take(1),
      op.tap(() => log.info('Server listening'))
    ).toPromise()
  };
}

