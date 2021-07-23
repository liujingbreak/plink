

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
    let node = this.root;
    let cmp: number;
    while (node != null) {
      y = node;
      cmp = this.comparator!(key, node.key);
      if (cmp < 0) {
        node = node.left;
      } else if (cmp > 0) {
        node = node.right;
      } else {
        return null; // duplicate key found
      }
    }
    const newNode: RedBlackTreeNode<T> = {
      isRed: true,
      key,
      p: y
    };
    if (y == null) {
      this.root = y;
    } else if (cmp! < 0 ) {
      y.left = newNode;
    } else if (cmp! > 0 ) {
      y.right = newNode;
    }
    return newNode;
  }

  delete(key: T) {
    const node = this.search(key);
    if (node == null) {
      return false;
    }
    if (node.left == null) {
      this.transplant(node, node.right);
    }
  }

  private transplant(replaceNode: RedBlackTreeNode<T>, withNode: RedBlackTreeNode<T>) {
    if (replaceNode.p == null) {
      this.root = withNode;
    } else if (replaceNode === replaceNode.p.left) {
      replaceNode.p.left = withNode;
    } else {
      replaceNode.p.right = withNode;
    }
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
}
