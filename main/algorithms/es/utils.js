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
//# sourceMappingURL=utils.js.map