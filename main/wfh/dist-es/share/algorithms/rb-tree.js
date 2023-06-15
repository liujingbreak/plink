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
                // if (z.p) {
                //   z.p.size = (z.p.left?.size || 0) + (z.p.right?.size || 0) + 1;
                // }
            }
        });
        z.weight = 1;
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
    /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0
    * and it is baesed on "size" which is accumulated  from "weight" of node ands children's
    */
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
    updateNodeSize(node) {
        var _a, _b, _c, _d;
        let z = node;
        while (z) {
            z.size = z.weight + ((_b = (_a = z.left) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0) + ((_d = (_c = z.right) === null || _c === void 0 ? void 0 : _c.size) !== null && _d !== void 0 ? _d : 0);
            z = z.p;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmItdHJlZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL3NoYXJlL2FsZ29yaXRobXMvcmItdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFpQkgsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBc0IsVUFBbUM7UUFBbkMsZUFBVSxHQUFWLFVBQVUsQ0FBeUI7UUFGekQsU0FBSSxHQUEwQixJQUFJLENBQUM7UUFHakMsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1lBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNaLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsQ0FBQyxDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxHQUFNO1FBQ1gsSUFBSSxDQUFDLEdBQWMsSUFBSSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbEIsSUFBSSxHQUFXLENBQUM7UUFDaEIsNERBQTREO1FBQzVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixPQUFPLENBQUMsRUFBRTtZQUNSLENBQUMsR0FBRyxDQUFDLENBQUU7WUFDUCxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25DLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDWCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQzthQUNaO2lCQUFNLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDbEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFL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QyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDVixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFjY29yZGluZyB0byB0aGUgYm9vayA8PCBJbnRyb2R1Y3Rpb24gdG8gQWxnb3JpdGhtcywgVGhpcmQgRWRpdGlvbiA+PlxuICogXG4gKiBmZWF0dXJlcyBpbiBwcm9ncmVzczogRHluYW1pYyBvcmRlciBzdGF0aXN0aWNzLCByYW5nZSB0cmVlXG4gKiBcbiAqIFRoaXMgZGF0YSBzdHJ1Y3R1cmUgaXMgbWVhbnQgZm9yIGJlaW5nIGV4dGVuZCwgc2luY2UgdGhlIG1ham9yaXR5IG9mIDNyZC1wYXJ0eSByZWQtYmxhY2sgdHJlZSBvbiBucG1qcy5vcmcgaXMgbm90IGV4dGVuc2libGVcbiAqL1xuXG5leHBvcnQgdHlwZSBSYlRyZWVOb2RlPFQsIFYgPSB1bmtub3duLCBDIGV4dGVuZHMgUmJUcmVlTm9kZTxhbnksIGFueSwgYW55PiA9IFJiVHJlZU5vZGU8YW55LCBhbnksIGFueT4+ID0ge1xuICBrZXk6IFQ7XG4gIHZhbHVlOiBWO1xuICBwOiBDIHwgbnVsbDtcbiAgbGVmdDogQyB8IG51bGw7XG4gIHJpZ2h0OiBDIHwgbnVsbDtcbiAgaXNSZWQ6IGJvb2xlYW47XG4gIC8qKiB0b3RhbCB3ZWlnaHQgb2YgY3VycmVudHQgbm9kZSBhbmQgY2hpbGRyZW4ncy5cbiAgKiBzaXplID0gbGVmdCBjaGlsZCdzIHNpemUgKyByaWdodCBjaGlsZCBzaXplICsgd2VpZ2h0XG4gICovXG4gIHNpemU6IG51bWJlcjtcbiAgLyoqIHdlaWdodCBvZiBjdXJyZW50IG5vZGUsIG5vdCBpbmNsdWRpbmdnIGNoaWxkbHJlbidzcyAqL1xuICB3ZWlnaHQ6IG51bWJlcjtcbn07XG5cbmV4cG9ydCBjbGFzcyBSZWRCbGFja1RyZWU8VCwgViA9IHVua25vd24sIE5EIGV4dGVuZHMgUmJUcmVlTm9kZTxULCBWLCBORD4gPSBSYlRyZWVOb2RlPFQsIFYsIFJiVHJlZU5vZGU8YW55LCBhbnk+Pj4ge1xuICByb290OiBORCB8IG51bGwgfCB1bmRlZmluZWQgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBjb21wYXJhdG9yPzogKGE6IFQsIGI6IFQpID0+IG51bWJlcikge1xuICAgIGlmIChjb21wYXJhdG9yID09IG51bGwpIHtcbiAgICAgIHRoaXMuY29tcGFyYXRvciA9IChhLCBiKSA9PiB7XG4gICAgICAgIHJldHVybiBhIDwgYiA/XG4gICAgICAgICAgLTEgOlxuICAgICAgICAgIGEgPiBiID8gMSA6IDA7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTaG91bGQgb3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiB0byBjcmVhdGUgbmV3IHR5cGVvZiB0cmVlIG5vZGVcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcmV0dXJucyBleGlzdGluZyB0cmVlIG5vZGUgaWYga2V5IGR1cGxpY2F0ZXMgb3IgYSBuZXcgZW1wdHkgbm9kZVxuICAgKi9cbiAgaW5zZXJ0KGtleTogVCk6IE9taXQ8TkQsICd2YWx1ZSc+ICYge3ZhbHVlOiBWIHwgdW5kZWZpbmVkfSB7XG4gICAgbGV0IHk6IE5EIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IHggPSB0aGlzLnJvb3Q7XG4gICAgbGV0IGNtcDogbnVtYmVyO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHdoaWxlICh4KSB7XG4gICAgICB5ID0geCA7XG4gICAgICBjbXAgPSB0aGlzLmNvbXBhcmF0b3IhKGtleSwgeC5rZXkpO1xuICAgICAgaWYgKGNtcCA8IDApIHtcbiAgICAgICAgeCA9IHgubGVmdDtcbiAgICAgIH0gZWxzZSBpZiAoY21wID4gMCkge1xuICAgICAgICB4ID0geC5yaWdodDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB4OyAvLyBkdXBsaWNhdGUga2V5IGZvdW5kXG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHogPSB7XG4gICAgICBpc1JlZDogdHJ1ZSxcbiAgICAgIGtleSxcbiAgICAgIHA6IHlcbiAgICB9IGFzIHVua25vd24gYXMgTkQ7XG5cbiAgICBsZXQgbGVmdDogTkQgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgIGxldCByaWdodDogTkQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHosICdsZWZ0Jywge1xuICAgICAgZ2V0KCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4sIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgICByZXR1cm4gbGVmdDtcbiAgICAgIH0sXG4gICAgICBzZXQodjogTkQgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChsZWZ0ID09PSB2KVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbGVmdCA9IHY7XG4gICAgICAgIHNlbGYudXBkYXRlTm9kZVNpemUoeik7XG4gICAgICAgIHNlbGYub25MZWZ0Q2hpbGRDaGFuZ2Uoeiwgdik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoeiwgJ3JpZ2h0Jywge1xuICAgICAgZ2V0KCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4sIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgICByZXR1cm4gcmlnaHQ7XG4gICAgICB9LFxuICAgICAgc2V0KHY6IE5EIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAocmlnaHQgPT09IHYpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICByaWdodCA9IHY7XG4gICAgICAgIHNlbGYudXBkYXRlTm9kZVNpemUoeik7XG4gICAgICAgIHNlbGYub25SaWdodENoaWxkQ2hhbmdlKHosIHYpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgbGV0IHdlaWdodCA9IDA7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoeiwgJ3dlaWdodCcsIHtcbiAgICAgIGdldCgpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICAgICAgcmV0dXJuIHdlaWdodDtcbiAgICAgIH0sXG4gICAgICBzZXQodjogbnVtYmVyKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPT09IHYpXG4gICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHdlaWdodCA9IHY7XG4gICAgICAgIHNlbGYudXBkYXRlTm9kZVNpemUoeik7XG4gICAgICAgIC8vIGlmICh6LnApIHtcbiAgICAgICAgLy8gICB6LnAuc2l6ZSA9ICh6LnAubGVmdD8uc2l6ZSB8fCAwKSArICh6LnAucmlnaHQ/LnNpemUgfHwgMCkgKyAxO1xuICAgICAgICAvLyB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB6LndlaWdodCA9IDE7XG5cbiAgICBpZiAoeSA9PSBudWxsKSB7XG4gICAgICB0aGlzLnJvb3QgPSB6O1xuICAgIH0gZWxzZSBpZiAoY21wISA8IDAgKSB7XG4gICAgICB5LmxlZnQgPSB6O1xuICAgIH0gZWxzZSBpZiAoY21wISA+IDAgKSB7XG4gICAgICB5LnJpZ2h0ID0gejtcbiAgICB9XG4gICAgdGhpcy5yZWRCbGFja0luc2VydEZpeFVwKHopO1xuICAgIHJldHVybiB6O1xuICB9XG5cbiAgLyoqIFJldHJpZXZlIGFuIGVsZW1lbnQgd2l0aCBhIGdpdmVuIHJhbmssIHVubGlrZSA8PEludHJvZHVjdGlvbiB0byBBbGdvcml0aG1zIDNyZCBFZGl0aW9uPj4sIGl0IGJlZ2lucyB3aXRoIDAgXG4gICogYW5kIGl0IGlzIGJhZXNlZCBvbiBcInNpemVcIiB3aGljaCBpcyBhY2N1bXVsYXRlZCAgZnJvbSBcIndlaWdodFwiIG9mIG5vZGUgYW5kcyBjaGlsZHJlbidzXG4gICovXG4gIGF0SW5kZXgoaWR4OiBudW1iZXIsIGJlZ2luTm9kZTogTkQgfCBudWxsIHwgdW5kZWZpbmVkID0gdGhpcy5yb290KTogTkQgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgY3Vyck5vZGUgPSBiZWdpbk5vZGU7XG4gICAgd2hpbGUgKGN1cnJOb2RlKSB7XG4gICAgICBjb25zdCBsZWZ0U2l6ZSA9IChjdXJyTm9kZS5sZWZ0Py5zaXplIHx8IDApO1xuICAgICAgaWYgKGxlZnRTaXplID09PSBpZHgpXG4gICAgICAgIHJldHVybiBjdXJyTm9kZTtcbiAgICAgIGVsc2UgaWYgKGlkeCA8IGxlZnRTaXplKSB7XG4gICAgICAgIGN1cnJOb2RlID0gY3Vyck5vZGUubGVmdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnJOb2RlID0gY3Vyck5vZGUucmlnaHQ7XG4gICAgICAgIGlkeCAtPSBsZWZ0U2l6ZSArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjdXJyTm9kZTtcbiAgfVxuXG4gIGluZGV4T2Yoa2V5OiBUKTogbnVtYmVyIHtcbiAgICBsZXQgbm9kZSA9IHRoaXMuc2VhcmNoKGtleSk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbClcbiAgICAgIHJldHVybiAtMTtcblxuICAgIGxldCBjdXJySWR4ID0gKG5vZGUubGVmdD8uc2l6ZSB8fCAwKTtcbiAgICB3aGlsZSAobm9kZS5wKSB7XG4gICAgICBpZiAobm9kZSA9PT0gbm9kZS5wLnJpZ2h0KSB7XG4gICAgICAgIGN1cnJJZHggKz0gKG5vZGUucC5sZWZ0Py5zaXplIHx8IDApICsgMTtcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBub2RlLnA7XG4gICAgfVxuICAgIHJldHVybiBjdXJySWR4O1xuICB9XG5cbiAgc2VhcmNoKGtleTogVCk6IE5EIHwgbnVsbCB7XG4gICAgbGV0IG5vZGUgPSB0aGlzLnJvb3Q7XG4gICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgIGNvbnN0IGNtcCA9IHRoaXMuY29tcGFyYXRvciEoa2V5LCBub2RlLmtleSk7XG4gICAgICBpZiAoY21wID09PSAwKVxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgIGlmIChjbXAgPCAwKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLmxlZnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gbm9kZS5yaWdodDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBkZWxldGUoa2V5OiBUKSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuc2VhcmNoKGtleSk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLmRlbGV0ZU5vZGUobm9kZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzdWNjZXNzb3JOb2RlKG5vZGU6IE5EKSB7XG4gICAgaWYgKG5vZGUucmlnaHQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1pbmltdW0obm9kZS5yaWdodCk7XG4gICAgfVxuICAgIGxldCB5ID0gbm9kZS5wO1xuICAgIHdoaWxlICh5ICYmIG5vZGUgPT09IHkucmlnaHQpIHtcbiAgICAgIG5vZGUgPSB5O1xuICAgICAgeSA9IHkucDtcbiAgICB9XG4gICAgcmV0dXJuIHk7XG4gIH1cblxuICBwcmVkZWNlc3Nvck5vZGUobm9kZTogTkQpIHtcbiAgICBpZiAobm9kZS5sZWZ0KSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXhpbXVtKG5vZGUubGVmdCk7XG4gICAgfVxuICAgIGxldCB5ID0gbm9kZS5wO1xuICAgIHdoaWxlICh5ICYmIG5vZGUgPT09IHkubGVmdCkge1xuICAgICAgbm9kZSA9IHk7XG4gICAgICB5ID0geS5wO1xuICAgIH1cbiAgICByZXR1cm4geTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ga2V5IHRoZSB2YWx1ZSBvZiBrZXkgdG8gYmUgY29tcGFyZWQgd2hpY2ggY291bGQgYmUgcmVsYXRlZCB0byBub25lIG5vZGVzIGluIGN1cnJlbnQgdHJlZVxuICAgKiBAcmV0dXJuIGludGVyYXRvciBvZiBleGlzdGluZyBub2RlcyB3aG9zZSBrZXkgYXJlIGdyZWF0ZXIgdGhhbiBzcGVjaWZpYyBrZXlcbiAgICovXG4gICprZXlzR3JlYXRlclRoYW4oa2V5OiBUKSB7XG4gICAgbGV0IG5vZGUgPSB0aGlzLnJvb3Q7XG4gICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgIGNvbnN0IGNtcCA9IHRoaXMuY29tcGFyYXRvciEoa2V5LCBub2RlLmtleSk7XG4gICAgICBpZiAoY21wID09PSAwKVxuICAgICAgICBicmVhaztcbiAgICAgIGlmIChjbXAgPCAwKSB7XG4gICAgICAgIGlmIChub2RlLmxlZnQgPT0gbnVsbCkge1xuICAgICAgICAgIGxldCB6ID0gbm9kZSBhcyB0eXBlb2Ygbm9kZSB8IG51bGw7XG4gICAgICAgICAgd2hpbGUgKHopIHtcbiAgICAgICAgICAgIHlpZWxkIHo7XG4gICAgICAgICAgICB6ID0gdGhpcy5zdWNjZXNzb3JOb2RlKHopO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5sZWZ0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG5vZGUucmlnaHQgPT0gbnVsbCkge1xuICAgICAgICAgIGxldCB6ID0gbm9kZS5wO1xuICAgICAgICAgIHdoaWxlICh6KSB7XG4gICAgICAgICAgICB5aWVsZCB6O1xuICAgICAgICAgICAgeiA9IHRoaXMuc3VjY2Vzc29yTm9kZSh6KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUucmlnaHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0ga2V5IHRoZSB2YWx1ZSBvZiBrZXkgdG8gYmUgY29tcGFyZWQgd2hpY2ggY291bGQgYmUgcmVsYXRlZCB0byBub25lIG5vZGVzIGluIGN1cnJlbnQgdHJlZVxuICAgKiBAcmV0dXJuIGludGVyYXRvciBvZiBleGlzdGluZyBub2RlcyB3aG9zZSBrZXkgYXJlIGdyZWF0ZXIgdGhhbiBzcGVjaWZpYyBrZXlcbiAgICovXG4gICprZXlzU21hbGxlcmVyVGhhbihrZXk6IFQpIHtcbiAgICBsZXQgbm9kZSA9IHRoaXMucm9vdDtcbiAgICB3aGlsZSAobm9kZSkge1xuICAgICAgY29uc3QgY21wID0gdGhpcy5jb21wYXJhdG9yIShrZXksIG5vZGUua2V5KTtcbiAgICAgIGlmIChjbXAgPT09IDApXG4gICAgICAgIGJyZWFrO1xuICAgICAgaWYgKGNtcCA8IDApIHtcbiAgICAgICAgaWYgKG5vZGUubGVmdCA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IHogPSBub2RlLnA7XG4gICAgICAgICAgd2hpbGUgKHopIHtcbiAgICAgICAgICAgIHlpZWxkIHo7XG4gICAgICAgICAgICB6ID0gdGhpcy5wcmVkZWNlc3Nvck5vZGUoeik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBub2RlLmxlZnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobm9kZS5yaWdodCA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IHogPSBub2RlIGFzIHR5cGVvZiBub2RlIHwgbnVsbDtcbiAgICAgICAgICB3aGlsZSAoeikge1xuICAgICAgICAgICAgeWllbGQgejtcbiAgICAgICAgICAgIHogPSB0aGlzLnByZWRlY2Vzc29yTm9kZSh6KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUucmlnaHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlub3JkZXJXYWxrKGNhbGxiYWNrOiAobm9kZTogTkQsIGxldmVsOiBudW1iZXIpID0+IHZvaWQsIG5vZGUgPSB0aGlzLnJvb3QsIGxldmVsID0gMCkge1xuICAgIGNvbnN0IG5leHRMZXZlbCA9IGxldmVsICsgMTtcbiAgICBpZiAobm9kZT8ubGVmdClcbiAgICAgIHRoaXMuaW5vcmRlcldhbGsoY2FsbGJhY2ssIG5vZGUubGVmdCwgbmV4dExldmVsKTtcbiAgICBpZiAobm9kZSlcbiAgICAgIGNhbGxiYWNrKG5vZGUsIGxldmVsKTtcbiAgICBpZiAobm9kZT8ucmlnaHQpXG4gICAgICB0aGlzLmlub3JkZXJXYWxrKGNhbGxiYWNrLCBub2RlLnJpZ2h0LCBuZXh0TGV2ZWwpO1xuICB9XG5cbiAgbWluaW11bShub2RlID0gdGhpcy5yb290KSB7XG4gICAgd2hpbGUgKG5vZGU/LmxlZnQpIHtcbiAgICAgIG5vZGUgPSBub2RlLmxlZnQ7XG4gICAgfVxuICAgIHJldHVybiBub2RlID8/IG51bGw7XG4gIH1cblxuICBtYXhpbXVtKG5vZGUgPSB0aGlzLnJvb3QpIHtcbiAgICB3aGlsZSAobm9kZT8ucmlnaHQpIHtcbiAgICAgIG5vZGUgPSBub2RlLnJpZ2h0O1xuICAgIH1cbiAgICByZXR1cm4gbm9kZSA/PyBudWxsO1xuICB9XG5cbiAgc2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5yb290Py5zaXplID8/IDA7XG4gIH1cblxuICBpc1JlZChub2RlOiBORCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gISFub2RlPy5pc1JlZDtcbiAgfVxuXG4gIGlzQmxhY2sobm9kZTogTkQgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG5vZGUgPT0gbnVsbCB8fCAhbm9kZS5pc1JlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUbyBiZSBleHRlbmQgYW5kIG92ZXJyaWRkZW5cbiAgICovXG4gIHByb3RlY3RlZCBvbkxlZnRDaGlsZENoYW5nZShfcGFyZW50OiBORCwgX2NoaWxkOiBORCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgfVxuICAvKipcbiAgICogVG8gYmUgZXh0ZW5kIGFuZCBvdmVycmlkZGVuXG4gICAqL1xuICBwcm90ZWN0ZWQgb25SaWdodENoaWxkQ2hhbmdlKF9wYXJlbnQ6IE5ELCBfY2hpbGQ6IE5EIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICB9XG5cbiAgcHJvdGVjdGVkIHVwZGF0ZU5vZGVTaXplKG5vZGU6IE5EKSB7XG4gICAgbGV0IHogPSBub2RlIGFzIHR5cGVvZiBub2RlLnA7XG4gICAgd2hpbGUgKHopIHtcbiAgICAgIHouc2l6ZSA9IHoud2VpZ2h0ICsgKHoubGVmdD8uc2l6ZSA/PyAwKSArICh6LnJpZ2h0Py5zaXplID8/IDApO1xuICAgICAgeiA9IHoucDtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZGVsZXRlTm9kZSh6OiBORCkge1xuICAgIGxldCB5OiBORCB8IG51bGwgID0gejtcbiAgICBsZXQgb3JpZ0lzUmVkID0gdGhpcy5pc1JlZCh5KTtcbiAgICBsZXQgeDogTkQgfCBudWxsID0gbnVsbDtcbiAgICBpZiAoei5sZWZ0ID09IG51bGwpIHtcbiAgICAgIHggPSB6LnJpZ2h0O1xuICAgICAgdGhpcy50cmFuc3BsYW50KHosIHoucmlnaHQpO1xuICAgIH0gZWxzZSBpZiAoei5yaWdodCA9PSBudWxsKSB7XG4gICAgICB4ID0gei5sZWZ0O1xuICAgICAgdGhpcy50cmFuc3BsYW50KHosIHoubGVmdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGJvdGggbGVmdCBhbmQgcmlnaHQgY2hpbGQgYXJlIG5vdCBlbXB0eVxuICAgICAgeSA9IHRoaXMubWluaW11bSh6LnJpZ2h0KTtcbiAgICAgIGlmICh5ID09IG51bGwpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIG9yaWdJc1JlZCA9IHRoaXMuaXNSZWQoeSk7XG4gICAgICB4ID0geS5yaWdodDtcbiAgICAgIGlmICh5LnAgPT09IHopIHtcbiAgICAgICAgaWYgKHgpIHgucCA9IHk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRyYW5zcGxhbnQoeSwgeS5yaWdodCk7XG4gICAgICAgIHkucmlnaHQgPSB6LnJpZ2h0O1xuICAgICAgICB5LnJpZ2h0LnAgPSB5O1xuICAgICAgfVxuICAgICAgdGhpcy50cmFuc3BsYW50KHosIHkpO1xuICAgICAgeS5sZWZ0ID0gei5sZWZ0O1xuICAgICAgeS5sZWZ0LnAgPSB5O1xuICAgICAgeS5pc1JlZCA9IHRoaXMuaXNSZWQoeik7XG4gICAgfVxuICAgIGlmICghb3JpZ0lzUmVkICYmIHgpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdkZWxldGUgZml4dXAnLCB4LmtleSk7XG4gICAgICB0aGlzLmRlbGV0ZUZpeHVwKHgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgZGVsZXRlRml4dXAoeDogTkQpIHtcbiAgICB3aGlsZSAoeCAhPT0gdGhpcy5yb290ICYmIHRoaXMuaXNCbGFjayh4KSkge1xuICAgICAgaWYgKHgucCAmJiB4ID09PSB4LnAubGVmdCkge1xuICAgICAgICBsZXQgdyA9IHgucC5yaWdodDsgLy8gdyBpcyB4J3Mgc2libGluZ1xuICAgICAgICBpZiAodGhpcy5pc1JlZCh3KSkge1xuICAgICAgICAgIHchLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgeC5wLmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxlZnRSb3RhdGUoeC5wICk7XG4gICAgICAgICAgdyA9IHgucC5yaWdodDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodykge1xuICAgICAgICAgIGlmICh0aGlzLmlzQmxhY2sody5sZWZ0KSAmJiB0aGlzLmlzQmxhY2sody5yaWdodCkpIHtcbiAgICAgICAgICAgIHcuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgICAgeCA9IHgucCA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQmxhY2sody5yaWdodCkpIHtcbiAgICAgICAgICAgICAgaWYgKHcubGVmdClcbiAgICAgICAgICAgICAgICB3LmxlZnQuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgdy5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMucmlnaHRSb3RhdGUodyk7XG4gICAgICAgICAgICAgIHcgPSB4LnAucmlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodykgdy5pc1JlZCA9IHRoaXMuaXNSZWQoeC5wKTtcbiAgICAgICAgICAgIHgucC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHc/LnJpZ2h0KSB3LnJpZ2h0LmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmxlZnRSb3RhdGUoeC5wICk7XG4gICAgICAgICAgICB4ID0gdGhpcy5yb290ITtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoeC5wICYmIHggPT09IHgucC5yaWdodCkge1xuICAgICAgICBsZXQgdyA9IHgucC5sZWZ0OyAvLyB3IGlzIHgncyBzaWJsaW5nXG4gICAgICAgIGlmICh0aGlzLmlzUmVkKHcpKSB7XG4gICAgICAgICAgdyEuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICB4LnAuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMucmlnaHRSb3RhdGUoeC5wICk7XG4gICAgICAgICAgdyA9IHgucC5sZWZ0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh3KSB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNCbGFjayh3LnJpZ2h0KSAmJiB0aGlzLmlzQmxhY2sody5sZWZ0KSkge1xuICAgICAgICAgICAgdy5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgICB4ID0geC5wIDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNCbGFjayh3LmxlZnQpKSB7XG4gICAgICAgICAgICAgIGlmICh3LnJpZ2h0KVxuICAgICAgICAgICAgICAgIHcucmlnaHQuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgdy5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMubGVmdFJvdGF0ZSh3KTtcbiAgICAgICAgICAgICAgdyA9IHgucC5sZWZ0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHcpIHcuaXNSZWQgPSB0aGlzLmlzUmVkKHgucCk7XG4gICAgICAgICAgICB4LnAuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh3Py5sZWZ0KSB3LmxlZnQuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMucmlnaHRSb3RhdGUoeC5wICk7XG4gICAgICAgICAgICB4ID0gdGhpcy5yb290ITtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgeC5pc1JlZCA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc3BsYW50KHJlcGxhY2VOb2RlOiBORCwgd2l0aE5vZGU6IE5EIHwgbnVsbCA9IG51bGwpIHtcbiAgICBpZiAocmVwbGFjZU5vZGUucCA9PSBudWxsKSB7XG4gICAgICB0aGlzLnJvb3QgPSB3aXRoTm9kZTtcbiAgICB9IGVsc2UgaWYgKHJlcGxhY2VOb2RlID09PSByZXBsYWNlTm9kZS5wLmxlZnQpIHtcbiAgICAgIHJlcGxhY2VOb2RlLnAubGVmdCA9IHdpdGhOb2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXBsYWNlTm9kZS5wLnJpZ2h0ID0gd2l0aE5vZGU7XG4gICAgfVxuICAgIGlmICh3aXRoTm9kZSlcbiAgICAgIHdpdGhOb2RlLnAgPSByZXBsYWNlTm9kZS5wO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlZEJsYWNrSW5zZXJ0Rml4VXAoejogTkQpIHtcbiAgICB3aGlsZSAodGhpcy5pc1JlZCh6LnApKSB7XG4gICAgICBpZiAoei5wPy5wICYmIHoucCA9PT0gei5wLnAubGVmdCkge1xuICAgICAgICBjb25zdCB1bmNsZSA9IHoucC5wLnJpZ2h0O1xuICAgICAgICBpZiAodGhpcy5pc1JlZCh1bmNsZSkpIHtcbiAgICAgICAgICAvLyBtYXJrIHBhcmVudCBhbmQgdW5jbGUgdG8gYmxhY2ssIGdyYW5kcGEgdG8gcmVkLCBjb250aW51ZSB0byBnbyB1cCB0byBncmFuZHBhIGxldmVsXG4gICAgICAgICAgei5wLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHVuY2xlKSB1bmNsZS5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgIHoucC5wLmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICB6ID0gei5wLnA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdW5jbGUgaXMgYmxhY2tcbiAgICAgICAgICBpZiAoeiA9PT0gei5wLnJpZ2h0KSB7XG4gICAgICAgICAgICAvLyBpZiBpcyByaWdodCBjaGlsZCB0cmVlXG4gICAgICAgICAgICB6ID0gei5wO1xuICAgICAgICAgICAgdGhpcy5sZWZ0Um90YXRlKHopO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoei5wKSB7XG4gICAgICAgICAgICB6LnAuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICh6LnAucCkge1xuICAgICAgICAgICAgICB6LnAucC5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMucmlnaHRSb3RhdGUoei5wLnApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh6LnA/LnAgJiYgei5wID09PSB6LnAucC5yaWdodCkge1xuICAgICAgICBjb25zdCB1bmNsZSA9IHoucC5wLmxlZnQ7XG4gICAgICAgIGlmICh0aGlzLmlzUmVkKHVuY2xlKSkge1xuICAgICAgICAgIC8vIG1hcmsgcGFyZW50IGFuZCB1bmNsZSB0byBibGFjaywgZ3JhbmRwYSB0byByZWQsIGNvbnRpbnVlIHRvIGdvIHVwIHRvIGdyYW5kcGEgbGV2ZWxcbiAgICAgICAgICB6LnAuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICBpZiAodW5jbGUpIHVuY2xlLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgei5wLnAuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgIHogPSB6LnAucDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB1bmNsZSBpcyBibGFja1xuICAgICAgICAgIGlmICh6ID09PSB6LnAubGVmdCkge1xuICAgICAgICAgICAgLy8gaWYgaXMgcmlnaHQgY2hpbGQgdHJlZVxuICAgICAgICAgICAgeiA9IHoucDtcbiAgICAgICAgICAgIHRoaXMucmlnaHRSb3RhdGUoeik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh6LnApIHtcbiAgICAgICAgICAgIHoucC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHoucC5wKSB7XG4gICAgICAgICAgICAgIHoucC5wLmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdGhpcy5sZWZ0Um90YXRlKHoucC5wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMucm9vdClcbiAgICAgIHRoaXMucm9vdC5pc1JlZCA9IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBsZWZ0Um90YXRlKHg6IE5EKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ2xlZnRSb3RhdGUnLCB4LmtleSk7XG4gICAgY29uc3QgeSA9IHgucmlnaHQ7XG4gICAgaWYgKHkgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICB4LnJpZ2h0ID0geS5sZWZ0O1xuICAgIGlmICh5LmxlZnQpIHtcbiAgICAgIHkubGVmdC5wID0geDtcbiAgICB9XG4gICAgeS5wID0geC5wO1xuICAgIGlmICh4LnAgPT0gbnVsbClcbiAgICAgIHRoaXMucm9vdCA9IHk7XG4gICAgZWxzZSBpZiAoeCA9PT0geC5wLmxlZnQpXG4gICAgICB4LnAubGVmdCA9IHk7XG4gICAgZWxzZVxuICAgICAgeC5wLnJpZ2h0ID0geTtcbiAgICB5LmxlZnQgPSB4O1xuICAgIHgucCA9IHk7XG4gIH1cblxuICBwcml2YXRlIHJpZ2h0Um90YXRlKHg6IE5EKSB7XG4gICAgY29uc3QgeSA9IHgubGVmdDtcbiAgICBpZiAoeSA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIHgubGVmdCA9IHkucmlnaHQ7XG4gICAgaWYgKHkucmlnaHQpIHtcbiAgICAgIHkucmlnaHQucCA9IHg7XG4gICAgfVxuICAgIHkucCA9IHgucDtcbiAgICBpZiAoeC5wID09IG51bGwpXG4gICAgICB0aGlzLnJvb3QgPSB5O1xuICAgIGVsc2UgaWYgKHggPT09IHgucC5yaWdodClcbiAgICAgIHgucC5yaWdodCA9IHk7XG4gICAgZWxzZVxuICAgICAgeC5wLmxlZnQgPSB5O1xuICAgIHkucmlnaHQgPSB4O1xuICAgIHgucCA9IHk7XG4gIH1cbn1cblxuIl19