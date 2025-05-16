import { RedBlackTree, RbTreeNode } from './rb-tree';
import { IntervalTree } from './interval-tree';
export declare function printRbTree<ND extends RedBlackTree<any>>(tree: ND): void;
export declare function stringifyRbTree<T, V, ND extends RbTreeNode<T, V>>(tree: RedBlackTree<T, V, ND>, onEachNode?: (node: ND) => string | number): string;
export declare function stringifyIntervalTree<V>(tree: IntervalTree<V>, noColor?: boolean): string;
