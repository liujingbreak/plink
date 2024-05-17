export interface TreeNode<T> {
    map: {
        [child: string]: TreeNode<T>;
    };
    name: string;
    data?: T;
}
export declare class DirTree<T> {
    root: TreeNode<T>;
    putRootData(data: T): void;
    getRootData(): T | undefined;
    putData(path: string, data: T): void;
    getData(path: string): T | null | undefined;
    /**
       * @return Array of data
       */
    getAllData(path: string | string[]): T[];
    ensureNode(path: string | string[]): TreeNode<T>;
    findNode(path: string | string[]): TreeNode<T> | null;
    traverse(level?: number, tree?: TreeNode<T>, lines?: string[]): string | string[];
}
