/**
 * According to the book << Introduction to Algorithms, Third Edition >>
 *
 * features in progress: Dynamic order statistics, range tree
 *
 * This data structure is meant for being extend, since the majority of 3rd-party red-black tree on npmjs.org is not extensible
 */
export declare type RbTreeNode<T, V = unknown, C extends RbTreeNode<any, any, any> = RbTreeNode<T, V, any>> = {
    key: T;
    value: V;
    p: C | null;
    left: C | null;
    right: C | null;
    isRed: boolean;
    /** total weight of currentt node and children's.
    * size = left child's size + right child size + weight
    */
    size: number;
    /** weight of current node, not includingg childlren'ss */
    weight: number;
};
export declare class RedBlackTree<T, V = unknown, ND extends RbTreeNode<T, V, ND> = RbTreeNode<T, V>> {
    protected comparator?: ((a: T, b: T) => number) | undefined;
    root: ND | null | undefined;
    constructor(comparator?: ((a: T, b: T) => number) | undefined);
    /**
     * Should override this function to create new typeof tree node
     * @param key
     * @returns existing tree node if key duplicates or a new empty node
     */
    insert(key: T): Omit<ND, 'value'> & {
        value?: V;
    };
    /** Retrieve an element with a given rank, unlike <<Introduction to Algorithms 3rd Edition>>, it begins with 0
    * and it is baesed on "size" which is accumulated  from "weight" of node ands children's
    */
    atIndex(idx: number, beginNode?: ND | null | undefined): ND | null | undefined;
    indexOf(key: T): number;
    search(key: T): ND | null;
    delete(key: T): boolean;
    successorNode(node: ND): ND | null;
    predecessorNode(node: ND): ND | null;
    /**
     * @param key the value of key to be compared which could be related to none nodes in current tree
     * @return interator of existing nodes whose key are greater than specific key
     */
    keysGreaterThan(key: T): Generator<ND, void, unknown>;
    /**
     * @param key the value of key to be compared which could be related to none nodes in current tree
     * @return interator of existing nodes whose key are greater than specific key
     */
    keysSmallererThan(key: T): Generator<ND, void, unknown>;
    inorderWalk(callback: (node: ND, level: number) => void, node?: ND | null | undefined, level?: number): void;
    minimum(node?: ND | null | undefined): ND | null;
    maximum(node?: ND | null | undefined): ND | null;
    size(): number;
    isRed(node: ND | null | undefined): boolean;
    isBlack(node: ND | null | undefined): boolean;
    /**
     * To be extend and overridden
     */
    protected onLeftChildChange(_parent: ND, _child: ND | null | undefined): void;
    /**
     * To be extend and overridden
     */
    protected onRightChildChange(_parent: ND, _child: ND | null | undefined): void;
    protected updateNodeSize(node: ND): void;
    protected deleteNode(z: ND): boolean;
    private deleteFixup;
    private transplant;
    protected redBlackInsertFixUp(z: ND): void;
    private leftRotate;
    private rightRotate;
}
