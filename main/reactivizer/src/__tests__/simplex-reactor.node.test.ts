/* eslint-disable no-console */
import {describe, it, mock as jest} from 'node:test';
import assert from 'node:assert';
import * as rx from 'rxjs';
import {SingleActionFactory, SimplexReactor} from '../index.js';
// import {conciseConsoleLogger} from '../nodejs-utils';

// const inputTableFor = ['message3', 'message1'] as const;
interface TestGroupBy {
  foobar1(key: string, v: number): SingleActionFactory;
  foobar2(key: string, v: string): SingleActionFactory;
}
interface TestActions {
  message1(byWhom?: string): SingleActionFactory;
  message2(greeting: string, byWhom?: string): SingleActionFactory;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  message3<T>(greeting: string, foobar: T): SingleActionFactory;
  message4(a: string, b: number, c: boolean): SingleActionFactory;
}
interface TestResponse {
  reply1(...backMsg: string[]): SingleActionFactory;
  reply2(backMsg: string): SingleActionFactory;
  reply3(backMsg: string): SingleActionFactory;
  reply4(backMsg: number): SingleActionFactory;
}
void describe('simplexReactor', () => {
  void it('interceptBaseAction()', () => {
    const fn = jest.fn();
    const base = new SimplexReactor<TestGroupBy, ['foobar1']>({debug: true, tableFor: ['foobar1']});
    const {r: baseR, pt: bpt} = base;
    baseR('', bpt.foobar1.pipe(
      rx.map(([, ...p]) => {fn(...p);})
    ));

    const service = base.toExtend();
    const {r, pt, ft} = service;
    r('', pt.foobar1.pipe(
      rx.map(([m, key, v]) => {
        const replaceBase = service.interceptBase(m);
        replaceBase.changePayload(key + '.changed', v).dp();
      }),
      rx.take(2)
    ));

    ft.foobar1('foobar1', 1).dp();
    ft.foobar1('foobar1', 2).dp();
    ft.foobar1('foobar1', 3).dp();
    assert.equal(fn.mock.callCount(), 3);
    assert.deepEqual(fn.mock.calls[0].arguments, ['foobar1.changed', 1]);
    assert.deepEqual(fn.mock.calls[1].arguments, ['foobar1.changed', 2]);
    assert.deepEqual(fn.mock.calls[2].arguments, ['foobar1', 3]);
  });
  void it('prehook', async () => {
    const c = new SimplexReactor<TestGroupBy>({debug: true});
    const {preHooks, r, pt, ft} = c;
    const mock = jest.fn();

    r('foobar1 -> foobar2', pt.foobar1.pipe(
      rx.map(([m, k]) => {
        mock('reactor', k);
        ft.foobar2(k, '').dp(m);
      })
    ));
    const removePreHook = preHooks.foobar1('prehook', (_m, key, val) => {
      mock('preHook', key);
      return new rx.Observable(s => {
        setTimeout(() => {
          s.next([key + '.changed', val]);
          s.complete();
        }, 50);
      });
    });

    ft.foobar1('test1', 0).dp();
    await rx.firstValueFrom(
      ft.foobar1('test2', 1).od(pt.foobar2)
    );
    assert.equal(mock.mock.callCount(), 4);
    assert.deepEqual(mock.mock.calls.map(c => c.arguments as string[]), [
      ['preHook', 'test1'],
      ['preHook', 'test2'],
      ['reactor', 'test1.changed'],
      ['reactor', 'test2.changed']
    ]);
    removePreHook();
    await rx.firstValueFrom(
      ft.foobar1('test3', 1).od(pt.foobar2)
    );
    assert.equal(mock.mock.callCount(), 5);
  });
  void it('SingleActionFactory.od()', async () => {
    const service = new SimplexReactor<TestActions & TestResponse>({name: 'case .od()', debug: true});
    const {ft, pt, r} = service;
    const fn = jest.fn<(s: string) => void>();
    r('message1 -> reply1, reply2, reply4', pt.message1.pipe(
      rx.mergeMap(([m]) => {
        return rx.merge(
          service.s.onCancelOf(m).pipe(
            rx.map(() => {fn('onCancel');})
          ),
          new rx.Observable(() => {
            ft.reply1('1').dp(m);
            ft.reply2('2').dp(m);
            ft.reply4(4).dp(m);
          })
        );
      })
    ));

    const [o4, o2, o1] = ft.message1().od(pt.reply4, pt.reply2, pt.reply1);
    const [[, v4], [, v2], [, v1]] = await rx.firstValueFrom(rx.zip(o4, o2, o1));
    assert.equal(v4, 4);
    assert.equal(v2, '2');
    assert.equal(v1, '1');
    assert.equal(fn.mock.callCount(), 1);
  });
  void it.only('intercept mulitiple cascading messages', () => {
    const fn = jest.fn();
    const base = new SimplexReactor<TestActions & TestResponse>({debug: true});
    base.r('', base.pt.message1.pipe(
      rx.map(([m, msg]) => {
        fn('base', msg);
        base.ft.reply1('irrelevant').dp();
        base.ft.reply1(msg ?? '').dp(m);
        base.ft.reply2('test-reply2').dp(m);
      })
    ));
    const service = base.toExtend();
    const {r, pt, ft, base: baseS} = service;
    r('', pt.message1.pipe(
      rx.mergeMap(([, msg0]) => {
        fn('fork', msg0);
        const [rep1$, rep2$] = baseS.ft.message1(msg0 + '.changed').od(
          pt.reply1, pt.reply2
        );

        return rx.combineLatest([rep1$, rep2$]).pipe(
          rx.map(([[, msg], [, msg2]]) => {
            fn('base return', msg, msg2);
          })
        );
      })
    ));
    ft.message1('1st.param').dp();
    ft.message1('2nd.param').dp();
    const args = fn.mock.calls.map(c => c.arguments as string[]);
    console.log(args);
    assert.deepEqual(args, [
      ['fork', '1st.param'],
      ['base', '1st.param.changed'],
      ['base return', '1st.param.changed', 'test-reply2'],
      ['fork', '2nd.param'],
      ['base', '2nd.param'],
      ['base return', '2nd.param', 'test-reply2']
    ]);
  });
});
