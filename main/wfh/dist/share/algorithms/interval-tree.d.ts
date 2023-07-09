import { RbTreeNode, RedBlackTree } from './rb-tree';
/**
 * A Red black tree node to contains multiple intervals which has same "low" value,
 * "key" is interval's low value
 */
export interface IntervalTreeNode<V = unknown> extends RbTreeNode<number, V, IntervalTreeNode<V>> {
    /** For no duplicate single interval*/
    int?: [low: number, high: number];
    /** For multiple intervals, a tree to store different "high" value */
    highValuesTree?: RedBlackTree<number, V>;
    /** Maximum "high" value of multi intervals that this node contains */
    maxHighOfMulti?: number;
    /** Maximum "high" of children */
    max: number;
}
/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *
 *
 */
export declare class IntervalTree<V = unknown> extends RedBlackTree<number, V, IntervalTreeNode<V>> {
    /** Return tree node, if property value is undefined */
    insertInterval(low: number, high: number): Omit<IntervalTreeNode<V>, 'value'> & {
        value?: V;
    } | Omit<RbTreeNode<number, V>, 'value'> & {
        value?: V;
    };
    deleteInterval(low: number, high: number): boolean;
    searchSingleOverlap(low: number, high: number): IntervalTreeNode<V> | null | undefined;
    searchMultipleOverlaps(low: number, high: number): Generator<[low: number, high: number, data: V, node: IntervalTreeNode<V>]>;
    /** @Override
     */
    protected onLeftChildChange(parent: IntervalTreeNode<V>, child: IntervalTreeNode<V> | null | undefined): void;
    /** @Override
     */
    protected onRightChildChange(parent: IntervalTreeNode<V>, child: IntervalTreeNode<V> | null | undefined): void;
}
