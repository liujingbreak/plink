import { RbTreeNode, RedBlackTree } from './rb-tree';
export interface IntervalTreeNode<T, V> extends RbTreeNode<T, V, IntervalTreeNode<any, any>> {
    int: [number, number];
    max: number;
}
export declare class IntervalTree<T, V = unknown> extends RedBlackTree<T, V, IntervalTreeNode<T, V>> {
    /** @Override
     */
    protected onLeftChildChange(child: IntervalTreeNode<T, V> | null | undefined): void;
    /** @Override
     */
    protected onRightChildChange(child: IntervalTreeNode<T, V> | null | undefined): void;
}
