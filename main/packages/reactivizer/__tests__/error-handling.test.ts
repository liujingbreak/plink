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
      debug: true
    });

    comp.r('call mock function when error catched', comp.error$.pipe(
      rx.tap(a => mockLog(...a))
    ));

    comp.r('testReactorLabel', comp.i.at.msg1.pipe(
      rx.concatMap(() => rx.timer(50)),
      rx.withLatestFrom(comp.i.pt.msg2),
      rx.map(() => {throw new Error('testError'); })
    ));

    comp.i.dp.msg2('msg2');
    comp.i.dp.msg1();
    await rx.firstValueFrom(rx.defer(() => rx.timer(500)));
    expect(mockLog).toHaveBeenCalled();
    expect((mockLog.mock.calls[0][1] as string).startsWith('@testComposite::testReactorLabel')).toBeTruthy();
  });

  it('handleError() should print error with its label argument', async () => {
    const mockLog = jest.fn((...msg: any[]) => {});
    const comp = new ReactorComposite<TestMessages>({
      name: 'testComposite2',
      debug: true
    });

    comp.r('call mock function when error catched', comp.error$.pipe(
      rx.tap(a => mockLog(...a))
    ));

    comp.r('testReactorLabel2', comp.i.at.msg1.pipe(
      rx.withLatestFrom(comp.i.pt.msg2),
      rx.map(() => {throw new Error('testError 2'); }),
      comp.labelError('customLabel'),
      rx.catchError(() => rx.of('hello')),
      rx.map(() => {throw new Error('testError 3'); })
    ));

    comp.i.dp.msg2('msg2');
    comp.i.dp.msg1();
    await rx.firstValueFrom(rx.defer(() => rx.timer(50)));
    expect(mockLog).toHaveBeenCalled();
    expect((mockLog.mock.calls[1][1] as string).startsWith('@testComposite2::testReactorLabel2')).toBeTruthy();
    expect((mockLog.mock.calls[0][1] as string).startsWith('@testComposite2::customLabel')).toBeTruthy();
  });
});
