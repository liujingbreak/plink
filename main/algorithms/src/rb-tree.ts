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
  p: RbTreeNode<T, V>;
  left: RbTreeNode<T, V>;
  right: RbTreeNode<T, V>;
  isRed: boolean;
  /** total weight of currentt node and children's.
  * size = left child's size + right child size + weight
  */
  size: number;
  /** tree's size() returns sum of all nodes's weight */
  weight: number;
};

export class RedBlackTree<T, V = unknown, ND extends RbTreeNode<T, V> = RbTreeNode<T, V>> {
  nil: RbTreeNode<T, V> = {
    isRed: false,
    size: 0,
    weight: 0
  } as RbTreeNode<T, V>;

  root: RbTreeNode<T, V> | ND = this.nil;

  constructor(protected comparator?: (a: T, b: T) => number) {
    this.nil.right = this.nil;
    this.nil.left = this.nil;
    this.nil.p = this.nil;
    if (comparator == null) {
      this.comparator = (a, b) => {
        return a < b ?
          -1 :
          a > b ? 1 : 0;
      };
    }
  }

  isNil(node: RbTreeNode<T, V>) {
    return node === this.nil;
  }

  /**
   * Should override this function to create new typeof tree node
   * @param key
   * @returns existing tree node if key duplicates or a new empty node
   */
  insert<Value extends [V] | []>(key: T, ...value: Value):
  Value['length'] extends 0 ? RbTreeNode<T, V> : Omit<RbTreeNode<T, V>, 'value'> & {value?: V} {
    let y: RbTreeNode<T, V> = this.nil;
    let x = this.root;
    let cmp: number;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    while (!this.isNil(x)) {
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
    const z: RbTreeNode<T, V> = {
      isRed: true,
      key,
      p: y,
      left: this.nil,
      right: this.nil,
      size: 0
    } as RbTreeNode<T, V>;

    if (this.isNil(y)) {
      this.root = z;
    }

    let left: RbTreeNode<T, V> = this.nil;
    let right: RbTreeNode<T, V> = this.nil;

    Object.defineProperty(z, 'left', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return left;
      },
      set(v: RbTreeNode<T, V>) {
        if (left === v)
          return;
        left = v;
        self.updateNodeSize(z);
        self.onLeftChildChange(z, v);
      }
    });

