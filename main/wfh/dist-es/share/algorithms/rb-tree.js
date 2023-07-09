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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmItdHJlZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL3NoYXJlL2FsZ29yaXRobXMvcmItdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFpQkgsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBc0IsVUFBbUM7UUFBbkMsZUFBVSxHQUFWLFVBQVUsQ0FBeUI7UUFGekQsU0FBSSxHQUEwQixJQUFJLENBQUM7UUFHakMsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1lBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNaLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsQ0FBQyxDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxHQUFNO1FBQ1gsSUFBSSxDQUFDLEdBQWMsSUFBSSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbEIsSUFBSSxHQUFXLENBQUM7UUFDaEIsNERBQTREO1FBQzVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixPQUFPLENBQUMsRUFBRTtZQUNSLENBQUMsR0FBRyxDQUFDLENBQUU7WUFDUCxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25DLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDWCxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQzthQUNaO2lCQUFNLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDbEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFL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QyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDVixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFjY29yZGluZyB0byB0aGUgYm9vayA8PCBJbnRyb2R1Y3Rpb24gdG8gQWxnb3JpdGhtcywgVGhpcmQgRWRpdGlvbiA+PlxuICogXG4gKiBmZWF0dXJlcyBpbiBwcm9ncmVzczogRHluYW1pYyBvcmRlciBzdGF0aXN0aWNzLCByYW5nZSB0cmVlXG4gKiBcbiAqIFRoaXMgZGF0YSBzdHJ1Y3R1cmUgaXMgbWVhbnQgZm9yIGJlaW5nIGV4dGVuZCwgc2luY2UgdGhlIG1ham9yaXR5IG9mIDNyZC1wYXJ0eSByZWQtYmxhY2sgdHJlZSBvbiBucG1qcy5vcmcgaXMgbm90IGV4dGVuc2libGVcbiAqL1xuXG5leHBvcnQgdHlwZSBSYlRyZWVOb2RlPFQsIFYgPSB1bmtub3duLCBDIGV4dGVuZHMgUmJUcmVlTm9kZTxhbnksIGFueSwgYW55PiA9IFJiVHJlZU5vZGU8VCwgViwgYW55Pj4gPSB7XG4gIGtleTogVDtcbiAgdmFsdWU6IFY7XG4gIHA6IEMgfCBudWxsO1xuICBsZWZ0OiBDIHwgbnVsbDtcbiAgcmlnaHQ6IEMgfCBudWxsO1xuICBpc1JlZDogYm9vbGVhbjtcbiAgLyoqIHRvdGFsIHdlaWdodCBvZiBjdXJyZW50dCBub2RlIGFuZCBjaGlsZHJlbidzLlxuICAqIHNpemUgPSBsZWZ0IGNoaWxkJ3Mgc2l6ZSArIHJpZ2h0IGNoaWxkIHNpemUgKyB3ZWlnaHRcbiAgKi9cbiAgc2l6ZTogbnVtYmVyO1xuICAvKiogd2VpZ2h0IG9mIGN1cnJlbnQgbm9kZSwgbm90IGluY2x1ZGluZ2cgY2hpbGRscmVuJ3NzICovXG4gIHdlaWdodDogbnVtYmVyO1xufTtcblxuZXhwb3J0IGNsYXNzIFJlZEJsYWNrVHJlZTxULCBWID0gdW5rbm93biwgTkQgZXh0ZW5kcyBSYlRyZWVOb2RlPFQsIFYsIE5EPiA9IFJiVHJlZU5vZGU8VCwgVj4+IHtcbiAgcm9vdDogTkQgfCBudWxsIHwgdW5kZWZpbmVkID0gbnVsbDtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY29tcGFyYXRvcj86IChhOiBULCBiOiBUKSA9PiBudW1iZXIpIHtcbiAgICBpZiAoY29tcGFyYXRvciA9PSBudWxsKSB7XG4gICAgICB0aGlzLmNvbXBhcmF0b3IgPSAoYSwgYikgPT4ge1xuICAgICAgICByZXR1cm4gYSA8IGIgP1xuICAgICAgICAgIC0xIDpcbiAgICAgICAgICBhID4gYiA/IDEgOiAwO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2hvdWxkIG92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gdG8gY3JlYXRlIG5ldyB0eXBlb2YgdHJlZSBub2RlXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHJldHVybnMgZXhpc3RpbmcgdHJlZSBub2RlIGlmIGtleSBkdXBsaWNhdGVzIG9yIGEgbmV3IGVtcHR5IG5vZGVcbiAgICovXG4gIGluc2VydChrZXk6IFQpOiBPbWl0PE5ELCAndmFsdWUnPiAmIHt2YWx1ZT86IFZ9IHtcbiAgICBsZXQgeTogTkQgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgeCA9IHRoaXMucm9vdDtcbiAgICBsZXQgY21wOiBudW1iZXI7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgd2hpbGUgKHgpIHtcbiAgICAgIHkgPSB4IDtcbiAgICAgIGNtcCA9IHRoaXMuY29tcGFyYXRvciEoa2V5LCB4LmtleSk7XG4gICAgICBpZiAoY21wIDwgMCkge1xuICAgICAgICB4ID0geC5sZWZ0O1xuICAgICAgfSBlbHNlIGlmIChjbXAgPiAwKSB7XG4gICAgICAgIHggPSB4LnJpZ2h0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHg7IC8vIGR1cGxpY2F0ZSBrZXkgZm91bmRcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgeiA9IHtcbiAgICAgIGlzUmVkOiB0cnVlLFxuICAgICAga2V5LFxuICAgICAgcDogeVxuICAgIH0gYXMgdW5rbm93biBhcyBORDtcblxuICAgIGxldCBsZWZ0OiBORCB8IG51bGwgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHJpZ2h0OiBORCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoeiwgJ2xlZnQnLCB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybiwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgIHJldHVybiBsZWZ0O1xuICAgICAgfSxcbiAgICAgIHNldCh2OiBORCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGxlZnQgPT09IHYpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBsZWZ0ID0gdjtcbiAgICAgICAgc2VsZi51cGRhdGVOb2RlU2l6ZSh6KTtcbiAgICAgICAgc2VsZi5vbkxlZnRDaGlsZENoYW5nZSh6LCB2KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh6LCAncmlnaHQnLCB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVybiwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgIHJldHVybiByaWdodDtcbiAgICAgIH0sXG4gICAgICBzZXQodjogTkQgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChyaWdodCA9PT0gdilcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJpZ2h0ID0gdjtcbiAgICAgICAgc2VsZi51cGRhdGVOb2RlU2l6ZSh6KTtcbiAgICAgICAgc2VsZi5vblJpZ2h0Q2hpbGRDaGFuZ2Uoeiwgdik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBsZXQgd2VpZ2h0ID0gMDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh6LCAnd2VpZ2h0Jywge1xuICAgICAgZ2V0KCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm4sIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgICByZXR1cm4gd2VpZ2h0O1xuICAgICAgfSxcbiAgICAgIHNldCh2OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKHdlaWdodCA9PT0gdilcbiAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgd2VpZ2h0ID0gdjtcbiAgICAgICAgc2VsZi51cGRhdGVOb2RlU2l6ZSh6KTtcbiAgICAgICAgLy8gaWYgKHoucCkge1xuICAgICAgICAvLyAgIHoucC5zaXplID0gKHoucC5sZWZ0Py5zaXplIHx8IDApICsgKHoucC5yaWdodD8uc2l6ZSB8fCAwKSArIDE7XG4gICAgICAgIC8vIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHoud2VpZ2h0ID0gMTtcblxuICAgIGlmICh5ID09IG51bGwpIHtcbiAgICAgIHRoaXMucm9vdCA9IHo7XG4gICAgfSBlbHNlIGlmIChjbXAhIDwgMCApIHtcbiAgICAgIHkubGVmdCA9IHo7XG4gICAgfSBlbHNlIGlmIChjbXAhID4gMCApIHtcbiAgICAgIHkucmlnaHQgPSB6O1xuICAgIH1cbiAgICB0aGlzLnJlZEJsYWNrSW5zZXJ0Rml4VXAoeik7XG4gICAgcmV0dXJuIHo7XG4gIH1cblxuICAvKiogUmV0cmlldmUgYW4gZWxlbWVudCB3aXRoIGEgZ2l2ZW4gcmFuaywgdW5saWtlIDw8SW50cm9kdWN0aW9uIHRvIEFsZ29yaXRobXMgM3JkIEVkaXRpb24+PiwgaXQgYmVnaW5zIHdpdGggMCBcbiAgKiBhbmQgaXQgaXMgYmFlc2VkIG9uIFwic2l6ZVwiIHdoaWNoIGlzIGFjY3VtdWxhdGVkICBmcm9tIFwid2VpZ2h0XCIgb2Ygbm9kZSBhbmRzIGNoaWxkcmVuJ3NcbiAgKi9cbiAgYXRJbmRleChpZHg6IG51bWJlciwgYmVnaW5Ob2RlOiBORCB8IG51bGwgfCB1bmRlZmluZWQgPSB0aGlzLnJvb3QpOiBORCB8IG51bGwgfCB1bmRlZmluZWQge1xuICAgIGxldCBjdXJyTm9kZSA9IGJlZ2luTm9kZTtcbiAgICB3aGlsZSAoY3Vyck5vZGUpIHtcbiAgICAgIGNvbnN0IGxlZnRTaXplID0gKGN1cnJOb2RlLmxlZnQ/LnNpemUgfHwgMCk7XG4gICAgICBpZiAobGVmdFNpemUgPT09IGlkeClcbiAgICAgICAgcmV0dXJuIGN1cnJOb2RlO1xuICAgICAgZWxzZSBpZiAoaWR4IDwgbGVmdFNpemUpIHtcbiAgICAgICAgY3Vyck5vZGUgPSBjdXJyTm9kZS5sZWZ0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3Vyck5vZGUgPSBjdXJyTm9kZS5yaWdodDtcbiAgICAgICAgaWR4IC09IGxlZnRTaXplICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGN1cnJOb2RlO1xuICB9XG5cbiAgaW5kZXhPZihrZXk6IFQpOiBudW1iZXIge1xuICAgIGxldCBub2RlID0gdGhpcy5zZWFyY2goa2V5KTtcbiAgICBpZiAobm9kZSA9PSBudWxsKVxuICAgICAgcmV0dXJuIC0xO1xuXG4gICAgbGV0IGN1cnJJZHggPSAobm9kZS5sZWZ0Py5zaXplIHx8IDApO1xuICAgIHdoaWxlIChub2RlLnApIHtcbiAgICAgIGlmIChub2RlID09PSBub2RlLnAucmlnaHQpIHtcbiAgICAgICAgY3VycklkeCArPSAobm9kZS5wLmxlZnQ/LnNpemUgfHwgMCkgKyAxO1xuICAgICAgfVxuICAgICAgbm9kZSA9IG5vZGUucDtcbiAgICB9XG4gICAgcmV0dXJuIGN1cnJJZHg7XG4gIH1cblxuICBzZWFyY2goa2V5OiBUKTogTkQgfCBudWxsIHtcbiAgICBsZXQgbm9kZSA9IHRoaXMucm9vdDtcbiAgICB3aGlsZSAobm9kZSkge1xuICAgICAgY29uc3QgY21wID0gdGhpcy5jb21wYXJhdG9yIShrZXksIG5vZGUua2V5KTtcbiAgICAgIGlmIChjbXAgPT09IDApXG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgaWYgKGNtcCA8IDApIHtcbiAgICAgICAgbm9kZSA9IG5vZGUubGVmdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUgPSBub2RlLnJpZ2h0O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGRlbGV0ZShrZXk6IFQpIHtcbiAgICBjb25zdCBub2RlID0gdGhpcy5zZWFyY2goa2V5KTtcbiAgICBpZiAobm9kZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuZGVsZXRlTm9kZShub2RlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHN1Y2Nlc3Nvck5vZGUobm9kZTogTkQpIHtcbiAgICBpZiAobm9kZS5yaWdodCkge1xuICAgICAgcmV0dXJuIHRoaXMubWluaW11bShub2RlLnJpZ2h0KTtcbiAgICB9XG4gICAgbGV0IHkgPSBub2RlLnA7XG4gICAgd2hpbGUgKHkgJiYgbm9kZSA9PT0geS5yaWdodCkge1xuICAgICAgbm9kZSA9IHk7XG4gICAgICB5ID0geS5wO1xuICAgIH1cbiAgICByZXR1cm4geTtcbiAgfVxuXG4gIHByZWRlY2Vzc29yTm9kZShub2RlOiBORCkge1xuICAgIGlmIChub2RlLmxlZnQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1heGltdW0obm9kZS5sZWZ0KTtcbiAgICB9XG4gICAgbGV0IHkgPSBub2RlLnA7XG4gICAgd2hpbGUgKHkgJiYgbm9kZSA9PT0geS5sZWZ0KSB7XG4gICAgICBub2RlID0geTtcbiAgICAgIHkgPSB5LnA7XG4gICAgfVxuICAgIHJldHVybiB5O1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBrZXkgdGhlIHZhbHVlIG9mIGtleSB0byBiZSBjb21wYXJlZCB3aGljaCBjb3VsZCBiZSByZWxhdGVkIHRvIG5vbmUgbm9kZXMgaW4gY3VycmVudCB0cmVlXG4gICAqIEByZXR1cm4gaW50ZXJhdG9yIG9mIGV4aXN0aW5nIG5vZGVzIHdob3NlIGtleSBhcmUgZ3JlYXRlciB0aGFuIHNwZWNpZmljIGtleVxuICAgKi9cbiAgKmtleXNHcmVhdGVyVGhhbihrZXk6IFQpIHtcbiAgICBsZXQgbm9kZSA9IHRoaXMucm9vdDtcbiAgICB3aGlsZSAobm9kZSkge1xuICAgICAgY29uc3QgY21wID0gdGhpcy5jb21wYXJhdG9yIShrZXksIG5vZGUua2V5KTtcbiAgICAgIGlmIChjbXAgPT09IDApXG4gICAgICAgIGJyZWFrO1xuICAgICAgaWYgKGNtcCA8IDApIHtcbiAgICAgICAgaWYgKG5vZGUubGVmdCA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IHogPSBub2RlIGFzIHR5cGVvZiBub2RlIHwgbnVsbDtcbiAgICAgICAgICB3aGlsZSAoeikge1xuICAgICAgICAgICAgeWllbGQgejtcbiAgICAgICAgICAgIHogPSB0aGlzLnN1Y2Nlc3Nvck5vZGUoeik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBub2RlLmxlZnQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobm9kZS5yaWdodCA9PSBudWxsKSB7XG4gICAgICAgICAgbGV0IHogPSBub2RlLnA7XG4gICAgICAgICAgd2hpbGUgKHopIHtcbiAgICAgICAgICAgIHlpZWxkIHo7XG4gICAgICAgICAgICB6ID0gdGhpcy5zdWNjZXNzb3JOb2RlKHopO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5yaWdodDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSBrZXkgdGhlIHZhbHVlIG9mIGtleSB0byBiZSBjb21wYXJlZCB3aGljaCBjb3VsZCBiZSByZWxhdGVkIHRvIG5vbmUgbm9kZXMgaW4gY3VycmVudCB0cmVlXG4gICAqIEByZXR1cm4gaW50ZXJhdG9yIG9mIGV4aXN0aW5nIG5vZGVzIHdob3NlIGtleSBhcmUgZ3JlYXRlciB0aGFuIHNwZWNpZmljIGtleVxuICAgKi9cbiAgKmtleXNTbWFsbGVyZXJUaGFuKGtleTogVCkge1xuICAgIGxldCBub2RlID0gdGhpcy5yb290O1xuICAgIHdoaWxlIChub2RlKSB7XG4gICAgICBjb25zdCBjbXAgPSB0aGlzLmNvbXBhcmF0b3IhKGtleSwgbm9kZS5rZXkpO1xuICAgICAgaWYgKGNtcCA9PT0gMClcbiAgICAgICAgYnJlYWs7XG4gICAgICBpZiAoY21wIDwgMCkge1xuICAgICAgICBpZiAobm9kZS5sZWZ0ID09IG51bGwpIHtcbiAgICAgICAgICBsZXQgeiA9IG5vZGUucDtcbiAgICAgICAgICB3aGlsZSAoeikge1xuICAgICAgICAgICAgeWllbGQgejtcbiAgICAgICAgICAgIHogPSB0aGlzLnByZWRlY2Vzc29yTm9kZSh6KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUubGVmdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChub2RlLnJpZ2h0ID09IG51bGwpIHtcbiAgICAgICAgICBsZXQgeiA9IG5vZGUgYXMgdHlwZW9mIG5vZGUgfCBudWxsO1xuICAgICAgICAgIHdoaWxlICh6KSB7XG4gICAgICAgICAgICB5aWVsZCB6O1xuICAgICAgICAgICAgeiA9IHRoaXMucHJlZGVjZXNzb3JOb2RlKHopO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5yaWdodDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaW5vcmRlcldhbGsoY2FsbGJhY2s6IChub2RlOiBORCwgbGV2ZWw6IG51bWJlcikgPT4gdm9pZCwgbm9kZSA9IHRoaXMucm9vdCwgbGV2ZWwgPSAwKSB7XG4gICAgY29uc3QgbmV4dExldmVsID0gbGV2ZWwgKyAxO1xuICAgIGlmIChub2RlPy5sZWZ0KVxuICAgICAgdGhpcy5pbm9yZGVyV2FsayhjYWxsYmFjaywgbm9kZS5sZWZ0LCBuZXh0TGV2ZWwpO1xuICAgIGlmIChub2RlKVxuICAgICAgY2FsbGJhY2sobm9kZSwgbGV2ZWwpO1xuICAgIGlmIChub2RlPy5yaWdodClcbiAgICAgIHRoaXMuaW5vcmRlcldhbGsoY2FsbGJhY2ssIG5vZGUucmlnaHQsIG5leHRMZXZlbCk7XG4gIH1cblxuICBtaW5pbXVtKG5vZGUgPSB0aGlzLnJvb3QpIHtcbiAgICB3aGlsZSAobm9kZT8ubGVmdCkge1xuICAgICAgbm9kZSA9IG5vZGUubGVmdDtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGUgPz8gbnVsbDtcbiAgfVxuXG4gIG1heGltdW0obm9kZSA9IHRoaXMucm9vdCkge1xuICAgIHdoaWxlIChub2RlPy5yaWdodCkge1xuICAgICAgbm9kZSA9IG5vZGUucmlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBub2RlID8/IG51bGw7XG4gIH1cblxuICBzaXplKCkge1xuICAgIHJldHVybiB0aGlzLnJvb3Q/LnNpemUgPz8gMDtcbiAgfVxuXG4gIGlzUmVkKG5vZGU6IE5EIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiAhIW5vZGU/LmlzUmVkO1xuICB9XG5cbiAgaXNCbGFjayhub2RlOiBORCB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbm9kZSA9PSBudWxsIHx8ICFub2RlLmlzUmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvIGJlIGV4dGVuZCBhbmQgb3ZlcnJpZGRlblxuICAgKi9cbiAgcHJvdGVjdGVkIG9uTGVmdENoaWxkQ2hhbmdlKF9wYXJlbnQ6IE5ELCBfY2hpbGQ6IE5EIHwgbnVsbCB8IHVuZGVmaW5lZCkge1xuICB9XG4gIC8qKlxuICAgKiBUbyBiZSBleHRlbmQgYW5kIG92ZXJyaWRkZW5cbiAgICovXG4gIHByb3RlY3RlZCBvblJpZ2h0Q2hpbGRDaGFuZ2UoX3BhcmVudDogTkQsIF9jaGlsZDogTkQgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gIH1cblxuICBwcm90ZWN0ZWQgdXBkYXRlTm9kZVNpemUobm9kZTogTkQpIHtcbiAgICBsZXQgeiA9IG5vZGUgYXMgdHlwZW9mIG5vZGUucDtcbiAgICB3aGlsZSAoeikge1xuICAgICAgei5zaXplID0gei53ZWlnaHQgKyAoei5sZWZ0Py5zaXplID8/IDApICsgKHoucmlnaHQ/LnNpemUgPz8gMCk7XG4gICAgICB6ID0gei5wO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBkZWxldGVOb2RlKHo6IE5EKSB7XG4gICAgbGV0IHk6IE5EIHwgbnVsbCAgPSB6O1xuICAgIGxldCBvcmlnSXNSZWQgPSB0aGlzLmlzUmVkKHkpO1xuICAgIGxldCB4OiBORCB8IG51bGwgPSBudWxsO1xuICAgIGlmICh6LmxlZnQgPT0gbnVsbCkge1xuICAgICAgeCA9IHoucmlnaHQ7XG4gICAgICB0aGlzLnRyYW5zcGxhbnQoeiwgei5yaWdodCk7XG4gICAgfSBlbHNlIGlmICh6LnJpZ2h0ID09IG51bGwpIHtcbiAgICAgIHggPSB6LmxlZnQ7XG4gICAgICB0aGlzLnRyYW5zcGxhbnQoeiwgei5sZWZ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYm90aCBsZWZ0IGFuZCByaWdodCBjaGlsZCBhcmUgbm90IGVtcHR5XG4gICAgICB5ID0gdGhpcy5taW5pbXVtKHoucmlnaHQpO1xuICAgICAgaWYgKHkgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgb3JpZ0lzUmVkID0gdGhpcy5pc1JlZCh5KTtcbiAgICAgIHggPSB5LnJpZ2h0O1xuICAgICAgaWYgKHkucCA9PT0geikge1xuICAgICAgICBpZiAoeCkgeC5wID0geTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudHJhbnNwbGFudCh5LCB5LnJpZ2h0KTtcbiAgICAgICAgeS5yaWdodCA9IHoucmlnaHQ7XG4gICAgICAgIHkucmlnaHQucCA9IHk7XG4gICAgICB9XG4gICAgICB0aGlzLnRyYW5zcGxhbnQoeiwgeSk7XG4gICAgICB5LmxlZnQgPSB6LmxlZnQ7XG4gICAgICB5LmxlZnQucCA9IHk7XG4gICAgICB5LmlzUmVkID0gdGhpcy5pc1JlZCh6KTtcbiAgICB9XG4gICAgaWYgKCFvcmlnSXNSZWQgJiYgeCkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ2RlbGV0ZSBmaXh1cCcsIHgua2V5KTtcbiAgICAgIHRoaXMuZGVsZXRlRml4dXAoeCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWxldGVGaXh1cCh4OiBORCkge1xuICAgIHdoaWxlICh4ICE9PSB0aGlzLnJvb3QgJiYgdGhpcy5pc0JsYWNrKHgpKSB7XG4gICAgICBpZiAoeC5wICYmIHggPT09IHgucC5sZWZ0KSB7XG4gICAgICAgIGxldCB3ID0geC5wLnJpZ2h0OyAvLyB3IGlzIHgncyBzaWJsaW5nXG4gICAgICAgIGlmICh0aGlzLmlzUmVkKHcpKSB7XG4gICAgICAgICAgdyEuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICB4LnAuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMubGVmdFJvdGF0ZSh4LnAgKTtcbiAgICAgICAgICB3ID0geC5wLnJpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh3KSB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNCbGFjayh3LmxlZnQpICYmIHRoaXMuaXNCbGFjayh3LnJpZ2h0KSkge1xuICAgICAgICAgICAgdy5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgICB4ID0geC5wIDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNCbGFjayh3LnJpZ2h0KSkge1xuICAgICAgICAgICAgICBpZiAody5sZWZ0KVxuICAgICAgICAgICAgICAgIHcubGVmdC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICB3LmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdGhpcy5yaWdodFJvdGF0ZSh3KTtcbiAgICAgICAgICAgICAgdyA9IHgucC5yaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3KSB3LmlzUmVkID0gdGhpcy5pc1JlZCh4LnApO1xuICAgICAgICAgICAgeC5wLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAodz8ucmlnaHQpIHcucmlnaHQuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMubGVmdFJvdGF0ZSh4LnAgKTtcbiAgICAgICAgICAgIHggPSB0aGlzLnJvb3QhO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh4LnAgJiYgeCA9PT0geC5wLnJpZ2h0KSB7XG4gICAgICAgIGxldCB3ID0geC5wLmxlZnQ7IC8vIHcgaXMgeCdzIHNpYmxpbmdcbiAgICAgICAgaWYgKHRoaXMuaXNSZWQodykpIHtcbiAgICAgICAgICB3IS5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgIHgucC5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5yaWdodFJvdGF0ZSh4LnAgKTtcbiAgICAgICAgICB3ID0geC5wLmxlZnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHcpIHtcbiAgICAgICAgICBpZiAodGhpcy5pc0JsYWNrKHcucmlnaHQpICYmIHRoaXMuaXNCbGFjayh3LmxlZnQpKSB7XG4gICAgICAgICAgICB3LmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHggPSB4LnAgO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0JsYWNrKHcubGVmdCkpIHtcbiAgICAgICAgICAgICAgaWYgKHcucmlnaHQpXG4gICAgICAgICAgICAgICAgdy5yaWdodC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICB3LmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdGhpcy5sZWZ0Um90YXRlKHcpO1xuICAgICAgICAgICAgICB3ID0geC5wLmxlZnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodykgdy5pc1JlZCA9IHRoaXMuaXNSZWQoeC5wKTtcbiAgICAgICAgICAgIHgucC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHc/LmxlZnQpIHcubGVmdC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5yaWdodFJvdGF0ZSh4LnAgKTtcbiAgICAgICAgICAgIHggPSB0aGlzLnJvb3QhO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB4LmlzUmVkID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zcGxhbnQocmVwbGFjZU5vZGU6IE5ELCB3aXRoTm9kZTogTkQgfCBudWxsID0gbnVsbCkge1xuICAgIGlmIChyZXBsYWNlTm9kZS5wID09IG51bGwpIHtcbiAgICAgIHRoaXMucm9vdCA9IHdpdGhOb2RlO1xuICAgIH0gZWxzZSBpZiAocmVwbGFjZU5vZGUgPT09IHJlcGxhY2VOb2RlLnAubGVmdCkge1xuICAgICAgcmVwbGFjZU5vZGUucC5sZWZ0ID0gd2l0aE5vZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcGxhY2VOb2RlLnAucmlnaHQgPSB3aXRoTm9kZTtcbiAgICB9XG4gICAgaWYgKHdpdGhOb2RlKVxuICAgICAgd2l0aE5vZGUucCA9IHJlcGxhY2VOb2RlLnA7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVkQmxhY2tJbnNlcnRGaXhVcCh6OiBORCkge1xuICAgIHdoaWxlICh0aGlzLmlzUmVkKHoucCkpIHtcbiAgICAgIGlmICh6LnA/LnAgJiYgei5wID09PSB6LnAucC5sZWZ0KSB7XG4gICAgICAgIGNvbnN0IHVuY2xlID0gei5wLnAucmlnaHQ7XG4gICAgICAgIGlmICh0aGlzLmlzUmVkKHVuY2xlKSkge1xuICAgICAgICAgIC8vIG1hcmsgcGFyZW50IGFuZCB1bmNsZSB0byBibGFjaywgZ3JhbmRwYSB0byByZWQsIGNvbnRpbnVlIHRvIGdvIHVwIHRvIGdyYW5kcGEgbGV2ZWxcbiAgICAgICAgICB6LnAuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICBpZiAodW5jbGUpIHVuY2xlLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgei5wLnAuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgIHogPSB6LnAucDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB1bmNsZSBpcyBibGFja1xuICAgICAgICAgIGlmICh6ID09PSB6LnAucmlnaHQpIHtcbiAgICAgICAgICAgIC8vIGlmIGlzIHJpZ2h0IGNoaWxkIHRyZWVcbiAgICAgICAgICAgIHogPSB6LnA7XG4gICAgICAgICAgICB0aGlzLmxlZnRSb3RhdGUoeik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh6LnApIHtcbiAgICAgICAgICAgIHoucC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHoucC5wKSB7XG4gICAgICAgICAgICAgIHoucC5wLmlzUmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdGhpcy5yaWdodFJvdGF0ZSh6LnAucCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHoucD8ucCAmJiB6LnAgPT09IHoucC5wLnJpZ2h0KSB7XG4gICAgICAgIGNvbnN0IHVuY2xlID0gei5wLnAubGVmdDtcbiAgICAgICAgaWYgKHRoaXMuaXNSZWQodW5jbGUpKSB7XG4gICAgICAgICAgLy8gbWFyayBwYXJlbnQgYW5kIHVuY2xlIHRvIGJsYWNrLCBncmFuZHBhIHRvIHJlZCwgY29udGludWUgdG8gZ28gdXAgdG8gZ3JhbmRwYSBsZXZlbFxuICAgICAgICAgIHoucC5pc1JlZCA9IGZhbHNlO1xuICAgICAgICAgIGlmICh1bmNsZSkgdW5jbGUuaXNSZWQgPSBmYWxzZTtcbiAgICAgICAgICB6LnAucC5pc1JlZCA9IHRydWU7XG4gICAgICAgICAgeiA9IHoucC5wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHVuY2xlIGlzIGJsYWNrXG4gICAgICAgICAgaWYgKHogPT09IHoucC5sZWZ0KSB7XG4gICAgICAgICAgICAvLyBpZiBpcyByaWdodCBjaGlsZCB0cmVlXG4gICAgICAgICAgICB6ID0gei5wO1xuICAgICAgICAgICAgdGhpcy5yaWdodFJvdGF0ZSh6KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHoucCkge1xuICAgICAgICAgICAgei5wLmlzUmVkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoei5wLnApIHtcbiAgICAgICAgICAgICAgei5wLnAuaXNSZWQgPSB0cnVlO1xuICAgICAgICAgICAgICB0aGlzLmxlZnRSb3RhdGUoei5wLnApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5yb290KVxuICAgICAgdGhpcy5yb290LmlzUmVkID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGxlZnRSb3RhdGUoeDogTkQpIHtcbiAgICAvLyBjb25zb2xlLmxvZygnbGVmdFJvdGF0ZScsIHgua2V5KTtcbiAgICBjb25zdCB5ID0geC5yaWdodDtcbiAgICBpZiAoeSA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIHgucmlnaHQgPSB5LmxlZnQ7XG4gICAgaWYgKHkubGVmdCkge1xuICAgICAgeS5sZWZ0LnAgPSB4O1xuICAgIH1cbiAgICB5LnAgPSB4LnA7XG4gICAgaWYgKHgucCA9PSBudWxsKVxuICAgICAgdGhpcy5yb290ID0geTtcbiAgICBlbHNlIGlmICh4ID09PSB4LnAubGVmdClcbiAgICAgIHgucC5sZWZ0ID0geTtcbiAgICBlbHNlXG4gICAgICB4LnAucmlnaHQgPSB5O1xuICAgIHkubGVmdCA9IHg7XG4gICAgeC5wID0geTtcbiAgfVxuXG4gIHByaXZhdGUgcmlnaHRSb3RhdGUoeDogTkQpIHtcbiAgICBjb25zdCB5ID0geC5sZWZ0O1xuICAgIGlmICh5ID09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgeC5sZWZ0ID0geS5yaWdodDtcbiAgICBpZiAoeS5yaWdodCkge1xuICAgICAgeS5yaWdodC5wID0geDtcbiAgICB9XG4gICAgeS5wID0geC5wO1xuICAgIGlmICh4LnAgPT0gbnVsbClcbiAgICAgIHRoaXMucm9vdCA9IHk7XG4gICAgZWxzZSBpZiAoeCA9PT0geC5wLnJpZ2h0KVxuICAgICAgeC5wLnJpZ2h0ID0geTtcbiAgICBlbHNlXG4gICAgICB4LnAubGVmdCA9IHk7XG4gICAgeS5yaWdodCA9IHg7XG4gICAgeC5wID0geTtcbiAgfVxufVxuXG4iXX0=