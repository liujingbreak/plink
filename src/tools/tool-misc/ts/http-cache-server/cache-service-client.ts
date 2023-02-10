import http from 'node:http';
import {promises, Writable, Readable} from 'node:stream';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {log4File} from '@wfh/plink';
import {createActionStreamByType, ActionStreamControl, ActionTypes} from '@wfh/redux-toolkit-observable/dist/rx-utils';

const logClient = log4File(__filename);
const logSlice = log4File(__filename, 'rx');

type ServerResponseMsg = {
  onRespond<K extends keyof ClientMessage>(type: K, payload: ActionTypes<ClientMessage>[K]['payload'], content: string | Buffer): void;
  /** subscribed changes */
  onChange(key: string, value: any): void;
};
export type ClientMessage = {
  ping(key: string): void;
  shutdownServer(): void;
  setForNonexist(key: string, value: any): void;
  delete(key: string): void;
  increase(key: string, value: number): void;
  subscribeKey(key: string): void;
  unsubscribeKey(key: string): void;
};

export type ServerResponseContent = Record<keyof ClientMessage, {success: boolean; error?: string}> & {
  setForNonexist: {success: boolean; value: unknown; error?: string};
  increase: {success: boolean; value: unknown; error?: string};
};

export type ClientActions = {
  _reconnectForSubs(): void;
  _responseEnd(req: http.ClientRequest, resContent: string | Buffer): void;
  _shutdownSelf(): void;
} & ClientMessage & ServerResponseMsg;

export function createClient(opts?: {
  /** default 1000 */
  reconnectWaitMs?: number;
  /** default http://localhost:14401*/
  serverEndpoint?: string;
}) {
  const agent = new http.Agent({keepAlive: true});
  logClient.info('client is created');

  const slice = createActionStreamByType<ClientActions>({
    debug: true,
    log: (...args) => logSlice.debug(...args)
  });
  const subscribingKeys$ = new rx.BehaviorSubject<Set<string>>(new Set());
  rx.merge(
    slice.actionOfType('subscribeKey').pipe(
      op.map(({payload}) => {
        const keys = subscribingKeys$.getValue();
        if (!keys.has(payload)) {
          keys.add(payload);
          subscribingKeys$.next(keys);
        }
      })
    ),
    slice.actionOfType('unsubscribeKey').pipe(
      op.map(({payload}) => {
        const keys = subscribingKeys$.getValue();
        if (keys.has(payload)) {
          keys.delete(payload);
          subscribingKeys$.next(keys);
        }
      })
    ),
    slice.actionOfType('_reconnectForSubs').pipe(
      op.subscribeOn(rx.queueScheduler),
      op.map(() => {
        subscribingKeys$.next(subscribingKeys$.getValue());
      })
    ),
    subscribingKeys$.pipe(
      op.filter(keys => keys.size > 0),
      op.switchMap(() => subscribeKeys(slice, [...subscribingKeys$.getValue().keys()], opts?.reconnectWaitMs != null ? opts.reconnectWaitMs : 1000)),
      op.map(data => {
        const json = JSON.parse(data.toString()) as {key: string; value: any};
        slice.dispatcher.onChange(json.key, json.value);
      })
      // TODO: re-create request for subscription after response is ended by server
    ),
    slice.action$.pipe(
      op.filter(
        act => !slice.isActionType(act, 'subscribeKey') &&
         !slice.isActionType(act, '_reconnectForSubs') &&
         !slice.isActionType(act, '_responseEnd') &&
         !slice.isActionType(act, 'onRespond') &&
         !slice.isActionType(act, 'onChange')
      ),
      op.mergeMap(act => new rx.Observable<string | Buffer>(sub => {
        const req = http.request(opts?.serverEndpoint || 'http://localhost:14401/cache', {
          method: 'POST',
          agent
        }, res => {
          logClient.debug('client recieving');
          void readToBuffer(res).then(content => {
            sub.next(content);
            sub.complete();
          });
        });
        if (req.reusedSocket) {
          logClient.debug('Socket is reused for', act.type, act.payload);
        }
        req.on('error', err => {
          if (req.reusedSocket && (err as unknown as {code: string}).code === 'ECONNRESET') {
            logClient.info('Connection closed by server "ECONNRESET", retry request');
            sub.complete();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            (slice.dispatchFactory(act.type as keyof ClientActions) as any)(act.payload as string);
          } else {
            setTimeout(() => sub.error(err), 2000);
          }
        });
        const requestBody = {...act, type: slice.nameOfAction(act)};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (requestBody as any).client = process.pid;
        req.end(JSON.stringify(requestBody));
      }).pipe(
        op.map(out => {
          slice.dispatcher.onRespond(slice.nameOfAction(act)! as keyof ClientMessage, act.payload as any, out);
          // if (slice.isActionType(act, 'shutdownServer'))
          //   slice.dispatcher._shutdownSelf();
        }),
        op.catchError((err, src) => {
          logClient.error('Error in action: ' + slice.nameOfAction(act), err);
          return src;
        })
      ))
    ),
    slice.actionOfType('onRespond').pipe(
      op.map(({payload}) => {
        logClient.info('Recieved', payload);
      })
    ),
    slice.actionOfType('onChange').pipe(
      op.filter(({payload: [key, value]}) => key === '__SERVER' && value === 'shutting'),
      op.take(1),
      op.map(() => slice.dispatcher._shutdownSelf())
    )
  ).pipe(
    op.takeUntil(slice.actionOfType('_shutdownSelf')),
    op.catchError((err, src) => {
      logClient.error('client', err);
      return src;
    })
  ).subscribe();

  slice.dispatcher.subscribeKey('__SERVER');
  return {
    ...slice,
    serverReplied<K extends keyof ClientMessage>(
      actType: K,
      predicate: (payload: ActionTypes<ClientMessage>[K]['payload'], content: string | Buffer) => boolean
    ) {
      return slice.actionOfType('onRespond').pipe(
        op.filter(({payload: [type, payload, content]}) => type === actType && predicate(payload as ActionTypes<ClientMessage>[K]['payload'], content)),
        op.take(1)
      ).toPromise();
    }
  };
}


