import chalk from 'chalk';
import {describe, it, expect}  from '@jest/globals';
import {IntervalTree, IntervalTreeNode} from '@wfh/plink/wfh/ts/share/algorithms/interval-tree';

describe('Interval tree', () => {
  it('Find overlaps', () => {
    const tree = createTree();
    expect(tree.minimum()?.key).toBe(0);
    expect(tree.root?.max).toBe(30);
    const found = tree.searchSingleOverlap(5, 15);
    expect(found).not.toBeNull();
    // eslint-disable-next-line no-console
    console.log('Found single overlap', found?.int);
    const founds = tree.searchMultipleOverlaps(5, 15);
    // eslint-disable-next-line no-console
    console.log([...founds]);
  });

  it('Find overlaps from duplicates', () => {
    const tree = createTree();
    tree.insertInterval(6, 13, null);
    tree.insertInterval(6, 14, null);
    expect(tree.minimum()?.key).toBe(0);
    expect(tree.root?.max).toBe(30);
    const found = tree.searchSingleOverlap(5, 15);
    printTree(tree);
    expect(found).not.toBeNull();
    const founds = [...tree.searchMultipleOverlaps(5, 15)];
    // eslint-disable-next-line no-console
    console.log(founds.map(([low, high, , node]) => `found [${low} - ${high}] #${tree.indexOf(node.key)}`));
    expect(founds.length).toBe(6);
  });

  it('Find overlaps from more duplicates', () => {
    const tree = createTree();
    tree.insertInterval(6, 18, null);
    tree.insertInterval(6, 12, null);
    tree.insertInterval(6, 17, null);
    tree.insertInterval(6, 14, null);
    tree.insertInterval(6, 28, null);
    printTree(tree);
    const founds = [...tree.searchMultipleOverlaps(7, 15)];
    // eslint-disable-next-line no-console
    console.log('Intervals which overlap [7 - 15] are', founds.map(([low, high, , node]) => `found [${low} - ${high}] #${tree.indexOf(node.key)}`));
  });

  it('Delete a simple single interval node', () => {
    const tree = createTree();
    const ints = [...tree.searchMultipleOverlaps(8, 9)];
    const res = tree.deleteInterval(8, 9);
    expect(res).toBeTruthy();
    // eslint-disable-next-line no-console
    console.log(ints.map(([l, h]) => `${l} - ${h}`));
    expect([...tree.searchMultipleOverlaps(8, 9)].length + 1).toEqual(ints.length);

    expect(tree.root?.max).toEqual(30);
    tree.deleteInterval(25, 30);
    expect(tree.root?.max).toEqual(26);
    printTree(tree);
  });

  it('Delete intervals from duplicate interval', () => {
    const tree = createTree();
    tree.insertInterval(25, 29, null);
    const node = tree.insertInterval(25, 31, null);

    expect(node.multi != null).toBeTruthy();
    expect(node.int == null).toBeTruthy();
    expect(tree.root?.max).toEqual(31);

    let maxHighOfMulti = node.maxHighOfMulti;
    expect(tree.deleteInterval(25, 31)).toBe(true);
    expect(node.multi?.length).toBe(2);
    expect(maxHighOfMulti !== node.maxHighOfMulti).toBeTruthy();
    printTree(tree);
    expect(tree.root?.max).toEqual(30);

    maxHighOfMulti = node.maxHighOfMulti;
    expect(tree.deleteInterval(25, 35)).toBeFalsy();

    tree.deleteInterval(25, 30);
    expect(node.multi == null).toBeTruthy();
    expect(node.int != null).toBeTruthy();
    expect(maxHighOfMulti !== node.maxHighOfMulti).toBeTruthy();
    printTree(tree);
  });

  it('Delete intervals from more duplicate interval node', () => {
    const tree = createTree();
    tree.insertInterval(25, 38, null);
    tree.insertInterval(25, 32, null);
    tree.insertInterval(25, 37, null);
    tree.insertInterval(25, 34, null);
    tree.insertInterval(25, 38, null);
    printTree(tree);

    expect(tree.root?.max).toBe(38);
    const node = tree.search(25);
    expect(node?.int == null).toBeTruthy();
    expect(tree.deleteInterval(25, 32)).toBeTruthy();
    expect(tree.deleteInterval(25, 38)).toBeTruthy();
    expect(tree.root?.max).toBe(37);
    expect(tree.deleteInterval(25, 37)).toBeTruthy();
    expect(tree.root?.max).toBe(34);
    expect(tree.deleteInterval(25, 34)).toBeTruthy();
    printTree(tree);
    expect(tree.root?.max).toBe(30);
    expect(node?.int != null).toBeTruthy();
  });
});

function createTree() {
  const intervals = '15,23  16,21  19,20  17,19  26,26  8,9  6,10  5,8  0,3  25,30'
    .split(/\s+/).map(pair => pair.split(',').map(str => Number(str)) as [number, number]);

  const intTree = new IntervalTree();
  for (const [low, high] of intervals) {
    intTree.insertInterval(low, high, null);
  }
  expect(intTree.size()).toEqual(intervals.length);
  return intTree;
}

function printTree(tree: IntervalTree) {
  const lines = [] as string[];
  tree.inorderWalk((node, level) => {
    let p = node as IntervalTreeNode<any> | null;
    let leadingSpaceChars = '';
    while (p) {
      leadingSpaceChars = (p.p?.p && ((p === p.p.left && p.p.p.right === p.p) || (p === p.p.right && p.p.p.left === p.p)) ? '|  ' : '   ') + leadingSpaceChars;
      p = p.p;
    }
    const str = `${leadingSpaceChars}+- ${node.p ? node.p?.left === node ? 'L' : 'R' : 'root'} ${node.key + ''} - ${node.maxHighOfMulti + ''}` +
      `(max ${node.max} ${node.multi ? '[multi]' : node.highValuesTree ? '[tree]' : ''}): size: ${node.size}`;
    lines.push(node.isRed ? chalk.red(str) : str);
  });
  // eslint-disable-next-line no-console
  console.log(':\n' + lines.join('\n'));
}
