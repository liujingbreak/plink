"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalTree = void 0;
exports.isDuplicateNode = isDuplicateNode;
const rb_tree_1 = require("./rb-tree");
/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *  Be aware that "high endpoint" is considered as an included value
 */
class IntervalTree extends rb_tree_1.RedBlackTree {
    /** Return tree node which could be either NonDuplicateNode or a node of DuplicateNode['highValuesTree'],
     * the returned tree node could be the old one if there is already existing node with same "key" (low value)
     */
    insertInterval(low, high) {
        let valueContainer;
        if (low > high) {
            const temp = high = low;
            low = temp;
        }
        const node = this.insert(low);
        if (node.int) {
            if (node.int[1] === high) {
                return node;
            }
            // A duplicate low boundray
            const highValuesTree = node.highValuesTree = new rb_tree_1.RedBlackTree();
            highValuesTree.insert(node.int[1]).value = node.value;
            valueContainer = highValuesTree.insert(high);
            node.int = undefined;
            node.weight++;
            if (high > node.maxHighOfMulti)
                node.maxHighOfMulti = high;
        }
        else if (isDuplicateNode(node)) {
            valueContainer = node.highValuesTree.insert(high);
            node.weight = node.highValuesTree.size();
            if (high > node.maxHighOfMulti)
                node.maxHighOfMulti = high;
        }
        else {
            node.int = [low, high];
            valueContainer = node;
            node.maxHighOfMulti = high;
        }
        // if (high > ((node as DuplicateNode<V>).maxHighOfMulti ?? Number.MIN_VALUE)) {
        //   (node as DuplicateNode<V>).maxHighOfMulti = high;
        // }
        this.maintainNodeMaxValue(node);
        return valueContainer;
    }
    deleteInterval(low, high) {
        var _a;
        if (low > high) {
            const temp = high = low;
            low = temp;
        }
        const node = this.search(low);
        if (node == null || node === this.nil)
            return false;
        if (((_a = node.int) === null || _a === void 0 ? void 0 : _a[1]) === high) {
            this.deleteNode(node);
            return true;
        }
        else if (isDuplicateNode(node)) {
            const origMaxHigh = node.maxHighOfMulti;
            const deleted = node.highValuesTree.delete(high);
            if (deleted) {
                node.weight--;
                if (node.highValuesTree.size() === 1) {
                    node.int = [node.key, node.highValuesTree.root.key];
                    node.value = node.highValuesTree.root.value;
                    node.maxHighOfMulti = node.highValuesTree.root.key;
                    node.highValuesTree = undefined;
                    if (origMaxHigh !== node.maxHighOfMulti)
                        this.maintainNodeMaxValue(node);
                    return true;
                }
                else {
                    node.maxHighOfMulti = node.highValuesTree.maximum().key;
                    if (origMaxHigh !== node.maxHighOfMulti)
                        this.maintainNodeMaxValue(node);
                    return true;
                }
            }
        }
        return false;
    }
    searchIntervalNode(low, high) {
        if (low > high) {
            const temp = high = low;
            low = temp;
        }
        const node = this.search(low);
        if (node == null || node === this.nil)
            return null;
        if (node.int && node.int[1] === high) {
            return node;
        }
        else if (node.highValuesTree) {
            return node.highValuesTree.search(high);
        }
        return null;
    }
    /** @param high is considered as an included endpoint value */
    searchSingleOverlap(low, high) {
        var _a, _b;
        if (this.root === this.nil)
            return null;
        let node = this.root;
        while (node !== this.nil && !doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
            if ((node.left !== this.nil) && low <= node.left.max) {
                node = node.left;
            }
            else {
                node = node.right;
            }
        }
        return node === this.nil ?
            null :
            [
                node.key,
                node.maxHighOfMulti,
                node.highValuesTree && node.highValuesTree.size() > 0 ?
                    node.highValuesTree.maximum().value :
                    node.value,
                (_b = (_a = node.highValuesTree) === null || _a === void 0 ? void 0 : _a.maximum()) !== null && _b !== void 0 ? _b : null,
                node
            ];
    }
    /** @param high is considered as an included endpoint value */
    searchMultipleOverlaps(low, high) {
        if (this.root === this.nil)
            return [];
        const foundNodes = this._searchMultipleOverlaps(low, high, this.root);
        return foundNodes.map(([l, h, hNode, n]) => {
            return [l, h, hNode ? hNode.value : n.value, hNode, n];
        });
    }
    /** traverse all nodes in in-order */
    *allIntervals() {
        for (const [node] of this.allChildNodeInorder()) {
            if (node.highValuesTree)
                for (const [hvNode] of node.highValuesTree.allChildNodeInorder()) {
                    yield [node.key, hvNode.key, hvNode.value];
                }
            else
                yield [...node.int, node.value];
        }
    }
    /** @Override
     */
    onLeftChildChange(parent, _child) {
        this.maintainNodeMaxValue(parent);
    }
    /** @Override
     */
    onRightChildChange(parent, _child) {
        this.maintainNodeMaxValue(parent);
    }
    maintainNodeMaxValue(node) {
        let currNode = node;
        while (currNode != null && currNode !== this.nil) {
            // if (currNode.maxHighOfMulti == null)
            //   throw new Error('currNode.maxHighOfMulti should not be empty');
            currNode.max = Math.max(currNode.maxHighOfMulti, Math.max(currNode.left !== this.nil ? currNode.left.max : Number.MIN_VALUE, currNode.right !== this.nil ? currNode.right.max : Number.MIN_VALUE));
            currNode = currNode.p;
        }
    }
    _searchMultipleOverlaps(low, high, node) {
        if (node == null || node === this.nil) {
            return [];
        }
        const currOverlaps = [];
        if (doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
            if (node.int) {
                currOverlaps.push([...node.int, null, node]);
            }
            else if (node.highValuesTree) {
                if (low < node.key) {
                    for (const [n] of node.highValuesTree.allChildNodeInorder()) {
                        currOverlaps.push([node.key, n.key, n, node]);
                    }
                }
                else {
                    // const beforeLen = overlaps.length;
                    for (const hNode of node.highValuesTree.keysGreaterThan(low, true))
                        currOverlaps.push([node.key, hNode.key, hNode, node]);
                    // numOverlaps = overlaps.length - beforeLen;
                }
            }
        }
        if (node.left !== this.nil && low <= node.left.max) {
            const overlapsLeft = this._searchMultipleOverlaps(low, high, node.left);
            if (overlapsLeft.length > 0) {
                currOverlaps.unshift(...overlapsLeft);
                currOverlaps.push(...this._searchMultipleOverlaps(low, high, node.right));
            }
            // Skip right child, as if zero left child overlaps, then
            // target interval's high value must be even smaller than all left children's low values,
            // meaning entire left child tree is greater than target interval, so right child tree does the same
        }
        else {
            currOverlaps.push(...this._searchMultipleOverlaps(low, high, node.right));
        }
        return currOverlaps;
    }
}
exports.IntervalTree = IntervalTree;
/** A multi-value tree node can contain multiple intervals, in this case the tree node is assignable to type "DuplicateNode" */
function isDuplicateNode(node) {
    return !!node.highValuesTree;
}
function doesIntervalOverlap(intA, intB) {
    // Not in case of: intA is left to intB or intA is right to intB entirely
    return !(intA[1] < intB[0] || intB[1] < intA[0]);
}
//# sourceMappingURL=interval-tree.js.map