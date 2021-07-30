import {RedBlackTree, RedBlackTreeNode} from './data-structures';
import {BFS} from './graph';

export function printTestTree() {
  const tree = new RedBlackTree<number>();
  for (let i = 0; i < 12; i++) {
    console.log('i', i);
    tree.insert(i);
  }

  const bfs = new BFS<RedBlackTreeNode<number>>((node, vertex) => {
    // eslint-disable-next-line no-console
    console.log(`(${vertex.d}) ${node.key}`);
    return [node.left, node.right]
      .filter(node => node != null) as RedBlackTreeNode<number>[];
  });

  bfs.visit([tree.root!]);
}
