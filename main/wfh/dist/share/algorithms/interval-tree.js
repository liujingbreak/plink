"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalTree = void 0;
const rb_tree_1 = require("./rb-tree");
/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *
 *
 */
class IntervalTree extends rb_tree_1.RedBlackTree {
    /** Return tree node, if property value is undefined */
    insertInterval(low, high) {
        var _a;
        let valueContainer;
        const node = this.insert(low);
        if (node.int) {
            if (node.int[1] === high) {
                // duplicate high boundray value
                // node.value = data;
                return node;
            }
            // A duplicate low boundray
            node.highValuesTree = new rb_tree_1.RedBlackTree();
            node.highValuesTree.insert(node.int[1]).value = node.value;
            valueContainer = node.highValuesTree.insert(high);
            node.int = undefined;
            node.weight++;
        }
        if (node.highValuesTree) {
            // node.highValuesTree.insert(high).value = data;
            valueContainer = node.highValuesTree.insert(high);
            node.weight = node.highValuesTree.size();
        }
        else {
            node.int = [low, high];
            // node.value = data;
            valueContainer = node;
        }
        if (high > ((_a = node.maxHighOfMulti) !== null && _a !== void 0 ? _a : Number.MIN_VALUE)) {
            node.maxHighOfMulti = high;
        }
        maintainNodeMaxValue(node);
        return valueContainer;
    }
    deleteInterval(low, high) {
        const node = this.search(low);
        if (node == null)
            return false;
        if (node.int && node.int[1] === high) {
            this.deleteNode(node);
            return true;
        }
        else if (node.highValuesTree) {
            const origMaxHigh = node.maxHighOfMulti;
            const deleted = node.highValuesTree.delete(high);
            if (deleted) {
                node.weight--;
                if (node.highValuesTree.size() === 1) {
                    node.int = [node.key, node.highValuesTree.root.key];
                    node.value = node.highValuesTree.root.value;
                    node.highValuesTree = undefined;
                    node.maxHighOfMulti = node.int[1];
                    if (origMaxHigh !== node.maxHighOfMulti)
                        maintainNodeMaxValue(node);
                    return true;
                }
                else {
                    node.maxHighOfMulti = node.highValuesTree.maximum().key;
                    if (origMaxHigh !== node.maxHighOfMulti)
                        maintainNodeMaxValue(node);
                    return true;
                }
            }
        }
        return false;
    }
    searchSingleOverlap(low, high) {
        let node = this.root;
        while (node && !doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
            if (node.left && low <= node.left.max) {
                node = node.left;
            }
            else {
                node = node.right;
            }
        }
        return node;
    }
    *searchMultipleOverlaps(low, high) {
        const foundNodes = [];
        searchMultipleOverlaps(foundNodes, low, high, this.root);
        // const intervals = new Array<[number, number, V, IntervalTreeNode<V>]>(foundNodes.length);
        for (const node of foundNodes) {
            if (node.int) {
                yield [...node.int, node.value, node];
            }
            else if (node.highValuesTree) {
                for (const highTreeNode of node.highValuesTree.keysSmallererThan(high)) {
                    yield [node.key, highTreeNode.key, highTreeNode.value, node];
                }
            }
        }
    }
    /** @Override
     */
    onLeftChildChange(parent, child) {
        maintainNodeMaxValue(parent);
    }
    /** @Override
     */
    onRightChildChange(parent, child) {
        maintainNodeMaxValue(parent);
    }
}
exports.IntervalTree = IntervalTree;
function maintainNodeMaxValue(node) {
    var _a, _b, _c, _d;
    let currNode = node;
    while (currNode) {
        if (currNode.maxHighOfMulti == null)
            throw new Error('currNode.maxHighOfMulti should not be empty');
        currNode.max = Math.max(currNode.maxHighOfMulti, Math.max((_b = (_a = currNode.left) === null || _a === void 0 ? void 0 : _a.max) !== null && _b !== void 0 ? _b : Number.MIN_VALUE, (_d = (_c = currNode.right) === null || _c === void 0 ? void 0 : _c.max) !== null && _d !== void 0 ? _d : Number.MIN_VALUE));
        currNode = currNode.p;
    }
}
function doesIntervalOverlap(intA, intB) {
    // Not in case of: intA is left to intB or intA is right to intB entirely
    return !(intA[1] < intB[0] || intB[1] < intA[0]);
}
function searchMultipleOverlaps(overlaps, low, high, node) {
    if (node == null) {
        return 0;
    }
    let numOverlaps = 0;
    if (doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
        overlaps.push(node);
        numOverlaps = 1;
    }
    if (node.left && low <= node.left.max) {
        const numOverlapsLeft = searchMultipleOverlaps(overlaps, low, high, node.left);
        if (numOverlapsLeft > 0) {
            numOverlaps += numOverlapsLeft;
            numOverlaps += searchMultipleOverlaps(overlaps, low, high, node.right);
        }
        // Skip right child, as if zero left child overlaps, then
        // target interval's high value must be even smaller than all left children's low values,
        // meaning entire left child tree is greater than target interval, so right child tree does the same
    }
    else {
        numOverlaps += searchMultipleOverlaps(overlaps, low, high, node.right);
    }
    return numOverlaps;
}
//# sourceMappingURL=interval-tree.js.map