"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RectangleOverlapTree = void 0;
const algorithms_1 = require("@wfh/algorithms");
class RectangleOverlapTree {
    constructor() {
        this.xIntervalTree = new algorithms_1.IntervalTree();
    }
    toString() {
        return '\nxTree:\n' + (0, algorithms_1.stringifyIntervalTree)(this.xIntervalTree, true);
    }
    addContent([x, y, w, h], content) {
        const node = this.xIntervalTree.insertInterval(x, x + w - 1);
        if (node.value == null)
            node.value = new algorithms_1.IntervalTree();
        const yNode = node.value.insertInterval(y, y + h - 1);
        if (yNode.value == null)
            yNode.value = [content];
        else
            yNode.value.push(content);
    }
    _searchOverlaps([x, y, w, h]) {
        const foundX = this.xIntervalTree.searchMultipleOverlaps(x, x + w - 1);
        const yEnd = y + h - 1;
        const res = [];
        for (const [xLow, xHigh, yTree] of foundX) {
            for (const [yLow, yHigh, values] of yTree.searchMultipleOverlaps(y, yEnd)) {
                res.push([xLow, xHigh, yLow, yHigh, values]);
            }
        }
        return res;
    }
    searchOverlaps(r) {
        return this._searchOverlaps(r).map(([, , , , values]) => values)
            .reduce((s, v) => {
            s.push(...v);
            return s;
        }, []);
    }
    /** search for any rectangle from the tree that is being fully
     * covered by paramerter rectangle */
    searchForCovered(r) {
        const targetXHigh = r[1] + r[0] - 1;
        const targetYHigh = r[2] + r[3] - 1;
        return this._searchOverlaps(r).filter(([xl, xh, yl, yh]) => r[0] <= xl && targetXHigh >= xh && r[2] <= yl && targetYHigh >= yh)
            .map(([, , , , values]) => values)
            .reduce((list, it) => {
            list.push(...it);
            return list;
        }, []);
    }
    updateContent([x, y, w, h], content) {
        const xNode = this.xIntervalTree.searchIntervalNode(x, x + w - 1);
        if (xNode == null) {
            throw new Error(`Can not find rectangle at position [${x}, ${y}]`);
        }
        const yNode = xNode.value.searchIntervalNode(y, y + h - 1);
        if (yNode == null) {
            throw new Error(`Can not find rectangle at position [${x}, ${y}]`);
        }
        if (yNode.value) {
            const idx = yNode.value.findIndex(v => content === v);
            if (idx < 0) {
                throw new Error(`Can not find rectangle at position [${x}, ${y}]`);
            }
            yNode.value[idx] = content;
        }
    }
    clear() {
        this.xIntervalTree = new algorithms_1.IntervalTree();
    }
}
exports.RectangleOverlapTree = RectangleOverlapTree;
//# sourceMappingURL=rectangle-overlap-tree.js.map