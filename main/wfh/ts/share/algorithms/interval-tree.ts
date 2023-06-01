import {RbTreeNode, RedBlackTree} from './rb-tree';

/**
 * A Red black tree node to contains multiple intervals which has same "low" value,
 * "key" is interval's low value
 */
export interface IntervalTreeNode<V = unknown> extends RbTreeNode<number, V, IntervalTreeNode<V>> {
  /** For no duplicate single interval*/
  int?: [low: number, high: number];
  /** For 2-3 intervals which has same "low" value but different "high" value */
  multi?: [high: number, data: V][];
  /** For 4+ intervals, a tree to store different "high" value */
  highValuesTree?: RedBlackTree<number, V>;
  /** Maximum "high" value of multi intervals that this node contains */
  maxHighOfMulti?: number;
  /** Maximum "high" of children */
  max: number;
}

/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *
 *
 */
export class IntervalTree<V = unknown> extends RedBlackTree<number, V, IntervalTreeNode<V>> {
  insertInterval(low: number, high: number, data: V) {
    const node = this.insert(low);
    if (node.int) {
      // A duplicate low boundray
      node.multi = [
        [node.int[1], node.value as V],
        [high, data]
      ];
      node.int = undefined;
    } else if (node.multi) {
      if (node.multi.length >= 3) {
        node.highValuesTree = new RedBlackTree<number, V>();
        for (const [h, v] of node.multi) {
          node.highValuesTree.insert(h).value = v;
        }
        node.highValuesTree.insert(high).value = data;
        node.multi = undefined;
      } else {
        node.multi.push([high, data]);
      }
    } else if (node.highValuesTree) {
      node.highValuesTree.insert(high).value = data;
    } else {
      node.int = [low, high];
      node.value = data;
    }
    if (high > (node.maxHighOfMulti ?? Number.MIN_VALUE)) {
      node.maxHighOfMulti = high;
    }
    maintainNodeMaxValue(node);
    return node;
  }

  deleteInterval(low: number, high: number) {
    const node = this.search(low);
    if (node == null)
      return false;
    if (node.int && node.int[1] === high) {
      this.deleteNode(node);
      return true;
    } else if (node.multi != null) {
      const multiLen = node.multi.length;
      node.multi = node.multi.filter(it => it[0] !== high);
      const deleted = multiLen !== node.multi.length;
      const origMaxHigh = node.maxHighOfMulti;

      if (node.multi.length === 1) {
        node.int = [node.key, node.multi[0][0]];
        node.value = node.multi[0][1];
        node.multi = undefined;
        node.maxHighOfMulti = node.int[1];
      } else if (deleted) {
        node.maxHighOfMulti = node.multi.reduce((max, curr) => Math.max(curr[0], max), Number.MIN_VALUE);
      }
      if (node.p && origMaxHigh !== node.maxHighOfMulti)
        maintainNodeMaxValue(node.p);
      return deleted;
    } else if (node.highValuesTree) {
      return node.highValuesTree.delete(high);
    }
    return false;
  }

  searchSingleOverlap(low: number, high: number) {
    let node = this.root;
    while (node && !doesIntervalOverlap([node.key, node.maxHighOfMulti!], [low, high])) {
      if (node.left && low <= node.left.max) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return node;
  }

  *searchMultipleOverlaps(low: number, high: number): Generator<[low: number, high: number, data: V, node: IntervalTreeNode<V>]> {
    const foundNodes = searchMultipleOverlaps(low, high, this.root);
    // const intervals = new Array<[number, number, V, IntervalTreeNode<V>]>(foundNodes.length);
    for (const node of foundNodes) {
      if (node.int) {
        yield [...node.int, node.value, node];
      } else if (node.multi) {
        for (const [h, data] of node.multi) {
          if (doesIntervalOverlap([low, high], [node.key, h])) {
            yield [node.key, h, data, node];
          }
        }
      } else if (node.highValuesTree) {
        for (const highTreeNode of node.highValuesTree.keysSmallererThan(high)) {
          yield [node.key, highTreeNode.key, highTreeNode.value, node];
        }
      }
    }
  }

  /** @Override
   */
  protected onLeftChildChange(parent: IntervalTreeNode<V>, child: IntervalTreeNode<V> | null | undefined) {
    maintainNodeMaxValue<V>(parent);
  }
  /** @Override
   */
  protected onRightChildChange(parent: IntervalTreeNode<V>, child: IntervalTreeNode<V> | null | undefined) {
    maintainNodeMaxValue<V>(parent);
  }
}

function maintainNodeMaxValue<V>(node: IntervalTreeNode<V>) {
  let currNode: IntervalTreeNode<V> | null = node;
  while (currNode) {
    if (currNode.maxHighOfMulti == null)
      throw new Error('currNode.maxHighOfMulti should not be empty');
    currNode.max = Math.max(currNode.maxHighOfMulti, Math.max(
      currNode.left?.max ?? Number.MIN_VALUE, currNode.right?.max ?? Number.MIN_VALUE
    ));
    currNode = currNode.p;
  }
}

function doesIntervalOverlap(intA: [number, number], intB: [number, number]) {
  // Not in case of: intA is left to intB or intA is right to intB entirely
  return !(intA[1] < intB[0] || intB[1] < intA[0]);
}

function searchMultipleOverlaps<V>(low: number, high: number, node: IntervalTreeNode<V> | null | undefined): IntervalTreeNode<V>[] {
  const overlaps = [] as IntervalTreeNode<V>[];
  if (node == null) {
    return overlaps;
  }
  if (doesIntervalOverlap([node.key, node.maxHighOfMulti!], [low, high])) {
    overlaps.push(node);
  }
  if (node.left && low <= node.left.max) {
    const overlapsLeftChild = searchMultipleOverlaps(low, high, node.left);
    if (overlapsLeftChild.length > 0) {
      overlaps.push(...overlapsLeftChild);
      const overlapsRightChild = searchMultipleOverlaps(low, high, node.right);
      overlaps.push(...overlapsRightChild);
    }
    // Skip right child, as if zero left child overlaps, then
    // target interval's high value must be even smaller than all left children's low values,
    // meaning entire left child tree is greater than target interval, so right child tree does the same
  } else {
    const overlapsRightChild = searchMultipleOverlaps(low, high, node.right);
    overlaps.push(...overlapsRightChild);
  }
  return overlaps;
}
