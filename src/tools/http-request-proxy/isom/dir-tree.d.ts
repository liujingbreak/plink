/**
 * Basically it is a copy of require-injector/dist/dir-tree, but for browser side
 * and not related to local file system, as a pure data structure
 */
export interface TreeNode<T> {
    map: {
        [child: string]: TreeNode<T>;
    };
    name: string;
    data?: T;
}
export declare class DirTree<T> {
    private caseSensitive;
    root: TreeNode<T>;
    constructor(caseSensitive?: boolean);
    putData(path: string, data: T): void;
    getData(path: string): T | null | undefined;
    /**
     * @return Array of data
     */
    getAllData(path: string | string[]): T[];
    ensureNode(path: string | string[]): TreeNode<T>;
    findNode(path: string | string[]): TreeNode<T>;
    traverse(level?: number, tree?: TreeNode<T>, lines?: string[]): string | string[];
    toString(): string;
}
