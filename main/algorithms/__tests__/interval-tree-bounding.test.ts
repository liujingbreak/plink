/* eslint-disable no-console */
import {describe, it, expect}  from '@jest/globals';
import {IntervalTree} from '../src/interval-tree';
import {stringifyIntervalTree} from '../src/utils';

describe('interval tree for bounding search', () => {
  it('corner case', () => {
    const tree = new IntervalTree();
    const data = [
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 2]
    ];
    for (const [l, h] of data) {
      tree.insertInterval(l, h);
    }

    console.log(stringifyIntervalTree(tree));
    const overlaps = [...tree.searchMultipleOverlaps(0, 2)];
    console.log('found', overlaps);
    expect(overlaps.length).toBe(2);
  });
});
