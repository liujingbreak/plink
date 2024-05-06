import {fork} from 'node:child_process';
import Path from 'path';
import * as http from 'node:http';
import chalk from 'chalk';
import * as rx from 'rxjs';
import {SingleActionFactory, ActionMeta, ReactorComposite2, actionRelatedToAction,
  actionRelatedToActionRelatives} from '@wfh/reactivizer';
const args = process.argv.splice(2);

interface ClientMessages {
  requestStart(): SingleActionFactory;
  requestEnd(): SingleActionFactory;
  signalInt(): SingleActionFactory;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ClientEvents {
  requesting(): SingleActionFactory;
  // socketTimeout(): SingleActionFactory;
  onReqError(err: Error): SingleActionFactory;
  onConnRefused(): SingleActionFactory;
  onServerReplied(): SingleActionFactory;
  startCmdServer(): SingleActionFactory;
  // onSocketReady(): SingleActionFactory;
  onResponse(): SingleActionFactory;
  onReqClosed(): SingleActionFactory;
  onRequestReady(req?: http.ClientRequest): SingleActionFactory;
  // retryRequest(): SingleActionFactory;
}
const outputTableFor = ['onResponse'] as const;
const clientSerivce = new ReactorComposite2<ClientMessages, ClientEvents, [], typeof outputTableFor>({
  name: 'client',
  debug: process.env.NODE_ENV === 'development',
  outputTableFor
});

const {i, o, r, outputTable} = clientSerivce;

process.on('SIGINT', () => i.ft.signalInt().dp());

r('requestStart, onConnRefused -> request(), startCmdServer', i.pt.requestStart.pipe(
  rx.concatMap(([m]) => rx.merge(
    o.pt.onConnRefused.pipe(
      rx.map(() => {
        o.ft.startCmdServer().dp(m);
      }),
      rx.take(1)
    ),
    new rx.Observable(sub => {
      o.ft.requesting().dp(m);
      sub.complete();
    })
  ))
));

r('onReqError -> onConnRefused', o.pt.onReqError.pipe(
  rx.map(([, err]) => {
    if ((err as unknown as {code: string}).code === 'ECONNREFUSED') {
      o.ft.onConnRefused().dp();
    } else {
      console.error(err);
      clientSerivce.dispose();
      process.exit(1);
    }
  })
));

r('startCmdServer, onConnRefused -> request()', o.pt.startCmdServer.pipe(
  rx.concatMap(([m]) => {
    const cp = fork(Path.resolve(__dirname, 'cmd-server.js'), {
      stdio: 'ignore',
      detached: true
    });
    cp.unref();
    cp.on('spawn', () => {
      // eslint-disable-next-line no-console
      console.log('daemon process ID:', chalk.cyan(cp.pid));
    });
    return rx.concat(
      rx.timer(1500),
      rx.merge(
        o.pt.onConnRefused.pipe(
          rx.concatMap(() => rx.timer(1000)),
          rx.map((_, idx) => {
            if (idx < 3) {
              o.ft.requesting().dp(m);
            } else {
              console.error('Can not connect to daemon process');
              clientSerivce.dispose();
              process.exit();
            }
          })
        ),
        new rx.Observable(sub => {
          function h(err: Error) {
            console.error(err);
          }
          cp.on('error', h);
          o.ft.requesting().dp(m);
          sub.complete();
          return () => cp.off('error', h);
        })
      )
    );
  })
));

r('onServerReplied', o.pt.onServerReplied.pipe(
  rx.tap(() => {
    clientSerivce.dispose();
    // In case a new server child process is started, client process still does not exit after all
    process.exit();
  })
));

r('requesting', o.pt.requesting.pipe(
  rx.concatMap(([m]) => {
    return request(m);
  })
));

r('onRequestReady, (onReqClosed, onReqError) -> onRequestReady(undefined)', o.pt.onRequestReady.pipe(
  rx.filter(([, req]) => req != null),
  rx.concatMap(([m]) => rx.merge(
    o.pt.onReqClosed.pipe(actionRelatedToActionRelatives(m)),
    o.pt.onReqError.pipe(actionRelatedToActionRelatives(m))
  ).pipe(
    rx.tap(() => o.ft.onRequestReady().dp(m))
  ))
));

r('signalInt (onResponse) -> dispose', i.pt.signalInt.pipe(
  rx.exhaustMap(([m]) => outputTable.l.onResponse.pipe(
    rx.take(1),
    rx.concatMap(() => {
      return request(m, ['SIGINT']);
    }),
    rx.concatMap(() => rx.timer(100))
  )),
  rx.tap(() => {
    clientSerivce.dispose();
    process.exit();
  })
));

i.ft.requestStart().dp();

function request(m: ActionMeta, cmd = args) {
  const req = http.request({
    port: 14329,
    method: 'POST',
    timeout: 1000
  });

  return rx.merge(
    rx.fromEventPattern<Error>( h => req.on('error', h), h => req.off('error', h)).pipe(
      rx.map(err => {
        o.ft.onReqError(err).dp(m);
      }),
      rx.ignoreElements()
    ),
    rx.fromEventPattern(h => req.on('close', h), h => req.off('close', h)).pipe(
      rx.tap(() => {
        o.ft.onReqClosed().dp(m);
        o.ft.onRequestReady().dp(m);
      })
    ),
    rx.fromEventPattern<http.IncomingMessage>(h => req.on('response', h), h => req.off('response', h)).pipe(
      rx.tap(res => {
        o.ft.onResponse().dp(m);
        res.pipe(process.stdout);
        res.on('end', () => o.ft.onServerReplied().dp(m));
      })
    ),
    new rx.Observable(sub => {
      o.ft.onRequestReady(req).dp(m);
      req.write(JSON.stringify(['setSize', process.stdout.columns, process.stdout.rows]));
      req.write('\n');
      req.end(JSON.stringify([process.cwd(), cmd]));
      sub.complete();
    })
  ).pipe(
    rx.takeUntil(rx.merge(
      o.pt.onServerReplied,
      o.pt.onReqClosed,
      o.pt.onReqError
    ).pipe(
      actionRelatedToAction(m)
    ))
  );
}