    Object.defineProperty(z, 'right', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return right;
      },
      set(v: RbTreeNode<T, V>) {
        if (right === v)
          return;
        right = v;
        self.updateNodeSize(z);
        self.onRightChildChange(z, v);
      }
    });

    let weight = 0;

    Object.defineProperty(z, 'weight', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return weight;
      },
      set(v: number) {
        if (weight === v)
          return;

        weight = v;
        self.updateNodeSize(z);
      }
    });

    z.weight = 1;

    if (this.isNil(y)) {
      this.root = z;
    } else if (cmp! < 0 ) {
      y.left = z;
    } else if (cmp! > 0 ) {
      y.right = z;
    }
    this.redBlackInsertFixUp(z);
    return z;
  }

  /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0 
  * and it is baesed on "size" which is accumulated  from "weight" of node ands children's
  */
  atIndex(idx: number, beginNode: RbTreeNode<T, V> = this.root): RbTreeNode<T, V> | null | undefined {
    let currNode = beginNode;
    while (!this.isNil(currNode)) {
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
    return this.isNil(currNode) ? null : currNode;
  }

  indexOf(key: T): number {
    let node = this.search(key);
    if (node == null || node === this.nil)
      return -1;

    let currIdx = (node.left.size || 0);
    while (!this.isNil(node.p)) {
      if (node === node.p.right) {
        currIdx += (node.p.left.size || 0) + 1;
      }
      node = node.p as ND;
    }
    return currIdx;
  }

  search(key: T): ND | null {
    let node = this.root;
    while (!this.isNil(node)) {
      const cmp = this.comparator!(key, node.key);
      if (cmp === 0)
        return node as ND;
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
    if (node == null || node === this.nil) {
      return false;
    }
    this.deleteNode(node);
    return true;
  }

  successorNode(node: RbTreeNode<T, V>): RbTreeNode<T, V> | null {
    if (!this.isNil(node.right)) {
      return this.minimum(node.right);
    }
    let y = node.p;
    while (!this.isNil(y) && node === y.right) {
      node = y;
      y = y.p;
    }
    return this.isNil(y) ? null : y;
  }

  predecessorNode(node: RbTreeNode<T, V>): RbTreeNode<T, V> | null {
    if (!this.isNil(node.left)) {
      return this.maximum(node.left);
    }
    let y = node.p;
    while (!this.isNil(y) && node === y.left) {
      node = y;
      y = y.p;
    }
    return this.isNil(y) ? null : y;
  }

  /**
   * @param key the value of key to be compared which could be related to none nodes in current tree
   * @return interator of existing nodes whose key are greater than specific key
   */
  *keysGreaterThan(key: T, includeEqual = false) {
    let node = this.smallestNodeGreaterThanOrEqual(key);
    if (node == null)
      return;
    while (node != null && !this.isNil(node)) {
      if (node.key !== key || includeEqual)
        yield node;
      node = this.successorNode(node);
    }
  }
  greatestNodeSmallerThanOrEqual(key: T): RbTreeNode<T, V> | null {
    let y: RbTreeNode<T, V> = this.nil;
    let x = this.root;
    let cmp: number | undefined;
    while (!this.isNil(x)) {
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
    if (cmp == null || this.isNil(y))
      return null;
    if (cmp < 0)
      return this.predecessorNode(y);
    else if (cmp > 0)
      return y;
    return null;
  }
  smallestNodeGreaterThanOrEqual(key: T): RbTreeNode<T, V> | null {
    let y: RbTreeNode<T, V> = this.nil;
    let x = this.root;
    let cmp: number | undefined;
    while (!this.isNil(x)) {
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
    if (cmp == null || this.isNil(y))
      return null;
    if (cmp < 0)
      return y;
    else if (cmp > 0)
      return this.successorNode(y);
    return null;
  }
  /**
   * @param key the value of key to be compared which could be related to none nodes in current tree
   * @return interator of existing nodes whose key are greater than specific key
   */
  *keysSmallerThan(key: T, includeEqual = false) {
    let node = this.greatestNodeSmallerThanOrEqual(key);
    if (node == null)
      return;
    while (node != null && !this.isNil(node)) {
      if (node.key !== key || includeEqual)
        yield node;
      node = this.predecessorNode(node);
    }
  }
  inorderWalk(callback: (node: ND, level: number) => void, node = this.root, level = 0) {
    const nextLevel = level + 1;
    if (!this.isNil(node.left))
      this.inorderWalk(callback, node.left, nextLevel);
    if (!this.isNil(node))
      callback(node as ND, level);
    if (!this.isNil(node.right))
      this.inorderWalk(callback, node.right, nextLevel);
  }
  *allChildNodeInorder(node = this.root, level = 0): Generator<[node: ND, level: number]> {
    const nextLevel = level + 1;
    if (!this.isNil(node.left))
      yield *this.allChildNodeInorder(node.left, nextLevel);
    if (!this.isNil(node))
      yield [node as ND, level] as const;
    if (!this.isNil(node.right))
      yield *this.allChildNodeInorder(node.right, nextLevel);
  }

  minimum(node = this.root) {
    while (!this.isNil(node.left)) {
      node = node.left;
    }
    return node === this.nil ? null : node as ND;
  }

  maximum(node = this.root) {
    while (!this.isNil(node.right)) {
      node = node.right;
    }
    return node === this.nil ? null : node as ND;
  }

  size() {
    return this.root === this.nil ? 0 : this.root.size;
  }

  isRed(node: RbTreeNode<T, V> | null | undefined) {
    return !!node?.isRed;
  }

  isBlack(node: RbTreeNode<T, V> | null | undefined) {
    return node == null || !node.isRed;
  }

  deleteNode(z: RbTreeNode<T, V>) {
    let y: RbTreeNode<T, V> = z;
    let origIsRed = this.isRed(y);
    let x: RbTreeNode<T, V>;
    if (this.isNil(z.left)) {
      x = z.right;
      this.transplant(z, z.right);
    } else if (this.isNil(z.right)) {
      x = z.left;
      this.transplant(z, z.left);
    } else {
      // both left and right child are not empty
      y = this.minimum(z.right)!;
      origIsRed = this.isRed(y);
      x = y.right;
      // eslint-disable-next-line eqeqeq
      if (y.p == z) {
        x.p = y;
      } else {
        if (!this.isNil(y)) {
          this.transplant(y, y.right);
          y.right = z.right;
          y.right.p = y;
        }
      }
      this.transplant(z, y);
      y.left = z.left;
      y.left.p = y;
      y.isRed = this.isRed(z);
    }
    // console.log('deleteNode', z.key, z.isRed, origIsRed, 'x', x);
    if (!origIsRed) {
      // console.log('delete fixup', x.key);
      this.deleteFixup(x);
    }
    return true;
  }
  /**
   * To be extend and overridden
   */
  protected onLeftChildChange(_parent: RbTreeNode<T, V>, _child: RbTreeNode<T, V> | null | undefined) {
  }
  /**
   * To be extend and overridden
   */
  protected onRightChildChange(_parent: RbTreeNode<T, V>, _child: RbTreeNode<T, V> | null | undefined) {
  }

  protected updateNodeSize(node: RbTreeNode<T, V>) {
    let z = node;
    while (!this.isNil(z)) {
      z.size = z.weight + (z.left?.size ?? 0) + (z.right?.size ?? 0);
      z = z.p;
    }
  }

  private deleteFixup(x: RbTreeNode<T, V>) {
    while (x !== this.root && this.isBlack(x)) {
      if (x.p && x === x.p.left) {
        let w = x.p.right; // w is x's sibling
        if (this.isRed(w)) {
          w.isRed = false;
          if (!this.isNil(x.p)) {
            x.p.isRed = true;
            this.leftRotate(x.p);
          }
          w = x.p.right;
        }
        if (this.isBlack(w.left) && this.isBlack(w.right)) {
          w.isRed = true;
          x = x.p ;
        } else {
          if (this.isBlack(w.right)) {
            w.left.isRed = false;
            w.isRed = true;
            this.rightRotate(w);
            w = x.p.right;
          }
          w.isRed = this.isRed(x.p);
          x.p.isRed = false;
          w.right.isRed = false;
          this.leftRotate(x.p);
          x = this.root;
        }
      } else if (x.p && x === x.p.right) {
        let w = x.p.left; // w is x's sibling
        if (this.isRed(w)) {
          w.isRed = false;
          if (!this.isNil(x.p)) {
            x.p.isRed = true;
            this.rightRotate(x.p);
          }
          w = x.p.left;
        }
        if (this.isBlack(w.right) && this.isBlack(w.left)) {
          w.isRed = true;
          x = x.p ;
        } else {
          if (this.isBlack(w.left)) {
            w.right.isRed = false;
            w.isRed = true;
            this.leftRotate(w);
            w = x.p.left;
          }
          w.isRed = this.isRed(x.p);
          x.p.isRed = false;
          w.left.isRed = false;
          this.rightRotate(x.p);
          x = this.root;
        }
      }
    }
    x.isRed = false;
  }

  private transplant(u: RbTreeNode<T, V>, v: RbTreeNode<T, V>) {
    if (this.isNil(u.p)) {
      this.root = v;
    } else if (u === u.p.left) {
      u.p.left = v;
    } else {
      u.p.right = v;
    }
    v.p = u.p;
  }

  protected redBlackInsertFixUp(z: RbTreeNode<T, V>) {
    while (this.isRed(z.p)) {
      if (z.p === z.p.p.left) {
        const uncle = z.p.p.right;
        if (this.isRed(uncle)) {
          // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
          z.p.isRed = false;
          uncle.isRed = false;
          z.p.p.isRed = true;
          z = z.p.p;
        } else {
          // uncle is black
          if (z === z.p.right) {
            // if is right child tree
            z = z.p;
            this.leftRotate(z);
          }
          z.p.isRed = false;
          if (z.p?.p && !this.isNil(z.p.p)) {
            z.p.p.isRed = true;
            this.rightRotate(z.p.p);
          }
        }
      } else if (z.p?.p && z.p === z.p.p.right) {
        const uncle = z.p.p.left;
        if (this.isRed(uncle)) {
          // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
          z.p.isRed = false;
          uncle.isRed = false;
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
            if (z.p.p && !this.isNil(z.p.p)) {
              z.p.p.isRed = true;
              this.leftRotate(z.p.p);
            }
          }
        }
      }
    }
    this.root.isRed = false;
  }

  private leftRotate(x: RbTreeNode<T, V>) {
    // console.log('leftRotate', x.key);
    const y = x.right;
    x.right = y.left;
    if (!this.isNil(y.left)) {
      y.left.p = x;
    }
    y.p = x.p;
    if (this.isNil(x.p))
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
    x.left = y.right;
    if (!this.isNil(y.right)) {
      y.right.p = x;
    }
    y.p = x.p;
    if (this.isNil(x.p))
      this.root = y;
    else if (x === x.p.right)
      x.p.right = y;
    else
      x.p.left = y;
    y.right = x;
    x.p = y;
  }
}

