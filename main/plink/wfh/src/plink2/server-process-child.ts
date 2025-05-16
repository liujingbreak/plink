import {isMainThread, threadId} from 'worker_threads';
import * as rx from 'rxjs';
import {RxController2, BaseActions, deserializeAction2, serializeAction} from '@wfh/reactivizer';
import chalk from 'chalk';

import {createService} from './server-child-process-service';

const service = createService(log);
function log(...msg: (string | number | boolean)[]) {
  process.send!({
    type: 'plink2:log',
    msg
  });
}

const startTime = new Date().getTime();

if (process.send) {
  const {s, r} = service;
  s.ft.onReady().dp({i: Number(process.argv[2])});
  s.ft.setRootDir(process.cwd()).dp();
  r('events should be lifted to parent process', rx.merge(
    s.at.onCommandError, s.at.onCommandDone, s.at.onReady, s.at.onShutdown, (s as unknown as RxController2<BaseActions>).at.__onError,
    s.at.onUncaughtServiceError
  ).pipe(
    rx.map(a => process.send!({
      type: 'rx:message',
      content: serializeAction(a)
    }))
  ));
  process.on('message', (msg: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (msg.type === 'rx:message') {
      deserializeAction2((msg as {content: any}).content, service.s);
      return;
    }
  });
  process.env.__plinkLogMainPid = process.pid + '';
  // initProcess('save');
  process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
      chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
  });
}
