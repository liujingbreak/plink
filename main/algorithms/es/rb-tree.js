/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 *
 * features in progress: Dynamic order statistics, range tree
 *
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */
export class RedBlackTree {
    constructor(comparator) {
        this.comparator = comparator;
        this.nil = {
            isRed: false,
            size: 0,
            weight: 0
        };
        this.root = this.nil;
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
    isNil(node) {
        return node === this.nil;
    }
    /**
     * Should override this function to create new typeof tree node
     * @param key
     * @returns existing tree node if key duplicates or a new empty node
     */
    insert(key) {
        let y = this.nil;
        let x = this.root;
        let cmp;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        while (!this.isNil(x)) {
            y = x;
            cmp = this.comparator(key, x.key);
            if (cmp < 0) {
                x = x.left;
            }
            else if (cmp > 0) {
                x = x.right;
            }
            else {
                return x; // duplicate key found
            }
        }
        const z = {
            isRed: true,
            key,
            p: y,
            left: this.nil,
            right: this.nil,
            size: 0
        };
        if (this.isNil(y)) {
            this.root = z;
        }
        let left = this.nil;
        let right = this.nil;
        Object.defineProperty(z, 'left', {
            get() {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
                return left;
            },
            set(v) {
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
            set(v) {
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
            set(v) {
                if (weight === v)
                    return;
                weight = v;
                self.updateNodeSize(z);
            }
        });
        z.weight = 1;
        if (this.isNil(y)) {
            this.root = z;
        }
        else if (cmp < 0) {
            y.left = z;
        }
        else if (cmp > 0) {
            y.right = z;
        }
        this.redBlackInsertFixUp(z);
        return z;
    }
    /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0
    * and it is baesed on "size" which is accumulated  from "weight" of node ands children's
    */
    atIndex(idx, beginNode = this.root) {
        var _a;
        let currNode = beginNode;
        while (!this.isNil(currNode)) {
            const leftSize = (((_a = currNode.left) === null || _a === void 0 ? void 0 : _a.size) || 0);
            if (leftSize === idx)
                return currNode;
            else if (idx < leftSize) {
                currNode = currNode.left;
            }
            else {
                currNode = currNode.right;
                idx -= leftSize + 1;
            }
        }
        return this.isNil(currNode) ? null : currNode;
    }
    indexOf(key) {
        let node = this.search(key);
        if (node == null || node === this.nil)
            return -1;
        let currIdx = (node.left.size || 0);
        while (!this.isNil(node.p)) {
            if (node === node.p.right) {
                currIdx += (node.p.left.size || 0) + 1;
            }
            node = node.p;
        }
        return currIdx;
    }
    search(key) {
        let node = this.root;
        while (!this.isNil(node)) {
            const cmp = this.comparator(key, node.key);
            if (cmp === 0)
                return node;
            if (cmp < 0) {
                node = node.left;
            }
            else {
                node = node.right;
            }
        }
        return null;
    }
    delete(key) {
        const node = this.search(key);
        if (node == null || node === this.nil) {
            return false;
        }
        this.deleteNode(node);
        return true;
    }
    successorNode(node) {
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
    predecessorNode(node) {
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
    *keysGreaterThan(key, includeEqual = false) {
        let node = this.smallestNodeGreaterThanOrEqual(key);
        if (node == null)
            return;
        while (node != null && !this.isNil(node)) {
            if (node.key !== key || includeEqual)
                yield node;
            node = this.successorNode(node);
        }
    }
    greatestNodeSmallerThanOrEqual(key) {
        let y = this.nil;
        let x = this.root;
        let cmp;
        while (!this.isNil(x)) {
            y = x;
            cmp = this.comparator(key, x.key);
            if (cmp < 0) {
                x = x.left;
            }
            else if (cmp > 0) {
                x = x.right;
            }
            else {
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
    smallestNodeGreaterThanOrEqual(key) {
        let y = this.nil;
        let x = this.root;
        let cmp;
        while (!this.isNil(x)) {
            y = x;
            cmp = this.comparator(key, x.key);
            if (cmp < 0) {
                x = x.left;
            }
            else if (cmp > 0) {
                x = x.right;
            }
            else {
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
    *keysSmallerThan(key, includeEqual = false) {
        let node = this.greatestNodeSmallerThanOrEqual(key);
        if (node == null)
            return;
        while (node != null && !this.isNil(node)) {
            if (node.key !== key || includeEqual)
                yield node;
            node = this.predecessorNode(node);
        }
    }
    inorderWalk(callback, node = this.root, level = 0) {
        const nextLevel = level + 1;
        if (!this.isNil(node.left))
            this.inorderWalk(callback, node.left, nextLevel);
        if (!this.isNil(node))
            callback(node, level);
        if (!this.isNil(node.right))
            this.inorderWalk(callback, node.right, nextLevel);
    }
    minimum(node = this.root) {
        while (!this.isNil(node.left)) {
            node = node.left;
        }
        return node === this.nil ? null : node;
    }
    maximum(node = this.root) {
        while (!this.isNil(node.right)) {
            node = node.right;
        }
        return node === this.nil ? null : node;
    }
    size() {
        return this.root === this.nil ? 0 : this.root.size;
    }
    isRed(node) {
        return !!(node === null || node === void 0 ? void 0 : node.isRed);
    }
    isBlack(node) {
        return node == null || !node.isRed;
    }
    deleteNode(z) {
        let y = z;
        let origIsRed = this.isRed(y);
        let x;
        if (this.isNil(z.left)) {
            x = z.right;
            this.transplant(z, z.right);
        }
        else if (this.isNil(z.right)) {
            x = z.left;
            this.transplant(z, z.left);
        }
        else {
            // both left and right child are not empty
            y = this.minimum(z.right);
            origIsRed = this.isRed(y);
            x = y.right;
            // eslint-disable-next-line eqeqeq
            if (y.p == z) {
                x.p = y;
            }
            else {
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
    onLeftChildChange(_parent, _child) {
    }
    /**
     * To be extend and overridden
     */
    onRightChildChange(_parent, _child) {
    }
    updateNodeSize(node) {
        var _a, _b, _c, _d;
        let z = node;
        while (!this.isNil(z)) {
            z.size = z.weight + ((_b = (_a = z.left) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0) + ((_d = (_c = z.right) === null || _c === void 0 ? void 0 : _c.size) !== null && _d !== void 0 ? _d : 0);
            z = z.p;
        }
    }
    deleteFixup(x) {
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
                    x = x.p;
                }
                else {
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
            }
            else if (x.p && x === x.p.right) {
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
                    x = x.p;
                }
                else {
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
    transplant(u, v) {
        if (this.isNil(u.p)) {
            this.root = v;
        }
        else if (u === u.p.left) {
            u.p.left = v;
        }
        else {
            u.p.right = v;
        }
        v.p = u.p;
    }
    redBlackInsertFixUp(z) {
        var _a, _b;
        while (this.isRed(z.p)) {
            if (z.p === z.p.p.left) {
                const uncle = z.p.p.right;
                if (this.isRed(uncle)) {
                    // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
                    z.p.isRed = false;
                    uncle.isRed = false;
                    z.p.p.isRed = true;
                    z = z.p.p;
                }
                else {
                    // uncle is black
                    if (z === z.p.right) {
                        // if is right child tree
                        z = z.p;
                        this.leftRotate(z);
                    }
                    z.p.isRed = false;
                    if (((_a = z.p) === null || _a === void 0 ? void 0 : _a.p) && !this.isNil(z.p.p)) {
                        z.p.p.isRed = true;
                        this.rightRotate(z.p.p);
                    }
                }
            }
            else if (((_b = z.p) === null || _b === void 0 ? void 0 : _b.p) && z.p === z.p.p.right) {
                const uncle = z.p.p.left;
                if (this.isRed(uncle)) {
                    // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
                    z.p.isRed = false;
                    uncle.isRed = false;
                    z.p.p.isRed = true;
                    z = z.p.p;
                }
                else {
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
    leftRotate(x) {
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
    rightRotate(x) {
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
//# sourceMappingURL=rb-tree.js.map