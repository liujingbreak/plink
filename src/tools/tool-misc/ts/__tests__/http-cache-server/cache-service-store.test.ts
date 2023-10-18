import {Writable} from 'node:stream';
import * as op from 'rxjs/operators';
import {jest, describe, it} from '@jest/globals';
import '@wfh/plink-test/dist/init-plink';
import {forceForkAsPreserveSymlink} from '@wfh/plink';
import {createClient} from '@wfh/tool-misc/dist/http-cache-server/cache-service-client';

jest.setTimeout(20000);
describe('http cache server', () => {
  it('multi-process state server and client uses http "keep-alive" connection', async () => {

    const chrProcOutput = new Writable({
      write(chunk, _enc, cb) {
        // eslint-disable-next-line no-console
        console.log((chunk as Buffer | string).toString());
        cb();
      },
      final(cb) {
        cb();
      }
    });

    const {exited, childProcess} = forceForkAsPreserveSymlink('@wfh/tool-misc/dist/__tests__/http-cache-server/service-main-process', {
      stdio: 'pipe'
    });
    childProcess.stdout!.pipe(chrProcOutput);
    childProcess.stderr!.pipe(chrProcOutput);

    const client = createClient();

    client.dispatcher.ping('test');
    await client.serverReplied('ping', payload => payload === 'test');
    const keyChanged = client.actionOfType('onChange').pipe(
      op.map(({payload: [key, value]}) => {
        // eslint-disable-next-line no-console
        console.log(`key ${key} is changed: ${value as string}`);
      }),
      op.take(1)
    ).toPromise();

    client.dispatcher.subscribeKey('test-key');
    client.dispatcher.subscribeKey('test-key2');
    await new Promise(resolve => setTimeout(resolve, 500));

    client.dispatcher.setForNonexist('test-key', 1);
    await client.serverReplied('setForNonexist', ([key, value]) => key === 'test-key' && value === 1);
    await keyChanged;

    await new Promise(resolve => setTimeout(resolve, 2500));

    const keyChangedAgain = client.actionOfType('onChange').pipe(
      op.filter(({payload: [key, value]}) => key === 'test-key2'),
      op.map(({payload: [key, value]}) => {
        // eslint-disable-next-line no-console
        console.log(`key ${key} is changed: ${value as string}`);
      }),
      op.take(1)
    ).toPromise();

    client.dispatcher.setForNonexist('test-key2', 2);
    await keyChangedAgain;

    client.dispatcher.shutdownServer();
    await client.serverReplied('shutdownServer', () => true);
    childProcess.kill('SIGINT');
    return exited;
  });
});

