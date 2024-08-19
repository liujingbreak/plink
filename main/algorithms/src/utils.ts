import chalk from 'chalk';
import {RedBlackTree, RbTreeNode} from './rb-tree';
import {IntervalTree, IntervalTreeNode} from './interval-tree';

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

export function stringifyIntervalTree<V>(tree: IntervalTree<V>, noColor = false) {
  const lines = [] as string[];
  tree.inorderWalk(node => {
    let p: typeof tree.nil | IntervalTreeNode<V> = node;
    let leadingSpaceChars = '';
    while (!tree.isNil(p)) {
      leadingSpaceChars = ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p) ? '|  ' : '   ') + leadingSpaceChars;
      p = p.p;
    }
    const str = `${leadingSpaceChars}+- ${node.p ? node.p?.left === node ? 'L' : 'R' : 'root'} ${node.key + '~' + (node.int?.[1] ?? node.maxHighOfMulti)} - max:${node.max} ` +
      `size: ${node.size} ${node.highValuesTree ? 'multi(' + listALlKeyOf(node.highValuesTree).join(',') + ')' : ''}`;
    lines.push(node.isRed ? (noColor ? '[ Red ]' + str : chalk.red(str)) : (noColor ? '[Black]' + str : str));
  });
  return lines.join('\n');
}

function listALlKeyOf<K, V>(tree: RedBlackTree<K, V>) {
  const keys = [] as K[];
  tree.inorderWalk(node => keys.push(node.key));
  return keys;
}
