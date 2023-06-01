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
        this.root = null;
        if (comparator == null) {
            this.comparator = (a, b) => {
                return a < b ?
                    -1 :
                    a > b ? 1 : 0;
            };
        }
    }
    /**
     * Should override this function to create new typeof tree node
     * @param key
     * @returns existing tree node if key duplicates or a new empty node
     */
    insert(key) {
        let y = null;
        let x = this.root;
        let cmp;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        while (x) {
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
            p: y
        };
        let left;
        let right;
        Object.defineProperty(z, 'left', {
            get() {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
                return left;
            },
            set(v) {
                if (left === v)
                    return;
                left = v;
                z.size = (left ? left.size : 0) + (right ? right.size : 0) + 1;
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
                z.size = (left ? left.size : 0) + (right ? right.size : 0) + 1;
                self.onRightChildChange(z, v);
            }
        });
        let size = 0;
        Object.defineProperty(z, 'size', {
            get() {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
                return size;
            },
            set(v) {
                var _a, _b;
                if (size === v)
                    return;
                size = v;
                if (z.p) {
                    z.p.size = (((_a = z.p.left) === null || _a === void 0 ? void 0 : _a.size) || 0) + (((_b = z.p.right) === null || _b === void 0 ? void 0 : _b.size) || 0) + 1;
                }
            }
        });
        z.size = 1;
        if (y == null) {
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
    /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0 */
    atIndex(idx, beginNode = this.root) {
        var _a;
        let currNode = beginNode;
        while (currNode) {
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
        return currNode;
    }
    indexOf(key) {
        var _a, _b;
        let node = this.search(key);
        if (node == null)
            return -1;
        let currIdx = (((_a = node.left) === null || _a === void 0 ? void 0 : _a.size) || 0);
        while (node.p) {
            if (node === node.p.right) {
                currIdx += (((_b = node.p.left) === null || _b === void 0 ? void 0 : _b.size) || 0) + 1;
            }
            node = node.p;
        }
        return currIdx;
    }
    search(key) {
        let node = this.root;
        while (node) {
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
        if (node == null) {
            return false;
        }
        this.deleteNode(node);
        return true;
    }
    successorNode(node) {
        if (node.right) {
            return this.minimum(node.right);
        }
        let y = node.p;
        while (y && node === y.right) {
            node = y;
            y = y.p;
        }
        return y;
    }
    predecessorNode(node) {
        if (node.left) {
            return this.maximum(node.left);
        }
        let y = node.p;
        while (y && node === y.left) {
            node = y;
            y = y.p;
        }
        return y;
    }
    /**
     * @param key the value of key to be compared which could be related to none nodes in current tree
     * @return interator of existing nodes whose key are greater than specific key
     */
    *keysGreaterThan(key) {
        let node = this.root;
        while (node) {
            const cmp = this.comparator(key, node.key);
            if (cmp === 0)
                break;
            if (cmp < 0) {
                if (node.left == null) {
                    let z = node;
                    while (z) {
                        yield z;
                        z = this.successorNode(z);
                    }
                    break;
                }
                node = node.left;
            }
            else {
                if (node.right == null) {
                    let z = node.p;
                    while (z) {
                        yield z;
                        z = this.successorNode(z);
                    }
                    break;
                }
                node = node.right;
            }
        }
    }
    /**
     * @param key the value of key to be compared which could be related to none nodes in current tree
     * @return interator of existing nodes whose key are greater than specific key
     */
    *keysSmallererThan(key) {
        let node = this.root;
        while (node) {
            const cmp = this.comparator(key, node.key);
            if (cmp === 0)
                break;
            if (cmp < 0) {
                if (node.left == null) {
                    let z = node.p;
                    while (z) {
                        yield z;
                        z = this.predecessorNode(z);
                    }
                    break;
                }
                node = node.left;
            }
            else {
                if (node.right == null) {
                    let z = node;
                    while (z) {
                        yield z;
                        z = this.predecessorNode(z);
                    }
                    break;
                }
                node = node.right;
            }
        }
    }
    inorderWalk(callback, node = this.root, level = 0) {
        const nextLevel = level + 1;
        if (node === null || node === void 0 ? void 0 : node.left)
            this.inorderWalk(callback, node.left, nextLevel);
        if (node)
            callback(node, level);
        if (node === null || node === void 0 ? void 0 : node.right)
            this.inorderWalk(callback, node.right, nextLevel);
    }
    minimum(node = this.root) {
        while (node === null || node === void 0 ? void 0 : node.left) {
            node = node.left;
        }
        return node !== null && node !== void 0 ? node : null;
    }
    maximum(node = this.root) {
        while (node === null || node === void 0 ? void 0 : node.right) {
            node = node.right;
        }
        return node !== null && node !== void 0 ? node : null;
    }
    size() {
        var _a, _b;
        return (_b = (_a = this.root) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0;
    }
    isRed(node) {
        return !!(node === null || node === void 0 ? void 0 : node.isRed);
    }
    isBlack(node) {
        return node == null || !node.isRed;
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
    deleteNode(z) {
        let y = z;
        let origIsRed = this.isRed(y);
        let x = null;
        if (z.left == null) {
            x = z.right;
            this.transplant(z, z.right);
        }
        else if (z.right == null) {
            x = z.left;
            this.transplant(z, z.left);
        }
        else {
            // both left and right child are not empty
            y = this.minimum(z.right);
            if (y == null)
                return false;
            origIsRed = this.isRed(y);
            x = y.right;
            if (y.p === z) {
                if (x)
                    x.p = y;
            }
            else {
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
    deleteFixup(x) {
        while (x !== this.root && this.isBlack(x)) {
            if (x.p && x === x.p.left) {
                let w = x.p.right; // w is x's sibling
                if (this.isRed(w)) {
                    w.isRed = false;
                    x.p.isRed = true;
                    this.leftRotate(x.p);
                    w = x.p.right;
                }
                if (w) {
                    if (this.isBlack(w.left) && this.isBlack(w.right)) {
                        w.isRed = true;
                        x = x.p;
                    }
                    else {
                        if (this.isBlack(w.right)) {
                            if (w.left)
                                w.left.isRed = false;
                            w.isRed = true;
                            this.rightRotate(w);
                            w = x.p.right;
                        }
                        if (w)
                            w.isRed = this.isRed(x.p);
                        x.p.isRed = false;
                        if (w === null || w === void 0 ? void 0 : w.right)
                            w.right.isRed = false;
                        this.leftRotate(x.p);
                        x = this.root;
                    }
                }
            }
            else if (x.p && x === x.p.right) {
                let w = x.p.left; // w is x's sibling
                if (this.isRed(w)) {
                    w.isRed = false;
                    x.p.isRed = true;
                    this.rightRotate(x.p);
                    w = x.p.left;
                }
                if (w) {
                    if (this.isBlack(w.right) && this.isBlack(w.left)) {
                        w.isRed = true;
                        x = x.p;
                    }
                    else {
                        if (this.isBlack(w.left)) {
                            if (w.right)
                                w.right.isRed = false;
                            w.isRed = true;
                            this.leftRotate(w);
                            w = x.p.left;
                        }
                        if (w)
                            w.isRed = this.isRed(x.p);
                        x.p.isRed = false;
                        if (w === null || w === void 0 ? void 0 : w.left)
                            w.left.isRed = false;
                        this.rightRotate(x.p);
                        x = this.root;
                    }
                }
            }
        }
        x.isRed = false;
    }
    transplant(replaceNode, withNode = null) {
        if (replaceNode.p == null) {
            this.root = withNode;
        }
        else if (replaceNode === replaceNode.p.left) {
            replaceNode.p.left = withNode;
        }
        else {
            replaceNode.p.right = withNode;
        }
        if (withNode)
            withNode.p = replaceNode.p;
    }
    redBlackInsertFixUp(z) {
        var _a, _b;
        while (this.isRed(z.p)) {
            if (((_a = z.p) === null || _a === void 0 ? void 0 : _a.p) && z.p === z.p.p.left) {
                const uncle = z.p.p.right;
                if (this.isRed(uncle)) {
                    // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
                    z.p.isRed = false;
                    if (uncle)
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
                    if (z.p) {
                        z.p.isRed = false;
                        if (z.p.p) {
                            z.p.p.isRed = true;
                            this.rightRotate(z.p.p);
                        }
                    }
                }
            }
            else if (((_b = z.p) === null || _b === void 0 ? void 0 : _b.p) && z.p === z.p.p.right) {
                const uncle = z.p.p.left;
                if (this.isRed(uncle)) {
                    // mark parent and uncle to black, grandpa to red, continue to go up to grandpa level
                    z.p.isRed = false;
                    if (uncle)
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
    leftRotate(x) {
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
    rightRotate(x) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmItdHJlZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL3NoYXJlL2FsZ29yaXRobXMvcmItdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFZSCxNQUFNLE9BQU8sWUFBWTtJQUd2QixZQUFzQixVQUFtQztRQUFuQyxlQUFVLEdBQVYsVUFBVSxDQUF5QjtRQUZ6RCxTQUFJLEdBQTBCLElBQUksQ0FBQztRQUdqQyxJQUFJLFVBQVUsSUFBSSxJQUFJLEVBQUU7WUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDSixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixDQUFDLENBQUM7U0FDSDtJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLEdBQU07UUFDWCxJQUFJLENBQUMsR0FBYyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNsQixJQUFJLEdBQVcsQ0FBQztRQUNoQiw0REFBNEQ7UUFDNUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLE9BQU8sQ0FBQyxFQUFFO1lBQ1IsQ0FBQyxHQUFHLENBQUMsQ0FBRTtZQUNQLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFO2dCQUNYLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2FBQ1o7aUJBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFO2dCQUNsQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUss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Q0FBQyxDQUFDLENBQUMsS0FBSztZQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7O1lBRWQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQWNjb3JkaW5nIHRvIHRoZSBib29rIDw8IEludHJvZHVjdGlvbiB0byBBbGdvcml0aG1zLCBUaGlyZCBFZGl0aW9uID4+XG4gKiBcbiAqIGZlYXR1cmVzIGluIHByb2dyZXNzOiBEeW5hbWljIG9yZGVyIHN0YXRpc3RpY3MsIHJhbmdlIHRyZWVcbiAqIFxuICogVGhpcyBkYXRhIHN0cnVjdHVyZSBpcyBtZWFudCBmb3IgYmVpbmcgZXh0ZW5kLCBzaW5jZSB0aGUgbWFqb3JpdHkgb2YgM3JkLXBhcnR5IHJlZC1ibGFjayB0cmVlIG9uIG5wbWpzLm9yZyBpcyBub3QgZXh0ZW5zaWJsZVxuICovXG5cbmV4cG9ydCB0eXBlIFJiVHJlZU5vZGU8VCwgViA9IHVua25vd24sIEMgZXh0ZW5kcyBSYlRyZWVOb2RlPGFueSwgYW55LCBhbnk+ID0gUmJUcmVlTm9kZTxhbnksIGFueSwgYW55Pj4gPSB7XG4gIGtleTogVDtcbiAgdmFsdWU6IFY7XG4gIHA6IEMgfCBudWxsO1xuICBsZWZ0OiBDIHwgbnVsbDtcbiAgcmlnaHQ6IEMgfCBudWxsO1xuICBpc1JlZDogYm9vbGVhbjtcbiAgc2l6ZTogbnVtYmVyO1xufTtcblxuZXhwb3J0IGNsYXNzIFJlZEJsYWNrVHJlZTxULCBWID0gdW5rbm93biwgTkQgZXh0ZW5kcyBSYlRyZWVOb2RlPFQsIFYsIE5EPiA9IFJiVHJlZU5vZGU8VCwgViwgUmJUcmVlTm9kZTxhbnksIGFueT4+PiB7XG4gIHJvb3Q6IE5EIHwgbnVsbCB8IHVuZGVmaW5lZCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGNvbXBhcmF0b3I/OiAoYTogVCwgYjogVCkgPT4gbnVtYmVyKSB7XG4gICAgaWYgKGNvbXBhcmF0b3IgPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21wYXJhdG9yID0gKGEsIGIpID0+IHtcbiAgICAgICAgcmV0dXJuIGEgPCBiID9cbiAgICAgICAgICAtMSA6XG4gICAgICAgICAgYSA+IGIgPyAxIDogMDtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNob3VsZCBvdmVycmlkZSB0aGlzIGZ1bmN0aW9uIHRvIGNyZWF0ZSBuZXcgdHlwZW9mIHRyZWUgbm9kZVxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEByZXR1cm5zIGV4aXN0aW5nIHRyZWUgbm9kZSBpZiBrZXkgZHVwbGljYXRlcyBvciBhIG5ldyBlbXB0eSBub2RlXG4gICAqL1xuICBpbnNlcnQoa2V5OiBUKTogT21pdDxORCwgJ3ZhbHVlJz4gJiB7dmFsdWU6IFYgfCB1bmRlZmluZWR9IHtcbiAgICBsZXQgeTogTkQgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgeCA9IHRoaXMucm9vdDtcbiAgICBsZXQgY21wOiBudW1iZXI7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgd2hpbGUgKHgpIHtcbiAgICAgIHkgPSB4IDtcbiAgICAgIGNtcCA9IHRoaXMuY29tcGFyYXRvciEoa2V5LCB4LmtleSk7XG4gICAgICBpZiAoY21wIDwgMCkge1xuICAgICAgICB4ID0geC5sZWZ0O1xuICAgICAgfSBlbHNlIGlmIChjbXAgPiAwKSB7XG4gICAgICAgIHggPSB4LnJpZ2h0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHg7IC8vIGR1cGxpY2F0ZSBrZXkgZm91bmRcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgeiA9IHtcbiAgICAgIGlzUmVkOiB0cnVlLFxuICAgICAga2V5LFxuICAgICAgcDogeVxuICAgIH0gYXMgdW5rbm93biBhcyBORDtcblxuICAgIGxldCBsZWZ0OiBORCB8IG51bGwgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHJpZ2h0OiBORCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoeiwgJ2xlZnQnLCB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybiwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgIHJldHVybiBsZWZ0O1xuICAgICAgfSxcbiAgICAgIHNldCh2OiBORCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGxlZnQgPT09IHYpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBsZWZ0ID0gdjtcbiAgICAgICAgei5zaXplID0gKGxlZnQgPyBsZWZ0LnNpemUgOiAwKSArIChyaWdodCA/IHJpZ2h0LnNpemUgOiAwKSArIDE7XG4gICAgICAgIHNlbGYub25MZWZ0Q2hpbGRDaGFuZ2Uoeiwgdik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoeiwgJ3JpZ2h0Jywge1xuICAgICAgZ2V0KCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4sIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgICByZXR1cm4gcmlnaHQ7XG4gICAgICB9LFxuICAgICAgc2V0KHY6IE5EIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAocmlnaHQgPT09IHYpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICByaWdodCA9IHY7XG4gICAgICAgIHouc2l6ZSA9IChsZWZ0ID8gbGVmdC5zaXplIDogMCkgKyAocmlnaHQgPyByaWdodC5zaXplIDogMCkgKyAxO1xuICAgICAgICBzZWxmLm9uUmlnaHRDaGlsZENoYW5nZSh6LCB2KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGxldCBzaXplID0gMDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh6LCAnc2l6ZScsIHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICB9LFxuICAgICAgc2V0KHY6IG51bWJlcikge1xuICAgICAgICBpZiAoc2l6ZSA9PT0gdilcbiAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgc2l6ZSA9IHY7XG4gICAgICAgIGlmICh6LnApIHtcbiAgICAgICAgICB6LnAuc2l6ZSA9ICh6LnAubGVmdD8uc2l6ZSB8fCAwKSArICh6LnAucmlnaHQ/LnNpemUgfHwgMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB6LnNpemUgPSAxO1xuXG4gICAgaWYgKHkgPT0gbnVsbCkge1xuICAgICAgdGhpcy5yb290ID0gejtcbiAgICB9IGVsc2UgaWYgKGNtcCEgPCAwICkge1xuICAgICAgeS5sZWZ0ID0gejtcbiAgICB9IGVsc2UgaWYgKGNtcCEgPiAwICkge1xuICAgICAgeS5yaWdodCA9IHo7XG4gICAgfVxuICAgIHRoaXMucmVkQmxhY2tJbnNlcnRGaXhVcCh6KTtcbiAgICByZXR1cm4gejtcbiAgfVxuXG4gIC8qKiBSZXRyaWV2ZSBhbiBlbGVtZW50IHdpdGggYSBnaXZlbiByYW5rLCB1bmxpa2UgPDxJbnRyb2R1Y3Rpb24gdG8gQWxnb3JpdGhtcyAzcmQgRWRpdGlvbj4+LCBpdCBiZWdpbnMgd2l0aCAwICovXG4gIGF0SW5kZXgoaWR4OiBudW1iZXIsIGJlZ2luTm9kZTogTkQgfCBudWxsIHwgdW5kZWZpbmVkID0gdGhpcy5yb290KTogTkQgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgY3Vyck5vZGUgPSBiZWdpbk5vZGU7XG4gICAgd2hpbGUgKGN1cnJOb2RlKSB7XG4gICAgICBjb25zdCBsZWZ0U2l6ZSA9IChjdXJyTm9kZS5sZWZ0Py5zaXplIHx8IDApO1xuICAgICAgaWYgKGxlZnRTaXplID09PSBpZHgpXG4gICAgICAgIHJldHVybiBjdXJyTm9kZTtcbiAgICAgIGVsc2UgaWYgKGlkeCA8IGxlZnRTaXplKSB7XG4gICAgICAgIGN1cnJOb2RlID0gY3Vyck5vZGUubGVmdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnJOb2RlID0gY3Vyck5vZGUucmlnaHQ7XG4gICAgICAgIGlkeCAtPSBsZWZ0U2l6ZSArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjdXJyTm9kZTtcbiAgfVxuXG4gIGluZGV4T2Yoa2V5OiBUKTogbnVtYmVyIHtcbiAgICBsZXQgbm9kZSA9IHRoaXMuc2VhcmNoKGtleSk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbClcbiAgICAgIHJldHVybiAtMTtcblxuICAgIGxldCBjdXJySWR4ID0gKG5vZGUubGVmdD8uc2l6ZSB8fCAwKTtcbiAgICB3aGlsZSAobm9kZS5wKSB7XG4gICAgICBpZiAobm9kZSA9PT0gbm9kZS5wLnJpZ2h0KSB7XG4gICAgICAgIGN1cnJJZHggKz0gKG5vZGUucC5sZWZ0Py5zaXplIHx8IDApICsgMTtcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBub2RlLnA7XG4gICAgfVxuICAgIHJldHVybiBjdXJySWR4O1xuICB9XG5cbiAgc2VhcmNoKGtleTogVCk6IE5EIHwgbnVsbCB7XG4gICAgbGV0IG5vZGUgPSB0aGlzLnJvb3Q7XG4gICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgIGNvbnN0IGNtcCA9IHRoaXMuY29tcGFyYXRvciEoa2V5LCBub2RlLmtleSk7XG4gICAgICBpZiAoY21wID09PSAwKVxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgIGlmIChjbXAgPCAwKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLmxlZnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gbm9kZS5yaWdodDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBkZWxldGUoa2V5OiBUKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuc2VhcmNoKGtleSk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLmRlbGV0ZU5vZGUobm9kZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzdWNjZXNzb3JOb2RlKG5vZGU6IE5EKSB7XG4gICAgaWYgKG5vZGUucmlnaHQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1pbmltdW0obm9kZS5yaWdodCk7XG4gICAgfVxuICAgIGxldCB5ID0gbm9kZS5wO1xuICAgIHdoaWxlICh5ICYmIG5vZGUgPT09IHkucmlnaHQpIHtcbiAgICAgIG5vZGUgPSB5O1xuICAgICAgeSA9IHkucDtcbiAgICB9XG4gICAgcmV0dXJuIHk7XG4gIH1cblxuICBwcmVkZWNlc3Nvck5vZGUobm9kZTogTkQpIHtcbiAgICBpZiAobm9kZS5sZWZ0KSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXhpbXVtKG5vZGUubGVmdCk7XG4gICAgfVxuICAgIGxldCB5ID0gbm9kZS5wO1xuICAgIHdoaWxlICh5ICYmIG5vZGUgPT09IHkubGVmdCkge1xuICAgICAgbm9kZSA9IHk7XG4gICAgICB5ID0geS5wO1xuICAgIH1cbiAgICByZXR1cm4geTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ga2V5IHRoZSB2YWx1ZSBvZiBrZXkgdG8gYmUgY29tcGFyZWQgd2hpY2ggY291bGQgYmUgcmVsYXRlZCB0byBub25lIG5vZGVzIGluIGN1cnJlbnQgdHJlZVxuICAgKiBAcmV0dXJuIGludGVyYXRvciBvZiBleGlzdGluZyBub2RlcyB3aG9zZSBrZXkgYXJlIGdyZWF0ZXIgdGhhbiBzcGVjaWZpYyBrZXlcbiAgICovXG4gICprZXlzR3JlYXRlclRoYW4oa2V5OiBUKSB7XG4gICAgbGV0IG5vZGUgPSB0aGlzLnJvb3Q7XG4gICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgIGNvbnN0IGNtcCA9IHRoaXMuY29tcGFyYXRvciEoa2V5LCBub2RlLmtleSk7XG4gICAgICBpZiAoY21wID09PSAwKVxuICAgICAgICBicmVhaztcbiAgICAgIGlmIChjbXAgPCAwKSB7XG4gICAgICAgIGlmIChub2RlLmxlZnQgPT0gbnVsbCkge1xuICAgICAgICAgIGxldCB6ID0gbm9kZSBhcyB0eXBlb2Ygbm9kZSB8IG51bGw7XG4gICAgICAgICAgd2hpbGUgKHopIHtcbiAgICAgICAgICAgIHlpZWxkIHo7XG4gICAgICAgICAgICB6ID0gdGhpcy5zdWNjZXNzb3JOb2RlKHopO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5sZWZ0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG5vZGUucmlnaHQgPT0gbnVsbCkge1xuICAgICAgICAgIGxldCB6ID0gbm9kZS5wO1xuICAgICAgICAgIHdoaWxlICh6KSB7XG4gICAgICAgICAgICB5aWVsZCB6O1xuICAgICAgICAgICAgeiA9IHRoaXMuc3VjY2Vzc29yTm9kZSh6KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUucmlnaHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0ga2V5IHRoZSB2YWx1ZSBvZiBrZXkgdG8gYmUgY29tcGFyZWQgd2hpY2ggY291bGQgYmUgcmVsYXRlZCB0byBub25lIG5vZGVzIGluIGN1cnJlbnQgdHJlZVxuICAgKiBAcmV0dXJuIGludGVyYXRvciBvZiBleGlzdGluZyBub2RlcyB3aG9zZSBrZXkgYXJlIGdyZWF0ZXIgdGhhbiBzcGVjaWZpYyBrZXlcbiAgICovXG4gICprZXlzU21hbGxlcmVyVGhhbihrZXk6IFQpIHtcbiAgICBsZXQgbm9kZSA9IHRoaXMucm9vdDtcbiAgICB3aGlsZSAobm9kZSkge1xuICAgICAgY29uc3QgY21wID0gdGhpcy5jb21wYXJhdG9yIShrZXksIG5vZGUua2V5KTtcbiAgICAgIGlmIChjbXAgPT09IDApXG4gICAgICAgIGJyZWFrO1xuICAgICAgaWYgKGNtcCA8IDApIHtcbiAgICAgICAgaWYgKG5vZGUubGVmdCA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IHogPSBub2RlLnA7XG4gICAgICAgICAgd2hpbGUgKHopIHtcbiAgICAgICAgICAgIHlpZWxkIHo7XG4gICAgICAgICAgICB6ID0gdGhpcy5wcmVkZWNlc3Nvck5vZGUoeik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBub2RlLmxlZnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobm9kZS5yaWdodCA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IHogPSBub2RlIGFzIHR5cGVvZiBub2RlIHwgbnVsbDtcbiAgICAgICAgICB3aGlsZSAoeikge1xuICAgICAgICAgICAgeWllbGQgejtcbiAgICAgICAgICAgIHogPSB0aGlzLnByZWRlY2Vzc29yTm9kZSh6KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUucmlnaHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlub3JkZXJXYWxrKGNhbGxiYWNrOiAobm9kZTogTkQsIGxldmVsOiBudW1iZXIpID0+IHZvaWQsIG5vZGUgPSB0aGlzLnJvb3QsIGxldmVsID0gMCkge1xuICAgIGNvbnN0IG5leHRMZXZlbCA9IGxldmVsICsgMTtcbiAgICBpZiAobm9kZT8ubGVmdClcbiAgICAgIHRoaXMuaW5vcmRlcldhbGsoY2FsbGJhY2ssIG5vZGUubGVmdCwgbmV4dExldmVsKTtcbiAgICBpZiAobm9kZSlcbiAgICAgIGNhbGxiYWNrKG5vZGUsIGxldmVsKTtcbiAgICBpZiAobm9kZT8ucmlnaHQpXG4gICAgICB0aGlzLmlub3JkZXJXYWxrKGNhbGxiYWNrLCBub2RlLnJpZ2h0LCBuZXh0TGV2ZWwpO1xuICB9XG5cbiAgbWluaW11bShub2RlID0gdGhpcy5yb290KSB7XG4gICAgd2hpbGUgKG5vZGU/LmxlZnQpIHtcbiAgICAgIG5vZGUgPSBub2RlLmxlZnQ7XG4gICAgfVxuICAgIHJldHVybiBub2RlID8/IG51bGw7XG4gIH1cblxuICBtYXhpbXVtKG5vZGUgPSB0aGlzLnJvb3QpIHtcbiAgICB3aGlsZSAobm9kZT8ucmlnaHQpIHtcbiAgICAgIG5vZGUgPSBub2RlLnJpZ2h0O1xuICAgIH1cbiAgICByZXR1cm4gbm9kZSA/PyBudWxsO1xuICB9XG5cbiAgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5yb290Py5zaXplID8/IDA7XG4gIH1cblxuICBpc1JlZChub2RlOiBORCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gISFub2RlPy5pc1JlZDtcbiAgfVxuXG4gIGlzQmxhY2sobm9kZTogTkQgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG5vZGUgPT0gbnVsbCB8fCAhbm9kZS5pc1JlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUbyBiZSBleHRlbmQgYW5kIG92ZXJyaWRkZW5cbiAgICovXG4gIHByb3RlY3RlZCBvbkxlZnRDaGlsZENoYW5nZShfcGFyZW50OiBORCwgX2NoaWxkOiBORCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgfVxuICAvKipcbiAgICogVG8gYmUgZXh0ZW5kIGFuZCBvdmVycmlkZGVuXG4gICAqL1xuICBwcm90ZWN0ZWQgb25SaWdodENoaWxkQ2hhbmdlKF9wYXJlbnQ6IE5ELCBfY2hpbGQ6IE5EIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICB9XG5cbiAgcHJvdGVjdGVkIGRlbGV0ZU5vZGUoejogTkQpIHtcbiAgICBsZXQgeTogTkQgfCBudWxsICA9IHo7XG4gICAgbGV0IG9yaWdJc1JlZCA9IHRoaXMuaXNSZWQoeSk7XG4gICAgbGV0IHg6IE5EIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKHoubGVmdCA9PSBudWxsKSB7XG4gICAgICB4ID0gei5yaWdodDtcbiAgICAgIHRoaXMudHJhbnNwbGFudCh6LCB6LnJpZ2h0KTtcbiAgICB9IGVsc2UgaWYgKHoucmlnaHQgPT0gbnVsbCkge1xuICAgICAgeCA9IHoubGVmdDtcbiAgICAgIHRoaXMudHJhbnNwbGFudCh6LCB6LmxlZnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBib3RoIGxlZnQgYW5kIHJpZ2h0IGNoaWxkIGFyZSBub3QgZW1wdHlcbiAgICAgIHkgPSB0aGlzLm1pbmltdW0oei5yaWdodCk7XG4gICAgICBpZiAoeSA9PSBudWxsKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBvcmlnSXNSZWQgPSB0aGlzLmlzUmVkKHkpO1xuICAgICAgeCA9IHkucmlnaHQ7XG4gICAgICBpZiAoeS5wID09PSB6KSB7XG4gICAgICAgIGlmICh4KSB4LnAgPSB5O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy50cmFuc3BsYW50KHksIHkucmlnaHQpO1xuICAgICAgICB5LnJpZ2h0ID0gei5yaWdodDtcbiAgICAgICAgeS5yaWdodC5wID0geTtcbiAgICAgIH1cbiAgICAgIHRoaXMudHJhbnNwbGFudCh6LCB5KTtcbiAgICAgIHkubGVmdCA9IHoubGVmdDtcbiAgICAgIHkubGVmdC5wID0geTtcbiAgICAgIHkuaXNSZWQgPSB0aGlzLmlzUmVkKHopO1xuICAgIH1cbiAgICBpZiAoIW9yaWdJc1JlZCAmJiB4KSB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnZGVsZXRlIGZpeHVwJywgeC5rZXkpO1xuICAgICAgdGhpcy5kZWxldGVGaXh1cCh4KTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIGRlbGV0ZUZpeHVwKHg6IE5EKSB7XG4gICAgd2hpbGUgKHggIT09IHRoaXMucm9vdCAmJiB0aGlzLmlzQmxhY2soeCkpIHtcbiAgICAgIGlmICh4LnAgJiYgeCA9PT0geC5wLmxlZnQpIHtcbiAgICAgICAgbGV0IHcgPSB4LnAucmlnaHQ7IC8vIHcgaXMgeCdzIHNpYmxpbmdcbiAgICAgICAgaWYgKHRoaXMuaXNSZWQodykpIHtcbiAgICAgICAgICB3IS5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgIHgucC5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sZWZ0Um90YXRlKHgucCApO1xuICAgICAgICAgIHcgPSB4LnAucmlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHcpIHtcbiAgICAgICAgICBpZiAodGhpcy5pc0JsYWNrKHcubGVmdCkgJiYgdGhpcy5pc0JsYWNrKHcucmlnaHQpKSB7XG4gICAgICAgICAgICB3LmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHggPSB4LnAgO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0JsYWNrKHcucmlnaHQpKSB7XG4gICAgICAgICAgICAgIGlmICh3LmxlZnQpXG4gICAgICAgICAgICAgICAgdy5sZWZ0LmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIHcuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB0aGlzLnJpZ2h0Um90YXRlKHcpO1xuICAgICAgICAgICAgICB3ID0geC5wLnJpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHcpIHcuaXNSZWQgPSB0aGlzLmlzUmVkKHgucCk7XG4gICAgICAgICAgICB4LnAuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh3Py5yaWdodCkgdy5yaWdodC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5sZWZ0Um90YXRlKHgucCApO1xuICAgICAgICAgICAgeCA9IHRoaXMucm9vdCE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHgucCAmJiB4ID09PSB4LnAucmlnaHQpIHtcbiAgICAgICAgbGV0IHcgPSB4LnAubGVmdDsgLy8gdyBpcyB4J3Mgc2libGluZ1xuICAgICAgICBpZiAodGhpcy5pc1JlZCh3KSkge1xuICAgICAgICAgIHchLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgeC5wLmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnJpZ2h0Um90YXRlKHgucCApO1xuICAgICAgICAgIHcgPSB4LnAubGVmdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodykge1xuICAgICAgICAgIGlmICh0aGlzLmlzQmxhY2sody5yaWdodCkgJiYgdGhpcy5pc0JsYWNrKHcubGVmdCkpIHtcbiAgICAgICAgICAgIHcuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgICAgeCA9IHgucCA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQmxhY2sody5sZWZ0KSkge1xuICAgICAgICAgICAgICBpZiAody5yaWdodClcbiAgICAgICAgICAgICAgICB3LnJpZ2h0LmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIHcuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB0aGlzLmxlZnRSb3RhdGUodyk7XG4gICAgICAgICAgICAgIHcgPSB4LnAubGVmdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3KSB3LmlzUmVkID0gdGhpcy5pc1JlZCh4LnApO1xuICAgICAgICAgICAgeC5wLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodz8ubGVmdCkgdy5sZWZ0LmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnJpZ2h0Um90YXRlKHgucCApO1xuICAgICAgICAgICAgeCA9IHRoaXMucm9vdCE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHguaXNSZWQgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhbnNwbGFudChyZXBsYWNlTm9kZTogTkQsIHdpdGhOb2RlOiBORCB8IG51bGwgPSBudWxsKSB7XG4gICAgaWYgKHJlcGxhY2VOb2RlLnAgPT0gbnVsbCkge1xuICAgICAgdGhpcy5yb290ID0gd2l0aE5vZGU7XG4gICAgfSBlbHNlIGlmIChyZXBsYWNlTm9kZSA9PT0gcmVwbGFjZU5vZGUucC5sZWZ0KSB7XG4gICAgICByZXBsYWNlTm9kZS5wLmxlZnQgPSB3aXRoTm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVwbGFjZU5vZGUucC5yaWdodCA9IHdpdGhOb2RlO1xuICAgIH1cbiAgICBpZiAod2l0aE5vZGUpXG4gICAgICB3aXRoTm9kZS5wID0gcmVwbGFjZU5vZGUucDtcbiAgfVxuXG4gIHByb3RlY3RlZCByZWRCbGFja0luc2VydEZpeFVwKHo6IE5EKSB7XG4gICAgd2hpbGUgKHRoaXMuaXNSZWQoei5wKSkge1xuICAgICAgaWYgKHoucD8ucCAmJiB6LnAgPT09IHoucC5wLmxlZnQpIHtcbiAgICAgICAgY29uc3QgdW5jbGUgPSB6LnAucC5yaWdodDtcbiAgICAgICAgaWYgKHRoaXMuaXNSZWQodW5jbGUpKSB7XG4gICAgICAgICAgLy8gbWFyayBwYXJlbnQgYW5kIHVuY2xlIHRvIGJsYWNrLCBncmFuZHBhIHRvIHJlZCwgY29udGludWUgdG8gZ28gdXAgdG8gZ3JhbmRwYSBsZXZlbFxuICAgICAgICAgIHoucC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgIGlmICh1bmNsZSkgdW5jbGUuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICB6LnAucC5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgeiA9IHoucC5wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHVuY2xlIGlzIGJsYWNrXG4gICAgICAgICAgaWYgKHogPT09IHoucC5yaWdodCkge1xuICAgICAgICAgICAgLy8gaWYgaXMgcmlnaHQgY2hpbGQgdHJlZVxuICAgICAgICAgICAgeiA9IHoucDtcbiAgICAgICAgICAgIHRoaXMubGVmdFJvdGF0ZSh6KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHoucCkge1xuICAgICAgICAgICAgei5wLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoei5wLnApIHtcbiAgICAgICAgICAgICAgei5wLnAuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB0aGlzLnJpZ2h0Um90YXRlKHoucC5wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoei5wPy5wICYmIHoucCA9PT0gei5wLnAucmlnaHQpIHtcbiAgICAgICAgY29uc3QgdW5jbGUgPSB6LnAucC5sZWZ0O1xuICAgICAgICBpZiAodGhpcy5pc1JlZCh1bmNsZSkpIHtcbiAgICAgICAgICAvLyBtYXJrIHBhcmVudCBhbmQgdW5jbGUgdG8gYmxhY2ssIGdyYW5kcGEgdG8gcmVkLCBjb250aW51ZSB0byBnbyB1cCB0byBncmFuZHBhIGxldmVsXG4gICAgICAgICAgei5wLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHVuY2xlKSB1bmNsZS5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgIHoucC5wLmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICB6ID0gei5wLnA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdW5jbGUgaXMgYmxhY2tcbiAgICAgICAgICBpZiAoeiA9PT0gei5wLmxlZnQpIHtcbiAgICAgICAgICAgIC8vIGlmIGlzIHJpZ2h0IGNoaWxkIHRyZWVcbiAgICAgICAgICAgIHogPSB6LnA7XG4gICAgICAgICAgICB0aGlzLnJpZ2h0Um90YXRlKHopO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoei5wKSB7XG4gICAgICAgICAgICB6LnAuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh6LnAucCkge1xuICAgICAgICAgICAgICB6LnAucC5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMubGVmdFJvdGF0ZSh6LnAucCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLnJvb3QpXG4gICAgICB0aGlzLnJvb3QuaXNSZWQgPSBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgbGVmdFJvdGF0ZSh4OiBORCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdsZWZ0Um90YXRlJywgeC5rZXkpO1xuICAgIGNvbnN0IHkgPSB4LnJpZ2h0O1xuICAgIGlmICh5ID09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgeC5yaWdodCA9IHkubGVmdDtcbiAgICBpZiAoeS5sZWZ0KSB7XG4gICAgICB5LmxlZnQucCA9IHg7XG4gICAgfVxuICAgIHkucCA9IHgucDtcbiAgICBpZiAoeC5wID09IG51bGwpXG4gICAgICB0aGlzLnJvb3QgPSB5O1xuICAgIGVsc2UgaWYgKHggPT09IHgucC5sZWZ0KVxuICAgICAgeC5wLmxlZnQgPSB5O1xuICAgIGVsc2VcbiAgICAgIHgucC5yaWdodCA9IHk7XG4gICAgeS5sZWZ0ID0geDtcbiAgICB4LnAgPSB5O1xuICB9XG5cbiAgcHJpdmF0ZSByaWdodFJvdGF0ZSh4OiBORCkge1xuICAgIGNvbnN0IHkgPSB4LmxlZnQ7XG4gICAgaWYgKHkgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICB4LmxlZnQgPSB5LnJpZ2h0O1xuICAgIGlmICh5LnJpZ2h0KSB7XG4gICAgICB5LnJpZ2h0LnAgPSB4O1xuICAgIH1cbiAgICB5LnAgPSB4LnA7XG4gICAgaWYgKHgucCA9PSBudWxsKVxuICAgICAgdGhpcy5yb290ID0geTtcbiAgICBlbHNlIGlmICh4ID09PSB4LnAucmlnaHQpXG4gICAgICB4LnAucmlnaHQgPSB5O1xuICAgIGVsc2VcbiAgICAgIHgucC5sZWZ0ID0geTtcbiAgICB5LnJpZ2h0ID0geDtcbiAgICB4LnAgPSB5O1xuICB9XG59XG5cbiJdfQ==