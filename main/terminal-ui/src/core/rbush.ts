import * as rx from 'rxjs';
import type RBushType from 'rbush' with {'resolution-mode': 'import'};
import {Rectangle} from './canvas.js';

export {RBushType};
const MyRTreeConstructor$ = new rx.ReplaySubject<new () => RBushType<[Rectangle, unknown]>>(1);
export interface RTree<T> extends RBushType<[Rectangle, T]> {
  searchOverlaps([x, y, w, h]: Rectangle): [Rectangle, T][];
  addOrUnionRectOnOverlap(rect: Rectangle, content: T, merge: (c1: T, c2: T) => T): [Rectangle, T][];
  updateContent(r: Rectangle, content: T): void;
  searchForCovered(r: Rectangle): [Rectangle, T][];
}

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

    searchOverlaps([x, y, w, h]: Rectangle): [Rectangle, T][] {
      return this.search({
        minX: x,
        minY: y,
        maxX: x + w,
        maxY: y + h
      });
    }

    addOrUnionRectOnOverlap(rect: Rectangle, content: T, merge: (c1: T, c2: T) => T) {
      const [x, y, w, h] = rect;
      const results = this.search({minX: x, minY: y, maxX: x + w, maxY: y + h});
      for (const [intersect, c] of results) {
        this.remove([intersect, null as T], isEqualRect);
        rect = rectUnion(intersect, rect);
        this.insert([
          rect,
          merge(content, c)
        ]);
      }
      return results;
    }

    updateContent(r: Rectangle, content: T) {
      this.remove([r, null as T], isEqualRect);
      this.insert([r, content]);
    }

    searchForCovered(r: Rectangle) {
      return this.searchOverlaps(r).filter(
        ([[x, y, w, h]]) => r[0] <= x && r[1] <= y && r[0] + r[2] >= x + w && r[1] + r[3] >= y + h);
    }
  }
  return RTreeCls;
});
rx.from(rtreeProm).subscribe(MyRTreeConstructor$);

/** If the calling module is CJS, the import will have to be async */
export const waitForImport$ = MyRTreeConstructor$.pipe(rx.take(1));
/** For CJS file to load and create an "rbush"'s r-tree instance */
export function createRtreeInstance<T>() {
  const store = new rx.ReplaySubject<RTree<T>>(1);
  MyRTreeConstructor$.pipe(
    rx.map(cls => new cls())
  ).subscribe(store as any);
  return store;
}
export function rectUnion([x1, y1, w1, h1]: Rectangle, [x2, y2, w2, h2]: Rectangle) {
  const x = x1 < x2 ? x1 : x2;
  const y = y1 < y2 ? y1 : y2;
  const r1 = x1 + w1;
  const r2 = x2 + w2;
  const w = r1 > r2 ? r1 - x : r2 - x;
  const b1 = y1 + h1;
  const b2 = y2 + h2;
  const h = b1 > b2 ? b1 - y : b2 - y;
  return [x, y, w, h] as Rectangle;
}
function isEqualRect([a]: [Rectangle, unknown], [b]: [Rectangle, unknown]) {
  return a.every((el, i) => el === b[i]);
}
