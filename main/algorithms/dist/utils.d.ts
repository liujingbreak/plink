import { RedBlackTree, RbTreeNode } from './rb-tree';
export declare function printRbTree<ND extends RedBlackTree<any>>(tree: ND): void;
export declare function stringifyRbTree<T, V, ND extends RbTreeNode<T, V>>(tree: RedBlackTree<T, V, ND>, onEachNode?: (node: ND) => string | number): string;
