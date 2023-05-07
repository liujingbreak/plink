/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 *
 * features in progress: Dynamic order statistics, range tree
 *
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */
export type RbTreeNode<T, V = unknown, C extends RbTreeNode<any, any, any> = RbTreeNode<any, any, any>> = {
    key: T;
    value: V;
    p: C | null;
    left: C | null;
    right: C | null;
    isRed: boolean;
    size: number;
};
export declare class RedBlackTree<T, V = unknown, ND extends RbTreeNode<T, V, ND> = RbTreeNode<T, V, RbTreeNode<any, any>>> {
    protected comparator?: ((a: T, b: T) => number) | undefined;
    root: ND | null | undefined;
    constructor(comparator?: ((a: T, b: T) => number) | undefined);
    /**
     *
     * @param key
     * @returns null if key duplicates with existing tree node
     */
    insert(key: T): Omit<ND, 'value'> & {
        value: V | undefined;
    };
    /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0 */
    atIndex(idx: number, beginNode?: ND | null | undefined): ND | null | undefined;
    indexOf(key: T): number;
    search(key: T): ND | null;
    delete(key: T): boolean;
    isRed(node: ND | null | undefined): boolean;
    isBlack(node: ND | null | undefined): boolean;
    /**
     * To be extend and overridden
     */
    protected onLeftChildChange(_child: ND | null | undefined): void;
    /**
     * To be extend and overridden
     */
    protected onRightChildChange(_child: ND | null | undefined): void;
    protected deleteNode(z: ND): boolean;
    private deleteFixup;
    minimum(node?: ND | null | undefined): ND | null;
    private transplant;
    protected redBlackInsertFixUp(z: ND): void;
    private leftRotate;
    private rightRotate;
}
