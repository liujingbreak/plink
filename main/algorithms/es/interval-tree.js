import { RedBlackTree } from './rb-tree';
/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *  Be aware that "high endpoint" is considered as an included value
 */
export class IntervalTree extends RedBlackTree {
    /** Return tree node which could be either NonDuplicateNode or a node of DuplicateNode['highValuesTree'],
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
            const highValuesTree = node.highValuesTree = new RedBlackTree();
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
        if (low > high) {
            const temp = high = low;
            low = temp;
        }
        const node = this.search(low);
        if (node == null || node === this.nil)
            return false;
        if (node.int && node.int[1] === high) {
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
        return node;
    }
    /** @param high is considered as an included endpoint value */
    *searchMultipleOverlaps(low, high) {
        const foundNodes = [];
        if (this.root === this.nil)
            return null;
        this._searchMultipleOverlaps(foundNodes, low, high, this.root);
        for (const node of foundNodes) {
            if (node.int) {
                yield [...node.int, node.value, node];
            }
            else if (isDuplicateNode(node)) {
                for (const highTreeNode of node.highValuesTree.keysSmallererThan(high)) {
                    yield [node.key, highTreeNode.key, highTreeNode.value, node];
                }
            }
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
    _searchMultipleOverlaps(overlaps, low, high, node) {
        if (node == null || node === this.nil) {
            return 0;
        }
        let numOverlaps = 0;
        if (doesIntervalOverlap([node.key, node.maxHighOfMulti], [low, high])) {
            overlaps.push(node);
            numOverlaps = 1;
        }
        if (node.left !== this.nil && low <= node.left.max) {
            const numOverlapsLeft = this._searchMultipleOverlaps(overlaps, low, high, node.left);
            if (numOverlapsLeft > 0) {
                numOverlaps += numOverlapsLeft;
                numOverlaps += this._searchMultipleOverlaps(overlaps, low, high, node.right);
            }
            // Skip right child, as if zero left child overlaps, then
            // target interval's high value must be even smaller than all left children's low values,
            // meaning entire left child tree is greater than target interval, so right child tree does the same
        }
        else {
            numOverlaps += this._searchMultipleOverlaps(overlaps, low, high, node.right);
        }
        return numOverlaps;
    }
}
/** A multi-value tree node can contain multiple intervals, in this case the tree node is assignable to type "DuplicateNode" */
export function isDuplicateNode(node) {
    return !!node.highValuesTree;
}
function doesIntervalOverlap(intA, intB) {
    // Not in case of: intA is left to intB or intA is right to intB entirely
    return !(intA[1] < intB[0] || intB[1] < intA[0]);
}
//# sourceMappingURL=interval-tree.js.map