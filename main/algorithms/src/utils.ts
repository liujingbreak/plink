import chalk from 'chalk';
import {RedBlackTree, RbTreeNode} from './rb-tree';

export function printRbTree<ND extends RedBlackTree<any>>(tree: ND) {
  // eslint-disable-next-line no-console
  console.log(':\n' + stringifyRbTree(tree));
}

export function stringifyRbTree<T, V, ND extends RbTreeNode<T, V>>(tree: RedBlackTree<T, V, ND>, onEachNode?: (node: ND) => string | number) {
  const lines = [] as string[];
  tree.inorderWalk(node => {
    let p: ND | RbTreeNode<T, V> = node;
    let leadingSpaceChars = '';
    while (!tree.isNil(p)) {
      leadingSpaceChars = ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p) ? '|  ' : '   ') + leadingSpaceChars;
      p = p.p;
    }
    const str = `${leadingSpaceChars}+- ${node.p ? node.p?.left === node ? 'L' : 'R' : 'root'} ${node.key + ' ' + (onEachNode ? onEachNode(node) : '')} - ` +
      `size: ${node.size}`;
    lines.push(node.isRed ? chalk.red(str) : str);
  });
  return lines.join('\n');
}
