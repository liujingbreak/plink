import * as rx from 'rxjs';
import type RBushType from 'rbush' with {'resolution-mode': 'import'};
import {Rectangle} from './canvas';

export {RBushType};
const MyRTreeConstructor$ = new rx.ReplaySubject<new () => RBushType<[Rectangle, unknown]>>(1);

const rtreeProm = import('rbush').then(({default: RBush}) => {
  class RTreeCls<T> extends RBush<[Rectangle, T]> {
    constructor() {
      super(5);
    }
    toBBox([[x, y, w, h]]: [Rectangle, T]) {
      return {
        minX: x,
        minY: y,
        maxX: x + w,
        maxY: y + h
      };
    }
    compareMinX(a: [Rectangle, T], b: [Rectangle, T]): number {
      return a[0][0] - b[0][0];
    }
    compareMinY(a: [Rectangle, T], b: [Rectangle, T]): number {
      return a[0][1] - b[0][1];
    }
  }
  return RTreeCls;
});
rx.from(rtreeProm).subscribe(MyRTreeConstructor$);

/** If the calling module is CJS, the import will have to be async */
export const waitForImport$ = MyRTreeConstructor$.pipe(rx.take(1));
/** For CJS file to load and create an "rbush"'s r-tree instance*/
export function createRtreeInstance<T>() {
  const store = new rx.ReplaySubject<RBushType<[Rectangle, T]>>(1);
  MyRTreeConstructor$.pipe(
    rx.map(cls => new cls())
  ).subscribe(store);
  return store;
}
