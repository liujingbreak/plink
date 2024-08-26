import chalk from 'chalk';
export function printRbTree(tree) {
    // eslint-disable-next-line no-console
    console.log(':\n' + stringifyRbTree(tree));
}
export function stringifyRbTree(tree, onEachNode) {
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
        lines.push(node.isRed ? chalk.red(str) : str);
    });
    return lines.join('\n');
}
export function stringifyIntervalTree(tree, noColor = false) {
    const lines = [];
    tree.inorderWalk(node => {
        var _a, _b, _c;
        let p = node;
        let leadingSpaceChars = '';
        while (!tree.isNil(p)) {
            leadingSpaceChars = ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p) ? '|  ' : '   ') + leadingSpaceChars;
            p = p.p;
        }
        const str = `${leadingSpaceChars}+- ${node.p ? ((_a = node.p) === null || _a === void 0 ? void 0 : _a.left) === node ? 'L' : 'R' : 'root'} ${node.key + '~' + ((_c = (_b = node.int) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : node.maxHighOfMulti)} - max:${node.max} ` +
            `size: ${node.size} ${node.highValuesTree ? 'multi(' + listALlKeyOf(node.highValuesTree).join(',') + ')' : ''}`;
        lines.push(node.isRed ? (noColor ? '[ Red ]' + str : chalk.red(str)) : (noColor ? '[Black]' + str : str));
    });
    return lines.join('\n');
}
function listALlKeyOf(tree) {
    const keys = [];
    tree.inorderWalk(node => keys.push(node.key));
    return keys;
}
//# sourceMappingURL=utils.js.map