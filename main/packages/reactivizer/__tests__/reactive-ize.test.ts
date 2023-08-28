import * as rx from 'rxjs';
import {describe, it, expect}  from '@jest/globals';
import {RxController, ReactorComposite, nameOfAction} from '../';

type TestMessages = {
  msg1(): void;
  msg2(a: string): void;
  msg3(a: string, b?: number): string;
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

describe('reactivizer', () => {
  it('RxController should work with Typescript\'s type inference', () => {
    const ctl = new RxController<TestMessages>();
    const {dp, pt} = ctl;
    dp.msg3('msg3-a', 9);
    pt.msg3.pipe(
      rx.map(([id, a, b]) => {
        // eslint-disable-next-line no-console
        console.log(id, a, b);
      })
    );


    const ctl2 = new RxController<TestMessages & TestObject>();
    const l = ctl2.createLatestPayloadsFor('msg5', 'msg6');
    const {dp: dp2} = ctl2;
    dp2.msg1();
    dp2.msg5('x');
    dp2.msg6('aaa', 2);

    let countExpect = 0;
    rx.merge(
      l.msg5.pipe(
        rx.map(([, a]) => {
          expect(a).toBe('x');
          countExpect++;
        })
      ),
      l.msg6.pipe(
        rx.map(([, a, b]) => {
          expect(a).toBe('aaa');
          expect(b).toBe(2);
          countExpect += 2;
        })
      )
    ).subscribe();
    expect(countExpect).toBe(3);
  });

  it('RxController createLatestPayloadsFor should work', async () => {
    const ctl = new ReactorComposite<TestMessages>();
    const l = ctl.i.createLatestPayloadsFor('msg2');
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

  it('ReactorComposite reactivize should work', async () => {
    const comp = new ReactorComposite<TestMessages, {testOutput(): void;}>({debug: 'test'});
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
      world(foobar: number) {
        return Promise.resolve(foobar);
      }
    };
    const ctl3 = comp.reactivize(functions1);
    const functions2 = {
      foobar() { return rx.of(1, 2, 3); }
    };
    const ctl4 = ctl3.reactivize(functions2);
    // ctl4.startAll();
    const {r, i} = ctl4;
    const actionResultIdByKey = new Map<`${keyof (typeof functions1 & typeof functions2)}Resolved`, number>();
    const latest = ctl4.o.createLatestPayloadsFor('worldResolved', 'foobarResolved', 'helloResolved');
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
      rx.map(({t, p: [s, calledId]}) => {
        const type = nameOfAction({t})!;
        actionResultIdByKey.set(type as any, calledId);
        actionResults.push(s);
      })
    ));

    ctl4.startAll();
    i.dp.msg3('a', 1);
    const helloId = i.dp.hello('human');
    const worldId = i.dp.world(998);
    const foobarId = i.dp.foobar();

    await rx.firstValueFrom(latest.worldResolved);
    // await new Promise(r => setTimeout(r, 8000));

    // eslint-disable-next-line no-console
    console.log('actionResults: ', actionResults);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    expect(actionResults).toEqual(['Yes human', 1, 2, 3, 998]);
    expect(actionResultIdByKey.get('foobarResolved')).toEqual(foobarId);
    expect(actionResultIdByKey.get('helloResolved')).toEqual(helloId);
    expect(actionResultIdByKey.get('worldResolved')).toEqual(worldId);
  }, 10000);
});


