"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printRbTree = void 0;
const chalk_1 = __importDefault(require("chalk"));
function printRbTree(tree) {
    const lines = [];
    tree.inorderWalk(node => {
        var _a, _b;
        let p = node;
        let leadingSpaceChars = '';
        while (p) {
            leadingSpaceChars = (((_a = p.p) === null || _a === void 0 ? void 0 : _a.p) && ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p)) ? '|  ' : '   ') + leadingSpaceChars;
            p = p.p;
        }
        const str = `${leadingSpaceChars}+- ${node.p ? ((_b = node.p) === null || _b === void 0 ? void 0 : _b.left) === node ? 'L' : 'R' : 'root'} ${node.key + ''} - ` +
            `size: ${node.size}`;
        lines.push(node.isRed ? chalk_1.default.red(str) : str);
    });
    // eslint-disable-next-line no-console
    console.log(':\n' + lines.join('\n'));
}
exports.printRbTree = printRbTree;
//# sourceMappingURL=utils.js.map