import * as _ from 'lodash';
import {RedBlackTree, RbTreeNode} from './data-structures';
import {DFS, Vertex} from './graph';

export function test() {
  const tree = new RedBlackTree<number>();
  const len = 30;
  for (let i = 0; i < len; i++) {
    // eslint-disable-next-line no-console
    console.log('add key', i);
    tree.insert(i);
  }

  let dfs = new DFS<RbTreeNode<number>>(adjacencyOf);

  dfs.visit([tree.root!]);

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

  function adjacencyOf(node: RbTreeNode<number>, vertex: Vertex<RbTreeNode<number>>, level: number) {
    // eslint-disable-next-line no-console
    console.log(`${_.repeat('| ', level)}- ${node.p ? node.p?.left === node ? 'left' : 'right' : 'root'} ${node.key + ''}: ${node.isRed ? 'red' : 'black'}`);
    return [node.left, node.right].filter((node) : node is RbTreeNode<number> => node != null);
  }
}
