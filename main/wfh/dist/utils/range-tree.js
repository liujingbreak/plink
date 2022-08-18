"use strict";
var _RangeSearcher_lowBoundryTree, _RangeSearcher_highBoundryTree;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RangeSearcher = void 0;
const tslib_1 = require("tslib");
const rb_tree_1 = require("./rb-tree");
class IntervalByLowBoundary extends rb_tree_1.RedBlackTree {
    constructor() {
        super((range1, range2) => range1.low - range2.low);
    }
}
class IntervalByHighBoundary extends rb_tree_1.RedBlackTree {
    constructor() {
        super((range1, range2) => range1.high - range2.high);
    }
}
class RangeSearcher {
    constructor() {
        _RangeSearcher_lowBoundryTree.set(this, new IntervalByLowBoundary());
        _RangeSearcher_highBoundryTree.set(this, new IntervalByHighBoundary());
    }
    addRange(value) {
        const node = tslib_1.__classPrivateFieldGet(this, _RangeSearcher_lowBoundryTree, "f").insert(value);
        if (node.value) {
            node.value.push(value);
        }
        else {
            node.value = [value];
        }
        const nodeH = tslib_1.__classPrivateFieldGet(this, _RangeSearcher_highBoundryTree, "f").insert(value);
        if (nodeH.value) {
            nodeH.value.push(value);
        }
        else {
            nodeH.value = [value];
        }
    }
    removeRange(value) {
        tslib_1.__classPrivateFieldGet(this, _RangeSearcher_lowBoundryTree, "f").delete(value);
        tslib_1.__classPrivateFieldGet(this, _RangeSearcher_highBoundryTree, "f").delete(value);
    }
}
exports.RangeSearcher = RangeSearcher;
_RangeSearcher_lowBoundryTree = new WeakMap(), _RangeSearcher_highBoundryTree = new WeakMap();
//# sourceMappingURL=range-tree.js.map