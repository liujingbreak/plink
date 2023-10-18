import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {initProcess, log4File} from '@wfh/plink';

const masterMsg$ = new rx.ReplaySubject<number>(1);
process.on('message', msg => {
  if (typeof msg === 'string') {
    try {
      const json = JSON.parse(msg) as {__plink_cluster_worker_index?: number};
      if (json.__plink_cluster_worker_index != null) {
        masterMsg$.next(json.__plink_cluster_worker_index);
      }
    // eslint-disable-next-line no-empty
    } catch (e) { }
  }
});

initProcess('none');

void (async () => {
  const {createClient} = await import('../../http-cache-server/cache-service-client');
  const log = log4File(__filename);
  const client = createClient();

  rx.concat(
    rx.merge(
      masterMsg$.pipe(
        op.map(idx => {
          log.info('worker idx:', idx);
        }),
        op.take(1)
      ),
      client.actionOfType('onRespond').pipe(
        op.map(act => log.info(act.type, 'is done')),
        op.take(2)
      )
    ),
    rx.of(1).pipe(
      op.map(() => {
        log.info('worker exists');
        process.exit(0);
      })
    )
  ).subscribe();

  client.dispatcher.ping(process.pid + '');
  await new Promise(resolve => setTimeout(resolve, 500));
  client.dispatcher.ping(process.pid + '');

  // client.dispatcher.subscribeChange('testkey');

  log.info('ping sent');
})();


