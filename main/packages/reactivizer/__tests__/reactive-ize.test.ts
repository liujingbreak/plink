import * as rx from 'rxjs';
import {describe, it, expect}  from '@jest/globals';
import {RxController, ReactorComposite} from '../src';

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

  it('ReactorComposite reactivize should work', async () => {
    const comp = new ReactorComposite<TestMessages>();
    const actionResults = [] as any[];
    comp.startAll();
    comp.r(comp.i.pt.msg3.pipe(
      rx.map(([, a, b]) => {
        actionResults.push(a);
      })
    ));

    const ctl3 = comp.reactivize({
      hello(greeting: string) {return 'Yes ' + greeting; },
      world(foobar: number) {
        return Promise.resolve(foobar);
      }
    });
    const ctl4 = ctl3.reactivize({
      foobar() { return rx.of(1, 2, 3); }
    });
    ctl4.r(ctl4.o.pt.helloDone.pipe(rx.map(([, s]) => actionResults.push(s))));
    ctl4.r(ctl4.o.pt.worldDone.pipe(rx.map(([, s]) => actionResults.push(s))));
    ctl4.r(ctl4.o.pt.foobarDone.pipe(rx.map(([, s]) => actionResults.push(s))));



    ctl4.i.dp.msg3('start');
    ctl4.i.dp.hello('human');
    ctl4.i.dp.world(998);
    ctl4.i.dp.foobar();

    await new Promise(r => setTimeout(r, 1000));

    // eslint-disable-next-line no-console
    console.log('actionResults: ', actionResults);
    expect(actionResults).toEqual(['start', 'Yes human', 1, 2, 3, 998]);
  });
});


