interface RedBlackTreeNode<T> {
    isRed: boolean;
    key: T;
    p?: RedBlackTreeNode<T>;
    left?: RedBlackTreeNode<T>;
    right?: RedBlackTreeNode<T>;
}
/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 */
export declare class RedBlackTree<T> {
    private comparator?;
    root: RedBlackTreeNode<T> | undefined;
    constructor(comparator?: ((a: T, b: T) => -1 | 0 | 1) | undefined);
    /**
     *
     * @param key
     * @returns null if key duplicates with existing tree node
     */
    insert(key: T): RedBlackTreeNode<T> | null;
    delete(key: T): false | undefined;
    minimumOf(node?: RedBlackTreeNode<T>): RedBlackTreeNode<T>;
    maximumOf(node?: RedBlackTreeNode<T>): RedBlackTreeNode<T>;
    private transplant;
    search(key: T): RedBlackTreeNode<T> | null;
    private redBlackInsertFixUp;
    private leftRotate;
    private rightRotate;
}
export {};
