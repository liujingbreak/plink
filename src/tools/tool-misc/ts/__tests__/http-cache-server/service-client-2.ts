import * as op from 'rxjs/operators';
import {initProcess, log4File} from '@wfh/plink';
import * as __client from '@wfh/tool-misc/dist/http-cache-server/cache-service-client';

initProcess('none');

const log = log4File(__filename);

const {createClient} = require('@wfh/tool-misc/dist/http-cache-server/cache-service-client') as typeof __client;
const client = createClient();
client.dispatcher.subscribeKey('test-key');
client.actionOfType('onChange').pipe(
  op.map(({payload: [key, value]}) => {
    // eslint-disable-next-line no-console
    log.info(`2nd client onChange: key ${key} is changed: ${value as string}`);
  }),
  op.take(1)
).subscribe();
