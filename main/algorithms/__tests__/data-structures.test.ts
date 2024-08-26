/* eslint-disable no-debugger */
/* eslint-disable no-console */
import {describe, it, expect}  from '@jest/globals';
import _ from 'lodash';
import {RedBlackTree} from '../src/rb-tree';
import {printRbTree, printRbTree as printTree} from '../src/utils';
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);

describe('RB tree', () => {
  it.skip('smoke', () => {
    const tree = new RedBlackTree<number>();
    const len = 30;
    for (let i = 0; i < len; i++) {
    // eslint-disable-next-line no-console
      console.log('add key', i);
      tree.insert(i);
    }

    const lines = [] as string[];

    // eslint-disable-next-line no-console
    console.log('After insertion:\n', lines.join('\n'));
    expect(tree.root?.size).toEqual(len);
    lines.splice(0);

    expect(tree.minimum()?.key).toEqual(0);
    expect(tree.atIndex(1)?.key).toEqual(1);
    expect(tree.atIndex(18)?.key).toEqual(18);
    expect(tree.indexOf(2)).toEqual(2);
    expect(tree.indexOf(18)).toEqual(18);

    // eslint-disable-next-line no-console
    console.log('------------------ deletion');
    printTree(tree);
    const keys = _.range(0, len);
    for (let i = 0, l = len / 2; i < l; i++) {
      const randomKeyIdx = Math.floor(Math.random() * keys.length);
      const key = keys[randomKeyIdx];
      keys.splice(randomKeyIdx, 1);
      // eslint-disable-next-line no-console
      console.log('delete key', key);
      tree.delete(key);
    }

    // eslint-disable-next-line no-console
    expect(tree.root?.size).toEqual(Math.floor(len / 2));
  });

  it('keysSmallerThan should work', () => {
    const tree = new RedBlackTree<number>();
    '7845390126'.split('').map(it => tree.insert(Number(it)));
    printTree(tree);

    // eslint-disable-next-line no-console
    const smallerList = [...tree.keysSmallerThan(5.5)].map(it => it.key);
    console.log('Keys smaller than 5.5 are', smallerList);
    console.log('Keys smaller than 8.1 are', [...tree.keysSmallerThan(8.1)].map(it => it.key));
    console.log('Keys smaller than -1 are', [...tree.keysSmallerThan(-1)].map(it => it.key));
    expect(smallerList).toEqual([5, 4, 3, 2, 1, 0]);
    expect([...tree.keysSmallerThan(6)].map(it => it.key)).toEqual([5, 4, 3, 2, 1, 0]);
    expect([...tree.keysSmallerThan(4)].map(it => it.key)).toEqual([3, 2, 1, 0]);
    expect([...tree.keysSmallerThan(4, true)].map(it => it.key)).toEqual([4, 3, 2, 1, 0]);
    expect([...tree.keysSmallerThan(3)].map(it => it.key)).toEqual([2, 1, 0]);
    expect([...tree.keysSmallerThan(2)].map(it => it.key)).toEqual([1, 0]);
    expect([...tree.keysSmallerThan(1)].map(it => it.key)).toEqual([0]);
    expect([...tree.keysSmallerThan(-1)].map(it => it.key)).toEqual([]);
    expect([...tree.keysSmallerThan(5, true)].map(it => it.key)).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it('keysGreaterThan should work', () => {
    const tree = new RedBlackTree<number>();
    '7845390126'.split('').map(it => tree.insert(Number(it)));
    printTree(tree);
    expect([...tree.keysGreaterThan(5.5)].map(it => it.key)).toEqual([6, 7, 8, 9]);
    expect([...tree.keysGreaterThan(6)].map(it => it.key)).toEqual('789'.split('').map(n => Number(n)));
    expect([...tree.keysGreaterThan(4)].map(it => it.key)).toEqual('56789'.split('').map(n => Number(n)));
    expect([...tree.keysGreaterThan(4, true)].map(it => it.key)).toEqual('456789'.split('').map(n => Number(n)));
    expect([...tree.keysGreaterThan(9)].map(it => it.key)).toEqual([]);
    expect([...tree.keysGreaterThan(8)].map(it => it.key)).toEqual([9]);
    expect([...tree.keysGreaterThan(10)].map(it => it.key)).toEqual([]);
    expect([...tree.keysGreaterThan(0, true)].map(it => it.key)).toEqual('0123456789'.split('').map(n => Number(n)));
  });

  it.skip('size calculation', () => {
    const tree = new RedBlackTree<number>();
    const numberSet = new Set([...(function*() {for (let i = 0; i < 20; i++) yield i;})()]);
    while (numberSet.size > 0) {
      const idx = Math.floor(Math.random() * numberSet.size);
      let i = 0;
      for (const n of numberSet.values()) {
        if (i === idx) {
          numberSet.delete(n);
          tree.insert(n);
          break;
        }
        i++;
      }
    }
    expect(tree.size()).toEqual(20);

    const node = tree.search(10);
    node!.weight = 3; // default is 1
    expect(tree.size()).toBe(22); // expect total size increased by 2
    printTree(tree);
  });

  it.skip('delete', () => {
    const operations = `delete 196
      insert 121
      delete 121
      insert 143
      insert 121
      delete 143
      insert 143
      insert 160
      insert 145
      delete 160
      insert 160
      insert 177
      insert 162
      delete 177
      insert 177
      insert 194
      insert 179
      delete 194
      insert 194
      insert 196
      debugger 0
      delete 121
      insert 121`;
      // delete 121
      // insert 121
      // delete 121
      // insert 121
      // delete 121
      // insert 121`;
    const operationArr = operations.split(/\n/).map(op => op.trim().split(/\s+/));
    const tree = new RedBlackTree<number>();
    for (const [optName, optValue] of operationArr) {
      const value = Number(optValue);
      console.log(optName, optValue);
      if (optName === 'insert')
        tree.insert(value);
      else if (optName === 'debugger')
        debugger;
      else
        tree.delete(value);
      printRbTree(tree);
    }
    // printRbTree(tree);
    console.log('----------------');
    // for (const value of [160, 143, 121, 145, 177]) {
    //   console.log('delete ', value);
    //   tree.delete(value);
    //   printRbTree(tree);
    // }
  });
});

