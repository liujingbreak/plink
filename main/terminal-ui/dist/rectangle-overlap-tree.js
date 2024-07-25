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
    addContent([x, y, w, h], content) {
        const node = this.xIntervalTree.insertInterval(x, x + w - 1);
        if (node.value == null)
            node.value = content;
        else if (Array.isArray(node.value))
            node.value.push(content);
        else
            node.value = [node.value, content];
        const nodeY = this.yIntervalTree.insertInterval(y, y + h - 1);
        if (nodeY.value == null)
            nodeY.value = content;
        else if (Array.isArray(nodeY.value))
            nodeY.value.push(content);
        else
            nodeY.value = [nodeY.value, content];
    }
    searchOverlaps([x, y, w, h]) {
        const foundX = this.xIntervalTree.searchMultipleOverlaps(x, x + w);
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
        const foundY = this.yIntervalTree.searchMultipleOverlaps(y, y + h);
        return [...foundY].flatMap(([, , data]) => {
            if (Array.isArray(data)) {
                return data.filter(it => foundItemsOfX.has(it));
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