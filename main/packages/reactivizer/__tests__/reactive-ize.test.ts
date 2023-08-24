import * as rx from 'rxjs';
import {describe, it, expect}  from '@jest/globals';
import {RxController} from '../src';

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
});

