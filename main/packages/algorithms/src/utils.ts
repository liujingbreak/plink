import chalk from 'chalk';
import {RedBlackTree} from './rb-tree';

export function printRbTree(tree: RedBlackTree<any>) {
  const lines = [] as string[];
  tree.inorderWalk(node => {
    let p = node as typeof node | null;
    let leadingSpaceChars = '';
    while (p) {
      leadingSpaceChars = (p.p?.p && ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p)) ? '|  ' : '   ') + leadingSpaceChars;
      p = p.p;
    }
    const str = `${leadingSpaceChars}+- ${node.p ? node.p?.left === node ? 'L' : 'R' : 'root'} ${node.key + ''} - ` +
      `size: ${node.size}`;
    lines.push(node.isRed ? chalk.red(str) : str);
  });
  // eslint-disable-next-line no-console
  console.log(':\n' + lines.join('\n'));
}

