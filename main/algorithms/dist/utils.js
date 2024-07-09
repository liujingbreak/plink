"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printRbTree = printRbTree;
exports.stringifyRbTree = stringifyRbTree;
const chalk_1 = __importDefault(require("chalk"));
function printRbTree(tree) {
    // eslint-disable-next-line no-console
    console.log(':\n' + stringifyRbTree(tree));
}
function stringifyRbTree(tree, onEachNode) {
    const lines = [];
    tree.inorderWalk(node => {
        var _a;
        let p = node;
        let leadingSpaceChars = '';
        while (!tree.isNil(p)) {
            leadingSpaceChars = ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p) ? '|  ' : '   ') + leadingSpaceChars;
            p = p.p;
        }
        const str = `${leadingSpaceChars}+- ${node.p ? ((_a = node.p) === null || _a === void 0 ? void 0 : _a.left) === node ? 'L' : 'R' : 'root'} ${node.key + ' ' + (onEachNode ? onEachNode(node) : '')} - ` +
            `size: ${node.size}`;
        lines.push(node.isRed ? chalk_1.default.red(str) : str);
    });
    return lines.join('\n');
}
//# sourceMappingURL=utils.js.map