function subscribeKeys(slice: ActionStreamControl<ClientActions>, keys: string[], reconnectWaitMs: number) {
  const longPollAgent = new http.Agent({keepAlive: true});

  const send$ = new rx.Subject();
  const request$ = new rx.Subject<http.ClientRequest>();
  const response$ = new rx.BehaviorSubject<'wait' | http.IncomingMessage | 'end'>('wait');
  const data$ = new rx.Subject<Buffer>();

  function doRequest() {
    response$.next('wait');
    const req = http.request('http://localhost:14401/cache', {
      method: 'POST',
      agent: longPollAgent,
      headers: {
        'Transfer-Encoding': 'chunked'
      }
    }, res => {
      response$.next(res);
      logClient.info('client recieving');
      res.on('end', () => {
        response$.next('end');
      });
      res.on('data', (chunk) => data$.next(chunk));
      res.on('error', err => {
        response$.error(err);
      });
    });
    request$.next(req);
    req.on('error', err => {
      if (req.reusedSocket && (err as unknown as {code: string}).code === 'ECONNRESET') {
        logClient.info('Connection closed by server "ECONNRESET", create new request');
        slice.dispatcher._reconnectForSubs();
      } else {
        request$.error(err);
      }
    });
    req.end(JSON.stringify({
      type: 'subscribe',
      payload: {
        client: '' + process.pid,
        keys
      }
    }));
  }

  return rx.merge(
    send$.pipe(
      op.map(() => doRequest()),
      op.ignoreElements()
    ),
    response$.pipe(
      op.filter(s => s === 'end'),
      op.concatMap(() => rx.timer(reconnectWaitMs)),
      op.map(() => send$.next()),
      op.ignoreElements()
    ),
    rx.combineLatest(request$, response$).pipe(
      op.takeLast(1), // on unsubscribed
      op.map(([req, res]) => {
        if (res === 'wait') {
          logClient.info('Destroy subscription request');
          req.destroy();
        } else if (res !== 'end' && res != null) {
          logClient.info('Abort subscription response');
          res.destroy();
        }
      }),
      op.ignoreElements()
    ),
    data$,
    rx.defer(() => send$.next()).pipe(
      op.ignoreElements()
    )
  ).pipe(
    op.catchError((err, src) => {
      logClient.warn('subscription error', err);
      return rx.timer(2000).pipe(op.concatMap(() => src));
    })
  );
}

async function readToBuffer(input: Readable) {
  const buf = [] as Array<string | Buffer>;
  const writable = new Writable({
    write(chunk: Buffer, enc, cb) {
      buf.push(chunk);
      cb();
    },
    final(cb) {
      cb();
    }
  });

  await promises.pipeline(input, writable);
  if (buf.length > 0 && Buffer.isBuffer(buf[0]))
    return Buffer.concat(buf as Buffer[]).toString();
  else
    return (buf as string[]).join('');
}
