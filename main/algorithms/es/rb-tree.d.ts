/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 *
 * features in progress: Dynamic order statistics, range tree
 *
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */
export type RbTreeNode<T, V = unknown> = {
    key: T;
    value: V;
    p: RbTreeNode<T, V>;
    left: RbTreeNode<T, V>;
    right: RbTreeNode<T, V>;
    isRed: boolean;
    /** total weight of currentt node and children's.
    * size = left child's size + right child size + weight
    */
    size: number;
    /** tree's size() returns sum of all nodes's weight */
    weight: number;
};
export declare class RedBlackTree<T, V = unknown, ND extends RbTreeNode<T, V> = RbTreeNode<T, V>> {
    protected comparator?: ((a: T, b: T) => number) | undefined;
    nil: RbTreeNode<T, V>;
    root: RbTreeNode<T, V> | ND;
    constructor(comparator?: ((a: T, b: T) => number) | undefined);
    isNil(node: RbTreeNode<T, V>): boolean;
    /**
     * Should override this function to create new typeof tree node
     * @param key
     * @returns existing tree node if key duplicates or a new empty node
     */
    insert(key: T): Omit<RbTreeNode<T, V>, 'value'> & {
        value?: V;
    };
    /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0
    * and it is baesed on "size" which is accumulated  from "weight" of node ands children's
    */
    atIndex(idx: number, beginNode?: RbTreeNode<T, V>): RbTreeNode<T, V> | null | undefined;
    indexOf(key: T): number;
    search(key: T): ND | null;
    delete(key: T): boolean;
    successorNode(node: RbTreeNode<T, V>): RbTreeNode<T, V> | null;
    predecessorNode(node: RbTreeNode<T, V>): RbTreeNode<T, V> | null;
    /**
     * @param key the value of key to be compared which could be related to none nodes in current tree
     * @return interator of existing nodes whose key are greater than specific key
     */
    keysGreaterThan(key: T, includeEqual?: boolean): Generator<RbTreeNode<T, V>, void, unknown>;
    greatestNodeSmallerThanOrEqual(key: T): RbTreeNode<T, V> | null;
    smallestNodeGreaterThanOrEqual(key: T): RbTreeNode<T, V> | null;
    /**
     * @param key the value of key to be compared which could be related to none nodes in current tree
     * @return interator of existing nodes whose key are greater than specific key
     */
    keysSmallerThan(key: T, includeEqual?: boolean): Generator<RbTreeNode<T, V>, void, unknown>;
    inorderWalk(callback: (node: ND, level: number) => void, node?: ND | RbTreeNode<T, V>, level?: number): void;
    allChildNodeInorder(node?: ND | RbTreeNode<T, V>, level?: number): Generator<[node: ND, level: number]>;
    minimum(node?: ND | RbTreeNode<T, V>): ND | null;
    maximum(node?: ND | RbTreeNode<T, V>): ND | null;
    size(): number;
    isRed(node: RbTreeNode<T, V> | null | undefined): boolean;
    isBlack(node: RbTreeNode<T, V> | null | undefined): boolean;
    deleteNode(z: RbTreeNode<T, V>): boolean;
    /**
     * To be extend and overridden
     */
    protected onLeftChildChange(_parent: RbTreeNode<T, V>, _child: RbTreeNode<T, V> | null | undefined): void;
    /**
     * To be extend and overridden
     */
    protected onRightChildChange(_parent: RbTreeNode<T, V>, _child: RbTreeNode<T, V> | null | undefined): void;
    protected updateNodeSize(node: RbTreeNode<T, V>): void;
    private deleteFixup;
    private transplant;
    protected redBlackInsertFixUp(z: RbTreeNode<T, V>): void;
    private leftRotate;
    private rightRotate;
}
