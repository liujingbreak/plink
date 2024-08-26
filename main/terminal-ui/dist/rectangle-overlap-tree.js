"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RectangleOverlapTree = void 0;
const algorithms_1 = require("@wfh/algorithms");
const EMPTY_ARR = [];
class RectangleOverlapTree {
    constructor() {
        this.xIntervalTree = new algorithms_1.IntervalTree();
        this.yIntervalTree = new algorithms_1.IntervalTree();
    }
    toString() {
        return '\nxTree:\n' + (0, algorithms_1.stringifyIntervalTree)(this.xIntervalTree, true) +
            '\nyTree:\n' + (0, algorithms_1.stringifyIntervalTree)(this.yIntervalTree, true);
    }
    addContent([x, y, w, h], content) {
        const node = this.xIntervalTree.insertInterval(x, x + w - 1);
        if (node.value == null)
            node.value = [content];
        else
            node.value.push(content);
        const nodeY = this.yIntervalTree.insertInterval(y, y + h - 1);
        if (nodeY.value == null)
            nodeY.value = [content];
        else
            nodeY.value.push(content);
    }
    searchOverlaps([x, y, w, h]) {
        const foundX = this.xIntervalTree.searchMultipleOverlaps(x, x + w - 1);
        const foundItemsOfX = new Set((function* () {
            for (const [, , data] of foundX) {
                if (Array.isArray(data)) {
                    for (const it of data)
                        yield it;
                }
                else {
                    yield data;
                }
            }
        })());
        const foundY = this.yIntervalTree.searchMultipleOverlaps(y, y + h - 1);
        const itemsY = [...foundY];
        return itemsY.flatMap(([, , data]) => {
            if (Array.isArray(data)) {
                return data.filter(it => foundItemsOfX.has(it));
            }
            else {
                return EMPTY_ARR;
            }
        });
    }
    /** search for any rectangle from the tree that is being fully
     * covered by paramerter rectangle */
    searchForCovered([x, y, w, h]) {
        const right = x + w - 1;
        const foundX = this.xIntervalTree.searchMultipleOverlaps(x, right);
        const foundItemsOfX = new Set((function* () {
            for (const [low, high, data] of foundX) {
                if (low < x || high > right)
                    continue; // not fully covered
                if (Array.isArray(data)) {
                    for (const it of data)
                        yield it;
                }
                else {
                    yield data;
                }
            }
        })());
        const bottom = y + h - 1;
        const foundY = this.yIntervalTree.searchMultipleOverlaps(y, bottom);
        return [...foundY].flatMap(([low, high, data]) => {
            if (low < y || high > bottom)
                return EMPTY_ARR; // not fully covered
            if (Array.isArray(data)) {
                return data.filter(it => {
                    return foundItemsOfX.has(it);
                });
            }
            else if (foundItemsOfX.has(data)) {
                return [data];
            }
            else {
                return EMPTY_ARR;
            }
        });
    }
    updateContent([x, y, w, h], content) {
        updateContentToTree(this.xIntervalTree, x, x + w - 1, content);
        updateContentToTree(this.yIntervalTree, y, y + h - 1, content);
    }
    clear() {
        this.xIntervalTree = new algorithms_1.IntervalTree();
        this.yIntervalTree = new algorithms_1.IntervalTree();
    }
}
exports.RectangleOverlapTree = RectangleOverlapTree;
function updateContentToTree(tree, low, high, content) {
    const node = tree.searchIntervalNode(low, high);
    if (node == null)
        throw new Error(`Can not find component at range at ${low}, width: ${high - low + 1}`);
    if (node.value === content) {
        // delete entire node
        tree.deleteInterval(low, high);
    }
    else if (Array.isArray(node.value)) {
        const idx = node.value.findIndex(data => data === content);
        if (idx)
            node.value.splice(idx, 1);
    }
    const newNode = tree.insertInterval(low, high);
    if (newNode.value) {
        if (Array.isArray(newNode.value))
            newNode.value.push(content);
        else
            newNode.value = [newNode.value, content];
    }
    else {
        newNode.value = content;
    }
}
//# sourceMappingURL=rectangle-overlap-tree.js.map