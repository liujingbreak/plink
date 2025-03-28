/* eslint-disable no-console */
/**
import {describe, it, expect}  from '@jest/globals';
import {stringifyIntervalTree} from '@wfh/algorithms';
import {RectangleOverlapTree} from '../dist/core/rectangle-overlap-tree.js';
import {Rectangle} from '../dist/core/canvas.js';

function createMockTree() {
  const rects = [
    ['a', 0, 0, 10, 2],
    ['b', 5, 2, 5, 4],
    ['c', 1, 1, 10, 10],
    ['e', 5, 1, 3, 4]
  ] as [string, ...Rectangle][];
  const tree = new RectangleOverlapTree<string>();
  for (const [id, ...rect] of rects) {
    tree.addContent(rect, id);
  }
  console.log(tree.toString());
  const buf = [] as string[];
  tree.xIntervalTree.inorderWalk(node => {
    if (node.highValuesTree) {
      buf.push('x key', node.key + '\n');
      node.highValuesTree.inorderWalk(
        xNode => buf.push(stringifyIntervalTree(xNode.value))
      );
    } else {
      buf.push('x key', node.key + '\n');
      buf.push(stringifyIntervalTree(node.value));
    }
    buf.push('\n');
  });
  console.log('yIntervalTrees:\n', buf.join(''));
  return tree;
}

function testSearchOverlaps() {
  const tree = createMockTree();
  expect(tree.xIntervalTree.size()).toBe(4);
  const overlaps = [...tree.searchOverlaps([3, 3, 6, 6])];
  console.log('overlaps:', overlaps);
  expect(overlaps.length).toBe(3);
}
function testSearchCovered() {
  const tree = createMockTree();
  const res = tree.searchForCovered([1, 0, 10, 6]);
  console.log('covered:', res);
  expect(res.length).toBe(2);
}

describe('RectangleOverlapTree', () => {
  it.skip('searchOverlaps', () => {
    testSearchOverlaps();
  });
  it.skip('searchForCovered', () => {
    testSearchCovered();
  });
  it('addOrUnionRectOnOverlap', () => {
    const tree = new RectangleOverlapTree<string>();
    tree.addOrUnionRectOnOverlap([0, 0, 10, 2], 'A');
    tree.addContent([0, 4, 10, 2], 'B');
    tree.addOrUnionRectOnOverlap([1, 0, 5, 6], 'C');
    const all = [...tree.allRectangles()][0];
    console.log(all);
    expect(all[0]).toEqual([0, 0, 10, 6]);
    expect(all[1].sort()).toEqual(['A', 'B', 'C']);

    tree.addOrUnionRectOnOverlap([20, 0, 10, 2], 'D');
    tree.addOrUnionRectOnOverlap([25, 1, 3, 1], 'E');
    const all2 = [...tree.allRectangles()];
    console.log(all2);
    expect(all2[1][0]).toEqual([20, 0, 10, 2]);
    expect(all2[1][1].sort()).toEqual(['D', 'E']);

    tree.addOrUnionRectOnOverlap([5, 1, 20, 3], 'F');
    const all3 = [...tree.allRectangles()];
    console.log(all3);
    expect(all3[0][1].sort().join('')).toEqual('ABCDEF');
    expect(all3.length).toBe(1);
  });
});
*/
