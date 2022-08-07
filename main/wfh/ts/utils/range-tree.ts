import {RedBlackTree} from './rb-tree';

export type IntervalKey = {low: number; high: number};

class IntervalByLowBoundary<V> extends RedBlackTree<IntervalKey, V> {
  constructor() {
    super((range1, range2) => range1.low - range2.low);
  }
}

class IntervalByHighBoundary<V> extends RedBlackTree<IntervalKey, V> {
  constructor() {
    super((range1, range2) => range1.high - range2.high);
  }
}

export class RangeSearcher<V extends IntervalKey> {
  #lowBoundryTree = new IntervalByLowBoundary<V[]>();
  #highBoundryTree = new IntervalByHighBoundary<V[]>();

  private constructor() {}

  addRange(value: V) {
    const node = this.#lowBoundryTree.search(value);
    if (node) {
      node.value.push(value);
    } else {
      this.#lowBoundryTree.insert(value, [value]);
    }
    const nodeH = this.#highBoundryTree.search(value);
    if (nodeH) {
      nodeH.value.push(value);
    } else {
      this.#highBoundryTree.insert(value, [value]);
    }
  }

  removeRange(value: V) {

  }
}

