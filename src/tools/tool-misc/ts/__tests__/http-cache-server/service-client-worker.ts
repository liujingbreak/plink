import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import {initProcess, log4File} from '@wfh/plink';

initProcess('none');

void (async () => {
  const {createClient} = await import('../../http-cache-server/cache-service-store');
  const log = log4File(__filename);
  const client = createClient();

  rx.concat(
    client.actionOfType('onRespond').pipe(
      op.map(act => log.info(act.type, 'is done')),
      op.take(2)
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

  log.info('ping sent');
})();


