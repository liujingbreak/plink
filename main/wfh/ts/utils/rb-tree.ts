/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 * 
 * features in progress: Dynamic order statistics, range tree
 * 
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */

export type RbTreeNode<T, V = unknown> = {
  key: T;
  value: V;
  p: RbTreeNode<T, V> | null;
  left: RbTreeNode<T, V> | null;
  right: RbTreeNode<T, V> | null;
  isRed: boolean;
  size: number;
};

export class RedBlackTree<T, V = unknown> {
  root: RbTreeNode<T, V> | null | undefined = null;

  constructor(protected comparator?: (a: T, b: T) => number) {
    if (comparator == null) {
      this.comparator = (a, b) => {
        return a < b ?
          -1 :
          a > b ? 1 : 0;
      };
    }
  }

  /**
   * 
   * @param key
   * @returns null if key duplicates with existing tree node
   */
  insert(key: T, value: V): RbTreeNode<T, V> {
    let y: RbTreeNode<T, V> | null = null;
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
        return x; // duplicate key found
      }
    }
    const z = {
      isRed: true,
      key,
      p: y,
      value
      // left: null,
      // right: null
    } as unknown as RbTreeNode<T, V>;

    let left: RbTreeNode<T, V> | null | undefined;
    let right: RbTreeNode<T, V> | null | undefined;

    Object.defineProperty(z, 'left', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return left;
      },
      set(v: RbTreeNode<any, any> | null | undefined) {
        if (left === v)
          return;
        left = v;
        z.size = (left ? left.size : 0) + (right ? right.size : 0) + 1;
      }
    });

    Object.defineProperty(z, 'right', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return right;
      },
      set(v: RbTreeNode<any, any> | null | undefined) {
        if (right === v)
          return;
        right = v;
        z.size = (left ? left.size : 0) + (right ? right.size : 0) + 1;
      }
    });

    let size = 0;

    Object.defineProperty(z, 'size', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return size;
      },
      set(v: number) {
        if (size === v)
          return;

        size = v;
        if (z.p) {
          z.p.size = (z.p.left?.size || 0) + (z.p.right?.size || 0) + 1;
        }
      }
    });

    z.size = 1;

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

  /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0 */
  atIndex(idx: number, beginNode: RbTreeNode<T, V> | null | undefined = this.root): RbTreeNode<T, V> | null | undefined {
    let currNode = beginNode;
    while (currNode) {
      const leftSize = (currNode.left?.size || 0);
      if (leftSize === idx)
        return currNode;
      else if (idx < leftSize) {
        currNode = currNode.left;
      } else {
        currNode = currNode.right;
        idx -= leftSize + 1;
      }
    }
    return currNode;
  }

  indexOf(key: T): number {
    let node = this.search(key);
    if (node == null)
      return -1;

    let currIdx = (node.left?.size || 0);
    while (node.p) {
      if (node === node.p.right) {
        currIdx += (node.p.left?.size || 0) + 1;
      }
      node = node.p;
    }
    return currIdx;
  }

  search(key: T): RbTreeNode<T, V> | null {
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

  delete(key: T) {
    const node = this.search(key);
    if (node == null) {
      return false;
    }
    this.deleteNode(node);
    return true;
  }

  isRed(node: RbTreeNode<T, V> | null | undefined) {
    return !!node?.isRed;
  }

  isBlack(node: RbTreeNode<T, V> | null | undefined) {
    return node == null || !node.isRed;
  }

  protected deleteNode(z: RbTreeNode<T, V>) {
    let y: RbTreeNode<T, V> | null  = z;
    let origIsRed = this.isRed(y);
    let x: RbTreeNode<T, V> | null = null;
    if (z.left == null) {
      x = z.right;
      this.transplant(z, z.right);
    } else if (z.right == null) {
      x = z.left;
      this.transplant(z, z.left);
    } else {
      // both left and right child are not empty
      y = this.minimum(z.right);
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

  private deleteFixup(x: RbTreeNode<T, V>) {
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

  minimum(node: RbTreeNode<T, V> | null | undefined = this.root) {
    // let min: RbTreeNode<T, V> | null = null;
    while (node?.left) {
      node = node.left;
    }
    return node ? node : null;
  }

  private transplant(replaceNode: RbTreeNode<T, V>, withNode: RbTreeNode<T, V> | null = null) {
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

  protected redBlackInsertFixUp(z: RbTreeNode<T, V>) {
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

  private leftRotate(x: RbTreeNode<T, V>) {
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

  private rightRotate(x: RbTreeNode<T, V>) {
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

