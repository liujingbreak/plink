/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 * 
 * features in progress: Dynamic order statistics, range tree
 * 
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */

export interface RbTreeNode<T> {
  key: T;
  p: RbTreeNode<T> | null;
  left: RbTreeNode<T> | null;
  right: RbTreeNode<T> | null;
  isRed: boolean;
  size: number;
}
export class RedBlackTree<T> {
  root: RbTreeNode<T> | null | undefined = null;

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
  insert(key: T): RbTreeNode<T> | null {
    let y: RbTreeNode<T> | null = null;
    let x = this.root;
    let cmp: number;
    while (x) {
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
    const z: RbTreeNode<T> = {
      isRed: true,
      key,
      p: y,
      left: null,
      right: null,
      size: 0
    };
    if (y == null) {
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

  delete(key: T) {
    const node = this.search(key);
    if (node == null) {
      return false;
    }
    this.deleteNode(node);
    return true;
  }

  isRed(node: RbTreeNode<T> | null | undefined) {
    return node != null && node.isRed;
  }

  isBlack(node: RbTreeNode<T> | null | undefined) {
    return node == null || !node.isRed;
  }

  protected deleteNode(z: RbTreeNode<T>) {
    let y: RbTreeNode<T> | null  = z;
    let origIsRed = this.isRed(y);
    let x: RbTreeNode<T> | null = null;
    if (z.left == null) {
      x = z.right;
      this.transplant(z, z.right);
    } else if (z.right == null) {
      x = z.left;
      this.transplant(z, z.left);
    } else {
      // both left and right child are not empty
      y = this.minimumOf(z.right);
      if (y == null)
        return false;
      origIsRed = this.isRed(y);
      x = y.right;
      if (y.p === z) {
        if (x) x.p = y;
      } else {
        this.transplant(y, y.right);
        y.right = z.right;
        y.right.p = y;
      }
      this.transplant(z, y);
      y.left = z.left;
      y.left.p = y;
      y.isRed = this.isRed(z);
    }
    if (!origIsRed && x) {
      // console.log('delete fixup', x.key);
      this.deleteFixup(x);
    }
    return true;
  }

  private deleteFixup(x: RbTreeNode<T>) {
    while (x !== this.root && this.isBlack(x)) {
      if (x.p && x === x.p.left) {
        let w = x.p.right; // w is x's sibling
        if (this.isRed(w)) {
          w!.isRed = false;
          x.p.isRed = true;
          this.leftRotate(x.p );
          w = x.p.right;
        }
        if (w) {
          if (this.isBlack(w.left) && this.isBlack(w.right)) {
            w.isRed = true;
            x = x.p ;
          } else {
            if (this.isBlack(w.right)) {
              if (w.left)
                w.left.isRed = false;
              w.isRed = true;
              this.rightRotate(w);
              w = x.p.right;
            }
            if (w) w.isRed = this.isRed(x.p);
            x.p.isRed = false;
            if (w?.right) w.right.isRed = false;
            this.leftRotate(x.p );
            x = this.root!;
          }
        }
      } else if (x.p && x === x.p.right) {
        let w = x.p.left; // w is x's sibling
        if (this.isRed(w)) {
          w!.isRed = false;
          x.p.isRed = true;
          this.rightRotate(x.p );
          w = x.p.left;
        }
        if (w) {
          if (this.isBlack(w.right) && this.isBlack(w.left)) {
            w.isRed = true;
            x = x.p ;
          } else {
            if (this.isBlack(w.left)) {
              if (w.right)
                w.right.isRed = false;
              w.isRed = true;
              this.leftRotate(w);
              w = x.p.left;
            }
            if (w) w.isRed = this.isRed(x.p);
            x.p.isRed = false;
            if (w?.left) w.left.isRed = false;
            this.rightRotate(x.p );
            x = this.root!;
          }
        }
      }
    }
    x.isRed = false;
  }

  minimumOf(node: RbTreeNode<T> | null | undefined = this.root) {
    // let min: RbTreeNode<T> | null = null;
    while (node?.left) {
      // min = node;
      node = node.left;
    }
    return node ? node : null;
  }

  // maximumOf(node: RbTreeNode<T> = this.root) {

  //   while (this.isNotNil(node))
  //     node = node.right;
  //   return node;
  // }

  private transplant(replaceNode: RbTreeNode<T>, withNode: RbTreeNode<T> | null = null) {
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

  search(key: T): RbTreeNode<T> | null {
    let node = this.root;
    while (node) {
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

  protected redBlackInsertFixUp(z: RbTreeNode<T>) {
    while (this.isRed(z.p)) {
      if (z.p?.p && z.p === z.p.p.left) {
        const uncle = z.p.p.right;
        if (this.isRed(uncle)) {
          // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
          z.p.isRed = false;
          if (uncle) uncle.isRed = false;
          z.p.p.isRed = true;
          z = z.p.p;
        } else {
          // uncle is black
          if (z === z.p.right) {
            // if is right child tree
            z = z.p;
            this.leftRotate(z);
          }
          if (z.p) {
            z.p.isRed = false;
            if (z.p.p) {
              z.p.p.isRed = true;
              this.rightRotate(z.p.p);
            }
          }
        }
      } else if (z.p?.p && z.p === z.p.p.right) {
        const uncle = z.p.p.left;
        if (this.isRed(uncle)) {
          // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
          z.p.isRed = false;
          if (uncle) uncle.isRed = false;
          z.p.p.isRed = true;
          z = z.p.p;
        } else {
          // uncle is black
          if (z === z.p.left) {
            // if is right child tree
            z = z.p;
            this.rightRotate(z);
          }
          if (z.p) {
            z.p.isRed = false;
            if (z.p.p) {
              z.p.p.isRed = true;
              this.leftRotate(z.p.p);
            }
          }
        }
      }
    }
    if (this.root)
      this.root.isRed = false;
  }

  private leftRotate(x: RbTreeNode<T>) {
    // console.log('leftRotate', x.key);
    const y = x.right;
    if (y == null)
      return;
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

  private rightRotate(x: RbTreeNode<T>) {
    const y = x.left;
    if (y == null)
      return;
    x.left = y.right;
    if (y.right) {
      y.right.p = x;
    }
    y.p = x.p;
    if (x.p == null)
      this.root = y;
    else if (x === x.p.right)
      x.p.right = y;
    else
      x.p.left = y;
    y.right = x;
    x.p = y;
  }
}

/** Allow inserting multiple items with same key in a red-black tree */
export class DuplicateKeyTree<T> extends RedBlackTree<T> {

}

export type Interval = {min: number; max: number};

export class IntervalSearchTree<T extends Interval> {

}

