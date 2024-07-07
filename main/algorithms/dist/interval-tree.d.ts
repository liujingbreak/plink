import { RbTreeNode, RedBlackTree } from './rb-tree';
/**
 * A Red black tree node to contains multiple intervals which has same "low" value,
 * "key" is interval's low value
 */
interface IntervalTreeBaseNode<V = unknown> extends RbTreeNode<number, V, NonDuplicateNode<V> | DuplicateNode<V>> {
    /** Maximum "high" of children */
    max: number;
}
export interface NonDuplicateNode<V = unknown> extends IntervalTreeBaseNode<V> {
    /** For no duplicate single interval, be aware that "high endpoint" is considered as an included value */
    int: [low: number, high: number];
    highValuesTree?: undefined;
    maxHighOfMulti?: undefined;
}
export interface DuplicateNode<V = unknown> extends IntervalTreeBaseNode<V> {
    int: undefined;
    /** For multiple intervals, a tree to store different "high" value */
    highValuesTree: RedBlackTree<number, V>;
    /** Maximum "high" value of multi intervals that this node contains */
    maxHighOfMulti: number;
}
export type IntervalTreeNode<V = unknown> = NonDuplicateNode<V> | DuplicateNode<V>;
/**
 * Maintaining:
 *  node.max = max(node.int[1], node.left.max, node.right.max)
 *  Be aware that "high endpoint" is considered as an included value
 */
export declare class IntervalTree<V = unknown> extends RedBlackTree<number, V, IntervalTreeNode<V>> {
    /** Return tree node which could be either NonDuplicateNode or a node of DuplicateNode['highValuesTree'],
     */
    insertInterval(low: number, high: number): Omit<IntervalTreeNode<V>, 'value'> & {
        value?: V;
    } | Omit<RbTreeNode<number, V>, 'value'> & {
        value?: V;
    };
    deleteInterval(low: number, high: number): boolean;
    searchIntervalNode(low: number, high: number): IntervalTreeNode<V> | RbTreeNode<number, V, RbTreeNode<number, V, any>> | null;
    searchSingleOverlap(low: number, high: number): IntervalTreeNode<V> | null | undefined;
    searchMultipleOverlaps(low: number, high: number): Generator<[low: number, high: number, data: V, node: IntervalTreeNode<V>]>;
    /** @Override
     */
    protected onLeftChildChange(parent: IntervalTreeNode<V>, child: IntervalTreeNode<V> | null | undefined): void;
    /** @Override
     */
    protected onRightChildChange(parent: IntervalTreeNode<V>, child: IntervalTreeNode<V> | null | undefined): void;
}
/** A multi-value tree node can contain multiple intervals, in this case the tree node is assignable to type "DuplicateNode" */
export declare function isDuplicateNode<V>(node: IntervalTreeNode<V>): node is DuplicateNode<V>;
export {};
