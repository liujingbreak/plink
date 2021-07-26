

interface IntervalNode {
  low: number;
  hight: number;
  max: number;
}

interface RedBlackTreeNode<T> {
  isRed: boolean;
  key: T;
  p?: RedBlackTreeNode<T>;
  left?: RedBlackTreeNode<T>;
  right?: RedBlackTreeNode<T>;
}

export class RedBlackTree<T> {
  root: RedBlackTreeNode<T> | undefined;

  constructor(private comparator?: (a: T, b: T) => -1 | 0 | 1) {
    if (comparator == null) {
      this.comparator = (a, b) => {
        return a < b ? -1 :
          a > b ? 1 : 0;
      };
    }
  }

  /**
   * 
   * @param key
   * @returns null if key duplicates with existing tree node
   */
  insert(key: T): RedBlackTreeNode<T> | null {
    let y: RedBlackTreeNode<T> | undefined;
    let x = this.root;
    let cmp: number;
    while (x != null) {
      y = x;
      cmp = this.comparator!(key, x.key);
      if (cmp < 0) {
        x = x.left;
      } else if (cmp > 0) {
        x = x.right;
      } else {
        return null; // duplicate key found
      }
    }
    const z: RedBlackTreeNode<T> = {
      isRed: true,
      key,
      p: y
    };
    if (y == null) {
      this.root = z;
    } else if (cmp! < 0 ) {
      y.left = z;
    } else if (cmp! > 0 ) {
      y.right = z;
    }
    this.redBlackInsertFixUp(z);
    return z;
  }

  delete(key: T) {
    const node = this.search(key);
    if (node == null) {
      return false;
    }
    if (node.left == null) {
      this.transplant(node, node.right);
    } else if (node.right == null) {
      this.transplant(node, node.left);
    } else {
      // both left and right child are not empty
      const rightMin = this.minimumOf(node.right);
      if (rightMin.p !== node) {
        this.transplant(rightMin, rightMin.right);
        rightMin.right = node.right;
        rightMin.right.p = rightMin;
      } else {
        this.transplant(node, rightMin);
      }
      rightMin.left = node.left;
      rightMin.left.p = rightMin;
    }
  }

  minimumOf(node: RedBlackTreeNode<T> = this.root!) {
    while (node.left) {
      node = node.left;
    }
    return node;
  }

  maximumOf(node: RedBlackTreeNode<T> = this.root!) {
    while (node.right)
      node = node.right;
    return node;
  }

  private transplant(replaceNode: RedBlackTreeNode<T>, withNode?: RedBlackTreeNode<T>) {
    if (replaceNode.p == null) {
      this.root = withNode;
    } else if (replaceNode === replaceNode.p.left) {
      replaceNode.p.left = withNode;
    } else {
      replaceNode.p.right = withNode;
    }
    if (withNode)
      withNode.p = replaceNode.p;
  }

  search(key: T): RedBlackTreeNode<T> | null {
    let node = this.root;
    while (node != null) {
      const cmp = this.comparator!(key, node.key);
      if (cmp === 0)
        return node;
      if (cmp < 0) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return null;
  }

  private redBlackInsertFixUp(z: RedBlackTreeNode<T>) {
    while (z.p && z.p.isRed) {
      if (z.p === z.p.p?.left) {
        y = z.p.p.right;
      }

    }
  }

  private leftRotate(x: RedBlackTreeNode<T>) {
    const y = x.right!;
    x.right = y.left;
    if (y.left) {
      y.left.p = x;
    }
    y.p = x.p;
    if (x.p == null)
      this.root = y;
    else if (x === x.p.left)
      x.p.left = y;
    else
      x.p.right = y;
    y.left = x;
    x.p = y;
  }
}
