import {RbTreeNode, RedBlackTree} from './rb-tree';

/**
 * A Red black tree node to contains multiple intervals which has same "low" value,
 * "key" is interval's low value
 */
export interface IntervalTreeNode<V = unknown> extends RbTreeNode<number, V, IntervalTreeNode<V>> {
  /** For no duplicate single interval*/
  int?: [low: number, high: number];
  /** For multiple intervals, a tree to store different "high" value */
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
      if (node.int[1] === high) {
        // duplicate high boundray value
        node.value = data;
        return node;
      }
      // A duplicate low boundray
      node.highValuesTree = new RedBlackTree<number, V>();
      node.highValuesTree.insert(node.int[1]).value = node.value;
      node.highValuesTree.insert(high).value = data;

      node.int = undefined;
      node.weight++;
    } if (node.highValuesTree) {
      node.highValuesTree.insert(high).value = data;
      node.weight = node.highValuesTree.size();
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
    } else if (node.highValuesTree) {
      const origMaxHigh = node.maxHighOfMulti;
      const deleted = node.highValuesTree.delete(high);
      if (deleted) {
        node.weight--;
        if (node.highValuesTree.size() === 1) {
          node.int = [node.key, node.highValuesTree.root!.key];
          node.value = node.highValuesTree.root!.value;
          node.highValuesTree = undefined;
          node.maxHighOfMulti = node.int[1];
          if (origMaxHigh !== node.maxHighOfMulti)
            maintainNodeMaxValue(node);
          return true;
        } else {
          node.maxHighOfMulti = node.highValuesTree.maximum()!.key;
          if (origMaxHigh !== node.maxHighOfMulti)
            maintainNodeMaxValue(node);
          return true;
        }
      }
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
    const foundNodes = [] as IntervalTreeNode<V>[];
    searchMultipleOverlaps(foundNodes, low, high, this.root);
    // const intervals = new Array<[number, number, V, IntervalTreeNode<V>]>(foundNodes.length);
    for (const node of foundNodes) {
      if (node.int) {
        yield [...node.int, node.value, node];
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

function searchMultipleOverlaps<V>(
  overlaps: IntervalTreeNode<V>[], low: number, high: number, node: IntervalTreeNode<V> | null | undefined
): number {
  if (node == null) {
    return 0;
  }
  let numOverlaps = 0;
  if (doesIntervalOverlap([node.key, node.maxHighOfMulti!], [low, high])) {
    overlaps.push(node);
    numOverlaps = 1;
  }
  if (node.left && low <= node.left.max) {
    const numOverlapsLeft = searchMultipleOverlaps(overlaps, low, high, node.left);
    if (numOverlapsLeft > 0) {
      numOverlaps += numOverlapsLeft;
      numOverlaps += searchMultipleOverlaps(overlaps, low, high, node.right);
    }
    // Skip right child, as if zero left child overlaps, then
    // target interval's high value must be even smaller than all left children's low values,
    // meaning entire left child tree is greater than target interval, so right child tree does the same
  } else {
    numOverlaps += searchMultipleOverlaps(overlaps, low, high, node.right);
  }
  return numOverlaps;
}
