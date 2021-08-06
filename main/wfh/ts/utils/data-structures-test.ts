import {RedBlackTree, RedBlackTreeNode, Nil} from './data-structures';
import {BFS, Vertex} from './graph';
import * as _ from 'lodash';

export function printTestTree() {
  const tree = new RedBlackTree<number>();
  const len = 24;
  for (let i = 0; i < len; i++) {
    // eslint-disable-next-line no-console
    console.log('add key', i);
    tree.insert(i);
  }

  let bfs = new BFS<RedBlackTreeNode<number> | Nil>(adjacencyOf);

  bfs.visit([tree.root as RedBlackTreeNode<number>]);

  // const keys = _.range(0, len);
  // for (let i = 0; i < 6; i++) {
  //   let randomKeyIdx = Math.floor(Math.random() * keys.length);
  //   const key = keys[randomKeyIdx];
  //   keys.splice(randomKeyIdx, 1);
  //   // eslint-disable-next-line no-console
  //   console.log('delete key', key);
  //   tree.delete(key);
  // }

  // bfs = new BFS<RedBlackTreeNode<number>>(adjacencyOf);
  // bfs.visit([tree.root!]);

  function adjacencyOf(node: RedBlackTreeNode<number> | Nil, vertex: Vertex<RedBlackTreeNode<number> | Nil>) {
    if (!RedBlackTree.isNotNil(node)) {
      return [];
    }
    // eslint-disable-next-line no-console
    console.log(`(${vertex.d}) ${node.key}: ${node.isRed ? 'red' : 'black'}`);
    return [node.left, node.right]
      .filter(node => node != null) as RedBlackTreeNode<number>[];
  }
}
