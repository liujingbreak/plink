import * as rx from 'rxjs';
import {describe, it, expect, jest}  from '@jest/globals';
import {ReactorComposite} from '../src';

type TestMessages = {
  msg1(): void;
  msg2(a: string): void;
  msg3(a: string, b?: number): string;
  msg3Reply(s: string): string;
};

describe('Reactivizer error handling function', () => {
  it('should log addReactor() label for any error encountered within it', async () => {
    const mockLog = jest.fn((...msg: any[]) => {
      // eslint-disable-next-line no-console
      console.log(...msg);
    });
    const comp = new ReactorComposite<TestMessages>({
      name: 'testComposite',
      log: mockLog,
      debug: true
    });

    comp.r('testReactorLabel', comp.i.at.msg1.pipe(
      rx.concatMap(() => rx.timer(50)),
      rx.withLatestFrom(comp.i.pt.msg2),
      rx.map(() => {throw new Error('testError'); })
    ));

    comp.i.dp.msg2('msg2');
    comp.i.dp.msg1();
    await rx.firstValueFrom(rx.defer(() => rx.timer(500)));
    expect(mockLog).toHaveBeenCalled();
    expect((mockLog.mock.calls[0][0] as string).startsWith('@testComposite::testReactorLabel')).toBeTruthy();
  });

  // it.skip('system console log should been error output destination', async () => {
  //   const mockLog = jest.fn((...msg: any[]) => {});
  //   // eslint-disable-next-line no-console
  //   const origLog = console.error;
  //   // eslint-disable-next-line no-console
  //   console.log = mockLog;
  //   const comp = new ReactorComposite<TestMessages>({
  //     name: 'testComposite2'
  //   });

  //   comp.r('testReactorLabel2', comp.i.at.msg1.pipe(
  //     rx.concatMap(() => rx.timer(50)),
  //     rx.withLatestFrom(comp.i.pt.msg2),
  //     rx.map(() => {throw new Error('testError 2'); })
  //   ));

  //   comp.i.dp.msg2('msg2');
  //   comp.i.dp.msg1();
  //   await rx.firstValueFrom(rx.defer(() => rx.timer(500)));
  //   expect(mockLog).toHaveBeenCalled();
  //   expect((mockLog.mock.calls[0][0] as string).startsWith('@testComposite2::testReactorLabel2')).toBeTruthy();
  //   console.error = origLog;
  // });
});
