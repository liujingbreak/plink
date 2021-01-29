export declare enum Color {
    white = 0,
    gray = 1,
    black = 2
}
declare class Vertex<T> {
    data: T;
    color: Color;
    /** discovery time */
    d: number;
    /** finishing time */
    f: number;
    /** parent vertices */
    p?: Vertex<T>[];
    constructor(data: T, color?: Color);
}
export declare function getPathTo<T>(v: Vertex<T>, temp?: Vertex<T>[]): void;
export declare class DFS<T> {
    private adjacencyOf;
    backEdges: [Vertex<T>, Vertex<T>][];
    private time;
    private vertexMap;
    constructor(adjacencyOf: (u: Vertex<T>) => Iterable<Vertex<T>>);
    visit(g: Iterable<Vertex<T>>): void;
    vertexOf(data: T): Vertex<T>;
    printCyclicBackEdge(edge: Vertex<T>, edgeTo: Vertex<T>): string[];
    _printParentUntil(edge: Vertex<T>, edgeAncestor: Vertex<T>): string[];
    private visitVertex;
}
export {};
