/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 *
 * features in progress: Dynamic order statistics, range tree
 *
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */
export interface RbTreeNode<T> {
    key: T;
    p: RbTreeNode<T> | null;
    left: RbTreeNode<T> | null;
    right: RbTreeNode<T> | null;
    isRed: boolean;
    size: number;
}
export declare class RedBlackTree<T> {
    protected comparator?: ((a: T, b: T) => number) | undefined;
    root: RbTreeNode<T> | null | undefined;
    constructor(comparator?: ((a: T, b: T) => number) | undefined);
    /**
     *
     * @param key
     * @returns null if key duplicates with existing tree node
     */
    insert(key: T): RbTreeNode<T> | null;
    delete(key: T): boolean;
    isRed(node: RbTreeNode<T> | null | undefined): boolean;
    isBlack(node: RbTreeNode<T> | null | undefined): boolean;
    protected deleteNode(z: RbTreeNode<T>): boolean;
    private deleteFixup;
    minimumOf(node?: RbTreeNode<T> | null | undefined): RbTreeNode<T> | null;
    private transplant;
    search(key: T): RbTreeNode<T> | null;
    protected redBlackInsertFixUp(z: RbTreeNode<T>): void;
    private leftRotate;
    private rightRotate;
}
/** Allow inserting multiple items with same key in a red-black tree */
export declare class DuplicateKeyTree<T> extends RedBlackTree<T> {
}
export declare type IntervalKey = {
    low: number;
    high: number;
    max?: number;
};
export declare class IntervalTree extends RedBlackTree<IntervalKey> {
    constructor();
}
