/**
 * Unfinished, TODO: deletion
 */
export interface RedBlackTreeNode<T> {
  isRed: boolean;
  key: T;
  p: RedBlackTreeNode<T> | Nil;
  left: RedBlackTreeNode<T> | Nil;
  right: RedBlackTreeNode<T> | Nil;
  size: number;
}
export interface Nil {
  isRed: boolean;
  size: number;
}

export const nil: Nil = {
  isRed: false,
  size: 0
};
/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 * include features: Dynamic order statistics, range tree
 */
export class RedBlackTree<T> {

  static isNil<T>(node: RedBlackTreeNode<T> | Nil): node is Nil  {
    return node === nil;
  }

  static isNotNil<T>(node: RedBlackTreeNode<T> | Nil): node is RedBlackTreeNode<T>  {
    return node !== nil;
  }
  root: RedBlackTreeNode<T> | Nil = nil;

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
    let y: RedBlackTreeNode<T> | Nil = nil;
    let x = this.root;
    let cmp: number;
    while (RedBlackTree.isNotNil(x)) {
      y = x ;
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
      p: y,
      left: nil,
      right: nil,
      size: 0
    };
    if (!RedBlackTree.isNotNil(y)) {
      this.root = z;
      // z.isRed = false;
    } else if (cmp! < 0 ) {
      y.left = z;
    } else if (cmp! > 0 ) {
      y.right = z;
    }
    this.redBlackInsertFixUp(z);
    return z;
  }

  // delete(key: T) {
  //   const node = this.search(key);
  //   if (node == null) {
  //     return false;
  //   }
  //   this.deleteNode(node);
  //   return true;
  // }

  protected deleteNode(node: RedBlackTreeNode<T>) {
    let origIsRed = node.isRed;
    let x: RedBlackTreeNode<T> | Nil = nil;
    if (RedBlackTree.isNil(node.left)) {
      x = node.right;
      this.transplant(node, node.right);
    } else if (RedBlackTree.isNil(node.right)) {
      x = node.left;
      this.transplant(node, node.left);
    } else {
      // both left and right child are not empty
      const rightMin = this.minimumOf(node.right);
      if (!RedBlackTree.isNotNil(rightMin))
        return false;
      origIsRed = rightMin.isRed;
      x = rightMin.right;
      if (rightMin.p === node) {
        this.transplant(rightMin, rightMin.right);
        rightMin.right = node.right;
        rightMin.right.p = rightMin;
      } else {
        this.transplant(node, rightMin);
      }
      rightMin.left = node.left;
      rightMin.left.p = rightMin;
      rightMin.isRed = node.isRed;
    }
    if (!origIsRed && x) {
      console.log('fixup', x.key);
      this.deleteFixup(x);
    }
    return true;
  }

  private deleteFixup(x: RedBlackTreeNode<T>) {
    while (x.p && x !== this.root && !x.isRed) {
      if (x === x.p.left && x.p.right) {
        let w = x.p.right; // w is x's sibling
        if (w.isRed) {
          w.isRed = false;
          x.p.isRed = true;
          this.leftRotate(x.p);
          w = x.p.right;
        }
        if (w.left && !w.left.isRed && w.right && !w.right.isRed) {
          w.isRed = true;
          x = x.p;
        } else {
          if (w.right && !w.right.isRed && w.left) {
            w.left.isRed = false;
            w.isRed = true;
            this.rightRotate(w);
            w = x.p.right;
          }
          w.isRed = x.p.isRed;
          x.p.isRed = false;
          if (w.right)
            w.right.isRed = false;
          this.leftRotate(x.p);
          x = this.root!;
        }
      } else if (x === x.p.right && x.p.left) {
        let w = x.p.left; // w is x's sibling
        if (w.isRed) {
          w.isRed = false;
          x.p.isRed = true;
          this.rightRotate(x.p);
          w = x.p.left;
        }
        if (w.right && !w.right.isRed && w.left && !w.left.isRed) {
          w.isRed = true;
          x = x.p;
        } else {
          if (w.left && !w.left.isRed && w.right) {
            w.right.isRed = false;
            w.isRed = true;
            this.leftRotate(w);
            w = x.p.left;
          }
          w.isRed = x.p.isRed;
          x.p.isRed = false;
          if (w.left)
            w.left.isRed = false;
          this.rightRotate(x.p);
          x = this.root!;
        }
      }
    }
    x.isRed = false;
  }

  minimumOf(node: Nil | RedBlackTreeNode<T> = this.root) {
    let min: RedBlackTreeNode<T> | Nil = node;
    while (RedBlackTree.isNotNil(node)) {
      min = node;
      node = node.left;
    }
    return min;
  }

  // maximumOf(node: RedBlackTreeNode<T> | Nil = this.root) {

  //   while (RedBlackTree.isNotNil(node))
  //     node = node.right;
  //   return node;
  // }

  private transplant(replaceNode: RedBlackTreeNode<T>, withNode: RedBlackTreeNode<T> | Nil = nil) {
    if (!RedBlackTree.isNotNil(replaceNode.p)) {
      this.root = withNode;
    } else if (replaceNode === replaceNode.p.left) {
      replaceNode.p.left = withNode;
    } else {
      replaceNode.p.right = withNode;
    }
    if (RedBlackTree.isNotNil(withNode))
      withNode.p = replaceNode.p;
  }

  search(key: T): RedBlackTreeNode<T> | null {
    let node = this.root;
    while (RedBlackTree.isNotNil(node)) {
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

  redBlackInsertFixUp(z: RedBlackTreeNode<T>) {
    while (z.p.isRed) {
      if (z.p === ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).left) {
        const uncle = ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).right;
        if (uncle.isRed) {
          // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
          z.p.isRed = false;
          uncle.isRed = false;
          ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).isRed = true;
          z = ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>);
        } else {
          // uncle is black
          if (z === (z.p as RedBlackTreeNode<T>).right) {
            // if is right child tree
            z = z.p as RedBlackTreeNode<T>;
            this.leftRotate(z);
          }
          z.p.isRed = false;
          ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).isRed = true;
          this.rightRotate(((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>));
        }
      } else if (z.p === ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).right) {
        const uncle = ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).left;
        if (uncle.isRed) {
          // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
          z.p.isRed = false;
          uncle.isRed = false;
          ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).isRed = true;
          z = ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>);
        } else {
          // uncle is black
          if (z === (z.p as RedBlackTreeNode<T>).left) {
            z = z.p as RedBlackTreeNode<T>;
            this.rightRotate(z);
          }
          z.p.isRed = false;
          ((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>).isRed = true;
          this.leftRotate(((z.p as RedBlackTreeNode<T>).p as RedBlackTreeNode<T>));
        }
      }
    }
    this.root.isRed = false;
  }

  private leftRotate(x: RedBlackTreeNode<T>) {
    const y = x.right as RedBlackTreeNode<T>;
    x.right = y.left;
    if (RedBlackTree.isNotNil(y.left)) {
      y.left.p = x;
    }
    y.p = x.p;
    if (!RedBlackTree.isNotNil(x.p))
      this.root = y;
    else if (x === x.p.left)
      x.p.left = y;
    else
      x.p.right = y;
    y.left = x;
    x.p = y;
  }

  private rightRotate(x: RedBlackTreeNode<T>) {
    const y = x.left as RedBlackTreeNode<T>;
    x.left = y.right;
    if (RedBlackTree.isNotNil(y.right)) {
      y.right.p = x;
    }
    y.p = x.p;
    if (!RedBlackTree.isNotNil(x.p))
      this.root = y;
    else if (x === x.p.right)
      x.p.right = y;
    else
      x.p.left = y;
    y.right = x;
    x.p = y;
  }
}
