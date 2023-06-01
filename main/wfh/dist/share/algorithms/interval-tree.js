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
    insertInterval(low, high, data) {
        var _a;
        const node = this.insert(low);
        if (node.int) {
            // A duplicate low boundray
            node.multi = [
                [node.int[1], node.value],
                [high, data]
            ];
            node.int = undefined;
        }
        else if (node.multi) {
            if (node.multi.length >= 3) {
                node.highValuesTree = new rb_tree_1.RedBlackTree();
                for (const [h, v] of node.multi) {
                    node.highValuesTree.insert(h).value = v;
                }
                node.highValuesTree.insert(high).value = data;
                node.multi = undefined;
            }
            else {
                node.multi.push([high, data]);
            }
        }
        else if (node.highValuesTree) {
            node.highValuesTree.insert(high).value = data;
        }
        else {
            node.int = [low, high];
            node.value = data;
        }
        if (high > ((_a = node.maxHighOfMulti) !== null && _a !== void 0 ? _a : Number.MIN_VALUE)) {
            node.maxHighOfMulti = high;
        }
        maintainNodeMaxValue(node);
        return node;
    }
    deleteInterval(low, high) {
        const node = this.search(low);
        if (node == null)
            return false;
        if (node.int && node.int[1] === high) {
            this.deleteNode(node);
            return true;
        }
        else if (node.multi != null) {
            node.multi = node.multi.filter(it => it[0] !== high);
            if (node.multi.length === 1) {
                node.int = [node.key, node.multi[0][0]];
                node.value = node.multi[0][1];
                node.multi = undefined;
                node.maxHighOfMulti = node.int[1];
            }
            else {
                node.maxHighOfMulti = node.multi.reduce((max, curr) => Math.max(curr[0], max), Number.MIN_VALUE);
            }
        }
        else if (node.highValuesTree) {
            return node.highValuesTree.delete(high);
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
        const foundNodes = searchMultipleOverlaps(low, high, this.root);
        // const intervals = new Array<[number, number, V, IntervalTreeNode<V>]>(foundNodes.length);
        for (const node of foundNodes) {
            if (node.int) {
                yield [...node.int, node.value, node];
            }
            else if (node.multi) {
                for (const [h, data] of node.multi) {
                    if (doesIntervalOverlap([low, high], [node.key, h])) {
                        yield [node.key, h, data, node];
                    }
                }
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
function searchMultipleOverlaps(low, high, node) {
    const overlaps = [];
    if (node == null) {
        return overlaps;
    }
    if (doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
        overlaps.push(node);
    }
    if (node.left && low <= node.left.max) {
        const overlapsLeftChild = searchMultipleOverlaps(low, high, node.left);
        if (overlapsLeftChild.length > 0) {
            overlaps.push(...overlapsLeftChild);
            const overlapsRightChild = searchMultipleOverlaps(low, high, node.right);
            overlaps.push(...overlapsRightChild);
        }
        // Skip right child, as if zero left child overlaps, then
        // target interval's high value must be even smaller than all left children's low values,
        // meaning entire left child tree is greater than target interval, so right child tree does the same
    }
    else {
        const overlapsRightChild = searchMultipleOverlaps(low, high, node.right);
        overlaps.push(...overlapsRightChild);
    }
    return overlaps;
}
//# sourceMappingURL=interval-tree.js.map