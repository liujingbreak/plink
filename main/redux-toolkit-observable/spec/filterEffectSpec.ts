import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {filterEffect} from '../rx-utils';

type State = {
  a?: number;
  b?: number;
  c?: number;
};

export function test() {
  const store = new rx.BehaviorSubject<State>({a: 0, b: 0});

  store.pipe(
    filterEffect(s => [s.a, s.b]),
    op.tap(([a, b]) => {
      // eslint-disable-next-line no-console
      console.log(a, b);
    })
  ).subscribe();

  store.next({a: 1, b: 1, c: 1});
  store.next({a: 1, b: 1, c: 2});
  store.next({a: 1, b: 2, c: 2});
  store.next({a: 2, b: 2, c: 2});
  store.next({a: 3, b: 3, c: 3});
  store.next({a: 3, b: 3, c: 4});
  store.next({a: 3, b: 3, c: 5});
}
