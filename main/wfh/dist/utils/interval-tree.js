"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalTree = void 0;
const rb_tree_1 = require("./rb-tree");
class IntervalTree extends rb_tree_1.RedBlackTree {
    /** @Override
     */
    onLeftChildChange(child) {
    }
    /** @Override
     */
    onRightChildChange(child) {
    }
}
exports.IntervalTree = IntervalTree;
//# sourceMappingURL=interval-tree.js.map