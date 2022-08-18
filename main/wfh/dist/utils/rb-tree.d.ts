/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 *
 * features in progress: Dynamic order statistics, range tree
 *
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */
export declare type RbTreeNode<T, V = unknown> = {
    key: T;
    value: V;
    p: RbTreeNode<T, V> | null;
    left: RbTreeNode<T, V> | null;
    right: RbTreeNode<T, V> | null;
    isRed: boolean;
    size: number;
};
export declare class RedBlackTree<T, V = unknown> {
    protected comparator?: ((a: T, b: T) => number) | undefined;
    root: RbTreeNode<T, V> | null | undefined;
    constructor(comparator?: ((a: T, b: T) => number) | undefined);
    /**
     *
     * @param key
     * @returns null if key duplicates with existing tree node
     */
    insert(key: T): Omit<RbTreeNode<T, V>, 'value'> & {
        value: V | undefined;
    };
    /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0 */
    atIndex(idx: number, beginNode?: RbTreeNode<T, V> | null | undefined): RbTreeNode<T, V> | null | undefined;
    indexOf(key: T): number;
    search(key: T): RbTreeNode<T, V> | null;
    delete(key: T): boolean;
    isRed(node: RbTreeNode<T, V> | null | undefined): boolean;
    isBlack(node: RbTreeNode<T, V> | null | undefined): boolean;
    protected deleteNode(z: RbTreeNode<T, V>): boolean;
    private deleteFixup;
    minimum(node?: RbTreeNode<T, V> | null | undefined): RbTreeNode<T, V> | null;
    private transplant;
    protected redBlackInsertFixUp(z: RbTreeNode<T, V>): void;
    private leftRotate;
    private rightRotate;
}
