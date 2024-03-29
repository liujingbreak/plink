/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-console */
import * as rx from 'rxjs';
import {describe, it, expect, jest}  from '@jest/globals';
import {RxController, ReactorComposite, payloadRelatedToAction,
  ActionTable, nameOfAction, ReactorCompositeMergeType} from '../src';

type TestMessages = {
  msg1(): void;
  msg2(a: string): void;
  msg3(a: string, b?: number): string;
  msg3Reply(s: string): string;
};

class TestObject {
  msg4() {
  }

  msg5(a: string) {
    return rx.of(a);
  }

  msg6(a: string, b: number) {
    return rx.of(a, b);
  }
}

type TestGroupBy = {
  foobar1(key: string, v: number): void;
  foobar2(key: string, v: string): void;
};

interface TestMessagesExtend {
  msgEx(): void;
}

type ExtReactorComp = ReactorCompositeMergeType<
ReactorComposite<TestMessages>,
TestMessagesExtend
>;

describe('reactivizer', () => {
  describe('RxController basic features', () => {
    it('RxController should work with Typescript\'s type inference, and action table should work', () => {
      const ctl = new RxController<TestMessages>();
      const {dp, pt} = ctl;
      dp.msg3('msg3-a', 9);
      pt.msg3.pipe(
        rx.map(([id, a, b]) => {
          // eslint-disable-next-line no-console
          console.log(id, a, b);
        })
      );


      const ctl2 = new RxController<TestMessages & TestObject>({debug: true});
      const table = new ActionTable(ctl2, ['msg5', 'msg6', 'msg3Reply']);
      const {l} = table;
      const {dp: dp2} = ctl2;

      // test table.getData(), table.dataChange$
      const dataChangeCb = jest.fn();
      const dataCb = jest.fn();
      table.dataChange$.pipe(
        rx.tap(map => {
          dataChangeCb(map);
          dataCb(table.getData());
        })
      ).subscribe();

      dp2.msg1();
      dp2.msg5('x');
      dp2.msg6('aaa', 2);

      const latestPayloadCbMock = jest.fn();
      rx.merge(
        l.msg5.pipe(
          rx.map(([, a]) => {
            latestPayloadCbMock('msg5', a);
          })
        ),
        l.msg6.pipe(
          rx.map(([, a, b]) => {
            latestPayloadCbMock('msg6', a, b);
            expect(b).toBe(2);
          })
        )
      ).subscribe();

      // test table.getLatestActionOf()
      expect(table.getLatestActionOf('msg5')!.slice(1)).toEqual(['x']);
      expect(table.getLatestActionOf('msg6')!.slice(1)).toEqual(['aaa', 2]);
      expect(table.getLatestActionOf('msg3Reply')).toBe(undefined);
      expect(latestPayloadCbMock.mock.calls.length).toBe(2);
      expect(latestPayloadCbMock.mock.calls[0]).toEqual(['msg5', 'x']);
      expect(latestPayloadCbMock.mock.calls[1]).toEqual(['msg6', 'aaa', 2]);

      dp2.msg5('y');
      expect(latestPayloadCbMock.mock.calls.length).toBe(3);
      expect(latestPayloadCbMock.mock.calls[2]).toEqual(['msg5', 'y']);

      console.log('dataChangeCb.mock.calls', dataChangeCb.mock.calls);
      expect(dataChangeCb.mock.calls.length).toBe(3);

      let testTarget = dataChangeCb.mock.calls[0][0] as Record<string, any>;
      console.log('calls:', testTarget);
      expect(testTarget.msg5).toEqual(['x']);
      expect(testTarget.msg6).toEqual([]);

      expect((dataCb.mock.calls[0][0] as Record<string, any>).msg5).toEqual(['x']);
      expect((dataCb.mock.calls[0][0] as Record<string, any>).msg6).toEqual([]);

      testTarget = dataChangeCb.mock.calls[1][0] as Record<string, any>;
      expect(testTarget.msg5).toEqual(['x']);
      expect(testTarget.msg6).toEqual(['aaa', 2]);
      expect((dataCb.mock.calls[1][0] as Record<string, any>).msg5).toEqual(['x']);
      expect((dataCb.mock.calls[1][0] as Record<string, any>).msg6).toEqual(['aaa', 2]);

      testTarget = dataChangeCb.mock.calls[2][0] as Record<string, any>;
      expect(testTarget.msg5).toEqual(['y']);
      expect(testTarget.msg6).toEqual(['aaa', 2]);
      expect((dataCb.mock.calls[2][0] as Record<string, any>).msg5).toEqual(['y']);
      expect((dataCb.mock.calls[2][0] as Record<string, any>).msg6).toEqual(['aaa', 2]);
    });

    it('RxController dispatchAndObserveRes', async () => {
      const c = new RxController<TestMessages>();

      c.at.msg3.pipe(
        rx.map(action => expect(action.p[0]).toEqual('hello'))
      ).subscribe();

      c.pt.msg3.pipe(
        rx.map(([m, a, b]) => {
          expect(a).toEqual('hello');
          expect(b).toEqual(778);
          expect(typeof m.i).toEqual('number');
          c.dispatcher.msg2('Not for you');
          c.dispatcherFor.msg2(m, 'world');
        }),
        rx.take(1)
      ).subscribe();

      const [, res] = await rx.firstValueFrom(c.do.msg3(c.at.msg2, 'hello', 778));
      expect(res).toEqual('world');
      console.log('perfect');
    });

    it('ReactorComposite reactivize should work', async () => {
      const comp = new ReactorComposite<TestMessages, {testOutput(): void}>({name: 'test'});
      const actionResults = [] as any[];
      comp.r(comp.i.pt.msg3.pipe(
        rx.map(([, a, b]) => {
          comp.o.dp.testOutput();
        })
      ));

      const functions1 = {
        hello(greeting: string) {
          return 'Yes ' + greeting;
        },
        async world(param: number) {
          await new Promise(r => setTimeout(r, 100));
          return param;
        }
      };
      const ctl3 = comp.reactivize(functions1);
      const functions2 = {
        foobar() { return rx.of(1, 2, 3); }
      };
      const ctl4 = ctl3.reactivize(functions2);
      // ctl4.startAll();
      const {r, i} = ctl4;

      const mock = jest.fn();

      const latest = ctl4.outputTable.addActions('worldResolved', 'foobarResolved', 'helloResolved').l;
      r(i.core.action$.pipe(
        i.core.ofType('foobar', 'hello'),
        rx.map(a => {})
      ));
      r(ctl4.o.pt.testOutput.pipe(
        rx.map(([id]) => {
          // eslint-disable-next-line no-console
          console.log('on payload testOutput', id);
        })
      ));
      const {at} = ctl4.o;
      r(rx.merge(at.helloResolved, at.worldResolved, at.foobarResolved).pipe(
        rx.map(({t, p: s, r}) => {
          const type = nameOfAction({t})!;
          mock(type, r, ...s);
          actionResults.push(s[0]);
        })
      ));

      i.dp.msg3('a', 1);
      const helloAction = i.dp.hello('human');
      const worldAction = i.dp.world(998);
      const foobarAction = i.dp.foobar();

      await rx.firstValueFrom(latest.worldResolved);
      // await new Promise(r => setTimeout(r, 8000));

      // eslint-disable-next-line no-console
      console.log('actionResults: ', actionResults);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect(actionResults).toEqual(['Yes human', 1, 2, 3, 998]);
      expect(mock.mock.calls.length).toBe(5);
      expect(mock.mock.calls[0]).toEqual(['helloResolved', helloAction.i, 'Yes human']);
      expect(mock.mock.calls[1]).toEqual(['foobarResolved', foobarAction.i, 1]);
      expect(mock.mock.calls[2]).toEqual(['foobarResolved', foobarAction.i, 2]);
      expect(mock.mock.calls[3]).toEqual(['foobarResolved', foobarAction.i, 3]);
      expect(mock.mock.calls[4]).toEqual(['worldResolved', worldAction.i, 998]);
    }, 10000);

    it('Action meta', async () => {
      const c = new RxController<TestMessages>();

      const mock = jest.fn();
      const done = rx.firstValueFrom(c.pt.msg3.pipe(
        rx.map(([m, a, b]) => {
          mock(m, a, b);
          c.dispatcherFor.msg3Reply(m, 'done');
        })
      ));

      const latest = new ActionTable(c, ['msg3Reply']).l;

      const action = c.dp.msg3('aaa', 999);
      const replied = rx.firstValueFrom(latest.msg3Reply.pipe(
        payloadRelatedToAction(action)
      ));
      await done;
      expect(mock.mock.calls[0].slice(1)).toEqual(['aaa', 999]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(typeof (mock.mock.calls[0][0] as any).i).toEqual('number');
      const [, replyPayload] = await replied;
      expect(replyPayload).toEqual('done');
    });
  });

  describe('RxController advanced features', () => {
    it('RxController createLatestPayloadsFor should work', async () => {
      const tableForActions = ['msg2', 'msg1'] as const;
      const ctl = new ReactorComposite<TestMessages, Record<string, never>, typeof tableForActions>({
        name: 'tableSample',
        inputTableFor: tableForActions
      });
      const l = ctl.inputTable.l;
      ctl.i.dp.msg2('replay?');

      let actual = await rx.firstValueFrom(l.msg2.pipe(
        rx.map(([, v]) => v)
      ));
      expect(actual).toBe('replay?');

      ctl.r(l.msg2.pipe(
        rx.map(([, v]) => actual = v)
      ));

      ctl.i.dp.msg2('changed');
      ctl.startAll();
      expect(actual).toBe('changed');
    });

    it('groupControllerBy, core.actionSubscribed$', () => {
      const comp = new RxController<TestGroupBy>();
      const {dp} = comp;

      const jestFn1 = jest.fn();
      const jestFn2 = jest.fn();
      const jestGroupedFn = jest.fn();
      const jestCoreSubFn = jest.fn();

      comp.groupControllerBy(act => act.p[0]).pipe(
        rx.mergeMap(([ctl, ctlByKeyMap]) => {
          jestGroupedFn(ctl, ctlByKeyMap);

          ctl.core.actionSubscribed$.pipe(
            rx.tap(jestCoreSubFn)
          ).subscribe();

          ctl.core.action$.subscribe(v => console.log(v));
          return rx.merge(
            ctl.pt.foobar1.pipe(
              rx.tap(([, k, v]) => jestFn1(ctl.key, k, v))
            ),
            ctl.pt.foobar2.pipe(
              rx.tap(([, k, v]) => jestFn2(ctl.key, k, v))
            )
          );
        })
      ).subscribe();

      dp.foobar1('aaa', 1);
      dp.foobar2('aaa', 'x');
      dp.foobar1('bbb', 2);
      dp.foobar1('aaa', 3);
      dp.foobar2('bbb', 'y');
      expect(jestCoreSubFn.mock.calls.length).toBe(2);
      expect(jestGroupedFn.mock.calls.length).toBe(2);
      expect((jestGroupedFn.mock.calls[0][0] as any).key).toBe('aaa');
      expect((jestGroupedFn.mock.calls[1][0] as any).key).toBe('bbb');
      expect((jestGroupedFn.mock.calls[1][1] as Map<string, any>).size).toBe(2);
      expect((jestGroupedFn.mock.calls[1][1] as Map<string, any>).get('aaa')).toBe(jestGroupedFn.mock.calls[0][0]);
      expect((jestGroupedFn.mock.calls[1][1] as Map<string, any>).get('bbb')).toBe(jestGroupedFn.mock.calls[1][0]);

      expect(jestFn1.mock.calls.length).toBe(3);
      expect(jestFn2.mock.calls.length).toBe(2);
      expect(jestFn1.mock.calls[0]).toEqual(['aaa', 'aaa', 1]);
      expect(jestFn2.mock.calls[0]).toEqual(['aaa', 'aaa', 'x']);
      expect(jestFn1.mock.calls[1]).toEqual(['bbb', 'bbb', 2]);
      expect(jestFn1.mock.calls[2]).toEqual(['aaa', 'aaa', 3]);
      expect(jestFn2.mock.calls[1]).toEqual(['bbb', 'bbb', 'y']);
    });

    it('subForTypes', () => {
      const control = new RxController<TestMessages>();
      const sub = control.subForTypes(['msg2', 'msg3'] as const);
      const mock = jest.fn();
      sub.core.action$.subscribe(action => mock(nameOfAction(action)));

      control.dp.msg1();
      control.dp.msg2('2');
      control.dp.msg1();
      control.dp.msg3('3');
      control.dp.msg1();

      expect(mock.mock.calls.length).toBe(2);
      expect(mock.mock.calls[0][0]).toEqual('msg2');
      expect(mock.mock.calls[1][0]).toEqual('msg3');
    });
  });

  it.skip('Extend ReactorComposite', () => {
    // const c: ExtReactorComp | undefined;
    // console.log(c);
  });

  it('RxController dispatchAndObserveRes in case of error', async () => {
    const comp = new ReactorComposite<TestMessages, TestMessages>();
    comp.r('test error', comp.i.pt.msg1.pipe(
      rx.mergeMap(([m]) => {
        return new rx.Observable(() => {
          console.log('handle test error');
          throw new Error('test error');
        }).pipe(
          comp.catchErrorFor(m)
        );
      })
    ));

    const mock = jest.fn();
    try {
      await rx.firstValueFrom(comp.i.do.msg1(comp.o.at.msg2));
    } catch (e) {
      mock(e);
    }

    expect(mock.mock.calls.length).toBe(1);
    expect((mock.mock.calls[0][0] as Error).message).toBe('test error');
  });
});
