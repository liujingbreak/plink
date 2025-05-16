/* eslint-disable no-console */
import {describe, it, expect}  from '@jest/globals';
import {IntervalTree} from '../src/interval-tree';
import {stringifyIntervalTree} from '../src/utils';

describe('interval tree for bounding search', () => {
  it('corner case', () => {
    const tree = new IntervalTree();
    const data = [
      ['a', 0, 0],
      ['b', 0, 0],
      ['c', 1, 1],
      ['d', 1, 2],
      ['e', 1, 3]
    ] as [string, number, number][];
    for (const [id, l, h] of data) {
      const node = tree.insertInterval(l, h);
      node.value = id;
    }

    console.log(stringifyIntervalTree(tree));
    const overlapsIt = tree.searchMultipleOverlaps(0, 2);
    const overlaps = overlapsIt!.map(([, , data]) => data);
    console.log('found', overlaps);
    expect(overlaps.length).toBe(4);
  });
});
