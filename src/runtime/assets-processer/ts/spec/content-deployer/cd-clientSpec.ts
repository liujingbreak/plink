import {toLines, sendAppZip} from '../../content-deployer/cd-client';
import {of, asyncScheduler} from 'rxjs';
import {tap, reduce} from 'rxjs/operators';

// import Path from 'path';
jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60 * 1000;

describe('cd-client', () => {
  xit('toLines pipe operator should work', async () => {

    await of(Buffer.from('\nabcd'), Buffer.from('efg\n123'), Buffer.from('4\n'), asyncScheduler)
    .pipe(
      toLines,
      // tslint:disable-next-line: no-console
      tap(line => console.log(JSON.stringify(line))),
      reduce<string>((acc, value) => {
        acc.push(value);
        return acc;
      }, [] as string[]),
      tap(all => expect(all).toEqual(['', 'abcdefg', '1234']))
    ).toPromise();
  });

  xit('sendAppZip should work', async () => {

    await sendAppZip({
      url: 'http://localhost:14333/_install',
      appName: 'testapp',
      version: 4,
      numOfConc: 2,
      numOfNode: 1
    }, '/Users/liujing/bk/webui-static.zip');
    // tslint:disable-next-line: no-console
    console.log('-----------');
  });
});
