import {RbTreeNode, RedBlackTree} from './rb-tree';

/**
 * A Red black tree node to contains multiple intervals which has same "low" value,
 * "key" is interval's low value
 */
interface IntervalTreeBaseNode<V = unknown> extends RbTreeNode<number, V> {
  /** Maximum "high" of children */
  max: number;
  p: NonDuplicateNode<V> | DuplicateNode<V>;
  left: NonDuplicateNode<V> | DuplicateNode<V>;
  right: NonDuplicateNode<V> | DuplicateNode<V>;
  /** Maximum "high" value of multi intervals that this node contains */
  maxHighOfMulti: number;
}

export interface NonDuplicateNode<V = unknown> extends IntervalTreeBaseNode<V> {
  /** For no duplicate single interval, be aware that "high endpoint" is considered as an included value */
  int: [low: number, high: number];
  highValuesTree?: undefined;
}

export interface DuplicateNode<V = unknown> extends IntervalTreeBaseNode<V> {
  int: undefined;
  /** For multiple intervals, a tree to store different "high" value */
  highValuesTree: RedBlackTree<number, V>;
}

export type IntervalTreeNode<V = unknown> = NonDuplicateNode<V> | DuplicateNode<V>;

export type OverlapSearchResult<V> = readonly [
  low: number,
  high: number,
  data: V,
  highValueNode: null | RbTreeNode<number, V>,
  intervalNode: IntervalTreeNode<V>
];
/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *  Be aware that "high endpoint" is considered as an included value
 */
export class IntervalTree<V = unknown> extends RedBlackTree<number, V, IntervalTreeNode<V>> {
  /** Return tree node which could be either NonDuplicateNode or a node of DuplicateNode['highValuesTree'],
   * the returned tree node could be the old one if there is already existing node with same "key" (low value)
   */
  insertInterval(low: number, high: number):
  Omit<IntervalTreeNode<V>, 'value'> & {value?: V} | Omit<RbTreeNode<number, V>, 'value'> & {value?: V} {
    let valueContainer: Omit<IntervalTreeNode<V>, 'value'> & {value?: V} | Omit<RbTreeNode<number, V>, 'value'> & {value?: V};
    if (low > high) {
      const temp = high = low;
      low = temp;
    }
    const node = this.insert(low) as IntervalTreeNode<V>;
    if ((node as NonDuplicateNode<V>).int) {
      if ((node as NonDuplicateNode<V>).int[1] === high) {
        return node;
      }
      // A duplicate low boundray
      const highValuesTree = (node as DuplicateNode<V>).highValuesTree = new RedBlackTree<number, V>();
      highValuesTree.insert((node as NonDuplicateNode<V>).int[1]).value = node.value;
      valueContainer = highValuesTree.insert(high);

      node.int = undefined;
      node.weight++;
      if (high > node.maxHighOfMulti)
        node.maxHighOfMulti = high;
    } else if (isDuplicateNode(node)) {
      valueContainer = node.highValuesTree.insert(high);
      node.weight = node.highValuesTree.size();
      if (high > node.maxHighOfMulti)
        node.maxHighOfMulti = high;
    } else {
      node.int = [low, high];
      valueContainer = node;
      node.maxHighOfMulti = high;
    }
    // if (high > ((node as DuplicateNode<V>).maxHighOfMulti ?? Number.MIN_VALUE)) {
    //   (node as DuplicateNode<V>).maxHighOfMulti = high;
    // }
    this.maintainNodeMaxValue(node);
    return valueContainer;
  }

  deleteInterval(low: number, high: number) {
    if (low > high) {
      const temp = high = low;
      low = temp;
    }
    const node = this.search(low);
    if (node == null || node === this.nil)
      return false;
    if (node.int?.[1] === high) {
      this.deleteNode(node);
      return true;
    } else if (isDuplicateNode(node)) {
      const origMaxHigh = node.maxHighOfMulti;
      const deleted = node.highValuesTree.delete(high);
      if (deleted) {
        node.weight--;
        if (node.highValuesTree.size() === 1) {
          (node as unknown as NonDuplicateNode<V>).int = [node.key, node.highValuesTree.root.key];
          node.value = node.highValuesTree.root.value;
          node.maxHighOfMulti = node.highValuesTree.root.key;
          (node as unknown as NonDuplicateNode).highValuesTree = undefined;
          if (origMaxHigh !== node.maxHighOfMulti)
            this.maintainNodeMaxValue(node);
          return true;
        } else {
          node.maxHighOfMulti = node.highValuesTree.maximum()!.key;
          if (origMaxHigh !== node.maxHighOfMulti)
            this.maintainNodeMaxValue(node);
          return true;
        }
      }
    }
    return false;
  }

  searchIntervalNode(low: number, high: number): IntervalTreeNode<V> | RbTreeNode<number, V> | null {
    if (low > high) {
      const temp = high = low;
      low = temp;
    }
    const node = this.search(low);
    if (node == null || node === this.nil)
      return null;
    if (node.int && node.int[1] === high) {
      return node;
    } else if (node.highValuesTree) {
      return node.highValuesTree.search(high);
    }
    return null;
  }

