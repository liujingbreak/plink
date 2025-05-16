import {describe, it} from 'node:test';
import {Worker} from 'worker_threads';
import fs from 'fs';
import Path from 'path';
import * as rx from 'rxjs';
import {useAsInitOption} from '../sqlite-log/sqlite-api';
import {SimplexReactor} from '../simplex-reactor';
import {SingleActionFactory} from '../action-factory';

interface TestService {
  testAction(text: string): SingleActionFactory;
}

void describe('sqlite-log', async () => {
  const dbFile = Path.resolve('test-log.db');

  await it.only('sqlite-api', async t => {
    if (fs.existsSync(dbFile))
      fs.rmSync(dbFile);
    await new Promise(r => setImmediate(r));
    const logger = useAsInitOption(dbFile, true);
    const testWoker = new Worker(Path.join(__dirname, './sqlite-log.test-worker.js'));
    const workerDone$ = new rx.ReplaySubject<void>(1);
    testWoker.on('message', msg => {
      if (msg === 'done') {
        workerDone$.next();
        workerDone$.complete();
        console.log('-- test worker done');
        testWoker.unref();
      }
    });
    testWoker.on('error', err => {
      t.assert.fail(err);
    });
    testWoker.on('messageerror', err => {
      t.assert.fail(err);
    });
    const service = new SimplexReactor<TestService>({
      name: 'testService',
      enableLog: true
    });
    const aaa = service.ft.testAction('AAA').dp();
    service.ft.testAction('BBB').dp(aaa);
    await new Promise(r => setTimeout(r, 1000));
    service.ft.testAction('CCC').dp(aaa);
    await rx.firstValueFrom(workerDone$);
    await logger.stop();
  });
});

