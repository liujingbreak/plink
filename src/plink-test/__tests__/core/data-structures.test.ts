import {describe, it, expect}  from '@jest/globals';
import {RedBlackTree, RbTreeNode} from '@wfh/plink/wfh/ts/utils/rb-tree';
import {DFS, Vertex} from '@wfh/plink/wfh/ts/utils/graph';
import _ from 'lodash';

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
    let dfs = new DFS<RbTreeNode<number>>(adjacencyOf);

    dfs.visit([tree.root!]);
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
    // [5, 8 , 1, 6].forEach(key => {
    //   console.log('delete', key);
    //   tree.delete(key);
    //   dfs = new DFS<RbTreeNode<number>>(adjacencyOf);
    //   console.log(`----- after deletion ${key} ------`);
    //   dfs.visit([tree.root!]);
    // });
    const keys = _.range(0, len);
    for (let i = 0, l = len / 2; i < l; i++) {
      const randomKeyIdx = Math.floor(Math.random() * keys.length);
      const key = keys[randomKeyIdx];
      keys.splice(randomKeyIdx, 1);
      // eslint-disable-next-line no-console
      console.log('delete key', key);
      tree.delete(key);
    }


    dfs = new DFS<RbTreeNode<number>>(adjacencyOf);
    dfs.visit([tree.root!]);
    // eslint-disable-next-line no-console
    console.log('After deletion\n', lines.join('\n'));
    expect(tree.root?.size).toEqual(Math.floor(len / 2));

    function adjacencyOf(node: RbTreeNode<number>, vertex: Vertex<RbTreeNode<number>>, level: number) {
      lines.push(`${_.repeat('| ', level)}- ${node.p ? node.p?.left === node ? 'left' : 'right' : 'root'} ${node.key + ''}: ${node.isRed ? 'red' : 'black'} size: ${node.size}`);
      return [node.left, node.right].filter((node) : node is RbTreeNode<number> => node != null);
    }
  });
});