  /** @param high is considered as an included endpoint value */
  searchSingleOverlap(low: number, high: number): OverlapSearchResult<V> | null {
    if (this.root === this.nil)
      return null;
    let node = this.root as IntervalTreeNode<V>;
    while (node !== this.nil && !doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
      if ((node.left !== this.nil) && low <= node.left.max) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return node === this.nil ?
      null :
      [
        node.key,
        node.maxHighOfMulti,
        node.highValuesTree && node.highValuesTree.size() > 0 ?
          node.highValuesTree.maximum()!.value :
          node.value,
        node.highValuesTree?.maximum() ?? null,
        node
      ] as const;
  }
  /** @param high is considered as an included endpoint value */
  searchMultipleOverlaps(low: number, high: number): OverlapSearchResult<V>[] {
    const foundNodes = [] as [number, number, null | RbTreeNode<number, V>, IntervalTreeNode<V>][];
    if (this.root === this.nil)
      return [];
    this._searchMultipleOverlaps(foundNodes, low, high, this.root as IntervalTreeNode<V>);
    return foundNodes.map(([l, h, hNode, n]) => {
      return [l, h, hNode ? hNode.value : n.value, hNode, n];
    });
  }
  /** traverse all nodes in in-order */
  *allIntervals(): Generator<readonly [number, number, V], void, unknown> {
    for (const [node] of this.allChildNodeInorder()) {
      if (node.highValuesTree)
        for (const [hvNode] of node.highValuesTree.allChildNodeInorder()) {
          yield [node.key, hvNode.key, hvNode.value] as const;
        }
      else
        yield [...node.int, node.value] as const;
    }
  }

  /** @Override
   */
  protected onLeftChildChange(parent: IntervalTreeNode<V>, _child: IntervalTreeNode<V> | null | undefined) {
    this.maintainNodeMaxValue<V>(parent);
  }
  /** @Override
   */
  protected onRightChildChange(parent: IntervalTreeNode<V>, _child: IntervalTreeNode<V> | null | undefined) {
    this.maintainNodeMaxValue<V>(parent);
  }
  protected maintainNodeMaxValue<V>(node: IntervalTreeNode<V>) {
    let currNode: IntervalTreeNode<V> | undefined = node;
    while (currNode != null && (currNode as any) !== this.nil) {
      // if (currNode.maxHighOfMulti == null)
      //   throw new Error('currNode.maxHighOfMulti should not be empty');
      currNode.max = Math.max(currNode.maxHighOfMulti, Math.max(
        currNode.left !== this.nil as any ? currNode.left.max : Number.MIN_VALUE,
        currNode.right !== this.nil as any ? currNode.right.max : Number.MIN_VALUE
      ));
      currNode = currNode.p;
    }
  }

  protected _searchMultipleOverlaps<V>(
    overlaps: (readonly [
      low: number,
      high: number,
      highValueNode: null | RbTreeNode<number, V>,
      intervalNode: IntervalTreeNode<V>
    ])[],
    low: number,
    high: number,
    node: IntervalTreeNode<V> | null | undefined
  ): number {
    if (node == null || (node as any) === this.nil) {
      return 0;
    }
    let numOverlaps = 0;
    if (doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
      if (node.int) {
        overlaps.push([...node.int, null, node]);
        numOverlaps = 1;
      } else if (node.highValuesTree) {
        if (low < node.key) {
          for (const [n] of node.highValuesTree.allChildNodeInorder()) {
            overlaps.push([node.key, n.key, n, node]);
          }
          numOverlaps = node.highValuesTree.size();
        } else {
          const beforeLen = overlaps.length;
          for (const hNode of node.highValuesTree.keysGreaterThan(low, true))
            overlaps.push([node.key, hNode.key, hNode, node] as const);
          numOverlaps = overlaps.length - beforeLen;
        }
      }
    }
    if ((node.left as unknown) !== this.nil && low <= node.left.max) {
      const numOverlapsLeft = this._searchMultipleOverlaps(overlaps, low, high, node.left);
      if (numOverlapsLeft > 0) {
        numOverlaps += numOverlapsLeft;
        numOverlaps += this._searchMultipleOverlaps(overlaps, low, high, node.right);
      }
      // Skip right child, as if zero left child overlaps, then
      // target interval's high value must be even smaller than all left children's low values,
      // meaning entire left child tree is greater than target interval, so right child tree does the same
    } else {
      numOverlaps += this._searchMultipleOverlaps(overlaps, low, high, node.right);
    }
    return numOverlaps;
  }
}

/** A multi-value tree node can contain multiple intervals, in this case the tree node is assignable to type "DuplicateNode" */
export function isDuplicateNode<V>(node: IntervalTreeNode<V>): node is DuplicateNode<V> {
  return !!(node as DuplicateNode<V>).highValuesTree;
}

function doesIntervalOverlap(intA: [number, number], intB: [number, number]) {
  // Not in case of: intA is left to intB or intA is right to intB entirely
  return !(intA[1] < intB[0] || intB[1] < intA[0]);
}
