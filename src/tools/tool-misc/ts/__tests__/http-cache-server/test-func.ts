/* eslint-disable no-console */
import {fork} from 'node:child_process';
import Path from 'node:path';
import * as op from 'rxjs/operators';
import {plinkEnv} from '@wfh/plink';
import {createClient} from '@wfh/tool-misc/dist/http-cache-server/cache-service-client';

export async function testStore() {
  const mainProc = fork(Path.join(plinkEnv.workDir, 'node_modules/@wfh/tool-misc/dist/__tests__/http-cache-server/service-main-process'));

  const mainProcExited = new Promise<number | null>(resolve => {
    mainProc.once('exit', (code, sig) => {
      resolve(code);
    });
  });

  const client = createClient();
  const cp2 = fork(Path.resolve(__dirname, 'service-client-2.js'));
  const clientProcess2Exited = new Promise<number | null>(resolve => {
    cp2.on('exit', (code, sig) => {
      console.log('2nd CLIENT EXITED');
      resolve(code);
    });
  });

  client.dispatcher.ping('test');
  await client.serverReplied('ping', payload => payload === 'test');
  const keyChanged = client.actionOfType('onChange').pipe(
    op.filter(({payload: [key]}) => key === 'test-key'),
    op.map(({payload: [key, value]}) => {
      // eslint-disable-next-line no-console
      console.log(`key ${key} is changed: ${value as string}`);
      return value as unknown;
    }),
    op.takeWhile(value => value !== 1)
  ).toPromise();

  client.dispatcher.subscribeKey('test-key');
  client.dispatcher.subscribeKey('test-key2');

  await new Promise(resolve => setTimeout(resolve, 500));

  client.dispatcher.setForNonexist('test-key', 1);
  await client.serverReplied('setForNonexist', ([key, value]) => key === 'test-key' && value === 1);
  await keyChanged;
  console.log('test-key is changed for sure');

  await new Promise(resolve => setTimeout(resolve, 2500));

  const keyChangedAgain = client.actionOfType('onChange').pipe(
    op.filter(({payload: [key, value]}) => key === 'test-key2'),
    // op.skip(1),
    op.map(({payload: [key, value]}) => {
      // eslint-disable-next-line no-console
      console.log(`2nd key ${key} is changed: ${value as string}`);
      return value as unknown;
    }),
    op.takeWhile(value => value !== 2)
  ).toPromise();

  client.dispatcher.setForNonexist('test-key2', 2);
  await keyChangedAgain;

  client.dispatcher.shutdownServer();
  await client.serverReplied('shutdownServer', () => true);
  // childProcess.kill('SIGINT');
  await Promise.all([clientProcess2Exited, mainProcExited]);
  console.log('Store server process exits');
}
