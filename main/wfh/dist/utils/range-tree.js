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
        const node = tslib_1.__classPrivateFieldGet(this, _RangeSearcher_lowBoundryTree, "f").search(value);
        if (node) {
            node.value.push(value);
        }
        else {
            tslib_1.__classPrivateFieldGet(this, _RangeSearcher_lowBoundryTree, "f").insert(value, [value]);
        }
        const nodeH = tslib_1.__classPrivateFieldGet(this, _RangeSearcher_highBoundryTree, "f").search(value);
        if (nodeH) {
            nodeH.value.push(value);
        }
        else {
            tslib_1.__classPrivateFieldGet(this, _RangeSearcher_highBoundryTree, "f").insert(value, [value]);
        }
    }
    removeRange(value) {
    }
}
exports.RangeSearcher = RangeSearcher;
_RangeSearcher_lowBoundryTree = new WeakMap(), _RangeSearcher_highBoundryTree = new WeakMap();
//# sourceMappingURL=range-tree.js.map