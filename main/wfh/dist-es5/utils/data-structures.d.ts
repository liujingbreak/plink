/**
 * Unfinished, TODO: deletion
 */
export interface RbTreeNode<T> {
    key: T;
    p: RbTreeNode<T> | null;
    left: RbTreeNode<T> | null;
    right: RbTreeNode<T> | null;
    isRed: boolean;
    size: number;
}
/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 * include features: Dynamic order statistics, range tree
 */
export declare class RedBlackTree<T> {
    private comparator?;
    root: RbTreeNode<T> | null | undefined;
    constructor(comparator?: ((a: T, b: T) => -1 | 0 | 1) | undefined);
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
