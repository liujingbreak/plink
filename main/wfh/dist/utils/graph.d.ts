export declare enum Color {
    white = 0,
    gray = 1,
    black = 2
}
export declare class Vertex<T> {
    data: T;
    color: Color;
    /** discovery time */
    d: number;
    /** finishing time, used to calculate "Strongly connected components" and "Topological sort" */
    f: number | undefined;
    /** parent vertices */
    p?: Vertex<T>[];
    constructor(data: T, color?: Color);
}
export declare function getPathTo<T>(v: Vertex<T>, temp?: Vertex<T>[]): void;
declare abstract class BaseGraph<T> {
    protected vertexMap: Map<T, Vertex<T>>;
    visit(g: Iterable<T>): void;
    protected abstract visitVertex(u: Vertex<T>): void;
    protected vertexOf(data: T): Vertex<T>;
}
export declare class DFS<T> extends BaseGraph<T> {
    private adjacencyOf;
    private onFinish?;
    backEdges: [Vertex<T>, Vertex<T>][];
    private time;
    constructor(adjacencyOf: (u: T, vertex: Vertex<T>) => Iterable<T>, onFinish?: ((vertex: Vertex<T>) => any) | undefined);
    visit(g: Iterable<T>): void;
    printCyclicBackEdge(edge: Vertex<T>, edgeTo: Vertex<T>): string[];
    _printParentUntil(edge: Vertex<T>, edgeAncestor: Vertex<T>): string[];
    protected visitVertex(u: Vertex<T>): void;
}
export declare class BFS<T> extends BaseGraph<T> {
    private adjacencyOf;
    constructor(adjacencyOf: (u: T, vertex: Vertex<T>) => Iterable<T>);
    protected visitVertex(s: Vertex<T>): void;
}
export {};
