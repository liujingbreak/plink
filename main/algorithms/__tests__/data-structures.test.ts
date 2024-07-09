/* eslint-disable no-debugger */
/* eslint-disable no-console */
import {describe, it, expect}  from '@jest/globals';
import _ from 'lodash';
import {RedBlackTree} from '../src/rb-tree';
import {printRbTree, printRbTree as printTree} from '../src/utils';
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);

describe('RB tree', () => {
  it('smoke', () => {
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

  it('keysSmallererThan should work', () => {
    const tree = new RedBlackTree<number>();
    '7845390126'.split('').map(it => tree.insert(Number(it)));
    printTree(tree);

    debugger;
    // eslint-disable-next-line no-console
    console.log('Keys smaller than 5.5 are', [...tree.keysSmallererThan(5.5)].map(it => it.key));
    expect([...tree.keysSmallererThan(5.5)].length).toEqual(6);
    expect([...tree.keysGreaterThan(5.5)].length).toEqual(4);
  });

  it('size calculation', () => {
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

  it('delete', () => {
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

